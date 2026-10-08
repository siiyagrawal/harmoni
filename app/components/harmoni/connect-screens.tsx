import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { DemoCircle } from "./circle-data";
import type { ConnectDemo, ConnRequest, DemoMatch, FitLevel, Grants, HelpOffer, RequestKind } from "./connect-data";
import type { PersonaType } from "./types";
import { Avatar, Icon } from "./ui";

export type PersonaOption = { name: string; type: PersonaType | "main" };
export type HelpTarget = { type: "spotlight" | "help"; id: string; label: string; ask: string; ownerId: string; owner: string; circleId: string };

const FIT_ORDER: Record<FitLevel, number> = { Strong: 0, Good: 1, Possible: 2 };

const STATUS_COPY: Record<ConnRequest["status"], { label: string; tone: string }> = {
  "host-review": { label: "With the host", tone: "wait" },
  pending: { label: "Pending", tone: "wait" },
  approved: { label: "Connected", tone: "ok" },
  declined: { label: "Not accepted", tone: "muted" },
  withdrawn: { label: "Withdrawn", tone: "muted" },
  expired: { label: "Expired", tone: "muted" },
  invalid: { label: "No longer available", tone: "muted" },
  forwarded: { label: "Forwarded", tone: "ok" },
};

const KIND_LABEL: Record<RequestKind, string> = { interest: "Interest", introduction: "Introduction", "help-offer": "Help offer" };

function GrantSummary({ grants }: { grants?: Grants }) {
  const items: Array<[keyof Grants, string]> = [["chat", "Messaging"], ["email", "Email"], ["phone", "Phone"]];
  return (
    <div className="p3-grants">
      {items.map(([key, label]) => <span key={key} className={grants?.[key] ? "on" : ""}>{grants?.[key] ? "✓" : "✕"} {label}</span>)}
    </div>
  );
}

function Segments<T extends string>({ value, options, onChange, label }: { value: T; options: Array<[T, string]>; onChange: (value: T) => void; label: string }) {
  return (
    <div className="p1-input-mode p2-segments" role="tablist" aria-label={label}>
      {options.map(([id, text]) => <button key={id} type="button" role="tab" aria-selected={value === id} className={value === id ? "on" : ""} onClick={() => onChange(id)}>{text}</button>)}
    </div>
  );
}

export function MatchesHubScreen({
  demo,
  circles,
  personas,
  contextSignature,
  realSuggestions,
  onDismissReal,
  onInterest,
  onReview,
  onOffer,
  onAskHelp,
  onBuildPersona,
  onDiscover,
  onToast,
}: {
  demo: ConnectDemo;
  circles: DemoCircle[];
  personas: PersonaOption[];
  contextSignature: string;
  realSuggestions: Array<{ id: string; name: string; reason: string }>;
  onDismissReal: (id: string) => void;
  onInterest: (match: DemoMatch) => void;
  onReview: (request: ConnRequest) => void;
  onOffer: (target: HelpTarget) => void;
  onAskHelp: () => void;
  onBuildPersona: () => void;
  onDiscover: () => void;
  onToast: (message: string) => void;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const activeCircles = circles.filter((circle) => circle.status === "active");
  const activeIds = new Set(activeCircles.map((circle) => circle.id));
  const circleName = (id: string) => circles.find((circle) => circle.id === id)?.name ?? "Circle";
  const { matchScope, setMatchScope, segment, setSegment } = demo;
  const persona = personas.find((item) => item.name === matchScope.persona) ?? personas[0];
  const personaHasCircles = persona.type !== "singles" && persona.type !== "family";
  const stale = demo.refreshedSignature !== null && demo.refreshedSignature !== contextSignature;
  const eligible = demo.matches.filter((match) => activeIds.has(match.circleId) && (matchScope.circleId === "all" || match.circleId === matchScope.circleId));
  const visible = eligible.filter((match) => !match.dismissed).sort((a, b) => FIT_ORDER[a.fit] - FIT_ORDER[b.fit]);
  const hidden = eligible.length - visible.length;
  const incomingCount = demo.requests.filter((request) => (request.direction === "incoming" && request.status === "pending") || (request.direction === "review" && request.status === "host-review")).length;

  useEffect(() => {
    if (demo.refreshedSignature === null) demo.setRefreshedSignature(contextSignature);
  // Only the first visit records a baseline; later changes surface the stale notice.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!refreshing) return;
    const timeout = window.setTimeout(() => {
      setRefreshing(false);
      demo.setRefreshedSignature(contextSignature);
      onToast("Matches refreshed from your approved context.");
    }, 1200);
    return () => window.clearTimeout(timeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshing]);

  return (
    <>
      <p className="tag p1-eyebrow">A good connection starts with context</p>
      <h1>Your <i>matches</i></h1>
      <Segments label="Matches sections" value={segment} onChange={setSegment} options={[["matches", "Matches"], ["requests", `Requests${incomingCount ? ` · ${incomingCount}` : ""}`], ["help", "Help"]]} />

      {segment === "matches" ? (
        <>
          <div className="card p3-scope">
            <label className="p2-select-row"><Icon name="person" size={17} /><span>Matching as</span>
              <select value={persona.name} onChange={(event) => setMatchScope((current) => ({ ...current, persona: event.target.value }))}>
                {personas.map((item) => <option key={item.name}>{item.name}</option>)}
              </select>
            </label>
            <label className="p2-select-row"><Icon name="circle" size={17} /><span>In</span>
              <select value={matchScope.circleId} onChange={(event) => setMatchScope((current) => ({ ...current, circleId: event.target.value }))}>
                <option value="all">All my circles</option>
                {activeCircles.map((circle) => <option key={circle.id} value={circle.id}>{circle.name}</option>)}
              </select>
            </label>
            <div className="p3-refresh-row">
              <span className="tag">{refreshing ? "Refreshing…" : stale ? "Your context changed" : "Updated from approved context"}</span>
              <button className="pill" type="button" onClick={() => setRefreshing(true)} disabled={refreshing}>Refresh</button>
            </div>
          </div>
          {stale && !refreshing ? <div className="card p2-warning"><b>Your context changed</b><p>You edited a persona since these matches were ranked. Refresh to update them.</p></div> : null}

          {refreshing ? (
            <div aria-busy="true" aria-label="Loading matches">{[0, 1].map((key) => <div className="card p3-skeleton" key={key}><i /><i /><i /></div>)}</div>
          ) : !activeCircles.length ? (
            <div className="card p1-empty-state"><h2>Join a circle first</h2><p>Matches come from people in circles you’re an active member of.</p><button className="btn g s" type="button" onClick={onDiscover}>Discover circles</button></div>
          ) : !personaHasCircles ? (
            <div className="card p1-empty-state"><h2>No matches for {persona.name} yet</h2><p>This persona is kept separate, so it’s only matched inside circles set up for it. None of your circles are, yet.</p></div>
          ) : (
            <>
              {visible.map((match, index) => (
                <MatchCard
                  key={match.id}
                  rank={index + 1}
                  match={match}
                  circleName={circleName(match.circleId)}
                  request={demo.openRequestWith(match.personId, match.circleId)}
                  connected={Boolean(demo.connectionWith(match.personId))}
                  onInterest={() => onInterest(match)}
                  onReview={onReview}
                  onDismiss={() => demo.dismissMatch(match.id)}
                  onOpenRequests={() => setSegment("requests")}
                />
              ))}
              {!visible.length ? <div className="card p1-empty-state"><h2>No matches right now</h2><p>Add more about what would help or what you can share, then refresh.</p><button className="btn g s" type="button" onClick={onBuildPersona}>Tell My AI More</button></div> : null}
              {hidden ? <button className="lk p2-inline-link" type="button" onClick={demo.restoreMatches}>Show {hidden} hidden {hidden === 1 ? "match" : "matches"}</button> : null}
            </>
          )}

          {realSuggestions.length ? (
            <>
              <h2 className="p1-section-title">From your personal circle</h2>
              {realSuggestions.map((suggestion) => (
                <div className="card match-suggestion" key={suggestion.id}>
                  <div className="row"><Avatar name={suggestion.name} size={44} /><div className="member-main"><b>{suggestion.name}</b><div className="tag">Based on approved card context</div></div></div>
                  <p>{suggestion.reason}</p>
                  <button className="lk p2-inline-link" type="button" onClick={() => onDismissReal(suggestion.id)}>Dismiss</button>
                </div>
              ))}
            </>
          ) : null}
          <p className="p1-demo-caption">Fit reflects approved context only and isn’t a prediction of success. Adding detail can lower a fit. A match never grants messaging or contact details. Circle matches are sample data; personal-circle suggestions are live.</p>
        </>
      ) : null}

      {segment === "requests" ? <RequestsPanel demo={demo} circleName={circleName} onReview={onReview} onToast={onToast} /> : null}
      {segment === "help" ? <HelpPanel demo={demo} activeIds={activeIds} circleName={circleName} onOffer={onOffer} onAskHelp={onAskHelp} onToast={onToast} /> : null}
    </>
  );
}

function MatchCard({
  rank,
  match,
  circleName,
  request,
  connected,
  onInterest,
  onReview,
  onDismiss,
  onOpenRequests,
}: {
  rank: number;
  match: DemoMatch;
  circleName: string;
  request?: ConnRequest;
  connected: boolean;
  onInterest: () => void;
  onReview: (request: ConnRequest) => void;
  onDismiss: () => void;
  onOpenRequests: () => void;
}) {
  const [open, setOpen] = useState(rank === 1);
  let action: ReactNode;
  if (connected) action = <div className="p3-state ok"><Icon name="check" size={16} />Connected. Messaging arrives in the next phase.</div>;
  else if (request?.direction === "incoming") action = <div className="p3-state info"><span>{match.name.split(" ")[0]} asked to connect with you.</span><button className="pill on" type="button" onClick={() => onReview(request)}>Review</button></div>;
  else if (request) action = <div className="p3-state wait"><span>{request.status === "host-review" ? "Your request is with the host" : "Your request is pending"}</span><button className="pill" type="button" onClick={onOpenRequests}>View</button></div>;
  else action = (
    <div className="p2-inline-row">
      <button className="btn s" type="button" onClick={onInterest}>I’m interested</button>
      <button className="pill" type="button" onClick={onDismiss}>Not now</button>
    </div>
  );

  return (
    <div className="card p3-match">
      <div className="p2-listing-head">
        <span className="p3-rank">{rank}</span>
        <Avatar name={match.name} size={44} />
        <span className="p2-circle-copy"><b>{match.name}</b><small>{match.headline} · {circleName}</small></span>
        <span className={`p3-fit ${match.fit.toLowerCase()}`}>{match.fit} fit</span>
      </div>
      <p className="p3-reason">{match.reason}</p>
      <button className="lk p2-inline-link" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>{open ? "Hide why" : "Why this match"}</button>
      {open ? (
        <>
          <div className="p3-dimensions">
            {match.dimensions.map((dimension) => (
              <div key={dimension.label} className={dimension.state}>
                <i aria-hidden="true">{dimension.state === "match" ? "✓" : dimension.state === "partial" ? "~" : "?"}</i>
                <span><small>{dimension.label}</small>{dimension.note}</span>
              </div>
            ))}
          </div>
          <div className="p3-confidence"><span>Evidence</span><b>{match.confidence}</b><small>{match.evidence}</small></div>
        </>
      ) : null}
      {action}
    </div>
  );
}

function RequestsPanel({ demo, circleName, onReview, onToast }: { demo: ConnectDemo; circleName: (id: string) => string; onReview: (request: ConnRequest) => void; onToast: (message: string) => void }) {
  const { requestFilter, setRequestFilter } = demo;
  const reviewCount = demo.requests.filter((request) => request.direction === "review" && request.status === "host-review").length;
  const list = demo.requests.filter((request) => request.direction === requestFilter);
  const incomingPending = demo.requests.filter((request) => request.direction === "incoming" && request.status === "pending").length;

  return (
    <>
      <div className="p2-tabs" role="tablist" aria-label="Request lists">
        <button type="button" role="tab" aria-selected={requestFilter === "incoming"} className={`pill${requestFilter === "incoming" ? " on" : ""}`} onClick={() => setRequestFilter("incoming")}>Received{incomingPending ? ` · ${incomingPending}` : ""}</button>
        <button type="button" role="tab" aria-selected={requestFilter === "sent"} className={`pill${requestFilter === "sent" ? " on" : ""}`} onClick={() => setRequestFilter("sent")}>Sent</button>
        <button type="button" role="tab" aria-selected={requestFilter === "review"} className={`pill${requestFilter === "review" ? " on" : ""}`} onClick={() => setRequestFilter("review")}>Host review{reviewCount ? ` · ${reviewCount}` : ""}</button>
      </div>
      {list.map((request) => {
        const status = STATUS_COPY[request.status];
        return (
          <div className="card p3-request" key={request.id}>
            <div className="p2-listing-head">
              <Avatar name={request.name} size={42} />
              <span className="p2-circle-copy">
                <b>{request.direction === "review" ? `${request.name} → ${request.reviewTarget}` : request.name}</b>
                <small>{KIND_LABEL[request.kind]} · {circleName(request.circleId)} · {request.at}</small>
              </span>
              <span className={`p2-status ${status.tone}`}>{status.label}</span>
            </div>
            {request.note ? <p className="p3-note">“{request.note}”</p> : null}
            {request.direction === "incoming" && request.status === "pending" ? (
              <div className="p2-inline-row">
                <button className="btn s" type="button" onClick={() => onReview(request)}>Review</button>
                <button className="btn g s" type="button" onClick={() => { demo.respond(request.id, "decline"); onToast("Declined. No reason is shared."); }}>Decline</button>
              </div>
            ) : null}
            {request.status === "approved" ? (
              <>
                <GrantSummary grants={request.grants} />
                <div className="p2-inline-row">
                  <button className="btn g s" type="button" disabled>Message · next phase</button>
                  {request.direction === "incoming" ? <button className="pill" type="button" onClick={() => onReview(request)}>What I share</button> : null}
                </div>
              </>
            ) : null}
            {request.status === "invalid" ? <p className="p2-fine">They’re no longer an active member of this circle, so nothing was shared.</p> : null}
            {request.status === "declined" && request.direction === "sent" ? <p className="p2-fine">Not accepted. Reasons are never shared, and we won’t send reminders.</p> : null}
            {request.status === "expired" ? <p className="p2-fine">Closed after 30 days without a reply. Expiry length is a proposed setting.</p> : null}
            {request.direction === "sent" && (request.status === "pending" || request.status === "host-review") ? (
              <>
                {request.status === "host-review" ? <p className="p2-fine">This circle’s host reviews introductions first. The member still decides.</p> : null}
                <div className="p2-inline-row">
                  <button className="pill" type="button" onClick={() => { demo.withdraw(request.id); onToast("Request withdrawn."); }}>Withdraw</button>
                  <button className="pill" type="button" onClick={() => demo.simulateReply(request.id, true)}>Simulate {request.status === "host-review" ? "host forwarding" : "acceptance"}</button>
                  <button className="pill" type="button" onClick={() => demo.simulateReply(request.id, false)}>Simulate decline</button>
                </div>
              </>
            ) : null}
            {request.direction === "review" && request.status === "host-review" ? (
              <>
                <p className="p2-fine">Forwarding sends it to {request.reviewTarget}, who still decides. You don’t have permission to approve messaging for them.</p>
                <div className="p2-inline-row">
                  <button className="btn s" type="button" onClick={() => { demo.hostReview(request.id, "forward"); onToast(`Forwarded to ${request.reviewTarget}.`); }}>Forward</button>
                  <button className="btn g s" type="button" onClick={() => { demo.hostReview(request.id, "decline"); onToast("Introduction declined."); }}>Decline</button>
                </div>
              </>
            ) : null}
          </div>
        );
      })}
      {!list.length ? <div className="card p1-empty-state"><h2>Nothing here</h2><p>{requestFilter === "review" ? "Introductions in circles you host that need your review will appear here." : requestFilter === "sent" ? "Interest and introduction requests you send appear here." : "When someone wants to connect, you’ll see it here."}</p></div> : null}
      <p className="p1-demo-caption">Accepting a request lets you choose messaging, email and phone separately. Access is rechecked when you accept.</p>
    </>
  );
}

function HelpPanel({ demo, activeIds, circleName, onOffer, onAskHelp, onToast }: {
  demo: ConnectDemo;
  activeIds: Set<string>;
  circleName: (id: string) => string;
  onOffer: (target: HelpTarget) => void;
  onAskHelp: () => void;
  onToast: (message: string) => void;
}) {
  const mine = demo.helpRequests.filter((request) => request.mine);
  const others = demo.helpRequests.filter((request) => !request.mine && request.status === "open" && activeIds.has(request.circleId));
  const myOffers = demo.offers.filter((offer) => offer.fromId === "me");
  const offerLabel = (offer: HelpOffer) => offer.status === "introduced" ? (offer.viaExistingConnection ? "Sent within your connection" : "Introduced") : offer.status === "closed" ? "Closed" : "Pending";

  return (
    <>
      <button className="btn s p3-ask-help" type="button" onClick={onAskHelp}>Ask your circle for help</button>
      {mine.length ? <h2 className="p1-section-title">Your requests</h2> : null}
      {mine.map((request) => {
        const received = demo.offers.filter((offer) => offer.target.id === request.id);
        return (
          <div className={`card p3-help${request.status === "closed" ? " closed" : ""}`} key={request.id}>
            <div className="p3-help-head"><b>{request.ask}</b><span className={`p2-status ${request.status === "open" ? "ok" : "muted"}`}>{request.status === "open" ? "Open" : "Closed"}</span></div>
            <div className="tag">{circleName(request.circleId)} · {request.timing}</div>
            {received.map((offer) => (
              <div className="p3-offer" key={offer.id}>
                <div className="row"><Avatar name={offer.from} size={34} /><div className="member-main"><b>{offer.from}</b><div className="tag">{offerLabel(offer)}</div></div></div>
                <p>{offer.text}</p>
                {offer.status === "pending" && request.status === "open" ? (
                  <div className="p2-inline-row">
                    <button className="pill on" type="button" onClick={() => { demo.acceptOffer(offer.id); onToast(`You’re connected with ${offer.from}. Messaging only; no contact details shared.`); }}>Accept introduction</button>
                    <button className="pill" type="button" onClick={() => demo.closeOffer(offer.id)}>Not now</button>
                  </div>
                ) : null}
              </div>
            ))}
            {!received.length ? <p className="p2-fine">No offers yet.</p> : null}
            {request.status === "open" ? <button className="lk p2-inline-link" type="button" onClick={() => { demo.closeHelpRequest(request.id); onToast("Request closed."); }}>Close this request</button> : null}
          </div>
        );
      })}
      <h2 className="p1-section-title">Open asks in your circles</h2>
      {others.map((request) => {
        const offered = myOffers.find((offer) => offer.target.id === request.id);
        return (
          <div className="card p3-help" key={request.id}>
            <div className="row"><Avatar name={request.owner} size={38} /><div className="member-main"><b>{request.owner}</b><div className="tag">{circleName(request.circleId)} · {request.timing}</div></div></div>
            <p className="p3-ask">{request.ask}</p>
            {offered
              ? <div className="p3-state wait"><span>Your offer: {offerLabel(offered)}</span></div>
              : <button className="btn g s" type="button" onClick={() => onOffer({ type: "help", id: request.id, label: request.ask, ask: request.ask, ownerId: request.ownerId, owner: request.owner, circleId: request.circleId })}>I can help</button>}
          </div>
        );
      })}
      {!others.length ? <div className="card p1-empty-state"><h2>No open asks</h2><p>Help requests from people in your circles will appear here.</p></div> : null}
      {myOffers.length ? (
        <>
          <h2 className="p1-section-title">Your offers</h2>
          <div className="lst">
            {myOffers.map((offer) => (
              <div className="ct p2-member" key={offer.id}>
                <div className="m"><b>{offer.to}</b><div className="tag">{offer.target.label} · {offerLabel(offer)}</div></div>
              </div>
            ))}
          </div>
        </>
      ) : null}
      <p className="p1-demo-caption">An offer alone doesn’t open a conversation. If you’re already connected, it goes straight to them within what they’ve allowed.</p>
    </>
  );
}

export function ExpressInterestScreen({
  match,
  circle,
  persona,
  onBack,
  onSubmit,
  onReviewIncoming,
  onDone,
}: {
  match: DemoMatch;
  circle: DemoCircle | null;
  persona: string;
  onBack: () => void;
  onSubmit: (kind: RequestKind, note: string) => { result: "created" | "existing" | "mutual"; request: ConnRequest };
  onReviewIncoming: (request: ConnRequest) => void;
  onDone: () => void;
}) {
  const [kind, setKind] = useState<RequestKind>("interest");
  const [note, setNote] = useState("");
  const [outcome, setOutcome] = useState<ReturnType<typeof onSubmit> | null>(null);
  const hostFirst = circle?.settings.connectionApproval === "host-then-member";
  const first = match.name.split(" ")[0];

  if (outcome) {
    return (
      <>
        <div className="hd"><span className="tag">{circle?.name}</span></div>
        <div className="p1-shield"><Icon name={outcome.result === "mutual" ? "sparkle" : outcome.result === "existing" ? "calendar" : "check"} size={28} /></div>
        {outcome.result === "created" ? (
          <>
            <h1 className="p2-center">Request <i>sent.</i></h1>
            <p className="c">{hostFirst ? `${circle?.host} reviews introductions in ${circle?.name} first. Then ${first} decides.` : `${first} decides whether to connect.`} Nothing else is shared until then.</p>
          </>
        ) : outcome.result === "existing" ? (
          <>
            <h1 className="p2-center">Already <i>pending.</i></h1>
            <p className="c">You already have an open request with {first} in this circle, so we didn’t send another.</p>
          </>
        ) : (
          <>
            <h1 className="p2-center">{first} asked <i>too.</i></h1>
            <p className="c">{first} already wants to connect with you. Review their request to accept; access is rechecked first.</p>
          </>
        )}
        <button className="lk p2-bottom-space" type="button" onClick={onDone}>Back to matches</button>
        <div className="ft">
          {outcome.result === "mutual"
            ? <button className="btn" type="button" onClick={() => onReviewIncoming(outcome.request)}>Review {first}’s request</button>
            : <button className="btn" type="button" onClick={onDone}>Done</button>}
        </div>
      </>
    );
  }

  return (
    <>
      <div className="hd">
        <button className="bkb" type="button" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
        <span className="tag">Connect</span>
      </div>
      <div className="p3-person">
        <Avatar name={match.name} size={72} />
        <h1 className="p2-center">{match.name}</h1>
        <p className="c">{match.headline} · {circle?.name}</p>
      </div>
      <h2 className="p1-section-title">How do you want to connect?</h2>
      <div className="p1-visibility-list">
        {([
          ["interest", "I’m interested", `Let ${first} know you’d like to connect`],
          ["introduction", "Request an introduction", hostFirst ? `Ask ${circle?.host} to introduce you` : "Ask for a warm introduction through the circle"],
        ] as const).map(([value, title, detail]) => (
          <button type="button" key={value} className={`p1-visibility-option${kind === value ? " selected" : ""}`} onClick={() => setKind(value)} aria-pressed={kind === value}>
            <span className="p1-radio" aria-hidden="true">{kind === value ? "✓" : ""}</span>
            <span><b>{title}</b><small>{detail}</small></span>
          </button>
        ))}
      </div>
      <label className="p1-review-field"><span>Add a note (optional)</span><textarea className="p1-textarea p1-review-textarea" value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={200} placeholder={`Why you’d like to connect with ${first}`} /></label>
      <div className="card p2-check-list">
        <div><Icon name="check" size={17} /><span>{first} sees your {persona} persona summary and your note</span></div>
        <div><Icon name="lock" size={17} /><span>Not shared: phone, email or your other personas</span></div>
        {hostFirst ? <div><Icon name="circle" size={17} /><span>{circle?.host} reviews it first, then {first} decides</span></div> : null}
      </div>
      <p className="p2-fine p2-bottom-space">If {first} accepts, they choose whether to allow messaging, email or phone. Each is separate.</p>
      <div className="ft"><button className="btn" type="button" onClick={() => setOutcome(onSubmit(kind, note))}>Send request</button></div>
    </>
  );
}

export function RequestReviewScreen({
  request,
  circle,
  onBack,
  onDecide,
  onSaveGrants,
}: {
  request: ConnRequest;
  circle: DemoCircle | null;
  onBack: () => void;
  onDecide: (decision: "approve" | "decline", grants: Grants) => "approved" | "declined" | "invalid" | "missing";
  onSaveGrants: (grants: Grants) => void;
}) {
  const [grants, setGrants] = useState<Grants>(request.grants ?? { chat: true, email: false, phone: false });
  const [result, setResult] = useState<"approved" | "declined" | "invalid" | null>(null);
  const editing = request.status === "approved";
  const first = request.name.split(" ")[0];
  const toggles: Array<[keyof Grants, string, string]> = [
    ["chat", "Message in Harmoni", "One-to-one text once messaging is available"],
    ["email", "Share my email", "Shown to them on your card"],
    ["phone", "Share my phone number", "Shown to them on your card"],
  ];

  if (result) {
    return (
      <>
        <div className="hd"><span className="tag">{circle?.name}</span></div>
        <div className="p1-shield"><Icon name={result === "approved" ? "check" : "close"} size={28} /></div>
        {result === "approved" ? <h1 className="p2-center">You’re <i>connected.</i></h1> : result === "declined" ? <h1 className="p2-center">Request <i>declined.</i></h1> : <h1 className="p2-center">No longer <i>available.</i></h1>}
        <p className="c">{result === "approved"
          ? `You and ${first} are connected in ${circle?.name}.`
          : result === "declined"
            ? `${first} sees it as not accepted, without a reason. They won’t be prompted to ask again.`
            : `${first} is no longer an active member of ${circle?.name}, so the request was closed and nothing was shared.`}</p>
        {result === "approved" ? <GrantSummary grants={grants} /> : null}
        <div className="ft"><button className="btn" type="button" onClick={onBack}>Back to requests</button></div>
      </>
    );
  }

  return (
    <>
      <div className="hd">
        <button className="bkb" type="button" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
        <span className="tag">{editing ? "What you share" : `${KIND_LABEL[request.kind]} request`}</span>
      </div>
      <div className="p3-person">
        <Avatar name={request.name} size={72} />
        <h1 className="p2-center">{request.name}</h1>
        <p className="c">As {request.persona} · {circle?.name} · {request.at}</p>
      </div>
      {request.note ? <div className="card p3-quote">“{request.note}”</div> : null}
      <h2 className="p1-section-title">{editing ? `What ${first} can use` : "If you accept, allow"}</h2>
      <div className="card p3-grant-card">
        {toggles.map(([key, title, detail]) => (
          <div className="tg" key={key}>
            <div><b>{title}</b><div className="tag">{detail}</div></div>
            <button className={`sx${grants[key] ? " on" : ""}`} type="button" onClick={() => setGrants((current) => ({ ...current, [key]: !current[key] }))} aria-pressed={grants[key]} aria-label={title} />
          </div>
        ))}
      </div>
      <p className="p2-fine p2-bottom-space">Messaging and contact details are separate permissions. You can change them later; turning messaging off stops new messages.</p>
      <div className="ft p3-two-buttons">
        {editing ? (
          <button className="btn" type="button" onClick={() => { onSaveGrants(grants); onBack(); }}>Save changes</button>
        ) : (
          <>
            <button className="btn g" type="button" onClick={() => setResult(onDecide("decline", grants) === "declined" ? "declined" : "invalid")}>Decline</button>
            <button className="btn" type="button" onClick={() => { const outcome = onDecide("approve", grants); setResult(outcome === "approved" ? "approved" : "invalid"); }}>Accept</button>
          </>
        )}
      </div>
    </>
  );
}

export function HelpOfferScreen({
  target,
  circle,
  connected,
  openRequest,
  onBack,
  onSubmit,
}: {
  target: HelpTarget;
  circle: DemoCircle | null;
  connected: boolean;
  openRequest: boolean;
  onBack: () => void;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");
  // The route is fixed when the offer is sent, before the new request changes the props.
  const [sentRoute, setSentRoute] = useState<string | null>(null);
  const first = target.owner.split(" ")[0];
  const hostFirst = circle?.settings.connectionApproval === "host-then-member";
  const route = connected
    ? `You’re already connected with ${first}, so your offer goes straight to them within what they’ve allowed.`
    : openRequest
      ? `You already have a pending request with ${first}; this offer is added to it instead of sending another.`
      : `This sends ${first} an introduction request with your offer.${hostFirst ? ` ${circle?.host} reviews it first.` : ""} ${first} decides.`;

  if (sentRoute) {
    return (
      <>
        <div className="hd"><span className="tag">{circle?.name}</span></div>
        <div className="p1-shield"><Icon name="sparkle" size={28} /></div>
        <h1 className="p2-center">Offer <i>sent.</i></h1>
        <p className="c">{sentRoute}</p>
        <p className="p2-fine p2-center">Track it under Matches → Help. Your offer doesn’t open a chat by itself.</p>
        <div className="ft"><button className="btn" type="button" onClick={onBack}>Done</button></div>
      </>
    );
  }

  return (
    <>
      <div className="hd">
        <button className="bkb" type="button" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
        <span className="tag">{target.type === "spotlight" ? "Spotlight" : "Help request"}</span>
      </div>
      <span className="p1-eyebrow">{target.owner} asked</span>
      <div className="card p3-quote p3-big-quote">“{target.ask}”</div>
      <h1>I can <i>help.</i></h1>
      <label className="p1-review-field"><span>How can you help?</span><textarea className="p1-textarea" value={text} onChange={(event) => setText(event.target.value)} rows={4} maxLength={300} placeholder="What you can offer, and when" /></label>
      <div className="card p1-static-notice p2-bottom-space"><b>{connected ? "Already connected" : "How this is sent"}</b><p>{route} Phone and email aren’t shared.</p></div>
      <div className="ft"><button className="btn" type="button" disabled={text.trim().length < 3} onClick={() => { setSentRoute(route); onSubmit(text); }}>Send my offer</button></div>
    </>
  );
}

export function HelpRequestScreen({
  circles,
  persona,
  onBack,
  onSubmit,
}: {
  circles: DemoCircle[];
  persona: string;
  onBack: () => void;
  onSubmit: (circleId: string, ask: string, timing: string) => void;
}) {
  const [circleId, setCircleId] = useState(circles[0]?.id ?? "");
  const [ask, setAsk] = useState("");
  const [timing, setTiming] = useState("");
  const circle = circles.find((item) => item.id === circleId);

  return (
    <>
      <div className="hd">
        <button className="bkb" type="button" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
        <span className="tag">Help request</span>
      </div>
      <h1>What do you<br /><i>need help with?</i></h1>
      <p>Ask anytime. Members who can help send an offer, and you decide who to connect with.</p>
      {circles.length ? (
        <>
          <label className="p2-select-row"><Icon name="circle" size={17} /><span>Ask in</span>
            <select value={circleId} onChange={(event) => setCircleId(event.target.value)}>{circles.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          </label>
          <label className="p1-review-field"><span>Your ask</span><textarea className="p1-textarea" value={ask} onChange={(event) => setAsk(event.target.value)} rows={4} maxLength={240} placeholder="Be specific: what, where, and what a good outcome looks like" /></label>
          <label className="f"><span>Timing (optional)</span><input value={timing} onChange={(event) => setTiming(event.target.value)} placeholder="This week, before Oct 18…" maxLength={40} /></label>
          <div className="card p1-static-notice p2-bottom-space"><b>Who sees it</b><p>Active members of {circle?.name} see your ask with your {persona} persona name. Your contact details and other personas aren’t shown.</p></div>
          <div className="ft"><button className="btn" type="button" disabled={ask.trim().length < 5 || !circle} onClick={() => onSubmit(circleId, ask, timing)}>Post my request</button></div>
        </>
      ) : <div className="card p1-empty-state"><h2>Join a circle first</h2><p>Help requests go to members of circles you’re active in.</p></div>}
    </>
  );
}

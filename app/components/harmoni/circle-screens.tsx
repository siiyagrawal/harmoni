import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  CIRCLE_AREAS,
  CIRCLE_CATEGORIES,
  HUB_APPLICATION_EMAIL,
  admissionLabel,
  feeLabel,
  isFull,
  type CircleAdmission,
  type CircleDemo,
  type CircleDraft,
  type CircleKind,
  type CircleLink,
  type CircleVisibility,
  type DemoCircle,
  type GuestField,
  type HostSettings,
  type HubRole,
  type JoinOutcome,
} from "./circle-data";
import { Avatar, Icon } from "./ui";

export type ManageSection = "requests" | "members" | "invites" | "settings" | "connections";

const GUEST_FIELD_LABELS: Record<GuestField, string> = {
  purpose: "Purpose and rules",
  host: "Host name",
  topics: "Topics",
  memberCount: "Member count",
  memberNames: "Member names (only members whose own settings allow it)",
};

const HUB_ROLE_LABELS: Record<HubRole, string> = {
  super: "Hub Super Admin",
  l1: "Level 1 Admin",
  l2: "Level 2 Admin",
  participant: "Participant",
};

function statusLabel(circle: DemoCircle) {
  if (circle.role === "host") {
    if (circle.kind === "hub" && circle.hubStatus === "requested") return { label: "Hub requested", tone: "wait" };
    return circle.published ? { label: "Hosting", tone: "ok" } : { label: "Draft", tone: "wait" };
  }
  switch (circle.status) {
    case "active": return { label: "Active", tone: "ok" };
    case "pending": return { label: "Pending approval", tone: "wait" };
    case "payment": return { label: "Payment required", tone: "wait" };
    case "invited": return { label: "Invited", tone: "info" };
    case "declined": return { label: "Declined", tone: "muted" };
    case "withdrawn": return { label: "Withdrawn", tone: "muted" };
    case "left": return { label: "Left", tone: "muted" };
    default:
      if (!circle.available) return { label: "Unavailable", tone: "muted" };
      if (isFull(circle)) return { label: "Circle full", tone: "muted" };
      return { label: circle.admission === "open" ? "Open" : circle.admission === "approval" ? "Approval" : "Invite only", tone: "info" };
  }
}

function StatusPill({ circle }: { circle: DemoCircle }) {
  const status = statusLabel(circle);
  return <span className={`p2-status ${status.tone}`}>{status.label}</span>;
}

function CircleMark({ circle, size = "md" }: { circle: Pick<DemoCircle, "kind" | "name">; size?: "md" | "lg" }) {
  return <span className={`p2-circle-mark ${size}`} aria-hidden="true">{circle.kind === "hub" ? <Icon name="hub" size={size === "lg" ? 30 : 20} /> : circle.name.slice(0, 1).toUpperCase()}</span>;
}

function CircleRow({ circle, meta, onOpen }: { circle: DemoCircle; meta: string; onOpen: () => void }) {
  return (
    <button className="card p2-circle-row" type="button" onClick={onOpen}>
      <CircleMark circle={circle} />
      <span className="p2-circle-copy"><b>{circle.name}</b><small>{meta}</small></span>
      <StatusPill circle={circle} />
    </button>
  );
}

function SubHeader({ label, onBack, action }: { label: string; onBack: () => void; action?: ReactNode }) {
  return (
    <div className="p2-subheader">
      <button className="bkb" type="button" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
      <span className="tag">{label}</span>
      {action ?? <span className="header-spacer" />}
    </div>
  );
}

function OptionList<T extends string>({ value, options, onChange }: {
  value: T;
  options: Array<{ value: T; title: string; detail: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="p1-visibility-list">
      {options.map((option) => (
        <button type="button" key={option.value} className={`p1-visibility-option${value === option.value ? " selected" : ""}`} onClick={() => onChange(option.value)} aria-pressed={value === option.value}>
          <span className="p1-radio" aria-hidden="true">{value === option.value ? "✓" : ""}</span>
          <span><b>{option.title}</b><small>{option.detail}</small></span>
        </button>
      ))}
    </div>
  );
}

const VISIBILITY_CHOICES: Array<{ value: CircleVisibility; title: string; detail: string }> = [
  { value: "public", title: "Public and discoverable", detail: "Listed in Discover with the preview fields you choose" },
  { value: "private", title: "Private and hidden", detail: "Never listed; reachable only from an invitation" },
];

const ADMISSION_CHOICES: Array<{ value: CircleAdmission; title: string; detail: string }> = [
  { value: "open", title: "Open joining", detail: "Verified people join directly after confirming they want to take part" },
  { value: "approval", title: "Host approval", detail: "You approve or decline each request" },
  { value: "invite", title: "Invitation only", detail: "Only people you invite can join" },
];

export function CirclesHomeScreen({
  demo,
  personal,
  joinIntent,
  onOpenPersonal,
  onOpenCircle,
  onCreate,
  onResumeJoin,
  onDismissIntent,
}: {
  demo: CircleDemo;
  personal: { name: string; members: number; waiting: number };
  joinIntent: DemoCircle | null;
  onOpenPersonal: () => void;
  onOpenCircle: (id: string) => void;
  onCreate: () => void;
  onResumeJoin: () => void;
  onDismissIntent: () => void;
}) {
  const [codeOpen, setCodeOpen] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const { circles, segment, setSegment, discover, setDiscover } = demo;
  const joined = circles.filter((circle) => circle.role !== "host" && ["active", "pending", "payment", "invited"].includes(circle.status));
  const past = circles.filter((circle) => circle.role !== "host" && ["declined", "withdrawn", "left"].includes(circle.status));
  const hosting = circles.filter((circle) => circle.role === "host");
  const query = discover.query.trim().toLowerCase();
  const listed = circles.filter((circle) =>
    circle.published
    && circle.visibility === "public"
    && circle.role !== "host"
    && (discover.category === "All" || circle.category === discover.category)
    && (discover.area === "Anywhere" || circle.area === discover.area)
    && (!query || `${circle.name} ${circle.purpose} ${circle.topics.join(" ")} ${circle.host}`.toLowerCase().includes(query)),
  );

  function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = code.trim().toUpperCase().replace(/[\s-]/g, "");
    const circle = circles.find((item) => item.joinCode.replace("-", "") === normalized);
    if (!circle || !circle.published) {
      setCodeError("We couldn’t find an active circle for that code.");
      return;
    }
    setCodeError("");
    setCode("");
    setCodeOpen(false);
    onOpenCircle(circle.id);
  }

  return (
    <>
      <p className="tag p1-eyebrow">Your audiences</p>
      <h1 className="circle-title">Your <i>circles</i></h1>
      {joinIntent && ["none", "withdrawn", "invited"].includes(joinIntent.status) ? (
        <div className="card p2-intent">
          <span className="p1-spark">✦</span>
          <div>
            <b>Finish joining {joinIntent.name}</b>
            <p>Your persona is saved, but saving didn’t join the circle. Review its rules to join.</p>
            <div className="p2-inline-row"><button className="pill on" type="button" onClick={onResumeJoin}>Review and join</button><button className="pill" type="button" onClick={onDismissIntent}>Not now</button></div>
          </div>
        </div>
      ) : null}
      <div className="p2-action-row">
        <button className="btn s" type="button" onClick={onCreate}>Create a circle</button>
        <button className="btn g s" type="button" onClick={() => setCodeOpen((open) => !open)} aria-expanded={codeOpen}>Join with a code</button>
      </div>
      {codeOpen ? (
        <form className="card p2-code-form" onSubmit={submitCode}>
          <label className="f"><span>Join code</span><input value={code} onChange={(event) => setCode(event.target.value)} placeholder="For example, CF-4821" maxLength={12} /></label>
          {codeError ? <p className="auth-error" role="alert">{codeError}</p> : null}
          <button className="btn s" type="submit" disabled={!code.trim()}>Open circle</button>
        </form>
      ) : null}
      <div className="p1-input-mode p2-segments" role="tablist" aria-label="Circle lists">
        {(["joined", "hosting", "discover"] as const).map((item) => (
          <button key={item} type="button" role="tab" aria-selected={segment === item} className={segment === item ? "on" : ""} onClick={() => setSegment(item)}>
            {item === "joined" ? "Joined" : item === "hosting" ? `Hosting${hosting.length ? ` · ${hosting.length}` : ""}` : "Discover"}
          </button>
        ))}
      </div>

      {segment === "joined" ? (
        <>
          <button className="card p2-circle-row p2-personal" type="button" onClick={onOpenPersonal}>
            <span className="p2-circle-mark"><Icon name="contacts" size={20} /></span>
            <span className="p2-circle-copy"><b>{personal.name}</b><small>Your personal circle · {personal.members} {personal.members === 1 ? "person" : "people"}</small></span>
            {personal.waiting ? <span className="p2-status wait">{personal.waiting} waiting</span> : <Icon name="chevron" size={17} />}
          </button>
          {joined.map((circle) => <CircleRow key={circle.id} circle={circle} meta={`${circle.kind === "hub" ? "Hub Circle" : circle.category} · as ${circle.persona ?? "Main card"}`} onOpen={() => onOpenCircle(circle.id)} />)}
          {!joined.length ? <div className="card p1-empty-state"><h2>No other circles yet</h2><p>Find a circle in Discover, or open an invitation link or join code.</p><button className="btn g s" type="button" onClick={() => setSegment("discover")}>Discover circles</button></div> : null}
          {past.length ? <><h2 className="p1-section-title">Past requests</h2>{past.map((circle) => <CircleRow key={circle.id} circle={circle} meta={circle.category} onOpen={() => onOpenCircle(circle.id)} />)}</> : null}
        </>
      ) : null}

      {segment === "hosting" ? (
        <>
          {hosting.map((circle) => {
            const pending = circle.requests.filter((request) => request.status === "pending").length;
            return (
              <button className="card p2-circle-row p2-hosted" type="button" key={circle.id} onClick={() => onOpenCircle(circle.id)}>
                <CircleMark circle={circle} />
                <span className="p2-circle-copy">
                  <b>{circle.name}</b>
                  <small>{circle.memberCount}{circle.capacity ? ` of ${circle.capacity}` : ""} members · {admissionLabel(circle.admission)}</small>
                  {circle.capacity ? <span className="p2-meter" aria-hidden="true"><i style={{ width: `${Math.min(100, (circle.memberCount / circle.capacity) * 100)}%` }} /></span> : null}
                </span>
                {pending ? <span className="p2-status wait">{pending} to review</span> : <StatusPill circle={circle} />}
              </button>
            );
          })}
          {!hosting.length ? <div className="card p1-empty-state"><h2>Host your first circle</h2><p>Set its purpose, who can find it, how people join, and any fee or capacity.</p><button className="btn g s" type="button" onClick={onCreate}>Create a circle</button></div> : null}
        </>
      ) : null}

      {segment === "discover" ? (
        <>
          <div className="p2-search">
            <Icon name="search" size={18} />
            <input className="sr" value={discover.query} onChange={(event) => setDiscover((current) => ({ ...current, query: event.target.value }))} placeholder="Search circles, topics or hosts" aria-label="Search circles" />
          </div>
          <div className="fl">
            {["All", ...CIRCLE_CATEGORIES].map((category) => (
              <button key={category} type="button" className={`pill${discover.category === category ? " on" : ""}`} onClick={() => setDiscover((current) => ({ ...current, category }))}>{category}</button>
            ))}
          </div>
          <label className="p2-select-row"><Icon name="pin" size={17} /><span>Area</span>
            <select value={discover.area} onChange={(event) => setDiscover((current) => ({ ...current, area: event.target.value }))}>
              {CIRCLE_AREAS.map((area) => <option key={area}>{area}</option>)}
            </select>
          </label>
          {listed.map((circle) => (
            <button className="card p2-listing" type="button" key={circle.id} onClick={() => onOpenCircle(circle.id)}>
              <div className="p2-listing-head"><CircleMark circle={circle} /><span className="p2-circle-copy"><b>{circle.name}</b><small>Hosted by {circle.host} · {circle.area}</small></span><StatusPill circle={circle} /></div>
              <p>{circle.purpose}</p>
              <div className="p2-listing-meta"><span>{admissionLabel(circle.admission)}</span><span>{feeLabel(circle.fee)}</span>{circle.guestFields.includes("memberCount") ? <span>{circle.memberCount} members</span> : null}</div>
            </button>
          ))}
          {!listed.length ? <div className="card p1-empty-state"><h2>No circles match</h2><p>Try another category or area, or clear your search.</p><button className="btn g s" type="button" onClick={() => setDiscover({ query: "", category: "All", area: "Anywhere" })}>Clear filters</button></div> : null}
          <p className="p1-demo-caption">Private circles never appear here, and member lists are never shown in Discover. A listed circle may still need approval or a fee.</p>
        </>
      ) : null}
      <p className="p1-demo-caption">Sample circles for this UI preview. Your personal circle and its requests stay connected to your account.</p>
    </>
  );
}

export function CircleDetailScreen({
  circle,
  onBack,
  onJoin,
  onWithdraw,
  onLeave,
  onDeclineInvite,
  onManage,
  onShare,
  onHub,
  onLinkConsent,
  spotlight,
}: {
  circle: DemoCircle;
  spotlight?: ReactNode;
  onBack: () => void;
  onJoin: () => void;
  onWithdraw: () => void;
  onLeave: () => void;
  onDeclineInvite: () => void;
  onManage: () => void;
  onShare: () => void;
  onHub: () => void;
  onLinkConsent: (link: CircleLink, allowed: boolean) => void;
}) {
  const [confirmLeave, setConfirmLeave] = useState(false);
  const full = isFull(circle);
  const isHost = circle.role === "host";
  const canInvite = isHost || (circle.status === "active" && circle.settings.whoCanInvite === "members");
  const activeLinks = circle.links.filter((link) => link.status === "active");
  const hubInactive = circle.kind === "hub" && circle.hubStatus === "requested";

  function statusCard() {
    if (isHost) {
      return (
        <div className="card p2-status-card">
          <b>{hubInactive ? "Hub requested — not active yet" : circle.published ? "You host this circle" : "Draft — not published"}</b>
          <p>{hubInactive ? "Harmoni reviews Hub applications by email. This Hub stays inactive until Harmoni’s platform Super Admin enables it." : circle.published ? "Manage requests, members, invitations, connections and settings." : "Paid circles can’t publish until payment collection, payouts and refunds are approved."}</p>
          <button className="btn s" type="button" onClick={onManage}>Manage circle</button>
        </div>
      );
    }
    switch (circle.status) {
      case "active":
        return (
          <div className="card p2-status-card ok">
            <b>You’re an active member</b>
            <p>You joined as <strong>{circle.persona ?? "Main card"}</strong>. Your other personas aren’t shown here.</p>
            {confirmLeave ? (
              <div className="p2-inline-row"><button className="pill p2-danger" type="button" onClick={() => { onLeave(); setConfirmLeave(false); }}>Leave {circle.name}</button><button className="pill" type="button" onClick={() => setConfirmLeave(false)}>Stay</button></div>
            ) : <button className="lk p2-inline-link" type="button" onClick={() => setConfirmLeave(true)}>Leave circle</button>}
          </div>
        );
      case "pending":
        return (
          <div className="card p2-status-card wait">
            <b>Waiting for host approval</b>
            <p>{circle.host} will review your request{circle.fee.mode === "paid" ? ". You’ll only be asked to pay after you’re approved" : ""}. You’re not a member yet.</p>
            <button className="lk p2-inline-link" type="button" onClick={onWithdraw}>Withdraw request</button>
          </div>
        );
      case "payment":
        return (
          <div className="card p2-status-card wait">
            <b>Payment required to activate</b>
            <p>{circle.admission === "approval" ? "You were approved. " : ""}Your membership becomes active after the {feeLabel(circle.fee)} fee is paid. Payment collection isn’t connected in this preview.</p>
            <button className="btn s" type="button" disabled>Pay {feeLabel(circle.fee)}</button>
            <button className="lk p2-inline-link" type="button" onClick={onWithdraw}>Withdraw</button>
          </div>
        );
      case "invited":
        return (
          <div className="card p2-status-card info">
            <b>You’re invited</b>
            <p>{circle.host} invited you. An invitation isn’t membership until you accept.</p>
            <button className="btn s" type="button" onClick={onJoin} disabled={full}>{full ? "Circle full" : "Review and accept"}</button>
            <button className="lk p2-inline-link" type="button" onClick={onDeclineInvite}>Decline invitation</button>
          </div>
        );
      case "declined":
        return <div className="card p2-status-card muted"><b>Request not approved</b><p>The host declined this request. Hosts don’t share reasons.</p></div>;
      default: {
        if (!circle.available) return <div className="card p2-status-card muted"><b>This circle isn’t available</b><p>It may have been closed or paused by its host.</p></div>;
        if (full) return <div className="card p2-status-card muted"><b>Circle full</b><p>All {circle.capacity} places are taken. There’s no automatic waitlist.</p><button className="btn s" type="button" disabled>Circle full</button></div>;
        if (circle.admission === "invite") return <div className="card p2-status-card muted"><b>Invitation only</b><p>You can join only from a personal invitation sent by the host.</p></div>;
        return (
          <div className="card p2-status-card">
            <b>{circle.status === "withdrawn" || circle.status === "left" ? "Want to rejoin?" : "Interested in joining?"}</b>
            <p>{circle.admission === "approval" ? "The host reviews each request." : "You can join straight away."}{circle.fee.mode === "paid" ? ` Fee: ${feeLabel(circle.fee)}.` : ""}</p>
            <button className="btn s" type="button" onClick={onJoin}>{circle.admission === "approval" ? "Request to join" : "Join circle"}</button>
          </div>
        );
      }
    }
  }

  return (
    <>
      <SubHeader label={circle.kind === "hub" ? "Hub Circle" : "General Circle"} onBack={onBack} />
      <div className="p2-detail-hero"><CircleMark circle={circle} size="lg" /></div>
      <h1 className="p2-detail-title">{circle.name}</h1>
      <div className="p1-invite-meta">
        <span className="pill">{circle.visibility === "public" ? "Discoverable" : "Private"}</span>
        <span className="pill">{admissionLabel(circle.admission)}</span>
        <span className="pill">{feeLabel(circle.fee)}</span>
        {circle.capacity ? <span className="pill">{circle.memberCount}/{circle.capacity} places</span> : null}
      </div>
      <div className="card p1-invite-card">
        <span className="tag">THE PURPOSE</span>
        <p>{circle.purpose}</p>
        <div className="p1-invite-topics">{circle.topics.map((topic) => <span key={topic}>{topic}</span>)}</div>
      </div>
      {statusCard()}
      {spotlight}
      <div className="card p2-terms">
        <div><small>Host</small><b>{circle.host}</b></div>
        <div><small>Area</small><b>{circle.area}</b></div>
        <div><small>Joining</small><b>{admissionLabel(circle.admission)}</b></div>
        <div><small>Fee</small><b>{feeLabel(circle.fee)}</b></div>
      </div>
      {circle.fee.mode === "paid" ? <p className="p2-fine">{circle.fee.terms} A circle fee is separate from Harmoni Premium.</p> : null}
      {canInvite && circle.published && !hubInactive ? <button className="btn g s" type="button" onClick={onShare}>Invite people · QR, link or code</button> : null}
      {circle.kind === "hub" && circle.hub && (circle.status === "active" || isHost) ? <button className="btn g s" type="button" onClick={onHub}>Hub structure and notices</button> : null}
      {circle.status === "active" && !isHost && activeLinks.length ? (
        <>
          <h2 className="p1-section-title">Connected circles</h2>
          {activeLinks.map((link) => {
            const allowed = circle.linkConsent[link.id] ?? false;
            return (
              <div className="card p2-consent" key={link.id}>
                <div className="tg">
                  <div><b>Include me in matching with {link.otherName}</b><div className="tag">Only your approved persona for this circle. No chat, history or contact details are shared.</div></div>
                  <button className={`sx${allowed ? " on" : ""}`} type="button" onClick={() => onLinkConsent(link, !allowed)} aria-pressed={allowed} aria-label={`Include me in matching with ${link.otherName}`} />
                </div>
              </div>
            );
          })}
        </>
      ) : null}
      {circle.status !== "active" && !isHost ? <p className="p2-fine">Member names and details are visible only to active members, and only as each member allows.</p> : null}
    </>
  );
}

export function CircleJoinScreen({
  circle,
  personas,
  onBack,
  onSubmit,
  onOpenCircle,
  onDone,
}: {
  circle: DemoCircle;
  personas: string[];
  onBack: () => void;
  onSubmit: (persona: string) => JoinOutcome;
  onOpenCircle: () => void;
  onDone: () => void;
}) {
  const [persona, setPersona] = useState(personas[personas.length - 1] ?? "Main card");
  const [participate, setParticipate] = useState(false);
  const [feeAccepted, setFeeAccepted] = useState(false);
  const [outcome, setOutcome] = useState<JoinOutcome | null>(null);
  const paid = circle.fee.mode === "paid";
  const actionLabel = circle.status === "invited" ? "Accept invitation" : circle.admission === "approval" ? "Send join request" : paid ? "Continue to payment" : "Join circle";

  if (outcome) {
    const copy: Record<JoinOutcome, { title: ReactNode; text: string; icon: "check" | "calendar" | "lock" | "close" }> = {
      active: { title: <>You’re <i>in.</i></>, text: `You’re now an active member of ${circle.name} as ${persona}.`, icon: "check" },
      pending: { title: <>Request <i>sent.</i></>, text: `${circle.host} will review it. You’re not a member until it’s approved${paid ? ", and you’ll only pay after approval" : ""}.`, icon: "calendar" },
      payment: { title: <>Payment <i>required.</i></>, text: `Your place becomes active once the ${feeLabel(circle.fee)} fee is paid. Payment collection isn’t connected in this preview.`, icon: "lock" },
      full: { title: <>This circle <i>is full.</i></>, text: "Someone took the last place first. There’s no automatic waitlist, and nothing was charged.", icon: "close" },
      unavailable: { title: <>Not <i>available.</i></>, text: "This circle or invitation is no longer available. Nothing changed on your account.", icon: "close" },
    };
    const content = copy[outcome];
    return (
      <>
        <div className="hd"><span className="tag">{circle.name}</span></div>
        <div className="p1-shield"><Icon name={content.icon} size={28} /></div>
        <h1 className="p2-center">{content.title}</h1>
        <p className="c">{content.text}</p>
        <button className="lk p2-bottom-space" type="button" onClick={onDone}>Back to circles</button>
        <div className="ft"><button className="btn" type="button" onClick={onOpenCircle}>Open circle</button></div>
      </>
    );
  }

  return (
    <>
      <div className="hd">
        <button className="bkb" type="button" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
        <span className="tag">{circle.status === "invited" ? "Accept invitation" : "Join circle"}</span>
      </div>
      <span className="p1-eyebrow">Before you join</span>
      <h1>{circle.name}</h1>
      <div className="card p2-terms">
        <div><small>Host</small><b>{circle.host}</b></div>
        <div><small>Type</small><b>{circle.kind === "hub" ? "Hub Circle" : "General Circle"}</b></div>
        <div><small>Joining</small><b>{admissionLabel(circle.admission)}</b></div>
        <div><small>Capacity</small><b>{circle.capacity ? `${circle.capacity - circle.memberCount} places left` : "No limit"}</b></div>
      </div>
      <h2 className="p1-section-title">Join as</h2>
      <OptionList
        value={persona}
        onChange={setPersona}
        options={personas.map((name) => ({ value: name, title: name, detail: name === "Main card" ? "Your published card" : "Only this persona is shown in this circle" }))}
      />
      {paid && circle.fee.mode === "paid" ? (
        <div className="card p2-fee-card">
          <b>{feeLabel(circle.fee)}</b>
          <p>{circle.fee.terms}</p>
          <p className="p2-fine">Currency {circle.fee.currency}. Taxes and the exact total are shown before payment. This circle fee is separate from Harmoni Premium.</p>
          <label className="p1-check-row"><input type="checkbox" checked={feeAccepted} onChange={(event) => setFeeAccepted(event.target.checked)} /><span>I understand the fee and its terms{circle.admission === "approval" ? ", charged only if I’m approved" : ""}.</span></label>
        </div>
      ) : null}
      <label className="p1-adult-check p2-authorize"><input type="checkbox" checked={participate} onChange={(event) => setParticipate(event.target.checked)} /><span>I want to take part in {circle.name} and follow its purpose and rules.</span></label>
      <div className="ft"><button className="btn" type="button" disabled={!participate || (paid && !feeAccepted)} onClick={() => setOutcome(onSubmit(persona))}>{actionLabel}</button></div>
    </>
  );
}

export function CreateCircleScreen({
  draft,
  onDraft,
  onBack,
  onHubApply,
  onPublish,
}: {
  draft: CircleDraft;
  onDraft: (update: (current: CircleDraft) => CircleDraft) => void;
  onBack: () => void;
  onHubApply: () => void;
  onPublish: (kind: CircleKind) => void;
}) {
  const [step, setStep] = useState(0);
  const paid = draft.feeMode === "paid";
  const set = <K extends keyof CircleDraft>(key: K, value: CircleDraft[K]) => onDraft((current) => ({ ...current, [key]: value }));
  const toggleGuestField = (field: GuestField) => onDraft((current) => ({
    ...current,
    guestFields: current.guestFields.includes(field) ? current.guestFields.filter((item) => item !== field) : [...current.guestFields, field],
  }));
  const paidValid = !paid || (Number.parseFloat(draft.amount) > 0 && draft.terms.trim().length > 0);
  const capacityValid = !draft.capacityOn || Number.parseInt(draft.capacity, 10) >= 2;
  const labels = ["Type", "Name & purpose", "Access & membership", "Review"];

  return (
    <>
      <div className="hd">
        <button className="bkb" type="button" onClick={step === 0 ? onBack : () => setStep(step - 1)} aria-label="Back"><Icon name="back" /></button>
        <div className="pg"><i style={{ width: `${(step + 1) * 25}%` }} /></div>
        <span className="tag">{labels[step]}</span>
      </div>

      {step === 0 ? (
        <>
          <span className="p1-eyebrow">Create a circle</span>
          <h1>What kind of<br /><i>circle?</i></h1>
          <p>Most circles are General Circles. Hub Circles are for organisations with branches and admins.</p>
          <div className="p1-type-list">
            <button className="p1-type-card selected" type="button" onClick={() => setStep(1)}>
              <span className="p1-type-icon" aria-hidden="true"><Icon name="circle" size={22} /></span>
              <span className="p1-type-copy"><b>General Circle</b><small>Set your own visibility, joining rules, fee and capacity</small></span>
              <Icon name="chevron" size={17} />
            </button>
            <button className="p1-type-card" type="button" onClick={onHubApply}>
              <span className="p1-type-icon" aria-hidden="true"><Icon name="hub" size={22} /></span>
              <span className="p1-type-copy"><b>Apply for a Hub Circle</b><small>Branches with Level 1 and Level 2 admins. Reviewed and enabled by Harmoni</small></span>
              <Icon name="chevron" size={17} />
            </button>
          </div>
          <div className="p1-note"><Icon name="sparkle" size={18} /><span>A requested Hub isn’t active until Harmoni enables it.</span></div>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <h1>Name and<br /><i>purpose.</i></h1>
          <p>Guests see this before they decide to answer questions or join.</p>
          <label className="f"><span>Circle name</span><input value={draft.name} onChange={(event) => set("name", event.target.value)} maxLength={50} placeholder="For example, Sunday Builders" /></label>
          <label className="p1-review-field"><span>Purpose</span><textarea className="p1-textarea p1-review-textarea" value={draft.purpose} onChange={(event) => set("purpose", event.target.value)} maxLength={240} rows={3} placeholder="Who is this for, and what do people help each other with?" /></label>
          <label className="p2-select-row"><Icon name="circle" size={17} /><span>Category</span><select value={draft.category} onChange={(event) => set("category", event.target.value)}>{CIRCLE_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label className="p2-select-row"><Icon name="pin" size={17} /><span>Area</span><select value={draft.area} onChange={(event) => set("area", event.target.value)}>{CIRCLE_AREAS.filter((area) => area !== "Anywhere").map((area) => <option key={area}>{area}</option>)}</select></label>
          <label className="f"><span>Topics (comma separated)</span><input value={draft.topics} onChange={(event) => set("topics", event.target.value)} placeholder="Design, Climate, Hiring" /></label>
          <div className="p2-footer-space" />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <h1>Access and<br /><i>membership.</i></h1>
          <div className="card p1-static-notice"><b>Independent settings</b><p>Visibility, joining and price are separate choices. For example: discoverable + host approval + paid, or private + invitation only + free.</p></div>
          <h2 className="p1-section-title">Who can find it?</h2>
          <OptionList value={draft.visibility} options={VISIBILITY_CHOICES} onChange={(value) => set("visibility", value)} />
          <h2 className="p1-section-title">What guests can preview</h2>
          <div className="card p1-public-preview">
            {(Object.keys(GUEST_FIELD_LABELS) as GuestField[]).map((field) => (
              <label className="p1-check-row" key={field}>
                <input type="checkbox" checked={field === "purpose" || draft.guestFields.includes(field)} disabled={field === "purpose"} onChange={() => toggleGuestField(field)} />
                <span>{GUEST_FIELD_LABELS[field]}</span>
              </label>
            ))}
          </div>
          <h2 className="p1-section-title">How people join</h2>
          <OptionList value={draft.admission} options={ADMISSION_CHOICES} onChange={(value) => set("admission", value)} />
          <h2 className="p1-section-title">Fee</h2>
          <div className="p1-input-mode" role="group" aria-label="Circle fee">
            <button type="button" className={!paid ? "on" : ""} onClick={() => set("feeMode", "free")}>Free</button>
            <button type="button" className={paid ? "on" : ""} onClick={() => set("feeMode", "paid")}>Paid</button>
          </div>
          {paid ? (
            <div className="card p2-fee-form">
              <div className="p2-two-col">
                <label className="f"><span>Price</span><input inputMode="decimal" value={draft.amount} onChange={(event) => set("amount", event.target.value.replace(/[^\d.]/g, ""))} placeholder="15" /></label>
                <label className="f"><span>Currency</span><select className="p2-select" value={draft.currency} onChange={(event) => set("currency", event.target.value)}>{["USD", "INR", "EUR", "GBP"].map((currency) => <option key={currency}>{currency}</option>)}</select></label>
              </div>
              <label className="f"><span>Billing</span><select className="p2-select" value={draft.basis} onChange={(event) => set("basis", event.target.value as CircleDraft["basis"])}><option value="month">Monthly</option><option value="year">Yearly</option><option value="once">One-time</option></select></label>
              <label className="p1-review-field"><span>Terms shown before anyone commits</span><textarea className="p1-textarea p1-review-textarea" value={draft.terms} onChange={(event) => set("terms", event.target.value)} rows={2} maxLength={240} placeholder="Renewal, cancellation and refund terms" /></label>
              <div className="card p2-warning"><b>Paid circles publish later</b><p>Payment collection, payouts, refunds and receipts still need approval. You can save a paid circle as a draft now; it can’t publish until collection works.{draft.admission === "approval" ? " Members will pay only after you approve them." : ""}</p></div>
            </div>
          ) : null}
          <h2 className="p1-section-title">Capacity</h2>
          <div className="tg">
            <div><b>Limit the number of members</b><div className="tag">Checked at admission. When full, people see “Circle full”; there’s no automatic waitlist.</div></div>
            <button className={`sx${draft.capacityOn ? " on" : ""}`} type="button" onClick={() => set("capacityOn", !draft.capacityOn)} aria-pressed={draft.capacityOn} aria-label="Limit the number of members" />
          </div>
          {draft.capacityOn ? <label className="f"><span>Maximum members</span><input inputMode="numeric" value={draft.capacity} onChange={(event) => set("capacity", event.target.value.replace(/\D/g, ""))} /></label> : null}
          <div className="p2-footer-space" />
        </>
      ) : null}

      {step === 3 ? (
        <>
          <h1>Review your<br /><i>circle.</i></h1>
          <div className="card p2-review">
            <div className="p2-listing-head"><CircleMark circle={{ kind: "general", name: draft.name || "C" }} /><span className="p2-circle-copy"><b>{draft.name}</b><small>{draft.category} · {draft.area}</small></span></div>
            <p>{draft.purpose}</p>
            <dl>
              <div><dt>Visibility</dt><dd>{draft.visibility === "public" ? "Public and discoverable" : "Private and hidden"}</dd></div>
              <div><dt>Guests see</dt><dd>{(["purpose", ...draft.guestFields.filter((field) => field !== "purpose")] as GuestField[]).map((field) => GUEST_FIELD_LABELS[field].split(" (")[0]).join(", ")}</dd></div>
              <div><dt>Joining</dt><dd>{admissionLabel(draft.admission)}</dd></div>
              <div><dt>Fee</dt><dd>{paid ? `${draft.currency} ${draft.amount || "0"} ${draft.basis === "once" ? "one-time" : `per ${draft.basis}`}` : "Free"}</dd></div>
              <div><dt>Capacity</dt><dd>{draft.capacityOn ? `${draft.capacity} members` : "No limit"}</dd></div>
            </dl>
          </div>
          {paid ? <div className="card p2-warning"><b>This will be saved as a draft</b><p>Paid circles can’t publish until payment collection is approved and working.</p></div> : null}
          <p className="p2-fine p2-bottom-space">After publishing, open Host settings for invitations, connections and Spotlight options. Changing settings later never silently widens what existing members share.</p>
        </>
      ) : null}

      {step > 0 ? (
        <div className="ft">
          {step < 3
            ? <button className="btn" type="button" disabled={(step === 1 && (!draft.name.trim() || !draft.purpose.trim())) || (step === 2 && (!paidValid || !capacityValid))} onClick={() => setStep(step + 1)}>Continue</button>
            : <button className="btn" type="button" onClick={() => onPublish("general")}>{paid ? "Save as draft" : "Publish circle"}</button>}
        </div>
      ) : null}
    </>
  );
}

const LINK_STATUS_LABELS: Record<CircleLink["status"], string> = {
  "awaiting-them": "Waiting for the other host",
  "awaiting-you": "Needs your approval",
  active: "Connected",
  disconnected: "Disconnected",
};

export function ManageCircleScreen({
  circle,
  demo,
  section,
  onSection,
  onBack,
  onShare,
  onLink,
  onHub,
  onSpotlights,
  onToast,
}: {
  circle: DemoCircle;
  demo: CircleDemo;
  onSpotlights: () => void;
  section: ManageSection;
  onSection: (section: ManageSection) => void;
  onBack: () => void;
  onShare: () => void;
  onLink: () => void;
  onHub: () => void;
  onToast: (message: string) => void;
}) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    visibility: circle.visibility,
    admission: circle.admission,
    capacityOn: circle.capacity !== null,
    capacity: String(circle.capacity ?? 50),
    guestFields: circle.guestFields,
    ...circle.settings,
  });
  const full = isFull(circle);
  const pending = circle.requests.filter((request) => request.status === "pending");
  const resolved = circle.requests.filter((request) => request.status !== "pending");
  const broadening = (circle.visibility === "private" && settings.visibility === "public")
    || (!circle.guestFields.includes("memberNames") && settings.guestFields.includes("memberNames"))
    || (circle.admission !== "open" && settings.admission === "open");
  const hubInactive = circle.kind === "hub" && circle.hubStatus === "requested";

  function saveSettings() {
    const { visibility, admission, capacityOn, capacity, guestFields, ...hostSettings } = settings;
    const nextCapacity = capacityOn ? Math.max(circle.memberCount, Number.parseInt(capacity, 10) || circle.memberCount) : null;
    demo.updateSettings(circle.id, { visibility, admission, capacity: nextCapacity, guestFields, settings: hostSettings as Partial<HostSettings> });
    onToast(broadening ? "Settings saved. Existing members keep their current sharing choices." : "Circle settings saved.");
  }

  const tabs: Array<[ManageSection, string]> = [
    ["requests", `Requests${pending.length ? ` · ${pending.length}` : ""}`],
    ["members", "Members"],
    ["invites", "Invites"],
    ["connections", "Connections"],
    ["settings", "Settings"],
  ];

  return (
    <>
      <SubHeader label="Host settings" onBack={onBack} />
      <h1 className="p2-detail-title">{circle.name}</h1>
      <div className="card p2-capacity">
        <div><b>{circle.memberCount}{circle.capacity ? ` of ${circle.capacity}` : ""} members</b><span className="tag">{full ? "Circle full · new joins are paused" : circle.capacity ? `${circle.capacity - circle.memberCount} places left` : "No member limit"}</span></div>
        {circle.capacity ? <span className="p2-meter" aria-hidden="true"><i style={{ width: `${Math.min(100, (circle.memberCount / circle.capacity) * 100)}%` }} /></span> : null}
        <div className="p2-inline-row">
          {circle.published && !hubInactive ? <button className="pill" type="button" onClick={onShare}>Share entry · QR, link, code</button> : null}
          {circle.published && !hubInactive ? <button className="pill" type="button" onClick={onSpotlights}>Manage Spotlights</button> : null}
          {circle.kind === "hub" ? <button className="pill" type="button" onClick={onHub}>Hub structure</button> : null}
        </div>
      </div>
      {hubInactive ? <div className="card p2-warning"><b>Hub requested — not active</b><p>Harmoni reviews your application by email. Membership and branch tools unlock when Harmoni’s platform Super Admin enables this Hub.</p></div> : null}
      {!circle.published && !hubInactive ? <div className="card p2-warning"><b>Draft — not published</b><p>Paid circles can’t publish until payment collection is approved and working. You can still adjust settings.</p></div> : null}
      <div className="p2-tabs" role="tablist" aria-label="Host sections">
        {tabs.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={section === id} className={`pill${section === id ? " on" : ""}`} onClick={() => onSection(id)}>{label}</button>)}
      </div>

      {section === "requests" ? (
        <>
          {pending.map((request) => (
            <div className="card p2-request" key={request.id}>
              <div className="row"><Avatar name={request.name} size={44} /><div className="member-main"><b>{request.name}</b><div className="tag">As {request.persona} · {request.at}</div></div></div>
              {request.note ? <p>{request.note}</p> : null}
              {circle.fee.mode === "paid" ? <p className="p2-fine">Approving asks them to pay {feeLabel(circle.fee)}; they become active after payment.</p> : null}
              <div className="p2-inline-row">
                <button className="btn s" type="button" disabled={full} onClick={() => { demo.decideRequest(circle.id, request.id, "approved"); onToast(`${request.name} approved.`); }}>{full ? "Circle full" : "Approve"}</button>
                <button className="btn g s" type="button" onClick={() => { demo.decideRequest(circle.id, request.id, "declined"); onToast("Request declined. No reason is shared."); }}>Decline</button>
              </div>
            </div>
          ))}
          {!pending.length ? <div className="card p1-empty-state"><h2>No requests waiting</h2><p>{circle.admission === "approval" ? "New join requests will appear here." : `People join this circle ${circle.admission === "open" ? "directly" : "by invitation"}, so there’s nothing to review.`}</p></div> : null}
          {resolved.length ? <><h2 className="p1-section-title">Earlier decisions</h2><div className="lst">{resolved.map((request) => <div className="ct" key={request.id}><div className="m"><b>{request.name}</b><div className="tag">{request.status === "approved" ? "Approved" : "Declined"} · {request.at}</div></div></div>)}</div></> : null}
        </>
      ) : null}

      {section === "members" ? (
        <div className="lst">
          {circle.members.map((member) => (
            <div className="ct p2-member" key={member.id}>
              <Avatar name={member.name} size={42} />
              <div className="m"><b>{member.name}</b><div className="tag">{member.role === "host" ? "Host" : `Member since ${member.joined}`} · as {member.persona}</div></div>
              {member.role !== "host" ? (removeId === member.id
                ? <span className="p2-inline-row"><button className="pill p2-danger" type="button" onClick={() => { demo.removeMember(circle.id, member.id); setRemoveId(null); onToast(`${member.name} was removed.`); }}>Remove</button><button className="pill" type="button" onClick={() => setRemoveId(null)}>Cancel</button></span>
                : <button className="pill" type="button" onClick={() => setRemoveId(member.id)}>Remove</button>) : null}
            </div>
          ))}
          {circle.memberCount > circle.members.length ? <p className="p2-fine p2-list-note">Showing {circle.members.length} sample members of {circle.memberCount}.</p> : null}
        </div>
      ) : null}

      {section === "invites" ? (
        <>
          <form className="card p2-code-form" onSubmit={(event) => {
            event.preventDefault();
            if (!/^\S+@\S+\.\S+$/.test(inviteEmail)) return;
            demo.addEmailInvitation(circle.id, inviteEmail.trim().toLowerCase());
            setInviteEmail("");
            onToast("Invitation queued. Demo only: no email is sent.");
          }}>
            <b>Invite one person by email</b>
            <p className="p2-fine">A personal invitation for one person. They become a member only if they accept, and we never import their profile.</p>
            <label className="f"><span>Email</span><input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="name@example.com" /></label>
            <button className="btn s" type="submit" disabled={!/^\S+@\S+\.\S+$/.test(inviteEmail) || hubInactive}>Send invitation</button>
          </form>
          <h2 className="p1-section-title">Invitations</h2>
          <div className="lst">
            {circle.invitations.map((invitation) => (
              <div className="ct p2-member" key={invitation.id}>
                <span className="p2-circle-mark"><Icon name={invitation.kind === "email" ? "email" : "link"} size={18} /></span>
                <div className="m"><b>{invitation.kind === "link" ? `${invitation.target} · ${circle.joinCode}` : invitation.target}</b><div className="tag">{invitation.status === "active" ? "Active" : invitation.status[0].toUpperCase() + invitation.status.slice(1)} · {invitation.expires}{invitation.uses !== undefined ? ` · used ${invitation.uses} times` : ""}</div></div>
                {invitation.status === "active" ? <button className="pill" type="button" onClick={() => { demo.revokeInvitation(circle.id, invitation.id); onToast("Invitation revoked. The link and code stop working."); }}>Revoke</button> : null}
              </div>
            ))}
            {!circle.invitations.length ? <p className="p2-fine p2-list-note">No invitations yet.</p> : null}
          </div>
          <button className="btn g s" type="button" onClick={() => { demo.regenerateLink(circle.id); onToast("New link and join code created. The old ones stopped working."); }}>Replace reusable link and code</button>
          <p className="p2-fine">Reusable links and join codes can be used by anyone who has them; opening one isn’t admission. Who can invite: {circle.settings.whoCanInvite === "host" ? "only you" : "any active member"}.</p>
        </>
      ) : null}

      {section === "connections" ? (
        <>
          <p className="p2-fine">Connecting circles widens only the matching pool, for members who opt in. It never shares private histories, merges personas, opens chat, or reaches partner circles of partners.</p>
          {circle.links.map((link) => (
            <div className="card p2-link-card" key={link.id}>
              <div className="p2-listing-head"><span className="p2-circle-mark">{link.otherName[0]}</span><span className="p2-circle-copy"><b>{link.otherName}</b><small>Host: {link.otherHost}</small></span><span className={`p2-status ${link.status === "active" ? "ok" : link.status === "disconnected" ? "muted" : "wait"}`}>{LINK_STATUS_LABELS[link.status]}</span></div>
              {link.status === "active" ? <p className="p2-fine">{link.consented} of {link.eligible} of your members opted in to the shared matching pool.</p> : null}
              <div className="p2-inline-row">
                {link.status === "awaiting-you" ? <button className="pill on" type="button" onClick={() => demo.setLinkStatus(circle.id, link.id, "active")}>Approve</button> : null}
                {link.status === "awaiting-them" ? <button className="pill" type="button" onClick={() => { demo.setLinkStatus(circle.id, link.id, "active"); onToast(`Demo: ${link.otherHost} approved. Members can now opt in.`); }}>Simulate their approval</button> : null}
                {link.status === "active" ? <button className="pill p2-danger" type="button" onClick={() => { demo.setLinkStatus(circle.id, link.id, "disconnected"); onToast("Disconnected. The shared matching path is removed."); }}>Disconnect</button> : null}
                {link.status === "awaiting-them" || link.status === "awaiting-you" ? <button className="pill" type="button" onClick={() => demo.setLinkStatus(circle.id, link.id, "disconnected")}>{link.status === "awaiting-you" ? "Decline" : "Cancel request"}</button> : null}
              </div>
            </div>
          ))}
          {!circle.links.length ? <div className="card p1-empty-state"><h2>No connected circles</h2><p>Connect with another circle so members who opt in can be matched across both.</p></div> : null}
          <button className="btn g s" type="button" disabled={!circle.settings.allowLinking || !circle.published || hubInactive} onClick={onLink}>Connect another circle</button>
          {!circle.settings.allowLinking ? <p className="p2-fine">Circle connections are turned off in Settings.</p> : null}
        </>
      ) : null}

      {section === "settings" ? (
        <>
          <h2 className="p1-section-title">Visibility</h2>
          <OptionList value={settings.visibility} options={VISIBILITY_CHOICES} onChange={(visibility) => setSettings((current) => ({ ...current, visibility }))} />
          <h2 className="p1-section-title">Guest preview</h2>
          <div className="card p1-public-preview">
            {(Object.keys(GUEST_FIELD_LABELS) as GuestField[]).map((field) => (
              <label className="p1-check-row" key={field}>
                <input type="checkbox" checked={field === "purpose" || settings.guestFields.includes(field)} disabled={field === "purpose"} onChange={() => setSettings((current) => ({ ...current, guestFields: current.guestFields.includes(field) ? current.guestFields.filter((item) => item !== field) : [...current.guestFields, field] }))} />
                <span>{GUEST_FIELD_LABELS[field]}</span>
              </label>
            ))}
          </div>
          <h2 className="p1-section-title">Joining</h2>
          <OptionList value={settings.admission} options={ADMISSION_CHOICES} onChange={(admission) => setSettings((current) => ({ ...current, admission }))} />
          <h2 className="p1-section-title">Fee</h2>
          <div className="card p2-terms single"><div><small>Current fee</small><b>{feeLabel(circle.fee)}</b></div></div>
          <p className="p2-fine">Fee changes need approved payment collection and apply to new members only.</p>
          <div className="tg">
            <div><b>Member limit</b><div className="tag">Can’t be set below current members ({circle.memberCount}).</div></div>
            <button className={`sx${settings.capacityOn ? " on" : ""}`} type="button" onClick={() => setSettings((current) => ({ ...current, capacityOn: !current.capacityOn }))} aria-pressed={settings.capacityOn} aria-label="Member limit" />
          </div>
          {settings.capacityOn ? <label className="f"><span>Maximum members</span><input inputMode="numeric" value={settings.capacity} onChange={(event) => setSettings((current) => ({ ...current, capacity: event.target.value.replace(/\D/g, "") }))} /></label> : null}
          <h2 className="p1-section-title">Invitations</h2>
          <OptionList value={settings.whoCanInvite} onChange={(whoCanInvite) => setSettings((current) => ({ ...current, whoCanInvite }))} options={[
            { value: "host", title: "Only me", detail: "Only you can send invitations or share entry codes" },
            { value: "members", title: "Any active member", detail: "Members can invite and share this circle’s entry" },
          ]} />
          <h2 className="p1-section-title">Connections between members</h2>
          <OptionList value={settings.connectionApproval} onChange={(connectionApproval) => setSettings((current) => ({ ...current, connectionApproval }))} options={[
            { value: "member", title: "Member decides", detail: "The person receiving interest approves it" },
            { value: "host-then-member", title: "Host reviews first", detail: "You review, then the member still decides" },
          ]} />
          <div className="tg">
            <div><b>Allow connecting with other circles</b><div className="tag">Both hosts approve; members opt in individually.</div></div>
            <button className={`sx${settings.allowLinking ? " on" : ""}`} type="button" onClick={() => setSettings((current) => ({ ...current, allowLinking: !current.allowLinking }))} aria-pressed={settings.allowLinking} aria-label="Allow connecting with other circles" />
          </div>
          <h2 className="p1-section-title">Spotlight</h2>
          <div className="card p2-spotlight-settings">
            <label className="p2-select-row"><span>Slot length</span><select value={settings.spotlightSlot} onChange={(event) => setSettings((current) => ({ ...current, spotlightSlot: event.target.value as HostSettings["spotlightSlot"] }))}><option value="day">One day</option><option value="week">One week</option><option value="month">One month</option></select></label>
            <label className="p2-select-row"><span>Selection</span><select value={settings.spotlightSelection} onChange={(event) => setSettings((current) => ({ ...current, spotlightSelection: event.target.value as HostSettings["spotlightSelection"] }))}><option value="host">Host picks from opt-in queue</option><option value="random">Random from opt-in queue</option></select></label>
            <label className="p2-select-row"><span>Offers go to</span><select value={settings.spotlightResponse} onChange={(event) => setSettings((current) => ({ ...current, spotlightResponse: event.target.value as HostSettings["spotlightResponse"] }))}><option value="member">The featured member</option><option value="host">Host first</option></select></label>
            <p className="p2-fine">Members choose their own alert channels and how often they hear about Spotlights.</p>
          </div>
          {broadening ? <div className="card p2-warning"><b>This widens who can see the circle</b><p>Existing members keep their current sharing choices. Nothing they’ve shared becomes more visible unless they agree.</p></div> : null}
          <button className="btn s p2-save-settings" type="button" onClick={saveSettings}>Save settings</button>
        </>
      ) : null}
    </>
  );
}

export function CircleLinkScreen({
  circle,
  candidates,
  onBack,
  onRequest,
}: {
  circle: DemoCircle;
  candidates: DemoCircle[];
  onBack: () => void;
  onRequest: (targetId: string) => void;
}) {
  const [step, setStep] = useState<"choose" | "scope" | "sent">("choose");
  const [targetId, setTargetId] = useState<string | null>(null);
  const target = candidates.find((item) => item.id === targetId);

  return (
    <>
      <div className="hd">
        <button className="bkb" type="button" onClick={step === "scope" ? () => setStep("choose") : onBack} aria-label="Back"><Icon name="back" /></button>
        <div className="pg"><i style={{ width: step === "choose" ? "33%" : step === "scope" ? "66%" : "100%" }} /></div>
        <span className="tag">Connect circles</span>
      </div>
      {step === "choose" ? (
        <>
          <h1>Connect<br /><i>{circle.name}</i></h1>
          <p>Choose a circle to connect with. Its host must approve too.</p>
          {candidates.map((item) => (
            <button type="button" key={item.id} className={`card p2-circle-row${targetId === item.id ? " selected" : ""}`} onClick={() => setTargetId(item.id)} aria-pressed={targetId === item.id}>
              <CircleMark circle={item} />
              <span className="p2-circle-copy"><b>{item.name}</b><small>Host: {item.host} · {item.category}</small></span>
              <span className="p1-radio" aria-hidden="true">{targetId === item.id ? "✓" : ""}</span>
            </button>
          ))}
          {!candidates.length ? <div className="card p1-empty-state"><h2>No circles available</h2><p>You’re already connected to, or waiting on, every eligible circle.</p></div> : null}
          <div className="p2-footer-space" />
          <div className="ft"><button className="btn" type="button" disabled={!target} onClick={() => setStep("scope")}>Continue</button></div>
        </>
      ) : null}
      {step === "scope" && target ? (
        <>
          <h1>What this<br /><i>connection does.</i></h1>
          <div className="card p2-check-list">
            <div><Icon name="check" size={17} /><span>Members who opt in can be matched with opted-in members of {target.name}</span></div>
            <div><Icon name="check" size={17} /><span>Each circle keeps its own rules, host and members</span></div>
            <div><Icon name="check" size={17} /><span>Duplicate people across both circles are counted once</span></div>
          </div>
          <div className="card p2-check-list no">
            <div><Icon name="close" size={17} /><span>No private histories, requests or messages are shared</span></div>
            <div><Icon name="close" size={17} /><span>No chat permission and no merged personas</span></div>
            <div><Icon name="close" size={17} /><span>No access to circles {target.name} is connected to</span></div>
          </div>
          <p className="p2-fine p2-bottom-space">Either host can disconnect at any time, which removes the shared matching path.</p>
          <div className="ft"><button className="btn" type="button" onClick={() => { onRequest(target.id); setStep("sent"); }}>Send request to {target.host}</button></div>
        </>
      ) : null}
      {step === "sent" && target ? (
        <>
          <div className="p1-shield"><Icon name="calendar" size={28} /></div>
          <h1 className="p2-center">Request <i>sent.</i></h1>
          <p className="c">{target.host} needs to approve. After that, your members can choose to opt in. Nobody is added to the shared pool automatically.</p>
          <div className="ft"><button className="btn" type="button" onClick={onBack}>Back to host settings</button></div>
        </>
      ) : null}
    </>
  );
}

export function HubApplyScreen({
  applicantName,
  onBack,
  onSubmitted,
}: {
  applicantName: string;
  onBack: () => void;
  onSubmitted: (name: string, purpose: string) => void;
}) {
  const [organisation, setOrganisation] = useState("");
  const [applicant, setApplicant] = useState(applicantName);
  const [purpose, setPurpose] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [opened, setOpened] = useState(false);
  const [copied, setCopied] = useState("");
  const body = [
    "We would like to apply for creating a Hub Circle.",
    "",
    `Organisation: ${organisation}`,
    `Applicant: ${applicant}`,
    `Purpose: ${purpose}`,
    `Contact email: ${contact}`,
    phone ? `Phone: ${phone}` : "",
  ].filter((line, index) => line || index === 1).join("\n");
  const mailto = `mailto:${HUB_APPLICATION_EMAIL}?subject=${encodeURIComponent(`Hub Circle application — ${organisation}`)}&body=${encodeURIComponent(body)}`;
  const ready = organisation.trim() && applicant.trim() && purpose.trim() && /^\S+@\S+\.\S+$/.test(contact);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(`${label} copied.`);
    } catch {
      setCopied(`Copy blocked by the browser. Select the ${label.toLowerCase()} below and copy it manually.`);
    }
  }

  return (
    <>
      <div className="hd">
        <button className="bkb" type="button" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
        <span className="tag">Hub Circle application</span>
      </div>
      <div className="p1-shield"><Icon name="hub" size={28} /></div>
      <h1>Apply for a<br /><i>Hub Circle.</i></h1>
      <p>Hubs organise branches under a Hub Super Admin, Level 1 and Level 2 Admins. Harmoni reviews each application by email; there’s no portal.</p>
      <label className="f"><span>Organisation</span><input value={organisation} onChange={(event) => setOrganisation(event.target.value)} maxLength={80} /></label>
      <label className="f"><span>Applicant name</span><input value={applicant} onChange={(event) => setApplicant(event.target.value)} maxLength={80} /></label>
      <label className="p1-review-field"><span>Purpose</span><textarea className="p1-textarea p1-review-textarea" value={purpose} onChange={(event) => setPurpose(event.target.value)} rows={3} maxLength={300} placeholder="Who the Hub serves and how branches are organised" /></label>
      <label className="f"><span>Contact email</span><input type="email" value={contact} onChange={(event) => setContact(event.target.value)} /></label>
      <label className="f"><span>Phone (optional)</span><input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
      <h2 className="p1-section-title">Email preview</h2>
      <div className="card p2-email-preview">
        <small>To: {HUB_APPLICATION_EMAIL}</small>
        <pre>{body}</pre>
      </div>
      <div className="p2-inline-row">
        <button className="pill" type="button" onClick={() => void copy(HUB_APPLICATION_EMAIL, "Address")}>Copy address</button>
        <button className="pill" type="button" onClick={() => void copy(body, "Application text")}>Copy text</button>
      </div>
      {copied ? <p className="p2-fine" role="status">{copied}</p> : null}
      {opened ? (
        <div className="card p1-static-notice p2-bottom-space">
          <b>What happens next</b>
          <p>Harmoni replies by email. If approved, a platform Super Admin enables the Hub and appoints its lead. Until then it shows as “Hub requested” and stays inactive.</p>
          <button className="btn s" type="button" onClick={() => onSubmitted(organisation.trim(), purpose.trim())}>I’ve sent my application</button>
        </div>
      ) : <div className="p2-footer-space" />}
      {!opened ? (
        <div className="ft">
          {ready
            ? <a className="btn" href={mailto} onClick={() => setOpened(true)}>Open my email app</a>
            : <button className="btn" type="button" disabled>Complete the details to continue</button>}
        </div>
      ) : null}
    </>
  );
}

export function HubStructureScreen({ circle, onBack, onWrite }: { circle: DemoCircle; onBack: () => void; onWrite: () => void }) {
  const hub = circle.hub;
  if (!hub) {
    return (
      <>
        <SubHeader label="Hub structure" onBack={onBack} />
        <div className="card p2-warning"><b>Hub not active yet</b><p>The structure appears once Harmoni enables this Hub and appoints its lead.</p></div>
      </>
    );
  }
  const isAdmin = hub.myRole !== "participant";
  const myAdmin = hub.chain.find((item) => item.role === "l2");
  return (
    <>
      <SubHeader label="Hub structure" onBack={onBack} />
      <h1 className="p2-detail-title">{circle.name}</h1>
      <p>You’re a <b>{HUB_ROLE_LABELS[hub.myRole]}</b> in the {hub.myBranch} branch.</p>
      <h2 className="p1-section-title">Your chain</h2>
      <div className="p2-chain">
        {hub.chain.map((item) => (
          <div className={`p2-chain-step${item.role === hub.myRole ? " me" : ""}`} key={item.role}>
            <span className="p2-chain-dot" aria-hidden="true" />
            <div><small>{HUB_ROLE_LABELS[item.role]}</small><b>{item.name}</b></div>
          </div>
        ))}
      </div>
      <div className="card p2-route">
        <b>Upward</b>
        <p>Write to your assigned Level 2 Admin{myAdmin ? ` (${myAdmin.name.split(" · ")[0]})` : ""}. If needed, they escalate to your branch’s Level 1 Admin, then the Hub Super Admin. Replies follow the same chain.</p>
        <b>Downward</b>
        <p>Admins send notices to the branches they manage.</p>
        {hub.myRole === "participant" ? <button className="btn g s" type="button" onClick={onWrite}>Write to my Level 2 Admin</button> : null}
      </div>
      <div className="card p2-check-list no">
        <div><Icon name="close" size={17} /><span>No participant-to-participant chat</span></div>
        <div><Icon name="close" size={17} /><span>No conversations with other branches or unrelated admins</span></div>
        <div><Icon name="close" size={17} /><span>A match score never unlocks Hub chat</span></div>
        <div><Icon name="close" size={17} /><span>Hub roles never grant Harmoni-wide access</span></div>
      </div>
      <h2 className="p1-section-title">Notices</h2>
      <div className="lst p2-notices">
        {hub.notices.map((notice) => (
          <div className="ct" key={notice.id}>
            <div className="m"><b>{notice.text}</b><div className="tag">{notice.from} · {HUB_ROLE_LABELS[notice.role]} · {notice.at}</div></div>
          </div>
        ))}
      </div>
      {isAdmin ? (
        <>
          <h2 className="p1-section-title">Branches you manage</h2>
          {hub.branches.map((branch) => <div className="card" key={branch.name}><b>{branch.name}</b><div className="tag">Level 1: {branch.l1} · {branch.l2.length} Level 2 groups · {branch.participants} participants</div></div>)}
        </>
      ) : <p className="p2-fine">Participants see only their own chain. Admins don’t automatically see every conversation below them.</p>}
    </>
  );
}

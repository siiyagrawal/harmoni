import { useState } from "react";
import type { DemoCircle } from "./circle-data";
import { FunnelChart, StatTiles, Suggestions } from "./analytics-ui";
import { TOP_CONTRIBUTORS, type Contribution, type FeedbackOutcome, type FeedbackRequest, type ImpactDemo } from "./impact-data";
import { Avatar, Icon } from "./ui";

const BADGES = [
  { id: "first", label: "First confirmed help", earned: (people: number) => people >= 1 },
  { id: "three", label: "Helped 3 people", earned: (people: number) => people >= 3 },
  { id: "ten", label: "Helped 10 people", earned: (people: number) => people >= 10 },
];

const CONTRIBUTION_STATUS: Record<Contribution["status"], { label: string; tone: string }> = {
  confirmed: { label: "Confirmed useful", tone: "ok" },
  unknown: { label: "Not answered", tone: "muted" },
  "not-useful": { label: "Not useful", tone: "muted" },
  duplicate: { label: "Already counted", tone: "info" },
  "under-review": { label: "Under review", tone: "wait" },
};

export function ImpactEntryCard({ people, awaiting, onOpen }: { people: number; awaiting: number; onOpen: () => void }) {
  return (
    <button className="card p5-entry" type="button" onClick={onOpen}>
      <span className="p2-circle-mark"><Icon name="sparkle" size={20} /></span>
      <span className="p2-circle-copy"><b>Your impact</b><small>{people} {people === 1 ? "person" : "people"} confirmed your help{awaiting ? ` · ${awaiting} to answer` : ""}</small></span>
      <Icon name="chevron" size={17} />
    </button>
  );
}

export function ImpactScreen({ demo, circleName, onBack, onFeedback }: { demo: ImpactDemo; circleName: (id: string) => string; onBack: () => void; onFeedback: (request: FeedbackRequest) => void }) {
  const people = demo.confirmedPeople;
  const offers = demo.contributions.filter((item) => item.status !== "duplicate").length;
  const unknown = demo.contributions.filter((item) => item.status === "unknown").length;
  const awaiting = demo.feedback.filter((item) => item.status === "awaiting");
  const thanks = demo.contributions.filter((item) => item.thanks);

  return (
    <>
      <div className="hd">
        <button className="bkb" type="button" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
        <span className="tag">Your impact</span>
      </div>
      <span className="p1-eyebrow">Help that made a difference</span>
      <div className="p5-hero">
        <b>{people}</b>
        <span>{people === 1 ? "person has" : "people have"} confirmed your help was useful</span>
      </div>
      <StatTiles tiles={[
        { label: "Help offered", value: String(offers), detail: "unique offers" },
        { label: "Confirmed useful", value: String(people), detail: `of ${offers} offers` },
        { label: "Not answered", value: String(unknown), detail: "stays unknown" },
      ]} />
      <p className="p2-fine">Only the person you helped can confirm it, and each person counts once. Messages sent and offers made aren’t counted as help.</p>

      {awaiting.length ? (
        <>
          <h2 className="p1-section-title">Did their help work for you?</h2>
          {awaiting.map((request) => (
            <button className="card p2-circle-row" type="button" key={request.id} onClick={() => onFeedback(request)}>
              <Avatar name={request.counterpart} size={40} />
              <span className="p2-circle-copy"><b>{request.counterpart}</b><small>{request.context}</small></span>
              <span className="p2-status wait">Tell them</span>
            </button>
          ))}
        </>
      ) : null}

      <h2 className="p1-section-title">Recognition</h2>
      <div className="bdg p5-badges">
        {BADGES.map((badge) => {
          const earned = badge.earned(people);
          return <div className={earned ? "" : "lk2"} key={badge.id}><i>{earned ? "✦" : "✧"}</i>{badge.label}</div>;
        })}
      </div>
      <p className="p2-fine">Badges are simple recognition. They aren’t points you can spend.</p>

      {thanks.length ? (
        <>
          <h2 className="p1-section-title">Thanks you’ve received</h2>
          {thanks.map((item) => (
            <div className="card p3-quote" key={item.id}>“{item.thanks}”<div className="tag p5-thanks-by">{item.helped} · {circleName(item.circleId)}</div></div>
          ))}
        </>
      ) : null}

      <h2 className="p1-section-title">Your help</h2>
      <div className="lst p4-list">
        {demo.contributions.map((item) => (
          <div className="ct p4-delivery" key={item.id}>
            <div className="m"><b>{item.helped}</b><div className="tag">{item.context} · {circleName(item.circleId)} · {item.at}</div></div>
            <span className={`p2-status ${CONTRIBUTION_STATUS[item.status].tone}`}>{CONTRIBUTION_STATUS[item.status].label}</span>
          </div>
        ))}
      </div>
      <p className="p2-fine">Repeat confirmations for the same help count once. Unusual patterns are reviewed before they count.</p>

      <h2 className="p1-section-title">Your activity · last 30 days</h2>
      <FunnelChart title="From your card to a connection" steps={[
        { label: "Card and link opens", value: 34 },
        { label: "Cards saved", value: 12 },
        { label: "Connection requests", value: 6 },
        { label: "Approved connections", value: 4 },
      ]} note="Counts only. Who opened your card isn’t shown unless they connected." />
      <StatTiles tiles={[
        { label: "Median reply", value: "6h", detail: "to requests you received" },
        { label: "Matches shown", value: "9", detail: "3 interests sent" },
      ]} />
      <Suggestions items={[
        { title: "Add your availability.", detail: "2 of your matches had no timing to go on." },
        { title: "Reply sooner.", detail: "Requests answered within a day are accepted more often in your circles." },
      ]} />
      <p className="p1-demo-caption p2-bottom-space">Sample numbers for this preview. Analytics use event counts, never your answers or messages.</p>
    </>
  );
}

export function FeedbackScreen({ request, circleName, onBack, onAnswer }: {
  request: FeedbackRequest;
  circleName: string;
  onBack: () => void;
  onAnswer: (outcome: FeedbackOutcome, publicThanks: boolean, note: string) => "credited" | "duplicate" | "later" | "recorded" | "missing";
}) {
  const [connected, setConnected] = useState<"yes" | "not-yet" | "no" | null>(null);
  const [useful, setUseful] = useState<"useful" | "somewhat" | "not-useful" | null>(null);
  const [note, setNote] = useState("");
  const [publicThanks, setPublicThanks] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const first = request.counterpart.split(" ")[0];

  function submit(outcome: FeedbackOutcome) {
    const answer = onAnswer(outcome, publicThanks, note);
    setResult(answer === "credited"
      ? `Thanks. ${first}’s help is counted once${publicThanks ? `, and your thanks will show in ${circleName}` : ""}.`
      : answer === "duplicate" ? `You’d already confirmed this help, so it isn’t counted twice.`
        : answer === "later" ? `We’ll ask once more later. Until then it stays unknown.`
          : "Recorded. Thanks for letting us know; it isn’t shared as a rating.");
  }

  if (result) {
    return (
      <>
        <div className="hd"><span className="tag">{circleName}</span></div>
        <div className="p1-shield"><Icon name="check" size={28} /></div>
        <h1 className="p2-center">Thank <i>you.</i></h1>
        <p className="c">{result}</p>
        <div className="ft"><button className="btn" type="button" onClick={onBack}>Done</button></div>
      </>
    );
  }

  const choice = <T extends string>(value: T | null, options: Array<[T, string]>, onChange: (value: T) => void) => (
    <div className="p1-visibility-list">
      {options.map(([id, label]) => (
        <button type="button" key={id} className={`p1-visibility-option${value === id ? " selected" : ""}`} onClick={() => onChange(id)} aria-pressed={value === id}>
          <span className="p1-radio" aria-hidden="true">{value === id ? "✓" : ""}</span><span><b>{label}</b></span>
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div className="hd">
        <button className="bkb" type="button" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
        <span className="tag">Quick follow-up</span>
      </div>
      <div className="p3-person">
        <Avatar name={request.counterpart} size={64} />
        <p className="c">{request.context} · {circleName}</p>
      </div>
      <h1>Did you connect<br /><i>with {first}?</i></h1>
      {choice(connected, [["yes", "Yes, we connected"], ["not-yet", "Not yet"], ["no", "No"]], (value) => { setConnected(value); setUseful(null); })}
      {connected === "yes" ? (
        <>
          <h2 className="p1-section-title">Was it useful?</h2>
          {choice(useful, [["useful", "Yes, it helped"], ["somewhat", "Somewhat"], ["not-useful", "Not really"]], setUseful)}
        </>
      ) : null}
      {useful === "useful" || useful === "somewhat" ? (
        <>
          <label className="p1-review-field"><span>Say thanks (optional)</span><textarea className="p1-textarea p1-review-textarea" value={note} onChange={(event) => setNote(event.target.value)} rows={2} maxLength={200} placeholder={`What made ${first}’s help useful?`} /></label>
          <label className="p1-check-row p5-public"><input type="checkbox" checked={publicThanks} onChange={(event) => setPublicThanks(event.target.checked)} /><span>Show my thanks to members of {circleName}</span></label>
        </>
      ) : null}
      <p className="p2-fine p2-bottom-space">Only you can confirm whether this helped. {first} sees a thank-you only if you write one; a “not useful” answer isn’t shown as a rating.</p>
      <div className="ft p3-two-buttons">
        <button className="btn g" type="button" onClick={() => submit("skip")}>Prefer not to say</button>
        <button className="btn" type="button" disabled={!connected || (connected === "yes" && !useful)} onClick={() => submit(connected === "yes" ? useful! : connected === "not-yet" ? "not-yet" : "no-connection")}>Send</button>
      </div>
    </>
  );
}

export function TopContributorsCard({ circle }: { circle: DemoCircle }) {
  const list = TOP_CONTRIBUTORS[circle.id];
  if (!list?.length) return null;
  return (
    <>
      <h2 className="p1-section-title">Top contributors this month</h2>
      <div className="lst p4-list">
        {list.map((person, index) => (
          <div className="ct p2-member" key={person.name}>
            <span className="p3-rank">{index + 1}</span>
            <Avatar name={person.name} size={36} />
            <div className="m"><b>{person.name}</b><div className="tag">{person.confirmed} confirmed {person.confirmed === 1 ? "help" : "helps"}</div></div>
          </div>
        ))}
      </div>
      <p className="p2-fine">Based only on help the other person confirmed as useful, never message volume. Shown for members who allow it.</p>
    </>
  );
}

export function CircleInsights({ circle }: { circle: DemoCircle }) {
  const scale = Math.max(1, circle.memberCount / 27);
  const n = (value: number) => Math.round(value * scale);
  const small = (value: number) => value < 5 ? "Fewer than 5" : String(value);
  return (
    <>
      <p className="p2-fine">Circle-level counts for hosts. Individual members’ answers, needs and messages are never shown here, and very small counts are hidden.</p>
      <StatTiles tiles={[
        { label: "Active members", value: String(circle.memberCount), detail: circle.capacity ? `of ${circle.capacity} places` : "no limit" },
        { label: "Median reply", value: "9h", detail: "to connection requests" },
        { label: "Confirmed useful", value: small(n(3)), detail: `of ${n(11)} help offers` },
      ]} />
      <FunnelChart title="Joining · last 30 days" steps={[
        { label: "Invitation and link opens", value: n(120) },
        { label: "Answered the first question", value: n(64) },
        { label: "Verified an account", value: n(41) },
        { label: "Joined or requested", value: n(30) },
      ]} note="Physical cards handed out aren’t counted unless someone opens the link." />
      <FunnelChart title="Connections · last 30 days" steps={[
        { label: "Interest and introduction requests", value: n(38) },
        { label: "Approved", value: n(24) },
        { label: "First message sent", value: n(19) },
        { label: "Confirmed useful", value: n(7) },
      ]} />
      <Suggestions items={[
        { title: "Shorten the invitation’s first question.", detail: "About half of visitors leave before answering it." },
        { title: "Review introductions faster.", detail: "Requests wait 1.4 days on average for host review." },
        { title: "Sharpen Spotlight asks.", detail: "Specific asks received twice as many offers this month." },
      ]} />
      <p className="p1-demo-caption">Sample insights. Counts and denominators come from first-party events only.</p>
    </>
  );
}

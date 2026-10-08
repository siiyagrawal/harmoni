import { useState } from "react";
import type { DemoCircle } from "./circle-data";
import type { ConnectDemo, Spotlight } from "./connect-data";
import { Avatar, Icon } from "./ui";

export type SpotlightTab = "current" | "queue" | "schedule" | "history";

const SLOT_LABEL = { day: "One day", week: "One week", month: "One month" } as const;
const UPCOMING_SLOTS = ["Week of Oct 13", "Week of Oct 20", "Week of Oct 27", "Week of Nov 3", "Week of Nov 10", "Week of Nov 17"];

export function SpotlightCard({
  circle,
  spotlight,
  isHost,
  onOffer,
  onToggleQueue,
  onPrepareAsk,
  onManage,
}: {
  circle: DemoCircle;
  spotlight: Spotlight | undefined;
  isHost: boolean;
  onOffer: () => void;
  onToggleQueue: () => void;
  onPrepareAsk: () => void;
  onManage: () => void;
}) {
  const current = spotlight?.current;
  const mySlot = spotlight?.schedule.find((slot) => slot.memberId === "me");
  const featuredIsMe = current?.memberId === "me";
  return (
    <>
      <h2 className="p1-section-title">Circle Spotlight</h2>
      <div className="card p3-spotlight">
        {current ? (
          <>
            <div className="p3-spotlight-head">
              <span className="p3-spotlight-badge">✦ Spotlight</span>
              <span className="tag">{current.ends}</span>
            </div>
            <div className="row"><Avatar name={current.member} size={46} /><div className="member-main"><b>{current.member}</b><div className="tag">Featured in {circle.name}</div></div></div>
            <p className="p3-ask">“{current.ask}”</p>
            <div className="tag">{current.offers} {current.offers === 1 ? "offer" : "offers"} so far</div>
            {!featuredIsMe && !isHost ? <button className="btn s p3-help-button" type="button" onClick={onOffer}>I can help</button> : null}
          </>
        ) : (
          <p className="p3-empty-copy">No one is in the Spotlight right now.</p>
        )}
        {mySlot ? (
          <div className="p3-my-slot">
            <b>You’re featured {mySlot.slot.replace("Week of", "the week of")}</b>
            <p>{mySlot.askStatus === "approved" ? "Your ask is approved and ready." : "Prepare and approve your ask before your slot starts."}</p>
            <button className="pill on" type="button" onClick={onPrepareAsk}>{mySlot.askStatus === "approved" ? "Edit my ask" : "Prepare my ask"}</button>
          </div>
        ) : null}
        {!isHost ? (
          <div className="tg p3-queue-toggle">
            <div><b>Put me in the Spotlight queue</b><div className="tag">The host {circle.settings.spotlightSelection === "random" ? "picks at random" : "chooses"} from people who opt in.</div></div>
            <button className={`sx${spotlight?.meInQueue ? " on" : ""}`} type="button" onClick={onToggleQueue} aria-pressed={Boolean(spotlight?.meInQueue)} aria-label="Put me in the Spotlight queue" />
          </div>
        ) : <button className="btn g s" type="button" onClick={onManage}>Manage Spotlights</button>}
        <p className="p2-fine">Being featured never shares your contact details.</p>
      </div>
    </>
  );
}

export function SpotlightManagerScreen({
  circle,
  spotlight,
  demo,
  tab,
  onTab,
  onBack,
  onToast,
}: {
  circle: DemoCircle;
  spotlight: Spotlight | undefined;
  demo: ConnectDemo;
  tab: SpotlightTab;
  onTab: (tab: SpotlightTab) => void;
  onBack: () => void;
  onToast: (message: string) => void;
}) {
  const [pickingSlot, setPickingSlot] = useState<string | null>(null);
  const queue = spotlight?.queue ?? [];
  const schedule = spotlight?.schedule ?? [];
  const history = spotlight?.history ?? [];
  const scheduled = new Set(schedule.map((slot) => slot.memberId).filter(Boolean));
  const current = spotlight?.current;
  const nextSlotLabel = UPCOMING_SLOTS.find((label) => !schedule.some((slot) => slot.slot === label));
  const tabs: Array<[SpotlightTab, string]> = [["current", "Current"], ["queue", `Queue · ${queue.length}`], ["schedule", "Schedule"], ["history", "History"]];

  return (
    <>
      <div className="p2-subheader">
        <button className="bkb" type="button" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
        <span className="tag">Manage Spotlights</span>
        <span className="header-spacer" />
      </div>
      <h1 className="p2-detail-title">{circle.name}</h1>
      <div className="card p2-terms">
        <div><small>Slot length</small><b>{SLOT_LABEL[circle.settings.spotlightSlot]}</b></div>
        <div><small>Selection</small><b>{circle.settings.spotlightSelection === "random" ? "Random" : "Host picks"}</b></div>
        <div><small>Offers go to</small><b>{circle.settings.spotlightResponse === "host" ? "Host first" : "Featured member"}</b></div>
        <div><small>Opted in</small><b>{queue.length} {queue.length === 1 ? "member" : "members"}</b></div>
      </div>
      <p className="p2-fine">Change these under Host settings → Settings.</p>
      <div className="p2-tabs" role="tablist" aria-label="Spotlight sections">
        {tabs.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={`pill${tab === id ? " on" : ""}`} onClick={() => onTab(id)}>{label}</button>)}
      </div>

      {tab === "current" ? (current ? (
        <div className="card p3-spotlight">
          <div className="p3-spotlight-head"><span className="p3-spotlight-badge">✦ Live</span><span className="tag">{current.ends}</span></div>
          <div className="row"><Avatar name={current.member} size={46} /><div className="member-main"><b>{current.member}</b><div className="tag">Approved their own ask</div></div></div>
          <p className="p3-ask">“{current.ask}”</p>
          <div className="p3-results">
            <div><b>{current.offers}</b><small>Offers</small></div>
            <div><b>{current.introductions}</b><small>Introductions</small></div>
            <div><b>—</b><small>Confirmed useful</small></div>
          </div>
          <p className="p2-fine">Usefulness counts only when {current.member.split(" ")[0]} confirms it. Silence stays unknown.</p>
        </div>
      ) : <div className="card p1-empty-state"><h2>No live Spotlight</h2><p>Schedule someone from the opt-in queue.</p></div>) : null}

      {tab === "queue" ? (
        <>
          <div className="lst">
            {queue.map((member) => (
              <div className="ct p2-member" key={member.id}>
                <Avatar name={member.name} size={40} />
                <div className="m"><b>{member.name}</b><div className="tag">{scheduled.has(member.id) ? "Scheduled" : "Opted in · waiting"}</div></div>
              </div>
            ))}
            {!queue.length ? <p className="p2-fine p2-list-note">No one has opted in yet. Members can opt in from the circle page.</p> : null}
          </div>
          <p className="p2-fine">Only members who opt in can be featured. You can’t add someone yourself.</p>
        </>
      ) : null}

      {tab === "schedule" ? (
        <>
          {schedule.map((slot) => (
            <div className="card p3-slot" key={slot.id}>
              <div className="p3-help-head"><b>{slot.slot}</b><span className={`p2-status ${slot.askStatus === "approved" ? "ok" : slot.askStatus === "needs-ask" ? "wait" : "muted"}`}>{slot.askStatus === "approved" ? "Ask approved" : slot.askStatus === "needs-ask" ? "Waiting for ask" : "Open"}</span></div>
              {slot.member ? (
                <>
                  <div className="tag">{slot.member}</div>
                  <div className="p2-inline-row"><button className="pill" type="button" onClick={() => { demo.clearSlot(circle.id, slot.id); onToast("Slot cleared."); }}>Clear slot</button></div>
                </>
              ) : pickingSlot === slot.id ? (
                <div className="p2-inline-row">
                  {queue.filter((member) => !scheduled.has(member.id)).map((member) => (
                    <button className="pill" type="button" key={member.id} onClick={() => { demo.assignSlot(circle.id, slot.id, member.id); setPickingSlot(null); onToast(`${member.name} scheduled. They’ll prepare and approve their ask.`); }}>{member.name}</button>
                  ))}
                  {!queue.some((member) => !scheduled.has(member.id)) ? <span className="tag">Everyone in the queue is scheduled.</span> : null}
                  <button className="pill" type="button" onClick={() => setPickingSlot(null)}>Cancel</button>
                </div>
              ) : (
                <div className="p2-inline-row">
                  <button className="pill on" type="button" onClick={() => setPickingSlot(slot.id)} disabled={!queue.length}>Choose member</button>
                  <button className="pill" type="button" disabled={!queue.some((member) => !scheduled.has(member.id))} onClick={() => { demo.assignSlot(circle.id, slot.id, "random"); onToast("Picked at random from the opt-in queue."); }}>Pick at random</button>
                </div>
              )}
            </div>
          ))}
          {nextSlotLabel ? <button className="btn g s" type="button" onClick={() => demo.addSlot(circle.id, nextSlotLabel)}>Add {nextSlotLabel.toLowerCase()}</button> : null}
          <p className="p2-fine">Featured members write and approve their own ask. Hosts can’t publish an ask for them.</p>
        </>
      ) : null}

      {tab === "history" ? (
        <>
          {history.map((item) => (
            <div className="card p3-slot" key={item.id}>
              <div className="p3-help-head"><b>{item.member}</b><span className="tag">{item.slot}</span></div>
              <p className="p3-note">“{item.ask}”</p>
              <div className="p3-results">
                <div><b>{item.offers}</b><small>Offers</small></div>
                <div><b>{item.introductions}</b><small>Introductions</small></div>
                <div><b>{item.confirmed ?? "Unknown"}</b><small>Confirmed useful</small></div>
              </div>
            </div>
          ))}
          {!history.length ? <div className="card p1-empty-state"><h2>No past Spotlights</h2><p>Results appear here after each slot ends.</p></div> : null}
        </>
      ) : null}
    </>
  );
}

export function SpotlightAskScreen({
  circle,
  spotlight,
  suggestion,
  onBack,
  onApprove,
}: {
  circle: DemoCircle;
  spotlight: Spotlight | undefined;
  suggestion: string;
  onBack: () => void;
  onApprove: (ask: string) => void;
}) {
  const slot = spotlight?.schedule.find((item) => item.memberId === "me");
  const [ask, setAsk] = useState(spotlight?.myAsk || "");
  const [approved, setApproved] = useState(false);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <>
        <div className="hd"><span className="tag">{circle.name}</span></div>
        <div className="p1-shield"><Icon name="check" size={28} /></div>
        <h1 className="p2-center">Ask <i>approved.</i></h1>
        <p className="c">It goes live {slot ? slot.slot.replace("Week of", "the week of") : "in your slot"}. You can edit it until then.</p>
        <div className="ft"><button className="btn" type="button" onClick={onBack}>Back to circle</button></div>
      </>
    );
  }

  return (
    <>
      <div className="hd">
        <button className="bkb" type="button" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
        <span className="tag">Your Spotlight</span>
      </div>
      <span className="p1-eyebrow">{slot?.slot ?? "Upcoming slot"} · {circle.name}</span>
      <h1>What should the<br /><i>circle help with?</i></h1>
      <p>Write one clear ask that’s relevant to this circle. You approve it before anyone sees it.</p>
      <div className="card p3-suggestion">
        <div className="p3-help-head"><b>✦ Suggested from your approved context</b></div>
        <p>{suggestion}</p>
        <button className="pill" type="button" onClick={() => setAsk(suggestion)}>Use this draft</button>
      </div>
      <label className="p1-review-field"><span>Your ask</span><textarea className="p1-textarea" value={ask} onChange={(event) => { setAsk(event.target.value); setApproved(false); }} rows={4} maxLength={200} placeholder="Specific, timely and useful to this circle" /></label>
      <div className="p1-context-footer"><span>{ask.length}/200</span><span>Seen by active members of {circle.name}</span></div>
      <label className="p1-adult-check p2-authorize"><input type="checkbox" checked={approved} onChange={(event) => setApproved(event.target.checked)} /><span>I approve this ask for my Spotlight. My contact details stay private.</span></label>
      <div className="ft"><button className="btn" type="button" disabled={!approved || ask.trim().length < 10} onClick={() => { onApprove(ask); setDone(true); }}>Approve my ask</button></div>
    </>
  );
}

import { useEffect, useState } from "react";
import type { DemoCircle } from "./circle-data";
import { CATEGORY_LABELS, type Cadence, type DemoNotification, type NotificationCategory, type NotificationsDemo } from "./notify-data";
import { Icon, type IconName } from "./ui";

const CATEGORY_ICONS: Record<NotificationCategory, IconName> = {
  interest: "person",
  match: "sparkle",
  review: "check",
  message: "chat",
  spotlight: "sparkle",
  help: "sparkle",
  invite: "email",
  admission: "circle",
  hub: "hub",
};

export function NotificationsScreen({
  demo,
  resolve,
  unreadMessages,
  onOpen,
  onOpenGroup,
  onMessages,
  onSettings,
}: {
  demo: NotificationsDemo;
  resolve: (notification: DemoNotification) => string | null;
  unreadMessages: number;
  onOpen: (notification: DemoNotification) => void;
  onOpenGroup: (ids: string[]) => void;
  onMessages: () => void;
  onSettings: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const { items, filter, setFilter, consent, answerConsent } = demo;
  const unread = items.filter((item) => !item.read);
  // Group unread connection requests that are still open, counting unique eligible requests only.
  const groupable = unread.filter((item) => item.category === "interest" && !resolve(item));
  const grouped = groupable.length >= 2 && filter !== "message";
  const visible = items
    .filter((item) => filter === "all" || (filter === "unread" ? !item.read : item.category === "message"))
    .filter((item) => !(grouped && groupable.includes(item)));

  function open(item: DemoNotification) {
    const resolution = resolve(item);
    if (resolution) {
      demo.markRead(item.id);
      setExpanded((current) => current === item.id ? null : item.id);
      return;
    }
    onOpen(item);
  }

  return (
    <>
      <p className="tag p1-eyebrow">Stay in the loop</p>
      <h1>Your <i>updates</i></h1>
      <div className="p2-action-row">
        <button className="btn s" type="button" onClick={onMessages}><span className="p4-btn-inner"><Icon name="chat" size={18} />Messages{unreadMessages ? ` · ${unreadMessages}` : ""}</span></button>
        <button className="btn g s" type="button" onClick={onSettings}><span className="p4-btn-inner"><Icon name="settings" size={18} />Settings</span></button>
      </div>

      {consent === "unasked" ? (
        <div className="card p4-consent">
          <span className="p1-spark"><Icon name="bell" size={17} /></span>
          <div>
            <b>Know when someone wants to connect</b>
            <p>You’ll always see updates here. Choose how else to hear about them.</p>
            <div className="p2-inline-row">
              <button className="pill" type="button" onClick={() => answerConsent("email")}>Email</button>
              <button className="pill" type="button" onClick={() => answerConsent("push")}>Phone alerts</button>
              <button className="pill" type="button" onClick={() => answerConsent("both")}>Both</button>
              <button className="pill" type="button" onClick={() => answerConsent("not-now")}>Not now</button>
            </div>
            <p className="p2-fine">Phone alerts need a supported browser. On iPhone, add Harmoni to your Home Screen first.</p>
          </div>
        </div>
      ) : null}

      <div className="p1-input-mode p2-segments" role="tablist" aria-label="Filter updates">
        {([["all", "All"], ["unread", `Unread${unread.length ? ` · ${unread.length}` : ""}`], ["message", "Messages"]] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={filter === id} className={filter === id ? "on" : ""} onClick={() => setFilter(id)}>{label}</button>
        ))}
      </div>
      {unread.length ? <button className="lk p2-inline-link p4-mark-all" type="button" onClick={demo.markAllRead}>Mark all as read</button> : null}

      <div className="lst p4-list">
        {grouped ? (
          <button className="p4-row unread" type="button" onClick={() => onOpenGroup(groupable.map((item) => item.id))}>
            <span className="p4-icon"><Icon name="person" size={18} /></span>
            <span className="p4-copy"><b>You have {groupable.length} new connection requests</b><small>Grouped · open to review each one</small></span>
            <span className="p4-meta"><span className="tag">{groupable[0].at}</span><i className="p4-dot" /></span>
          </button>
        ) : null}
        {visible.map((item) => {
          const resolution = resolve(item);
          return (
            <div key={item.id}>
              <button className={`p4-row${item.read ? "" : " unread"}${resolution ? " resolved" : ""}`} type="button" onClick={() => open(item)} aria-expanded={resolution ? expanded === item.id : undefined}>
                <span className="p4-icon"><Icon name={CATEGORY_ICONS[item.category]} size={18} /></span>
                <span className="p4-copy"><b>{item.title}</b><small>{item.detail}</small></span>
                <span className="p4-meta"><span className="tag">{item.at}</span>{item.read ? null : <i className="p4-dot" />}</span>
              </button>
              {resolution && expanded === item.id ? <p className="p4-resolution">{resolution}</p> : null}
            </div>
          );
        })}
        {!visible.length && !grouped ? <p className="p2-fine p2-list-note">{filter === "message" ? "No message updates. Message text is never shown in alerts." : "You’re all caught up."}</p> : null}
      </div>
      <p className="p1-demo-caption">Updates are created when something happens, even while Harmoni is closed, and each one is checked again when you open it. These are sample updates; nothing is delivered yet.</p>
    </>
  );
}

const CADENCE_LABELS: Record<Cadence, string> = { immediate: "Right away", digest: "Daily digest", off: "Off" };
const HOURS = Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, "0")}:00`);

export function NotificationSettingsScreen({
  demo,
  circles,
  email,
  alertHref,
  onBack,
}: {
  demo: NotificationsDemo;
  circles: DemoCircle[];
  email: string;
  alertHref: string;
  onBack: () => void;
}) {
  const { prefs, setPrefs, deliveries } = demo;
  const [push, setPush] = useState({ supported: false, ios: false, homeScreen: false });

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setPush({
      supported: "Notification" in window && "serviceWorker" in navigator && "PushManager" in window,
      ios: /iPhone|iPad|iPod/.test(navigator.userAgent),
      homeScreen: window.matchMedia("(display-mode: standalone)").matches,
    }));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const pushAvailable = push.supported && (!push.ios || push.homeScreen);
  const statusTone = { accepted: "ok", queued: "wait", grouped: "info", held: "wait", failed: "bad", suppressed: "muted" } as const;

  return (
    <>
      <div className="hd">
        <button className="bkb" type="button" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
        <span className="tag">Notification settings</span>
      </div>
      <h1>How you hear<br /><i>from Harmoni.</i></h1>

      <h2 className="p1-section-title">Channels</h2>
      <div className="card p3-grant-card">
        <div className="tg"><div><b>In Harmoni</b><div className="tag">Always on. Updates wait here for you.</div></div><span className="p2-status ok">On</span></div>
        <div className="tg">
          <div><b>Email</b><div className="tag">{email || "Your verified email"} · sent even when Harmoni is closed</div></div>
          <button className={`sx${prefs.email ? " on" : ""}`} type="button" onClick={() => setPrefs((current) => ({ ...current, email: !current.email }))} aria-pressed={prefs.email} aria-label="Email alerts" />
        </div>
        <div className="tg">
          <div><b>Phone alerts</b><div className="tag">{pushAvailable ? "Web push on this browser, with your permission" : push.ios ? "On iPhone, add Harmoni to your Home Screen to turn these on" : "This browser doesn’t support web push. Email still works."}</div></div>
          <button className={`sx${prefs.push ? " on" : ""}`} type="button" disabled={!pushAvailable} onClick={() => setPrefs((current) => ({ ...current, push: !current.push }))} aria-pressed={prefs.push} aria-label="Phone alerts" />
        </div>
      </div>
      <p className="p2-fine">Permission is asked only when you turn phone alerts on. Delivery is best effort; email is the fallback.</p>

      <h2 className="p1-section-title">What to send</h2>
      <div className="card p4-cadence-card">
        {(Object.keys(CATEGORY_LABELS) as NotificationCategory[]).map((category) => (
          <label className="p2-select-row" key={category}>
            <span>{CATEGORY_LABELS[category]}</span>
            <select value={prefs.categories[category]} onChange={(event) => setPrefs((current) => ({ ...current, categories: { ...current.categories, [category]: event.target.value as Cadence } }))}>
              {(Object.keys(CADENCE_LABELS) as Cadence[]).filter((cadence) => category !== "message" || cadence !== "digest").map((cadence) => <option key={cadence} value={cadence}>{CADENCE_LABELS[cadence]}</option>)}
            </select>
          </label>
        ))}
      </div>
      <p className="p2-fine">Several requests close together are grouped into one alert. Turning a type off still keeps it here in Harmoni.</p>

      <h2 className="p1-section-title">Quiet hours</h2>
      <div className="card p4-cadence-card">
        <div className="tg">
          <div><b>Hold alerts overnight</b><div className="tag">Email and phone alerts wait until quiet hours end.</div></div>
          <button className={`sx${prefs.quietHours.on ? " on" : ""}`} type="button" onClick={() => setPrefs((current) => ({ ...current, quietHours: { ...current.quietHours, on: !current.quietHours.on } }))} aria-pressed={prefs.quietHours.on} aria-label="Quiet hours" />
        </div>
        {prefs.quietHours.on ? (
          <div className="p2-two-col">
            <label className="p2-select-row"><span>From</span><select value={prefs.quietHours.from} onChange={(event) => setPrefs((current) => ({ ...current, quietHours: { ...current.quietHours, from: event.target.value } }))}>{HOURS.map((hour) => <option key={hour}>{hour}</option>)}</select></label>
            <label className="p2-select-row"><span>To</span><select value={prefs.quietHours.to} onChange={(event) => setPrefs((current) => ({ ...current, quietHours: { ...current.quietHours, to: event.target.value } }))}>{HOURS.map((hour) => <option key={hour}>{hour}</option>)}</select></label>
          </div>
        ) : null}
      </div>

      <h2 className="p1-section-title">Mute a circle</h2>
      <div className="card p3-grant-card">
        {circles.map((circle) => {
          const muted = prefs.mutedCircles.includes(circle.id);
          return (
            <div className="tg" key={circle.id}>
              <div><b>{circle.name}</b><div className="tag">{muted ? "No alerts. Updates still appear in Harmoni." : "Alerts on"}</div></div>
              <button className={`sx${muted ? "" : " on"}`} type="button" onClick={() => setPrefs((current) => ({ ...current, mutedCircles: muted ? current.mutedCircles.filter((id) => id !== circle.id) : [...current.mutedCircles, circle.id] }))} aria-pressed={!muted} aria-label={`Alerts for ${circle.name}`} />
            </div>
          );
        })}
        {!circles.length ? <p className="p2-fine p2-list-note">You’re not an active member of any circles yet.</p> : null}
      </div>

      <h2 className="p1-section-title">What an alert looks like</h2>
      <div className="card p2-email-preview">
        <small>From: Harmoni · To: {email || "you"}</small>
        <b>Someone would like to connect</b>
        <pre>{"Open Harmoni to see who and decide.\n\nWe don’t include names of circles, personas or message text in alerts."}</pre>
        <a className="pill p4-preview-link" href={alertHref}>Open from this alert</a>
      </div>
      <p className="p2-fine">Opening an alert asks you to sign in only if needed, then takes you straight to that request. If it’s already been handled, you’ll see its current status instead.</p>

      <h2 className="p1-section-title">Recent delivery</h2>
      <div className="lst p4-list">
        {deliveries.map((delivery) => (
          <div className="ct p4-delivery" key={delivery.id}>
            <div className="m"><b>{delivery.channel} · {delivery.title}</b><div className="tag">{delivery.note}</div></div>
            <span className={`p2-status ${statusTone[delivery.status]}`}>{delivery.status === "accepted" ? "Accepted" : delivery.status[0].toUpperCase() + delivery.status.slice(1)}</span>
          </div>
        ))}
      </div>
      <p className="p1-demo-caption p2-bottom-space">Sample delivery history. Email and push sending aren’t connected in this preview, and alerts already delivered can’t be recalled.</p>
    </>
  );
}

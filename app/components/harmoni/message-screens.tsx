import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { DemoThread } from "./notify-data";
import { Avatar, Icon, type IconName } from "./ui";

export type ThreadAccess = { allowed: boolean; reason: "ok" | "blocked" | "withdrawn" | "no-grant" | "left" };

const READ_ONLY_COPY: Record<Exclude<ThreadAccess["reason"], "ok">, string> = {
  blocked: "You blocked this person. They can’t message you or send requests.",
  withdrawn: "This connection was withdrawn. Earlier messages stay visible, read-only, under the retention policy.",
  "no-grant": "Messaging isn’t part of this connection.",
  left: "You can no longer send messages in this conversation.",
};

export function MessagesInboxScreen({
  threads,
  circleName,
  accessFor,
  onOpen,
  onBack,
}: {
  threads: DemoThread[];
  circleName: (id: string) => string;
  accessFor: (thread: DemoThread) => ThreadAccess;
  onOpen: (id: string) => void;
  onBack: () => void;
}) {
  const [showHidden, setShowHidden] = useState(false);
  const hiddenCount = threads.filter((thread) => thread.hidden).length;
  const visible = threads.filter((thread) => showHidden || !thread.hidden);
  const sections: Array<[string, DemoThread[]]> = [
    ["Connections", visible.filter((thread) => thread.kind === "connection")],
    ["Hub", visible.filter((thread) => thread.kind === "hub")],
  ];

  return (
    <>
      <div className="hd">
        <button className="bkb" type="button" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
        <span className="tag">Messages</span>
      </div>
      <h1>Your <i>messages</i></h1>
      <p>Private one-to-one conversations with approved connections. Text only.</p>
      {sections.map(([title, list]) => list.length ? (
        <div key={title}>
          <h2 className="p1-section-title">{title}</h2>
          <div className="lst p4-list">
            {list.map((thread) => {
              const last = [...thread.messages].reverse().find((message) => message.from !== "system");
              const access = accessFor(thread);
              return (
                <button className={`p4-row${thread.unread ? " unread" : ""}`} type="button" key={thread.id} onClick={() => onOpen(thread.id)}>
                  <Avatar name={thread.name} size={44} />
                  <span className="p4-copy">
                    <b>{thread.name}{thread.muted ? <span className="p4-muted"> · muted</span> : null}</b>
                    <small>{thread.kind === "hub" ? thread.hubRole : `${thread.theirPersona} ↔ your ${thread.myPersona} · ${circleName(thread.circleId)}`}</small>
                    <small className="p4-preview">{!access.allowed ? "Read-only" : last ? (last.deleted ? "Message deleted" : `${last.from === "me" ? "You: " : ""}${last.text}`) : "No messages yet"}</small>
                  </span>
                  <span className="p4-meta"><span className="tag">{last?.at.split(", ").pop()}</span>{thread.unread ? <span className="p4-count">{thread.unread}</span> : null}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null)}
      {!visible.length ? (
        <div className="card p1-empty-state">
          <h2>No conversations yet</h2>
          <p>Messaging opens only after a connection is approved: a match, then interest, then their approval with messaging allowed.</p>
        </div>
      ) : null}
      {hiddenCount ? <button className="lk p2-inline-link" type="button" onClick={() => setShowHidden((value) => !value)}>{showHidden ? "Hide hidden conversations" : `Show ${hiddenCount} hidden ${hiddenCount === 1 ? "conversation" : "conversations"}`}</button> : null}
      <p className="p1-demo-caption">Separate personas keep separate conversations. No attachments or calls. Sample conversations; nothing is sent.</p>
    </>
  );
}

type SheetKind = "menu" | "mute" | "hide" | "report" | "withdraw" | "block";

export function ThreadScreen({
  thread,
  circleName,
  access,
  online,
  onBack,
  onSend,
  onRetry,
  onDelete,
  onToggleOnline,
  onMute,
  onHide,
  onReport,
  onBlock,
  onWithdraw,
  onEscalate,
}: {
  thread: DemoThread;
  circleName: string;
  access: ThreadAccess;
  online: boolean;
  onBack: () => void;
  onSend: (text: string) => void;
  onRetry: (messageId: string) => void;
  onDelete: (messageId: string) => void;
  onToggleOnline: () => void;
  onMute: (muted: boolean) => void;
  onHide: () => void;
  onReport: () => void;
  onBlock: (blocked: boolean) => void;
  onWithdraw: () => void;
  onEscalate: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetKind | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const isHub = thread.kind === "hub";
  const first = thread.name.split(" ")[0];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread.messages.length]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim() || !access.allowed) return;
    onSend(draft);
    setDraft("");
  }

  const confirmations: Record<Exclude<SheetKind, "menu">, { title: string; effect: string; action: string; run: () => void }> = {
    mute: { title: thread.muted ? `Unmute ${first}?` : `Mute ${first}?`, effect: thread.muted ? "You’ll get alerts for new messages again." : "You won’t get alerts for this conversation. Messages still arrive and show as unread. They aren’t told.", action: thread.muted ? "Unmute" : "Mute", run: () => onMute(!thread.muted) },
    hide: { title: "Hide this conversation?", effect: "It leaves your inbox until a new message arrives. Nothing is deleted, and they aren’t told.", action: "Hide", run: onHide },
    report: { title: `Report ${first}?`, effect: "This conversation is sent to Harmoni’s safety team for review. They aren’t told who reported it. You can also block them.", action: "Report", run: onReport },
    withdraw: { title: "Withdraw this connection?", effect: `Messaging ends for both of you and any shared contact details are removed. Earlier messages stay read-only under the retention policy. ${first} sees the connection as ended, without a reason.`, action: "Withdraw connection", run: onWithdraw },
    block: { title: thread.blocked ? `Unblock ${first}?` : `Block ${first}?`, effect: thread.blocked ? "They’ll be able to message you again within your existing connection." : "New messages stop immediately, and they can’t send you requests. They aren’t told why. The conversation doesn’t move to another circle.", action: thread.blocked ? "Unblock" : "Block", run: () => onBlock(!thread.blocked) },
  };

  const menuRows: Array<{ kind: Exclude<SheetKind, "menu">; icon: IconName; label: string; hub: boolean }> = [
    { kind: "mute", icon: "bell", label: thread.muted ? "Unmute alerts" : "Mute alerts", hub: true },
    { kind: "hide", icon: "close", label: "Hide conversation", hub: true },
    { kind: "report", icon: "check", label: "Report", hub: true },
    { kind: "withdraw", icon: "person", label: "Withdraw connection", hub: false },
    { kind: "block", icon: "lock", label: thread.blocked ? "Unblock" : "Block", hub: false },
  ];

  return (
    <>
      <div className="p4-thread-head">
        <button className="bkb" type="button" onClick={onBack} aria-label="Back to messages"><Icon name="back" /></button>
        <Avatar name={thread.name} size={40} />
        <div className="p4-copy">
          <b>{thread.name}</b>
          <small>{isHub ? thread.hubRole : `${thread.theirPersona} · ${circleName}`}</small>
        </div>
        <button className="ib" type="button" onClick={() => setSheet("menu")} aria-label="Conversation options"><Icon name="menu" /></button>
      </div>
      <div className="p4-thread-meta">
        <span className={`p2-status ${access.allowed ? "ok" : "muted"}`}>{isHub ? "Hub route" : access.allowed ? "Approved connection" : "Read-only"}</span>
        <span className="tag">{isHub ? circleName : `You’re messaging as ${thread.myPersona}`}</span>
      </div>
      <div className="card p4-retention">Saved for 90 days (proposed) so you can pick up where you left off. Harmoni doesn’t read messages to update personas or matches.{thread.reported ? " You reported this conversation." : ""}</div>
      {!online ? <div className="card p2-warning p4-offline" role="status"><b>Connection lost</b><p>Reconnecting… Messages that fail can be retried without sending twice.</p></div> : null}

      <div className="p4-messages">
        {thread.messages.map((message) => {
          if (message.from === "system") return <p className="p4-system" key={message.id}>{message.text}</p>;
          const mine = message.from === "me";
          return (
            <div className={`p4-bubble-wrap${mine ? " mine" : ""}`} key={message.id}>
              <button
                className={`p4-bubble${message.deleted ? " deleted" : ""}${message.status === "failed" ? " failed" : ""}`}
                type="button"
                onClick={() => mine && !message.deleted && setSelected((current) => current === message.id ? null : message.id)}
                aria-label={mine ? "Your message. Tap for options" : `${first}’s message`}
              >
                {message.deleted ? "Message deleted" : message.text}
              </button>
              <span className="p4-stamp">
                {message.at}
                {mine && !message.deleted ? (message.status === "sending" ? " · Sending…" : message.status === "failed" ? " · Not sent" : " · Sent") : null}
              </span>
              {mine && message.status === "failed" && access.allowed ? <button className="pill p4-retry" type="button" onClick={() => onRetry(message.id)}>Retry</button> : null}
              {selected === message.id ? (
                <div className="p4-message-actions">
                  <button className="pill p2-danger" type="button" onClick={() => { onDelete(message.id); setSelected(null); }}>Delete for everyone</button>
                  <span className="tag">They may already have seen it.</span>
                </div>
              ) : null}
            </div>
          );
        })}
        {isHub && access.allowed ? <button className="lk p2-inline-link p4-escalate" type="button" onClick={onEscalate}>Ask to escalate to the Level 1 Admin</button> : null}
        <div ref={endRef} />
      </div>

      {access.allowed ? (
        <form className="ft p4-composer" onSubmit={submit}>
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={`Message ${first}`} rows={1} maxLength={2000} aria-label={`Message ${first}`} />
          <button className="p4-send" type="submit" disabled={!draft.trim()} aria-label="Send"><Icon name="share" size={20} /></button>
        </form>
      ) : (
        <div className="ft p4-readonly">
          <p>{READ_ONLY_COPY[access.reason as Exclude<ThreadAccess["reason"], "ok">]}</p>
          {access.reason === "blocked" ? <button className="btn g s" type="button" onClick={() => setSheet("block")}>Unblock</button> : null}
        </div>
      )}

      {sheet === "menu" ? (
        <div className="sheet" onClick={(event) => event.target === event.currentTarget && setSheet(null)}>
          <div className="sp" role="dialog" aria-modal="true" aria-label="Conversation options">
            {menuRows.filter((row) => !isHub || row.hub).filter((row) => row.kind !== "withdraw" || access.reason !== "withdrawn").map((row) => (
              <button className={`mr${row.kind === "block" || row.kind === "withdraw" ? " menu-danger" : ""}`} type="button" key={row.kind} onClick={() => setSheet(row.kind)}>
                <i><Icon name={row.icon} size={19} /></i><span>{row.label}</span>
              </button>
            ))}
            <div className="ms">Demo</div>
            <button className="mr" type="button" onClick={() => { onToggleOnline(); setSheet(null); }}><i><Icon name="link" size={19} /></i><span>{online ? "Simulate connection loss" : "Reconnect"}</span></button>
          </div>
        </div>
      ) : null}
      {sheet && sheet !== "menu" ? (
        <div className="sheet" onClick={(event) => event.target === event.currentTarget && setSheet(null)}>
          <div className="sp account-delete-sheet" role="alertdialog" aria-modal="true" aria-labelledby="thread-confirm-title">
            <h2 id="thread-confirm-title">{confirmations[sheet].title}</h2>
            <p>{confirmations[sheet].effect}</p>
            <button className="btn g s" type="button" onClick={() => setSheet(null)}>Cancel</button>
            <button className={`btn g s${sheet === "block" || sheet === "withdraw" || sheet === "report" ? " delete-account-confirm" : ""}`} type="button" onClick={() => { confirmations[sheet].run(); setSheet(null); }}>{confirmations[sheet].action}</button>
          </div>
        </div>
      ) : null}
    </>
  );
}

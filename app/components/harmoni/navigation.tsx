import { useState } from "react";
import type { Tab } from "./types";
import { Icon, ProgressRing, type IconName } from "./ui";

export function AppHeader({
  onMenu,
  onSetup,
  onEdit,
  onScan,
  onMessages,
  unreadMessages = 0,
}: {
  onMenu: () => void;
  onSetup: () => void;
  onEdit: () => void;
  onScan: () => void;
  onMessages: () => void;
  unreadMessages?: number;
}) {
  return (
    <div className="top">
      <div className="row header-tools">
        <button className="ib" type="button" onClick={onMenu} aria-label="Open menu"><Icon name="menu" /></button>
        <button className="rg" type="button" onClick={onSetup} aria-label="Setup guide">
          <ProgressRing value={25} />
        </button>
      </div>
      <span className="wm">Harmoni</span>
      <div className="row header-tools">
        <button className="ib p4-header-messages" type="button" onClick={onMessages} aria-label={unreadMessages ? `Messages, ${unreadMessages} unread` : "Messages"}><Icon name="chat" />{unreadMessages ? <span className="p4-badge">{unreadMessages}</span> : null}</button>
        <button className="ib" type="button" onClick={onEdit} aria-label="Design your card"><Icon name="edit" /></button>
        <button className="ib" type="button" onClick={onScan} aria-label="Scan a card"><Icon name="plus" /></button>
      </div>
    </div>
  );
}

const NAV_ITEMS: Array<{ id: Tab; title: string; icon: IconName }> = [
  { id: "circles", title: "Circles", icon: "circle" },
  { id: "scan", title: "Scan", icon: "scan" },
  { id: "matches", title: "Matches", icon: "sparkle" },
  { id: "notifications", title: "Notifications", icon: "bell" },
  { id: "you", title: "You", icon: "person" },
];

export function BottomNav({ active, onChange, badges = {} }: { active: Tab; onChange: (tab: Tab) => void; badges?: Partial<Record<Tab, number>> }) {
  const current = active === "contacts" ? "you" : active;
  return (
    <nav aria-label="Main navigation">
      {NAV_ITEMS.map((item) => (
        <button
          className={`${item.id === "scan" ? "sc " : ""}${current === item.id ? "on" : ""}`}
          type="button"
          key={item.id}
          onClick={() => onChange(item.id)}
          aria-current={current === item.id ? "page" : undefined}
          aria-label={badges[item.id] ? `${item.title}, ${badges[item.id]} unread` : undefined}
        >
          {badges[item.id] ? <span className="p4-badge p4-nav-badge">{badges[item.id]}</span> : null}
          {item.id === "scan" ? <><i><Icon name={item.icon} size={26} /></i><span>{item.title}</span></> : <><Icon name={item.icon} size={22} strokeWidth={1.8} /><span>{item.title}</span></>}
        </button>
      ))}
    </nav>
  );
}

type MenuAction = "setup" | "design" | "delete-card" | "share" | "qr" | "signature" | "scan" | "access-log" | "seed-data" | "reset" | "signout" | "delete-account";
const MENU_ROWS: Array<{ icon: IconName; label: string; action: MenuAction; group?: string }> = [
  { icon: "check", label: "Setup guide", action: "setup" },
  { icon: "edit", label: "Design my card", action: "design" },
  { icon: "card", label: "Delete card", action: "delete-card", group: "Card" },
  { icon: "card", label: "QR code", action: "qr", group: "Ways to share your card" },
  { icon: "share", label: "Share link", action: "share" },
  { icon: "email", label: "Email signature", action: "signature" },
  { icon: "scan", label: "Scan a card", action: "scan", group: "Capturing information" },
  { icon: "check", label: "Who has seen my context", action: "access-log", group: "Your context" },
  { icon: "close", label: "Start the demo over", action: "reset", group: "Demo" },
  { icon: "close", label: "Sign out", action: "signout", group: "Account" },
  { icon: "close", label: "Delete account", action: "delete-account" },
];

export function MenuSheet({
  onDismiss,
  onAction,
  onShare,
}: {
  onDismiss: () => void;
  onAction: (action: MenuAction) => void;
  onShare: () => void;
}) {
  const [hiddenSeedVisible, setHiddenSeedVisible] = useState(false);
  const [brandClicks, setBrandClicks] = useState(0);
  return (
    <div className="sheet dr" onClick={(event) => event.target === event.currentTarget && onDismiss()}>
      <div className="dw">
        <div className="row menu-heading">
          <span className="wm" onClick={() => {
            const clicks = brandClicks + 1;
            setBrandClicks(clicks);
            if (clicks >= 5) setHiddenSeedVisible(true);
          }}>Harmoni</span>
          <button className="ib" type="button" onClick={onDismiss} aria-label="Close menu"><Icon name="close" /></button>
        </div>
        <div className="promo">
          <h2>Grow your circle</h2>
          <p>Everyone you meet joins your circle and opens their network to you.</p>
          <button type="button" onClick={onShare}>Share my card</button>
        </div>
        {MENU_ROWS.map((item) => (
          <div key={item.action}>
            {item.group ? <div className="ms">{item.group}</div> : null}
            <button className={`mr${item.action === "delete-account" ? " menu-danger" : ""}`} type="button" onClick={() => onAction(item.action)}>
              <i><Icon name={item.icon} size={20} strokeWidth={1.9} /></i>
              <span>{item.label}</span>
            </button>
          </div>
        ))}
        {hiddenSeedVisible ? <div><div className="ms">Demo data</div><button className="mr" type="button" onClick={() => onAction("seed-data")}><i><Icon name="check" size={20} /></i><span>Load demo data</span></button></div> : null}
      </div>
    </div>
  );
}

export type { MenuAction };

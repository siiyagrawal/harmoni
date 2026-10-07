import type { Tab } from "./types";
import { Icon, ProgressRing, type IconName } from "./ui";

export function AppHeader({
  onMenu,
  onSetup,
  onEdit,
  onScan,
}: {
  onMenu: () => void;
  onSetup: () => void;
  onEdit: () => void;
  onScan: () => void;
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
        <button className="ib" type="button" onClick={onEdit} aria-label="Design your card"><Icon name="edit" /></button>
        <button className="ib" type="button" onClick={onScan} aria-label="Scan a card"><Icon name="plus" /></button>
      </div>
    </div>
  );
}

const NAV_ITEMS: Array<{ id: Tab; title: string; icon: IconName }> = [
  { id: "card", title: "My Card", icon: "card" },
  { id: "contacts", title: "Contacts", icon: "contacts" },
  { id: "scan", title: "Scan", icon: "scan" },
  { id: "circle", title: "Circle", icon: "circle" },
];

export function BottomNav({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav aria-label="Main navigation">
      {NAV_ITEMS.map((item) => (
        <button
          className={`${item.id === "scan" ? "sc " : ""}${active === item.id ? "on" : ""}`}
          type="button"
          key={item.id}
          onClick={() => onChange(item.id)}
          aria-current={active === item.id ? "page" : undefined}
        >
          {item.id === "scan" ? <><i><Icon name={item.icon} size={28} /></i><span>{item.title}</span></> : <><Icon name={item.icon} size={26} strokeWidth={1.8} />{item.title}</>}
        </button>
      ))}
    </nav>
  );
}

type MenuAction = "setup" | "design" | "share" | "qr" | "signature" | "scan" | "reset";
const MENU_ROWS: Array<{ icon: IconName; label: string; action: MenuAction; group?: string }> = [
  { icon: "check", label: "Setup guide", action: "setup" },
  { icon: "edit", label: "Design my card", action: "design" },
  { icon: "card", label: "QR code", action: "qr", group: "Ways to share your card" },
  { icon: "share", label: "Share link", action: "share" },
  { icon: "email", label: "Email signature", action: "signature" },
  { icon: "scan", label: "Scan a card", action: "scan", group: "Capturing information" },
  { icon: "close", label: "Start the demo over", action: "reset", group: "Demo" },
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
  return (
    <div className="sheet dr" onClick={(event) => event.target === event.currentTarget && onDismiss()}>
      <div className="dw">
        <div className="row menu-heading">
          <span className="wm">Harmoni</span>
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
            <button className="mr" type="button" onClick={() => onAction(item.action)}>
              <i><Icon name={item.icon} size={20} strokeWidth={1.9} /></i>
              <span>{item.label}</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export type { MenuAction };

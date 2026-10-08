import type { CSSProperties, ReactNode } from "react";
import { QRCodeSVG } from "qrcode.react";

export type IconName =
  | "back"
  | "menu"
  | "close"
  | "edit"
  | "plus"
  | "card"
  | "contacts"
  | "scan"
  | "circle"
  | "share"
  | "check"
  | "sparkle"
  | "camera"
  | "chevron"
  | "calendar"
  | "pin"
  | "email"
  | "phone"
  | "link"
  | "bell"
  | "person"
  | "search"
  | "lock"
  | "globe"
  | "qr"
  | "hub";

const ICONS: Record<IconName, ReactNode> = {
  back: <path d="m15 5-7 7 7 7" />,
  menu: <path d="M4 7h16M4 12h16M4 17h10" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />,
  plus: <path d="M12 5v14M5 12h14" />,
  card: <><rect x="3" y="6" width="18" height="12" rx="2.5" /><path d="M7 10h5M7 14h3" /></>,
  contacts: <><circle cx="9" cy="8" r="3.5" /><path d="M2 20a7 7 0 0 1 14 0M16 5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3 6" /></>,
  scan: <path d="M4 8V6a2 2 0 0 1 2-2h2m8 0h2a2 2 0 0 1 2 2v2m0 8v2a2 2 0 0 1-2 2h-2m-8 0H6a2 2 0 0 1-2-2v-2m0-4h16" />,
  circle: <><circle cx="9" cy="12" r="5" /><circle cx="15" cy="12" r="5" /></>,
  share: <><path d="m3 11 18-8-8 18-2-8z" /><path d="m11 13 5-5" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  sparkle: <><path d="m12 3 2 5 5 2-5 2-2 5-2-5-5-2 5-2z" /><path d="m19 15 1 2 2 1-2 1-1 2-1-2-2-1 2-1z" /></>,
  camera: <><path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v11H3V8a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.5" /></>,
  chevron: <path d="m9 18 6-6-6-6" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4m8-4v4M3 10h18" /></>,
  pin: <><path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  email: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></>,
  phone: <path d="M6.5 3h3L11 7.5l-2 1.3a11 11 0 0 0 5.2 5.2l1.3-2 4.5 1.5v3a2.5 2.5 0 0 1-2.5 2.5A15 15 0 0 1 4 5.5 2.5 2.5 0 0 1 6.5 3z" />,
  link: <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 14 18.7l1-1" /></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  person: <><circle cx="12" cy="8" r="3.5" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>,
  globe: <><circle cx="12" cy="12" r="8.5" /><path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.2-3.5-8.5s1.1-6.1 3.5-8.5z" /></>,
  qr: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 20h2M20 14v2" /></>,
  hub: <><circle cx="12" cy="5" r="2.5" /><circle cx="5" cy="18" r="2.5" /><circle cx="19" cy="18" r="2.5" /><path d="M12 7.5v4M12 11.5 6.5 16M12 11.5l5.5 4.5" /></>,
};

export function Icon({
  name,
  size = 22,
  strokeWidth = 2,
}: {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}

export function Brand({ className = "" }: { className?: string }) {
  return <span className={`wm ${className}`.trim()}>Harmoni</span>;
}

const PALETTE = [
  ["#f3d9a4", "#c99a3e"],
  ["#f6c9b5", "#d27f62"],
  ["#dccff7", "#9479de"],
  ["#cfe5d6", "#5e9a78"],
  ["#f5d2df", "#c26c8e"],
  ["#eadcc2", "#a07e4e"],
];

function nameHash(name: string) {
  return [...(name || "H")].reduce((sum, char) => sum * 31 + char.charCodeAt(0), 7) >>> 0;
}

export function Avatar({
  name,
  photo,
  size = 48,
  square = false,
}: {
  name: string;
  photo?: string;
  size?: number;
  square?: boolean;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2);
  const colors = PALETTE[nameHash(name) % PALETTE.length];
  const style: CSSProperties = {
    width: size,
    height: size,
    fontSize: Math.round(size * 0.44),
    background: `radial-gradient(circle at 30% 22%, rgba(255,255,255,.7), transparent 45%), linear-gradient(140deg, ${colors[0]}, ${colors[1]})`,
  };

  if (photo) {
    return (
      // During upload this can be a local preview; saved cards use their Convex Storage URL.
      // eslint-disable-next-line @next/next/no-img-element
      <img className={`av${square ? " sq" : ""}`} style={style} src={photo} alt={`${name} profile`} />
    );
  }

  return (
    <div className={`av${square ? " sq" : ""}`} style={style} aria-label={`${name} profile`}>
      {initials || "H"}
    </div>
  );
}

export function QrCode({ value, className = "" }: { value: string; className?: string }) {
  return <QRCodeSVG value={value} className={className} size={128} level="M" title="Scan to open this Harmoni card" />;
}

export function CardArtwork({ variant = 0 }: { variant?: number }) {
  return (
    <div className={`card-art art-${variant % 8}`} aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
}

export function FieldIcon({ name }: { name: "email" | "phone" | "link" }) {
  const color: Record<typeof name, string> = {
    email: "#0a84ff",
    phone: "#34c759",
    link: "#9479de",
  };
  return (
    <i className="bi" style={{ background: color[name] }}>
      <Icon name={name} size={19} strokeWidth={1.9} />
    </i>
  );
}

export function ProgressRing({ value, size = 44 }: { value: number; size?: number }) {
  const circumference = 2 * Math.PI * 18;
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" aria-label={`${value}% complete`}>
      <defs>
        <linearGradient id="progress-gold" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#f3dfa2" />
          <stop offset="1" stopColor="#b48c36" />
        </linearGradient>
      </defs>
      <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(42,33,23,.1)" strokeWidth="4" />
      <circle
        cx="22"
        cy="22"
        r="18"
        fill="none"
        stroke="url(#progress-gold)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${(circumference * value) / 100} ${circumference}`}
        transform="rotate(-90 22 22)"
      />
    </svg>
  );
}

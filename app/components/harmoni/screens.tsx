import { useState } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent, ReactNode } from "react";
import DigitalCard from "./digital-card";
import type { Contact, Profile, ProfileField } from "./types";
import { CARD_ARTS } from "./types";
import { Avatar, CardArtwork, Icon, ProgressRing, QrCode } from "./ui";

type TextField = "name" | "title" | "company" | "headline" | "email" | "phone";

function StepHeader({
  progress,
  xp,
  onBack,
}: {
  progress: number;
  xp: number;
  onBack: () => void;
}) {
  return (
    <div className="hd">
      <button className="bkb" type="button" onClick={onBack} aria-label="Back">
        <Icon name="back" />
      </button>
      <div className="pg"><i style={{ width: `${progress}%` }} /></div>
      <span className="xpc">✦ {xp} XP</span>
    </div>
  );
}

function ActionFooter({ children }: { children: ReactNode }) {
  return <div className="ft mt-10">{children}</div>;
}

export function WelcomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <>
      <div className="top"><span className="wm">Harmoni</span></div>
      <div className="fan" aria-hidden="true">
        <div className="fc c1" />
        <div className="fc c2" />
        <div className="fc c3"><QrCode seed="harmoni" /></div>
      </div>
      <h1 className="hero">Your card.<br /><i>Your circle.</i></h1>
      <p className="c">Meet someone, swap cards, and open doors through each other&apos;s networks.</p>
      <ActionFooter>
        <button className="btn pu" type="button" onClick={onStart}>Create my card</button>
      </ActionFooter>
    </>
  );
}

export function DemoAuthScreen({
  mode,
  username,
  password,
  error,
  busy,
  onUsername,
  onPassword,
  onSubmit,
  onToggleMode,
  onBack,
}: {
  mode: "signup" | "signin";
  username: string;
  password: string;
  error: string;
  busy: boolean;
  onUsername: (value: string) => void;
  onPassword: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleMode: () => void;
  onBack: () => void;
}) {
  return (
    <>
      <div className="hd">
        <button className="bkb" type="button" onClick={onBack} aria-label="Back">
          <Icon name="back" />
        </button>
        <span className="tag">Demo account</span>
      </div>
      <h1>{mode === "signup" ? "Create your account" : "Welcome back"}</h1>
      <p>Use a username and password to save your card. No email or verification code needed.</p>
      <form className="auth-form" onSubmit={onSubmit}>
        <label className="f">
          <span>Username</span>
          <input
            value={username}
            onChange={(event) => onUsername(event.target.value)}
            autoComplete="username"
            minLength={3}
            maxLength={24}
            required
          />
        </label>
        <label className="f">
          <span>Password</span>
          <input
            value={password}
            onChange={(event) => onPassword(event.target.value)}
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            minLength={8}
            maxLength={256}
            required
          />
        </label>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
        <div className="auth-actions">
          <button className="btn pu" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
        </div>
      </form>
      <p className="auth-switch">
        {mode === "signup" ? "Already have an account?" : "New to Harmoni?"}{" "}
        <button className="lk" type="button" onClick={onToggleMode}>
          {mode === "signup" ? "Sign in" : "Create an account"}
        </button>
      </p>
    </>
  );
}

export function DetailsScreen({
  profile,
  xp,
  saving,
  onChange,
  onBack,
  onContinue,
}: {
  profile: Profile;
  xp: number;
  saving: boolean;
  onChange: (field: TextField, value: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const fields: Array<[TextField, string, string]> = [
    ["name", "Full name", "Your name"],
    ["title", "Job title", "Founder, Designer, Engineer"],
    ["company", "Company", "Where you work"],
    ["email", "Work email", "name@company.com"],
    ["phone", "Phone number", "+1 555 123 4567"],
  ];

  return (
    <>
      <StepHeader progress={20} xp={xp} onBack={onBack} />
      <span className="ach">✦ Earn 100 XP</span>
      <h1>Let&apos;s craft your <i>card</i></h1>
      <p>Just the essentials. You can change everything later.</p>
      {fields.map(([field, label, placeholder]) => (
        <label className="f" key={field}>
          <span>{label}</span>
          <input
            value={profile[field]}
            onChange={(event) => onChange(field, event.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
          />
        </label>
      ))}
      <ActionFooter>
        <button className="btn" type="button" onClick={onContinue} disabled={saving}>
          {saving ? "Saving your card…" : "Save and continue"}
        </button>
      </ActionFooter>
    </>
  );
}

export function LogoScreen({
  profile,
  xp,
  onBack,
  onAuto,
  onUpload,
  onRemove,
  onContinue,
}: {
  profile: Profile;
  xp: number;
  onBack: () => void;
  onAuto: () => void;
  onUpload: (file: File) => void;
  onRemove: () => void;
  onContinue: () => void;
}) {
  function chooseLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onUpload(file);
  }

  return (
    <>
      <StepHeader progress={40} xp={xp} onBack={onBack} />
      <span className="ach">✦ Earn 50 XP</span>
      <h1>Add your <i>logo</i></h1>
      <p>A logo makes your card instantly recognizable.</p>
      <div className="lg">
        {profile.logo === "auto" ? (
          <div className="mono">{(profile.company || profile.name || "H")[0].toUpperCase()}</div>
        ) : profile.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.logo} alt={`${profile.company || "Company"} logo`} />
        ) : (
          <span className="tag">Your logo appears here</span>
        )}
      </div>
      {profile.logo === "auto" && profile.email.includes("@") ? (
        <p className="c">We found this from {profile.email.split("@")[1]}.</p>
      ) : <div style={{ height: 22 }} />}
      <button className="btn g" type="button" onClick={onAuto}>✦ Auto detect my logo</button>
      <label className="lk">
        Select from photo library
        <input hidden type="file" accept="image/*" onChange={chooseLogo} />
      </label>
      {profile.logo ? <button className="lk" type="button" onClick={onRemove}>Remove logo</button> : null}
      <ActionFooter>
        <button className="btn" type="button" onClick={onContinue}>{profile.logo ? "Continue" : "Skip for now"}</button>
      </ActionFooter>
    </>
  );
}

export function PhotoScreen({
  profile,
  xp,
  onBack,
  onPhoto,
  onContinue,
  onSkip,
}: {
  profile: Profile;
  xp: number;
  onBack: () => void;
  onPhoto: (file: File) => void;
  onContinue: () => void;
  onSkip: () => void;
}) {
  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) onPhoto(file);
  }

  return (
    <>
      <StepHeader progress={60} xp={xp} onBack={onBack} />
      <span className="ach">✦ Earn 100 XP</span>
      <h1>Put a <i>face</i> to your card</h1>
      <p>People remember faces. Your photo makes your card instantly yours.</p>
      <div className="phw">
        <div className="phr" />
        <div className="ph">
          {profile.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.photo} alt="Profile preview" />
          ) : <Avatar name={profile.name} size={84} />}
        </div>
      </div>
      <label className="btn g">
        <Icon name="camera" size={20} /> Choose a photo
        <input hidden type="file" accept="image/*" onChange={choosePhoto} />
      </label>
      <label className="lk">
        Take a selfie
        <input hidden type="file" accept="image/*" capture="user" onChange={choosePhoto} />
      </label>
      <ActionFooter>
        <button className={`btn${profile.photo ? "" : " g"}`} type="button" onClick={profile.photo ? onContinue : onSkip}>
          {profile.photo ? "Continue" : "Not now"}
        </button>
      </ActionFooter>
    </>
  );
}

export function PreviewScreen({
  profile,
  xp,
  onBack,
  onDesign,
  onContinue,
}: {
  profile: Profile;
  xp: number;
  onBack: () => void;
  onDesign: () => void;
  onContinue: () => void;
}) {
  return (
    <>
      <StepHeader progress={80} xp={xp} onBack={onBack} />
      <h1>Meet your <i>new card</i></h1>
      <p>Tap it to flip. Tilt it. Make it yours.</p>
      <DigitalCard profile={profile} level="Level 1" />
      <ActionFooter>
        <button className="btn g" style={{ marginBottom: 10 }} type="button" onClick={onDesign}>✦ Choose card art</button>
        <button className="btn" type="button" onClick={onContinue}>Continue</button>
      </ActionFooter>
    </>
  );
}

export function CircleSetupScreen({
  profile,
  circleName,
  xp,
  onCircleName,
  onBack,
  onCreate,
}: {
  profile: Profile;
  circleName: string;
  xp: number;
  onCircleName: (name: string) => void;
  onBack: () => void;
  onCreate: () => void;
}) {
  const orbitColors = ["#f3d9a4,#c99a3e", "#f6c9b5,#d27f62", "#dccff7,#9479de", "#cfe5d6,#5e9a78"];
  return (
    <>
      <StepHeader progress={100} xp={xp} onBack={onBack} />
      <span className="ach">✦ Earn 150 XP</span>
      <h1>Start your <i>circle</i></h1>
      <div className="orb2" aria-hidden="true">
        <div className="ring orbit-inner" />
        <div className="ring rv orbit-outer" />
        {orbitColors.map((gradient, index) => (
          <span className={`orbit-dot orbit-dot-${index}`} key={gradient} style={{ background: `linear-gradient(140deg,${gradient})` }} />
        ))}
        <Avatar name={profile.name} photo={profile.photo || undefined} size={88} />
      </div>
      <p>Everyone you meet joins your circle when they accept your card. Their network opens up to you, and yours to them.</p>
      <label className="f">
        <span>Circle name</span>
        <input value={circleName} onChange={(event) => onCircleName(event.target.value)} />
      </label>
      <ActionFooter><button className="btn" type="button" onClick={onCreate}>Create my circle</button></ActionFooter>
    </>
  );
}

export function DesignScreen({
  profile,
  saving,
  onArt,
  onUpdate,
  onUpload,
  onBack,
  onSave,
  onReset,
}: {
  profile: Profile;
  saving: boolean;
  onArt: (art: number) => void;
  onUpdate: (updates: Partial<Profile>) => void;
  onUpload: (file: File, kind: "photo" | "logo" | "cover") => void;
  onBack: () => void;
  onSave: () => void;
  onReset: () => void;
}) {
  const [needInput, setNeedInput] = useState("");
  const [offerInput, setOfferInput] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fieldOptions: ProfileField[] = [
    { id: "linkedin", label: "LinkedIn", abbreviation: "in", color: "#0a66c2", value: "" },
    { id: "website", label: "Company Website", abbreviation: "↗", color: "#5e5ce6", value: "" },
    { id: "instagram", label: "Instagram", abbreviation: "Ig", color: "#c13584", value: "" },
    { id: "calendar", label: "Calendar", abbreviation: "Cal", color: "#2684ff", value: "" },
    { id: "address", label: "Address", abbreviation: "⌖", color: "#ff9500", value: "" },
    { id: "other", label: "Other link", abbreviation: "↗", color: "#8e8e93", value: "" },
  ];

  function addSkill(kind: "wants" | "haves") {
    const value = (kind === "wants" ? needInput : offerInput).trim();
    if (!value) return;
    const current = profile[kind];
    if (!current.includes(value)) onUpdate({ [kind]: [...current, value] });
    if (kind === "wants") setNeedInput("");
    else setOfferInput("");
  }

  function addField(field: ProfileField) {
    if (profile.fields.some((item) => item.id === field.id)) return;
    onUpdate({ fields: [...profile.fields, { ...field, value: "" }] });
  }

  function moveField(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= profile.fields.length) return;
    const next = [...profile.fields];
    [next[index], next[target]] = [next[target], next[index]];
    onUpdate({ fields: next });
  }

  function handleEnter(event: KeyboardEvent<HTMLInputElement>, kind: "wants" | "haves") {
    if (event.key === "Enter") {
      event.preventDefault();
      addSkill(kind);
    }
  }

  return (
    <>
      <div className="hd">
        <button className="lk design-cancel" type="button" onClick={onBack}>Cancel</button>
        <b className="ed">Design your card</b>
        <button className="lk design-save" type="button" onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save"}</button>
      </div>
      <h2>Card art</h2>
      <div className="ag">
        {CARD_ARTS.map((art, index) => (
          <button className={profile.art === index ? "on" : ""} type="button" onClick={() => onArt(index)} key={art}>
            <span><CardArtwork variant={index} /></span>{art}
          </button>
        ))}
      </div>
      <h2>Live preview</h2>
      <DigitalCard profile={profile} level="Level 1" />
      <div className="design-uploads">
        <label className="pill">＋ Profile photo<input hidden type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && onUpload(event.target.files[0], "photo")} /></label>
        <label className="pill">＋ Cover photo<input hidden type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && onUpload(event.target.files[0], "cover")} /></label>
        <label className="pill">＋ Logo<input hidden type="file" accept="image/*" onChange={(event) => event.target.files?.[0] && onUpload(event.target.files[0], "logo")} /></label>
        <button className="pill" type="button" onClick={() => onUpdate({ squarePhoto: !profile.squarePhoto })}>{profile.squarePhoto ? "Round photo" : "Square photo"}</button>
        {profile.cover ? <button className="pill" type="button" onClick={() => onUpdate({ cover: "", coverStorageId: null })}>Remove cover</button> : null}
      </div>
      <h2>Personal details</h2>
      {([
        ["name", "Name"],
        ["title", "Job title"],
        ["company", "Company"],
        ["headline", "Headline"],
      ] as const).map(([field, label]) => (
        <label className="f" key={field}>
          <span>{label}</span>
          <input
            value={profile[field]}
            placeholder={label}
            onChange={(event) => onUpdate({ [field]: event.target.value })}
          />
        </label>
      ))}
      <h2>Haves and wants</h2>
      <p>Tell your circle what you need and what you can offer. Harmoni uses it to suggest the right intros.</p>
      {([
        ["wants", "What I need", needInput, setNeedInput, "Seed investors"],
        ["haves", "What I can help with", offerInput, setOfferInput, "Hiring engineers"],
      ] as const).map(([kind, title, value, setValue, placeholder]) => (
        <div className="card" key={kind}>
          <b>{title}</b>
          <div className="skill-chips">
            {profile[kind].length ? profile[kind].map((skill, index) => (
              <span className="chip" key={`${kind}-${index}`}>
                {skill}<button type="button" onClick={() => onUpdate({ [kind]: profile[kind].filter((_, i) => i !== index) })} aria-label={`Remove ${skill}`}>×</button>
              </span>
            )) : <span className="tag">Nothing added yet</span>}
          </div>
          <div className="row">
            <input value={value} placeholder={placeholder} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => handleEnter(event, kind)} />
            <button className="pill" type="button" onClick={() => addSkill(kind)}>Add</button>
          </div>
        </div>
      ))}
      <h2>Your fields</h2>
      {profile.fields.map((field, index) => (
        <div className="fe" key={field.id}>
          <i className="bi custom-field-icon" style={{ background: field.color }}>{field.abbreviation}</i>
          <input
            value={field.value}
            placeholder={field.label}
            onChange={(event) => {
              const next = profile.fields.map((item, i) => i === index ? { ...item, value: event.target.value } : item);
              onUpdate({ fields: next });
            }}
          />
          <button type="button" onClick={() => moveField(index, -1)} aria-label={`Move ${field.label} up`}>↑</button>
          <button type="button" onClick={() => onUpdate({ fields: profile.fields.filter((item) => item.id !== field.id) })} aria-label={`Remove ${field.label}`}>×</button>
        </div>
      ))}
      {!profile.fields.length ? <p>No fields yet. Add one below.</p> : null}
      <h2>Add a field</h2>
      <div className="gr">
        {fieldOptions.map((field) => (
          <button className="gi" type="button" key={field.id} onClick={() => addField(field)} disabled={profile.fields.some((item) => item.id === field.id)}>
            <i className="bi custom-field-icon" style={{ width: 52, height: 52, background: field.color }}>{field.abbreviation}</i>{field.label}
          </button>
        ))}
      </div>
      <h2>Settings</h2>
      <div className="tg">
        <div><b>QR on the back of my card</b><div className="tag">Tap your card to flip it and show your QR</div></div>
        <button className={`sx${profile.qrOnBack ? " on" : ""}`} type="button" onClick={() => onUpdate({ qrOnBack: !profile.qrOnBack })} aria-label="Toggle QR on card" />
      </div>
      <div className="tg">
        <div><b>Add &apos;Where we met&apos; detail</b><div className="tag">Remember where you met each contact</div></div>
        <button className={`sx${profile.includeMeetingPlace ? " on" : ""}`} type="button" onClick={() => onUpdate({ includeMeetingPlace: !profile.includeMeetingPlace })} aria-label="Toggle meeting place detail" />
      </div>
      <button className="lk delete-card" type="button" onClick={() => confirmDelete ? onReset() : setConfirmDelete(true)}>
        {confirmDelete ? "Tap again to delete your card" : "Delete card"}
      </button>
      <ActionFooter><button className="btn" type="button" onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Preview card"}</button></ActionFooter>
    </>
  );
}

export function MyCardScreen({
  profile,
  xp,
  onShare,
}: {
  profile: Profile;
  xp: number;
  onShare: () => void;
}) {
  const level = Math.min(5, Math.floor(xp / 300) + 1);
  const levelNames = ["Newcomer", "Connector", "Networker", "Super Connector", "Circle Legend"];
  const nextQuest = profile.photo ? "Share your card" : "Add a profile picture";
  const progress = level >= 5 ? 100 : (xp % 300) / 3;
  const badges = ["First card", "Face of the brand", "Brand mark", "Signature style", "Circle founder", "First share"];

  return (
    <>
      <div className="gr2">
        <span className="tag">Good afternoon, {profile.name.split(" ")[0]}</span>
        <span className="ach" style={{ margin: 0 }}>✦ {levelNames[level - 1]}</span>
      </div>
      <DigitalCard profile={profile} level={`Level ${level}`} />
      <p className="c card-hint">Tap your card to reveal your QR</p>
      <div className="card jr">
        <div className="lvb">
          <div className="md">{level}</div>
          <div style={{ flex: 1 }}>
            <b>{levelNames[level - 1]}</b>
            <div className="tag">{xp} XP · {300 - (xp % 300)} XP to {levelNames[Math.min(level, 4)]}</div>
            <div className="bar"><i style={{ width: `${progress}%` }} /></div>
          </div>
        </div>
        <button className="qst" type="button" onClick={onShare}>
          <span><small>Next quest</small>{nextQuest}</span><em>+100 XP</em>
        </button>
      </div>
      <h2>Badges <span className="tag">1 of 12</span></h2>
      <div className="bdg">
        {badges.map((badge, index) => <div className={index ? "lk2" : ""} key={badge}><i>{index ? "✧" : "✦"}</i>{badge}</div>)}
      </div>
      <button className="share" type="button" onClick={onShare}><Icon name="share" size={20} />Share</button>
    </>
  );
}

export function ContactsScreen({
  contacts,
  query,
  onQuery,
  onScan,
  onSelect,
}: {
  contacts: Contact[];
  query: string;
  onQuery: (query: string) => void;
  onScan: () => void;
  onSelect: (name: string) => void;
}) {
  const visible = contacts.filter((contact) =>
    `${contact.name} ${contact.title} ${contact.company}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <h1 className="contacts-title">Your <i>contacts</i></h1>
      <input className="sr" value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search your network" aria-label="Search your network" />
      <div className="fl"><button className="pill on" type="button">All</button><button className="pill" type="button">Scanned</button></div>
      <div className="lst">
        {visible.length ? visible.map((contact) => (
          <button className="ct contact-button" type="button" key={contact.name} onClick={() => onSelect(contact.name)}>
            <Avatar name={contact.name} photo={contact.photo || undefined} size={56} />
            <div className="m"><b style={{ fontSize: 17 }}>{contact.name}</b><div className="tag">{[contact.title, contact.company].filter(Boolean).join(" at ") || contact.source}</div></div>
            <div className="contact-date"><div className="tag">{contact.when}</div><span className="dt" /></div>
          </button>
        )) : (
          <div className="empty-contacts">
            <h1>Your network <i>starts here</i></h1>
            <p>Swap cards and everyone you meet lands here, with their circle.</p>
            <button className="btn s" type="button" onClick={onScan}>Open the scanner</button>
          </div>
        )}
      </div>
    </>
  );
}

export function ContactDetailScreen({
  contact,
  onBack,
  onViewCard,
  onAskIntro,
  onTag,
  onNote,
}: {
  contact: Contact;
  onBack: () => void;
  onViewCard: () => void;
  onAskIntro: () => void;
  onTag: () => void;
  onNote: () => void;
}) {
  return (
    <>
      <div className="cv">
        <CardArtwork variant={5} />
        <div className="hl" />
      </div>
      <button className="bkb bk" type="button" onClick={onBack} aria-label="Back to contacts"><Icon name="back" /></button>
      <div className="dh">
        <Avatar name={contact.name} photo={contact.photo || undefined} size={108} />
        {contact.company ? <div className="plg"><b>{contact.company[0].toUpperCase()}</b></div> : null}
      </div>
      <h1 className="contact-name">{contact.name}</h1>
      {contact.title || contact.company ? (
        <div className="pt contact-role">{contact.title}{contact.title && contact.company ? <span> at </span> : null}{contact.company}</div>
      ) : null}
      <div className="contact-tags">
        {contact.tags.map((tag) => <span className="chip" key={tag}>{tag}</span>)}
        <button className="chip" type="button" onClick={onTag}>＋ Tag</button>
      </div>
      <h2>Notes</h2>
      <div className="card contact-notes">
        {contact.notes.length ? contact.notes.map((note, index) => (
          <div key={`${note.at}-${index}`}>
            {note.text}<div className="tag">Note added {note.at}</div>
            {index < contact.notes.length - 1 ? <hr /> : null}
          </div>
        )) : <span className="tag contact-note-empty">When you meet someone worth remembering, this is where the details live: what you talked about, what clicked, what is next.</span>}
      </div>
      <h2>Connection details</h2>
      <div className="row contact-meta">
        <span className="ic"><Icon name="calendar" size={18} />{contact.when}</span>
        {contact.met ? <span className="ic"><Icon name="pin" size={18} />{contact.met}</span> : null}
      </div>
      <button className="btn g s contact-view-card" type="button" onClick={onViewCard}>View card</button>
      {contact.email || contact.phone ? (
        <div className="lst contact-fields">
          {contact.email ? <div className="ct"><span className="bi email-icon"><Icon name="email" size={19} /></span><div className="m"><b>{contact.email}</b><div className="tag">Work email</div></div></div> : null}
          {contact.phone ? <div className="ct"><span className="bi phone-icon"><Icon name="phone" size={19} /></span><div className="m"><b>{contact.phone}</b><div className="tag">Mobile</div></div></div> : null}
        </div>
      ) : null}
      <div className="bb">
        <button className="btn" type="button" onClick={onAskIntro}>{contact.introRequested ? "Request sent" : "Ask for intros"}</button>
        <button className="btn g" type="button" onClick={onTag}>Add tag</button>
        <button className="btn g" type="button" onClick={onNote}>Add note</button>
      </div>
    </>
  );
}

export function ContactCardScreen({ contact, onBack }: { contact: Contact; onBack: () => void }) {
  const profile: Profile = {
    ...{
      name: contact.name,
      title: contact.title,
      company: contact.company,
      headline: "",
      email: contact.email,
      phone: contact.phone,
      photo: contact.photo,
      photoStorageId: null,
      cover: "",
      coverStorageId: null,
      logo: "",
      logoStorageId: null,
      squarePhoto: false,
      art: 5,
      circle: "",
      wants: [],
      haves: [],
      fields: [],
      qrOnBack: true,
      includeMeetingPlace: true,
    },
  };
  return (
    <>
      <div className="hd contact-card-header">
        <button className="lk" type="button" onClick={onBack}>‹ Back</button>
        <b className="ed">{contact.name}&apos;s card</b>
        <span className="header-spacer" />
      </div>
      <DigitalCard profile={profile} />
    </>
  );
}

export function ContactEntrySheet({
  kind,
  value,
  onChange,
  onSave,
  onDismiss,
}: {
  kind: "tag" | "note";
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onDismiss: () => void;
}) {
  const isTag = kind === "tag";
  return (
    <div className="sheet" onClick={(event) => event.target === event.currentTarget && onDismiss()}>
      <div>
        <h1 className="entry-title">Add a <i>{isTag ? "tag" : "note"}</i></h1>
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={isTag ? "Investor, Friend, Follow up" : "What did you talk about?"} autoFocus />
        <button className="btn" type="button" onClick={onSave}>Save</button>
      </div>
    </div>
  );
}

export function DeleteAccountSheet({
  busy,
  onConfirm,
  onDismiss,
}: {
  busy: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="sheet" onClick={(event) => event.target === event.currentTarget && !busy && onDismiss()}>
      <div className="sp account-delete-sheet" role="alertdialog" aria-modal="true" aria-labelledby="delete-account-title">
        <h2 id="delete-account-title">Delete your account?</h2>
        <p>This permanently deletes your account, card, uploaded images, and saved contacts.</p>
        <button className="btn g s" type="button" onClick={onDismiss} disabled={busy}>Keep my account</button>
        <button className="btn g s delete-account-confirm" type="button" onClick={onConfirm} disabled={busy}>
          {busy ? "Deleting account…" : "Delete account"}
        </button>
      </div>
    </div>
  );
}

export function ScanScreen({ profile, onScan }: { profile: Profile; onScan: () => void }) {
  return (
    <>
      <h1 className="scan-title">Scan a <i>card</i></h1>
      <p>Point your camera at a Harmoni QR code. You get their card, and they get yours.</p>
      <div className="vf">
        <i /><i /><i /><i />
        <div className="vt"><QrCode seed="scan" /></div>
        <div className="sl" />
      </div>
      <p className="c">Live camera scanning arrives with the backend.</p>
      <button className="btn" type="button" onClick={onScan}>Scan {profile.name.split(" ")[0]}&apos;s QR (demo)</button>
    </>
  );
}

const DEMO_NETWORK = [
  ["Maya Chen", "Seed investor", "Backs early stage SaaS and consumer apps"],
  ["Dev Patel", "Startup counsel", "Handles incorporation and fundraising paperwork"],
  ["Sofia Rossi", "Growth lead", "Helps founders land their first 100 customers"],
] as const;

export function CircleScreen({
  profile,
  contacts,
  introductions,
  onScan,
  onAskIntro,
  onShare,
}: {
  profile: Profile;
  contacts: Contact[];
  introductions: Record<string, boolean>;
  onScan: () => void;
  onAskIntro: (name: string) => void;
  onShare: () => void;
}) {
  if (!contacts.length) {
    return (
      <>
        <div className="orb2">
          <div className="ring orbit-inner" />
          <div className="ring rv orbit-outer" />
          <Avatar name={profile.name} photo={profile.photo || undefined} size={88} />
        </div>
        <h1 className="circle-title">Your <i>circle</i></h1>
        <p className="c">It starts with your first card exchange. Everyone you meet joins your circle and opens their network to you.</p>
        <button className="btn" type="button" onClick={onScan}>Open the scanner</button>
      </>
    );
  }

  const host = contacts[0];
  return (
    <>
      <h1 className="circle-title">{host.name.split(" ")[0]}&apos;s <i>circle</i></h1>
      <p>Ask {host.name.split(" ")[0]} for an introduction. They approve first, then the person sees your card.</p>
      {DEMO_NETWORK.map(([name, role, description]) => {
        const requested = introductions[name];
        const search = `${role} ${description}`.toLowerCase();
        const matched = profile.wants.some((want) => search.includes(want.toLowerCase().replace(/s$/, "")));
        return (
          <div className="card" key={name}>
            <div className="row">
              <Avatar name={name} size={52} />
              <div className="member-main"><b className="member-name">{name}</b><div className="tag">{role}</div></div>
              {matched ? <span className="ach match-badge">✦ Match</span> : null}
            </div>
            <p className="member-copy">{description}.</p>
            {requested ? <span className="pill">Waiting for {host.name.split(" ")[0]} to approve</span> : (
              <button className="btn s" type="button" onClick={() => onAskIntro(name)}>Ask {host.name.split(" ")[0]} for an intro</button>
            )}
          </div>
        );
      })}
      <h2>Your circle</h2>
      <div className="card">
        <div className="row circle-summary">
          <div><b>{profile.circle}</b><div className="tag">{DEMO_NETWORK.length + contacts.length + 1} people</div></div>
          <div className="stk">
            <Avatar name={host.name} size={36} />
            {DEMO_NETWORK.map(([name]) => <Avatar key={name} name={name} size={36} />)}
          </div>
        </div>
        <p className="circle-copy">{host.name.split(" ")[0]} joined automatically. Share your card with the next person you meet to grow it.</p>
        <button className="btn g s" type="button" onClick={onShare}>Share my card</button>
      </div>
    </>
  );
}

export function SetupGuide({ onDismiss, onDesign, onShare, onScan }: {
  onDismiss: () => void;
  onDesign: () => void;
  onShare: () => void;
  onScan: () => void;
}) {
  const steps = [
    ["Create your card", "Your digital first impression", true],
    ["Add your profile picture", "Put a face to your card", false],
    ["Share your card", "Start connecting with others", false],
    ["Make your first connection", "Scan a card or let someone scan yours", false],
  ] as const;
  return (
    <div className="sheet" onClick={(event) => event.target === event.currentTarget && onDismiss()}>
      <div className="sp">
        <div className="row setup-heading">
          <h1>Let&apos;s get you <i>set up</i></h1>
          <div className="bg"><ProgressRing value={25} size={64} /><b>25%</b></div>
        </div>
        {steps.map(([title, description, done], index) => (
          <button
            className={`st${done ? " dn" : ""}`}
            type="button"
            key={title}
            onClick={index === 1 ? onDesign : index === 2 ? onShare : index === 3 ? onScan : onDismiss}
          >
            <span className="ck2">{done ? "✓" : index + 1}</span>
            <span><b>{title}</b><small>{description}</small></span>
            {!done ? <em>+100 XP</em> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

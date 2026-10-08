import { useEffect, useRef, useState } from "react";
import { Component, Fragment } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent, ReactNode } from "react";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import jsQR from "jsqr";
import DigitalCard from "./digital-card";
import type { Contact, Profile, ProfileField } from "./types";
import { CARD_ARTS } from "./types";
import { Avatar, CardArtwork, Icon, ProgressRing } from "./ui";
import { Select } from "./select";

type TextField = "name" | "title" | "company" | "headline" | "email" | "phone";

type ScreenErrorBoundaryProps = { children: ReactNode; section: string; recoverLabel?: string; onRecover?: () => void };
type ScreenErrorBoundaryState = { hasError: boolean; retryKey: number };

export class ScreenErrorBoundary extends Component<ScreenErrorBoundaryProps, ScreenErrorBoundaryState> {
  state: ScreenErrorBoundaryState = { hasError: false, retryKey: 0 };

  static getDerivedStateFromError(): Partial<ScreenErrorBoundaryState> {
    return { hasError: true };
  }

  private retry = () => {
    this.setState((current) => ({ hasError: false, retryKey: current.retryKey + 1 }));
  };

  private recover = () => {
    this.props.onRecover?.();
    this.retry();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="card screen-error" role="alert">
          <b>We couldn&apos;t load {this.props.section}.</b>
          <p>Your saved information is safe. Try loading this section again.</p>
          <button className="btn g s" type="button" onClick={this.retry}>Try again</button>
          {this.props.onRecover ? <button className="lk" type="button" onClick={this.recover}>{this.props.recoverLabel ?? "Start over"}</button> : null}
        </div>
      );
    }
    return <Fragment key={this.state.retryKey}>{this.props.children}</Fragment>;
  }
}

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

export function WelcomeScreen({ onStart, onSignIn, onPreview, onJoinCode }: { onStart: () => void; onSignIn: () => void; onPreview: () => void; onJoinCode: () => void }) {
  return (
    <>
      <div className="top"><span className="wm">Harmoni</span></div>
      <div className="fan" aria-hidden="true">
        <div className="fc c1" />
        <div className="fc c2" />
        <div className="fc c3" />
      </div>
      <h1 className="hero">Your story.<br /><i>Your people.</i></h1>
      <p className="c">Start with what you&apos;re looking for. Shape a persona, then build your card and circle.</p>
      <ActionFooter>
        <button className="btn pu" type="button" onClick={onStart}>Explore as a guest</button>
        <button className="lk" type="button" onClick={onPreview}>Preview a circle invite</button>
        <button className="lk" type="button" onClick={onJoinCode}>I have a join code</button>
        <button className="lk" type="button" onClick={onSignIn}>I already have an account</button>
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
  resetCode,
  resetCodeValue,
  onUsername,
  onPassword,
  onResetCode,
  onSubmit,
  onToggleMode,
  onForgotPassword,
  onBack,
  adultConfirmed,
  onAdultConfirmed,
}: {
  adultConfirmed: boolean;
  onAdultConfirmed: (confirmed: boolean) => void;
  mode: "signup" | "signin" | "forgot" | "reset";
  username: string;
  password: string;
  error: string;
  busy: boolean;
  resetCode: string;
  resetCodeValue: string;
  onUsername: (value: string) => void;
  onPassword: (value: string) => void;
  onResetCode: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onToggleMode: () => void;
  onForgotPassword: () => void;
  onBack: () => void;
}) {
  const isSignup = mode === "signup";
  const isResetRequest = mode === "forgot";
  const isReset = mode === "reset";
  return (
    <>
      <div className="hd">
        <button className="bkb" type="button" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
        <span className="tag">{isResetRequest || isReset ? "Password reset" : "Demo account"}</span>
      </div>
      <h1>{isSignup ? "Create your account" : isResetRequest ? "Forgot password?" : isReset ? "Choose a new password" : "Welcome back"}</h1>
      <p>{isResetRequest || isReset ? "Reset your demo password with a one-time code shown here. No email is sent." : "Use a username and password to save your card. No email or verification code needed."}</p>
      <form className="auth-form" onSubmit={onSubmit}>
        {mode !== "reset" ? <label className="f">
          <span>Username or email</span>
          <input value={username} onChange={(event) => onUsername(event.target.value)} autoComplete="username" minLength={3} maxLength={254} required />
        </label> : null}
        {isReset ? <label className="f">
          <span>Reset code</span>
          <input value={resetCodeValue} onChange={(event) => onResetCode(event.target.value)} autoComplete="one-time-code" maxLength={8} required />
        </label> : null}
        {!isResetRequest ? <label className="f">
          <span>{isReset ? "New password" : "Password"}</span>
          <input
            value={password}
            onChange={(event) => onPassword(event.target.value)}
            type="password"
            autoComplete={isSignup || isReset ? "new-password" : "current-password"}
            minLength={isSignup || isReset ? 8 : undefined}
            maxLength={256}
            required
          />
        </label> : null}
        {isSignup ? (
          <label className="p1-adult-check auth-adult-check">
            <input type="checkbox" checked={adultConfirmed} onChange={(event) => onAdultConfirmed(event.target.checked)} />
            <span>I confirm I&apos;m 18 or older. Harmoni&apos;s pilot is for adults only.</span>
          </label>
        ) : null}
        {resetCode ? <p className="auth-reset-code" role="status">Demo reset code: <b>{resetCode}</b></p> : null}
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
        <div className="auth-actions">
          <button className="btn pu" type="submit" disabled={busy || (isSignup && !adultConfirmed)}>
            {busy ? "Please wait…" : isSignup ? "Create account" : isResetRequest ? "Get reset code" : isReset ? "Reset password" : "Sign in"}
          </button>
        </div>
      </form>
      {mode === "signin" ? <p className="auth-switch"><button className="lk" type="button" onClick={onForgotPassword}>Forgot password?</button></p> : null}
      {mode === "signup" || mode === "signin" ? <p className="auth-switch">
        {isSignup ? "Already have an account?" : "New to Harmoni?"}{" "}
        <button className="lk" type="button" onClick={onToggleMode}>{isSignup ? "Sign in" : "Create an account"}</button>
      </p> : null}
      {isReset ? <p className="auth-switch">Password updated? <button className="lk" type="button" onClick={onToggleMode}>Sign in</button></p> : null}
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
  personaItems,
  saving,
  onArt,
  onUpdate,
  onUpload,
  onBack,
  onSave,
  onReset,
  onCreatePersonaItem,
  onUpdatePersonaItem,
  onApprovePersonaItem,
  onArchivePersonaItem,
  onSetPersonaVisibility,
  onGrantMatchingToCircle,
}: {
  profile: Profile;
  personaItems: Pick<Doc<"personaItems">, "_id" | "kind" | "text" | "tags" | "visibility" | "status">[];
  saving: boolean;
  onArt: (art: number) => void;
  onUpdate: (updates: Partial<Profile>) => void;
  onUpload: (file: File, kind: "photo" | "logo" | "cover") => void;
  onBack: () => void;
  onSave: () => void;
  onReset: () => void;
  onCreatePersonaItem: (kind: "want" | "have", text: string) => void;
  onUpdatePersonaItem: (itemId: Id<"personaItems">, text: string) => void;
  onApprovePersonaItem: (itemId: Id<"personaItems">) => void;
  onArchivePersonaItem: (itemId: Id<"personaItems">) => void;
  onSetPersonaVisibility: (itemId: Id<"personaItems">, visibility: "private" | "connections" | "circle" | "custom") => void;
  onGrantMatchingToCircle: (itemId: Id<"personaItems">) => void;
}) {
  const [needInput, setNeedInput] = useState("");
  const [offerInput, setOfferInput] = useState("");
  const [personaDrafts, setPersonaDrafts] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fieldOptions: ProfileField[] = [
    { id: "linkedin", label: "LinkedIn", abbreviation: "in", color: "#0a66c2", value: "" },
    { id: "website", label: "Company Website", abbreviation: "↗", color: "#5e5ce6", value: "" },
    { id: "instagram", label: "Instagram", abbreviation: "Ig", color: "#c13584", value: "" },
    { id: "calendar", label: "Calendar", abbreviation: "Cal", color: "#2684ff", value: "" },
    { id: "address", label: "Address", abbreviation: "⌖", color: "#ff9500", value: "" },
    { id: "other", label: "Other link", abbreviation: "↗", color: "#8e8e93", value: "" },
  ];

  function addSkill(kind: "want" | "have") {
    const value = (kind === "want" ? needInput : offerInput).trim();
    if (!value) return;
    onCreatePersonaItem(kind, value);
    if (kind === "want") setNeedInput("");
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

  function handleEnter(event: KeyboardEvent<HTMLInputElement>, kind: "want" | "have") {
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
      <p>Tell Harmoni what you need and what you can offer. Only approved context shared with matching can be used.</p>
      <div className="card persona-protected-note"><b>Your context is protected</b><div className="tag">Drafts stay private. You choose what to approve and who can use it for matching.</div></div>
      {[
        { kind: "want" as const, title: "What I need", value: needInput, setValue: setNeedInput, placeholder: "Seed investors" },
        { kind: "have" as const, title: "What I can help with", value: offerInput, setValue: setOfferInput, placeholder: "Hiring engineers" },
      ].map(({ kind, title, value, setValue, placeholder }) => (
        <div className="card" key={kind}>
          <b>{title}</b>
          <div className="skill-chips">
            {personaItems.filter((item) => item.kind === kind).length ? personaItems.filter((item) => item.kind === kind).map((item) => (
              <div className="persona-item" key={item._id}>
                <input value={personaDrafts[String(item._id)] ?? item.text} aria-label={title + " context"} onChange={(event) => setPersonaDrafts((current) => ({ ...current, [String(item._id)]: event.target.value }))} />
                {personaDrafts[String(item._id)] !== undefined && personaDrafts[String(item._id)] !== item.text ? <button className="pill" type="button" onClick={() => { onUpdatePersonaItem(item._id, personaDrafts[String(item._id)] ?? item.text); setPersonaDrafts((current) => { const next = { ...current }; delete next[String(item._id)]; return next; }); }}>Save</button> : null}
                <Select
                  variant="pill"
                  ariaLabel="Context visibility"
                  value={item.visibility}
                  onChange={(visibility) => onSetPersonaVisibility(item._id, visibility)}
                  options={[{ value: "private", label: "Private" }, { value: "connections", label: "Connections" }, { value: "circle", label: "Circle" }, { value: "custom", label: "Custom" }]}
                />
                <span className="tag">{item.status}</span>
                {item.status === "draft" ? <button className="pill" type="button" onClick={() => onApprovePersonaItem(item._id)}>Approve</button> : null}
                {item.status !== "archived" ? <button className="pill" type="button" onClick={() => onArchivePersonaItem(item._id)}>Archive</button> : null}
                {item.status === "approved" && item.visibility === "custom" ? <button className="pill" type="button" onClick={() => onGrantMatchingToCircle(item._id)}>Share matching with my circle</button> : null}
              </div>
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
  awardedBadges,
  onShare,
}: {
  profile: Profile;
  xp: number;
  awardedBadges: string[];
  onShare: () => void;
}) {
  const level = Math.min(5, Math.floor(xp / 300) + 1);
  const levelNames = ["Newcomer", "Connector", "Networker", "Super Connector", "Circle Legend"];
  const nextQuest = profile.photo ? "Share your card" : "Add a profile picture";
  const progress = level >= 5 ? 100 : (xp % 300) / 3;
  const badges = [
    ["first_card", "First card"],
    ["face_of_brand", "Face of the brand"],
    ["brand_mark", "Brand mark"],
    ["signature_style", "Signature style"],
    ["circle_founder", "Circle founder"],
    ["first_share", "First share"],
  ] as const;

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
      <h2>Badges <span className="tag">{awardedBadges.length} of 12</span></h2>
      <div className="bdg">
        {badges.map(([id, label]) => {
          const earned = awardedBadges.includes(id);
          return <div className={earned ? "" : "lk2"} key={id}><i>{earned ? "✦" : "✧"}</i>{label}</div>;
        })}
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
  onSelect: (contactId: Id<"contacts">) => void;
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
          <button className="ct contact-button" type="button" key={contact.id} onClick={() => onSelect(contact.id)}>
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
  introNetwork,
  onBack,
  onViewCard,
  onAskIntro,
  onTag,
  onNote,
  onMet,
}: {
  contact: Contact;
  introNetwork: { status: "not_member" } | { status: "ok"; members: { userId: Id<"users">; fullName: string; jobTitle?: string; company?: string }[] } | undefined;
  onBack: () => void;
  onViewCard: () => void;
  onAskIntro: (targetUserId: Id<"users">) => void;
  onTag: () => void;
  onNote: () => void;
  onMet: () => void;
}) {
  const [showIntroTargets, setShowIntroTargets] = useState(false);
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
      {contact.source === "introduced" && contact.introducedByName ? (
        <div className="tag introduced-by">Introduced by {contact.introducedByName}</div>
      ) : null}
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
      <button className="lk contact-met-edit" type="button" onClick={onMet}>{contact.met ? "Edit where we met" : "Add where we met"}</button>
      <button className="btn g s contact-view-card" type="button" onClick={onViewCard}>View card</button>
      {contact.email || contact.phone ? (
        <div className="lst contact-fields">
          {contact.email ? <div className="ct"><span className="bi email-icon"><Icon name="email" size={19} /></span><div className="m"><b>{contact.email}</b><div className="tag">Work email</div></div></div> : null}
          {contact.phone ? <div className="ct"><span className="bi phone-icon"><Icon name="phone" size={19} /></span><div className="m"><b>{contact.phone}</b><div className="tag">Mobile</div></div></div> : null}
        </div>
      ) : null}
      <div className="bb">
        {contact.canRequestIntros ? (
          <button className="btn" type="button" disabled={contact.introRequested} onClick={() => setShowIntroTargets((open) => !open)}>{contact.introRequested ? "Request sent" : "Ask for intros"}</button>
        ) : null}
        <button className="btn g" type="button" onClick={onTag}>Add tag</button>
        <button className="btn g" type="button" onClick={onNote}>Add note</button>
      </div>
      {showIntroTargets ? (
        <div className="card intro-target-list">
          <b>Ask {contact.name} to introduce you to</b>
          {introNetwork === undefined ? (
            <div className="intro-network-loading" aria-label="Loading circle members" aria-busy="true"><i /><i /><i /></div>
          ) : introNetwork.status === "not_member" ? (
            <p className="tag">You can ask for introductions through people you&apos;ve exchanged cards with.</p>
          ) : introNetwork.members.length ? introNetwork.members.map((target) => (
            <button className="ct" type="button" key={target.userId} onClick={() => { onAskIntro(target.userId); setShowIntroTargets(false); }}>
              <div className="m"><b>{target.fullName}</b><div className="tag">{[target.jobTitle, target.company].filter(Boolean).join(" at ") || "In their circle"}</div></div>
              <span className="dt" />
            </button>
          )) : <p className="tag">There is no one else in this circle to introduce you to yet.</p>}
        </div>
      ) : null}
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
      publicUrl: contact.publicUrl,
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
      fields: [],
      qrOnBack: Boolean(contact.publicUrl),
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
  kind: "tag" | "note" | "met";
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onDismiss: () => void;
}) {
  const isTag = kind === "tag";
  const title = kind === "met" ? "where we met" : isTag ? "tag" : "note";
  return (
    <div className="sheet" onClick={(event) => event.target === event.currentTarget && onDismiss()}>
      <div>
        <h1 className="entry-title">{kind === "met" ? "Edit" : "Add a"} <i>{title}</i></h1>
        <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={isTag ? "Investor, Friend, Follow up" : kind === "met" ? "Coffee shop, conference, city…" : "What did you talk about?"} autoFocus />
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

export function DeleteCardSheet({
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
      <div className="sp account-delete-sheet" role="alertdialog" aria-modal="true" aria-labelledby="delete-card-title">
        <h2 id="delete-card-title">Delete your card?</h2>
        <p>This removes your published card and its uploaded images. Your account and contacts stay saved.</p>
        <button className="btn g s" type="button" onClick={onDismiss} disabled={busy}>Keep my card</button>
        <button className="btn g s delete-account-confirm" type="button" onClick={onConfirm} disabled={busy}>
          {busy ? "Deleting card…" : "Delete card"}
        </button>
      </div>
    </div>
  );
}

export function ShareLinkSheet({ url, onDismiss }: { url: string; onDismiss: () => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [message, setMessage] = useState("");

  async function copyLink() {
    try {
      if (!navigator.clipboard?.writeText || !window.isSecureContext) {
        throw new Error("Clipboard access is unavailable.");
      }
      await navigator.clipboard.writeText(url);
      setMessage("Link copied to clipboard.");
      return;
    } catch {
      const input = inputRef.current;
      input?.focus();
      input?.select();
      try {
        if (document.execCommand("copy")) {
          setMessage("Link copied to clipboard.");
          return;
        }
      } catch {
        // The selected link below remains available for manual copying.
      }
      setMessage("The link is selected. Copy it manually if clipboard access is blocked.");
    }
  }

  async function shareLink() {
    if (!navigator.share) {
      setMessage("Use Copy link to share your card.");
      return;
    }
    try {
      await navigator.share({ title: "My Harmoni card", url });
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        setMessage("Sharing was unavailable. Copy the link instead.");
      }
    }
  }

  return (
    <div className="sheet" onClick={(event) => event.target === event.currentTarget && onDismiss()}>
      <div className="sp" role="dialog" aria-modal="true" aria-labelledby="share-link-title">
        <h2 id="share-link-title">Share your card</h2>
        <p>Anyone with this link can view your published card.</p>
        <input
          ref={inputRef}
          aria-label="Public card link"
          value={url}
          readOnly
          onFocus={(event) => event.currentTarget.select()}
          onClick={(event) => event.currentTarget.select()}
        />
        {message ? <p role="status">{message}</p> : null}
        <button className="btn g s" type="button" onClick={() => void copyLink()}>Copy link</button>
        <button className="lk" type="button" onClick={() => void shareLink()}>More sharing options</button>
        <button className="lk" type="button" onClick={onDismiss}>Close</button>
      </div>
    </div>
  );
}

type BarcodeDetectorLike = { detect: (video: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> };

type BarcodeDetectorConstructor = new (options: { formats: string[] }) => BarcodeDetectorLike;

export function ScanScreen({ onScan }: { onScan: (link: string) => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const callbackRef = useRef(onScan);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [pastedLink, setPastedLink] = useState("");
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    callbackRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    const video = videoRef.current;
    if (!cameraStream || !video) return;
    const activeVideo: HTMLVideoElement = video;
    let active = true;
    let animationFrame = 0;
    streamRef.current = cameraStream;
    activeVideo.srcObject = cameraStream;
    void activeVideo.play();
    const BrowserBarcodeDetector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
    let detector: BarcodeDetectorLike | null = null;
    try {
      if (BrowserBarcodeDetector) detector = new BrowserBarcodeDetector({ formats: ["qr_code"] });
    } catch {
      detector = null;
    }
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });

    async function detectFrame() {
      if (!active) return;
      if (activeVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        try {
          if (detector) {
            const results = await detector.detect(activeVideo);
            const value = results.find((item) => item.rawValue)?.rawValue;
            if (value) {
              active = false;
              streamRef.current?.getTracks().forEach((track) => track.stop());
              setScanning(false);
              setCameraStream(null);
              callbackRef.current(value);
              return;
            }
          } else if (context) {
            canvas.width = activeVideo.videoWidth;
            canvas.height = activeVideo.videoHeight;
            context.drawImage(activeVideo, 0, 0, canvas.width, canvas.height);
            const frame = context.getImageData(0, 0, canvas.width, canvas.height);
            const result = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: "attemptBoth" });
            if (result?.data) {
              active = false;
              streamRef.current?.getTracks().forEach((track) => track.stop());
              setScanning(false);
              setCameraStream(null);
              callbackRef.current(result.data);
              return;
            }
          }
        } catch {
          detector = null;
        }
      }
      animationFrame = window.requestAnimationFrame(() => void detectFrame());
    }
    animationFrame = window.requestAnimationFrame(() => void detectFrame());
    return () => {
      active = false;
      window.cancelAnimationFrame(animationFrame);
      cameraStream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      activeVideo.srcObject = null;
    };
  }, [cameraStream]);

  async function startCamera() {
    setCameraError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Camera scanning is not available here. Paste a card link below.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      setCameraStream(stream);
      setScanning(true);
    } catch {
      setCameraError("Camera access was unavailable. Paste a card link below.");
    }
  }

  function submitLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = pastedLink.trim();
    if (value) callbackRef.current(value);
  }

  return (
    <>
      <h1 className="scan-title">Scan a <i>card</i></h1>
      <p>Point your camera at a Harmoni QR code, or paste a card link.</p>
      <div className={`vf${scanning ? " scanning" : ""}`}>
        <i /><i /><i /><i />
        <video ref={videoRef} className="scan-video" playsInline muted aria-label="Live QR scanner" />
        {scanning ? <div className="sl" /> : null}
      </div>
      <button className="btn" type="button" onClick={() => void startCamera()}>{scanning ? "Camera scanning…" : "Start camera scanning"}</button>
      {cameraError ? <p className="auth-error" role="alert">{cameraError}</p> : null}
      <form className="scan-link-form" onSubmit={submitLink}>
        <label className="f"><span>Paste a card link</span><input type="url" value={pastedLink} onChange={(event) => setPastedLink(event.target.value)} placeholder="https://…/c/name" /></label>
        <button className="btn g s" type="submit" disabled={!pastedLink.trim()}>Open card</button>
      </form>
    </>
  );
}

export function CircleScreen({
  profile,
  contacts,
  circle,
  exchangeRequests,
  introRequests,
  suggestions,
  onScan,
  onShare,
  onRename,
  onAcceptExchange,
  onDeclineExchange,
  onDecideIntro,
  onDismissMatch,
}: {
  profile: Profile;
  contacts: Contact[];
  circle: { name: string; members: { userId: Id<"users">; fullName: string; jobTitle?: string; company?: string; photoUrl: string | null; isMe?: boolean }[] } | null;
  exchangeRequests: { _id: Id<"exchanges">; card: { fullName: string; jobTitle?: string; company?: string; photoUrl: string | null }; metLocation?: string }[];
  introRequests: { _id: Id<"introRequests">; requester: { fullName: string }; target: { fullName: string } }[];
  suggestions: { _id: Id<"matchSuggestions">; targetUserId: Id<"users">; targetName: string; reason: string; score: number }[];
  onScan: () => void;
  onShare: () => void;
  onRename: () => void;
  onAcceptExchange: (exchangeId: Id<"exchanges">) => void;
  onDeclineExchange: (exchangeId: Id<"exchanges">) => void;
  onDecideIntro: (requestId: Id<"introRequests">, decision: "approve" | "decline") => void;
  onDismissMatch: (suggestionId: Id<"matchSuggestions">) => void;
}) {
  if (!contacts.length && !exchangeRequests.length && !introRequests.length && !suggestions.length) {
    return (
      <>
        <div className="orb2">
          <div className="ring orbit-inner" />
          <div className="ring rv orbit-outer" />
          <Avatar name={profile.name} photo={profile.photo || undefined} size={88} />
        </div>
        <h1 className="circle-title">Your <i>circle</i></h1>
        <p className="c">It starts with your first card exchange. Everyone you meet joins your circle and opens their network to you.</p>
        <button className="lk" type="button" onClick={onRename}>Edit circle name</button>
        <button className="btn" type="button" onClick={onScan}>Open the scanner</button>
      </>
    );
  }

  return (
    <>
      <h1 className="circle-title">Your <i>circle</i></h1>
      <p>People you exchange cards with appear here. Ask a connection for an introduction to someone in their circle.</p>
      <h2>Your circle</h2>
      <div className="card">
        <div className="row circle-summary">
          <div><b>{circle?.name || profile.circle || "My Circle"}</b><div className="tag">{circle?.members.length ?? contacts.length + 1} people</div></div>
          <div className="stk">
            <Avatar name={profile.name} photo={profile.photo || undefined} size={36} />
            {contacts.map((contact) => <Avatar key={contact.id} name={contact.name} photo={contact.photo || undefined} size={36} />)}
          </div>
        </div>
        <button className="lk" type="button" onClick={onRename}>Edit circle name</button>
        <p className="circle-copy">Share your card with the next person you meet to grow your circle.</p>
        <button className="btn g s" type="button" onClick={onShare}>Share my card</button>
      </div>
      {circle ? circle.members.filter((member) => !member.isMe).map((member) => (
        <div className="card" key={member.userId}>
          <div className="row">
            <Avatar name={member.fullName} photo={member.photoUrl || undefined} size={52} />
            <div className="member-main"><b className="member-name">{member.fullName}</b><div className="tag">{member.jobTitle || member.company || "Connection"}</div></div>
          </div>
        </div>
      )) : contacts.map((contact) => (
        <div className="card" key={contact.id}>
          <div className="row"><Avatar name={contact.name} photo={contact.photo || undefined} size={52} /><div className="member-main"><b className="member-name">{contact.name}</b><div className="tag">{contact.title || contact.company || "Connection"}</div></div></div>
        </div>
      ))}
      {exchangeRequests.length ? <><h2>Card exchange requests</h2>{exchangeRequests.map((request) => (
        <div className="card" key={request._id}>
          <div className="row"><Avatar name={request.card.fullName} photo={request.card.photoUrl || undefined} size={48} /><div className="member-main"><b>{request.card.fullName}</b><div className="tag">{[request.card.jobTitle, request.card.company].filter(Boolean).join(" at ") || "Wants to exchange cards"}</div></div></div>
          {request.metLocation ? <div className="tag">Met at {request.metLocation}</div> : null}
          <div className="row"><button className="btn s" type="button" onClick={() => onAcceptExchange(request._id)}>Accept</button><button className="btn g s" type="button" onClick={() => onDeclineExchange(request._id)}>Decline</button></div>
        </div>
      ))}</> : null}
      {introRequests.length ? <><h2>Intro requests</h2>{introRequests.map((request) => (
        <div className="card" key={request._id}>
          <p>{request.requester.fullName} asked for an introduction to {request.target.fullName}.</p>
          <div className="row"><button className="btn s" type="button" onClick={() => onDecideIntro(request._id, "approve")}>Make the introduction</button><button className="btn g s" type="button" onClick={() => onDecideIntro(request._id, "decline")}>Decline</button></div>
        </div>
      ))}</> : null}
      {suggestions.length ? <><h2>Potential matches</h2>{suggestions.map((suggestion) => (
        <div className="card match-suggestion" key={suggestion._id}>
          <div className="row"><Avatar name={suggestion.targetName} size={44} /><div className="member-main"><b>{suggestion.targetName}</b><div className="tag">Suggested connection</div></div></div>
          <p>{suggestion.reason}</p>
          <button className="lk" type="button" onClick={() => onDismissMatch(suggestion._id)}>Dismiss</button>
        </div>
      ))}</> : null}
    </>
  );
}

export function CircleNameSheet({ value, onChange, onSave, onDismiss }: {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="sheet" onClick={(event) => event.target === event.currentTarget && onDismiss()}>
      <div>
        <h1 className="entry-title">Name your <i>circle</i></h1>
        <input value={value} onChange={(event) => onChange(event.target.value)} maxLength={50} autoFocus />
        <button className="btn" type="button" onClick={onSave} disabled={!value.trim()}>Save circle name</button>
      </div>
    </div>
  );
}

export function AccessLogScreen({ rows, onBack, onRevoke }: {
  rows: { _id: Id<"accessLog">; viewerName: string; itemText: string; purpose: string; at: number; grantId?: Id<"personaGrants"> }[];
  onBack: () => void;
  onRevoke: (grantId: Id<"personaGrants">) => void;
}) {
  return (
    <>
      <div className="hd"><button className="lk" type="button" onClick={onBack}>Back</button><b className="ed">Who has seen my context</b><span className="header-spacer" /></div>
      <p>Approved context is only shown for the purpose and people you allowed.</p>
      {rows.length ? rows.map((row) => (
        <div className="card access-log-row" key={row._id}>
          <b>{row.viewerName}</b>
          <div>{row.itemText}</div>
          <div className="tag">{row.purpose} · {new Date(row.at).toLocaleString()}</div>
          {row.grantId ? <button className="lk" type="button" onClick={() => onRevoke(row.grantId!)}>Revoke access</button> : null}
        </div>
      )) : <div className="card"><b>No one has viewed your approved context yet.</b><div className="tag">We will list the viewer, item, purpose, and time here.</div></div>}
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

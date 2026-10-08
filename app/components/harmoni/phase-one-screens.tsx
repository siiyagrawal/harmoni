import { useState } from "react";
import type { PersonaDraft, PersonaPreview, PersonaType, PersonaVisibility } from "./types";
import { Icon } from "./ui";

const PERSONA_OPTIONS: Array<{ type: PersonaType; title: string; detail: string; icon: string }> = [
  { type: "business", title: "Business", detail: "Work, skills, and professional connections", icon: "↗" },
  { type: "personal", title: "Personal", detail: "Interests, goals, and everyday connections", icon: "✧" },
  { type: "singles", title: "Singles", detail: "What you value and hope to find", icon: "♡" },
  { type: "family", title: "Family", detail: "A shared family identity and interests", icon: "⌂" },
  { type: "custom", title: "Something else", detail: "Build a persona around your purpose", icon: "+" },
];

const VISIBILITY_OPTIONS: Array<{ value: PersonaVisibility; title: string; detail: string }> = [
  { value: "private", title: "Only me", detail: "Keep this context private" },
  { value: "connections", title: "My connections", detail: "People I have exchanged cards with" },
  { value: "circle", title: "My circle", detail: "People in my current circle" },
  { value: "custom", title: "Choose people", detail: "Grant access for a specific purpose" },
];

export function GuestCirclePreviewScreen({ onBack, onContinue }: { onBack: () => void; onContinue: () => void }) {
  return (
    <>
      <div className="hd">
        <button className="bkb" type="button" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
        <span className="tag">Guest preview</span>
      </div>
      <div className="p1-invite-art"><div className="p1-invite-orbit"><Icon name="circle" size={36} /></div><span className="p1-invite-spark">✦</span></div>
      <span className="p1-eyebrow">A circle invitation</span>
      <h1>Creative<br /><i>founders.</i></h1>
      <div className="p1-invite-meta"><span className="pill">Private circle</span><span className="pill">Approval required</span><span className="pill">Free to join</span></div>
      <div className="card p1-invite-card">
        <span className="tag">THE PURPOSE</span>
        <p>A thoughtful space for founders and builders to share experience, find collaborators, and make useful introductions.</p>
        <div className="p1-invite-topics"><span>Startups</span><span>Design</span><span>Climate</span></div>
      </div>
      <div className="card p1-preview-access"><Icon name="check" size={19} /><div><b>Preview before you join</b><p>You can see the circle&apos;s purpose and rules first. Member details stay private until you&apos;re approved.</p></div></div>
      <div className="p1-static-notice card"><b>Example invitation</b><p>This sample shows the guest preview layout. Circle access and join requests will be connected in the Circles phase.</p></div>
      <div className="ft"><button className="btn" type="button" onClick={onContinue}>Continue as a guest</button></div>
    </>
  );
}

export function PersonaTypeScreen({
  selected,
  name,
  onSelect,
  onName,
  onBack,
  onContinue,
}: {
  selected: PersonaType;
  name: string;
  onSelect: (type: PersonaType) => void;
  onName: (name: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <>
      <div className="hd">
        <button className="bkb" type="button" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
        <div className="pg"><i style={{ width: "20%" }} /></div>
        <span className="tag">Your persona</span>
      </div>
      <p className="tag p1-eyebrow">A separate space for each part of your life</p>
      <h1>Who are you<br /><i>showing up as?</i></h1>
      <p>Choose a starting point. Each persona keeps its own context and audience.</p>
      <div className="p1-type-list">
        {PERSONA_OPTIONS.map((option) => (
          <button
            className={`p1-type-card${selected === option.type ? " selected" : ""}`}
            type="button"
            key={option.type}
            onClick={() => onSelect(option.type)}
            aria-pressed={selected === option.type}
          >
            <span className="p1-type-icon" aria-hidden="true">{option.icon}</span>
            <span className="p1-type-copy"><b>{option.title}</b><small>{option.detail}</small></span>
            <span className="p1-radio" aria-hidden="true">{selected === option.type ? "✓" : ""}</span>
          </button>
        ))}
      </div>
      <label className="f p1-name-field">
        <span>Name this persona</span>
        <input value={name} maxLength={40} onChange={(event) => onName(event.target.value)} placeholder="For example, Work" />
      </label>
      <div className="p1-note"><Icon name="sparkle" size={18} /><span>You can create more personas and switch between them later.</span></div>
      <div className="ft"><button className="btn" type="button" onClick={onContinue}>Continue</button></div>
    </>
  );
}

export function PersonaPermissionsScreen({
  visibility,
  adultConfirmed,
  onVisibility,
  onAdultConfirmed,
  onBack,
  onContinue,
}: {
  visibility: PersonaVisibility;
  adultConfirmed: boolean;
  onVisibility: (visibility: PersonaVisibility) => void;
  onAdultConfirmed: (confirmed: boolean) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <>
      <div className="hd">
        <button className="bkb" type="button" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
        <div className="pg"><i style={{ width: "38%" }} /></div>
        <span className="tag">Your context</span>
      </div>
      <div className="p1-shield"><Icon name="person" size={28} /></div>
      <h1>Your context<br /><i>is protected</i></h1>
      <p>Choose who could use each approved detail for matching. Before you answer, review how your draft and permissions work.</p>
      <div className="card p1-static-notice">
        <b>Your answers stay a draft until you decide</b>
        <p>You can correct or remove each detail and choose a persona before confirming. This screen demonstrates the intended controls; saving and enforcing persona permissions will be connected later.</p>
      </div>
      <h2 className="p1-section-title">Default audience</h2>
      <div className="p1-visibility-list">
        {VISIBILITY_OPTIONS.map((option) => (
          <button
            type="button"
            className={`p1-visibility-option${visibility === option.value ? " selected" : ""}`}
            key={option.value}
            onClick={() => onVisibility(option.value)}
            aria-pressed={visibility === option.value}
          >
            <span className="p1-radio" aria-hidden="true">{visibility === option.value ? "✓" : ""}</span>
            <span><b>{option.title}</b><small>{option.detail}</small></span>
          </button>
        ))}
      </div>
      <div className="p1-note"><Icon name="check" size={18} /><span>Private is the default. Nothing from this preview is being shared.</span></div>
      <label className="p1-adult-check"><input type="checkbox" checked={adultConfirmed} onChange={(event) => onAdultConfirmed(event.target.checked)} /><span>I confirm I&apos;m 18 or older and understand this is a demo preview.</span></label>
      <div className="ft"><button className="btn" type="button" onClick={onContinue} disabled={!adultConfirmed}>Continue to my context</button></div>
    </>
  );
}

export function PersonaOnboardingScreen({
  draft,
  onChange,
  onBack,
  onReview,
}: {
  draft: PersonaDraft;
  onChange: (field: "needs" | "offers" | "interests", value: string) => void;
  onBack: () => void;
  onReview: () => void;
}) {
  const [step, setStep] = useState(0);
  const [voicePreview, setVoicePreview] = useState(false);
  const [sourceInfoOpen, setSourceInfoOpen] = useState(false);
  const prompts = [
    { label: "What are you looking for?", field: "needs" as const, placeholder: "A kind of person, opportunity, advice, or community…", hint: "I’m hoping to meet…" },
    { label: "What can you offer or share?", field: "offers" as const, placeholder: "Skills, experience, introductions, or support…", hint: "I can help with…" },
    { label: "What else matters to this persona?", field: "interests" as const, placeholder: "Add interests, goals, timing, or anything to refine this context…", hint: "I’m interested in…" },
  ];
  const prompt = prompts[step];
  const answer = draft.needs.toLowerCase();
  const followUp = step === 0 && draft.type === "business" && /fundrais|capital|invest/.test(answer)
    ? "What stage are you at, and what kind of introduction would help most?"
    : step === 0 && draft.type === "singles"
      ? "What qualities or shared values matter most to you?"
      : step === 0 && draft.type === "family"
        ? "What would make a new connection feel welcoming for your family?"
        : step === 0 && draft.type === "personal"
          ? "What interests would you enjoy sharing with someone new?"
          : step === 0 && draft.type === "custom"
            ? "What would a useful connection look like for this persona?"
            : step === 0
              ? "What kind of people or experience would be most useful?"
              : step === 1
                ? "Is there a particular skill or kind of help you enjoy sharing?"
                : "Add timing or location only if it helps people understand your intent.";

  return (
    <>
      <div className="hd">
        <button className="bkb" type="button" onClick={step === 0 ? onBack : () => setStep((current) => current - 1)} aria-label="Back"><Icon name="back" /></button>
        <div className="pg"><i style={{ width: `${48 + step * 16}%` }} /></div>
        <span className="tag">{draft.name || "Your persona"}</span>
      </div>
      <div className="p1-greeting"><span className="p1-eyebrow">A little at a time</span><h1>{prompt.label}</h1><p>Share only what feels useful. You can skip, correct, or come back later.</p></div>
      <div className="p1-input-mode" role="group" aria-label="Choose how to add context">
        <button className={!voicePreview ? "on" : ""} type="button" onClick={() => setVoicePreview(false)}>Write</button>
        <button className={voicePreview ? "on" : ""} type="button" onClick={() => setVoicePreview(true)}>Speak</button>
      </div>
      {voicePreview ? (
        <div className="card p1-voice-preview" role="status">
          <div className="p1-voice-orb"><Icon name="phone" size={22} /></div>
          <b>Voice input preview</b>
          <p>Microphone capture is not connected yet. You can type your answer below instead.</p>
        </div>
      ) : null}
      <div className="p1-source-card">
        <div><b>Use a source you trust</b><span>Later</span></div>
        <p>You will be able to choose approved sources and review a temporary draft before adding anything here.</p>
        <button type="button" className="pill" onClick={() => setSourceInfoOpen((open) => !open)} aria-expanded={sourceInfoOpen}>How source review works</button>
        {sourceInfoOpen ? <small>Source connection is not enabled in this preview. You can continue by writing or speaking your own notes, then correct or remove each detail in review.</small> : null}
      </div>
      <label className="p1-textarea-label" htmlFor={`persona-answer-${prompt.field}`}>{prompt.hint}</label>
      <textarea
        id={`persona-answer-${prompt.field}`}
        className="p1-textarea"
        value={draft[prompt.field]}
        onChange={(event) => onChange(prompt.field, event.target.value)}
        placeholder={prompt.placeholder}
        rows={5}
        maxLength={500}
      />
      <div className="p1-context-footer"><span>{draft[prompt.field].length}/500</span><span>Private draft · not saved yet</span></div>
      <div className="p1-follow-up card">
        <span className="p1-spark">✦</span>
        <div><b>{step === 0 ? "One helpful follow-up" : step === 1 ? "Make it easy to match" : "You can refine this later"}</b><p>{followUp}</p></div>
      </div>
      <div className="p1-inline-actions">
        <button className="lk" type="button" onClick={() => step < prompts.length - 1 ? setStep((current) => current + 1) : onReview()}>Skip this question</button>
        <button className="lk" type="button" onClick={onReview}>I&apos;m done for now</button>
      </div>
      <div className="ft"><button className="btn" type="button" onClick={() => step < prompts.length - 1 ? setStep((current) => current + 1) : onReview()}>{step < prompts.length - 1 ? "Next question" : "Review my context"}</button></div>
    </>
  );
}

export function PersonaReviewScreen({
  draft,
  onChange,
  onVisibility,
  onTogglePublicField,
  onBack,
  onDiscard,
  onConfirm,
}: {
  draft: PersonaDraft;
  onChange: (field: "needs" | "offers" | "interests", value: string) => void;
  onVisibility: (visibility: PersonaVisibility) => void;
  onTogglePublicField: (field: string) => void;
  onBack: () => void;
  onDiscard: () => void;
  onConfirm: () => void;
}) {
  const typeLabel = PERSONA_OPTIONS.find((option) => option.type === draft.type)?.title ?? "Custom";
  return (
    <>
      <div className="hd">
        <button className="bkb" type="button" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
        <div className="pg"><i style={{ width: "82%" }} /></div>
        <span className="tag">Review</span>
      </div>
      <p className="tag p1-eyebrow">Your private preview</p>
      <h1>Let&apos;s make this<br /><i>feel like you.</i></h1>
      <p>Correct or remove anything. These details stay separate from your other personas.</p>
      <div className="card p1-review-heading">
        <div className="p1-persona-mark">{typeLabel.slice(0, 1)}</div>
        <div><b>{draft.name || typeLabel}</b><div className="tag">{typeLabel} persona · draft</div></div>
        <span className="sn">Private preview</span>
      </div>
      {([
        ["needs", "Looking for", "Add what you hope to find…"],
        ["offers", "Can share", "Add what you can offer…"],
        ["interests", "Interests and goals", "Add anything else that matters…"],
      ] as const).map(([field, title, placeholder]) => (
        <label className="p1-review-field" key={field}>
          <span>{title}</span>
          <textarea className="p1-textarea p1-review-textarea" value={draft[field]} onChange={(event) => onChange(field, event.target.value)} placeholder={placeholder} rows={2} maxLength={500} />
        </label>
      ))}
      <h2 className="p1-section-title">Who may use this context?</h2>
      <div className="p1-audience-scroll">
        {VISIBILITY_OPTIONS.map((option) => (
          <button key={option.value} type="button" className={`pill${draft.visibility === option.value ? " on" : ""}`} onClick={() => onVisibility(option.value)} aria-pressed={draft.visibility === option.value}>{option.title}</button>
        ))}
      </div>
      <h2 className="p1-section-title">Public card preview</h2>
      <div className="card p1-public-preview">
        <p>Only choose the fields you want on this persona&apos;s public card.</p>
        {[["name", "Name and headline"], ["card", "Contact fields"], ["needs", "What I’m looking for"], ["offers", "What I can share"]].map(([key, label]) => (
          <label className="p1-check-row" key={key}>
            <input type="checkbox" checked={draft.publicFields.includes(key)} onChange={() => onTogglePublicField(key)} />
            <span>{label}</span>
          </label>
        ))}
      </div>
      <div className="p1-static-notice card"><b>Preview only</b><p>Persona details and audience choices stay in this browser session for now. Your existing account and business card continue to use their current save flow.</p></div>
      <button className="lk p1-discard-draft" type="button" onClick={onDiscard}>Discard this draft</button>
      <div className="ft"><button className="btn" type="button" onClick={onConfirm}>Keep this persona preview</button></div>
    </>
  );
}

export function PersonaHubScreen({
  personas,
  selectedId,
  onSelect,
  onCreate,
  onEdit,
  onAddMore,
  onDelete,
  onOpenContacts,
}: {
  personas: PersonaPreview[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onEdit: (persona: PersonaPreview) => void;
  onAddMore: (persona: PersonaPreview) => void;
  onDelete: (id: string) => void;
  onOpenContacts: () => void;
}) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const selected = personas.find((persona) => persona.id === selectedId);
  return (
    <section className="p1-persona-hub">
      <div className="p1-hub-heading"><div><span className="p1-eyebrow">Your space</span><h2>Personas</h2></div><button className="pill" type="button" onClick={onCreate}>+ New</button></div>
      <div className="p1-quick-links">
        <button type="button" onClick={onOpenContacts}><Icon name="contacts" size={19} /><span>Your contacts</span><Icon name="chevron" size={17} /></button>
      </div>
      {selected ? (
        <div className="card p1-selected-persona">
          <div className="p1-review-heading">
            <div className="p1-persona-mark">{selected.name.slice(0, 1).toUpperCase()}</div>
            <div><b>{selected.name}</b><div className="tag">{PERSONA_OPTIONS.find((option) => option.type === selected.type)?.title} · preview</div></div>
            <span className="sn">Active</span>
          </div>
          <div className="p1-context-pair"><small>LOOKING FOR</small><p>{selected.needs || "Add what you hope to find"}</p></div>
          <div className="p1-context-pair"><small>CAN SHARE</small><p>{selected.offers || "Add skills, support, or experience"}</p></div>
          <div className="p1-hub-audience"><Icon name="person" size={16} />{VISIBILITY_OPTIONS.find((option) => option.value === selected.visibility)?.title ?? "Only me"}</div>
          <div className="p1-persona-actions">
            {personas.filter((persona) => persona.id !== selected.id).map((persona) => <button type="button" className="pill" key={persona.id} onClick={() => onSelect(persona.id)}>Switch to {persona.name}</button>)}
            <button type="button" className="pill" onClick={() => onAddMore(selected)}>Add more context</button>
            <button type="button" className="pill" onClick={() => onEdit(selected)}>Edit</button>
          </div>
        </div>
      ) : null}
      <div className="p1-persona-list">
        {personas.filter((persona) => persona.id !== selectedId).map((persona) => (
          <div className="card p1-persona-list-card" key={persona.id}>
            <button className="p1-persona-select" type="button" onClick={() => onSelect(persona.id)}>
              <span className="p1-persona-mark">{persona.name.slice(0, 1).toUpperCase()}</span>
              <span><b>{persona.name}</b><small>{PERSONA_OPTIONS.find((option) => option.type === persona.type)?.title} · {VISIBILITY_OPTIONS.find((option) => option.value === persona.visibility)?.title}</small></span>
              <Icon name="chevron" size={17} />
            </button>
            <div className="p1-persona-actions">
              <button type="button" className="pill" onClick={() => onEdit(persona)}>Edit</button>
              {deleteId === persona.id ? <><button type="button" className="pill" onClick={() => { onDelete(persona.id); setDeleteId(null); }}>Remove preview</button><button type="button" className="pill" onClick={() => setDeleteId(null)}>Cancel</button></> : <button type="button" className="pill" onClick={() => setDeleteId(persona.id)}>Delete</button>}
            </div>
          </div>
        ))}
      </div>
      {!personas.length ? <div className="card p1-empty-personas"><div className="p1-shield small"><Icon name="sparkle" size={21} /></div><b>One persona, or a few</b><p>Keep work, personal, and other parts of your life in separate spaces.</p><button className="btn g s" type="button" onClick={onCreate}>Create your first persona</button></div> : null}
      <p className="p1-demo-caption">Persona switching and editing are UI previews in this phase. Your existing card remains connected to your account.</p>
    </section>
  );
}

export function MatchesLandingScreen({ onCreateContext }: { onCreateContext: () => void }) {
  return (
    <>
      <p className="tag p1-eyebrow">A good connection starts with context</p>
      <h1>Find your<br /><i>next connection.</i></h1>
      <p>When approved context is available, this is where relevant introductions will appear.</p>
      <div className="p1-match-orbit" aria-hidden="true"><div className="p1-orbit-ring one" /><div className="p1-orbit-ring two" /><div className="p1-orbit-center"><Icon name="sparkle" size={34} /></div><span className="p1-orbit-dot a" /><span className="p1-orbit-dot b" /><span className="p1-orbit-dot c" /></div>
      <div className="card p1-empty-state">
        <span className="p1-eyebrow">Your match space</span>
        <h2>Let&apos;s add your context</h2>
        <p>Start with what you&apos;re looking for and what you can offer. Matching is not active in this UI preview.</p>
        <button className="btn g s" type="button" onClick={onCreateContext}>Build a persona</button>
      </div>
    </>
  );
}

export function NotificationsLandingScreen() {
  return (
    <>
      <p className="tag p1-eyebrow">Stay in the loop</p>
      <h1>Your updates,<br /><i>all in one place.</i></h1>
      <div className="p1-notification-hero"><div className="p1-notification-bell"><Icon name="bell" size={31} /></div><span className="p1-notification-dot" /></div>
      <div className="card p1-empty-state">
        <span className="p1-eyebrow">Notifications</span>
        <h2>You&apos;re all caught up</h2>
        <p>Circle activity, requests, and new connections will appear here.</p>
      </div>
      <div className="p1-demo-caption">Notification delivery and preferences will be added in a later phase.</div>
    </>
  );
}

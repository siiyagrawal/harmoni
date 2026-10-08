import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { PersonaDraft, PersonaPreview, PersonaType, PersonaVisibility } from "./types";
import { admissionLabel, feeLabel, isFull, type DemoCircle } from "./circle-data";
import { Icon } from "./ui";

export const PERSONA_OPTIONS: Array<{ type: PersonaType; title: string; detail: string; icon: string }> = [
  { type: "business", title: "Business", detail: "Work, skills, and professional connections", icon: "↗" },
  { type: "personal", title: "Personal", detail: "Interests, goals, and everyday connections", icon: "✧" },
  { type: "singles", title: "Singles", detail: "What you value and hope to find", icon: "♡" },
  { type: "family", title: "Family", detail: "A shared family identity and interests", icon: "⌂" },
  { type: "custom", title: "Something else", detail: "Fun, hobbies, or any purpose of your own", icon: "+" },
];

const VISIBILITY_OPTIONS: Array<{ value: PersonaVisibility; title: string; detail: string }> = [
  { value: "private", title: "Only me", detail: "Keep this context private" },
  { value: "connections", title: "My connections", detail: "People I have exchanged cards with" },
  { value: "circle", title: "My circle", detail: "People in my current circle" },
  { value: "custom", title: "Choose people", detail: "Grant access for a specific purpose" },
];

export function GuestCirclePreviewScreen({
  circle,
  onBack,
  onContinue,
}: {
  circle: DemoCircle;
  onBack: () => void;
  onContinue: () => void;
}) {
  const full = isFull(circle);
  const unavailable = !circle.available || !circle.published;
  const nameWords = circle.name.split(" ");
  return (
    <>
      <div className="hd">
        <button className="bkb" type="button" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
        <span className="tag">Guest preview</span>
      </div>
      <div className="p1-invite-art"><div className="p1-invite-orbit"><Icon name={circle.kind === "hub" ? "hub" : "circle"} size={36} /></div><span className="p1-invite-spark">✦</span></div>
      <span className="p1-eyebrow">{circle.kind === "hub" ? "A Hub Circle invitation" : "A circle invitation"}</span>
      <h1>{nameWords.slice(0, -1).join(" ")}{nameWords.length > 1 ? <br /> : null}<i>{nameWords[nameWords.length - 1]}.</i></h1>
      <div className="p1-invite-meta">
        <span className="pill">{circle.kind === "hub" ? "Hub Circle" : "General Circle"}</span>
        <span className="pill">{circle.visibility === "public" ? "Discoverable" : "Private"}</span>
        <span className="pill">{admissionLabel(circle.admission)}</span>
        <span className="pill">{feeLabel(circle.fee)}</span>
      </div>
      {full || unavailable ? (
        <div className="card p2-warning" role="status">
          <b>{unavailable ? "This circle isn’t available right now" : "This circle is full"}</b>
          <p>{unavailable ? "The invitation may have expired or been withdrawn." : `All ${circle.capacity} places are taken and there is no waitlist.`} You can still build a persona, but you won’t be able to join from this invitation.</p>
        </div>
      ) : null}
      <div className="card p1-invite-card">
        <span className="tag">THE PURPOSE</span>
        <p>{circle.purpose}</p>
        <div className="p1-invite-topics">{circle.topics.map((topic) => <span key={topic}>{topic}</span>)}</div>
      </div>
      <div className="card p2-terms">
        <div><small>Host</small><b>{circle.host}</b></div>
        <div><small>Joining</small><b>{admissionLabel(circle.admission)}</b></div>
        <div><small>Fee</small><b>{feeLabel(circle.fee)}</b></div>
        <div><small>Capacity</small><b>{circle.capacity ? `${circle.memberCount} of ${circle.capacity} places` : "No limit"}</b></div>
      </div>
      {circle.fee.mode === "paid" ? <p className="p2-fine">{circle.fee.terms} This circle fee is separate from Harmoni Premium.</p> : null}
      <div className="card p1-preview-access"><Icon name="lock" size={19} /><div><b>Member details stay private</b><p>Guests see the circle’s purpose and rules only. You can’t send interest, message or see contact details until you’re a verified, active member.</p></div></div>
      <div className="card p2-processing-notice">
        <b>Before you answer</b>
        <p>Your answers build a private persona draft in this browser. Verify your account to save it. Saving your persona does not join this circle; you’ll confirm joining separately. Adults (18+) only. A browser cookie remembers this browser, not you.</p>
      </div>
      <div className="ft"><button className="btn" type="button" onClick={onContinue}>{full || unavailable ? "Build a persona anyway" : "Answer as a guest"}</button></div>
    </>
  );
}

export function JoinCodeScreen({ onBack, onResolve }: { onBack: () => void; onResolve: (code: string) => string | null }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(onResolve(code) ?? "");
  }
  return (
    <>
      <div className="hd">
        <button className="bkb" type="button" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
        <span className="tag">Join code</span>
      </div>
      <div className="p1-shield"><Icon name="qr" size={28} /></div>
      <h1>Enter your<br /><i>join code.</i></h1>
      <p>QR codes, NFC tags, shared links and join codes all open the same circle invitation.</p>
      <form onSubmit={submit}>
        <label className="f"><span>Join code</span><input value={code} onChange={(event) => setCode(event.target.value)} placeholder="For example, CF-4821" autoCapitalize="characters" maxLength={12} /></label>
        {error ? <p className="auth-error" role="alert">{error}</p> : null}
        <p className="p2-fine">Sample codes: CF-4821 (approval), RM-1150 (full), MC-3318 (open).</p>
        <div className="ft"><button className="btn" type="submit" disabled={!code.trim()}>Open invitation</button></div>
      </form>
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
        <p>You can correct or remove each detail and choose a persona before confirming. Typed or spoken answers are used only to update your private persona, then cleared. This screen demonstrates the intended controls; saving and enforcing persona permissions will be connected later.</p>
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

const PROMPTS = [
  { label: "What would make a connection useful right now?", field: "needs" as const, placeholder: "A lawyer for a lease question, a tractor for harvest week, a co-founder…", hint: "Right now, it would help to…" },
  { label: "What can you offer or share?", field: "offers" as const, placeholder: "Skills, experience, equipment, introductions, or support…", hint: "I can help with…" },
  { label: "Anything else that matters?", field: "interests" as const, placeholder: "Timing, place, availability, interests, or goals…", hint: "It also helps to know…" },
];

// Picks one follow-up from what the person has already written; nothing is sent anywhere.
function adaptiveFollowUp(draft: PersonaDraft, step: number) {
  const text = (step === 0 ? draft.needs : step === 1 ? draft.offers : draft.interests).toLowerCase();
  if (step === 0) {
    if (/attorney|lawyer|legal|court|lease|contract|custody/.test(text)) return "What kind of matter is it, which jurisdiction is it in, and how soon do you need help?";
    if (/fundrais|raise|capital|investor/.test(text)) return "What stage are you at, and what kind of introduction would help most?";
    if (/financ|tax|invest|budget|money|loan|retire/.test(text)) return "Which financial topic is it about, and how urgent is it?";
    if (/farm|crop|land|tractor|harvest|seed|irrigat|livestock/.test(text)) return "Which land, equipment, or seasonal help would make the biggest difference, and when do you need it?";
    if (draft.type === "singles") return "What qualities or shared values matter most to you?";
    if (draft.type === "family") return "What would make a new connection feel welcoming for your family?";
    return "Who would be the ideal person to meet for this, and by when?";
  }
  if (step === 1) {
    if (/attorney|lawyer|legal|law/.test(text)) return "Which areas of law and which jurisdictions can you help with?";
    if (/farm|tractor|equipment|land|harvest/.test(text)) return "When is your equipment, land, or labour free to share?";
    return "Is there a particular skill or kind of help you enjoy sharing most?";
  }
  return "Add timing, location, or availability only if it helps people understand your intent.";
}

export function PersonaOnboardingScreen({
  draft,
  circleContext,
  onChange,
  onBack,
  onReview,
  onDossier,
}: {
  draft: PersonaDraft;
  circleContext: DemoCircle | null;
  onChange: (field: "needs" | "offers" | "interests", value: string) => void;
  onBack: () => void;
  onReview: () => void;
  onDossier: () => void;
}) {
  const [step, setStep] = useState(0);
  const [voiceOn, setVoiceOn] = useState(false);
  const [followUpAnswer, setFollowUpAnswer] = useState("");
  const [answeredFollowUp, setAnsweredFollowUp] = useState<number[]>([]);
  const prompt = PROMPTS[step];
  const currentAnswer = draft[prompt.field];
  const followUp = adaptiveFollowUp(draft, step);
  const showFollowUp = currentAnswer.trim().length >= 3 && !answeredFollowUp.includes(step);

  function goTo(next: number) {
    setFollowUpAnswer("");
    setVoiceOn(false);
    if (next >= PROMPTS.length) onReview();
    else setStep(next);
  }

  function addFollowUp() {
    const answer = followUpAnswer.trim();
    if (!answer) return;
    onChange(prompt.field, `${currentAnswer.trim()}\n${answer}`.slice(0, 500));
    setFollowUpAnswer("");
    setAnsweredFollowUp((current) => [...current, step]);
  }

  return (
    <>
      <div className="hd">
        <button className="bkb" type="button" onClick={step === 0 ? onBack : () => goTo(step - 1)} aria-label="Back"><Icon name="back" /></button>
        <div className="pg"><i style={{ width: `${48 + step * 16}%` }} /></div>
        <span className="tag">{draft.name || "Your persona"}</span>
      </div>
      <div className="p1-greeting"><span className="p1-eyebrow">Question {step + 1} · one at a time</span><h1>{prompt.label}</h1><p>Share only what feels useful. You can skip, correct, or come back later.</p></div>
      {step === 0 && circleContext ? (
        <div className="p2-context-chip">
          <Icon name="circle" size={17} />
          <span>In <b>{circleContext.name}</b>, people often connect around {circleContext.topics.join(", ")}. These are general themes, never another member’s private needs.</span>
        </div>
      ) : null}
      <div className="p1-input-mode" role="group" aria-label="Choose how to add context">
        <button className={!voiceOn ? "on" : ""} type="button" onClick={() => setVoiceOn(false)}>Write</button>
        <button className={voiceOn ? "on" : ""} type="button" onClick={() => setVoiceOn(true)}>Speak</button>
      </div>
      {voiceOn ? (
        <div className="card p1-voice-preview" role="status">
          <div className="p1-voice-orb"><Icon name="phone" size={22} /></div>
          <b>Microphone is only requested when you tap Speak</b>
          <p>Voice capture is not connected in this preview, so no permission was requested. Type your answer below instead.</p>
        </div>
      ) : null}
      {step === 0 ? (
        <div className="p1-source-card">
          <div><b>Start from your public profile</b><span>Optional</span></div>
          <p>Verify your email, name the public pages you trust, then confirm, correct or reject a temporary private draft.</p>
          <button type="button" className="pill" onClick={onDossier}>Build a draft from my sources</button>
        </div>
      ) : null}
      <label className="p1-textarea-label" htmlFor={`persona-answer-${prompt.field}`}>{prompt.hint}</label>
      <textarea
        id={`persona-answer-${prompt.field}`}
        className="p1-textarea"
        value={currentAnswer}
        onChange={(event) => onChange(prompt.field, event.target.value)}
        placeholder={prompt.placeholder}
        rows={5}
        maxLength={500}
      />
      <div className="p1-context-footer"><span>{currentAnswer.length}/500</span><span>Private draft · not saved yet</span></div>
      {showFollowUp ? (
        <div className="p1-follow-up card">
          <span className="p1-spark">✦</span>
          <div className="p2-follow-up-body">
            <b>One follow-up</b>
            <p>{followUp}</p>
            <input value={followUpAnswer} onChange={(event) => setFollowUpAnswer(event.target.value)} placeholder="Optional" maxLength={200} aria-label="Answer the follow-up question" />
            <div className="p2-inline-row">
              <button className="pill" type="button" onClick={addFollowUp} disabled={!followUpAnswer.trim()}>Add to my answer</button>
              <button className="pill" type="button" onClick={() => setAnsweredFollowUp((current) => [...current, step])}>Skip</button>
            </div>
          </div>
        </div>
      ) : currentAnswer.trim().length < 3 ? (
        <p className="p2-fine">A tailored follow-up appears once you start answering.</p>
      ) : null}
      <div className="p1-inline-actions">
        <button className="lk" type="button" onClick={() => goTo(step + 1)}>Skip this question</button>
        <button className="lk" type="button" onClick={onReview}>I&apos;m done for now</button>
      </div>
      <div className="ft"><button className="btn" type="button" onClick={() => goTo(step + 1)}>{step < PROMPTS.length - 1 ? "Next question" : "Review my context"}</button></div>
    </>
  );
}

export function PersonaReviewScreen({
  draft,
  joinIntent,
  onChange,
  onVisibility,
  onTogglePublicField,
  onBack,
  onDiscard,
  onConfirm,
}: {
  draft: PersonaDraft;
  joinIntent: DemoCircle | null;
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
        ["needs", "Useful right now", "Add what would help…"],
        ["offers", "Can share", "Add what you can offer…"],
        ["interests", "Also good to know", "Add timing, place, or anything else…"],
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
        {[["name", "Name and headline"], ["card", "Contact fields"], ["needs", "What would help right now"], ["offers", "What I can share"]].map(([key, label]) => (
          <label className="p1-check-row" key={key}>
            <input type="checkbox" checked={draft.publicFields.includes(key)} onChange={() => onTogglePublicField(key)} />
            <span>{label}</span>
          </label>
        ))}
      </div>
      {joinIntent ? <div className="p1-static-notice card"><b>Saving doesn’t join {joinIntent.name}</b><p>After you verify, we’ll bring you back to {joinIntent.name} to confirm joining under its rules.</p></div> : null}
      <div className="p1-static-notice card"><b>Preview only</b><p>Persona details and audience choices stay in this browser session for now. Your existing account and business card continue to use their current save flow.</p></div>
      <button className="lk p1-discard-draft" type="button" onClick={onDiscard}>Discard this draft</button>
      <div className="ft"><button className="btn" type="button" onClick={onConfirm}>Keep this persona preview</button></div>
    </>
  );
}

export function PersonaStartScreen({
  draft,
  guest,
  onContinue,
}: {
  draft: PersonaDraft;
  guest: boolean;
  onContinue: () => void;
}) {
  const [status, setStatus] = useState<"updating" | "done">("updating");
  const added = [draft.needs, draft.offers, draft.interests].filter((value) => value.trim()).length;

  useEffect(() => {
    const timeout = window.setTimeout(() => setStatus("done"), 1300);
    return () => window.clearTimeout(timeout);
  }, []);

  if (status === "updating") {
    return (
      <div className="p2-center-state" role="status" aria-live="polite">
        <div className="p2-loader" aria-hidden="true"><i /><i /><i /></div>
        <b>Updating your persona…</b>
        <p>Applying your approved answers to {draft.name || "this persona"}.</p>
      </div>
    );
  }

  return (
    <>
      <div className="p1-match-orbit p2-start-orbit" aria-hidden="true"><div className="p1-orbit-ring one" /><div className="p1-orbit-ring two" /><div className="p1-orbit-center"><Icon name="sparkle" size={34} /></div><span className="p1-orbit-dot a" /><span className="p1-orbit-dot b" /><span className="p1-orbit-dot c" /></div>
      <span className="p1-eyebrow p2-center">{draft.name || "Your persona"} · updated</span>
      <h1 className="p2-center">Your Harmoni persona<br /><i>is taking shape.</i></h1>
      <p className="c">The beginning of your digital you—a profile shaped by what you share.</p>
      <div className="card p2-check-list">
        <div><Icon name="check" size={17} /><span>{added} approved {added === 1 ? "detail" : "details"} added to {draft.name || "this persona"}</span></div>
        <div><Icon name="check" size={17} /><span>Your typed answers were cleared after the update</span></div>
        <div><Icon name="lock" size={17} /><span>{guest ? "Held as a temporary guest draft until you verify" : "Private until you choose who may use it"}</span></div>
      </div>
      <p className="p2-fine c">This is a developing profile—not a finished digital person, an avatar, or a separately trained model.</p>
      <div className="ft"><button className="btn" type="button" onClick={onContinue}>{guest ? "Verify to save my persona" : "Continue"}</button></div>
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
  onDossier,
  onShare,
  onOpenContacts,
}: {
  personas: PersonaPreview[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onEdit: (persona: PersonaPreview) => void;
  onAddMore: (persona: PersonaPreview) => void;
  onDelete: (id: string) => void;
  onDossier: (persona: PersonaPreview) => void;
  onShare: () => void;
  onOpenContacts: () => void;
}) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const selected = personas.find((persona) => persona.id === selectedId);
  const typeTitle = (type: PersonaType) => PERSONA_OPTIONS.find((option) => option.type === type)?.title;

  function deleteControls(persona: PersonaPreview) {
    return deleteId === persona.id
      ? <><button type="button" className="pill p2-danger" onClick={() => { onDelete(persona.id); setDeleteId(null); }}>Delete {persona.name}</button><button type="button" className="pill" onClick={() => setDeleteId(null)}>Cancel</button></>
      : <button type="button" className="pill" onClick={() => setDeleteId(persona.id)}>Delete</button>;
  }

  return (
    <section className="p1-persona-hub">
      <div className="p1-hub-heading"><div><span className="p1-eyebrow">Your space</span><h2>Personas</h2></div><button className="pill" type="button" onClick={onCreate}>+ New</button></div>
      <div className="p1-quick-links">
        <button type="button" onClick={onOpenContacts}><Icon name="contacts" size={19} /><span>Your contacts</span><Icon name="chevron" size={17} /></button>
        <button type="button" onClick={onShare}><Icon name="qr" size={19} /><span>Share a persona to a circle</span><Icon name="chevron" size={17} /></button>
      </div>
      {selected ? (
        <div className="card p1-selected-persona">
          <div className="p1-review-heading">
            <div className="p1-persona-mark">{selected.name.slice(0, 1).toUpperCase()}</div>
            <div><b>{selected.name}</b><div className="tag">{typeTitle(selected.type)} · preview</div></div>
            <span className="sn">Active</span>
          </div>
          <div className="p1-context-pair"><small>USEFUL RIGHT NOW</small><p>{selected.needs || "Add what would help"}</p></div>
          <div className="p1-context-pair"><small>CAN SHARE</small><p>{selected.offers || "Add skills, support, or experience"}</p></div>
          <div className="p1-hub-audience"><Icon name="person" size={16} />{VISIBILITY_OPTIONS.find((option) => option.value === selected.visibility)?.title ?? "Only me"}</div>
          <button className="btn s p2-tell-more" type="button" onClick={() => onAddMore(selected)}>✦ Tell My AI More</button>
          <div className="p1-persona-actions">
            <button type="button" className="pill" onClick={() => setPreviewOpen((open) => !open)} aria-expanded={previewOpen}>{previewOpen ? "Hide public preview" : "Preview as others see it"}</button>
            <button type="button" className="pill" onClick={() => onEdit(selected)}>Edit</button>
            <button type="button" className="pill" onClick={() => onDossier(selected)}>Add from public sources</button>
            {deleteControls(selected)}
          </div>
          {previewOpen ? (
            <div className="p2-public-persona" aria-label="Public preview">
              <span className="tag">What others in your audience can see</span>
              <b>{selected.publicFields.includes("name") ? "Your name · headline" : "Name hidden"}</b>
              {selected.publicFields.includes("needs") && selected.needs ? <p><small>Useful right now</small>{selected.needs}</p> : null}
              {selected.publicFields.includes("offers") && selected.offers ? <p><small>Can share</small>{selected.offers}</p> : null}
              <p className="p2-fine">{selected.publicFields.includes("card") ? "Contact fields are on the card, but phone and email are released only to approved connections." : "Contact fields are hidden on this persona."}</p>
            </div>
          ) : null}
          {personas.length > 1 ? (
            <div className="p1-persona-actions">
              {personas.filter((persona) => persona.id !== selected.id).map((persona) => <button type="button" className="pill" key={persona.id} onClick={() => { onSelect(persona.id); setPreviewOpen(false); }}>Switch to {persona.name}</button>)}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="p1-persona-list">
        {personas.filter((persona) => persona.id !== selectedId).map((persona) => (
          <div className="card p1-persona-list-card" key={persona.id}>
            <button className="p1-persona-select" type="button" onClick={() => onSelect(persona.id)}>
              <span className="p1-persona-mark">{persona.name.slice(0, 1).toUpperCase()}</span>
              <span><b>{persona.name}</b><small>{typeTitle(persona.type)} · {VISIBILITY_OPTIONS.find((option) => option.value === persona.visibility)?.title}</small></span>
              <Icon name="chevron" size={17} />
            </button>
            <div className="p1-persona-actions">
              <button type="button" className="pill" onClick={() => onEdit(persona)}>Edit</button>
              {deleteControls(persona)}
            </div>
          </div>
        ))}
      </div>
      {!personas.length ? <div className="card p1-empty-personas"><div className="p1-shield small"><Icon name="sparkle" size={21} /></div><b>One persona, or a few</b><p>Keep work, personal, and other parts of your life in separate spaces.</p><button className="btn g s" type="button" onClick={onCreate}>Create your first persona</button></div> : null}
      <p className="p1-demo-caption">Switching shows only the selected persona; others stay hidden. Persona switching and editing are UI previews in this phase. Your existing card remains connected to your account.</p>
    </section>
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

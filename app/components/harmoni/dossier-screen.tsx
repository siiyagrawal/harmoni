import { useEffect, useState } from "react";
import { Icon } from "./ui";

// Static walkthrough of the M04 email-assisted self-dossier. No email is sent and no page is read;
// the research step returns sample facts so the review, correction and disposal states can be shown.

type FactState = "pending" | "confirmed" | "rejected";
type Fact = { id: string; text: string; source: string; confidence: "High" | "Medium"; state: FactState };
type SourceKey = "linkedin" | "company" | "personal" | "other";

const DEMO_CODE = "482913";
const SOURCE_LABELS: Record<SourceKey, { label: string; placeholder: string }> = {
  linkedin: { label: "Professional profile", placeholder: "https://linkedin.com/in/…" },
  company: { label: "Company website", placeholder: "https://yourcompany.com/team" },
  personal: { label: "Personal website", placeholder: "https://…" },
  other: { label: "Another public page", placeholder: "Talk, article, or directory page" },
};

export type DossierTarget = { id: string; name: string };

export function DossierScreen({
  initialEmail,
  displayName,
  targets,
  onCancel,
  onManual,
  onComplete,
}: {
  initialEmail: string;
  displayName: string;
  targets: DossierTarget[];
  onCancel: () => void;
  onManual: () => void;
  onComplete: (facts: string[], targetId: string) => void;
}) {
  const [step, setStep] = useState<"intro" | "verify" | "sources" | "research" | "identity" | "review" | "assign" | "clearing" | "done" | "discarded">("intro");
  const [email, setEmail] = useState(initialEmail);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState("");
  const [sources, setSources] = useState<Record<SourceKey, string>>({ linkedin: "", company: "", personal: "", other: "" });
  const [authorized, setAuthorized] = useState(false);
  const [researchStage, setResearchStage] = useState(0);
  const [facts, setFacts] = useState<Fact[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [target, setTarget] = useState(targets[0]?.id ?? "");
  const namedSources = (Object.keys(sources) as SourceKey[]).filter((key) => sources[key].trim());

  useEffect(() => {
    if (step !== "research") return;
    const timers = [
      window.setTimeout(() => setResearchStage(1), 800),
      window.setTimeout(() => setResearchStage(2), 1600),
      window.setTimeout(() => {
        setFacts([
          { id: "f1", text: "Works in product and operations roles", source: SOURCE_LABELS[namedSources[0] ?? "company"].label, confidence: "High", state: "pending" },
          { id: "f2", text: "About 8 years of experience building digital products", source: SOURCE_LABELS[namedSources[0] ?? "linkedin"].label, confidence: "Medium", state: "pending" },
          { id: "f3", text: "Has spoken at local startup meetups", source: SOURCE_LABELS[namedSources[namedSources.length - 1] ?? "personal"].label, confidence: "Medium", state: "pending" },
          { id: "f4", text: "Mentors early-stage founders", source: SOURCE_LABELS[namedSources[namedSources.length - 1] ?? "personal"].label, confidence: "Medium", state: "pending" },
        ]);
        setStep("identity");
      }, 2500),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  // The named sources are fixed once research starts.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (step !== "clearing") return;
    const timeout = window.setTimeout(() => setStep("done"), 1200);
    return () => window.clearTimeout(timeout);
  }, [step]);

  function discard(next: "discarded" | "cancel") {
    setFacts([]);
    setSources({ linkedin: "", company: "", personal: "", other: "" });
    setResearchStage(0);
    if (next === "cancel") onCancel();
    else setStep("discarded");
  }

  function decide(id: string, state: FactState) {
    setFacts((current) => current.map((fact) => fact.id === id ? { ...fact, state } : fact));
  }

  function saveCorrection(id: string) {
    const value = editValue.trim();
    if (!value) return;
    setFacts((current) => current.map((fact) => fact.id === id ? { ...fact, text: value, state: "confirmed" } : fact));
    setEditingId(null);
  }

  const confirmed = facts.filter((fact) => fact.state === "confirmed");
  const undecided = facts.some((fact) => fact.state === "pending");
  const header = (label: string, progress: number, back?: () => void) => (
    <div className="hd">
      <button className="bkb" type="button" onClick={back ?? (() => discard("cancel"))} aria-label={back ? "Back" : "Cancel and clear"}><Icon name={back ? "back" : "close"} /></button>
      <div className="pg"><i style={{ width: `${progress}%` }} /></div>
      <span className="tag">{label}</span>
    </div>
  );

  if (step === "intro") {
    return (
      <>
        {header("Self-dossier", 8, onCancel)}
        <div className="p1-shield"><Icon name="search" size={27} /></div>
        <h1>Start from what’s<br /><i>already public.</i></h1>
        <p>Harmoni can draft your persona from public pages you name. You review everything before it’s used.</p>
        <div className="card p2-check-list">
          <div><Icon name="check" size={17} /><span>You verify your email and name each source</span></div>
          <div><Icon name="lock" size={17} /><span>No mailbox access, and no searching beyond your sources</span></div>
          <div><Icon name="check" size={17} /><span>You confirm, correct or reject every fact</span></div>
          <div><Icon name="check" size={17} /><span>Source copies and the draft are cleared afterwards</span></div>
        </div>
        <p className="p2-fine">Results can be incomplete. Anything we can’t confirm stays unknown, and we never promise a full biography.</p>
        <button className="lk p2-bottom-space" type="button" onClick={onManual}>I’d rather type or speak</button>
        <div className="ft"><button className="btn" type="button" onClick={() => setStep("verify")}>Continue</button></div>
      </>
    );
  }

  if (step === "verify") {
    return (
      <>
        {header("Verify email", 22, () => setStep("intro"))}
        <h1>Verify your<br /><i>email first.</i></h1>
        <p>We use your verified email only to confirm the draft is about you.</p>
        <label className="f"><span>Email</span><input type="email" value={email} onChange={(event) => { setEmail(event.target.value); setCodeSent(false); }} placeholder="name@company.com" /></label>
        {codeSent ? (
          <>
            <label className="f"><span>6-digit code</span><input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" maxLength={6} autoComplete="one-time-code" /></label>
            <p className="auth-reset-code" role="status">Demo code: <b>{DEMO_CODE}</b> · no email is sent</p>
            {codeError ? <p className="auth-error" role="alert">{codeError}</p> : null}
          </>
        ) : null}
        <div className="ft">
          {codeSent
            ? <button className="btn" type="button" disabled={code.length !== 6} onClick={() => code === DEMO_CODE ? (setCodeError(""), setStep("sources")) : setCodeError("That code doesn’t match. Check it and try again.")}>Verify</button>
            : <button className="btn" type="button" disabled={!/^\S+@\S+\.\S+$/.test(email)} onClick={() => setCodeSent(true)}>Send a one-time code</button>}
        </div>
      </>
    );
  }

  if (step === "sources") {
    return (
      <>
        {header("Your sources", 38, () => setStep("verify"))}
        <h1>Which pages<br /><i>describe you?</i></h1>
        <p>Add only public pages you’re happy for Harmoni to read once.</p>
        {(Object.keys(SOURCE_LABELS) as SourceKey[]).map((key) => (
          <label className="f" key={key}>
            <span>{SOURCE_LABELS[key].label}</span>
            <input type="url" value={sources[key]} onChange={(event) => setSources((current) => ({ ...current, [key]: event.target.value }))} placeholder={SOURCE_LABELS[key].placeholder} />
          </label>
        ))}
        <label className="p1-adult-check p2-authorize"><input type="checkbox" checked={authorized} onChange={(event) => setAuthorized(event.target.checked)} /><span>I authorise Harmoni to read {namedSources.length || "these"} named {namedSources.length === 1 ? "page" : "pages"} once to build a private draft for me to review.</span></label>
        <div className="ft"><button className="btn" type="button" disabled={!authorized || !namedSources.length} onClick={() => { setResearchStage(0); setStep("research"); }}>Start research</button></div>
      </>
    );
  }

  if (step === "research") {
    const stages = ["Reading your named pages", "Pulling out facts and how sure we are", "Preparing your private draft"];
    return (
      <>
        {header("Researching", 54)}
        <div className="p2-center-state" role="status" aria-live="polite">
          <div className="p2-loader" aria-hidden="true"><i /><i /><i /></div>
          <b>Building your draft…</b>
          <div className="p2-stage-list">
            {stages.map((label, index) => <span className={index < researchStage ? "done" : index === researchStage ? "on" : ""} key={label}>{index < researchStage ? "✓" : "•"} {label}</span>)}
          </div>
        </div>
        <div className="ft"><button className="btn g" type="button" onClick={() => discard("cancel")}>Cancel and clear</button></div>
      </>
    );
  }

  if (step === "identity") {
    return (
      <>
        {header("Is this you?", 64)}
        <h1>Is this<br /><i>you?</i></h1>
        <p>Before we show any details, confirm the draft is about the right person.</p>
        <div className="card p2-identity">
          <div className="p1-persona-mark">{(displayName || email)[0]?.toUpperCase() ?? "Y"}</div>
          <div><b>{displayName || email.split("@")[0]}</b><div className="tag">Matched from {namedSources.length} named {namedSources.length === 1 ? "source" : "sources"} · {email}</div></div>
        </div>
        <button className="lk p2-bottom-space" type="button" onClick={() => discard("discarded")}>This isn’t me — discard it</button>
        <div className="ft"><button className="btn" type="button" onClick={() => setStep("review")}>Yes, that’s me</button></div>
      </>
    );
  }

  if (step === "review") {
    return (
      <>
        {header("Review draft", 76)}
        <span className="p1-eyebrow">Temporary private draft</span>
        <h1>Confirm, correct<br /><i>or reject.</i></h1>
        <p>Nothing is added until you confirm it. This draft is cleared when you finish or leave.</p>
        {facts.map((fact) => (
          <div className={`card p2-fact ${fact.state}`} key={fact.id}>
            {editingId === fact.id ? (
              <>
                <input value={editValue} onChange={(event) => setEditValue(event.target.value)} aria-label="Correct this fact" maxLength={160} />
                <div className="p2-inline-row"><button className="pill" type="button" onClick={() => saveCorrection(fact.id)}>Save correction</button><button className="pill" type="button" onClick={() => setEditingId(null)}>Cancel</button></div>
              </>
            ) : (
              <>
                <b>{fact.text}</b>
                <div className="tag">{fact.source} · {fact.confidence} confidence</div>
                <div className="p2-inline-row">
                  <button className={`pill${fact.state === "confirmed" ? " on" : ""}`} type="button" onClick={() => decide(fact.id, "confirmed")}>Confirm</button>
                  <button className="pill" type="button" onClick={() => { setEditingId(fact.id); setEditValue(fact.text); }}>Correct</button>
                  <button className={`pill${fact.state === "rejected" ? " on" : ""}`} type="button" onClick={() => decide(fact.id, "rejected")}>Reject</button>
                </div>
              </>
            )}
          </div>
        ))}
        <div className="card p2-unknown">
          <b>Couldn’t confirm</b>
          <p>Current city, availability and what you need right now stay <i>unknown</i>. We’ll ask you directly instead of guessing.</p>
        </div>
        <div className="ft"><button className="btn" type="button" disabled={undecided || editingId !== null} onClick={() => setStep("assign")}>{undecided ? "Decide on each fact" : `Continue with ${confirmed.length} confirmed`}</button></div>
      </>
    );
  }

  if (step === "assign") {
    return (
      <>
        {header("Choose persona", 88, () => setStep("review"))}
        <h1>Which persona<br /><i>is this for?</i></h1>
        <p>Confirmed facts are added only to the persona you choose. Your other personas don’t see them.</p>
        <div className="p1-visibility-list">
          {targets.map((option) => (
            <button type="button" key={option.id} className={`p1-visibility-option${target === option.id ? " selected" : ""}`} onClick={() => setTarget(option.id)} aria-pressed={target === option.id}>
              <span className="p1-radio" aria-hidden="true">{target === option.id ? "✓" : ""}</span>
              <span><b>{option.name}</b><small>{confirmed.length} confirmed {confirmed.length === 1 ? "fact" : "facts"} will be added</small></span>
            </button>
          ))}
        </div>
        <div className="ft"><button className="btn" type="button" disabled={!target} onClick={() => setStep("clearing")}>Add to this persona</button></div>
      </>
    );
  }

  if (step === "clearing") {
    return (
      <div className="p2-center-state" role="status" aria-live="polite">
        <div className="p2-loader" aria-hidden="true"><i /><i /><i /></div>
        <b>Updating your persona and clearing copies…</b>
      </div>
    );
  }

  if (step === "discarded") {
    return (
      <>
        {header("Draft discarded", 100, onCancel)}
        <div className="p1-shield"><Icon name="close" size={26} /></div>
        <h1>Draft<br /><i>discarded.</i></h1>
        <p>Nothing was added to your persona, and the temporary source copies were cleared.</p>
        <div className="card p1-static-notice"><b>Prefer to tell us yourself?</b><p>You can type or speak your answers instead, or try again with different sources.</p></div>
        <button className="lk p2-bottom-space" type="button" onClick={() => setStep("sources")}>Try different sources</button>
        <div className="ft"><button className="btn" type="button" onClick={onManual}>Type or speak instead</button></div>
      </>
    );
  }

  return (
    <>
      {header("Done", 100, onCancel)}
      <div className="p1-shield"><Icon name="check" size={28} /></div>
      <h1>Your draft is<br /><i>in your persona.</i></h1>
      <div className="card p2-check-list">
        <div><Icon name="check" size={17} /><span>{confirmed.length} confirmed {confirmed.length === 1 ? "fact" : "facts"} added to {targets.find((option) => option.id === target)?.name}</span></div>
        <div><Icon name="check" size={17} /><span>Source page copies deleted</span></div>
        <div><Icon name="check" size={17} /><span>Temporary review draft deleted</span></div>
      </div>
      <p>Public pages describe your past. Next, tell us what would make a connection useful right now.</p>
      <div className="ft"><button className="btn" type="button" onClick={() => onComplete(confirmed.map((fact) => fact.text), target)}>Tell us what you need now</button></div>
    </>
  );
}

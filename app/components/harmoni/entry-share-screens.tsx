import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import DigitalCard from "./digital-card";
import type { CapturedCard, CaptureStatus } from "./circle-data";
import type { PersonaPreview, Profile } from "./types";
import { Icon, QrCode } from "./ui";

export type EntryDestination = { id: string; name: string; code: string | null; url: string | null };

type EntryMethod = "qr" | "nfc" | "link" | "code";

// A short opaque reference stands in for the persona; the payload never carries profile data.
function personaRef(id: string) {
  const hash = [...id].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
  return `p${hash.toString(36).slice(0, 5)}`;
}

export function ShareEntryScreen({
  profile,
  personas,
  destinations,
  initialPersonaId,
  initialDestinationId,
  onBack,
}: {
  profile: Profile;
  personas: PersonaPreview[];
  destinations: EntryDestination[];
  initialPersonaId: string;
  initialDestinationId: string;
  onBack: () => void;
}) {
  const [personaId, setPersonaId] = useState(initialPersonaId);
  const [destinationId, setDestinationId] = useState(initialDestinationId);
  const [method, setMethod] = useState<EntryMethod>("qr");
  const [message, setMessage] = useState("");
  const [origin, setOrigin] = useState("");
  const destination = destinations.find((item) => item.id === destinationId) ?? destinations[0];
  const persona = personas.find((item) => item.id === personaId);
  const entryUrl = destination?.url
    ? destination.url
    : destination?.code ? `${origin}/?join=${encodeURIComponent(destination.code)}${persona ? `&p=${personaRef(persona.id)}` : ""}` : "";
  const nfcSupported = typeof window !== "undefined" && "NDEFReader" in window;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setOrigin(window.location.origin));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(`${label} copied.`);
    } catch {
      setMessage("Copy was blocked. Select the text and copy it manually.");
    }
  }

  return (
    <>
      <div className="hd">
        <button className="bkb" type="button" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
        <span className="tag">Share an entry</span>
      </div>
      <h1>Who are you<br /><i>sharing as?</i></h1>
      <p>Pick the persona and the circle first. Everyone who scans or taps lands on the same invitation.</p>
      <h2 className="p1-section-title">Card</h2>
      <div className="p2-card-toggle" role="radiogroup" aria-label="Card to share">
        <button type="button" role="radio" aria-checked={personaId === "main"} className={`pill${personaId === "main" ? " on" : ""}`} onClick={() => setPersonaId("main")}>Main card</button>
        {personas.map((item) => <button type="button" role="radio" aria-checked={personaId === item.id} key={item.id} className={`pill${personaId === item.id ? " on" : ""}`} onClick={() => setPersonaId(item.id)}>{item.name}</button>)}
      </div>
      {!personas.length ? <p className="p2-fine">Create a business, singles or custom persona under You to share a different card.</p> : null}
      <h2 className="p1-section-title">Destination circle</h2>
      <label className="p2-select-row"><Icon name="circle" size={17} /><span>Circle</span>
        <select value={destination?.id} onChange={(event) => setDestinationId(event.target.value)}>
          {destinations.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
        </select>
      </label>
      <h2 className="p1-section-title">Preview</h2>
      {personaId === "main" || !persona ? (
        <DigitalCard profile={profile} level="Level 1" />
      ) : (
        <div className="card p2-public-persona p2-share-preview">
          <div className="p1-review-heading"><div className="p1-persona-mark">{persona.name[0]?.toUpperCase()}</div><div><b>{persona.publicFields.includes("name") ? profile.name || "Your name" : "Name hidden"}</b><div className="tag">{persona.name} persona</div></div></div>
          {persona.publicFields.includes("needs") && persona.needs ? <p><small>Useful right now</small>{persona.needs}</p> : null}
          {persona.publicFields.includes("offers") && persona.offers ? <p><small>Can share</small>{persona.offers}</p> : null}
          <p className="p2-fine">Phone and email are never part of an entry. They’re released only to approved connections.</p>
        </div>
      )}
      <div className="p1-input-mode p2-segments" role="tablist" aria-label="Entry method">
        {([["qr", "QR"], ["nfc", "NFC tag"], ["link", "Link"], ["code", "Code"]] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={method === id} className={method === id ? "on" : ""} onClick={() => { setMethod(id); setMessage(""); }}>{label}</button>
        ))}
      </div>
      <div className="card p2-entry">
        {method === "qr" && entryUrl ? <div className="qrw"><QrCode value={entryUrl} /></div> : null}
        {method === "nfc" ? (
          <>
            <div className="p1-voice-orb"><Icon name="phone" size={22} /></div>
            <b>Write this entry to an NFC tag</b>
            <p>{nfcSupported ? "Hold a writable tag to the back of your phone when writing is connected." : "This browser can’t write NFC tags. Copy the link and use your tag-writing app."}</p>
            <button className="pill" type="button" onClick={() => void copy(entryUrl, "Link")}>Copy link for tag</button>
          </>
        ) : null}
        {method === "link" ? (
          <>
            <input readOnly value={entryUrl} aria-label="Entry link" onFocus={(event) => event.currentTarget.select()} />
            <button className="pill" type="button" onClick={() => void copy(entryUrl, "Link")}>Copy link</button>
          </>
        ) : null}
        {method === "code" ? (
          destination?.code
            ? <><span className="p2-join-code">{destination.code}</span><button className="pill" type="button" onClick={() => void copy(destination.code ?? "", "Code")}>Copy code</button><p>People enter this under “I have a join code”.</p></>
            : <p>Your personal circle uses your card link instead of a join code.</p>
        ) : null}
        {message ? <p className="p2-fine" role="status">{message}</p> : null}
      </div>
      <div className="card p2-payload">
        <b>What’s inside</b>
        <p>{destination?.code ? `Circle code ${destination.code}${persona && personaId !== "main" ? ` and persona reference ${personaRef(persona.id)}` : ""}` : "Your public card address"}. No answers, needs, phone or email. Opening it isn’t admission; the circle’s joining rules still apply.</p>
      </div>
      <p className="p1-demo-caption">Circle join links open the sample invitation in this preview. Your personal circle link is your real public card.</p>
    </>
  );
}

const CAPTURE_STATUS: Record<CaptureStatus, { label: string; tone: string; detail: string }> = {
  queued: { label: "Queued", tone: "wait", detail: "Waiting to send" },
  delivered: { label: "Delivered", tone: "info", detail: "Waiting for them to accept" },
  bounced: { label: "Bounced", tone: "bad", detail: "The email couldn’t be delivered" },
  accepted: { label: "Accepted", tone: "ok", detail: "They accepted and created their own account" },
};

export function ScanModeTabs({ mode, onMode }: { mode: "qr" | "card"; onMode: (mode: "qr" | "card") => void }) {
  return (
    <div className="p1-input-mode p2-scan-tabs" role="tablist" aria-label="What are you scanning?">
      <button type="button" role="tab" aria-selected={mode === "qr"} className={mode === "qr" ? "on" : ""} onClick={() => onMode("qr")}>Harmoni QR</button>
      <button type="button" role="tab" aria-selected={mode === "card"} className={mode === "card" ? "on" : ""} onClick={() => onMode("card")}>Business card</button>
    </div>
  );
}

export function CardInvitesScreen({
  captures,
  circleName,
  onCapture,
  onRetry,
  onRemove,
}: {
  captures: CapturedCard[];
  circleName: (id: string | null) => string;
  onCapture: () => void;
  onRetry: (id: string, email: string) => void;
  onRemove: (id: string) => void;
}) {
  const [fixId, setFixId] = useState<string | null>(null);
  const [fixEmail, setFixEmail] = useState("");
  const [removeId, setRemoveId] = useState<string | null>(null);
  return (
    <>
      <h1 className="scan-title">Capture a <i>card</i></h1>
      <p>Photograph a paper business card or type it in, check the details, then invite the person by email.</p>
      <div className="vf p2-card-frame" aria-hidden="true"><i /><i /><i /><i /><div className="p2-paper-card"><b /><span /><span /></div></div>
      <button className="btn" type="button" onClick={onCapture}>Capture a business card</button>
      <h2>Invitations you’ve sent <span className="tag">{captures.length}</span></h2>
      <p className="p2-fine">Only you can see these. Until someone accepts, their details stay a private pending record, not a profile.</p>
      {captures.map((capture) => {
        const status = CAPTURE_STATUS[capture.status];
        return (
          <div className="card p2-capture" key={capture.id}>
            <div className="p2-listing-head">
              <span className="p2-circle-mark">{capture.name[0]?.toUpperCase()}</span>
              <span className="p2-circle-copy"><b>{capture.name}</b><small>{[capture.title, capture.company].filter(Boolean).join(" · ") || capture.email}</small></span>
              <span className={`p2-status ${status.tone}`}>{status.label}</span>
            </div>
            <div className="tag">{status.detail} · {circleName(capture.circleId)} · {capture.capturedAt}{capture.attempts > 1 ? ` · attempt ${capture.attempts}` : ""}</div>
            {capture.status === "bounced" ? (
              fixId === capture.id ? (
                <div className="p2-fix">
                  <input type="email" value={fixEmail} onChange={(event) => setFixEmail(event.target.value)} aria-label={`Correct email for ${capture.name}`} />
                  <div className="p2-inline-row"><button className="pill on" type="button" disabled={!/^\S+@\S+\.\S+$/.test(fixEmail)} onClick={() => { onRetry(capture.id, fixEmail.trim()); setFixId(null); }}>Retry with this email</button><button className="pill" type="button" onClick={() => setFixId(null)}>Cancel</button></div>
                </div>
              ) : <div className="p2-inline-row"><button className="pill" type="button" onClick={() => { setFixId(capture.id); setFixEmail(capture.email); }}>Correct email and retry</button></div>
            ) : null}
            {capture.status !== "accepted" ? (
              removeId === capture.id
                ? <div className="p2-inline-row"><button className="pill p2-danger" type="button" onClick={() => { onRemove(capture.id); setRemoveId(null); }}>Delete record</button><button className="pill" type="button" onClick={() => setRemoveId(null)}>Keep</button></div>
                : <button className="lk p2-inline-link" type="button" onClick={() => setRemoveId(capture.id)}>Delete this pending record</button>
            ) : null}
          </div>
        );
      })}
      {!captures.length ? <div className="card p1-empty-state"><h2>No captured cards yet</h2><p>Cards you capture and invite will show their delivery status here.</p></div> : null}
      <p className="p1-demo-caption">Business-card capture is a UI preview. No text is read from photos and no email is sent.</p>
    </>
  );
}

type CaptureFields = { name: string; title: string; company: string; email: string; phone: string };
const EMPTY_FIELDS: CaptureFields = { name: "", title: "", company: "", email: "", phone: "" };
const SAMPLE_DETECTED: CaptureFields = { name: "Jordan Lee", title: "Design Director", company: "Brightside Studio", email: "jordan@brightside.example", phone: "+91 98111 22334" };

export function CardCaptureScreen({
  senderName,
  destinations,
  findDuplicate,
  onSave,
  onBack,
  onDone,
}: {
  senderName: string;
  destinations: EntryDestination[];
  findDuplicate: (name: string, email: string) => CapturedCard | undefined;
  onSave: (fields: CaptureFields & { circleId: string | null; source: "camera" | "manual" }, replaceId?: string) => void;
  onBack: () => void;
  onDone: () => void;
}) {
  const [step, setStep] = useState<"capture" | "review" | "circle" | "authorize" | "sent">("capture");
  const [fields, setFields] = useState<CaptureFields>(EMPTY_FIELDS);
  const [source, setSource] = useState<"camera" | "manual">("manual");
  const [photo, setPhoto] = useState("");
  const [circleId, setCircleId] = useState<string>(destinations[0]?.id ?? "none");
  const [duplicateChoice, setDuplicateChoice] = useState<"update" | "both" | null>(null);
  const [authorized, setAuthorized] = useState(false);
  const photoRef = useRef("");
  const duplicate = step === "review" || step === "circle" || step === "authorize" ? findDuplicate(fields.name, fields.email) : undefined;
  const validEmail = /^\S+@\S+\.\S+$/.test(fields.email.trim());
  const circleLabel = circleId === "none" ? "Harmoni" : destinations.find((item) => item.id === circleId)?.name ?? "Harmoni";

  useEffect(() => () => {
    if (photoRef.current) URL.revokeObjectURL(photoRef.current);
  }, []);

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (photoRef.current) URL.revokeObjectURL(photoRef.current);
    photoRef.current = URL.createObjectURL(file);
    setPhoto(photoRef.current);
    setFields(SAMPLE_DETECTED);
    setSource("camera");
    setDuplicateChoice(null);
    setStep("review");
  }

  function restart() {
    setFields(EMPTY_FIELDS);
    setPhoto("");
    setAuthorized(false);
    setDuplicateChoice(null);
    setStep("capture");
  }

  const progress = { capture: 15, review: 40, circle: 62, authorize: 84, sent: 100 }[step];

  return (
    <>
      <div className="hd">
        <button className="bkb" type="button" onClick={step === "capture" || step === "sent" ? onBack : () => setStep(step === "review" ? "capture" : step === "circle" ? "review" : "circle")} aria-label="Back"><Icon name="back" /></button>
        <div className="pg"><i style={{ width: `${progress}%` }} /></div>
        <span className="tag">Business card</span>
      </div>

      {step === "capture" ? (
        <>
          <h1>Capture a<br /><i>business card.</i></h1>
          <p>Take a clear photo of the front, or type the details yourself.</p>
          <div className="vf p2-card-frame" aria-hidden="true"><i /><i /><i /><i /><div className="p2-paper-card"><b /><span /><span /></div></div>
          <label className="btn"><Icon name="camera" size={20} /> Photograph the card<input hidden type="file" accept="image/*" capture="environment" onChange={choosePhoto} /></label>
          <button className="lk" type="button" onClick={() => { setFields(EMPTY_FIELDS); setSource("manual"); setPhoto(""); setStep("review"); }}>Enter details manually</button>
          <p className="p2-fine">The photo stays on this device for this step and is discarded afterwards.</p>
        </>
      ) : null}

      {step === "review" ? (
        <>
          <h1>Check the<br /><i>details.</i></h1>
          {photo ? (
            // A local object URL preview of the photographed card.
            // eslint-disable-next-line @next/next/no-img-element
            <img className="p2-capture-photo" src={photo} alt="Photographed business card" />
          ) : null}
          {source === "camera" ? <div className="card p1-static-notice"><b>Sample details shown</b><p>Text reading isn’t connected yet, so these are example values. Correct every field before inviting.</p></div> : null}
          {([["name", "Full name", "text"], ["title", "Job title", "text"], ["company", "Company", "text"], ["email", "Email", "email"], ["phone", "Phone", "tel"]] as const).map(([key, label, type]) => (
            <label className="f" key={key}><span>{label}{key === "name" || key === "email" ? " *" : ""}</span><input type={type} value={fields[key]} onChange={(event) => { setFields((current) => ({ ...current, [key]: event.target.value })); setDuplicateChoice(null); }} /></label>
          ))}
          {duplicate ? (
            <div className="card p2-warning">
              <b>You may already have {duplicate.name}</b>
              <p>Captured {duplicate.capturedAt} · {CAPTURE_STATUS[duplicate.status].label}. Update that record instead of creating a second invitation?</p>
              <div className="p2-inline-row">
                <button className={`pill${duplicateChoice === "update" ? " on" : ""}`} type="button" onClick={() => setDuplicateChoice("update")}>Update existing</button>
                <button className={`pill${duplicateChoice === "both" ? " on" : ""}`} type="button" onClick={() => setDuplicateChoice("both")}>They’re different people</button>
              </div>
            </div>
          ) : null}
          {duplicate?.status === "accepted" && duplicateChoice === "update" ? <p className="p2-fine">{duplicate.name} already accepted, so no new invitation is needed.</p> : null}
          <div className="p2-footer-space" />
          <div className="ft"><button className="btn" type="button" disabled={!fields.name.trim() || !validEmail || (duplicate !== undefined && duplicateChoice === null) || (duplicate?.status === "accepted" && duplicateChoice === "update")} onClick={() => setStep("circle")}>Continue</button></div>
        </>
      ) : null}

      {step === "circle" ? (
        <>
          <h1>Invite them<br /><i>to which circle?</i></h1>
          <p>The invitation names this circle. Its joining rules still apply when they accept.</p>
          <div className="p1-visibility-list">
            {[...destinations.map((item) => ({ id: item.id, name: item.name, detail: "They’ll be invited to this circle" })), { id: "none", name: "Just Harmoni", detail: "Invite them without a circle" }].map((option) => (
              <button type="button" key={option.id} className={`p1-visibility-option${circleId === option.id ? " selected" : ""}`} onClick={() => setCircleId(option.id)} aria-pressed={circleId === option.id}>
                <span className="p1-radio" aria-hidden="true">{circleId === option.id ? "✓" : ""}</span>
                <span><b>{option.name}</b><small>{option.detail}</small></span>
              </button>
            ))}
          </div>
          <div className="p2-footer-space" />
          <div className="ft"><button className="btn" type="button" onClick={() => setStep("authorize")}>Continue</button></div>
        </>
      ) : null}

      {step === "authorize" ? (
        <>
          <h1>Send one<br /><i>invitation.</i></h1>
          <div className="card p2-email-preview">
            <small>To: {fields.email}</small>
            <b>{senderName || "A Harmoni member"} invited you to {circleLabel}</b>
            <pre>{`Hi ${fields.name.split(" ")[0]},\n\nIt was good to meet you. I'd like to invite you to ${circleLabel} on Harmoni.\n\nOpen the invitation to see the circle and decide whether to join.`}</pre>
          </div>
          <div className="card p1-static-notice"><b>Their details stay private</b><p>Until {fields.name.split(" ")[0]} accepts, this stays a pending record only you can see. It isn’t a profile, and they aren’t added to any circle.</p></div>
          <label className="p1-adult-check p2-authorize"><input type="checkbox" checked={authorized} onChange={(event) => setAuthorized(event.target.checked)} /><span>I met {fields.name || "this person"} and have their permission to send this one email invitation.</span></label>
          <div className="ft"><button className="btn" type="button" disabled={!authorized} onClick={() => {
            onSave({ ...fields, circleId: circleId === "none" ? null : circleId, source }, duplicateChoice === "update" ? duplicate?.id : undefined);
            if (photoRef.current) URL.revokeObjectURL(photoRef.current);
            photoRef.current = "";
            setPhoto("");
            setStep("sent");
          }}>Send invitation</button></div>
        </>
      ) : null}

      {step === "sent" ? (
        <>
          <div className="p1-shield"><Icon name="email" size={28} /></div>
          <h1 className="p2-center">Invitation <i>queued.</i></h1>
          <p className="c">We’ll show delivery status under Scan → Business card. Retrying uses the same record, so {fields.name.split(" ")[0]} won’t get duplicates.</p>
          <p className="p2-fine c">Demo only: no email is sent.</p>
          <button className="lk p2-bottom-space" type="button" onClick={restart}>Capture another card</button>
          <div className="ft"><button className="btn" type="button" onClick={onDone}>Done</button></div>
        </>
      ) : null}
    </>
  );
}

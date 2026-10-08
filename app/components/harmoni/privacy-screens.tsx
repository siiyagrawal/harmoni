import { useState } from "react";
import type { PersonaPreview } from "./types";
import { Icon } from "./ui";

const TEMPORARY = [
  ["Typed and spoken answers", "Cleared after each persona update"],
  ["Self-dossier source pages", "Cleared when research finishes, fails or is cancelled"],
  ["Dossier review draft", "Cleared when you approve, reject or leave"],
  ["Business-card photos", "Discarded after you check the details"],
] as const;

const RETAINED = [
  ["Your personas", "The approved details you chose, kept separately per persona"],
  ["Card and public fields", "What you chose to show on each card"],
  ["Circles and consents", "Memberships, sharing choices and connection permissions"],
  ["Requests and connections", "Interest, introductions and their outcomes"],
  ["Messages", "Kept 90 days (proposed), then deleted"],
  ["Alert status", "What was sent and whether it was delivered"],
] as const;

export function PrivacyScreen({
  personas,
  onBack,
  onEditPersona,
  onDeletePersona,
  onAccessLog,
  onDeleteAccount,
}: {
  personas: PersonaPreview[];
  onBack: () => void;
  onEditPersona: (persona: PersonaPreview) => void;
  onDeletePersona: (id: string) => void;
  onAccessLog: () => void;
  onDeleteAccount: () => void;
}) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [exportState, setExportState] = useState<"idle" | "requested">("idle");

  return (
    <>
      <div className="hd">
        <button className="bkb" type="button" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
        <span className="tag">Your data</span>
      </div>
      <h1>Your data and<br /><i>privacy.</i></h1>
      <p>What Harmoni keeps, what it clears, and how to correct or delete it.</p>

      <h2 className="p1-section-title">Temporary, then cleared</h2>
      <div className="lst p4-list">
        {TEMPORARY.map(([title, detail]) => (
          <div className="ct p4-delivery" key={title}>
            <div className="m"><b>{title}</b><div className="tag">{detail}</div></div>
            <span className="p2-status ok">Nothing waiting</span>
          </div>
        ))}
      </div>
      <p className="p2-fine">Temporary copies are kept out of logs, analytics and backups.</p>

      <h2 className="p1-section-title">Kept until you change or delete it</h2>
      <div className="lst p4-list">
        {RETAINED.map(([title, detail]) => <div className="ct p4-delivery" key={title}><div className="m"><b>{title}</b><div className="tag">{detail}</div></div></div>)}
      </div>
      <p className="p2-fine">Your persona is stored as protected, derived details, not a transcript. It’s still personal information, and you control it.</p>

      <h2 className="p1-section-title">Correct or delete a persona</h2>
      {personas.map((persona) => (
        <div className="card p5-admin-card" key={persona.id}>
          <div className="p2-listing-head">
            <span className="p1-persona-mark">{persona.name[0]?.toUpperCase()}</span>
            <span className="p2-circle-copy"><b>{persona.name}</b><small>{persona.type} persona</small></span>
          </div>
          {deleteId === persona.id ? (
            <>
              <p className="p2-fine">Deleting {persona.name} removes its details and rebuilds your matches without it. Requests made as {persona.name} close. Your other personas aren’t affected.</p>
              <div className="p2-inline-row"><button className="pill p2-danger" type="button" onClick={() => { onDeletePersona(persona.id); setDeleteId(null); }}>Delete {persona.name}</button><button className="pill" type="button" onClick={() => setDeleteId(null)}>Keep it</button></div>
            </>
          ) : (
            <div className="p2-inline-row"><button className="pill" type="button" onClick={() => onEditPersona(persona)}>Correct details</button><button className="pill" type="button" onClick={() => setDeleteId(persona.id)}>Delete</button></div>
          )}
        </div>
      ))}
      {!personas.length ? <p className="p2-fine">You haven’t created any personas in this session.</p> : null}

      <h2 className="p1-section-title">Access and copies</h2>
      <div className="lst p4-list">
        <button className="p4-row" type="button" onClick={onAccessLog}>
          <span className="p4-icon"><Icon name="check" size={18} /></span>
          <span className="p4-copy"><b>Who has seen my context</b><small>See who used approved details, and revoke access</small></span>
          <Icon name="chevron" size={17} />
        </button>
        <button className="p4-row" type="button" onClick={() => setExportState("requested")} disabled={exportState === "requested"}>
          <span className="p4-icon"><Icon name="email" size={18} /></span>
          <span className="p4-copy"><b>Get a copy of my data</b><small>{exportState === "requested" ? "Requested. We’ll notify you when it’s ready (demo only)." : "Personas, cards, circles, requests and messages"}</small></span>
          {exportState === "requested" ? <span className="p2-status wait">Preparing</span> : <Icon name="chevron" size={17} />}
        </button>
      </div>

      <h2 className="p1-section-title">Account recovery</h2>
      <p className="p2-fine">If you lose access, use “Forgot password?” on the sign-in screen. Signing out ends this device’s session and stops live updates here.</p>

      <div className="card p2-warning p6-delete">
        <b>Delete your account</b>
        <p>Deletes your account, cards, personas, uploaded images and contacts. Message history follows the retention policy. This can’t be undone.</p>
        <button className="btn g s delete-account-confirm" type="button" onClick={onDeleteAccount}>Delete my account</button>
      </div>
      <p className="p1-demo-caption p2-bottom-space">Temporary-data status and copy requests are illustrative in this preview. Account deletion and the access log are live.</p>
    </>
  );
}

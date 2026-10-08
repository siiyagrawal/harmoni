import { useEffect, useState } from "react";
import type { AdminDemo } from "./impact-data";

type ProviderState = "operational" | "degraded";

const HANDOVER_ITEMS = [
  "Code in the company-owned repository",
  "Production and provider access transferred",
  "Architecture and runbook documentation",
  "Automated test suite running in CI",
  "Support ownership and escalation contacts",
  "Rollback and restore procedure rehearsed",
];

// M20 reliability and handover: provider health, restore drills, rollback and the handover checklist.
export function OperationsPanel({ admin, onToast }: { admin: AdminDemo; onToast: (message: string) => void }) {
  const [email, setEmail] = useState<ProviderState>("operational");
  const [drill, setDrill] = useState<"idle" | "running" | "passed">("idle");
  const [release, setRelease] = useState({ current: "v0.9.3", previous: "v0.9.2" });
  const [confirmRollback, setConfirmRollback] = useState(false);
  const [handover, setHandover] = useState<string[]>([HANDOVER_ITEMS[0], HANDOVER_ITEMS[3], HANDOVER_ITEMS[5]]);

  useEffect(() => {
    if (drill !== "running") return;
    const timeout = window.setTimeout(() => {
      setDrill("passed");
      admin.log("Ran restore drill", "Staging copy of production", "Restored retained records only; temporary copies aren’t in backups");
    }, 1500);
    return () => window.clearTimeout(timeout);
  // admin.log is stable for the life of the panel.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drill]);

  const providers: Array<[string, ProviderState, string]> = [
    ["AI processing", "operational", "Per-account usage caps active"],
    ["Email delivery", email, email === "degraded" ? "Provider errors: alerts are queued and retried with backoff; in-app updates unaffected" : "Accepting messages normally"],
    ["Web push", "operational", "Invalid subscriptions removed automatically"],
    ["Database", "operational", "Nightly encrypted backup at 02:00"],
  ];

  return (
    <>
      <h2 className="p1-section-title">Service health</h2>
      <div className="lst p4-list">
        {providers.map(([name, state, detail]) => (
          <div className="ct p4-delivery" key={name}>
            <div className="m"><b>{name}</b><div className="tag">{detail}</div></div>
            <span className={`p2-status ${state === "operational" ? "ok" : "wait"}`}>{state === "operational" ? "Operational" : "Degraded"}</span>
          </div>
        ))}
      </div>
      <button className="pill p6-inline-pill" type="button" onClick={() => {
        const next = email === "operational" ? "degraded" : "operational";
        setEmail(next);
        admin.log(next === "degraded" ? "Simulated email outage" : "Cleared email outage", "Email delivery", "Demo failover check");
        onToast(next === "degraded" ? "Email alerts are now queued for retry." : "Email delivery restored; queued alerts send in order.");
      }}>{email === "operational" ? "Simulate email outage" : "Clear outage"}</button>

      <h2 className="p1-section-title">Backups and restore</h2>
      <div className="card p5-admin-card">
        <b>Last restore drill: {drill === "passed" ? "today · passed in 14 min" : "Oct 1 · passed in 16 min"}</b>
        <p className="p2-fine">Restores bring back retained records only. Temporary copies are never backed up, and deleted accounts stay deleted after a restore.</p>
        <button className="btn g s" type="button" disabled={drill === "running"} onClick={() => setDrill("running")}>{drill === "running" ? "Restoring to staging…" : "Run a restore drill"}</button>
      </div>

      <h2 className="p1-section-title">Deployments</h2>
      <div className="card p5-admin-card">
        <div className="p2-listing-head"><span className="p2-circle-copy"><b>{release.current}</b><small>Live · previous {release.previous}</small></span><span className="p2-status ok">Healthy</span></div>
        {confirmRollback ? (
          <>
            <p className="p2-fine">Rolling back redeploys {release.previous}. Data stays in place; features added in {release.current} turn off.</p>
            <div className="p2-inline-row">
              <button className="pill p2-danger" type="button" onClick={() => {
                admin.log("Rolled back deployment", release.current, `Restored ${release.previous}`);
                setRelease({ current: release.previous, previous: release.current });
                setConfirmRollback(false);
                onToast(`Rolled back to ${release.previous}. Demo only.`);
              }}>Roll back now</button>
              <button className="pill" type="button" onClick={() => setConfirmRollback(false)}>Cancel</button>
            </div>
          </>
        ) : <div className="p2-inline-row"><button className="pill" type="button" onClick={() => setConfirmRollback(true)}>Roll back to {release.previous}</button></div>}
      </div>

      <h2 className="p1-section-title">Data safety checks</h2>
      <div className="card p2-check-list">
        <div><span aria-hidden="true">✓</span><span>Persona isolation: no cross-persona reads in the last test run</span></div>
        <div><span aria-hidden="true">✓</span><span>Access revocation takes effect within 3 seconds (p95)</span></div>
        <div><span aria-hidden="true">✓</span><span>Temporary copies older than their timeout: 0</span></div>
        <div><span aria-hidden="true">✓</span><span>Correction and deletion rebuild derived matches</span></div>
      </div>

      <h2 className="p1-section-title">Handover checklist</h2>
      <div className="card p1-public-preview">
        {HANDOVER_ITEMS.map((item) => (
          <label className="p1-check-row" key={item}>
            <input type="checkbox" checked={handover.includes(item)} onChange={() => setHandover((current) => current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item])} />
            <span>{item}</span>
          </label>
        ))}
      </div>
      <p className="p2-fine">{handover.length} of {HANDOVER_ITEMS.length} handover items complete.</p>
    </>
  );
}

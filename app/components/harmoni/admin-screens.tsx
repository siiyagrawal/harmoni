import { useState } from "react";
import type { CircleDemo } from "./circle-data";
import type { AdminDemo, AdminUser } from "./impact-data";
import { FunnelChart, StatTiles, Suggestions } from "./analytics-ui";
import { Avatar, Icon } from "./ui";
import { Select, plainOptions } from "./select";
import { OperationsPanel } from "./operations-panel";

// Reason-gated action: every admin decision records why, and lands in the audit log.
function ReasonAction({ label, confirm, danger, onConfirm }: { label: string; confirm: string; danger?: boolean; onConfirm: (reason: string) => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  if (!open) return <button className={`pill${danger ? " p2-danger" : ""}`} type="button" onClick={() => setOpen(true)}>{label}</button>;
  return (
    <div className="p5-reason">
      <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason (recorded in the audit log)" aria-label={`Reason to ${label.toLowerCase()}`} maxLength={160} />
      <div className="p2-inline-row">
        <button className={`pill on${danger ? " p2-danger" : ""}`} type="button" disabled={reason.trim().length < 5} onClick={() => { onConfirm(reason.trim()); setOpen(false); setReason(""); }}>{confirm}</button>
        <button className="pill" type="button" onClick={() => { setOpen(false); setReason(""); }}>Cancel</button>
      </div>
    </div>
  );
}

const STATUS_TONE: Record<string, string> = { active: "ok", open: "wait", suspended: "bad", "removal-review": "wait", dismissed: "muted", warned: "info", requested: "wait", revoked: "muted" };
const STATUS_LABEL: Record<string, string> = { active: "Active", open: "Open", suspended: "Suspended", "removal-review": "Removal under review", dismissed: "Dismissed", warned: "Warned", requested: "Requested", revoked: "Revoked" };

export function AdminScreen({ admin, circleDemo, onBack, onToast }: { admin: AdminDemo; circleDemo: CircleDemo; onBack: () => void; onToast: (message: string) => void }) {
  const [query, setQuery] = useState("");
  const [openUser, setOpenUser] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState("");
  const [notice, setNotice] = useState({ audience: "All users", channel: "In-app", text: "" });
  const [leads, setLeads] = useState<Record<string, string>>({});
  const { tab, setTab } = admin;
  const hubs = circleDemo.circles.filter((circle) => circle.kind === "hub");
  const openReports = admin.reports.filter((report) => report.status === "open").length;
  const users = admin.users.filter((user) => `${user.name} ${user.email}`.toLowerCase().includes(query.toLowerCase()));
  const tabs: Array<[typeof tab, string]> = [
    ["overview", "Overview"],
    ["hubs", `Hubs${hubs.some((hub) => hub.hubStatus === "requested") ? " · new" : ""}`],
    ["reports", `Reports${openReports ? ` · ${openReports}` : ""}`],
    ["users", "Users"],
    ["circles", "Circles"],
    ["notices", "Notices"],
    ["operations", "Operations"],
    ["audit", "Audit"],
  ];

  return (
    <>
      <div className="hd">
        <button className="bkb" type="button" onClick={onBack} aria-label="Back"><Icon name="back" /></button>
        <span className="tag">Platform admin</span>
      </div>
      <h1>Harmoni <i>admin</i></h1>
      <div className="card p1-static-notice"><b>Role: Platform Super Admin (demo)</b><p>Operational tools only. Private personas, dossier drafts and messages can’t be browsed from here; reports show only what the reporter submitted.</p></div>
      <div className="p2-tabs" role="tablist" aria-label="Admin sections">
        {tabs.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={`pill${tab === id ? " on" : ""}`} onClick={() => setTab(id)}>{label}</button>)}
      </div>

      {tab === "overview" ? (
        <>
          <StatTiles tiles={[
            { label: "Active users", value: "1,284", detail: "+96 this week" },
            { label: "Circles", value: "142", detail: "11 hubs" },
            { label: "Confirmed help", value: "211", detail: "of 690 offers" },
          ]} />
          <FunnelChart title="Entry · last 30 days" steps={[
            { label: "QR, NFC, link and code opens", value: 5420 },
            { label: "Answered the first question", value: 2310 },
            { label: "Verified an account", value: 1190 },
            { label: "Joined a circle", value: 870 },
          ]} note="Deduplicated by browser and account where possible." />
          <FunnelChart title="Connections · last 30 days" steps={[
            { label: "Interest and introduction requests", value: 640 },
            { label: "Approved", value: 402 },
            { label: "First message sent", value: 351 },
            { label: "Confirmed useful", value: 118 },
          ]} />
          <h2 className="p1-section-title">Alerts and delivery</h2>
          <StatTiles tiles={[
            { label: "Queue time (p95)", value: "42s", detail: "proposed target ≤ 60s" },
            { label: "Email accepted", value: "98.6%", detail: "by provider, not seen" },
            { label: "Push failures", value: "3.1%", detail: "expired subscriptions removed" },
          ]} />
          <div className="lst p4-list">
            {[
              ["Email bounced · suppressed", "14 addresses stopped after a permanent bounce"],
              ["Push subscription invalid", "37 removed; email used as fallback"],
              ["Final delivery failure", "6 alerts after 5 retries; provider outage Oct 6, 14:10–14:40"],
            ].map(([title, detail]) => <div className="ct p4-delivery" key={title}><div className="m"><b>{title}</b><div className="tag">{detail}</div></div></div>)}
          </div>
          <h2 className="p1-section-title">Service cost · this month</h2>
          <table className="p5-table card">
            <thead><tr><th scope="col">Service</th><th scope="col">Cost</th><th scope="col">Limit</th></tr></thead>
            <tbody>
              <tr><th scope="row">AI processing</th><td>$412</td><td>$600</td></tr>
              <tr><th scope="row">Email delivery</th><td>$38</td><td>$100</td></tr>
              <tr><th scope="row">Hosting and database</th><td>$120</td><td>$200</td></tr>
            </tbody>
          </table>
          <Suggestions items={[
            { title: "Half of visitors leave before the first answer.", detail: "Test shorter invitation copy on the busiest circles." },
            { title: "Host review adds 1.4 days.", detail: "Nudge hosts with pending introductions after 24 hours." },
          ]} />
        </>
      ) : null}

      {tab === "hubs" ? (
        <>
          <p className="p2-fine">Hub applications arrive by email. Record the decision here and appoint the Hub’s lead. Hub roles never grant Harmoni-wide access.</p>
          {hubs.map((hub) => (
            <div className="card p5-admin-card" key={hub.id}>
              <div className="p2-listing-head">
                <span className="p2-circle-mark"><Icon name="hub" size={20} /></span>
                <span className="p2-circle-copy"><b>{hub.name}</b><small>Applicant: {hub.host}{hub.hubLead ? ` · Lead: ${hub.hubLead}` : ""}</small></span>
                <span className={`p2-status ${STATUS_TONE[hub.hubStatus ?? "requested"]}`}>{STATUS_LABEL[hub.hubStatus ?? "requested"]}</span>
              </div>
              <p className="p3-note">{hub.purpose}</p>
              {hub.hubStatus === "requested" ? (
                <>
                  <label className="f p5-lead"><span>Appoint Hub Super Admin</span><input value={leads[hub.id] ?? hub.host} onChange={(event) => setLeads((current) => ({ ...current, [hub.id]: event.target.value }))} /></label>
                  <div className="p2-inline-row">
                    <ReasonAction label="Enable Hub" confirm="Enable and appoint" onConfirm={(reason) => {
                      const lead = (leads[hub.id] ?? hub.host).trim() || hub.host;
                      circleDemo.setHubStatus(hub.id, "active", lead);
                      admin.log("Activated Hub", hub.name, `${reason}; lead: ${lead}`);
                      onToast(`${hub.name} is enabled.`);
                    }} />
                    <ReasonAction label="Decline" confirm="Decline application" danger onConfirm={(reason) => {
                      circleDemo.setHubStatus(hub.id, "revoked");
                      admin.log("Declined Hub application", hub.name, reason);
                    }} />
                  </div>
                </>
              ) : hub.hubStatus === "active" ? (
                <ReasonAction label="Revoke Hub" confirm="Revoke now" danger onConfirm={(reason) => {
                  circleDemo.setHubStatus(hub.id, "revoked");
                  admin.log("Revoked Hub", hub.name, reason);
                  onToast("Hub revoked. Hub roles and routes stop working immediately.");
                }} />
              ) : (
                <ReasonAction label="Re-enable" confirm="Re-enable Hub" onConfirm={(reason) => {
                  circleDemo.setHubStatus(hub.id, "active");
                  admin.log("Re-enabled Hub", hub.name, reason);
                }} />
              )}
            </div>
          ))}
        </>
      ) : null}

      {tab === "reports" ? (
        <>
          <p className="p2-fine">Evidence is limited to what the reporter submitted. Wider access to conversations needs an approved policy (D3).</p>
          {admin.reports.map((report) => (
            <div className="card p5-admin-card" key={report.id}>
              <div className="p2-listing-head">
                <span className="p2-circle-copy"><b>{report.kind}: {report.subject}</b><small>{report.reason} · {report.at}</small></span>
                <span className={`p2-status ${STATUS_TONE[report.status]}`}>{STATUS_LABEL[report.status]}</span>
              </div>
              <div className="p5-evidence"><small>Reporter-submitted</small>{report.evidence}</div>
              {report.status === "open" ? (
                <div className="p2-inline-row">
                  <ReasonAction label="Dismiss" confirm="Dismiss report" onConfirm={(reason) => admin.resolveReport(report.id, "dismissed", reason)} />
                  <ReasonAction label="Warn" confirm="Send warning" onConfirm={(reason) => admin.resolveReport(report.id, "warned", reason)} />
                  <ReasonAction label="Suspend" confirm="Suspend" danger onConfirm={(reason) => { admin.resolveReport(report.id, "suspended", reason); onToast(`${report.subject} suspended.`); }} />
                </div>
              ) : null}
            </div>
          ))}
        </>
      ) : null}

      {tab === "users" ? (
        <>
          <div className="p2-search"><Icon name="search" size={18} /><input className="sr" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or email" aria-label="Search users" /></div>
          {users.map((user) => (
            <div className="card p5-admin-card" key={user.id}>
              <button className="p5-user-row" type="button" onClick={() => setOpenUser((current) => current === user.id ? null : user.id)} aria-expanded={openUser === user.id}>
                <Avatar name={user.name} size={38} />
                <span className="p2-circle-copy"><b>{user.name}</b><small>{user.role} · joined {user.joined}{user.reports ? ` · ${user.reports} reports` : ""}</small></span>
                <span className={`p2-status ${STATUS_TONE[user.status]}`}>{STATUS_LABEL[user.status]}</span>
              </button>
              {openUser === user.id ? (
                <div className="p5-user-detail">
                  <p className="p2-fine">Account details only: {user.email} · {user.circles} circles. Personas, dossier drafts and messages aren’t viewable here.</p>
                  <Select label="Role" value={user.role} onChange={(role) => admin.setUserRole(user.id, role)} options={plainOptions<AdminUser["role"]>(["Member", "Moderator", "Support", "Super Admin"])} />
                  <div className="p2-inline-row">
                    {user.status === "active" ? <ReasonAction label="Suspend" confirm="Suspend account" danger onConfirm={(reason) => admin.setUserStatus(user.id, "suspended", reason)} /> : <ReasonAction label="Restore" confirm="Restore account" onConfirm={(reason) => admin.setUserStatus(user.id, "active", reason)} />}
                    {user.status !== "removal-review" ? <ReasonAction label="Request removal" confirm="Send for review" danger onConfirm={(reason) => { admin.setUserStatus(user.id, "removal-review", reason); onToast("Removal needs a second admin to approve."); }} /> : null}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </>
      ) : null}

      {tab === "circles" ? (
        <>
          {admin.circles.map((circle) => (
            <div className="card p5-admin-card" key={circle.id}>
              <div className="p2-listing-head">
                <span className="p2-circle-copy"><b>{circle.name}</b><small>{circle.category} · host {circle.host} · {circle.members} members</small></span>
                <span className={`p2-status ${STATUS_TONE[circle.status]}`}>{STATUS_LABEL[circle.status]}</span>
              </div>
              <div className="p2-inline-row">
                {circle.status === "active"
                  ? <ReasonAction label="Suspend circle" confirm="Suspend" danger onConfirm={(reason) => admin.setCircleStatus(circle.id, "suspended", reason)} />
                  : <ReasonAction label="Restore" confirm="Restore circle" onConfirm={(reason) => admin.setCircleStatus(circle.id, "active", reason)} />}
              </div>
            </div>
          ))}
          <h2 className="p1-section-title">Categories</h2>
          <div className="card p5-admin-card">
            <div className="p1-invite-topics p5-categories">
              {admin.categories.map((category) => <span key={category}>{category}<button type="button" onClick={() => admin.archiveCategory(category)} aria-label={`Archive ${category}`}>×</button></span>)}
            </div>
            <div className="row p5-add-category">
              <input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="New category" maxLength={30} />
              <button className="pill" type="button" disabled={!newCategory.trim()} onClick={() => { admin.addCategory(newCategory); setNewCategory(""); }}>Add</button>
            </div>
          </div>
        </>
      ) : null}

      {tab === "notices" ? (
        <>
          <div className="card p5-admin-card">
            <b>Send an operational notice</b>
            <p className="p2-fine">Service and safety updates only, not marketing. Members’ alert preferences still apply.</p>
            <Select label="To" value={notice.audience} onChange={(audience) => setNotice((current) => ({ ...current, audience }))} options={plainOptions(["All users", "Circle hosts", "Hub admins", "Members of Valley Growers Co-op"])} />
            <Select label="Channel" value={notice.channel} onChange={(channel) => setNotice((current) => ({ ...current, channel }))} options={plainOptions(["In-app", "In-app and email"])} />
            <textarea className="p1-textarea p1-review-textarea" value={notice.text} onChange={(event) => setNotice((current) => ({ ...current, text: event.target.value }))} rows={3} maxLength={280} placeholder="Planned maintenance on Sunday 02:00–03:00 IST…" aria-label="Notice text" />
            <button className="btn s p5-send-notice" type="button" disabled={notice.text.trim().length < 10} onClick={() => { admin.sendNotice(notice.audience, notice.channel, notice.text); setNotice((current) => ({ ...current, text: "" })); onToast("Notice queued. Demo only: nothing is sent."); }}>Send notice</button>
          </div>
          {admin.notices.length ? <div className="lst p4-list">{admin.notices.map((item) => <div className="ct p4-delivery" key={item.id}><div className="m"><b>{item.text}</b><div className="tag">{item.audience} · {item.channel} · {item.at}</div></div></div>)}</div> : null}
        </>
      ) : null}

      {tab === "operations" ? <OperationsPanel admin={admin} onToast={onToast} /> : null}

      {tab === "audit" ? (
        <div className="lst p4-list">
          {admin.audit.map((entry) => (
            <div className="ct p4-delivery" key={entry.id}>
              <div className="m"><b>{entry.action} · {entry.target}</b><div className="tag">{entry.actor} · {entry.at} · {entry.reason}</div></div>
            </div>
          ))}
        </div>
      ) : null}
      <p className="p1-demo-caption p2-bottom-space">Sample platform data for this preview. In production this console is limited to Harmoni staff roles.</p>
    </>
  );
}

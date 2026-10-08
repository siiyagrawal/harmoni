import { useRef, useState } from "react";

// Phase 5 recognition, insights and admin screens run on this static sample state.

export type FeedbackOutcome = "useful" | "somewhat" | "not-useful" | "no-connection" | "not-yet" | "skip";
export type FeedbackRequest = {
  id: string;
  counterpartId: string;
  counterpart: string;
  circleId: string;
  context: string;
  status: "awaiting" | "answered";
  outcome?: FeedbackOutcome;
  publicThanks?: boolean;
  note?: string;
};

export type Contribution = {
  id: string;
  helpedId: string;
  helped: string;
  circleId: string;
  context: string;
  status: "confirmed" | "unknown" | "not-useful" | "duplicate" | "under-review";
  thanks?: string;
  at: string;
};

export type TopContributor = { name: string; confirmed: number };

const SAMPLE_FEEDBACK: FeedbackRequest[] = [
  { id: "fb-daniel", counterpartId: "daniel", counterpart: "Daniel Kim", circleId: "sunday-builders", context: "Help with your commercial lease clause", status: "awaiting" },
  { id: "fb-neha", counterpartId: "neha", counterpart: "Neha Kapoor", circleId: "sunday-builders", context: "Spotlight: testing the onboarding flow", status: "awaiting" },
];

const SAMPLE_CONTRIBUTIONS: Contribution[] = [
  { id: "c1", helpedId: "aarav", helped: "Aarav Shah", circleId: "sunday-builders", context: "Reviewed the pricing page", status: "confirmed", thanks: "Saved me a week of guesswork on the tiers.", at: "Oct 3" },
  { id: "c2", helpedId: "aarav", helped: "Aarav Shah", circleId: "sunday-builders", context: "Reviewed the pricing page", status: "duplicate", at: "Oct 3" },
  { id: "c3", helpedId: "sunita", helped: "Sunita Pawar", circleId: "valley-growers", context: "Lent a tractor for harvest", status: "confirmed", at: "Sep 26" },
  { id: "c4", helpedId: "mohan", helped: "Mohan Jadhav", circleId: "valley-growers", context: "Drip irrigation advice (Spotlight)", status: "unknown", at: "Oct 6" },
  { id: "c5", helpedId: "lina", helped: "Lina Ortiz", circleId: "sunday-builders", context: "Landing page feedback", status: "not-useful", at: "Sep 18" },
  { id: "c6", helpedId: "tom", helped: "Tom Becker", circleId: "sunday-builders", context: "Four confirmations from the same person in one day", status: "under-review", at: "Sep 12" },
];

export const TOP_CONTRIBUTORS: Record<string, TopContributor[]> = {
  "sunday-builders": [{ name: "Aarav Shah", confirmed: 4 }, { name: "You", confirmed: 1 }, { name: "Meera Das", confirmed: 1 }],
  "valley-growers": [{ name: "Ravi Patil", confirmed: 9 }, { name: "Sunita Pawar", confirmed: 5 }, { name: "You", confirmed: 1 }],
};

export function useImpactDemo() {
  const [feedback, setFeedback] = useState<FeedbackRequest[]>(SAMPLE_FEEDBACK);
  const [contributions] = useState<Contribution[]>(SAMPLE_CONTRIBUTIONS);
  const [creditedPairs, setCreditedPairs] = useState<string[]>([]);

  // A useful answer credits the helper once per person and context; repeats are recorded but not counted.
  function answer(id: string, outcome: FeedbackOutcome, publicThanks: boolean, note: string) {
    const request = feedback.find((item) => item.id === id);
    if (!request) return "missing" as const;
    const key = `${request.counterpartId}:${request.context}`;
    const duplicate = creditedPairs.includes(key);
    setFeedback((current) => current.map((item) => item.id === id ? { ...item, status: "answered", outcome, publicThanks, note: note.trim() } : item));
    if (outcome === "useful" || outcome === "somewhat") {
      if (duplicate) return "duplicate" as const;
      setCreditedPairs((current) => [...current, key]);
      return "credited" as const;
    }
    return outcome === "not-yet" ? "later" as const : "recorded" as const;
  }

  const confirmedPeople = new Set(contributions.filter((item) => item.status === "confirmed").map((item) => item.helpedId));
  return { feedback, contributions, answer, confirmedPeople: confirmedPeople.size };
}

export type ImpactDemo = ReturnType<typeof useImpactDemo>;

export type AdminUser = { id: string; name: string; email: string; joined: string; circles: number; reports: number; status: "active" | "suspended" | "removal-review"; role: "Member" | "Moderator" | "Support" | "Super Admin" };
export type AdminReport = { id: string; kind: "Message" | "Profile" | "Circle"; subject: string; subjectId: string; reason: string; evidence: string; at: string; status: "open" | "dismissed" | "warned" | "suspended" };
export type AdminCircle = { id: string; name: string; host: string; category: string; members: number; status: "active" | "suspended" };
export type AuditEntry = { id: string; at: string; actor: string; action: string; target: string; reason: string };
export type SentNotice = { id: string; audience: string; channel: string; text: string; at: string };

const SAMPLE_USERS: AdminUser[] = [
  { id: "u1", name: "Aarav Shah", email: "aarav@…", joined: "Aug 14", circles: 3, reports: 0, status: "active", role: "Member" },
  { id: "u2", name: "Tom Becker", email: "tom@…", joined: "Sep 2", circles: 1, reports: 2, status: "active", role: "Member" },
  { id: "u3", name: "Priya Nair", email: "priya@…", joined: "Jul 30", circles: 2, reports: 0, status: "active", role: "Moderator" },
  { id: "u4", name: "Spam Account 17", email: "deals@…", joined: "Oct 7", circles: 0, reports: 5, status: "suspended", role: "Member" },
  { id: "u5", name: "Kavya Iyer", email: "kavya@…", joined: "Jun 11", circles: 4, reports: 0, status: "active", role: "Member" },
];

const SAMPLE_REPORTS: AdminReport[] = [
  { id: "r1", kind: "Message", subject: "Tom Becker", subjectId: "u2", reason: "Repeated pressure after a declined request", evidence: "Reporter submitted 2 messages: “Why won’t you accept? I’ll keep asking.”", at: "Today", status: "open" },
  { id: "r2", kind: "Profile", subject: "Spam Account 17", subjectId: "u4", reason: "Promotional links in persona", evidence: "Public card headline: “Cheap deals, click here”.", at: "Yesterday", status: "suspended" },
  { id: "r3", kind: "Circle", subject: "Quick Cash Circle", subjectId: "c-quick", reason: "Asks members to pay outside Harmoni", evidence: "Circle purpose text and fee terms as listed publicly.", at: "Oct 6", status: "open" },
];

const SAMPLE_CIRCLES: AdminCircle[] = [
  { id: "sunday-builders", name: "Sunday Builders", host: "Demo user", category: "Startups", members: 27, status: "active" },
  { id: "valley-growers", name: "Valley Growers Co-op", host: "Ravi Patil", category: "Agriculture", members: 112, status: "active" },
  { id: "legal-help", name: "Legal Help Network", host: "Anita Rao", category: "Legal", members: 74, status: "active" },
  { id: "c-quick", name: "Quick Cash Circle", host: "Unknown host", category: "Finance", members: 9, status: "active" },
];

const SAMPLE_AUDIT: AuditEntry[] = [
  { id: "a1", at: "Yesterday 16:20", actor: "Priya Nair (Moderator)", action: "Suspended user", target: "Spam Account 17", reason: "Promotional links reported by 5 members" },
  { id: "a2", at: "Oct 2 11:05", actor: "Platform Super Admin", action: "Activated Hub", target: "Community Health Hub", reason: "Application approved by email; lead: Dr. Kavya Iyer" },
];

export function useAdminDemo() {
  const [users, setUsers] = useState<AdminUser[]>(SAMPLE_USERS);
  const [reports, setReports] = useState<AdminReport[]>(SAMPLE_REPORTS);
  const [circles, setCircles] = useState<AdminCircle[]>(SAMPLE_CIRCLES);
  const [categories, setCategories] = useState(["Startups", "Agriculture", "Legal", "Health", "Makers", "Family", "Finance", "Community"]);
  const [audit, setAudit] = useState<AuditEntry[]>(SAMPLE_AUDIT);
  const [notices, setNotices] = useState<SentNotice[]>([]);
  const [tab, setTab] = useState<"overview" | "hubs" | "reports" | "users" | "circles" | "notices" | "audit">("overview");
  const counter = useRef(1);

  function log(action: string, target: string, reason: string) {
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setAudit((current) => [{ id: `a-${counter.current++}`, at: `Today ${now}`, actor: "You (Platform Super Admin)", action, target, reason }, ...current]);
  }

  function setUserStatus(id: string, status: AdminUser["status"], reason: string) {
    const user = users.find((item) => item.id === id);
    setUsers((current) => current.map((item) => item.id === id ? { ...item, status } : item));
    if (user) log(status === "active" ? "Restored user" : status === "suspended" ? "Suspended user" : "Requested removal (pending second review)", user.name, reason);
  }

  function setUserRole(id: string, role: AdminUser["role"]) {
    const user = users.find((item) => item.id === id);
    setUsers((current) => current.map((item) => item.id === id ? { ...item, role } : item));
    if (user) log("Changed role", user.name, `Now ${role}`);
  }

  function resolveReport(id: string, status: AdminReport["status"], reason: string) {
    const report = reports.find((item) => item.id === id);
    setReports((current) => current.map((item) => item.id === id ? { ...item, status } : item));
    if (!report) return;
    log(status === "dismissed" ? "Dismissed report" : status === "warned" ? "Warned" : "Suspended after report", report.subject, reason);
    if (status === "suspended") {
      setUsers((current) => current.map((item) => item.id === report.subjectId ? { ...item, status: "suspended" } : item));
      setCircles((current) => current.map((item) => item.id === report.subjectId ? { ...item, status: "suspended" } : item));
    }
  }

  function addReport(report: Omit<AdminReport, "id" | "at" | "status">) {
    setReports((current) => [{ ...report, id: `r-${counter.current++}`, at: "Just now", status: "open" }, ...current]);
  }

  function setCircleStatus(id: string, status: AdminCircle["status"], reason: string) {
    const circle = circles.find((item) => item.id === id);
    setCircles((current) => current.map((item) => item.id === id ? { ...item, status } : item));
    if (circle) log(status === "suspended" ? "Suspended circle" : "Restored circle", circle.name, reason);
  }

  function addCategory(name: string) {
    if (!name.trim() || categories.includes(name.trim())) return;
    setCategories((current) => [...current, name.trim()]);
    log("Added category", name.trim(), "Category list update");
  }

  function archiveCategory(name: string) {
    setCategories((current) => current.filter((item) => item !== name));
    log("Archived category", name, "Existing circles keep their label until re-categorised");
  }

  function sendNotice(audience: string, channel: string, text: string) {
    setNotices((current) => [{ id: `nt-${counter.current++}`, audience, channel, text: text.trim(), at: "Just now" }, ...current]);
    log("Sent operational notice", audience, `${channel}: ${text.trim().slice(0, 60)}`);
  }

  return { users, reports, circles, categories, audit, notices, tab, setTab, log, addReport, setUserStatus, setUserRole, resolveReport, setCircleStatus, addCategory, archiveCategory, sendNotice };
}

export type AdminDemo = ReturnType<typeof useAdminDemo>;

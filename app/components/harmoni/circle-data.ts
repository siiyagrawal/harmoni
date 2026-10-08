import { useRef, useState } from "react";

// Phase 2 circle, entry and card-capture screens run on this static sample state.
// Nothing here is persisted or sent; the connected personal circle still comes from Convex.

export type CircleKind = "general" | "hub";
export type CircleVisibility = "public" | "private";
export type CircleAdmission = "open" | "approval" | "invite";
export type BillingBasis = "month" | "year" | "once";
export type CircleFee =
  | { mode: "free" }
  | { mode: "paid"; amount: number; currency: string; basis: BillingBasis; terms: string };
export type MembershipStatus = "none" | "invited" | "pending" | "payment" | "active" | "declined" | "withdrawn" | "left";
export type JoinOutcome = "active" | "pending" | "payment" | "full" | "unavailable";
export type GuestField = "purpose" | "host" | "topics" | "memberCount" | "memberNames";
export type CircleSegment = "joined" | "hosting" | "discover";

export type HostSettings = {
  whoCanInvite: "host" | "members";
  connectionApproval: "member" | "host-then-member";
  allowLinking: boolean;
  spotlightSlot: "day" | "week" | "month";
  spotlightSelection: "host" | "random";
  spotlightResponse: "member" | "host";
};

export type JoinRequest = { id: string; name: string; persona: string; note: string; at: string; status: "pending" | "approved" | "declined" };
export type CircleInvitation = {
  id: string;
  kind: "email" | "link";
  target: string;
  status: "active" | "accepted" | "expired" | "revoked";
  expires: string;
  uses?: number;
};
export type CircleMember = { id: string; name: string; role: "host" | "member"; persona: string; joined: string };
export type CircleLinkStatus = "awaiting-them" | "awaiting-you" | "active" | "disconnected";
export type CircleLink = {
  id: string;
  otherCircleId: string;
  otherName: string;
  otherHost: string;
  status: CircleLinkStatus;
  consented: number;
  eligible: number;
};
export type HubRole = "super" | "l1" | "l2" | "participant";
export type HubInfo = {
  myRole: HubRole;
  myBranch: string;
  chain: Array<{ role: HubRole; name: string }>;
  branches: Array<{ name: string; l1: string; l2: string[]; participants: number }>;
  notices: Array<{ id: string; from: string; role: HubRole; text: string; at: string }>;
};

export type DemoCircle = {
  id: string;
  name: string;
  purpose: string;
  category: string;
  area: string;
  host: string;
  kind: CircleKind;
  hubStatus?: "requested" | "active" | "revoked";
  hubLead?: string;
  visibility: CircleVisibility;
  admission: CircleAdmission;
  fee: CircleFee;
  capacity: number | null;
  memberCount: number;
  status: MembershipStatus;
  role: "host" | "member" | null;
  persona?: string;
  joinCode: string;
  topics: string[];
  guestFields: GuestField[];
  available: boolean;
  published: boolean;
  settings: HostSettings;
  requests: JoinRequest[];
  invitations: CircleInvitation[];
  members: CircleMember[];
  links: CircleLink[];
  linkConsent: Record<string, boolean>;
  hub?: HubInfo;
};

export type CaptureStatus = "queued" | "delivered" | "bounced" | "accepted";
export type CapturedCard = {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  circleId: string | null;
  status: CaptureStatus;
  capturedAt: string;
  attempts: number;
  source: "camera" | "manual";
};

export type CircleDraft = {
  name: string;
  purpose: string;
  category: string;
  area: string;
  topics: string;
  visibility: CircleVisibility;
  guestFields: GuestField[];
  admission: CircleAdmission;
  feeMode: "free" | "paid";
  amount: string;
  currency: string;
  basis: BillingBasis;
  terms: string;
  capacityOn: boolean;
  capacity: string;
};

export const CIRCLE_CATEGORIES = ["Startups", "Agriculture", "Legal", "Health", "Makers", "Family", "Finance", "Community"];
export const CIRCLE_AREAS = ["Anywhere", "Online", "Bengaluru", "Pune", "Nashik", "Mumbai"];
export const HUB_APPLICATION_EMAIL = "hubs@harmoni.example";

const DEFAULT_SETTINGS: HostSettings = {
  whoCanInvite: "host",
  connectionApproval: "member",
  allowLinking: true,
  spotlightSlot: "week",
  spotlightSelection: "host",
  spotlightResponse: "member",
};

export const EMPTY_CIRCLE_DRAFT: CircleDraft = {
  name: "",
  purpose: "",
  category: "Community",
  area: "Online",
  topics: "",
  visibility: "public",
  guestFields: ["purpose", "host", "topics", "memberCount"],
  admission: "approval",
  feeMode: "free",
  amount: "",
  currency: "USD",
  basis: "month",
  terms: "",
  capacityOn: false,
  capacity: "50",
};

const SAMPLE_CIRCLES: DemoCircle[] = [
  {
    id: "creative-founders",
    name: "Creative Founders",
    purpose: "A thoughtful space for founders and builders to share experience, find collaborators, and make useful introductions.",
    category: "Startups",
    area: "Bengaluru",
    host: "Maya Chen",
    kind: "general",
    visibility: "public",
    admission: "approval",
    fee: { mode: "free" },
    capacity: 40,
    memberCount: 38,
    status: "none",
    role: null,
    joinCode: "CF-4821",
    topics: ["Startups", "Design", "Climate"],
    guestFields: ["purpose", "host", "topics", "memberCount"],
    available: true,
    published: true,
    settings: DEFAULT_SETTINGS,
    requests: [],
    invitations: [],
    members: [],
    links: [],
    linkConsent: {},
  },
  {
    id: "valley-growers",
    name: "Valley Growers Co-op",
    purpose: "Farmers sharing land, equipment, seasonal labour and practical advice across the valley.",
    category: "Agriculture",
    area: "Nashik",
    host: "Ravi Patil",
    kind: "general",
    visibility: "public",
    admission: "open",
    fee: { mode: "free" },
    capacity: null,
    memberCount: 112,
    status: "active",
    role: "member",
    persona: "Main card",
    joinCode: "VG-2207",
    topics: ["Equipment", "Land", "Harvest"],
    guestFields: ["purpose", "host", "topics", "memberCount"],
    available: true,
    published: true,
    settings: { ...DEFAULT_SETTINGS, whoCanInvite: "members", connectionApproval: "host-then-member" },
    requests: [],
    invitations: [],
    members: [],
    links: [{ id: "link-vg-sb", otherCircleId: "sunday-builders", otherName: "Sunday Builders", otherHost: "You", status: "active", consented: 46, eligible: 112 }],
    linkConsent: { "link-vg-sb": false },
  },
  {
    id: "legal-help",
    name: "Legal Help Network",
    purpose: "Attorneys and people who need practical legal guidance, matched by matter and jurisdiction.",
    category: "Legal",
    area: "Mumbai",
    host: "Anita Rao",
    kind: "general",
    visibility: "public",
    admission: "approval",
    fee: { mode: "paid", amount: 15, currency: "USD", basis: "month", terms: "Billed monthly after host approval. Cancel any time; access ends at the close of the paid period." },
    capacity: 200,
    memberCount: 74,
    status: "payment",
    role: "member",
    persona: "Main card",
    joinCode: "LH-9034",
    topics: ["Contracts", "Property", "Family law"],
    guestFields: ["purpose", "host", "topics"],
    available: true,
    published: true,
    settings: DEFAULT_SETTINGS,
    requests: [],
    invitations: [],
    members: [],
    links: [],
    linkConsent: {},
  },
  {
    id: "riverside-makers",
    name: "Riverside Makers",
    purpose: "Hands-on makers swapping tools, workshop time and project help.",
    category: "Makers",
    area: "Pune",
    host: "Sam Okafor",
    kind: "general",
    visibility: "public",
    admission: "open",
    fee: { mode: "free" },
    capacity: 25,
    memberCount: 25,
    status: "none",
    role: null,
    joinCode: "RM-1150",
    topics: ["Woodwork", "Electronics", "Repair"],
    guestFields: ["purpose", "host", "topics", "memberCount"],
    available: true,
    published: true,
    settings: DEFAULT_SETTINGS,
    requests: [],
    invitations: [],
    members: [],
    links: [],
    linkConsent: {},
  },
  {
    id: "money-clinic",
    name: "Money Clinic",
    purpose: "Volunteer advisers helping people with budgeting, tax questions and first investments.",
    category: "Finance",
    area: "Online",
    host: "Leah Gomez",
    kind: "general",
    visibility: "public",
    admission: "open",
    fee: { mode: "free" },
    capacity: null,
    memberCount: 61,
    status: "none",
    role: null,
    joinCode: "MC-3318",
    topics: ["Tax", "Budgeting", "Investing"],
    guestFields: ["purpose", "host", "topics", "memberCount"],
    available: true,
    published: true,
    settings: DEFAULT_SETTINGS,
    requests: [],
    invitations: [],
    members: [],
    links: [],
    linkConsent: {},
  },
  {
    id: "northside-parents",
    name: "Northside Parents",
    purpose: "Parents in the neighbourhood arranging playdates, carpools and childcare swaps.",
    category: "Family",
    area: "Pune",
    host: "Priya Nair",
    kind: "general",
    visibility: "private",
    admission: "invite",
    fee: { mode: "free" },
    capacity: 60,
    memberCount: 41,
    status: "invited",
    role: null,
    joinCode: "NP-6604",
    topics: ["Childcare", "Carpools"],
    guestFields: ["purpose", "host"],
    available: true,
    published: true,
    settings: DEFAULT_SETTINGS,
    requests: [],
    invitations: [],
    members: [],
    links: [],
    linkConsent: {},
  },
  {
    id: "health-hub",
    name: "Community Health Hub",
    purpose: "A regional health-volunteer network organised into district branches.",
    category: "Health",
    area: "Mumbai",
    host: "Dr. Kavya Iyer",
    kind: "hub",
    hubStatus: "active",
    visibility: "private",
    admission: "invite",
    fee: { mode: "free" },
    capacity: null,
    memberCount: 860,
    status: "active",
    role: "member",
    persona: "Main card",
    joinCode: "HH-0071",
    topics: ["Volunteering", "Outreach"],
    guestFields: ["purpose", "host"],
    available: true,
    published: true,
    settings: DEFAULT_SETTINGS,
    requests: [],
    invitations: [],
    members: [],
    links: [],
    linkConsent: {},
    hub: {
      myRole: "participant",
      myBranch: "Andheri West",
      chain: [
        { role: "super", name: "Dr. Kavya Iyer" },
        { role: "l1", name: "Arjun Mehta · Western District" },
        { role: "l2", name: "Sneha Kulkarni · Andheri West" },
        { role: "participant", name: "You" },
      ],
      branches: [
        { name: "Western District", l1: "Arjun Mehta", l2: ["Andheri West", "Bandra"], participants: 320 },
        { name: "Central District", l1: "Farah Sheikh", l2: ["Dadar", "Parel", "Sion"], participants: 410 },
        { name: "Harbour District", l1: "Vikram Joshi", l2: ["Chembur"], participants: 126 },
      ],
      notices: [
        { id: "n1", from: "Sneha Kulkarni", role: "l2", text: "Saturday outreach meets at 9:00 at the Andheri West clinic.", at: "Today" },
        { id: "n2", from: "Dr. Kavya Iyer", role: "super", text: "Volunteer safety guidance has been updated for all branches.", at: "Mon" },
      ],
    },
  },
  {
    id: "sunday-builders",
    name: "Sunday Builders",
    purpose: "Weekend side-project builders who trade feedback, skills and the occasional co-founder.",
    category: "Startups",
    area: "Online",
    host: "You",
    kind: "general",
    visibility: "public",
    admission: "approval",
    fee: { mode: "free" },
    capacity: 30,
    memberCount: 27,
    status: "active",
    role: "host",
    persona: "Main card",
    joinCode: "SB-5590",
    topics: ["Side projects", "Feedback", "Product"],
    guestFields: ["purpose", "host", "topics", "memberCount"],
    available: true,
    published: true,
    settings: { ...DEFAULT_SETTINGS, connectionApproval: "host-then-member" },
    requests: [
      { id: "rq1", name: "Ishaan Verma", persona: "Business", note: "Building a budgeting app; happy to review landing pages.", at: "2h ago", status: "pending" },
      { id: "rq2", name: "Meera Das", persona: "Business", note: "Product designer looking for weekend collaborators.", at: "Yesterday", status: "pending" },
      { id: "rq3", name: "Tom Becker", persona: "Personal", note: "", at: "3 days ago", status: "declined" },
    ],
    invitations: [
      { id: "inv1", kind: "email", target: "jordan@studio.example", status: "active", expires: "Expires in 6 days" },
      { id: "inv2", kind: "email", target: "lina@makers.example", status: "accepted", expires: "Accepted Oct 2" },
      { id: "inv3", kind: "link", target: "Reusable join link", status: "active", expires: "Expires Oct 31", uses: 9 },
    ],
    members: [
      { id: "m0", name: "You", role: "host", persona: "Main card", joined: "Host" },
      { id: "m1", name: "Aarav Shah", role: "member", persona: "Business", joined: "Sep 12" },
      { id: "m2", name: "Neha Kapoor", role: "member", persona: "Business", joined: "Sep 20" },
      { id: "m3", name: "Daniel Kim", role: "member", persona: "Personal", joined: "Oct 1" },
    ],
    links: [
      { id: "link-vg-sb", otherCircleId: "valley-growers", otherName: "Valley Growers Co-op", otherHost: "Ravi Patil", status: "active", consented: 19, eligible: 27 },
      { id: "link-cf-sb", otherCircleId: "creative-founders", otherName: "Creative Founders", otherHost: "Maya Chen", status: "awaiting-them", consented: 0, eligible: 27 },
    ],
    linkConsent: {},
  },
];

SAMPLE_CIRCLES.push({
  id: "schools-hub",
  name: "Riverside Schools Network",
  purpose: "Parent volunteers across 12 schools, organised by district and school.",
  category: "Community",
  area: "Pune",
  host: "Farida Khan",
  kind: "hub",
  hubStatus: "requested",
  visibility: "private",
  admission: "invite",
  fee: { mode: "free" },
  capacity: null,
  memberCount: 1,
  status: "none",
  role: null,
  joinCode: "RS-7781",
  topics: ["Schools", "Volunteering"],
  guestFields: ["purpose", "host"],
  available: true,
  published: false,
  settings: DEFAULT_SETTINGS,
  requests: [],
  invitations: [],
  members: [],
  links: [],
  linkConsent: {},
});

const SAMPLE_CAPTURES: CapturedCard[] = [
  { id: "cap1", name: "Rohan Malhotra", title: "Operations Lead", company: "GreenCart", email: "rohan@greencart.example", phone: "+91 98200 11223", circleId: "sunday-builders", status: "delivered", capturedAt: "Oct 6", attempts: 1, source: "camera" },
  { id: "cap2", name: "Elena Petrova", title: "Architect", company: "Studio Nine", email: "elena@studio9.exmaple", phone: "", circleId: "sunday-builders", status: "bounced", capturedAt: "Oct 5", attempts: 1, source: "camera" },
  { id: "cap3", name: "Kabir Sethi", title: "Founder", company: "Loomly", email: "kabir@loomly.example", phone: "+91 99870 44556", circleId: null, status: "accepted", capturedAt: "Sep 29", attempts: 1, source: "manual" },
];

export function feeLabel(fee: CircleFee) {
  if (fee.mode === "free") return "Free";
  const basis = fee.basis === "once" ? "one-time" : `per ${fee.basis}`;
  return `${fee.currency === "USD" ? "$" : `${fee.currency} `}${fee.amount} ${basis}`;
}

export function admissionLabel(admission: CircleAdmission) {
  return admission === "open" ? "Open joining" : admission === "approval" ? "Host approval" : "Invitation only";
}

export function isFull(circle: DemoCircle) {
  return circle.capacity !== null && circle.memberCount >= circle.capacity;
}

export function joinCodeToCircle(circles: DemoCircle[], code: string) {
  const normalized = code.trim().toUpperCase().replace(/\s+/g, "");
  return circles.find((circle) => circle.joinCode.replace("-", "") === normalized.replace("-", "") && circle.published);
}

export function useCircleDemo() {
  const [circles, setCircles] = useState<DemoCircle[]>(SAMPLE_CIRCLES);
  const [captures, setCaptures] = useState<CapturedCard[]>(SAMPLE_CAPTURES);
  const [segment, setSegment] = useState<CircleSegment>("joined");
  const [discover, setDiscover] = useState({ query: "", category: "All", area: "Anywhere" });
  const [createDraft, setCreateDraft] = useState<CircleDraft>(EMPTY_CIRCLE_DRAFT);
  const [hubApplicationOpened, setHubApplicationOpened] = useState(false);
  const counter = useRef(1);

  function nextId(prefix: string) {
    return `${prefix}-${Date.now().toString(36)}-${counter.current++}`;
  }

  function patchCircle(id: string, update: (circle: DemoCircle) => DemoCircle) {
    setCircles((current) => current.map((circle) => circle.id === id ? update(circle) : circle));
  }

  // Capacity is evaluated against the latest state in a single update so two quick joins cannot oversubscribe.
  function join(id: string, persona: string): JoinOutcome {
    const circle = circles.find((item) => item.id === id);
    if (!circle || !circle.available || !circle.published) return "unavailable";
    if (circle.admission === "invite" && circle.status !== "invited") return "unavailable";
    if (isFull(circle)) return "full";
    const outcome: JoinOutcome = circle.admission === "approval"
      ? "pending"
      : circle.fee.mode === "paid" ? "payment" : "active";
    setCircles((current) => current.map((item) => {
      if (item.id !== id) return item;
      if (outcome === "active" && isFull(item)) return item;
      return {
        ...item,
        status: outcome,
        role: outcome === "active" ? "member" : item.role,
        persona,
        memberCount: outcome === "active" ? item.memberCount + 1 : item.memberCount,
      };
    }));
    return outcome;
  }

  function withdraw(id: string) {
    patchCircle(id, (circle) => ({ ...circle, status: "withdrawn" }));
  }

  function leave(id: string) {
    patchCircle(id, (circle) => ({ ...circle, status: "left", role: null, memberCount: Math.max(0, circle.memberCount - 1) }));
  }

  function declineInvitation(id: string) {
    patchCircle(id, (circle) => ({ ...circle, status: "declined" }));
  }

  function decideRequest(circleId: string, requestId: string, decision: "approved" | "declined") {
    patchCircle(circleId, (circle) => {
      if (decision === "approved" && isFull(circle)) return circle;
      const request = circle.requests.find((item) => item.id === requestId);
      if (!request || request.status !== "pending") return circle;
      return {
        ...circle,
        requests: circle.requests.map((item) => item.id === requestId ? { ...item, status: decision } : item),
        memberCount: decision === "approved" && circle.fee.mode === "free" ? circle.memberCount + 1 : circle.memberCount,
        members: decision === "approved" && circle.fee.mode === "free"
          ? [...circle.members, { id: nextId("m"), name: request.name, role: "member", persona: request.persona, joined: "Today" }]
          : circle.members,
      };
    });
  }

  function removeMember(circleId: string, memberId: string) {
    patchCircle(circleId, (circle) => ({
      ...circle,
      members: circle.members.filter((member) => member.id !== memberId),
      memberCount: Math.max(1, circle.memberCount - 1),
    }));
  }

  function revokeInvitation(circleId: string, invitationId: string) {
    patchCircle(circleId, (circle) => ({
      ...circle,
      invitations: circle.invitations.map((invitation) => invitation.id === invitationId ? { ...invitation, status: "revoked", expires: "Revoked just now" } : invitation),
    }));
  }

  function addEmailInvitation(circleId: string, email: string) {
    patchCircle(circleId, (circle) => circle.invitations.some((invitation) => invitation.kind === "email" && invitation.target === email && invitation.status === "active")
      ? circle
      : { ...circle, invitations: [{ id: nextId("inv"), kind: "email", target: email, status: "active", expires: "Expires in 7 days" }, ...circle.invitations] });
  }

  function regenerateLink(circleId: string) {
    patchCircle(circleId, (circle) => ({
      ...circle,
      joinCode: `${circle.joinCode.split("-")[0]}-${Math.floor(1000 + Math.random() * 9000)}`,
      invitations: [
        { id: nextId("inv"), kind: "link", target: "Reusable join link", status: "active", expires: "Expires in 30 days", uses: 0 },
        ...circle.invitations.map((invitation) => invitation.kind === "link" && invitation.status === "active"
          ? { ...invitation, status: "revoked" as const, expires: "Replaced just now" }
          : invitation),
      ],
    }));
  }

  function updateSettings(circleId: string, update: Partial<Pick<DemoCircle, "visibility" | "admission" | "capacity" | "guestFields">> & { settings?: Partial<HostSettings> }) {
    patchCircle(circleId, (circle) => ({
      ...circle,
      ...update,
      settings: { ...circle.settings, ...(update.settings ?? {}) },
    }));
  }

  function createCircle(draft: CircleDraft, kind: CircleKind) {
    const id = nextId("circle");
    const prefix = draft.name.trim().split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase() || "HC";
    const paid = draft.feeMode === "paid";
    const amount = Number.parseFloat(draft.amount);
    const capacity = draft.capacityOn ? Math.max(2, Number.parseInt(draft.capacity, 10) || 2) : null;
    const circle: DemoCircle = {
      id,
      name: draft.name.trim(),
      purpose: draft.purpose.trim(),
      category: draft.category,
      area: draft.area,
      host: "You",
      kind,
      ...(kind === "hub" ? { hubStatus: "requested" as const } : {}),
      visibility: draft.visibility,
      admission: draft.admission,
      fee: paid
        ? { mode: "paid", amount: Number.isFinite(amount) ? amount : 0, currency: draft.currency, basis: draft.basis, terms: draft.terms.trim() }
        : { mode: "free" },
      capacity,
      memberCount: 1,
      status: "active",
      role: "host",
      persona: "Main card",
      joinCode: `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`,
      topics: draft.topics.split(",").map((topic) => topic.trim()).filter(Boolean).slice(0, 5),
      guestFields: draft.guestFields,
      available: true,
      // Paid collection is not approved yet (D2), so paid circles stay as unpublished drafts.
      published: !paid,
      settings: DEFAULT_SETTINGS,
      requests: [],
      invitations: [],
      members: [{ id: nextId("m"), name: "You", role: "host", persona: "Main card", joined: "Host" }],
      links: [],
      linkConsent: {},
    };
    setCircles((current) => [circle, ...current]);
    setCreateDraft(EMPTY_CIRCLE_DRAFT);
    return circle;
  }

  // Only Harmoni's platform Super Admin enables or revokes a Hub; revoking stops access immediately.
  function setHubStatus(id: string, hubStatus: "active" | "revoked", lead?: string) {
    patchCircle(id, (circle) => ({
      ...circle,
      hubStatus,
      hubLead: lead ?? circle.hubLead,
      published: hubStatus === "active",
      hub: hubStatus === "active" && !circle.hub ? {
        myRole: circle.role === "host" ? "super" : "participant",
        myBranch: "Headquarters",
        chain: [{ role: "super", name: lead || circle.host }],
        branches: [],
        notices: [],
      } : circle.hub,
    }));
  }

  function requestLink(fromId: string, toId: string) {
    const target = circles.find((circle) => circle.id === toId);
    if (!target) return;
    patchCircle(fromId, (circle) => circle.links.some((link) => link.otherCircleId === toId && link.status !== "disconnected")
      ? circle
      : { ...circle, links: [...circle.links, { id: nextId("link"), otherCircleId: toId, otherName: target.name, otherHost: target.host, status: "awaiting-them", consented: 0, eligible: circle.memberCount }] });
  }

  function setLinkStatus(circleId: string, linkId: string, status: CircleLinkStatus) {
    patchCircle(circleId, (circle) => ({
      ...circle,
      links: circle.links.map((link) => link.id === linkId ? { ...link, status, consented: status === "disconnected" ? 0 : link.consented } : link),
    }));
  }

  function setLinkConsent(circleId: string, linkId: string, allowed: boolean) {
    patchCircle(circleId, (circle) => ({ ...circle, linkConsent: { ...circle.linkConsent, [linkId]: allowed } }));
  }

  function findDuplicate(name: string, email: string, ignoreId?: string) {
    const normalizedName = name.trim().toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();
    return captures.find((capture) => capture.id !== ignoreId && (
      (normalizedEmail && capture.email.toLowerCase() === normalizedEmail)
      || (normalizedName && capture.name.toLowerCase() === normalizedName)
    ));
  }

  function saveCapture(capture: Omit<CapturedCard, "id" | "status" | "capturedAt" | "attempts">, replaceId?: string) {
    if (replaceId) {
      setCaptures((current) => current.map((item) => item.id === replaceId ? { ...item, ...capture, status: "queued", attempts: item.attempts + 1 } : item));
      return replaceId;
    }
    const id = nextId("cap");
    setCaptures((current) => [{ ...capture, id, status: "queued", capturedAt: "Today", attempts: 1 }, ...current]);
    return id;
  }

  function retryCapture(id: string, email: string) {
    setCaptures((current) => current.map((item) => item.id === id ? { ...item, email, status: "queued", attempts: item.attempts + 1 } : item));
  }

  function removeCapture(id: string) {
    setCaptures((current) => current.filter((item) => item.id !== id));
  }

  return {
    circles,
    captures,
    segment,
    setSegment,
    discover,
    setDiscover,
    createDraft,
    setCreateDraft,
    hubApplicationOpened,
    setHubApplicationOpened,
    join,
    withdraw,
    leave,
    declineInvitation,
    decideRequest,
    removeMember,
    revokeInvitation,
    addEmailInvitation,
    regenerateLink,
    updateSettings,
    createCircle,
    requestLink,
    setHubStatus,
    setLinkStatus,
    setLinkConsent,
    findDuplicate,
    saveCapture,
    retryCapture,
    removeCapture,
  };
}

export type CircleDemo = ReturnType<typeof useCircleDemo>;

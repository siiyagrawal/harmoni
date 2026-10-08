import { useRef, useState } from "react";

// Phase 3 matching, introduction, help and Spotlight screens run on this static sample state.
// Nothing is persisted or sent. Real personal-circle suggestions still come from Convex.

export type FitLevel = "Strong" | "Good" | "Possible";
export type DimensionState = "match" | "partial" | "unknown";
export type Confidence = "High" | "Medium" | "Low";
export type MatchesSegment = "matches" | "requests" | "help";

export type DemoMatch = {
  id: string;
  personId: string;
  name: string;
  headline: string;
  circleId: string;
  fit: FitLevel;
  reason: string;
  dimensions: Array<{ label: string; state: DimensionState; note: string }>;
  confidence: Confidence;
  evidence: string;
  dismissed: boolean;
};

export type Grants = { chat: boolean; email: boolean; phone: boolean };
export type RequestStatus = "host-review" | "pending" | "approved" | "declined" | "withdrawn" | "expired" | "invalid" | "forwarded";
export type RequestKind = "interest" | "introduction" | "help-offer";

export type ConnRequest = {
  id: string;
  personId: string;
  name: string;
  direction: "incoming" | "sent" | "review";
  kind: RequestKind;
  circleId: string;
  persona: string;
  note: string;
  status: RequestStatus;
  at: string;
  grants?: Grants;
  // Whether the other person still has access at the moment of approval; rechecked on accept.
  eligible: boolean;
  reviewTarget?: string;
};

export type HelpOffer = {
  id: string;
  fromId: string;
  from: string;
  toId: string;
  to: string;
  circleId: string;
  text: string;
  status: "pending" | "introduced" | "closed";
  target: { type: "spotlight" | "help"; id: string; label: string };
  viaExistingConnection: boolean;
  at: string;
};

export type HelpRequest = {
  id: string;
  circleId: string;
  ownerId: string;
  owner: string;
  mine: boolean;
  ask: string;
  timing: string;
  status: "open" | "closed";
  at: string;
};

export type SpotlightSlot = { id: string; slot: string; member: string | null; memberId: string | null; askStatus: "empty" | "needs-ask" | "approved" };
export type SpotlightHistory = { id: string; slot: string; member: string; ask: string; offers: number; introductions: number; confirmed: number | null };
export type Spotlight = {
  circleId: string;
  current: { member: string; memberId: string; ask: string; ends: string; offers: number; introductions: number } | null;
  queue: Array<{ id: string; name: string }>;
  schedule: SpotlightSlot[];
  history: SpotlightHistory[];
  meInQueue: boolean;
  myAsk: string;
};

export const NO_GRANTS: Grants = { chat: false, email: false, phone: false };

const SAMPLE_MATCHES: DemoMatch[] = [
  {
    id: "mt1", personId: "sunita", name: "Sunita Pawar", headline: "Grows soybean on 6 acres", circleId: "valley-growers", fit: "Strong",
    reason: "Needs a tractor for three days of harvest; you said yours is free most weekends.",
    dimensions: [
      { label: "Needs ↔ offers", state: "match", note: "Tractor time" },
      { label: "Timing", state: "match", note: "Oct 20–22" },
      { label: "Location", state: "match", note: "Both near Nashik" },
      { label: "Availability", state: "partial", note: "Weekends only" },
    ],
    confidence: "High", evidence: "3 approved details on each side", dismissed: false,
  },
  {
    id: "mt2", personId: "neha", name: "Neha Kapoor", headline: "Building an onboarding tool", circleId: "sunday-builders", fit: "Strong",
    reason: "Looking for product design reviews, which you listed as something you can share.",
    dimensions: [
      { label: "Needs ↔ offers", state: "match", note: "Design reviews" },
      { label: "Specialty", state: "match", note: "Product design" },
      { label: "Timing", state: "partial", note: "This month" },
      { label: "Availability", state: "unknown", note: "Not shared" },
    ],
    confidence: "Medium", evidence: "2 approved details; availability not shared", dismissed: false,
  },
  {
    id: "mt3", personId: "mohan", name: "Mohan Jadhav", headline: "Drip irrigation installer", circleId: "valley-growers", fit: "Good",
    reason: "Offers irrigation advice that matches a topic in your persona.",
    dimensions: [
      { label: "Needs ↔ offers", state: "partial", note: "Irrigation advice" },
      { label: "Specialty", state: "match", note: "Drip systems" },
      { label: "Location", state: "match", note: "Same district" },
      { label: "Timing", state: "unknown", note: "Not shared" },
    ],
    confidence: "Medium", evidence: "2 approved details", dismissed: false,
  },
  {
    id: "mt4", personId: "daniel", name: "Daniel Kim", headline: "Indie developer", circleId: "sunday-builders", fit: "Possible",
    reason: "Mentions lease and contract questions, close to something you’re looking for.",
    dimensions: [
      { label: "Needs ↔ offers", state: "partial", note: "Contracts" },
      { label: "Specialty", state: "unknown", note: "Not a lawyer" },
      { label: "Location", state: "partial", note: "Online" },
      { label: "Availability", state: "match", note: "Evenings" },
    ],
    confidence: "Low", evidence: "1 approved detail", dismissed: false,
  },
];

const SAMPLE_REQUESTS: ConnRequest[] = [
  { id: "rq-neha", personId: "neha", name: "Neha Kapoor", direction: "incoming", kind: "interest", circleId: "sunday-builders", persona: "Business", note: "Would love a quick review of my onboarding flow.", status: "pending", at: "1h ago", eligible: true },
  { id: "rq-tom", personId: "tom", name: "Tom Becker", direction: "incoming", kind: "introduction", circleId: "sunday-builders", persona: "Personal", note: "Hoping to chat about side-project pricing.", status: "pending", at: "5 days ago", eligible: false },
  { id: "rq-aarav", personId: "aarav", name: "Aarav Shah", direction: "sent", kind: "interest", circleId: "sunday-builders", persona: "Main card", note: "", status: "approved", at: "Sep 30", grants: { chat: true, email: false, phone: false }, eligible: true },
  { id: "rq-farah", personId: "farah", name: "Farah Ali", direction: "sent", kind: "introduction", circleId: "valley-growers", persona: "Main card", note: "", status: "declined", at: "Sep 24", eligible: true },
  { id: "rq-lina", personId: "lina", name: "Lina Ortiz", direction: "sent", kind: "interest", circleId: "sunday-builders", persona: "Main card", note: "", status: "expired", at: "Sep 2", eligible: true },
  { id: "rv-daniel", personId: "daniel", name: "Daniel Kim", direction: "review", kind: "introduction", circleId: "sunday-builders", persona: "Business", note: "Wants feedback on a pricing page from someone who has sold SaaS.", status: "host-review", at: "3h ago", eligible: true, reviewTarget: "Aarav Shah" },
];

const SAMPLE_HELP: HelpRequest[] = [
  { id: "hr-sunita", circleId: "valley-growers", ownerId: "sunita", owner: "Sunita Pawar", mine: false, ask: "Need a tractor for three days during harvest.", timing: "Oct 20–22", status: "open", at: "Today" },
  { id: "hr-aarav", circleId: "sunday-builders", ownerId: "aarav", owner: "Aarav Shah", mine: false, ask: "Looking for someone to review my pricing page before launch.", timing: "This week", status: "open", at: "Yesterday" },
  { id: "hr-mine", circleId: "sunday-builders", ownerId: "me", owner: "You", mine: true, ask: "Find someone who can explain a commercial lease clause.", timing: "Before Oct 18", status: "open", at: "Oct 6" },
];

const SAMPLE_OFFERS: HelpOffer[] = [
  { id: "of-daniel", fromId: "daniel", from: "Daniel Kim", toId: "me", to: "You", circleId: "sunday-builders", text: "I went through a similar lease last year and can walk you through it.", status: "pending", target: { type: "help", id: "hr-mine", label: "Commercial lease clause" }, viaExistingConnection: false, at: "Oct 7" },
  { id: "of-mohan", fromId: "me", from: "You", toId: "mohan", to: "Mohan Jadhav", circleId: "valley-growers", text: "I switched one field to drip last year and can share what I learned.", status: "pending", target: { type: "spotlight", id: "valley-growers", label: "Mohan’s Spotlight" }, viaExistingConnection: false, at: "Oct 6" },
];

const SAMPLE_SPOTLIGHTS: Spotlight[] = [
  {
    circleId: "valley-growers",
    current: { member: "Mohan Jadhav", memberId: "mohan", ask: "Looking for advice on switching two acres to drip irrigation before winter sowing.", ends: "Ends Sunday", offers: 3, introductions: 1 },
    queue: [{ id: "me", name: "You" }, { id: "sunita", name: "Sunita Pawar" }],
    schedule: [
      { id: "vs1", slot: "Week of Oct 13", member: "You", memberId: "me", askStatus: "needs-ask" },
      { id: "vs2", slot: "Week of Oct 20", member: "Sunita Pawar", memberId: "sunita", askStatus: "approved" },
    ],
    history: [],
    meInQueue: true,
    myAsk: "",
  },
  {
    circleId: "sunday-builders",
    current: { member: "Neha Kapoor", memberId: "neha", ask: "Need two people to test my onboarding flow this week and tell me where they get stuck.", ends: "Ends Sunday", offers: 2, introductions: 1 },
    queue: [{ id: "daniel", name: "Daniel Kim" }, { id: "aarav", name: "Aarav Shah" }, { id: "meera", name: "Meera Das" }],
    schedule: [
      { id: "ss1", slot: "Week of Oct 13", member: null, memberId: null, askStatus: "empty" },
      { id: "ss2", slot: "Week of Oct 20", member: null, memberId: null, askStatus: "empty" },
    ],
    history: [
      { id: "sh1", slot: "Week of Sep 29", member: "Aarav Shah", ask: "Intro to someone who has sold a B2B SaaS product.", offers: 4, introductions: 2, confirmed: 1 },
      { id: "sh2", slot: "Week of Sep 22", member: "Daniel Kim", ask: "Beta testers for a habit-tracking app.", offers: 2, introductions: 1, confirmed: null },
    ],
    meInQueue: false,
    myAsk: "",
  },
];

export function useConnectDemo() {
  const [matches, setMatches] = useState<DemoMatch[]>(SAMPLE_MATCHES);
  const [requests, setRequests] = useState<ConnRequest[]>(SAMPLE_REQUESTS);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>(SAMPLE_HELP);
  const [offers, setOffers] = useState<HelpOffer[]>(SAMPLE_OFFERS);
  const [spotlights, setSpotlights] = useState<Spotlight[]>(SAMPLE_SPOTLIGHTS);
  const [segment, setSegment] = useState<MatchesSegment>("matches");
  const [requestFilter, setRequestFilter] = useState<"incoming" | "sent" | "review">("incoming");
  const [matchScope, setMatchScope] = useState({ circleId: "all", persona: "Main card" });
  const [refreshedSignature, setRefreshedSignature] = useState<string | null>(null);
  const counter = useRef(1);

  const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${counter.current++}`;

  function openRequestWith(personId: string, circleId: string) {
    // Host-review items are between two other members, so they never count as the viewer's own request.
    return requests.find((request) => request.direction !== "review" && request.personId === personId && request.circleId === circleId
      && (request.status === "pending" || request.status === "host-review"));
  }

  function connectionWith(personId: string) {
    return requests.find((request) => request.direction !== "review" && request.personId === personId && request.status === "approved");
  }

  // One open request per person and context; a matching incoming request makes it mutual instead.
  function expressInterest(input: { personId: string; name: string; circleId: string; kind: RequestKind; note: string; persona: string; hostFirst: boolean }) {
    const existing = openRequestWith(input.personId, input.circleId);
    if (existing?.direction === "incoming") return { result: "mutual" as const, request: existing };
    if (existing) return { result: "existing" as const, request: existing };
    const request: ConnRequest = {
      id: nextId("rq"),
      personId: input.personId,
      name: input.name,
      direction: "sent",
      kind: input.kind,
      circleId: input.circleId,
      persona: input.persona,
      note: input.note.trim(),
      status: input.hostFirst ? "host-review" : "pending",
      at: "Just now",
      eligible: true,
    };
    setRequests((current) => [request, ...current]);
    return { result: "created" as const, request };
  }

  function respond(id: string, decision: "approve" | "decline", grants: Grants = NO_GRANTS) {
    const request = requests.find((item) => item.id === id);
    if (!request) return "missing" as const;
    if (decision === "approve" && !request.eligible) {
      setRequests((current) => current.map((item) => item.id === id ? { ...item, status: "invalid" } : item));
      return "invalid" as const;
    }
    setRequests((current) => current.map((item) => item.id === id
      ? { ...item, status: decision === "approve" ? "approved" : "declined", grants: decision === "approve" ? grants : undefined }
      : item));
    if (decision === "approve") {
      setOffers((current) => current.map((offer) => offer.fromId === request.personId && offer.status === "pending" ? { ...offer, status: "introduced" } : offer));
    }
    return decision === "approve" ? "approved" as const : "declined" as const;
  }

  function hostReview(id: string, decision: "forward" | "decline") {
    setRequests((current) => current.map((item) => item.id === id ? { ...item, status: decision === "forward" ? "forwarded" : "declined" } : item));
  }

  function withdraw(id: string) {
    setRequests((current) => current.map((item) => item.id === id ? { ...item, status: "withdrawn" } : item));
    const request = requests.find((item) => item.id === id);
    if (request) setOffers((current) => current.map((offer) => offer.toId === request.personId && offer.status === "pending" ? { ...offer, status: "closed" } : offer));
  }

  // Stands in for the other person's decision so approved and declined states can be shown.
  function simulateReply(id: string, accept: boolean) {
    setRequests((current) => current.map((item) => {
      if (item.id !== id) return item;
      if (item.status === "host-review") return { ...item, status: accept ? "pending" : "declined" };
      return { ...item, status: accept ? "approved" : "declined", grants: accept ? { chat: true, email: false, phone: false } : undefined };
    }));
  }

  function updateGrants(id: string, grants: Grants) {
    setRequests((current) => current.map((item) => item.id === id ? { ...item, grants } : item));
  }

  function dismissMatch(id: string) {
    setMatches((current) => current.map((match) => match.id === id ? { ...match, dismissed: true } : match));
  }

  function restoreMatches() {
    setMatches((current) => current.map((match) => ({ ...match, dismissed: false })));
  }

  // An offer reuses an existing connection or open request before creating a new introduction request.
  function submitOffer(input: { toId: string; to: string; circleId: string; text: string; target: HelpOffer["target"]; persona: string; hostFirst: boolean }) {
    const connected = connectionWith(input.toId);
    const open = openRequestWith(input.toId, input.circleId);
    const offer: HelpOffer = {
      id: nextId("of"),
      fromId: "me",
      from: "You",
      toId: input.toId,
      to: input.to,
      circleId: input.circleId,
      text: input.text.trim(),
      status: connected ? "introduced" : "pending",
      target: input.target,
      viaExistingConnection: Boolean(connected),
      at: "Just now",
    };
    setOffers((current) => [offer, ...current]);
    if (!connected && !open) {
      setRequests((current) => [{
        id: nextId("rq"), personId: input.toId, name: input.to, direction: "sent", kind: "help-offer", circleId: input.circleId,
        persona: input.persona, note: input.text.trim(), status: input.hostFirst ? "host-review" : "pending", at: "Just now", eligible: true,
      }, ...current]);
    }
    if (input.target.type === "spotlight") {
      setSpotlights((current) => current.map((spotlight) => spotlight.circleId === input.target.id && spotlight.current
        ? { ...spotlight, current: { ...spotlight.current, offers: spotlight.current.offers + 1 } }
        : spotlight));
    }
    return { offer, route: connected ? "existing-connection" as const : open ? "existing-request" as const : "new-request" as const };
  }

  function acceptOffer(offerId: string) {
    const offer = offers.find((item) => item.id === offerId);
    if (!offer) return;
    setOffers((current) => current.map((item) => item.id === offerId ? { ...item, status: "introduced" } : item));
    if (!connectionWith(offer.fromId)) {
      setRequests((current) => [{
        id: nextId("rq"), personId: offer.fromId, name: offer.from, direction: "incoming", kind: "help-offer", circleId: offer.circleId,
        persona: "Business", note: offer.text, status: "approved", at: "Just now", grants: { chat: true, email: false, phone: false }, eligible: true,
      }, ...current]);
    }
  }

  function closeOffer(offerId: string) {
    setOffers((current) => current.map((item) => item.id === offerId ? { ...item, status: "closed" } : item));
  }

  function createHelpRequest(circleId: string, ask: string, timing: string) {
    setHelpRequests((current) => [{ id: nextId("hr"), circleId, ownerId: "me", owner: "You", mine: true, ask: ask.trim(), timing: timing.trim() || "Anytime", status: "open", at: "Just now" }, ...current]);
  }

  function closeHelpRequest(id: string) {
    setHelpRequests((current) => current.map((item) => item.id === id ? { ...item, status: "closed" } : item));
    setOffers((current) => current.map((offer) => offer.target.id === id && offer.status === "pending" ? { ...offer, status: "closed" } : offer));
  }

  function patchSpotlight(circleId: string, update: (spotlight: Spotlight) => Spotlight) {
    setSpotlights((current) => current.some((spotlight) => spotlight.circleId === circleId)
      ? current.map((spotlight) => spotlight.circleId === circleId ? update(spotlight) : spotlight)
      : [...current, update({ circleId, current: null, queue: [], schedule: [], history: [], meInQueue: false, myAsk: "" })]);
  }

  function toggleQueue(circleId: string) {
    patchSpotlight(circleId, (spotlight) => ({
      ...spotlight,
      meInQueue: !spotlight.meInQueue,
      queue: spotlight.meInQueue ? spotlight.queue.filter((item) => item.id !== "me") : [...spotlight.queue, { id: "me", name: "You" }],
      schedule: spotlight.meInQueue
        ? spotlight.schedule.map((slot) => slot.memberId === "me" ? { ...slot, member: null, memberId: null, askStatus: "empty" } : slot)
        : spotlight.schedule,
    }));
  }

  function approveMyAsk(circleId: string, ask: string) {
    patchSpotlight(circleId, (spotlight) => ({
      ...spotlight,
      myAsk: ask.trim(),
      schedule: spotlight.schedule.map((slot) => slot.memberId === "me" ? { ...slot, askStatus: "approved" } : slot),
    }));
  }

  function assignSlot(circleId: string, slotId: string, memberId: string | "random") {
    patchSpotlight(circleId, (spotlight) => {
      const scheduled = new Set(spotlight.schedule.map((slot) => slot.memberId).filter(Boolean));
      const eligible = spotlight.queue.filter((item) => !scheduled.has(item.id));
      const pick = memberId === "random"
        ? eligible[Math.floor(Math.random() * eligible.length)]
        : spotlight.queue.find((item) => item.id === memberId);
      if (!pick) return spotlight;
      return {
        ...spotlight,
        schedule: spotlight.schedule.map((slot) => slot.id === slotId ? { ...slot, member: pick.name, memberId: pick.id, askStatus: "needs-ask" } : slot),
      };
    });
  }

  function clearSlot(circleId: string, slotId: string) {
    patchSpotlight(circleId, (spotlight) => ({
      ...spotlight,
      schedule: spotlight.schedule.map((slot) => slot.id === slotId ? { ...slot, member: null, memberId: null, askStatus: "empty" } : slot),
    }));
  }

  function addSlot(circleId: string, label: string) {
    patchSpotlight(circleId, (spotlight) => ({ ...spotlight, schedule: [...spotlight.schedule, { id: nextId("slot"), slot: label, member: null, memberId: null, askStatus: "empty" }] }));
  }

  return {
    matches,
    requests,
    helpRequests,
    offers,
    spotlights,
    segment,
    setSegment,
    requestFilter,
    setRequestFilter,
    matchScope,
    setMatchScope,
    refreshedSignature,
    setRefreshedSignature,
    openRequestWith,
    connectionWith,
    expressInterest,
    respond,
    hostReview,
    withdraw,
    simulateReply,
    updateGrants,
    dismissMatch,
    restoreMatches,
    submitOffer,
    acceptOffer,
    closeOffer,
    createHelpRequest,
    closeHelpRequest,
    toggleQueue,
    approveMyAsk,
    assignSlot,
    clearSlot,
    addSlot,
  };
}

export type ConnectDemo = ReturnType<typeof useConnectDemo>;

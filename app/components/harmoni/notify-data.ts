import { useEffect, useRef, useState } from "react";

// Phase 4 notification and messaging screens run on this static sample state.
// Nothing is delivered: no email, push or server queue exists yet.

export type NotificationCategory = "interest" | "match" | "review" | "message" | "spotlight" | "help" | "feedback" | "invite" | "admission" | "hub";
export type Destination =
  | { type: "request"; id: string }
  | { type: "requests"; filter: "incoming" | "sent" | "review" }
  | { type: "matches" }
  | { type: "help" }
  | { type: "thread"; id: string }
  | { type: "circle"; id: string }
  | { type: "spotlight-ask"; circleId: string }
  | { type: "hub"; circleId: string }
  | { type: "feedback"; id: string };

export type DemoNotification = {
  id: string;
  category: NotificationCategory;
  title: string;
  detail: string;
  at: string;
  read: boolean;
  circleId: string | null;
  destination: Destination;
};

export type Cadence = "immediate" | "digest" | "off";
export type NotificationPrefs = {
  email: boolean;
  push: boolean;
  categories: Record<NotificationCategory, Cadence>;
  quietHours: { on: boolean; from: string; to: string };
  mutedCircles: string[];
};

export type DeliveryRecord = {
  id: string;
  channel: "Email" | "Push" | "In-app";
  title: string;
  status: "accepted" | "queued" | "failed" | "suppressed" | "grouped" | "held";
  note: string;
  at: string;
};

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  interest: "Connection requests",
  match: "New potential connections",
  review: "Introductions to review",
  message: "Messages",
  spotlight: "Spotlight",
  help: "Help offers and requests",
  feedback: "Help follow-ups",
  invite: "Circle invitations",
  admission: "Membership updates",
  hub: "Hub notices",
};

const SAMPLE_NOTIFICATIONS: DemoNotification[] = [
  { id: "n-neha", category: "interest", title: "Neha Kapoor would like to connect", detail: "Sunday Builders", at: "1h", read: false, circleId: "sunday-builders", destination: { type: "request", id: "rq-neha" } },
  { id: "n-meera", category: "interest", title: "Meera Das would like to connect", detail: "Sunday Builders", at: "40m", read: false, circleId: "sunday-builders", destination: { type: "request", id: "rq-meera" } },
  { id: "n-msg-aarav", category: "message", title: "You have a new message", detail: "Open to read it", at: "25m", read: false, circleId: "sunday-builders", destination: { type: "thread", id: "th-aarav" } },
  { id: "n-review", category: "review", title: "An introduction needs review", detail: "Sunday Builders · you host this circle", at: "3h", read: false, circleId: "sunday-builders", destination: { type: "requests", filter: "review" } },
  { id: "n-match", category: "match", title: "A new potential connection", detail: "Valley Growers Co-op", at: "5h", read: false, circleId: "valley-growers", destination: { type: "matches" } },
  { id: "n-spotlight", category: "spotlight", title: "You’re featured the week of Oct 13", detail: "Prepare and approve your ask", at: "Yesterday", read: false, circleId: "valley-growers", destination: { type: "spotlight-ask", circleId: "valley-growers" } },
  { id: "n-help", category: "help", title: "Someone offered to help", detail: "Your request: commercial lease clause", at: "Yesterday", read: true, circleId: "sunday-builders", destination: { type: "help" } },
  { id: "n-feedback", category: "feedback", title: "Did you connect with Daniel Kim?", detail: "Tell us if their help was useful", at: "Today", read: false, circleId: "sunday-builders", destination: { type: "feedback", id: "fb-daniel" } },
  { id: "n-hub", category: "hub", title: "New notice from your Level 2 Admin", detail: "Community Health Hub", at: "Today", read: false, circleId: "health-hub", destination: { type: "hub", circleId: "health-hub" } },
  { id: "n-invite", category: "invite", title: "You’re invited to a circle", detail: "Northside Parents", at: "2 days", read: true, circleId: "northside-parents", destination: { type: "circle", id: "northside-parents" } },
  { id: "n-admission", category: "admission", title: "Your join request was approved", detail: "Legal Help Network · payment required to activate", at: "3 days", read: true, circleId: "legal-help", destination: { type: "circle", id: "legal-help" } },
  { id: "n-omar", category: "interest", title: "Omar Sheikh would like to connect", detail: "Valley Growers Co-op", at: "2 days", read: true, circleId: "valley-growers", destination: { type: "request", id: "rq-omar" } },
];

const SAMPLE_DELIVERIES: DeliveryRecord[] = [
  { id: "d1", channel: "Email", title: "Someone would like to connect", status: "accepted", note: "Accepted by the email provider. That doesn’t confirm you saw it.", at: "1h" },
  { id: "d2", channel: "Email", title: "Connection requests", status: "grouped", note: "Grouped with an earlier request in the same 30-minute window.", at: "40m" },
  { id: "d3", channel: "Push", title: "You have a new message", status: "failed", note: "This browser’s push subscription had expired, so it was removed. Email was used instead.", at: "25m" },
  { id: "d4", channel: "Email", title: "Someone would like to connect", status: "suppressed", note: "Not sent: the request was withdrawn before delivery.", at: "2 days" },
  { id: "d5", channel: "Email", title: "Daily digest", status: "held", note: "Held during your quiet hours and sent at 7:00.", at: "Yesterday" },
];

export function useNotificationsDemo() {
  const [items, setItems] = useState<DemoNotification[]>(SAMPLE_NOTIFICATIONS);
  const [filter, setFilter] = useState<"all" | "unread" | "message">("all");
  const [consent, setConsent] = useState<"unasked" | "email" | "push" | "both" | "not-now">("unasked");
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    email: false,
    push: false,
    categories: { interest: "immediate", match: "digest", review: "immediate", message: "immediate", spotlight: "immediate", help: "immediate", feedback: "digest", invite: "immediate", admission: "immediate", hub: "immediate" },
    quietHours: { on: true, from: "22:00", to: "07:00" },
    mutedCircles: [],
  });
  const [deliveries] = useState<DeliveryRecord[]>(SAMPLE_DELIVERIES);
  const counter = useRef(1);

  function markRead(id: string) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, read: true } : item));
  }

  function markAllRead() {
    setItems((current) => current.map((item) => ({ ...item, read: true })));
  }

  function markCategoryRead(category: NotificationCategory) {
    setItems((current) => current.map((item) => item.category === category ? { ...item, read: true } : item));
  }

  function add(notification: Omit<DemoNotification, "id" | "read" | "at">) {
    setItems((current) => [{ ...notification, id: `n-${Date.now().toString(36)}-${counter.current++}`, read: false, at: "Now" }, ...current]);
  }

  // "Not now" records no consent; choosing a channel turns it on and the prompt is never repeated.
  function answerConsent(answer: "email" | "push" | "both" | "not-now") {
    setConsent(answer);
    if (answer !== "not-now") setPrefs((current) => ({ ...current, email: answer !== "push", push: answer !== "email" }));
  }

  return { items, filter, setFilter, consent, answerConsent, prefs, setPrefs, deliveries, markRead, markAllRead, markCategoryRead, add };
}

export type NotificationsDemo = ReturnType<typeof useNotificationsDemo>;

export type MessageStatus = "sending" | "sent" | "failed";
export type DemoMessage = { id: string; from: "me" | "them" | "system"; text: string; at: string; status?: MessageStatus; deleted?: boolean };
export type DemoThread = {
  id: string;
  kind: "connection" | "hub";
  personId: string;
  name: string;
  myPersona: string;
  theirPersona: string;
  circleId: string;
  requestId?: string;
  hubRole?: string;
  messages: DemoMessage[];
  unread: number;
  muted: boolean;
  hidden: boolean;
  blocked: boolean;
  reported: boolean;
};

const SAMPLE_THREADS: DemoThread[] = [
  {
    id: "th-aarav", kind: "connection", personId: "aarav", name: "Aarav Shah", myPersona: "Main card", theirPersona: "Business", circleId: "sunday-builders", requestId: "rq-aarav",
    messages: [
      { id: "m1", from: "system", text: "You connected in Sunday Builders on Sep 30.", at: "Sep 30" },
      { id: "m2", from: "me", text: "Thanks for accepting! Happy to swap notes on pricing pages.", at: "Sep 30, 18:04", status: "sent" },
      { id: "m3", from: "them", text: "Great, I’m launching next week. Could you look at the tiers section?", at: "Oct 1, 09:12" },
      { id: "m4", from: "me", text: "Sure, send me the link when it’s ready.", at: "Oct 1, 09:30", status: "sent" },
      { id: "m5", from: "them", text: "Here it is: the page is live on staging now. No rush!", at: "25m ago" },
    ],
    unread: 1, muted: false, hidden: false, blocked: false, reported: false,
  },
  {
    id: "th-hub", kind: "hub", personId: "sneha", name: "Sneha Kulkarni", myPersona: "Main card", theirPersona: "Level 2 Admin", circleId: "health-hub", hubRole: "Your Level 2 Admin · Andheri West",
    messages: [
      { id: "h1", from: "system", text: "Hub conversation with your assigned Level 2 Admin. Other participants can’t see it.", at: "Oct 2" },
      { id: "h2", from: "them", text: "Welcome to the Andheri West branch. Message me here with any questions about Saturday outreach.", at: "Oct 2, 10:00" },
    ],
    unread: 0, muted: false, hidden: false, blocked: false, reported: false,
  },
];

export function useMessagingDemo() {
  const [threads, setThreads] = useState<DemoThread[]>(SAMPLE_THREADS);
  const [online, setOnline] = useState(true);
  const timers = useRef<number[]>([]);
  const counter = useRef(1);

  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);

  const nextId = () => `msg-${Date.now().toString(36)}-${counter.current++}`;
  const patch = (id: string, update: (thread: DemoThread) => DemoThread) => setThreads((current) => current.map((thread) => thread.id === id ? update(thread) : thread));
  const setMessageStatus = (threadId: string, messageId: string, status: MessageStatus) =>
    patch(threadId, (thread) => ({ ...thread, messages: thread.messages.map((message) => message.id === messageId ? { ...message, status } : message) }));

  // "Sent" means the server accepted it. A retry reuses the same message id, so it can't duplicate.
  function deliver(threadId: string, messageId: string, isOnline: boolean) {
    setMessageStatus(threadId, messageId, "sending");
    timers.current.push(window.setTimeout(() => setMessageStatus(threadId, messageId, isOnline ? "sent" : "failed"), 800));
  }

  function send(threadId: string, text: string) {
    const id = nextId();
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    patch(threadId, (thread) => ({ ...thread, hidden: false, messages: [...thread.messages, { id, from: "me", text: text.trim(), at: time, status: "sending" }] }));
    deliver(threadId, id, online);
  }

  function retry(threadId: string, messageId: string) {
    deliver(threadId, messageId, online);
  }

  function deleteMessage(threadId: string, messageId: string) {
    patch(threadId, (thread) => ({ ...thread, messages: thread.messages.map((message) => message.id === messageId ? { ...message, text: "", deleted: true } : message) }));
  }

  function findOrCreate(input: Omit<DemoThread, "id" | "messages" | "unread" | "muted" | "hidden" | "blocked" | "reported">) {
    const existing = threads.find((thread) => thread.personId === input.personId && thread.circleId === input.circleId && thread.myPersona === input.myPersona);
    if (existing) {
      if (existing.hidden) patch(existing.id, (thread) => ({ ...thread, hidden: false }));
      return existing.id;
    }
    const id = `th-${input.personId}-${counter.current++}`;
    setThreads((current) => [{ ...input, id, messages: [{ id: nextId(), from: "system", text: "You’re connected. Messages are text only.", at: "Today" }], unread: 0, muted: false, hidden: false, blocked: false, reported: false }, ...current]);
    return id;
  }

  return {
    threads,
    online,
    setOnline,
    send,
    retry,
    deleteMessage,
    findOrCreate,
    markRead: (id: string) => patch(id, (thread) => ({ ...thread, unread: 0 })),
    setMuted: (id: string, muted: boolean) => patch(id, (thread) => ({ ...thread, muted })),
    setHidden: (id: string, hidden: boolean) => patch(id, (thread) => ({ ...thread, hidden })),
    setBlocked: (id: string, blocked: boolean) => patch(id, (thread) => ({ ...thread, blocked })),
    report: (id: string) => patch(id, (thread) => ({ ...thread, reported: true })),
    escalate: (id: string) => patch(id, (thread) => ({
      ...thread,
      messages: [...thread.messages, { id: nextId(), from: "system", text: "You asked for this to be escalated. Your Level 2 Admin can pass it to your branch’s Level 1 Admin.", at: "Now" }],
    })),
  };
}

export type MessagingDemo = ReturnType<typeof useMessagingDemo>;

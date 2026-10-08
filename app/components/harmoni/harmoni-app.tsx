"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AppHeader, BottomNav, MenuSheet, type MenuAction } from "./navigation";
import {
  AccessLogScreen,
  CircleScreen,
  CircleNameSheet,
  CircleSetupScreen,
  ContactCardScreen,
  ContactDetailScreen,
  ContactEntrySheet,
  ContactsScreen,
  DeleteAccountSheet,
  DeleteCardSheet,
  DemoAuthScreen,
  DesignScreen,
  DetailsScreen,
  LogoScreen,
  MyCardScreen,
  PhotoScreen,
  PreviewScreen,
  ScanScreen,
  ScreenErrorBoundary,
  SetupGuide,
  ShareLinkSheet,
  WelcomeScreen,
} from "./screens";
import {
  GuestCirclePreviewScreen,
  JoinCodeScreen,
  PersonaHubScreen,
  PersonaOnboardingScreen,
  PersonaPermissionsScreen,
  PersonaReviewScreen,
  PersonaStartScreen,
  PersonaTypeScreen,
} from "./phase-one-screens";
import { DossierScreen } from "./dossier-screen";
import {
  CircleDetailScreen,
  CircleJoinScreen,
  CircleLinkScreen,
  CirclesHomeScreen,
  CreateCircleScreen,
  HubApplyScreen,
  HubStructureScreen,
  ManageCircleScreen,
  type ManageSection,
} from "./circle-screens";
import {
  CardCaptureScreen,
  CardInvitesScreen,
  ScanModeTabs,
  ShareEntryScreen,
  type EntryDestination,
} from "./entry-share-screens";
import { EMPTY_CIRCLE_DRAFT, joinCodeToCircle, useCircleDemo } from "./circle-data";
import { Icon } from "./ui";
import { useConnectDemo, type ConnRequest, type DemoMatch } from "./connect-data";
import { useMessagingDemo, useNotificationsDemo, type DemoNotification, type DemoThread } from "./notify-data";
import { NotificationSettingsScreen, NotificationsScreen } from "./notify-screens";
import { MessagesInboxScreen, ThreadScreen, type ThreadAccess } from "./message-screens";
import { useAdminDemo, useImpactDemo } from "./impact-data";
import { CircleInsights, FeedbackScreen, ImpactEntryCard, ImpactScreen, TopContributorsCard } from "./impact-screens";
import { AdminScreen } from "./admin-screens";
import { OfflineBanner, RestoringState } from "./app-states";
import { PrivacyScreen } from "./privacy-screens";
import {
  ExpressInterestScreen,
  HelpOfferScreen,
  HelpRequestScreen,
  MatchesHubScreen,
  RequestReviewScreen,
  type HelpTarget,
  type PersonaOption,
} from "./connect-screens";
import { SpotlightAskScreen, SpotlightCard, SpotlightManagerScreen, type SpotlightTab } from "./spotlight-screens";
import {
  INITIAL_PROFILE,
  type Contact,
  type PersonaDraft,
  type PersonaPreview,
  type PersonaType,
  type Profile,
  type Tab,
  type View,
} from "./types";

const SESSION_KEY = "harmoni_demo_session";

type CircleRoute =
  | { name: "home" }
  | { name: "personal" }
  | { name: "detail"; id: string }
  | { name: "manage"; id: string; section: ManageSection }
  | { name: "hub"; id: string }
  | { name: "spotlight"; id: string; tab: SpotlightTab };

function toDemoCardPayload(profile: Profile, sessionToken: string, status?: "draft" | "published") {
  const fields = profile.fields
    .filter((field) => field.value.trim())
    .map((field, order) => ({
    label: field.label,
    value: field.value,
    kind: field.id === "website" ? "web" : field.id,
    abbreviation: field.abbreviation,
    color: field.color,
    visible: true,
    order,
  }));
  for (const item of [
    { label: "Email", value: profile.email, kind: "email", abbreviation: "em", color: "#0a84ff" },
    { label: "Phone", value: profile.phone, kind: "phone", abbreviation: "ph", color: "#34c759" },
  ]) {
    if (item.value.trim() && !fields.some((field) => field.kind === item.kind)) {
      fields.push({ ...item, visible: true, order: fields.length });
    }
  }

  return {
    sessionToken,
    fullName: profile.name,
    jobTitle: profile.title,
    company: profile.company,
    headline: profile.headline,
    photoStorageId: profile.photoStorageId,
    coverStorageId: profile.coverStorageId,
    logoStorageId: profile.logoStorageId,
    logoMode: profile.logo === "auto" ? "auto" as const : profile.logoStorageId ? "image" as const : null,
    squarePhoto: profile.squarePhoto,
    qrOnBack: profile.qrOnBack,
    includeMeetingPlace: profile.includeMeetingPlace,
    fields,
    theme: {
      style: String(profile.art),
      accentColor: "#1d5647",
      backgroundColor: "#f8f7f2",
      textColor: "#18352e",
    },
    ...(status ? { status } : {}),
  };
}

function optimizeImage(file: File, maxDimension: number, format: "image/jpeg" | "image/png") {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Could not read this image."));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("This image could not be opened."));
      image.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Image processing is not available in this browser."));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL(format, format === "image/jpeg" ? 0.82 : undefined));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

type SessionEnd = { screen: View; toast?: string; authError?: string };

export default function HarmoniApp() {
  // Ending a session remounts the app so no sample or in-memory state carries over to the next person.
  const [epoch, setEpoch] = useState(0);
  const [sessionEnd, setSessionEnd] = useState<SessionEnd | null>(null);
  const endSession = useCallback((next: SessionEnd) => {
    setSessionEnd(next);
    setEpoch((current) => current + 1);
  }, []);
  return (
    <ScreenErrorBoundary
      section="Harmoni"
      recoverLabel="Sign in again"
      onRecover={() => {
        try {
          localStorage.removeItem(SESSION_KEY);
        } catch {}
        endSession({ screen: "auth", authError: "Your session ended. Sign in again." });
      }}
    >
      <HarmoniAppContent
        key={epoch}
        initial={sessionEnd}
        onSessionEnded={endSession}
      />
    </ScreenErrorBoundary>
  );
}

function HarmoniAppContent({ initial, onSessionEnded }: { initial: SessionEnd | null; onSessionEnded: (next: SessionEnd) => void }) {
  const router = useRouter();
  const [screen, setScreen] = useState<View>(initial?.screen ?? "welcome");
  const [returnTo, setReturnTo] = useState<View>("home");
  const [profile, setProfile] = useState<Profile>(INITIAL_PROFILE);
  const [activeTab, setActiveTab] = useState<Tab>("you");
  const [personaDraft, setPersonaDraft] = useState<PersonaDraft>({
    type: "business",
    name: "Work",
    needs: "",
    offers: "",
    interests: "",
    visibility: "private",
    publicFields: ["name", "card"],
  });
  const [personaPreviews, setPersonaPreviews] = useState<PersonaPreview[]>([]);
  const [activePersonaId, setActivePersonaId] = useState<string | null>(null);
  const [editingPersonaId, setEditingPersonaId] = useState<string | null>(null);
  const [personaGatePending, setPersonaGatePending] = useState(false);
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [circleName, setCircleName] = useState("");
  const [query, setQuery] = useState("");
  const [shared, setShared] = useState(false);
  const [pendingShareBackSlug, setPendingShareBackSlug] = useState<string | null>(null);
  const [matchingSuggestions, setMatchingSuggestions] = useState<{
    _id: Id<"matchSuggestions">;
    targetUserId: Id<"users">;
    targetName: string;
    reason: string;
    score: number;
  }[]>([]);
  const [selectedContactId, setSelectedContactId] = useState<Id<"contacts"> | null>(null);
  const [contactView, setContactView] = useState<"detail" | "card" | null>(null);
  const [entryValue, setEntryValue] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [demoSession, setDemoSession] = useState<string | null>(null);
  const [demoUserId, setDemoUserId] = useState<Id<"users"> | null>(null);
  const [demoMe, setDemoMe] = useState<{
    userId: Id<"users">;
    username: string;
    fullName: string;
    hasCard: boolean;
  } | null | undefined>(undefined);
  const [authMode, setAuthMode] = useState<"signup" | "signin" | "forgot" | "reset">("signin");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authResetCode, setAuthResetCode] = useState("");
  const [authResetCodeValue, setAuthResetCodeValue] = useState("");
  const [authError, setAuthError] = useState(initial?.authError ?? "");
  const [authBusy, setAuthBusy] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [sheet, setSheet] = useState<"menu" | "setup" | "tag" | "note" | "met" | "circle-name" | "delete-account" | "delete-card" | "share-link" | null>(null);
  const [toast, setToast] = useState(initial?.toast ?? "");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deletingCard, setDeletingCard] = useState(false);
  const circleDemo = useCircleDemo();
  const [circleRoute, setCircleRoute] = useState<CircleRoute>({ name: "home" });
  const [entryCircleId, setEntryCircleId] = useState("creative-founders");
  const [joinIntentId, setJoinIntentId] = useState<string | null>(null);
  const [joinCircleId, setJoinCircleId] = useState<string | null>(null);
  const [linkCircleId, setLinkCircleId] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState<"qr" | "card">("qr");
  const [shareEntryInit, setShareEntryInit] = useState({ personaId: "main", destinationId: "personal", returnTo: "home" as View });
  const [personaFlowFrom, setPersonaFlowFrom] = useState<View>("welcome");
  const [dossierReturn, setDossierReturn] = useState<View>("persona-onboarding");
  const connectDemo = useConnectDemo();
  const [interestMatch, setInterestMatch] = useState<DemoMatch | null>(null);
  const [reviewRequestId, setReviewRequestId] = useState<string | null>(null);
  const [helpTarget, setHelpTarget] = useState<HelpTarget | null>(null);
  const [spotlightAskCircleId, setSpotlightAskCircleId] = useState<string | null>(null);
  const [connectReturnTab, setConnectReturnTab] = useState<Tab>("matches");
  const notificationsDemo = useNotificationsDemo();
  const messagingDemo = useMessagingDemo();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadReturn, setThreadReturn] = useState<View>("messages");
  const [messagesReturn, setMessagesReturn] = useState<View>("home");
  const [messagesReturnTab, setMessagesReturnTab] = useState<Tab>("notifications");
  const [pendingAlertId, setPendingAlertId] = useState<string | null>(null);
  const impactDemo = useImpactDemo();
  const adminDemo = useAdminDemo();
  const [feedbackId, setFeedbackId] = useState<string | null>(null);
  const [feedbackReturn, setFeedbackReturn] = useState<"impact" | "notifications">("notifications");
  const restoredDemoUser = useRef<string | null>(null);
  const personaIdCounter = useRef(1);
  const tabScrollPositions = useRef(new Map<Tab, number>());
  const lastSavedProfile = useRef("");
  const signUpDemo = useAction(api.auth.signUp);
  const logInDemo = useAction(api.auth.logIn);
  const requestPasswordReset = useAction(api.auth.requestReset);
  const resetDemoPassword = useAction(api.auth.resetPassword);
  const getDemoMe = useAction(api.auth.me);
  const logoutDemo = useAction(api.auth.logOut);
  const removeDemoAccount = useAction(api.auth.deleteAccount);
  const startDemoOver = useAction(api.auth.startOver);
  const saveDemoProfile = useMutation(api.cards.saveDemoProfile);
  const removeDemoCard = useMutation(api.cards.deleteMine);
  const createDemoImageUploadUrl = useMutation(api.cards.generateDemoImageUploadUrl);
  const registerDemoImageUpload = useMutation(api.cards.registerDemoImageUpload);
  const recordCardShare = useMutation(api.cards.recordShare);
  const updateContact = useMutation(api.contacts.updateDetails);
  const addContactNote = useMutation(api.contacts.addNote);
  const sendExchange = useMutation(api.exchanges.send);
  const acceptExchange = useMutation(api.exchanges.accept);
  const declineExchange = useMutation(api.exchanges.decline);
  const requestIntroduction = useMutation(api.intros.request);
  const decideIntroduction = useMutation(api.intros.decide);
  const renameMyCircle = useMutation(api.circles.rename);
  const createPersonaItem = useMutation(api.persona.create);
  const updatePersonaItem = useMutation(api.persona.update);
  const approvePersonaItem = useMutation(api.persona.approve);
  const archivePersonaItem = useMutation(api.persona.archive);
  const setPersonaVisibility = useMutation(api.persona.setVisibility);
  const grantPersonaAccess = useMutation(api.persona.grant);
  const revokePersonaAccess = useMutation(api.persona.revoke);
  const refreshMatches = useMutation(api.matching.refresh);
  const dismissMatch = useMutation(api.matching.dismiss);
  const seedDemoData = useMutation(api.seeds.seedDemoData);
  // Session-scoped queries wait until the stored token is confirmed, so a stale token can't crash the app.
  const sessionConfirmed = hydrated && Boolean(demoMe);
  const demoCard = useQuery(
    api.cards.getPrimaryDemo,
    sessionConfirmed && demoSession ? { sessionToken: demoSession } : "skip",
  );
  const contactPage = useQuery(
    api.contacts.listMine,
    sessionConfirmed && demoSession ? { sessionToken: demoSession, paginationOpts: { numItems: 100, cursor: null } } : "skip",
  );
  const progress = useQuery(api.progress.mine, sessionConfirmed && demoSession ? { sessionToken: demoSession } : "skip");
  const myCircle = useQuery(api.circles.mine, sessionConfirmed && demoSession ? { sessionToken: demoSession } : "skip");
  const exchangeInbox = useQuery(api.exchanges.inbox, sessionConfirmed && demoSession ? { sessionToken: demoSession } : "skip");
  const introInbox = useQuery(api.intros.inbox, sessionConfirmed && demoSession ? { sessionToken: demoSession } : "skip");
  const sentIntroRequests = useQuery(api.intros.sentMine, sessionConfirmed && demoSession ? { sessionToken: demoSession } : "skip");
  const personaItems = useQuery(api.persona.mine, sessionConfirmed && demoSession ? { sessionToken: demoSession } : "skip");
  const accessLog = useQuery(
    api.persona.accessLogMine,
    sessionConfirmed && demoSession && screen === "access-log" ? { sessionToken: demoSession } : "skip",
  );
  const xp = progress?.xp ?? 0;
  const awardedBadges = progress?.awardedBadges ?? [];
  const contacts = useMemo<Contact[]>(() => (contactPage?.page ?? []).map((contact) => {
    const card = contact.linkedCard;
    const snapshot = contact.snapshot;
    const fields = card?.fields ?? snapshot.fields;
    const introRequested = (sentIntroRequests ?? []).some((request) =>
      request.status === "pending" && request.introducerId === contact.linkedUserId,
    );
    return {
      id: contact._id,
      ...(contact.linkedUserId ? { linkedUserId: contact.linkedUserId } : {}),
      publicUrl: card?.slug ? (typeof window === "undefined" ? `/c/${card.slug}` : `${window.location.origin}/c/${card.slug}`) : "",
      name: card?.fullName ?? snapshot.fullName,
      title: card?.jobTitle ?? snapshot.jobTitle ?? "",
      company: card?.company ?? snapshot.company ?? "",
      email: fields.find((field) => field.kind === "email")?.value ?? "",
      phone: fields.find((field) => field.kind === "phone")?.value ?? "",
      photo: contact.photoUrl ?? "",
      when: new Date(contact.metAt ?? contact.createdAt).toLocaleDateString(),
      source: contact.source.replaceAll("_", " "),
      canRequestIntros: contact.canRequestIntros,
      ...(contact.introducedByName ? { introducedByName: contact.introducedByName } : {}),
      tags: contact.tags,
      notes: contact.notes.map((note) => ({ text: note.body, at: new Date(note.createdAt).toLocaleString() })),
      met: contact.metLocation ?? "",
      introRequested,
    };
  }), [contactPage, sentIntroRequests]);
  const selectedContact = contacts.find((contact) => contact.id === selectedContactId);
  const introNetwork = useQuery(
    api.circles.network,
    sessionConfirmed && demoSession && selectedContact?.canRequestIntros && selectedContact.linkedUserId
      ? { sessionToken: demoSession, introducerId: selectedContact.linkedUserId }
      : "skip",
  );

  async function persistDemoProfile(nextProfile: Profile, status: "draft" | "published" = "draft") {
    if (!demoSession) throw new Error("Sign in before saving your card.");
    const saved = await saveDemoProfile(toDemoCardPayload(nextProfile, demoSession, status));
    const savedProfile = {
      ...nextProfile,
      publicUrl: typeof window === "undefined" ? `/c/${saved.slug}` : `${window.location.origin}/c/${saved.slug}`,
      photo: saved.photoUrl ?? "",
      cover: saved.coverUrl ?? "",
      logo: nextProfile.logo === "auto" ? "auto" : saved.logoUrl ?? "",
    };
    lastSavedProfile.current = JSON.stringify(savedProfile);
    return savedProfile;
  }

  async function uploadProfileImage(dataUrl: string, sessionToken: string) {
    const uploadUrl = await createDemoImageUploadUrl({ sessionToken });
    const image = await fetch(dataUrl).then((response) => response.blob());
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": image.type },
      body: image,
    });
    if (!response.ok) throw new Error("The image could not be uploaded. Try again.");
    const upload = await response.json() as { storageId: Id<"_storage"> };
    await registerDemoImageUpload({ sessionToken, storageId: upload.storageId });
    return upload.storageId;
  }

  // Restore only the demo session token; all profile and networking data comes from Convex.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const session = localStorage.getItem(SESSION_KEY);
      if (session) setDemoSession(session);
    } catch {}
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!hydrated) return;
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("shareback");
    if (slug) setPendingShareBackSlug(slug);
    // QR codes, NFC tags, shared links and join codes all resolve to the same circle entry.
    const alertId = params.get("alert");
    if (alertId) {
      setPendingAlertId(alertId);
      let hasSession = false;
      try {
        hasSession = Boolean(localStorage.getItem(SESSION_KEY));
      } catch {}
      if (!hasSession) {
        setAuthMode("signin");
        setScreen("auth");
      }
    }
    const joinCode = params.get("join");
    const joinCircle = joinCode ? joinCodeToCircle(circleDemo.circles, joinCode) : undefined;
    if (joinCircle) {
      let signedIn = false;
      try {
        signedIn = Boolean(localStorage.getItem(SESSION_KEY));
      } catch {}
      if (signedIn) {
        setActiveTab("circles");
        setCircleRoute({ name: "detail", id: joinCircle.id });
      } else {
        setEntryCircleId(joinCircle.id);
        setScreen("guest-preview");
      }
    }
  // The sample circles are only read once, when an entry link first opens the app.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!hydrated || !demoSession) {
      setDemoMe(undefined);
      return;
    }
    let active = true;
    void getDemoMe({ sessionToken: demoSession })
      .then((user) => { if (active) setDemoMe(user); })
      .catch(() => { if (active) setDemoMe(null); });
    return () => { active = false; };
  }, [demoSession, getDemoMe, hydrated]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!demoSession || demoMe === undefined) return;
    if (!demoMe) {
      localStorage.removeItem(SESSION_KEY);
      setDemoSession(null);
      setDemoUserId(null);
      setProfile(INITIAL_PROFILE);
      setPersonaPreviews([]);
      setActivePersonaId(null);
      setEditingPersonaId(null);
      setPersonaGatePending(false);
      onSessionEnded({ screen: "auth", authError: "Your session expired. Sign in again." });
      return;
    }
    setDemoUserId(demoMe.userId);
  }, [demoMe, demoSession, onSessionEnded]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!demoSession || !demoUserId || demoCard === undefined) return;
    if (restoredDemoUser.current === demoUserId) return;
    restoredDemoUser.current = demoUserId;
    if (demoCard) {
      const storedArt = Number.parseInt(demoCard.theme.style, 10);
      const cardFields = demoCard.fields.map((field: {
        kind: string;
        label: string;
        abbreviation?: string;
        color?: string;
        value: string;
      }) => ({
        id: field.kind,
        label: field.label,
        abbreviation: field.abbreviation ?? field.kind.slice(0, 2),
        color: field.color ?? "#1d5647",
        value: field.value,
      }));
      const restoredProfile: Profile = {
        ...INITIAL_PROFILE,
        name: demoCard.fullName,
        title: demoCard.jobTitle ?? "",
        company: demoCard.company ?? "",
        headline: demoCard.headline ?? "",
        publicUrl: `${window.location.origin}/c/${demoCard.slug}`,
        email: cardFields.find((field) => field.id === "email")?.value ?? "",
        phone: cardFields.find((field) => field.id === "phone")?.value ?? "",
        photo: demoCard.photoUrl ?? profile.photo,
        photoStorageId: demoCard.photoStorageId ?? profile.photoStorageId,
        cover: demoCard.coverUrl ?? profile.cover,
        coverStorageId: demoCard.coverStorageId ?? profile.coverStorageId,
        logo: demoCard.logoMode === "auto" ? "auto" : demoCard.logoUrl ?? profile.logo,
        logoStorageId: demoCard.logoStorageId ?? profile.logoStorageId,
        squarePhoto: demoCard.squarePhoto ?? profile.squarePhoto,
        qrOnBack: demoCard.qrOnBack ?? profile.qrOnBack,
        includeMeetingPlace: demoCard.includeMeetingPlace ?? profile.includeMeetingPlace,
        fields: cardFields.length ? cardFields.filter((field) => field.id !== "email" && field.id !== "phone") : profile.fields,
        art: Number.isFinite(storedArt) ? storedArt : profile.art,
      };
      lastSavedProfile.current = JSON.stringify(restoredProfile);
      setProfile(restoredProfile);
      setCircleName(restoredProfile.circle);
      setScreen(demoCard.status === "published" ? "home" : "details");

      const hasLegacyImages =
        (restoredProfile.photo.startsWith("data:image/") && !restoredProfile.photoStorageId)
        || (restoredProfile.cover.startsWith("data:image/") && !restoredProfile.coverStorageId)
        || (restoredProfile.logo.startsWith("data:image/") && !restoredProfile.logoStorageId);
      if (demoSession && (demoCard.profileVersion !== 1 || hasLegacyImages)) {
        void (async () => {
          const migratedProfile = { ...restoredProfile };
          if (migratedProfile.photo.startsWith("data:image/") && !migratedProfile.photoStorageId) {
            migratedProfile.photoStorageId = await uploadProfileImage(migratedProfile.photo, demoSession);
          }
          if (migratedProfile.cover.startsWith("data:image/") && !migratedProfile.coverStorageId) {
            migratedProfile.coverStorageId = await uploadProfileImage(migratedProfile.cover, demoSession);
          }
          if (migratedProfile.logo.startsWith("data:image/") && !migratedProfile.logoStorageId) {
            migratedProfile.logoStorageId = await uploadProfileImage(migratedProfile.logo, demoSession);
          }
          if (
            migratedProfile.photoStorageId !== restoredProfile.photoStorageId
            || migratedProfile.coverStorageId !== restoredProfile.coverStorageId
            || migratedProfile.logoStorageId !== restoredProfile.logoStorageId
          ) {
            try {
              setProfile(await persistDemoProfile(migratedProfile, demoCard.status === "published" ? "published" : "draft"));
            } catch (error) {
              setToast(error instanceof Error ? error.message : "An older card image could not be saved.");
            }
          }
        })().catch(() => setToast("An older card image could not be uploaded."));
      }
    } else if (screen === "welcome" || screen === "auth") {
      setScreen("details");
    }
  // A card query also updates while onboarding saves a draft; only use it to restore profile state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoCard, demoSession, demoUserId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!myCircle) return;
    setCircleName(myCircle.name);
    setProfile((current) => current.circle === myCircle.name ? current : { ...current, circle: myCircle.name });
  }, [myCircle]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (screen !== "home" || (activeTab !== "circles" && activeTab !== "matches") || !demoSession) return;
    let active = true;
    void refreshMatches({ sessionToken: demoSession })
      .then((suggestions) => { if (active) setMatchingSuggestions(suggestions); })
      .catch((error: unknown) => {
        if (active) setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Matches could not be refreshed.");
      });
    return () => { active = false; };
  }, [activeTab, demoSession, refreshMatches, screen]);

  useEffect(() => {
    if (!hydrated || !demoSession || !demoUserId || demoCard === undefined || !profile.name.trim()) return;
    if (screen !== "details" && screen !== "design" && screen !== "home") return;
    const snapshot = JSON.stringify(profile);
    if (snapshot === lastSavedProfile.current) return;
    const timeout = window.setTimeout(() => {
      setSavingCard(true);
      void saveDemoProfile(toDemoCardPayload(profile, demoSession, demoCard?.status === "published" ? "published" : "draft"))
        .then((saved) => {
          const savedProfile = {
            ...profile,
            publicUrl: `${window.location.origin}/c/${saved.slug}`,
            photo: saved.photoUrl ?? "",
            cover: saved.coverUrl ?? "",
            logo: profile.logo === "auto" ? "auto" : saved.logoUrl ?? "",
          };
          lastSavedProfile.current = JSON.stringify(savedProfile);
          setProfile((current) => current.publicUrl === savedProfile.publicUrl
            ? current
            : { ...current, publicUrl: savedProfile.publicUrl });
          setToast("Saved");
        })
        .catch((error: unknown) => {
          setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Your card could not be saved.");
        })
        .finally(() => setSavingCard(false));
    }, 650);
    return () => window.clearTimeout(timeout);
  }, [demoCard, demoSession, demoUserId, hydrated, profile, saveDemoProfile, screen]);

  useEffect(() => {
    document.body.classList.toggle("w", screen === "welcome");
    return () => document.body.classList.remove("w");
  }, [screen]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function navigate(next: View, restoreTab: Tab = activeTab) {
    if (screen === "home" && next !== "home" && typeof window !== "undefined") {
      tabScrollPositions.current.set(activeTab, window.scrollY);
    }
    setScreen(next);
    setSheet(null);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        const top = next === "home" ? tabScrollPositions.current.get(restoreTab) ?? 0 : 0;
        window.scrollTo({ top, behavior: "auto" });
      });
    }
  }

  function updateText(field: "name" | "title" | "company" | "headline" | "email" | "phone", value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function startPersonaFlow(from: View = demoSession ? "home" : "welcome") {
    setPersonaFlowFrom(from);
    setAdultConfirmed(false);
    setPersonaDraft({
      type: "business",
      name: "Work",
      needs: "",
      offers: "",
      interests: "",
      visibility: "private",
      publicFields: ["name", "card"],
    });
    setEditingPersonaId(null);
    setPersonaGatePending(false);
    navigate("persona-select");
  }

  function changePersonaType(type: PersonaType) {
    const defaultNames: Record<PersonaType, string> = {
      business: "Work",
      personal: "Personal",
      singles: "Dating",
      family: "Family",
      custom: "My persona",
    };
    setPersonaDraft((current) => ({ ...current, type, name: defaultNames[type] }));
  }

  function updatePersonaDraft(field: "needs" | "offers" | "interests", value: string) {
    setPersonaDraft((current) => ({ ...current, [field]: value }));
  }

  function togglePersonaPublicField(field: string) {
    setPersonaDraft((current) => ({
      ...current,
      publicFields: current.publicFields.includes(field)
        ? current.publicFields.filter((item) => item !== field)
        : [...current.publicFields, field],
    }));
  }

  function editPersonaPreview(persona: PersonaPreview) {
    setPersonaDraft({ ...persona, publicFields: [...persona.publicFields] });
    setEditingPersonaId(persona.id);
    navigate("persona-review");
  }

  function addMorePersonaContext(persona: PersonaPreview) {
    setPersonaDraft({ ...persona, publicFields: [...persona.publicFields] });
    setEditingPersonaId(persona.id);
    navigate("persona-onboarding");
  }

  function discardPersonaDraft() {
    if (personaGatePending && activePersonaId) removePersonaPreview(activePersonaId);
    setEditingPersonaId(null);
    setPersonaGatePending(false);
    setPersonaDraft({
      type: "business",
      name: "Work",
      needs: "",
      offers: "",
      interests: "",
      visibility: "private",
      publicFields: ["name", "card"],
    });
    if (demoSession) navigate(demoCard ? "home" : "details", "you");
    else navigate("welcome");
  }

  function confirmPersonaPreview() {
    const id = editingPersonaId ?? `persona-preview-${personaIdCounter.current++}`;
    const preview: PersonaPreview = { ...personaDraft, id };
    setPersonaPreviews((current) => current.some((persona) => persona.id === id)
      ? current.map((persona) => persona.id === id ? preview : persona)
      : [...current, preview]);
    setActivePersonaId(id);
    setEditingPersonaId(id);

    // The "taking shape" moment is shown only when approved input actually updated the persona.
    if ([personaDraft.needs, personaDraft.offers, personaDraft.interests].some((value) => value.trim())) {
      navigate("persona-started");
      return;
    }
    continueAfterPersona();
  }

  function continueAfterPersona() {
    if (!demoSession) {
      setPersonaGatePending(true);
      setAuthMode("signup");
      setAuthError("");
      setAuthPassword("");
      setAuthResetCode("");
      navigate("auth");
      return;
    }

    setPersonaGatePending(false);
    setEditingPersonaId(null);
    if (demoCard) {
      setActiveTab("you");
      navigate("home", "you");
      setToast("Persona preview added for this session.");
    } else {
      navigate("details");
    }
  }

  function openDossier(returnTo: View, persona?: PersonaPreview) {
    if (persona) {
      setPersonaDraft({ ...persona, publicFields: [...persona.publicFields] });
      setEditingPersonaId(persona.id);
    }
    setDossierReturn(returnTo);
    navigate("dossier");
  }

  function applyDossier(facts: string[], targetId: string) {
    const addBackground = (interests: string) => facts.length
      ? [interests.trim(), `Background: ${facts.join("; ")}`].filter(Boolean).join("\n").slice(0, 500)
      : interests;
    const target = personaPreviews.find((persona) => persona.id === targetId);
    if (target && targetId !== editingPersonaId) {
      const updated = { ...target, interests: addBackground(target.interests) };
      setPersonaPreviews((current) => current.map((persona) => persona.id === targetId ? updated : persona));
      setPersonaDraft({ ...updated, publicFields: [...updated.publicFields] });
      setEditingPersonaId(targetId);
    } else {
      setPersonaDraft((current) => ({ ...current, interests: addBackground(current.interests) }));
    }
    navigate("persona-onboarding");
  }

  function removePersonaPreview(id: string) {
    // Deleting a persona closes what was done as it; other personas are untouched.
    const removed = personaPreviews.find((persona) => persona.id === id);
    if (removed) {
      connectDemo.requests
        .filter((request) => request.direction === "sent" && request.persona === removed.name && ["pending", "host-review", "approved"].includes(request.status))
        .forEach((request) => connectDemo.withdraw(request.id));
      if (connectDemo.matchScope.persona === removed.name) connectDemo.setMatchScope((current) => ({ ...current, persona: "Main card" }));
    }
    setPersonaPreviews((current) => current.filter((persona) => persona.id !== id));
    setActivePersonaId((current) => current === id ? null : current);
    setEditingPersonaId((current) => current === id ? null : current);
  }

  function clearPersonaPreviews() {
    setJoinIntentId(null);
    setCircleRoute({ name: "home" });
    setPersonaPreviews([]);
    setActivePersonaId(null);
    setEditingPersonaId(null);
    setPersonaGatePending(false);
  }

  function openContacts() {
    if (typeof window !== "undefined") tabScrollPositions.current.set(activeTab, window.scrollY);
    setActiveTab("contacts");
    setQuery("");
    setContactView(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitDemoAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authBusy) return;
    setAuthBusy(true);
    setAuthError("");

    try {
      if (authMode === "forgot") {
        const result = await requestPasswordReset({ username: authUsername });
        if (!result.resetCode) {
          setAuthError("No demo account was found for that username or email.");
          return;
        }
        setAuthResetCode(result.resetCode);
        setAuthResetCodeValue("");
        setAuthMode("reset");
        return;
      }
      if (authMode === "reset") {
        await resetDemoPassword({ code: authResetCodeValue, newPassword: authPassword });
        setAuthMode("signin");
        setAuthPassword("");
        setAuthResetCode("");
        setAuthResetCodeValue("");
        setToast("Your password was reset. Sign in with your new password.");
        return;
      }
      const result = authMode === "signup"
        ? await signUpDemo({ username: authUsername, password: authPassword })
        : await logInDemo({ username: authUsername, password: authPassword });

      restoredDemoUser.current = null;
      setDemoSession(result.sessionToken);
      setDemoUserId(result.userId);
      try {
        localStorage.setItem(SESSION_KEY, result.sessionToken);
      } catch {
        setToast("You’re signed in for this browser session.");
      }
      setAuthPassword("");
      setActiveTab("you");
      setPersonaGatePending(false);
      if (result.hasCard) {
        if (joinIntentId) setActiveTab("circles");
        navigate("home", joinIntentId ? "circles" : "you");
      } else {
        setProfile(INITIAL_PROFILE);
        navigate("details");
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "We couldn’t sign you in. Try again.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function continueDetails() {
    if (!profile.name.trim()) {
      setToast("Add your name to continue");
      return;
    }
    if (!demoSession) {
      navigate("auth");
      return;
    }
    setSavingCard(true);
    try {
      setProfile(await persistDemoProfile(profile, "draft"));
    } catch (error) {
      setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Your card couldn’t be saved.");
      setSavingCard(false);
      return;
    }
    setSavingCard(false);
    setCircleName((current) => current || `${profile.name.trim().split(/\s+/)[0]}'s Circle`);
    navigate("logo");
  }

  function handleImage(file: File, kind: "photo" | "logo" | "cover") {
    void optimizeImage(file, kind === "cover" ? 800 : 480, kind === "logo" ? "image/png" : "image/jpeg")
      .then(async (dataUrl) => {
        let storageId: Id<"_storage"> | null = null;
        if (demoSession) {
          storageId = await uploadProfileImage(dataUrl, demoSession);
        }

        const nextProfile: Profile = kind === "photo"
          ? { ...profile, photo: dataUrl, photoStorageId: storageId }
          : kind === "cover"
            ? { ...profile, cover: dataUrl, coverStorageId: storageId }
            : { ...profile, logo: dataUrl, logoStorageId: storageId };
        setProfile(nextProfile);

        if (demoSession) {
          setSavingCard(true);
          try {
            const status = demoCard?.status === "published" ? "published" : "draft";
            setProfile(await persistDemoProfile(nextProfile, status));
          } finally {
            setSavingCard(false);
          }
        }
        setToast(`${kind === "cover" ? "Cover" : kind === "photo" ? "Photo" : "Logo"} added to your card`);
      })
      .catch(() => setToast("We couldn’t use that image. Try another one."));
  }

  async function finishCircle() {
    const name = circleName.trim() || `${profile.name.split(/\s+/)[0]}'s Circle`;
    const completedProfile = { ...profile, circle: name };
    setProfile(completedProfile);
    if (demoSession) {
      setSavingCard(true);
      try {
        setProfile(await persistDemoProfile(completedProfile, "published"));
        await renameMyCircle({ sessionToken: demoSession, name });
      } catch (error) {
        setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Your card couldn’t be saved.");
        setSavingCard(false);
        return;
      }
      if (pendingShareBackSlug) {
        try {
          await sendExchange({ sessionToken: demoSession, slug: pendingShareBackSlug });
          setToast("Your card exchange request was sent.");
        } catch (error) {
          setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Your card is ready, but the exchange request could not be sent.");
        }
        setPendingShareBackSlug(null);
        router.replace("/");
      }
      setSavingCard(false);
    }
    setCircleName(name);
    const landingTab: Tab = joinIntentId ? "circles" : "you";
    setActiveTab(landingTab);
    navigate("home", landingTab);
  }

  async function continueLogo() {
    setSavingCard(true);
    try {
      setProfile(await persistDemoProfile(profile, "draft"));
      navigate("photo");
    } catch (error) {
      setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Your card couldn’t be saved.");
    } finally {
      setSavingCard(false);
    }
  }

  async function saveDesign() {
    setSavingCard(true);
    try {
      const status = demoCard?.status === "published" ? "published" : "draft";
      setProfile(await persistDemoProfile(profile, status));
      navigate(returnTo);
    } catch (error) {
      setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Your card couldn’t be saved.");
    } finally {
      setSavingCard(false);
    }
  }

  async function deleteAccount() {
    if (!demoSession) return;
    setDeletingAccount(true);
    try {
      await removeDemoAccount({ sessionToken: demoSession });
      try {
        localStorage.removeItem(SESSION_KEY);
      } catch {}

      restoredDemoUser.current = null;
      setDemoSession(null);
      setDemoUserId(null);
      setAuthUsername("");
      setAuthPassword("");
      setProfile(INITIAL_PROFILE);
      clearPersonaPreviews();
      setCircleName("");
      setShared(false);
      setContactView(null);
      setSelectedContactId(null);
      setActiveTab("you");
      setQuery("");
      setSheet(null);
      onSessionEnded({ screen: "auth", toast: "Your account was deleted." });
    } catch (error) {
      setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Your account couldn’t be deleted. Try again.");
    } finally {
      setDeletingAccount(false);
    }
  }

  async function deleteCard() {
    if (!demoSession) return;
    setDeletingCard(true);
    try {
      await removeDemoCard({ sessionToken: demoSession });
      setProfile(INITIAL_PROFILE);
      setCircleName("");
      setShared(false);
      setSheet(null);
      navigate("details");
      setToast("Your card was deleted.");
    } catch (error) {
      setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Your card could not be deleted.");
    } finally {
      setDeletingCard(false);
    }
  }

  function openDesign(from: View) {
    setReturnTo(from);
    navigate("design");
  }

  function clearDemoSession() {
    if (demoSession) void logoutDemo({ sessionToken: demoSession }).catch(() => undefined);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {}
    restoredDemoUser.current = null;
    setDemoSession(null);
    setDemoUserId(null);
    setAuthPassword("");
    setAuthUsername("");
    setProfile(INITIAL_PROFILE);
    clearPersonaPreviews();
    setCircleName("");
    setShared(false);
    setContactView(null);
    setSelectedContactId(null);
    setActiveTab("you");
    setAuthMode("signin");
    onSessionEnded({ screen: "auth", toast: "You’re signed out." });
  }

  async function resetDemo() {
    if (!demoSession) return;
    try {
      const result = await startDemoOver({ sessionToken: demoSession });
      localStorage.setItem(SESSION_KEY, result.sessionToken);
      restoredDemoUser.current = null;
      setDemoSession(result.sessionToken);
      setProfile(INITIAL_PROFILE);
      clearPersonaPreviews();
      setCircleName("");
      setShared(false);
      setActiveTab("you");
      setAuthUsername("");
      setAuthPassword("");
      onSessionEnded({ screen: "welcome", toast: "Your demo is ready to start over." });
    } catch (error) {
      setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "The demo could not be reset.");
    }
  }

  function shareCard() {
    setSheet(null);
    if (!demoCard?.slug) {
      setToast("Save your card before sharing it.");
      return;
    }
    setSheet("share-link");
    if (!shared) {
      setShared(true);
      if (demoSession) {
        void recordCardShare({ sessionToken: demoSession }).catch((error: unknown) => {
          setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Your share could not be recorded.");
        });
      }
    }
  }

  function handleScannedLink(link: string) {
    try {
      const url = new URL(link, window.location.origin);
      const match = url.pathname.match(/^\/c\/([^/]+)\/?$/);
      if (!match) throw new Error("Paste or scan a Harmoni card link.");
      router.push("/c/" + encodeURIComponent(match[1]));
    } catch (error) {
      setToast(error instanceof Error ? error.message : "That link is not a Harmoni card.");
    }
  }

  function handleMenuAction(action: MenuAction) {
    switch (action) {
      case "setup":
        setSheet("setup");
        break;
      case "design":
        openDesign("home");
        break;
      case "share":
        void shareCard();
        break;
      case "qr":
        setSheet(null);
        setActiveTab("you");
        setToast("Tap your card to reveal your QR");
        break;
      case "signature":
        setSheet(null);
        setToast(`${profile.name} · ${profile.title || "Harmoni"} · ${demoCard?.slug ? `${window.location.origin}/c/${demoCard.slug}` : "Save your card first"}`);
        break;
      case "scan":
        setSheet(null);
        changeTab("scan");
        break;
      case "access-log":
        navigate("access-log");
        break;
      case "seed-data":
        setSheet(null);
        if (demoSession) {
          void seedDemoData({ sessionToken: demoSession })
            .then(async (result) => {
              const suggestions = await refreshMatches({ sessionToken: demoSession });
              setMatchingSuggestions(suggestions);
              setToast(result.alreadyLoaded ? "Demo data is already loaded." : "Demo circle and matching context added.");
            })
            .catch((error: unknown) => setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Demo data could not be loaded."));
        }
        break;
      case "admin":
        setSheet(null);
        navigate("admin");
        break;
      case "privacy":
        setSheet(null);
        navigate("privacy");
        break;
      case "reset":
        setSheet(null);
        void resetDemo();
        break;
      case "signout":
        setSheet(null);
        clearDemoSession();
        break;
      case "delete-account":
        setSheet("delete-account");
        break;
      case "delete-card":
        setSheet("delete-card");
        break;
    }
  }

  // Destinations a person may share an entry to or invite a captured contact into.
  const entryDestinations: EntryDestination[] = [
    { id: "personal", name: `${myCircle?.name || profile.circle || "My circle"} (personal)`, code: null, url: profile.publicUrl || null },
    ...circleDemo.circles
      .filter((circle) => circle.published && circle.kind === "general"
        && (circle.role === "host" || (circle.status === "active" && circle.settings.whoCanInvite === "members")))
      .map((circle) => ({ id: circle.id, name: circle.name, code: circle.joinCode, url: null })),
  ];

  // A stored session is still being checked; show that instead of flashing the welcome or sign-in screen.
  const restoring = !hydrated || (Boolean(demoSession) && (screen === "welcome" || screen === "auth")
    && (demoMe === undefined || (demoMe !== null && demoCard === undefined)));
  const findCircle = (id: string | null) => circleDemo.circles.find((circle) => circle.id === id) ?? null;
  const entryCircle = findCircle(entryCircleId);
  const joinIntent = findCircle(joinIntentId);
  const joinCircle = findCircle(joinCircleId);
  const linkCircle = findCircle(linkCircleId);
  const routedCircle = circleRoute.name === "detail" || circleRoute.name === "manage" || circleRoute.name === "hub" || circleRoute.name === "spotlight" ? findCircle(circleRoute.id) : null;
  const personaOptions: PersonaOption[] = [{ name: "Main card", type: "main" }, ...personaPreviews.map((persona) => ({ name: persona.name, type: persona.type }))];
  const personaSignature = JSON.stringify(personaPreviews.map((persona) => [persona.id, persona.needs, persona.offers, persona.interests]));
  const reviewRequest = connectDemo.requests.find((request) => request.id === reviewRequestId) ?? null;
  const spotlightAskCircle = findCircle(spotlightAskCircleId);
  const activePersona = personaPreviews.find((persona) => persona.id === activePersonaId);

  function openConnectView(next: View) {
    setConnectReturnTab(activeTab);
    navigate(next);
  }

  const feedbackRequest = impactDemo.feedback.find((item) => item.id === feedbackId) ?? null;
  const activeThread = messagingDemo.threads.find((thread) => thread.id === threadId) ?? null;
  const unreadMessages = messagingDemo.threads.filter((thread) => !thread.hidden).reduce((sum, thread) => sum + thread.unread, 0);
  const unreadNotifications = notificationsDemo.items.filter((item) => !item.read).length;

  // Every send and open rechecks the connection grant, circle membership and block state.
  function threadAccess(thread: DemoThread): ThreadAccess {
    if (thread.blocked) return { allowed: false, reason: "blocked" };
    const circle = findCircle(thread.circleId);
    const member = Boolean(circle && (circle.status === "active" || circle.role === "host"));
    if (thread.kind === "hub") return member && circle?.hubStatus === "active" ? { allowed: true, reason: "ok" } : { allowed: false, reason: "left" };
    const request = connectDemo.requests.find((item) => item.id === thread.requestId) ?? connectDemo.connectionWith(thread.personId);
    if (!request || request.status === "withdrawn") return { allowed: false, reason: "withdrawn" };
    if (request.status !== "approved") return { allowed: false, reason: "left" };
    if (!request.grants?.chat) return { allowed: false, reason: "no-grant" };
    if (!member) return { allowed: false, reason: "left" };
    return { allowed: true, reason: "ok" };
  }

  function openThread(id: string, from: View = screen) {
    if (from === "messages" || from === "thread") setThreadReturn("messages");
    else {
      setThreadReturn("home");
      setMessagesReturnTab(from === "home" ? activeTab : connectReturnTab);
    }
    setThreadId(id);
    messagingDemo.markRead(id);
    notificationsDemo.items
      .filter((item) => item.destination.type === "thread" && item.destination.id === id && !item.read)
      .forEach((item) => notificationsDemo.markRead(item.id));
    navigate("thread");
  }

  function messageConnection(request: ConnRequest) {
    const id = messagingDemo.findOrCreate({
      kind: "connection",
      personId: request.personId,
      name: request.name,
      myPersona: request.direction === "sent" ? request.persona : connectDemo.matchScope.persona,
      theirPersona: request.direction === "incoming" ? request.persona : "Business",
      circleId: request.circleId,
      requestId: request.id,
    });
    openThread(id);
  }

  function openMessages() {
    if (screen === "home") setMessagesReturnTab(activeTab);
    setMessagesReturn(screen === "messages" || screen === "thread" ? "home" : screen);
    navigate("messages");
  }

  function leaveMessages() {
    if (messagesReturn === "home") {
      setActiveTab(messagesReturnTab);
      navigate("home", messagesReturnTab);
    } else navigate(messagesReturn);
  }

  // Recheck the request, thread or circle behind an alert before opening it.
  function resolveNotification(item: DemoNotification): string | null {
    const destination = item.destination;
    if (destination.type === "request") {
      const request = connectDemo.requests.find((entry) => entry.id === destination.id);
      const first = request?.name.split(" ")[0];
      if (!request) return "This request is no longer available.";
      if (request.status === "pending") return request.eligible ? null : "This request is no longer available.";
      if (request.status === "approved") return `Already handled: you’re connected with ${first}.`;
      if (request.status === "declined") return "You already declined this request.";
      if (request.status === "withdrawn") return `${first} withdrew this request, so there’s nothing to do.`;
      if (request.status === "expired") return "This request expired.";
      return "This request is no longer available.";
    }
    if (destination.type === "feedback") return impactDemo.feedback.find((entry) => entry.id === destination.id)?.status === "awaiting" ? null : "You already answered this follow-up.";
    if (destination.type === "thread") return messagingDemo.threads.some((thread) => thread.id === destination.id) ? null : "This conversation is no longer available.";
    if (destination.type === "circle" || destination.type === "hub" || destination.type === "spotlight-ask") {
      const circle = findCircle(destination.type === "circle" ? destination.id : destination.circleId);
      if (!circle || !circle.published) return "This circle is no longer available.";
      if (circle.kind === "hub" && circle.hubStatus !== "active") return "This Hub isn’t active right now.";
      if (item.category === "invite" && circle.status !== "invited") return "You’ve already answered this invitation.";
      if (item.category === "admission" && circle.status !== "payment") return "Your membership status has changed since this update.";
      if (destination.type !== "circle" && circle.status !== "active") return "You’re no longer an active member of this circle.";
    }
    return null;
  }

  function openNotification(item: DemoNotification) {
    notificationsDemo.markRead(item.id);
    const resolution = resolveNotification(item);
    if (resolution) {
      setActiveTab("notifications");
      navigate("home", "notifications");
      setToast(resolution);
      return;
    }
    const destination = item.destination;
    switch (destination.type) {
      case "request":
        setReviewRequestId(destination.id);
        setConnectReturnTab("notifications");
        navigate("request-review");
        break;
      case "requests":
        connectDemo.setSegment("requests");
        connectDemo.setRequestFilter(destination.filter);
        setActiveTab("matches");
        navigate("home", "matches");
        break;
      case "matches":
      case "help":
        connectDemo.setSegment(destination.type === "help" ? "help" : "matches");
        setActiveTab("matches");
        navigate("home", "matches");
        break;
      case "thread":
        setMessagesReturnTab("notifications");
        openThread(destination.id, "home");
        break;
      case "circle":
        setActiveTab("circles");
        setCircleRoute({ name: "detail", id: destination.id });
        navigate("home", "circles");
        break;
      case "hub":
        setActiveTab("circles");
        setCircleRoute({ name: "hub", id: destination.circleId });
        navigate("home", "circles");
        break;
      case "spotlight-ask":
        setSpotlightAskCircleId(destination.circleId);
        navigate("spotlight-ask");
        break;
      case "feedback":
        setFeedbackId(destination.id);
        setFeedbackReturn("notifications");
        navigate("feedback");
        break;
    }
  }

  // An alert link opened from outside returns to its exact destination, after sign-in if needed.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!pendingAlertId || screen !== "home" || !demoSession) return;
    const item = notificationsDemo.items.find((entry) => entry.id === pendingAlertId);
    setPendingAlertId(null);
    router.replace("/");
    if (item) openNotification(item);
    else setToast("That update is no longer available.");
  // openNotification reads the latest sample state when the home screen is ready.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAlertId, screen, demoSession]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function backToConnectTab() {
    setActiveTab(connectReturnTab);
    navigate("home", connectReturnTab);
  }

  function openHelpOffer(target: HelpTarget) {
    setHelpTarget(target);
    openConnectView("help-offer");
  }

  function openShareEntry(destinationId = "personal", personaId = activePersonaId ?? "main") {
    setShareEntryInit({ personaId, destinationId, returnTo: screen });
    navigate("share-entry");
  }

  function openCircle(id: string) {
    if (typeof window !== "undefined") tabScrollPositions.current.set("circles", window.scrollY);
    setCircleRoute({ name: "detail", id });
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function circleHome() {
    setCircleRoute({ name: "home" });
    window.requestAnimationFrame(() => window.scrollTo({ top: tabScrollPositions.current.get("circles") ?? 0, behavior: "auto" }));
  }

  function startJoin(id: string) {
    setJoinCircleId(id);
    navigate("circle-join");
  }

  function changeTab(tab: Tab) {
    if (tab === "circles" && activeTab === "circles" && circleRoute.name !== "home") {
      circleHome();
      return;
    }
    if (typeof window !== "undefined") tabScrollPositions.current.set(activeTab, window.scrollY);
    setActiveTab(tab);
    setQuery("");
    setContactView(null);
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => window.scrollTo({
        top: tabScrollPositions.current.get(tab) ?? 0,
        behavior: "auto",
      }));
    }
  }

  async function saveContactEntry() {
    const value = entryValue.trim();
    if (!value || !selectedContactId || !demoSession) return;
    try {
      if (sheet === "tag" && selectedContact) {
        const tags = selectedContact.tags.includes(value) ? selectedContact.tags : [...selectedContact.tags, value];
        await updateContact({ sessionToken: demoSession, contactId: selectedContactId, tags });
      } else if (sheet === "met") {
        await updateContact({ sessionToken: demoSession, contactId: selectedContactId, metAt: Date.now(), metLocation: value });
      } else if (sheet === "note") {
        await addContactNote({ sessionToken: demoSession, contactId: selectedContactId, body: value });
      }
      setEntryValue("");
      setSheet(null);
      setToast(sheet === "tag" ? "Tag saved" : sheet === "met" ? "Meeting place saved" : "Note saved");
    } catch (error) {
      setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Could not save that contact detail.");
    }
  }

  async function saveCircleName() {
    const name = circleName.trim();
    if (!demoSession || !name) return;
    try {
      await renameMyCircle({ sessionToken: demoSession, name });
      setProfile((current) => ({ ...current, circle: name }));
      setSheet(null);
      setToast("Circle name saved");
    } catch (error) {
      setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Could not rename your circle.");
    }
  }

  return (
    <>
      <main className={`app${screen === "welcome" ? " welcome in" : screen === "auth" ? " auth in" : " in"}`}>
        {restoring ? <RestoringState /> : null}
        {screen === "welcome" && !restoring ? <WelcomeScreen
          onStart={() => startPersonaFlow("welcome")}
          onPreview={() => { setEntryCircleId("creative-founders"); navigate("guest-preview"); }}
          onJoinCode={() => navigate("join-code")}
          onSignIn={() => {
            setAuthMode("signin");
            setAuthError("");
            setAuthPassword("");
            setPersonaGatePending(false);
            navigate("auth");
          }}
        /> : null}
        {screen === "join-code" ? (
          <JoinCodeScreen
            onBack={() => navigate("welcome")}
            onResolve={(code) => {
              const circle = joinCodeToCircle(circleDemo.circles, code);
              if (!circle) return "We couldn’t find an active circle for that code. Check it and try again.";
              setEntryCircleId(circle.id);
              navigate("guest-preview");
              return null;
            }}
          />
        ) : null}
        {screen === "guest-preview" && entryCircle ? (
          <GuestCirclePreviewScreen
            circle={entryCircle}
            onBack={() => navigate("welcome")}
            onContinue={() => {
              const joinable = entryCircle.available && entryCircle.published
                && !(entryCircle.capacity !== null && entryCircle.memberCount >= entryCircle.capacity);
              setJoinIntentId(joinable ? entryCircle.id : null);
              startPersonaFlow("guest-preview");
            }}
          />
        ) : null}
        {screen === "auth" && !restoring ? (
          <>
            {pendingAlertId && !personaGatePending ? <div className="card p1-static-notice p1-auth-context-note"><b>Sign in to open your update</b><p>We’ll take you straight to it after you sign in.</p></div> : null}
            {personaGatePending ? <div className="card p1-static-notice p1-auth-context-note"><b>Verify to save your persona</b><p>Create your demo account to keep your persona draft.{joinIntent ? ` Saving doesn’t join ${joinIntent.name}; you’ll confirm joining next.` : ""} Persona details are a session-only preview in this phase; your existing card flow keeps its current save behavior.</p></div> : null}
            <DemoAuthScreen
              mode={authMode}
              username={authUsername}
              password={authPassword}
              error={authError}
              busy={authBusy}
              resetCode={authResetCode}
              resetCodeValue={authResetCodeValue}
              onUsername={setAuthUsername}
              onPassword={setAuthPassword}
              onResetCode={setAuthResetCodeValue}
              onSubmit={(event) => void submitDemoAuth(event)}
              onToggleMode={() => {
                setAuthMode((mode) => mode === "signup" || mode === "reset" ? "signin" : "signup");
                setAuthError("");
                setAuthPassword("");
                setAuthResetCode("");
              }}
              onForgotPassword={() => {
                setAuthMode("forgot");
                setAuthError("");
                setAuthPassword("");
                setAuthResetCode("");
              }}
              onBack={() => navigate(personaGatePending ? "persona-review" : "welcome")}
            />
          </>
        ) : null}
        {screen === "persona-select" ? (
          <PersonaTypeScreen
            selected={personaDraft.type}
            name={personaDraft.name}
            onSelect={changePersonaType}
            onName={(name) => setPersonaDraft((current) => ({ ...current, name }))}
            onBack={() => navigate(personaFlowFrom, "you")}
            onContinue={() => navigate("persona-permissions")}
          />
        ) : null}
        {screen === "persona-permissions" ? (
          <PersonaPermissionsScreen
            visibility={personaDraft.visibility}
            adultConfirmed={adultConfirmed}
            onVisibility={(visibility) => setPersonaDraft((current) => ({ ...current, visibility }))}
            onAdultConfirmed={setAdultConfirmed}
            onBack={() => navigate("persona-select")}
            onContinue={() => navigate("persona-onboarding")}
          />
        ) : null}
        {screen === "persona-onboarding" ? (
          <PersonaOnboardingScreen
            draft={personaDraft}
            circleContext={joinIntent}
            onChange={updatePersonaDraft}
            onBack={() => demoSession && editingPersonaId && personaPreviews.some((persona) => persona.id === editingPersonaId)
              ? navigate("home", "you")
              : navigate("persona-permissions")}
            onReview={() => navigate("persona-review")}
            onDossier={() => openDossier("persona-onboarding")}
          />
        ) : null}
        {screen === "persona-review" ? (
          <PersonaReviewScreen
            draft={personaDraft}
            joinIntent={demoSession ? null : joinIntent}
            onChange={updatePersonaDraft}
            onVisibility={(visibility) => setPersonaDraft((current) => ({ ...current, visibility }))}
            onTogglePublicField={togglePersonaPublicField}
            onBack={() => navigate("persona-onboarding")}
            onDiscard={discardPersonaDraft}
            onConfirm={confirmPersonaPreview}
          />
        ) : null}
        {screen === "persona-started" ? (
          <PersonaStartScreen draft={personaDraft} guest={!demoSession} onContinue={continueAfterPersona} />
        ) : null}
        {screen === "dossier" ? (
          <DossierScreen
            initialEmail={profile.email}
            displayName={profile.name}
            targets={[
              { id: editingPersonaId ?? "draft", name: personaDraft.name || "This persona" },
              ...personaPreviews.filter((persona) => persona.id !== editingPersonaId).map((persona) => ({ id: persona.id, name: persona.name })),
            ]}
            onCancel={() => navigate(dossierReturn, "you")}
            onManual={() => navigate("persona-onboarding")}
            onComplete={applyDossier}
          />
        ) : null}
        {screen === "circle-create" ? (
          <CreateCircleScreen
            draft={circleDemo.createDraft}
            onDraft={circleDemo.setCreateDraft}
            onBack={() => navigate("home", "circles")}
            onHubApply={() => navigate("hub-apply")}
            onPublish={(kind) => {
              const circle = circleDemo.createCircle(circleDemo.createDraft, kind);
              circleDemo.setSegment("hosting");
              setActiveTab("circles");
              setCircleRoute({ name: "manage", id: circle.id, section: "invites" });
              navigate("home", "circles");
              setToast(circle.published ? `${circle.name} is published.` : `${circle.name} saved as a draft.`);
            }}
          />
        ) : null}
        {screen === "hub-apply" ? (
          <HubApplyScreen
            applicantName={profile.name}
            onBack={() => navigate("circle-create")}
            onSubmitted={(name, purpose) => {
              const circle = circleDemo.createCircle({ ...EMPTY_CIRCLE_DRAFT, name, purpose, visibility: "private", admission: "invite" }, "hub");
              circleDemo.setSegment("hosting");
              setActiveTab("circles");
              setCircleRoute({ name: "detail", id: circle.id });
              navigate("home", "circles");
              setToast("Hub requested. It stays inactive until Harmoni enables it.");
            }}
          />
        ) : null}
        {screen === "circle-join" && joinCircle ? (
          <CircleJoinScreen
            circle={joinCircle}
            personas={["Main card", ...personaPreviews.map((persona) => persona.name)]}
            onBack={() => navigate("home", "circles")}
            onSubmit={(persona) => {
              const outcome = circleDemo.join(joinCircle.id, persona);
              if (joinIntentId === joinCircle.id) setJoinIntentId(null);
              return outcome;
            }}
            onOpenCircle={() => { setActiveTab("circles"); setCircleRoute({ name: "detail", id: joinCircle.id }); navigate("home", "circles"); }}
            onDone={() => { setActiveTab("circles"); circleDemo.setSegment("joined"); setCircleRoute({ name: "home" }); navigate("home", "circles"); }}
          />
        ) : null}
        {screen === "circle-link" && linkCircle ? (
          <CircleLinkScreen
            circle={linkCircle}
            candidates={circleDemo.circles.filter((circle) => circle.id !== linkCircle.id && circle.published && circle.kind === "general"
              && !linkCircle.links.some((link) => link.otherCircleId === circle.id && link.status !== "disconnected"))}
            onBack={() => { setCircleRoute({ name: "manage", id: linkCircle.id, section: "connections" }); navigate("home", "circles"); }}
            onRequest={(targetId) => circleDemo.requestLink(linkCircle.id, targetId)}
          />
        ) : null}
        {screen === "share-entry" ? (
          <ShareEntryScreen
            profile={profile}
            personas={personaPreviews}
            destinations={entryDestinations}
            initialPersonaId={shareEntryInit.personaId}
            initialDestinationId={shareEntryInit.destinationId}
            onBack={() => navigate(shareEntryInit.returnTo)}
          />
        ) : null}
        {screen === "card-capture" ? (
          <CardCaptureScreen
            senderName={profile.name}
            destinations={entryDestinations}
            findDuplicate={(name, email) => circleDemo.findDuplicate(name, email)}
            onSave={(capture, replaceId) => { circleDemo.saveCapture(capture, replaceId); }}
            onBack={() => navigate("home", "scan")}
            onDone={() => navigate("home", "scan")}
          />
        ) : null}
        {screen === "express-interest" && interestMatch ? (
          <ExpressInterestScreen
            match={interestMatch}
            circle={findCircle(interestMatch.circleId)}
            persona={connectDemo.matchScope.persona}
            onBack={backToConnectTab}
            onSubmit={(kind, note) => connectDemo.expressInterest({
              personId: interestMatch.personId,
              name: interestMatch.name,
              circleId: interestMatch.circleId,
              kind,
              note,
              persona: connectDemo.matchScope.persona,
              hostFirst: findCircle(interestMatch.circleId)?.settings.connectionApproval === "host-then-member",
            })}
            onReviewIncoming={(request) => { setReviewRequestId(request.id); navigate("request-review"); }}
            onDone={backToConnectTab}
          />
        ) : null}
        {screen === "request-review" && reviewRequest ? (
          <RequestReviewScreen
            request={reviewRequest}
            circle={findCircle(reviewRequest.circleId)}
            onBack={() => { connectDemo.setSegment("requests"); backToConnectTab(); }}
            onDecide={(decision, grants) => connectDemo.respond(reviewRequest.id, decision, grants)}
            onSaveGrants={(grants) => { connectDemo.updateGrants(reviewRequest.id, grants); setToast("Sharing updated. Future access follows the new choice."); }}
            onMessage={() => messageConnection(reviewRequest)}
          />
        ) : null}
        {screen === "help-offer" && helpTarget ? (
          <HelpOfferScreen
            target={helpTarget}
            circle={findCircle(helpTarget.circleId)}
            connected={Boolean(connectDemo.connectionWith(helpTarget.ownerId))}
            openRequest={Boolean(connectDemo.openRequestWith(helpTarget.ownerId, helpTarget.circleId))}
            onBack={backToConnectTab}
            onSubmit={(text) => connectDemo.submitOffer({
              toId: helpTarget.ownerId,
              to: helpTarget.owner,
              circleId: helpTarget.circleId,
              text,
              target: { type: helpTarget.type, id: helpTarget.id, label: helpTarget.type === "spotlight" ? `${helpTarget.owner.split(" ")[0]}’s Spotlight` : helpTarget.label },
              persona: connectDemo.matchScope.persona,
              hostFirst: findCircle(helpTarget.circleId)?.settings.connectionApproval === "host-then-member",
            })}
          />
        ) : null}
        {screen === "help-request" ? (
          <HelpRequestScreen
            circles={circleDemo.circles.filter((circle) => circle.status === "active" && circle.kind === "general")}
            persona={connectDemo.matchScope.persona}
            onBack={backToConnectTab}
            onSubmit={(circleId, ask, timing) => {
              connectDemo.createHelpRequest(circleId, ask, timing);
              connectDemo.setSegment("help");
              backToConnectTab();
              setToast("Help request posted. Offers will appear under Help.");
            }}
          />
        ) : null}
        {screen === "spotlight-ask" && spotlightAskCircle ? (
          <SpotlightAskScreen
            circle={spotlightAskCircle}
            spotlight={connectDemo.spotlights.find((spotlight) => spotlight.circleId === spotlightAskCircle.id)}
            suggestion={activePersona?.needs.trim()
              ? `Looking for help with: ${activePersona.needs.trim().split("\n")[0].slice(0, 140)}`
              : `Hoping to swap a free weekend of tractor time for advice on drip irrigation before winter sowing.`}
            onBack={() => { setActiveTab("circles"); navigate("home", "circles"); }}
            onApprove={(ask) => connectDemo.approveMyAsk(spotlightAskCircle.id, ask)}
          />
        ) : null}
        {screen === "messages" ? (
          <MessagesInboxScreen
            threads={messagingDemo.threads}
            circleName={(id) => findCircle(id)?.name ?? "Circle"}
            accessFor={threadAccess}
            onOpen={(id) => openThread(id, "messages")}
            onBack={leaveMessages}
          />
        ) : null}
        {screen === "thread" && activeThread ? (
          <ThreadScreen
            key={activeThread.id}
            thread={activeThread}
            circleName={findCircle(activeThread.circleId)?.name ?? "Circle"}
            access={threadAccess(activeThread)}
            online={messagingDemo.online}
            onBack={() => threadReturn === "home" ? (setActiveTab(messagesReturnTab), navigate("home", messagesReturnTab)) : navigate(threadReturn)}
            onSend={(text) => { if (threadAccess(activeThread).allowed) messagingDemo.send(activeThread.id, text); }}
            onRetry={(messageId) => { if (threadAccess(activeThread).allowed) messagingDemo.retry(activeThread.id, messageId); }}
            onDelete={(messageId) => messagingDemo.deleteMessage(activeThread.id, messageId)}
            onToggleOnline={() => {
              messagingDemo.setOnline(!messagingDemo.online);
              setToast(messagingDemo.online ? "Demo: connection lost." : "Reconnected. Retry any messages that didn’t send.");
            }}
            onMute={(muted) => { messagingDemo.setMuted(activeThread.id, muted); setToast(muted ? "Alerts muted for this conversation." : "Alerts back on."); }}
            onHide={() => { messagingDemo.setHidden(activeThread.id, true); navigate("messages"); setToast("Conversation hidden."); }}
            onReport={() => {
              messagingDemo.report(activeThread.id);
              adminDemo.addReport({ kind: "Message", subject: activeThread.name, subjectId: activeThread.personId, reason: "Reported from a conversation", evidence: "Only the context the reporter chose to share. Access to the wider conversation isn’t available until D3 is approved." });
              setToast("Reported to Harmoni’s safety team. Demo only.");
            }}
            onBlock={(blocked) => { messagingDemo.setBlocked(activeThread.id, blocked); setToast(blocked ? `${activeThread.name.split(" ")[0]} is blocked.` : "Unblocked."); }}
            onWithdraw={() => {
              const request = connectDemo.requests.find((item) => item.id === activeThread.requestId) ?? connectDemo.connectionWith(activeThread.personId);
              if (request) connectDemo.withdraw(request.id);
              setToast("Connection withdrawn. Messaging has stopped.");
            }}
            onEscalate={() => { messagingDemo.escalate(activeThread.id); setToast("Escalation requested."); }}
          />
        ) : null}
        {screen === "notification-settings" ? (
          <NotificationSettingsScreen
            demo={notificationsDemo}
            circles={circleDemo.circles.filter((circle) => circle.status === "active" || circle.role === "host")}
            email={profile.email}
            alertHref="/?alert=n-neha"
            onBack={() => { setActiveTab("notifications"); navigate("home", "notifications"); }}
          />
        ) : null}
        {screen === "impact" ? (
          <ImpactScreen
            demo={impactDemo}
            circleName={(id) => findCircle(id)?.name ?? "Circle"}
            onBack={() => { setActiveTab("you"); navigate("home", "you"); }}
            onFeedback={(request) => { setFeedbackId(request.id); setFeedbackReturn("impact"); navigate("feedback"); }}
          />
        ) : null}
        {screen === "feedback" && feedbackRequest ? (
          <FeedbackScreen
            key={feedbackRequest.id}
            request={feedbackRequest}
            circleName={findCircle(feedbackRequest.circleId)?.name ?? "your circle"}
            onBack={() => feedbackReturn === "impact" ? navigate("impact") : (setActiveTab("notifications"), navigate("home", "notifications"))}
            onAnswer={(outcome, publicThanks, note) => impactDemo.answer(feedbackRequest.id, outcome, publicThanks, note)}
          />
        ) : null}
        {screen === "privacy" ? (
          <PrivacyScreen
            personas={personaPreviews}
            onBack={() => navigate("home")}
            onEditPersona={editPersonaPreview}
            onDeletePersona={(id) => { removePersonaPreview(id); setToast("Persona deleted. Matches will rebuild without it."); }}
            onAccessLog={() => navigate("access-log")}
            onDeleteAccount={() => setSheet("delete-account")}
          />
        ) : null}
        {screen === "admin" ? (
          <AdminScreen admin={adminDemo} circleDemo={circleDemo} onBack={() => navigate("home")} onToast={setToast} />
        ) : null}
        {screen === "details" ? (
          <DetailsScreen profile={profile} xp={xp} saving={savingCard} onChange={updateText} onBack={() => navigate("auth")} onContinue={() => void continueDetails()} />
        ) : null}
        {screen === "logo" ? (
          <LogoScreen
            profile={profile}
            xp={xp}
            onBack={() => navigate("details")}
            onAuto={() => {
              setProfile((current) => ({ ...current, logo: "auto", logoStorageId: null }));
            }}
            onUpload={(file) => handleImage(file, "logo")}
            onRemove={() => setProfile((current) => ({ ...current, logo: "", logoStorageId: null }))}
            onContinue={() => void continueLogo()}
          />
        ) : null}
        {screen === "photo" ? (
          <PhotoScreen
            profile={profile}
            xp={xp}
            onBack={() => navigate("logo")}
            onPhoto={(file) => handleImage(file, "photo")}
            onContinue={() => navigate("preview")}
            onSkip={() => navigate("preview")}
          />
        ) : null}
        {screen === "preview" ? (
          <PreviewScreen
            profile={profile}
            xp={xp}
            onBack={() => navigate("photo")}
            onDesign={() => openDesign("preview")}
            onContinue={() => navigate("circle-setup")}
          />
        ) : null}
        {screen === "circle-setup" ? (
          <CircleSetupScreen
            profile={profile}
            circleName={circleName}
            xp={xp}
            onCircleName={setCircleName}
            onBack={() => navigate("preview")}
            onCreate={finishCircle}
          />
        ) : null}
        {screen === "design" ? (
          <DesignScreen
            profile={profile}
            personaItems={personaItems ?? []}
            saving={savingCard}
            onArt={(art) => setProfile((current) => ({ ...current, art }))}
            onUpdate={(updates) => setProfile((current) => ({ ...current, ...updates }))}
            onUpload={handleImage}
            onBack={() => navigate(returnTo)}
            onSave={() => void saveDesign()}
            onReset={() => void resetDemo()}
            onCreatePersonaItem={(kind, text) => {
              if (!demoSession) return;
              void createPersonaItem({ sessionToken: demoSession, kind, text })
                .then(() => setToast("Context saved as a private draft."))
                .catch((error: unknown) => setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Context could not be saved."));
            }}
            onUpdatePersonaItem={(itemId, text) => {
              if (!demoSession) return;
              void updatePersonaItem({ sessionToken: demoSession, itemId, text })
                .then(() => setToast("Context updated. Approve it again before matching."))
                .catch((error: unknown) => setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Context could not be updated."));
            }}
            onApprovePersonaItem={(itemId) => {
              if (!demoSession) return;
              void approvePersonaItem({ sessionToken: demoSession, itemId })
                .then(() => setToast("Context approved."))
                .catch((error: unknown) => setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Context could not be approved."));
            }}
            onArchivePersonaItem={(itemId) => {
              if (!demoSession) return;
              void archivePersonaItem({ sessionToken: demoSession, itemId })
                .then(() => setToast("Context archived."))
                .catch((error: unknown) => setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Context could not be archived."));
            }}
            onSetPersonaVisibility={(itemId, visibility) => {
              if (!demoSession) return;
              void setPersonaVisibility({ sessionToken: demoSession, itemId, visibility })
                .then(() => setToast("Context visibility saved."))
                .catch((error: unknown) => setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Context visibility could not be saved."));
            }}
            onGrantMatchingToCircle={(itemId) => {
              if (!demoSession || !myCircle) return;
              void grantPersonaAccess({ sessionToken: demoSession, itemId, granteeCircleId: myCircle._id, purpose: "matching" })
                .then(() => setToast("Matching access granted to your circle."))
                .catch((error: unknown) => setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Access could not be granted."));
            }}
          />
        ) : null}
        {screen === "access-log" ? (
          <AccessLogScreen
            rows={accessLog ?? []}
            onBack={() => navigate("home")}
            onRevoke={(grantId) => {
              if (!demoSession) return;
              void revokePersonaAccess({ sessionToken: demoSession, grantId })
                .then(() => setToast("Access revoked."))
                .catch((error: unknown) => setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Access could not be revoked."));
            }}
          />
        ) : null}
        {screen === "home" ? (
          <>
            {!(activeTab === "contacts" && contactView) ? (
              <AppHeader
                onMessages={openMessages}
                unreadMessages={unreadMessages}
                onMenu={() => setSheet("menu")}
                onSetup={() => setSheet("setup")}
                onEdit={() => openDesign("home")}
                onScan={() => changeTab("scan")}
              />
            ) : null}
            {activeTab === "you" ? (
              <>
                <MyCardScreen profile={profile} xp={xp} awardedBadges={awardedBadges} onShare={() => void shareCard()} />
                <PersonaHubScreen
                  personas={personaPreviews}
                  selectedId={activePersonaId}
                  onSelect={setActivePersonaId}
                  onCreate={() => startPersonaFlow("home")}
                  onEdit={editPersonaPreview}
                  onAddMore={addMorePersonaContext}
                  onDelete={removePersonaPreview}
                  onDossier={(persona) => openDossier("home", persona)}
                  onShare={() => openShareEntry()}
                  onOpenContacts={openContacts}
                />
                <ImpactEntryCard
                  people={impactDemo.confirmedPeople}
                  awaiting={impactDemo.feedback.filter((item) => item.status === "awaiting").length}
                  onOpen={() => navigate("impact")}
                />
              </>
            ) : null}
            {activeTab === "contacts" && !contactView ? (
              <ContactsScreen
                contacts={contacts}
                query={query}
                onQuery={setQuery}
                onScan={() => changeTab("scan")}
                onSelect={(contactId) => {
                  setSelectedContactId(contactId);
                  setContactView("detail");
                }}
              />
            ) : null}
            {activeTab === "contacts" && contactView === "detail" && selectedContact ? (
              <ScreenErrorBoundary section="contact details">
                <ContactDetailScreen
                  contact={selectedContact}
                  introNetwork={introNetwork}
                  onBack={() => setContactView(null)}
                  onViewCard={() => setContactView("card")}
                  onAskIntro={(targetUserId) => {
                    if (!demoSession || !selectedContact.linkedUserId) return;
                    void requestIntroduction({ sessionToken: demoSession, introducerId: selectedContact.linkedUserId, targetUserId })
                      .then(() => setToast(`Intro request sent through ${selectedContact.name}`))
                      .catch((error: unknown) => setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Could not send that intro request."));
                  }}
                  onTag={() => { setEntryValue(""); setSheet("tag"); }}
                  onNote={() => { setEntryValue(""); setSheet("note"); }}
                  onMet={() => { setEntryValue(selectedContact.met); setSheet("met"); }}
                />
              </ScreenErrorBoundary>
            ) : null}
            {activeTab === "contacts" && contactView === "card" && selectedContact ? (
              <ScreenErrorBoundary section="contact card">
                <ContactCardScreen contact={selectedContact} onBack={() => setContactView("detail")} />
              </ScreenErrorBoundary>
            ) : null}
            {activeTab === "scan" ? <ScanModeTabs mode={scanMode} onMode={setScanMode} /> : null}
            {activeTab === "scan" && scanMode === "qr" ? <ScanScreen onScan={handleScannedLink} /> : null}
            {activeTab === "scan" && scanMode === "card" ? (
              <CardInvitesScreen
                captures={circleDemo.captures}
                circleName={(id) => id ? entryDestinations.find((item) => item.id === id)?.name ?? findCircle(id)?.name ?? "Circle" : "Harmoni only"}
                onCapture={() => navigate("card-capture")}
                onRetry={(id, email) => { circleDemo.retryCapture(id, email); setToast("Retry queued on the same record. Demo only: no email is sent."); }}
                onRemove={(id) => { circleDemo.removeCapture(id); setToast("Pending record deleted."); }}
              />
            ) : null}
            {activeTab === "matches" ? (
              <MatchesHubScreen
                demo={connectDemo}
                circles={circleDemo.circles}
                personas={personaOptions}
                contextSignature={personaSignature}
                realSuggestions={matchingSuggestions.map((suggestion) => ({ id: String(suggestion._id), name: suggestion.targetName, reason: suggestion.reason }))}
                onDismissReal={(id) => {
                  const suggestion = matchingSuggestions.find((item) => String(item._id) === id);
                  if (!demoSession || !suggestion) return;
                  void dismissMatch({ sessionToken: demoSession, suggestionId: suggestion._id })
                    .then(() => setMatchingSuggestions((current) => current.filter((item) => item._id !== suggestion._id)))
                    .catch((error: unknown) => setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Match could not be dismissed."));
                }}
                onInterest={(match) => { setInterestMatch(match); openConnectView("express-interest"); }}
                onReview={(request) => { setReviewRequestId(request.id); openConnectView("request-review"); }}
                onOffer={openHelpOffer}
                onAskHelp={() => openConnectView("help-request")}
                onBuildPersona={() => activePersona ? addMorePersonaContext(activePersona) : startPersonaFlow("home")}
                onDiscover={() => { circleDemo.setSegment("discover"); setCircleRoute({ name: "home" }); changeTab("circles"); }}
                onMessage={messageConnection}
                onToast={setToast}
              />
            ) : null}
            {activeTab === "notifications" ? (
              <NotificationsScreen
                demo={notificationsDemo}
                resolve={resolveNotification}
                unreadMessages={unreadMessages}
                onOpen={openNotification}
                onOpenGroup={(ids) => {
                  ids.forEach((id) => notificationsDemo.markRead(id));
                  connectDemo.setSegment("requests");
                  connectDemo.setRequestFilter("incoming");
                  changeTab("matches");
                }}
                onMessages={openMessages}
                onSettings={() => navigate("notification-settings")}
              />
            ) : null}
            {activeTab === "circles" && circleRoute.name === "home" ? (
              <CirclesHomeScreen
                demo={circleDemo}
                personal={{
                  name: myCircle?.name || profile.circle || "My circle",
                  members: myCircle?.members.length ?? contacts.length + 1,
                  waiting: (exchangeInbox?.length ?? 0) + (introInbox?.length ?? 0),
                }}
                joinIntent={joinIntent}
                onOpenPersonal={() => { tabScrollPositions.current.set("circles", window.scrollY); setCircleRoute({ name: "personal" }); window.scrollTo({ top: 0 }); }}
                onOpenCircle={openCircle}
                onCreate={() => navigate("circle-create")}
                onResumeJoin={() => joinIntent && startJoin(joinIntent.id)}
                onDismissIntent={() => setJoinIntentId(null)}
              />
            ) : null}
            {activeTab === "circles" && routedCircle && circleRoute.name === "detail" ? (
              <CircleDetailScreen
                circle={routedCircle}
                onBack={circleHome}
                onJoin={() => startJoin(routedCircle.id)}
                onWithdraw={() => { circleDemo.withdraw(routedCircle.id); setToast("Request withdrawn."); }}
                onLeave={() => { circleDemo.leave(routedCircle.id); setToast(`You left ${routedCircle.name}.`); }}
                onDeclineInvite={() => { circleDemo.declineInvitation(routedCircle.id); setToast("Invitation declined."); }}
                onManage={() => setCircleRoute({ name: "manage", id: routedCircle.id, section: "requests" })}
                onShare={() => openShareEntry(routedCircle.id)}
                onHub={() => setCircleRoute({ name: "hub", id: routedCircle.id })}
                spotlight={routedCircle.kind === "general" && routedCircle.published && (routedCircle.status === "active" || routedCircle.role === "host") ? (
                  <SpotlightCard
                    circle={routedCircle}
                    spotlight={connectDemo.spotlights.find((spotlight) => spotlight.circleId === routedCircle.id)}
                    isHost={routedCircle.role === "host"}
                    onOffer={() => {
                      const current = connectDemo.spotlights.find((spotlight) => spotlight.circleId === routedCircle.id)?.current;
                      if (current) openHelpOffer({ type: "spotlight", id: routedCircle.id, label: current.ask, ask: current.ask, ownerId: current.memberId, owner: current.member, circleId: routedCircle.id });
                    }}
                    onToggleQueue={() => {
                      const inQueue = connectDemo.spotlights.find((spotlight) => spotlight.circleId === routedCircle.id)?.meInQueue;
                      connectDemo.toggleQueue(routedCircle.id);
                      setToast(inQueue ? "You left the Spotlight queue." : "You’re in the Spotlight queue.");
                    }}
                    onPrepareAsk={() => { setSpotlightAskCircleId(routedCircle.id); navigate("spotlight-ask"); }}
                    onManage={() => setCircleRoute({ name: "spotlight", id: routedCircle.id, tab: "current" })}
                  />
                ) : null}
                contributors={routedCircle.status === "active" || routedCircle.role === "host" ? <TopContributorsCard circle={routedCircle} /> : null}
                onLinkConsent={(link, allowed) => {
                  circleDemo.setLinkConsent(routedCircle.id, link.id, allowed);
                  setToast(allowed ? `You’re included in matching with ${link.otherName}.` : `You’re no longer matched with ${link.otherName}.`);
                }}
              />
            ) : null}
            {activeTab === "circles" && routedCircle && circleRoute.name === "manage" ? (
              <ManageCircleScreen
                key={routedCircle.id}
                circle={routedCircle}
                demo={circleDemo}
                section={circleRoute.section}
                onSection={(section) => setCircleRoute({ name: "manage", id: routedCircle.id, section })}
                onBack={() => setCircleRoute({ name: "detail", id: routedCircle.id })}
                onShare={() => openShareEntry(routedCircle.id)}
                onLink={() => { setLinkCircleId(routedCircle.id); navigate("circle-link"); }}
                onHub={() => setCircleRoute({ name: "hub", id: routedCircle.id })}
                onSpotlights={() => setCircleRoute({ name: "spotlight", id: routedCircle.id, tab: "current" })}
                insights={<CircleInsights circle={routedCircle} />}
                onToast={setToast}
              />
            ) : null}
            {activeTab === "circles" && routedCircle && circleRoute.name === "hub" ? (
              <HubStructureScreen
                circle={routedCircle}
                onBack={() => setCircleRoute({ name: "detail", id: routedCircle.id })}
                onWrite={() => {
                  const hubThread = messagingDemo.threads.find((thread) => thread.kind === "hub" && thread.circleId === routedCircle.id);
                  if (hubThread) openThread(hubThread.id);
                }}
              />
            ) : null}
            {activeTab === "circles" && routedCircle && circleRoute.name === "spotlight" ? (
              <SpotlightManagerScreen
                circle={routedCircle}
                spotlight={connectDemo.spotlights.find((spotlight) => spotlight.circleId === routedCircle.id)}
                demo={connectDemo}
                tab={circleRoute.tab}
                onTab={(tab) => setCircleRoute({ name: "spotlight", id: routedCircle.id, tab })}
                onBack={() => setCircleRoute({ name: "manage", id: routedCircle.id, section: "requests" })}
                onToast={setToast}
              />
            ) : null}
            {activeTab === "circles" && circleRoute.name !== "home" && circleRoute.name !== "personal" && !routedCircle ? (
              <div className="card p1-empty-state"><h2>This circle isn’t available</h2><p>It may have been removed or you no longer have access.</p><button className="btn g s" type="button" onClick={circleHome}>Back to circles</button></div>
            ) : null}
            {activeTab === "circles" && circleRoute.name === "personal" ? (
              <ScreenErrorBoundary section="your circle">
                <div className="p2-subheader"><button className="bkb" type="button" onClick={circleHome} aria-label="Back to circles"><Icon name="back" /></button><span className="tag">Personal circle</span><span className="header-spacer" /></div>
                <CircleScreen
                  profile={profile}
                  contacts={contacts}
                  circle={myCircle ?? null}
                  exchangeRequests={exchangeInbox ?? []}
                  introRequests={introInbox ?? []}
                  suggestions={matchingSuggestions}
                  onScan={() => changeTab("scan")}
                  onShare={() => void shareCard()}
                  onRename={() => setSheet("circle-name")}
                  onAcceptExchange={(exchangeId) => {
                    if (!demoSession) return;
                    void acceptExchange({ sessionToken: demoSession, exchangeId })
                      .then(() => setToast("Cards exchanged. You are now connected."))
                      .catch((error: unknown) => setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Could not accept that exchange."));
                  }}
                  onDeclineExchange={(exchangeId) => {
                    if (!demoSession) return;
                    void declineExchange({ sessionToken: demoSession, exchangeId })
                      .then(() => setToast("Exchange request declined."))
                      .catch((error: unknown) => setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Could not decline that exchange."));
                  }}
                  onDecideIntro={(requestId, decision) => {
                    if (!demoSession) return;
                    void decideIntroduction({ sessionToken: demoSession, requestId, decision })
                      .then(() => setToast(decision === "approve" ? "Introduction made." : "Intro request declined."))
                      .catch((error: unknown) => setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Could not update that intro request."));
                  }}
                  onDismissMatch={(suggestionId) => {
                    if (!demoSession) return;
                    void dismissMatch({ sessionToken: demoSession, suggestionId })
                      .then(() => setMatchingSuggestions((current) => current.filter((suggestion) => suggestion._id !== suggestionId)))
                      .catch((error: unknown) => setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Match could not be dismissed."));
                  }}
                />
              </ScreenErrorBoundary>
            ) : null}
          </>
        ) : null}
      </main>
      {screen === "home" && !contactView ? <BottomNav active={activeTab} onChange={changeTab} badges={{ notifications: unreadNotifications }} /> : null}
      {sheet === "menu" ? (
        <MenuSheet onDismiss={() => setSheet(null)} onAction={handleMenuAction} onShare={() => void shareCard()} />
      ) : null}
      {sheet === "delete-account" ? (
        <DeleteAccountSheet busy={deletingAccount} onConfirm={() => void deleteAccount()} onDismiss={() => setSheet(null)} />
      ) : null}
      {sheet === "delete-card" ? (
        <DeleteCardSheet busy={deletingCard} onConfirm={() => void deleteCard()} onDismiss={() => setSheet(null)} />
      ) : null}
      {sheet === "share-link" && demoCard?.slug ? (
        <ShareLinkSheet url={`${window.location.origin}/c/${demoCard.slug}`} onDismiss={() => setSheet(null)} />
      ) : null}
      {sheet === "setup" ? (
        <SetupGuide
          onDismiss={() => setSheet(null)}
          onDesign={() => openDesign("home")}
          onShare={() => void shareCard()}
          onScan={() => changeTab("scan")}
        />
      ) : null}
      {sheet === "tag" || sheet === "note" || sheet === "met" ? (
        <ContactEntrySheet
          kind={sheet}
          value={entryValue}
          onChange={setEntryValue}
          onSave={saveContactEntry}
          onDismiss={() => setSheet(null)}
        />
      ) : null}
      {sheet === "circle-name" ? (
        <CircleNameSheet value={circleName} onChange={setCircleName} onSave={() => void saveCircleName()} onDismiss={() => setSheet(null)} />
      ) : null}
      {toast ? <div className="toast" role="status">{toast}</div> : null}
      <OfflineBanner />
    </>
  );
}

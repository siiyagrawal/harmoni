"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  MatchesLandingScreen,
  NotificationsLandingScreen,
  PersonaHubScreen,
  PersonaOnboardingScreen,
  PersonaPermissionsScreen,
  PersonaReviewScreen,
  PersonaTypeScreen,
} from "./phase-one-screens";
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

export default function HarmoniApp() {
  return (
    <ScreenErrorBoundary section="Harmoni">
      <HarmoniAppContent />
    </ScreenErrorBoundary>
  );
}

function HarmoniAppContent() {
  const router = useRouter();
  const [screen, setScreen] = useState<View>("welcome");
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
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [sheet, setSheet] = useState<"menu" | "setup" | "tag" | "note" | "met" | "circle-name" | "delete-account" | "delete-card" | "share-link" | null>(null);
  const [toast, setToast] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deletingCard, setDeletingCard] = useState(false);
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
  const demoCard = useQuery(
    api.cards.getPrimaryDemo,
    hydrated && demoSession ? { sessionToken: demoSession } : "skip",
  );
  const contactPage = useQuery(
    api.contacts.listMine,
    hydrated && demoSession ? { sessionToken: demoSession, paginationOpts: { numItems: 100, cursor: null } } : "skip",
  );
  const progress = useQuery(api.progress.mine, hydrated && demoSession ? { sessionToken: demoSession } : "skip");
  const myCircle = useQuery(api.circles.mine, hydrated && demoSession ? { sessionToken: demoSession } : "skip");
  const exchangeInbox = useQuery(api.exchanges.inbox, hydrated && demoSession ? { sessionToken: demoSession } : "skip");
  const introInbox = useQuery(api.intros.inbox, hydrated && demoSession ? { sessionToken: demoSession } : "skip");
  const sentIntroRequests = useQuery(api.intros.sentMine, hydrated && demoSession ? { sessionToken: demoSession } : "skip");
  const personaItems = useQuery(api.persona.mine, hydrated && demoSession ? { sessionToken: demoSession } : "skip");
  const accessLog = useQuery(
    api.persona.accessLogMine,
    hydrated && demoSession && screen === "access-log" ? { sessionToken: demoSession } : "skip",
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
    hydrated && demoSession && selectedContact?.canRequestIntros && selectedContact.linkedUserId
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
    const slug = new URLSearchParams(window.location.search).get("shareback");
    if (slug) setPendingShareBackSlug(slug);
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
      setScreen("auth");
      setAuthError("Your session expired. Sign in again.");
      return;
    }
    setDemoUserId(demoMe.userId);
  }, [demoMe, demoSession]);
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
    if (screen !== "home" || activeTab !== "circles" || !demoSession) return;
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

  function startPersonaFlow() {
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
    if (demoCard) {
      setActiveTab("you");
      navigate("home", "you");
      setToast("Persona preview added for this session.");
    } else {
      navigate("details");
    }
  }

  function removePersonaPreview(id: string) {
    setPersonaPreviews((current) => current.filter((persona) => persona.id !== id));
    setActivePersonaId((current) => current === id ? null : current);
    setEditingPersonaId((current) => current === id ? null : current);
  }

  function clearPersonaPreviews() {
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
        navigate("home", "you");
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
    setActiveTab("you");
    navigate("home", "you");
  }

  async function continueLogo() {
    setSavingCard(true);
    try {
      setProfile(await persistDemoProfile(profile, "draft"));
      navigate("photo");
    } catch (error) {
      setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Your card couldnâ€™t be saved.");
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
      setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Your card couldnâ€™t be saved.");
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
      navigate("auth");
      setToast("Your account was deleted.");
    } catch (error) {
      setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Your account couldnâ€™t be deleted. Try again.");
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
    navigate("auth");
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
      navigate("details");
      setToast("Your demo is ready to start over.");
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

  function changeTab(tab: Tab) {
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
        {screen === "welcome" ? <WelcomeScreen
          onStart={startPersonaFlow}
          onPreview={() => navigate("guest-preview")}
          onSignIn={() => {
            setAuthMode("signin");
            setAuthError("");
            setAuthPassword("");
            setPersonaGatePending(false);
            navigate("auth");
          }}
        /> : null}
        {screen === "guest-preview" ? <GuestCirclePreviewScreen onBack={() => navigate("welcome")} onContinue={startPersonaFlow} /> : null}
        {screen === "auth" ? (
          <>
            {personaGatePending ? <div className="card p1-static-notice p1-auth-context-note"><b>Your persona draft is ready</b><p>Finish creating your demo account to continue. Persona details are a session-only preview in this phase; your existing card flow keeps its current save behavior.</p></div> : null}
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
            onBack={() => navigate("welcome")}
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
            onChange={updatePersonaDraft}
            onBack={() => navigate("persona-permissions")}
            onReview={() => navigate("persona-review")}
          />
        ) : null}
        {screen === "persona-review" ? (
          <PersonaReviewScreen
            draft={personaDraft}
            onChange={updatePersonaDraft}
            onVisibility={(visibility) => setPersonaDraft((current) => ({ ...current, visibility }))}
            onTogglePublicField={togglePersonaPublicField}
            onBack={() => navigate("persona-onboarding")}
            onDiscard={discardPersonaDraft}
            onConfirm={confirmPersonaPreview}
          />
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
                  onCreate={startPersonaFlow}
                  onEdit={editPersonaPreview}
                  onAddMore={addMorePersonaContext}
                  onDelete={removePersonaPreview}
                  onOpenContacts={openContacts}
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
            {activeTab === "scan" ? <ScanScreen onScan={handleScannedLink} /> : null}
            {activeTab === "matches" ? <MatchesLandingScreen onCreateContext={startPersonaFlow} /> : null}
            {activeTab === "notifications" ? <NotificationsLandingScreen /> : null}
            {activeTab === "circles" ? (
              <ScreenErrorBoundary section="your circle">
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
      {screen === "home" && !contactView ? <BottomNav active={activeTab} onChange={changeTab} /> : null}
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
    </>
  );
}

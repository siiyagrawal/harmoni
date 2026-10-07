"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AppHeader, BottomNav, MenuSheet, type MenuAction } from "./navigation";
import {
  CircleScreen,
  CircleSetupScreen,
  ContactCardScreen,
  ContactDetailScreen,
  ContactEntrySheet,
  ContactsScreen,
  DeleteAccountSheet,
  DemoAuthScreen,
  DesignScreen,
  DetailsScreen,
  LogoScreen,
  MyCardScreen,
  PhotoScreen,
  PreviewScreen,
  ScanScreen,
  SetupGuide,
  WelcomeScreen,
} from "./screens";
import { INITIAL_PROFILE, type Contact, type Profile, type Tab, type View } from "./types";

const STORAGE_KEY = "harmoni_demo_v1";
const SESSION_KEY = "harmoni_demo_session";
const USER_ID_KEY = "harmoni_demo_user_id";

type PersistedState = {
  screen: View;
  returnTo: View;
  profile: Profile;
  contacts: Contact[];
  xp: number;
  activeTab: Tab;
  shared: boolean;
  introductions: Record<string, boolean>;
};

function toDemoCardPayload(profile: Profile, sessionToken: string, status?: "draft" | "published") {
  const visibleFields = profile.fields.map((field, order) => ({
    label: field.label,
    value: field.value,
    kind: field.id,
    abbreviation: field.abbreviation,
    color: field.color,
    visible: true,
    order,
  }));

  return {
    sessionToken,
    fullName: profile.name,
    jobTitle: profile.title,
    company: profile.company,
    headline: profile.headline,
    email: profile.email,
    phone: profile.phone,
    website: profile.fields.find((field) => field.id === "website")?.value ?? "",
    photoStorageId: profile.photoStorageId,
    coverStorageId: profile.coverStorageId,
    logoStorageId: profile.logoStorageId,
    logoMode: profile.logo === "auto" ? "auto" as const : profile.logoStorageId ? "image" as const : null,
    squarePhoto: profile.squarePhoto,
    circle: profile.circle,
    wants: profile.wants,
    haves: profile.haves,
    qrOnBack: profile.qrOnBack,
    includeMeetingPlace: profile.includeMeetingPlace,
    links: profile.fields
      .filter((field) => field.value.trim())
      .map((field, order) => ({
        label: field.label,
        url: field.value,
        kind: field.id,
        visible: true,
        order,
      })),
    fields: visibleFields,
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

function profileForLocalCache(profile: Profile): Profile {
  return {
    ...profile,
    photo: profile.photoStorageId ? "" : profile.photo,
    cover: profile.coverStorageId ? "" : profile.cover,
    logo: profile.logoStorageId && profile.logo !== "auto" ? "" : profile.logo,
  };
}

export default function HarmoniApp() {
  const [screen, setScreen] = useState<View>("welcome");
  const [returnTo, setReturnTo] = useState<View>("home");
  const [profile, setProfile] = useState<Profile>(INITIAL_PROFILE);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [xp, setXp] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>("card");
  const [circleName, setCircleName] = useState("");
  const [query, setQuery] = useState("");
  const [shared, setShared] = useState(false);
  const [introductions, setIntroductions] = useState<Record<string, boolean>>({});
  const [selectedContactName, setSelectedContactName] = useState("");
  const [contactView, setContactView] = useState<"detail" | "card" | null>(null);
  const [entryValue, setEntryValue] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [demoSession, setDemoSession] = useState<string | null>(null);
  const [demoUserId, setDemoUserId] = useState<Id<"users"> | null>(null);
  const [authMode, setAuthMode] = useState<"signup" | "signin">("signup");
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [savingCard, setSavingCard] = useState(false);
  const [sheet, setSheet] = useState<"menu" | "setup" | "tag" | "note" | "delete-account" | null>(null);
  const [toast, setToast] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const restoredDemoUser = useRef<string | null>(null);
  const registerDemo = useAction(api.demoAuth.register);
  const signInDemo = useAction(api.demoAuth.signIn);
  const logoutDemo = useMutation(api.users.logoutDemo);
  const removeDemoAccount = useMutation(api.users.deleteDemoAccount);
  const saveDemoProfile = useMutation(api.cards.saveDemoProfile);
  const createDemoImageUploadUrl = useMutation(api.cards.generateDemoImageUploadUrl);
  const demoCard = useQuery(
    api.cards.getPrimaryDemo,
    hydrated && demoSession ? { sessionToken: demoSession } : "skip",
  );

  async function persistDemoProfile(nextProfile: Profile, status: "draft" | "published" = "draft") {
    if (!demoSession) throw new Error("Sign in before saving your card.");
    const saved = await saveDemoProfile(toDemoCardPayload(nextProfile, demoSession, status));
    return {
      ...nextProfile,
      photo: saved.photoUrl ?? "",
      cover: saved.coverUrl ?? "",
      logo: nextProfile.logo === "auto" ? "auto" : saved.logoUrl ?? "",
    };
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
    return upload.storageId;
  }

  // Restore browser-only state after hydration so the server and first client render stay identical.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const session = localStorage.getItem(SESSION_KEY);
      const userId = localStorage.getItem(USER_ID_KEY) as Id<"users"> | null;
      if (session && userId) {
        setDemoSession(session);
        setDemoUserId(userId);
        const saved = localStorage.getItem(`${STORAGE_KEY}_${userId}`);
        if (saved) {
          const state = JSON.parse(saved) as Partial<PersistedState>;
          if (state.profile) setProfile({ ...INITIAL_PROFILE, ...state.profile });
          if (state.contacts) setContacts(state.contacts.map((contact) => ({
            ...contact,
            tags: contact.tags ?? [],
            notes: contact.notes ?? [],
            met: contact.met ?? "",
            introRequested: contact.introRequested ?? false,
          })));
          if (typeof state.xp === "number") setXp(state.xp);
          if (state.activeTab) setActiveTab(state.activeTab);
          if (typeof state.shared === "boolean") setShared(state.shared);
          if (state.introductions) setIntroductions(state.introductions);
          if (state.returnTo) setReturnTo(state.returnTo);
          if (state.profile?.circle) setCircleName(state.profile.circle);
        }
      }
    } catch {}
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated || !demoUserId) return;
    const state: PersistedState = {
      screen,
      returnTo,
      profile: profileForLocalCache(profile),
      contacts,
      xp,
      activeTab,
      shared,
      introductions,
    };
    try {
      localStorage.setItem(`${STORAGE_KEY}_${demoUserId}`, JSON.stringify(state));
    } catch {
      // The app still works when local storage is disabled or full.
    }
  }, [activeTab, contacts, demoUserId, hydrated, introductions, profile, returnTo, screen, shared, xp]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!demoSession || !demoUserId || demoCard === undefined) return;
    if (restoredDemoUser.current === demoUserId) return;
    restoredDemoUser.current = demoUserId;
    if (demoCard) {
      const storedArt = Number.parseInt(demoCard.theme.style, 10);
      const restoredProfile: Profile = {
        ...INITIAL_PROFILE,
        name: demoCard.fullName,
        title: demoCard.jobTitle ?? "",
        company: demoCard.company ?? "",
        headline: demoCard.headline ?? "",
        email: demoCard.email ?? profile.email,
        phone: demoCard.phone ?? profile.phone,
        photo: demoCard.photoUrl ?? profile.photo,
        photoStorageId: demoCard.photoStorageId ?? profile.photoStorageId,
        cover: demoCard.coverUrl ?? profile.cover,
        coverStorageId: demoCard.coverStorageId ?? profile.coverStorageId,
        logo: demoCard.logoMode === "auto" ? "auto" : demoCard.logoUrl ?? profile.logo,
        logoStorageId: demoCard.logoStorageId ?? profile.logoStorageId,
        squarePhoto: demoCard.squarePhoto ?? profile.squarePhoto,
        circle: demoCard.circle ?? profile.circle,
        wants: demoCard.wants ?? profile.wants,
        haves: demoCard.haves ?? profile.haves,
        qrOnBack: demoCard.qrOnBack ?? profile.qrOnBack,
        includeMeetingPlace: demoCard.includeMeetingPlace ?? profile.includeMeetingPlace,
        fields: demoCard.fields.length ? demoCard.fields.map((field) => ({
          id: field.kind,
          label: field.label,
          abbreviation: field.abbreviation ?? field.kind.slice(0, 2),
          color: field.color ?? "#1d5647",
          value: field.value,
        })) : profile.fields,
        art: Number.isFinite(storedArt) ? storedArt : profile.art,
      };
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

  useEffect(() => {
    document.body.classList.toggle("w", screen === "welcome");
    return () => document.body.classList.remove("w");
  }, [screen]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function navigate(next: View) {
    setScreen(next);
    setSheet(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateText(field: "name" | "title" | "company" | "headline" | "email" | "phone", value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
  }

  function startCard() {
    setAuthMode("signup");
    setAuthError("");
    setAuthPassword("");
    navigate("auth");
  }

  async function submitDemoAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (authBusy) return;
    setAuthBusy(true);
    setAuthError("");

    try {
      const result = authMode === "signup"
        ? await registerDemo({ username: authUsername, password: authPassword })
        : await signInDemo({ username: authUsername, password: authPassword });

      restoredDemoUser.current = null;
      setDemoSession(result.sessionToken);
      setDemoUserId(result.userId);
      try {
        localStorage.setItem(SESSION_KEY, result.sessionToken);
        localStorage.setItem(USER_ID_KEY, result.userId);
      } catch {
        setToast("You’re signed in for this browser session.");
      }
      setAuthPassword("");
      setActiveTab("card");
      if (result.hasCard) {
        navigate("home");
      } else {
        setProfile(INITIAL_PROFILE);
        setContacts([]);
        setXp(0);
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
    setXp((current) => Math.max(current, 100));
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
        if (kind === "photo" && !profile.photo) setXp((current) => current + 100);

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
      } catch (error) {
        setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Your card couldn’t be saved.");
        setSavingCard(false);
        return;
      }
      setSavingCard(false);
    }
    setCircleName(name);
    setXp((current) => current + 150);
    setActiveTab("card");
    navigate("home");
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
        if (demoUserId) localStorage.removeItem(`${STORAGE_KEY}_${demoUserId}`);
        localStorage.removeItem(SESSION_KEY);
        localStorage.removeItem(USER_ID_KEY);
      } catch {}

      restoredDemoUser.current = null;
      setDemoSession(null);
      setDemoUserId(null);
      setAuthUsername("");
      setAuthPassword("");
      setProfile(INITIAL_PROFILE);
      setContacts([]);
      setXp(0);
      setCircleName("");
      setShared(false);
      setIntroductions({});
      setContactView(null);
      setSelectedContactName("");
      setActiveTab("card");
      setQuery("");
      setSheet(null);
      navigate("welcome");
      setToast("Your account was deleted.");
    } catch (error) {
      setToast(error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Your account couldnâ€™t be deleted. Try again.");
    } finally {
      setDeletingAccount(false);
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
      localStorage.removeItem(USER_ID_KEY);
    } catch {}
    restoredDemoUser.current = null;
    setDemoSession(null);
    setDemoUserId(null);
    setAuthPassword("");
    setAuthUsername("");
    setProfile(INITIAL_PROFILE);
    setContacts([]);
    setXp(0);
    setCircleName("");
    setShared(false);
    setIntroductions({});
    setContactView(null);
    setSelectedContactName("");
    setActiveTab("card");
    navigate("welcome");
  }

  async function shareCard() {
    setSheet(null);
    if (!shared) {
      setShared(true);
      setXp((current) => current + 100);
    }
    const slug = demoCard?.slug || authUsername.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-") || profile.name.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const url = `https://harmoni.app/c/${slug || "my-card"}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: profile.name || "My Harmoni card", url });
        setToast("Your card is ready to share");
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setToast("Link copied");
      } else {
        setToast(url);
      }
    } catch {
      setToast("Your card link is ready: harmoni.app/c/" + (slug || "my-card"));
    }
  }

  function addDemoContact() {
    if (!contacts.some((contact) => contact.name === "Jack Moreno")) {
      setContacts((current) => [
        {
          name: "Jack Moreno",
          title: "Founder",
          company: "Independent",
          email: "jack@moreno.studio",
          phone: "",
          photo: "",
          when: "Today",
          source: "Scanned",
          tags: ["New connection"],
          notes: [],
          met: "",
          introRequested: false,
        },
        ...current,
      ]);
      setXp((current) => current + 250);
      setToast("You and Jack are connected");
    } else {
      setToast("You’re already connected");
    }
    setActiveTab("contacts");
    setSheet(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
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
        setActiveTab("card");
        setToast("Tap your card to reveal your QR");
        break;
      case "signature":
        setSheet(null);
        setToast(`${profile.name} · ${profile.title || "Harmoni"} · harmoni.app/c/${profile.name.toLowerCase().replace(/[^a-z0-9]+/g, "")}`);
        break;
      case "scan":
        setSheet(null);
        setActiveTab("scan");
        break;
      case "reset":
        setSheet(null);
        clearDemoSession();
        break;
      case "signout":
        setSheet(null);
        clearDemoSession();
        break;
      case "delete-account":
        setSheet("delete-account");
        break;
    }
  }

  function changeTab(tab: Tab) {
    setActiveTab(tab);
    setQuery("");
    setContactView(null);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function saveContactEntry() {
    const value = entryValue.trim();
    if (!value || !selectedContactName) return;
    setContacts((current) => current.map((contact) => {
      if (contact.name !== selectedContactName) return contact;
      if (sheet === "tag") {
        return { ...contact, tags: contact.tags.includes(value) ? contact.tags : [...contact.tags, value] };
      }
      const at = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      return { ...contact, notes: [{ text: value, at }, ...contact.notes] };
    }));
    setEntryValue("");
    setSheet(null);
  }

  const selectedContact = contacts.find((contact) => contact.name === selectedContactName);

  return (
    <>
      <main className={`app${screen === "welcome" ? " welcome in" : screen === "auth" ? " auth in" : " in"}`}>
        {screen === "welcome" ? <WelcomeScreen onStart={startCard} /> : null}
        {screen === "auth" ? (
          <DemoAuthScreen
            mode={authMode}
            username={authUsername}
            password={authPassword}
            error={authError}
            busy={authBusy}
            onUsername={setAuthUsername}
            onPassword={setAuthPassword}
            onSubmit={(event) => void submitDemoAuth(event)}
            onToggleMode={() => {
              setAuthMode((mode) => mode === "signup" ? "signin" : "signup");
              setAuthError("");
              setAuthPassword("");
            }}
            onBack={() => navigate("welcome")}
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
              if (!profile.logo) setXp((current) => current + 50);
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
            saving={savingCard}
            onArt={(art) => setProfile((current) => ({ ...current, art }))}
            onUpdate={(updates) => setProfile((current) => ({ ...current, ...updates }))}
            onUpload={handleImage}
            onBack={() => navigate(returnTo)}
            onSave={() => void saveDesign()}
            onReset={() => {
              setProfile(INITIAL_PROFILE);
              setContacts([]);
              setXp(0);
              setShared(false);
              setIntroductions({});
              setCircleName("");
              setActiveTab("card");
              setContactView(null);
              navigate("welcome");
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
            {activeTab === "card" ? (
              <MyCardScreen profile={profile} xp={xp} onShare={() => void shareCard()} />
            ) : null}
            {activeTab === "contacts" && !contactView ? (
              <ContactsScreen
                contacts={contacts}
                query={query}
                onQuery={setQuery}
                onScan={() => changeTab("scan")}
                onSelect={(name) => {
                  setSelectedContactName(name);
                  setContactView("detail");
                }}
              />
            ) : null}
            {activeTab === "contacts" && contactView === "detail" && selectedContact ? (
              <ContactDetailScreen
                contact={selectedContact}
                onBack={() => setContactView(null)}
                onViewCard={() => setContactView("card")}
                onAskIntro={() => {
                  if (!selectedContact.introRequested) {
                    setContacts((current) => current.map((contact) => contact.name === selectedContact.name ? { ...contact, introRequested: true } : contact));
                    setXp((current) => current + 75);
                    setToast(`Intro request sent through ${selectedContact.name}`);
                  } else {
                    setToast(`Waiting for ${selectedContact.name} to approve your request`);
                  }
                }}
                onTag={() => { setEntryValue(""); setSheet("tag"); }}
                onNote={() => { setEntryValue(""); setSheet("note"); }}
              />
            ) : null}
            {activeTab === "contacts" && contactView === "card" && selectedContact ? (
              <ContactCardScreen contact={selectedContact} onBack={() => setContactView("detail")} />
            ) : null}
            {activeTab === "scan" ? <ScanScreen profile={profile} onScan={addDemoContact} /> : null}
            {activeTab === "circle" ? (
              <CircleScreen
                profile={profile}
                contacts={contacts}
                introductions={introductions}
                onScan={() => changeTab("scan")}
                onShare={() => void shareCard()}
                onAskIntro={(name) => {
                  if (introductions[name]) {
                    setToast(`Waiting for ${contacts[0]?.name.split(" ")[0] ?? "your connection"} to approve`);
                    return;
                  }
                  setIntroductions((current) => ({ ...current, [name]: true }));
                  setXp((current) => current + 75);
                  setToast(`Request sent to ${contacts[0]?.name.split(" ")[0] ?? "your connection"}`);
                }}
              />
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
      {sheet === "setup" ? (
        <SetupGuide
          onDismiss={() => setSheet(null)}
          onDesign={() => openDesign("home")}
          onShare={() => void shareCard()}
          onScan={() => changeTab("scan")}
        />
      ) : null}
      {sheet === "tag" || sheet === "note" ? (
        <ContactEntrySheet
          kind={sheet}
          value={entryValue}
          onChange={setEntryValue}
          onSave={saveContactEntry}
          onDismiss={() => setSheet(null)}
        />
      ) : null}
      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </>
  );
}

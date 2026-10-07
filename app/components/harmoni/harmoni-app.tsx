"use client";

import { useEffect, useState } from "react";
import { AppHeader, BottomNav, MenuSheet, type MenuAction } from "./navigation";
import {
  CircleScreen,
  CircleSetupScreen,
  ContactCardScreen,
  ContactDetailScreen,
  ContactEntrySheet,
  ContactsScreen,
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
  const [sheet, setSheet] = useState<"menu" | "setup" | "tag" | "note" | null>(null);
  const [toast, setToast] = useState("");

  // Restore browser-only state after hydration so the server and first client render stay identical.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
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
        if (state.screen) setScreen(state.screen === "design" ? state.returnTo ?? "home" : state.screen);
        if (state.returnTo) setReturnTo(state.returnTo);
        if (state.profile?.circle) setCircleName(state.profile.circle);
      }
    } catch {}
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return;
    const state: PersistedState = { screen, returnTo, profile, contacts, xp, activeTab, shared, introductions };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // The app still works when local storage is disabled or full.
    }
  }, [activeTab, contacts, hydrated, introductions, profile, returnTo, screen, shared, xp]);

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
    if (!profile.name) setProfile(INITIAL_PROFILE);
    navigate("details");
  }

  function continueDetails() {
    if (!profile.name.trim()) {
      setToast("Add your name to continue");
      return;
    }
    setCircleName((current) => current || `${profile.name.trim().split(/\s+/)[0]}'s Circle`);
    setXp((current) => Math.max(current, 100));
    navigate("logo");
  }

  function handleImage(file: File, kind: "photo" | "logo" | "cover") {
    void optimizeImage(file, kind === "cover" ? 800 : 480, kind === "logo" ? "image/png" : "image/jpeg")
      .then((dataUrl) => {
        setProfile((current) => ({ ...current, [kind]: dataUrl }));
        if (kind === "photo" && !profile.photo) setXp((current) => current + 100);
        setToast(`${kind === "cover" ? "Cover" : kind === "photo" ? "Photo" : "Logo"} added to your card`);
      })
      .catch(() => setToast("We couldn’t use that image. Try another one."));
  }

  function finishCircle() {
    const name = circleName.trim() || `${profile.name.split(/\s+/)[0]}'s Circle`;
    setProfile((current) => ({ ...current, circle: name }));
    setCircleName(name);
    setXp((current) => current + 150);
    setActiveTab("card");
    navigate("home");
  }

  function openDesign(from: View) {
    setReturnTo(from);
    navigate("design");
  }

  async function shareCard() {
    setSheet(null);
    if (!shared) {
      setShared(true);
      setXp((current) => current + 100);
    }
    const slug = profile.name.toLowerCase().replace(/[^a-z0-9]+/g, "");
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
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {}
        setProfile(INITIAL_PROFILE);
        setContacts([]);
        setXp(0);
        setActiveTab("card");
        setCircleName("");
        setShared(false);
        setIntroductions({});
        setContactView(null);
        setSheet(null);
        navigate("welcome");
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
      <main className={`app${screen === "welcome" ? " welcome in" : " in"}`}>
        {screen === "welcome" ? <WelcomeScreen onStart={startCard} /> : null}
        {screen === "details" ? (
          <DetailsScreen profile={profile} xp={xp} onChange={updateText} onBack={() => navigate("welcome")} onContinue={continueDetails} />
        ) : null}
        {screen === "logo" ? (
          <LogoScreen
            profile={profile}
            xp={xp}
            onBack={() => navigate("details")}
            onAuto={() => {
              if (!profile.logo) setXp((current) => current + 50);
              setProfile((current) => ({ ...current, logo: "auto" }));
            }}
            onUpload={(file) => handleImage(file, "logo")}
            onRemove={() => setProfile((current) => ({ ...current, logo: "" }))}
            onContinue={() => navigate("photo")}
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
            onArt={(art) => setProfile((current) => ({ ...current, art }))}
            onUpdate={(updates) => setProfile((current) => ({ ...current, ...updates }))}
            onUpload={handleImage}
            onBack={() => navigate(returnTo)}
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

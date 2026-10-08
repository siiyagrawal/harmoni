"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import type { Profile } from "./types";
import DigitalCard from "./digital-card";

const SESSION_KEY = "harmoni_demo_session";

type PendingAction = "save" | "share-back";
type AuthMode = "signup" | "signin";

export default function PublicCard({ slug }: { slug: string }) {
  const router = useRouter();
  const card = useQuery(api.cards.getPublicBySlug, { slug });
  const signUp = useAction(api.auth.signUp);
  const logIn = useAction(api.auth.logIn);
  const getMe = useAction(api.auth.me);
  const saveCard = useMutation(api.contacts.savePublicCard);
  const sendExchange = useMutation(api.exchanges.send);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode>("signup");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try {
        setSessionToken(localStorage.getItem(SESSION_KEY));
      } catch {
        setSessionToken(null);
      }
      setOrigin(window.location.origin);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (card === undefined) return <main className="app in"><p className="c">Loading card…</p></main>;
  if (!card) return <main className="app in"><h1>Card not found</h1><p>This card is not published or the link has changed.</p></main>;
  const publicCard = card;

  const cardFields = publicCard.fields.map((field) => ({
    id: field.kind,
    label: field.label,
    abbreviation: field.abbreviation ?? field.kind.slice(0, 2),
    color: field.color ?? "#9479de",
    value: field.value,
  }));
  const profile: Profile = {
    name: publicCard.fullName,
    title: publicCard.jobTitle ?? "",
    company: publicCard.company ?? "",
    headline: publicCard.headline ?? "",
    publicUrl: origin ? `${origin}/c/${publicCard.slug}` : "",
    email: "",
    phone: "",
    photo: publicCard.photoUrl ?? "",
    photoStorageId: null,
    cover: publicCard.coverUrl ?? "",
    coverStorageId: null,
    logo: publicCard.logoMode === "auto" ? "auto" : publicCard.logoUrl ?? "",
    logoStorageId: null,
    squarePhoto: publicCard.squarePhoto ?? false,
    art: Number.parseInt(publicCard.theme.style, 10) || 0,
    circle: "",
    fields: cardFields,
    qrOnBack: publicCard.qrOnBack ?? true,
    includeMeetingPlace: publicCard.includeMeetingPlace ?? true,
  };

  async function continueAction(action: PendingAction, token: string, hasCard: boolean) {
    if (action === "save") {
      await saveCard({ sessionToken: token, slug: publicCard.slug });
      setNotice("Card saved to your contacts.");
      setPendingAction(null);
      setGateOpen(false);
      return;
    }
    if (!hasCard) {
      router.push(`/?shareback=${encodeURIComponent(publicCard.slug)}`);
      return;
    }
    await sendExchange({ sessionToken: token, slug: publicCard.slug });
    setNotice("Your card exchange request was sent.");
    setPendingAction(null);
    setGateOpen(false);
  }

  async function beginAction(action: PendingAction) {
    setNotice("");
    if (!sessionToken) {
      // DEMO: replace with email verification
      setPendingAction(action);
      setGateOpen(true);
      return;
    }
    try {
      const me = await getMe({ sessionToken });
      if (!me) {
        localStorage.removeItem(SESSION_KEY);
        setSessionToken(null);
        setPendingAction(action);
        setGateOpen(true);
        return;
      }
      await continueAction(action, sessionToken, me.hasCard);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message.replace(/^Uncaught Error:\s*/, "") : "Please sign in to continue.";
      if (/session expired/i.test(message)) {
        localStorage.removeItem(SESSION_KEY);
        setSessionToken(null);
        setPendingAction(action);
        setGateOpen(true);
      }
      setError(message);
    }
  }

  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !pendingAction) return;
    setBusy(true);
    setError("");
    try {
      const result = authMode === "signup"
        ? await signUp({ username, password })
        : await logIn({ username, password });
      localStorage.setItem(SESSION_KEY, result.sessionToken);
      setSessionToken(result.sessionToken);
      setPassword("");
      await continueAction(pendingAction, result.sessionToken, result.hasCard);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message.replace(/^Uncaught Error:\s*/, "") : "Could not create your account.");
    } finally {
      setBusy(false);
    }
  }

  async function sharePublicLink() {
    const url = `${window.location.origin}/c/${publicCard.slug}`;
    try {
      if (navigator.share) await navigator.share({ title: `${publicCard.fullName}'s Harmoni card`, url });
      else await navigator.clipboard.writeText(url);
      setNotice("Card link copied and ready to share.");
    } catch {
      setNotice("Sharing is unavailable in this browser.");
    }
  }

  return (
    <main className="app in public-card-page">
      <div className="top"><span className="wm">Harmoni</span><span className="tag">Digital business card</span></div>
      <DigitalCard profile={profile} flipOnClick />
      <div className="public-card-actions">
        <button className="btn" type="button" onClick={() => void beginAction("save")}>Save card</button>
        <button className="btn g" type="button" onClick={() => void beginAction("share-back")}>Share yours back</button>
        <button className="lk" type="button" onClick={() => void sharePublicLink()}>Share this card link</button>
      </div>
      {notice ? <p className="c" role="status">{notice}</p> : null}
      {gateOpen ? (
        <section className="public-account-gate">
          <div className="row gate-heading">
            <h2>{authMode === "signup" ? "Create an account to continue" : "Sign in to continue"}</h2>
            <button className="ib" type="button" aria-label="Close" onClick={() => setGateOpen(false)}>×</button>
          </div>
          <p>{pendingAction === "save" ? "We’ll save this card to your contacts after signup." : "Your account will be ready to build and share your card."}</p>
          <form className="auth-form" onSubmit={(event) => void submitAccount(event)}>
            <label className="f">
              <span>Username or email</span>
              <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" minLength={3} maxLength={254} required />
            </label>
            <label className="f">
              <span>Password</span>
              <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" autoComplete={authMode === "signup" ? "new-password" : "current-password"} minLength={8} maxLength={256} required />
            </label>
            {error ? <p className="auth-error" role="alert">{error}</p> : null}
            <div className="auth-actions"><button className="btn pu" type="submit" disabled={busy}>{busy ? "Please wait…" : authMode === "signup" ? "Create account" : "Sign in"}</button></div>
          </form>
          <p className="auth-switch">
            {authMode === "signup" ? "Already have an account?" : "New to Harmoni?"}{" "}
            <button className="lk" type="button" onClick={() => { setAuthMode((mode) => mode === "signup" ? "signin" : "signup"); setError(""); }}>{authMode === "signup" ? "Sign in" : "Create an account"}</button>
          </p>
        </section>
      ) : null}
    </main>
  );
}

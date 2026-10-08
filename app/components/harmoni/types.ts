import type { Id } from "../../../convex/_generated/dataModel";

export type View =
  | "welcome"
  | "auth"
  | "guest-preview"
  | "join-code"
  | "persona-select"
  | "persona-permissions"
  | "persona-onboarding"
  | "persona-review"
  | "persona-started"
  | "dossier"
  | "circle-create"
  | "circle-join"
  | "circle-link"
  | "hub-apply"
  | "share-entry"
  | "card-capture"
  | "express-interest"
  | "request-review"
  | "help-offer"
  | "help-request"
  | "spotlight-ask"
  | "messages"
  | "thread"
  | "notification-settings"
  | "impact"
  | "feedback"
  | "admin"
  | "privacy"
  | "guest-value"
  | "verify-email"
  | "invite-landing"
  | "details"
  | "logo"
  | "photo"
  | "preview"
  | "circle-setup"
  | "design"
  | "access-log"
  | "home";

export type Tab = "circles" | "scan" | "matches" | "notifications" | "you" | "contacts";

export type PersonaType = "business" | "personal" | "singles" | "family" | "custom";

export type PersonaVisibility = "private" | "connections" | "circle" | "custom";

export type PersonaDraft = {
  type: PersonaType;
  name: string;
  needs: string;
  offers: string;
  interests: string;
  visibility: PersonaVisibility;
  publicFields: string[];
};

export type PersonaPreview = PersonaDraft & {
  id: string;
};

export type Profile = {
  name: string;
  title: string;
  company: string;
  headline: string;
  publicUrl: string;
  email: string;
  phone: string;
  photo: string;
  photoStorageId: Id<"_storage"> | null;
  cover: string;
  coverStorageId: Id<"_storage"> | null;
  logo: string;
  logoStorageId: Id<"_storage"> | null;
  squarePhoto: boolean;
  art: number;
  circle: string;
  fields: ProfileField[];
  qrOnBack: boolean;
  includeMeetingPlace: boolean;
};

export type ProfileField = {
  id: string;
  label: string;
  abbreviation: string;
  color: string;
  value: string;
};

export type ContactNote = { text: string; at: string };

export type Contact = {
  id: Id<"contacts">;
  linkedUserId?: Id<"users">;
  name: string;
  publicUrl: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  photo: string;
  when: string;
  source: string;
  canRequestIntros: boolean;
  introducedByName?: string;
  tags: string[];
  notes: ContactNote[];
  met: string;
  introRequested: boolean;
};

export const INITIAL_PROFILE: Profile = {
  name: "",
  title: "",
  company: "",
  headline: "",
  publicUrl: "",
  email: "",
  phone: "",
  photo: "",
  photoStorageId: null,
  cover: "",
  coverStorageId: null,
  logo: "",
  logoStorageId: null,
  squarePhoto: false,
  art: 0,
  circle: "",
  fields: [],
  qrOnBack: true,
  includeMeetingPlace: true,
};

export const CARD_ARTS = [
  "Gilded Silk",
  "Aurora",
  "Contour",
  "Sunburst",
  "Terrazzo",
  "Dune",
  "Bloom",
  "Mosaic",
];

import type { Id } from "../../../convex/_generated/dataModel";

export type View =
  | "welcome"
  | "auth"
  | "details"
  | "logo"
  | "photo"
  | "preview"
  | "circle-setup"
  | "design"
  | "home";

export type Tab = "card" | "contacts" | "scan" | "circle";

export type Profile = {
  name: string;
  title: string;
  company: string;
  headline: string;
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
  wants: string[];
  haves: string[];
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
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  photo: string;
  when: string;
  source: string;
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
  wants: [],
  haves: [],
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

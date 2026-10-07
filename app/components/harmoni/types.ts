export type View =
  | "welcome"
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
  cover: string;
  logo: string;
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
  cover: "",
  logo: "",
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

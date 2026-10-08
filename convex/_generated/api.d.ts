/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions from "../actions.js";
import type * as auth from "../auth.js";
import type * as cards from "../cards.js";
import type * as circles from "../circles.js";
import type * as contacts from "../contacts.js";
import type * as exchanges from "../exchanges.js";
import type * as intros from "../intros.js";
import type * as lib_accountDeletion from "../lib/accountDeletion.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_demoAuthHelper from "../lib/demoAuthHelper.js";
import type * as lib_networking from "../lib/networking.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as lib_progress from "../lib/progress.js";
import type * as lib_session from "../lib/session.js";
import type * as lib_slugs from "../lib/slugs.js";
import type * as matching from "../matching.js";
import type * as migrations from "../migrations.js";
import type * as persona from "../persona.js";
import type * as progress from "../progress.js";
import type * as seeds from "../seeds.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  actions: typeof actions;
  auth: typeof auth;
  cards: typeof cards;
  circles: typeof circles;
  contacts: typeof contacts;
  exchanges: typeof exchanges;
  intros: typeof intros;
  "lib/accountDeletion": typeof lib_accountDeletion;
  "lib/auth": typeof lib_auth;
  "lib/demoAuthHelper": typeof lib_demoAuthHelper;
  "lib/networking": typeof lib_networking;
  "lib/permissions": typeof lib_permissions;
  "lib/progress": typeof lib_progress;
  "lib/session": typeof lib_session;
  "lib/slugs": typeof lib_slugs;
  matching: typeof matching;
  migrations: typeof migrations;
  persona: typeof persona;
  progress: typeof progress;
  seeds: typeof seeds;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};

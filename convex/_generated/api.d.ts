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
import type * as cards from "../cards.js";
import type * as contacts from "../contacts.js";
import type * as demoAuth from "../demoAuth.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_demoAuthHelper from "../lib/demoAuthHelper.js";
import type * as lib_slugs from "../lib/slugs.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  actions: typeof actions;
  cards: typeof cards;
  contacts: typeof contacts;
  demoAuth: typeof demoAuth;
  "lib/auth": typeof lib_auth;
  "lib/demoAuthHelper": typeof lib_demoAuthHelper;
  "lib/slugs": typeof lib_slugs;
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

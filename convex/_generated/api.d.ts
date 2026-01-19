/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as attachments from "../attachments.js";
import type * as auth from "../auth.js";
import type * as billingConfig from "../billingConfig.js";
import type * as chatHistory from "../chatHistory.js";
import type * as creditLedger from "../creditLedger.js";
import type * as credits from "../credits.js";
import type * as crons from "../crons.js";
import type * as entitlements from "../entitlements.js";
import type * as http from "../http.js";
import type * as plans from "../plans.js";
import type * as stripe from "../stripe.js";
import type * as tasks from "../tasks.js";
import type * as users from "../users.js";
import type * as validators_chat from "../validators/chat.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  attachments: typeof attachments;
  auth: typeof auth;
  billingConfig: typeof billingConfig;
  chatHistory: typeof chatHistory;
  creditLedger: typeof creditLedger;
  credits: typeof credits;
  crons: typeof crons;
  entitlements: typeof entitlements;
  http: typeof http;
  plans: typeof plans;
  stripe: typeof stripe;
  tasks: typeof tasks;
  users: typeof users;
  "validators/chat": typeof validators_chat;
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

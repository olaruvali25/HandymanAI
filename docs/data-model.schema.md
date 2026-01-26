# Data model (schema)

<!--
  GENERATED FILE — DO NOT EDIT BY HAND
  Source: convex/schema.ts
  Run: `bun run docs:data-model`
-->

This document is generated from `convex/schema.ts`.

All Convex documents also include `_id: Id<"table">` and `_creationTime: number` (ms since epoch).

Auth-related tables are included via `authTables` from `@convex-dev/auth/server` and are not expanded here.

## users

Fields:

- `name?`: string
- `image?`: string
- `email?`: string
- `emailVerificationTime?`: number
- `phone?`: string
- `phoneVerificationTime?`: number
- `isAnonymous?`: boolean
- `isAdmin?`: boolean
- `plan?`: "none" | "starter" | "plus" | "pro"
- `credits?`: number
- `createdAt?`: number
- `updatedAt?`: number
- `lastPlanCreditGrantAt?`: number
- `lastPlanCreditGrantPeriodKey?`: string
- `lastFreeGrantAt?`: number
- `loginBonusGrantedAt?`: number
- `currentPeriodStart?`: number
- `currentPeriodEnd?`: number
- `billingAnchor?`: number
- `nextRenewalAt?`: number
- `pendingDowngradePlan?`: "none" | "starter" | "plus" | "pro"
- `stripeCustomerId?`: string
- `stripeSubscriptionId?`: string
- `stripeSubscriptionStatus?`: string
- `stripeCurrentPeriodEnd?`: number
- `stripePriceId?`: string

Indexes:

- `email`: (`email`)
- `phone`: (`phone`)
- `by_plan`: (`plan`)
- `by_stripeCustomerId`: (`stripeCustomerId`)

## anonymousUsers

Fields:

- `anonymousId`: string
- `credits`: number
- `createdAt`: number
- `updatedAt`: number
- `mergedToUserId?`: Id<"users">

Indexes:

- `by_anonymousId`: (`anonymousId`)

## tasks

Fields:

- `userId`: Id<"users">
- `title`: string
- `completed`: boolean
- `createdAt`: number

Indexes:

- `by_user`: (`userId`)
- `by_user_createdAt`: (`userId`, `createdAt`)

## chatThreads

Fields:

- `userId?`: Id<"users">
- `anonymousId?`: string
- `guestChatId?`: string
- `title`: string
- `createdAt`: number
- `updatedAt`: number
- `lastPreview`: string

Indexes:

- `by_user_updatedAt`: (`userId`, `updatedAt`)
- `by_anonymousId`: (`anonymousId`)
- `by_guestChatId`: (`guestChatId`)

## chatMessages

Fields:

- `threadId`: Id<"chatThreads">
- `userId?`: Id<"users">
- `anonymousId?`: string
- `guestChatId?`: string
- `role`: "user" | "assistant" | "system"
- `contentText`: string
- `attachments?`: { name: string; type: string; size: number; storageId?: Id<"\_storage">; url?: string; dataUrl?: string }[]
- `actions?`: { type: "link"; label: string; href: string; variant?: "primary" | "secondary" }[]
- `createdAt`: number

Indexes:

- `by_thread_createdAt`: (`threadId`, `createdAt`)

## creditCharges

Fields:

- `actorType`: "user" | "anonymous"
- `userId?`: Id<"users">
- `anonymousId?`: string
- `turnId`: string
- `stage`: "user" | "assistant"
- `amount`: number
- `createdAt`: number

Indexes:

- `by_user_turn_stage`: (`userId`, `turnId`, `stage`)
- `by_anonymous_turn_stage`: (`anonymousId`, `turnId`, `stage`)

## creditGrants

Fields:

- `userId`: Id<"users">
- `type`: "plan_monthly" | "plan_start" | "topup"
- `provider?`: string
- `eventId`: string
- `periodKey?`: string
- `plan?`: "none" | "starter" | "plus" | "pro"
- `amount`: number
- `createdAt`: number

Indexes:

- `by_user_type_period`: (`userId`, `type`, `periodKey`)
- `by_event`: (`eventId`)

## creditLedger

Fields:

- `actorType`: "user" | "anonymous"
- `userId?`: Id<"users">
- `anonymousId?`: string
- `kind`: "anon_initial_20" | "login_bonus_10" | "free_48h_15" | "plan_reset" | "plan_upgrade_add" | "plan_renewal_reset" | "topup_add" | "chat_user_send" | "chat_assistant_reply" | "chat_text_turn" | "chat_image_turn" | "out_of_credits_block"
- `amount`: number
- `balanceAfter`: number
- `stripeEventId?`: string
- `threadId?`: Id<"chatThreads">
- `turnId?`: string
- `createdAt`: number

Indexes:

- `by_user_createdAt`: (`userId`, `createdAt`)
- `by_anonymous_createdAt`: (`anonymousId`, `createdAt`)
- `by_stripeEventId`: (`stripeEventId`)
- `by_user_turn_kind`: (`userId`, `turnId`, `kind`)
- `by_anonymous_turn_kind`: (`anonymousId`, `turnId`, `kind`)

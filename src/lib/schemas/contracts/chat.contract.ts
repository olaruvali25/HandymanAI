import type {
  ChatAttachment as ConvexChatAttachment,
  ChatMessageRole as ConvexChatMessageRole,
} from "@convex/validators/chat";

import type { Assert, Equals } from "@/lib/types/type-assert";

import type { ChatAttachment, ChatMessageRole } from "../chat";

export type ChatMessageRoleContract = Assert<
  Equals<ChatMessageRole, ConvexChatMessageRole>
>;
export type ChatAttachmentContract = Assert<
  Equals<ChatAttachment, ConvexChatAttachment>
>;

export {};

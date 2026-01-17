import { v, type Infer } from "convex/values";

export const chatMessageRoleValidator = v.union(
  v.literal("user"),
  v.literal("assistant"),
  v.literal("system"),
);
export type ChatMessageRole = Infer<typeof chatMessageRoleValidator>;

// Attachments are currently limited to inline image payloads (data:image/* URLs).
export const chatAttachmentValidator = v.object({
  name: v.string(),
  type: v.string(),
  dataUrl: v.string(),
  size: v.number(),
});
export type ChatAttachment = Infer<typeof chatAttachmentValidator>;

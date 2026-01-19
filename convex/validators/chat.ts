import { v, type Infer } from "convex/values";

export const chatMessageRoleValidator = v.union(
  v.literal("user"),
  v.literal("assistant"),
  v.literal("system"),
);
export type ChatMessageRole = Infer<typeof chatMessageRoleValidator>;

export const chatAttachmentValidator = v.object({
  name: v.string(),
  type: v.string(),
  size: v.number(),
  storageId: v.optional(v.id("_storage")),
  url: v.optional(v.string()),
  dataUrl: v.optional(v.string()),
});
export type ChatAttachment = Infer<typeof chatAttachmentValidator>;

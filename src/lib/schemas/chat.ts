import { z } from "zod";

export const CHAT_MAX_IMAGE_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const ChatMessageRoleSchema = z.enum(["user", "assistant", "system"]);
export type ChatMessageRole = z.infer<typeof ChatMessageRoleSchema>;

export const ChatAttachmentSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.string().min(1).max(100),
  dataUrl: z.string().startsWith("data:image/"),
  size: z.number().int().nonnegative().max(CHAT_MAX_IMAGE_ATTACHMENT_BYTES),
});
export type ChatAttachment = z.infer<typeof ChatAttachmentSchema>;

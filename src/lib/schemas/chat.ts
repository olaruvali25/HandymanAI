import { z } from "zod";
import type { Id } from "@convex/_generated/dataModel";

export const CHAT_MAX_IMAGE_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const ChatMessageRoleSchema = z.enum(["user", "assistant", "system"]);
export type ChatMessageRole = z.infer<typeof ChatMessageRoleSchema>;

export const ChatMessageActionSchema = z.object({
  type: z.literal("link"),
  label: z.string().min(1).max(200),
  href: z.string().min(1).max(500),
  variant: z.enum(["primary", "secondary"]).optional(),
});
export type ChatMessageAction = z.infer<typeof ChatMessageActionSchema>;

const StorageIdSchema: z.ZodType<Id<"_storage">> = z
  .string()
  .transform((value) => value as Id<"_storage">);

export const ChatAttachmentSchema = z
  .object({
    name: z.string().min(1).max(200),
    type: z.string().min(1).max(100),
    size: z.number().int().nonnegative().max(CHAT_MAX_IMAGE_ATTACHMENT_BYTES),
    storageId: StorageIdSchema.optional(),
    url: z.string().url().optional(),
    dataUrl: z.string().startsWith("data:image/").optional(),
  })
  .refine((value) => Boolean(value.dataUrl || value.url || value.storageId), {
    message: "Attachment must include dataUrl, url, or storageId.",
  });
export type ChatAttachment = z.infer<typeof ChatAttachmentSchema>;

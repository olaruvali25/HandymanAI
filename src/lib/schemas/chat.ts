import { z } from "zod";
import type { Id } from "@convex/_generated/dataModel";

export const CHAT_MAX_IMAGE_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export const ChatMessageRoleSchema = z.enum(["user", "assistant", "system"]);
export type ChatMessageRole = z.infer<typeof ChatMessageRoleSchema>;

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

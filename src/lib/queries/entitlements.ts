import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import {
  ClientEntitlementsSchema,
  type ClientEntitlements,
} from "@/lib/schemas/entitlements";

const AiGetResponseSchema = z.object({
  entitlements: ClientEntitlementsSchema,
});

export const entitlementsQueryKey = ["entitlements"] as const;

const fetchEntitlements = async (): Promise<ClientEntitlements> => {
  const response = await fetch("/api/ai");
  const json = (await response.json()) as unknown;
  const parsed = AiGetResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("Invalid entitlements payload.");
  }
  return parsed.data.entitlements;
};

export const useEntitlementsQuery = () => {
  return useQuery({
    queryKey: entitlementsQueryKey,
    queryFn: fetchEntitlements,
  });
};

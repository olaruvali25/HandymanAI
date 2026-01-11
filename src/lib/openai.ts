import OpenAI from "openai";
import { env } from "@/env";

export const getOpenAIClient = () => {
  const apiKey = env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  return new OpenAI({ apiKey });
};

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type VoiceGender = "female" | "male";

type UserPreferencesState = {
  selectedLanguage: string;
  speechEnabled: boolean;
  voiceGender: VoiceGender;
  setSelectedLanguage: (value: string) => void;
  setSpeechEnabled: (value: boolean) => void;
  setVoiceGender: (value: VoiceGender) => void;
};

export const useUserPreferencesStore = create<UserPreferencesState>()(
  persist(
    (set) => ({
      selectedLanguage: "auto",
      speechEnabled: true,
      voiceGender: "female",
      setSelectedLanguage: (selectedLanguage) => set({ selectedLanguage }),
      setSpeechEnabled: (speechEnabled) => set({ speechEnabled }),
      setVoiceGender: (voiceGender) => set({ voiceGender }),
    }),
    {
      name: "fixly_user_preferences",
      version: 1,
    },
  ),
);

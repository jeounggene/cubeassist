// src/state/ProfileProvider.tsx
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { UserProfile, DrillRecord } from "../types/profile";
import {
  appendDrillRecord,
  appendTimeSample,
  emptyProfile,
  loadProfile,
  saveProfile,
  setKnown,
  toggleBookmark,
  toggleLearned,
} from "../lib/profile";

type ProfileContextValue = {
  profile: UserProfile;
  addTime: (stage: keyof UserProfile["times"], seconds: number) => void;
  toggleKnown: (
    list: keyof UserProfile["known"],
    caseId: string,
    value: boolean,
  ) => void;
  setSetting: <K extends keyof UserProfile["settings"]>(
    key: K,
    value: UserProfile["settings"][K],
  ) => void;
  addDrill: (record: DrillRecord) => void;
  toggleBookmark: (key: string) => void;
  toggleLearned: (key: string) => void;
  resetProfile: () => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile());

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  // Reflect the chosen theme on <html> so Tailwind's `dark:` variants apply.
  useEffect(() => {
    const dark = profile.settings.theme === "dark";
    document.documentElement.classList.toggle("dark", dark);
  }, [profile.settings.theme]);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      addTime: (stage, seconds) =>
        setProfile((p) => appendTimeSample(p, stage, seconds)),
      toggleKnown: (list, caseId, value) =>
        setProfile((p) => setKnown(p, list, caseId, value)),
      setSetting: (key, value) =>
        setProfile((p) => ({ ...p, settings: { ...p.settings, [key]: value } })),
      addDrill: (record) => setProfile((p) => appendDrillRecord(p, record)),
      toggleBookmark: (key) => setProfile((p) => toggleBookmark(p, key)),
      toggleLearned: (key) => setProfile((p) => toggleLearned(p, key)),
      resetProfile: () => setProfile(emptyProfile()),
    }),
    [profile],
  );

  return (
    <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used inside ProfileProvider");
  return ctx;
}

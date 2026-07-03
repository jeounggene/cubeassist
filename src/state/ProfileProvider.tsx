// src/state/ProfileProvider.tsx
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { UserProfile, DrillRecord, SmartSolve } from "../types/profile";
import {
  appendDrillRecord,
  appendTimeSample,
  emptyProfile,
  loadProfile,
  saveProfile,
  setKnown,
  setCaseStatus,
  setTaskDone,
  recordSolve,
  recordSmartSolve as recordSmartSolveLib,
} from "../lib/profile";
import type { CaseStatus } from "../lib/profile";

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
  recordSolve: (eventId: string, seconds: number, date: string) => void;
  recordSmartSolve: (solve: SmartSolve) => void;
  setTask: (date: string, taskId: string, done: boolean, allTaskIds: string[]) => void;
  setCaseStatus: (
    list: keyof UserProfile["known"],
    caseId: string,
    status: CaseStatus,
  ) => void;
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
      recordSolve: (eventId, seconds, date) =>
        setProfile((p) => recordSolve(p, eventId, seconds, date)),
      recordSmartSolve: (solve) =>
        setProfile((p) => recordSmartSolveLib(p, solve)),
      setTask: (date, taskId, done, allTaskIds) =>
        setProfile((p) => setTaskDone(p, date, taskId, done, allTaskIds)),
      setCaseStatus: (list, caseId, status) =>
        setProfile((p) => setCaseStatus(p, list, caseId, status)),
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

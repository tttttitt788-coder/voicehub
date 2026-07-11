import { create } from "zustand";
import type { Profile, View } from "../types";

interface AppState {
  profile: Profile | null;
  view: View;
  activeRoomId: string | null;
  adminToken: string | null;
  setProfile: (p: Profile | null) => void;
  setView: (v: View) => void;
  setActiveRoomId: (id: string | null) => void;
  setAdminToken: (token: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  profile: null,
  view: "lobby",
  activeRoomId: null,
  adminToken: null,
  setProfile: (profile) => set({ profile }),
  setView: (view) => set({ view }),
  setActiveRoomId: (activeRoomId) => set({ activeRoomId }),
  setAdminToken: (adminToken) => set({ adminToken }),
}));

export function isGuest(profile: Profile | null): boolean {
  return profile?.is_guest === true;
}

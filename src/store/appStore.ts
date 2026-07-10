import { create } from "zustand";
import type { Profile, View } from "../types";

interface AppState {
  profile: Profile | null;
  view: View;
  activeRoomId: string | null;
  setProfile: (p: Profile | null) => void;
  setView: (v: View) => void;
  setActiveRoomId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  profile: null,
  view: "lobby",
  activeRoomId: null,
  setProfile: (profile) => set({ profile }),
  setView: (view) => set({ view }),
  setActiveRoomId: (activeRoomId) => set({ activeRoomId }),
}));

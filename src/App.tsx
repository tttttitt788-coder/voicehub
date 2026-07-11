import { useEffect } from "react";
import { useAppStore } from "./store/appStore";
import { Onboarding } from "./components/Onboarding";
import { Lobby } from "./components/Lobby";
import { RoomView } from "./components/RoomView";
import { Navigation } from "./components/Navigation";
import { AdminDashboard } from "./components/AdminDashboard";

export default function App() {
  const { profile, view, setProfile } = useAppStore();

  useEffect(() => {
    const saved = localStorage.getItem("voicehub_profile");
    if (saved) {
      try {
        setProfile(JSON.parse(saved));
      } catch {
        localStorage.removeItem("voicehub_profile");
      }
    }
  }, [setProfile]);

  if (!profile) return <Onboarding />;

  return (
    <div className="min-h-screen bg-bg text-zinc-200">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 pb-8">
        {view === "lobby" && <Lobby />}
        {view === "room" && <RoomView />}
        {view === "admin" && <AdminDashboard />}
      </main>
    </div>
  );
}

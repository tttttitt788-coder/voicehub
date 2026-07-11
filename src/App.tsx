import { useEffect, useState } from "react";
import { useAppStore } from "./store/appStore";
import { Onboarding } from "./components/Onboarding";
import { Lobby } from "./components/Lobby";
import { RoomView } from "./components/RoomView";
import { Navigation } from "./components/Navigation";
import { AdminDashboard } from "./components/AdminDashboard";
import { AdminLogin } from "./components/AdminLogin";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./lib/supabase";

export default function App() {
  const { profile, view, setProfile, adminToken, setAdminToken, setView } = useAppStore();
  const [verifyingAdmin, setVerifyingAdmin] = useState(true);

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

  useEffect(() => {
    const savedToken = localStorage.getItem("voicehub_admin_token");
    if (savedToken) {
      fetch(`${SUPABASE_URL}/functions/v1/admin-auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ action: "verify", token: savedToken }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.valid) {
            setAdminToken(savedToken);
          } else {
            localStorage.removeItem("voicehub_admin_token");
          }
        })
        .catch(() => localStorage.removeItem("voicehub_admin_token"))
        .finally(() => setVerifyingAdmin(false));
    } else {
      setVerifyingAdmin(false);
    }
  }, [setAdminToken]);

  if (!profile) return <Onboarding />;

  return (
    <div className="min-h-screen bg-bg text-zinc-200">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 pb-8">
        {view === "lobby" && <Lobby />}
        {view === "room" && <RoomView />}
        {view === "admin" && (adminToken && !verifyingAdmin ? <AdminDashboard /> : <AdminLogin />)}
      </main>
    </div>
  );
}

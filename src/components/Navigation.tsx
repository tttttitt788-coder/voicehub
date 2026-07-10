import { useAppStore } from "../store/appStore";
import { Home, Mic, Shield, LogOut, Coins, Crown } from "lucide-react";

export function Navigation() {
  const { view, setView, profile, setProfile, setActiveRoomId } = useAppStore();

  const handleLogout = () => {
    localStorage.removeItem("voicehub_profile");
    setProfile(null);
    setActiveRoomId(null);
  };

  return (
    <header className="sticky top-0 z-50 bg-bg/80 backdrop-blur-lg border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <button onClick={() => { setView("lobby"); setActiveRoomId(null); }} className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center">
            <Mic className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-white hidden sm:block">VoiceHub</span>
        </button>
        <nav className="flex items-center gap-1">
          {[
            { id: "lobby" as const, label: "Rooms", icon: Home },
            { id: "admin" as const, label: "Admin", icon: Shield },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => { setView(id); setActiveRoomId(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                view === id || (id === "lobby" && view === "room") ? "bg-accent text-white" : "text-zinc-400 hover:text-white hover:bg-bg-hover"}`}>
              <Icon className="w-4 h-4" /><span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {profile && (
            <div className="flex items-center gap-2">
              {profile.vip && <Crown className="w-4 h-4 text-amber-400" />}
              <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                <Coins className="w-3.5 h-3.5" />{profile.coins}
              </span>
              <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center text-sm border border-border">
                {profile.avatar_url?.startsWith("emoji:") ? profile.avatar_url.split(":")[1] : "👤"}
              </div>
              <span className="text-sm text-zinc-300 hidden md:block">{profile.nickname}</span>
            </div>
          )}
          <button onClick={handleLogout} className="btn-ghost" title="Logout"><LogOut className="w-4 h-4" /></button>
        </div>
      </div>
    </header>
  );
}

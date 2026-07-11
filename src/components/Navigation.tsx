import { useAppStore, isGuest } from "../store/appStore";
import { supabase } from "../lib/supabase";
import type { Profile } from "../types";
import { Home, LogOut, Coins, Crown, Sparkles, UserCog } from "lucide-react";
import { useState } from "react";

export function Navigation() {
  const { view, setView, profile, setProfile, setActiveRoomId } = useAppStore();
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeNickname, setUpgradeNickname] = useState("");
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState("");

  const handleLogout = () => {
    localStorage.removeItem("voicehub_profile");
    setProfile(null);
    setActiveRoomId(null);
  };

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = upgradeNickname.trim();
    if (trimmed.length < 2) { setUpgradeError("Nickname must be at least 2 characters"); return; }
    setUpgrading(true);
    setUpgradeError("");

    const { data: existing } = await supabase.from("profiles").select("id").eq("nickname", trimmed).maybeSingle();
    if (existing) { setUpgradeError("This nickname is already taken."); setUpgrading(false); return; }

    const { data, error } = await supabase.from("profiles").update({ nickname: trimmed, is_guest: false }).eq("id", profile!.id).select().single();
    if (error) { setUpgradeError("Failed to upgrade account."); setUpgrading(false); return; }

    const updated = data as Profile;
    localStorage.setItem("voicehub_profile", JSON.stringify(updated));
    setProfile(updated);
    setUpgrading(false);
    setShowUpgrade(false);
  };

  return (
    <>
      <header className="sticky top-0 z-50 bg-bg/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => { setView("lobby"); setActiveRoomId(null); }} className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v22M5 8v8a7 7 0 0014 0V8a7 7 0 00-14 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12H1m22 0h-4" />
              </svg>
            </div>
            <span className="text-lg font-bold text-white hidden sm:block">VoiceHub</span>
          </button>
          <nav className="flex items-center gap-1">
            <button onClick={() => { setView("lobby"); setActiveRoomId(null); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                view === "lobby" || view === "room" ? "bg-accent text-white" : "text-zinc-400 hover:text-white hover:bg-bg-hover"}`}>
              <Home className="w-4 h-4" /><span className="hidden sm:inline">Rooms</span>
            </button>
          </nav>
          <div className="flex items-center gap-3">
            {profile && (
              <div className="flex items-center gap-2">
                {profile.vip && <Crown className="w-4 h-4 text-amber-400" />}
                <span className="flex items-center gap-1 text-xs text-amber-400 font-medium">
                  <Coins className="w-3.5 h-3.5" />{profile.coins}
                </span>
                {isGuest(profile) && (
                  <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded-full font-medium">Guest</span>
                )}
                <div className="w-8 h-8 rounded-full bg-bg-elevated flex items-center justify-center text-sm border border-border">
                  {profile.avatar_url?.startsWith("emoji:") ? profile.avatar_url.split(":")[1] : "👤"}
                </div>
                <span className="text-sm text-zinc-300 hidden md:block">{profile.nickname}</span>
              </div>
            )}
            {profile && isGuest(profile) && (
              <button onClick={() => setShowUpgrade(true)} className="btn-ghost text-accent" title="Upgrade account">
                <UserCog className="w-4 h-4" />
              </button>
            )}
            <button onClick={handleLogout} className="btn-ghost" title="Logout"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      {showUpgrade && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setShowUpgrade(false)}>
          <div className="glass-card p-6 w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-accent" />
              <h2 className="text-xl font-bold text-white">Upgrade to Permanent Account</h2>
            </div>
            <p className="text-muted text-sm mb-4">Choose a permanent nickname. Your profile, seat positions, and history will be preserved.</p>
            <form onSubmit={handleUpgrade} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">New nickname</label>
                <input type="text" value={upgradeNickname} onChange={(e) => setUpgradeNickname(e.target.value)} placeholder="Enter a permanent nickname..." className="input-field" maxLength={20} autoFocus />
              </div>
              {upgradeError && <p className="text-error text-sm">{upgradeError}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowUpgrade(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={upgrading} className="btn-primary flex-1 disabled:opacity-50">{upgrading ? "Upgrading..." : "Upgrade"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

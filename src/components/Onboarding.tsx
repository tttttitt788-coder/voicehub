import { useState } from "react";
import { useAppStore } from "../store/appStore";
import { supabase } from "../lib/supabase";
import type { Profile } from "../types";
import { UserPlus, Sparkles } from "lucide-react";

const avatarEmojis = ["🦊", "🐼", "🦉", "🐱", "🐶", "🦁", "🐸", "🐧", "🦄", "🐙"];
const avatarColors = [
  "from-indigo-500 to-purple-500", "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-500", "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500", "from-violet-500 to-fuchsia-500",
];

export function Onboarding() {
  const { setProfile } = useAppStore();
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState("");
  const [avatarEmoji, setAvatarEmoji] = useState(avatarEmojis[0]);
  const [colorIdx, setColorIdx] = useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (trimmed.length < 2) { setError("Nickname must be at least 2 characters"); return; }
    setLoading(true);
    setError("");

    const avatarUrl = `emoji:${avatarEmoji}:${avatarColors[colorIdx]}`;
    const { data, error: insertError } = await supabase
      .from("profiles").insert({ nickname: trimmed, avatar_url: avatarUrl, is_guest: false }).select().single();

    if (insertError) {
      setError(insertError.code === "23505" ? "This nickname is already taken." : "Failed to create profile.");
      setLoading(false);
      return;
    }

    const profile = data as Profile;
    localStorage.setItem("voicehub_profile", JSON.stringify(profile));
    setProfile(profile);
  };

  const handleGuest = async () => {
    setGuestLoading(true);
    setError("");

    const guestNum = Math.floor(100000 + Math.random() * 900000);
    const guestNickname = `Guest${guestNum}`;
    const randomEmoji = avatarEmojis[Math.floor(Math.random() * avatarEmojis.length)];
    const randomColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
    const avatarUrl = `emoji:${randomEmoji}:${randomColor}`;

    const { data, error: insertError } = await supabase
      .from("profiles").insert({ nickname: guestNickname, avatar_url: avatarUrl, is_guest: true }).select().single();

    if (insertError) {
      setError("Failed to create guest profile. Please try again.");
      setGuestLoading(false);
      return;
    }

    const profile = data as Profile;
    localStorage.setItem("voicehub_profile", JSON.stringify(profile));
    setProfile(profile);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-bg via-bg-surface to-bg">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-accent to-purple-600 mb-4 shadow-lg shadow-accent/30">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v22M5 8v8a7 7 0 0014 0V8a7 7 0 00-14 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12H1m22 0h-4" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">VoiceHub</h1>
          <p className="text-muted mt-2">Join voice chat rooms and connect with people</p>
        </div>
        <div className="glass-card p-6 animate-scale-in">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Choose your avatar</label>
              <div className="flex flex-wrap gap-2">
                {avatarEmojis.map((emoji) => (
                  <button key={emoji} type="button" onClick={() => setAvatarEmoji(emoji)}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl transition-all duration-200 ${avatarEmoji === emoji ? "bg-accent scale-110 shadow-lg shadow-accent/30" : "bg-bg-elevated hover:bg-bg-hover"}`}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Avatar color</label>
              <div className="flex gap-2">
                {avatarColors.map((c, i) => (
                  <button key={c} type="button" onClick={() => setColorIdx(i)}
                    className={`w-9 h-9 rounded-lg bg-gradient-to-br ${c} transition-all duration-200 ${colorIdx === i ? "ring-2 ring-white ring-offset-2 ring-offset-bg-surface scale-110" : "opacity-60 hover:opacity-100"}`} />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Your nickname</label>
              <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="Enter a nickname..." className="input-field" maxLength={20} autoFocus />
            </div>
            {error && <p className="text-error text-sm animate-fade-in">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              <UserPlus className="w-4 h-4" />
              {loading ? "Creating profile..." : "Get Started"}
            </button>
          </form>
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <button onClick={handleGuest} disabled={guestLoading}
            className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-bg-elevated text-zinc-300 font-medium hover:bg-bg-hover border border-border transition-all duration-200 active:scale-95 disabled:opacity-50">
            <Sparkles className="w-4 h-4 text-accent" />
            {guestLoading ? "Creating guest..." : "Continue as Guest"}
          </button>
          <p className="text-center text-muted text-xs mt-3">
            Browse and listen as a guest. Upgrade later without losing your profile.
          </p>
        </div>
        <p className="text-center text-muted text-xs mt-6">No account needed. Just pick a name and start chatting.</p>
      </div>
    </div>
  );
}

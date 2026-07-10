import { supabase } from "../lib/supabase";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "../lib/supabase";
import type { Profile } from "../types";

export async function fetchLiveKitToken(params: {
  roomName: string;
  participantName: string;
  profileId: string;
  canPublish: boolean;
  role: string;
}): Promise<{ token: string; livekitHost: string; roomName: string; identity: string }> {
  const response = await fetch(`${SUPABASE_URL}/functions/v1/livekit-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) throw new Error(`Failed to get LiveKit token: ${response.status}`);
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data;
}

export function parseAvatar(avatarUrl: string | null): { emoji: string; gradient: string } {
  if (avatarUrl && avatarUrl.startsWith("emoji:")) {
    const parts = avatarUrl.split(":");
    return { emoji: parts[1] || "👤", gradient: parts[2] || "from-indigo-500 to-purple-500" };
  }
  return { emoji: "👤", gradient: "from-indigo-500 to-purple-500" };
}

export function getVipBadge(vip: boolean, level: number): string | null {
  if (vip) return "VIP";
  if (level >= 10) return "L10";
  if (level >= 5) return "L5";
  return null;
}

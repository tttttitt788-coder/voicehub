import { createClient } from "npm:@supabase/supabase-js@2";
import { AccessToken } from "npm:livekit-server-sdk@2.9.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const livekitHost = Deno.env.get("LIVEKIT_HOST") || "wss://voice-rooms.livekit.cloud";
const livekitApiKey = Deno.env.get("LIVEKIT_API_KEY") || "";
const livekitApiSecret = Deno.env.get("LIVEKIT_API_SECRET") || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface TokenRequestBody {
  roomName: string;
  participantName: string;
  profileId: string;
  canPublish: boolean;
  role: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { roomName, participantName, profileId, canPublish, role } =
      (await req.json()) as TokenRequestBody;

    if (!roomName || !participantName || !profileId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify user is not banned
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("is_banned, vip, level")
      .eq("id", profileId)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (profile.is_banned) {
      return new Response(
        JSON.stringify({ error: "User is banned" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify room is active
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("status, is_live")
      .eq("id", roomName)
      .single();

    if (roomError || !room) {
      return new Response(
        JSON.stringify({ error: "Room not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (room.status === "suspended" || room.status === "closed") {
      return new Response(
        JSON.stringify({ error: "Room is not active" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // VIP users get publish permission regardless of seat
    const finalCanPublish = canPublish || (profile.vip === true);

    const at = new AccessToken(livekitApiKey, livekitApiSecret, {
      identity: profileId,
      name: participantName,
      ttl: 60 * 60 * 4,
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: finalCanPublish,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    return new Response(
      JSON.stringify({ token, livekitHost, roomName, identity: profileId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

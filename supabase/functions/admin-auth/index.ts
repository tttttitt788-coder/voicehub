import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, username, password, token } = body;

    if (action === "login") {
      const { data: configData } = await supabase
        .from("app_config")
        .select("key, value")
        .in("key", ["ADMIN_USERNAME", "ADMIN_PASSWORD_HASH"]);

      if (!configData || configData.length < 2) {
        return new Response(
          JSON.stringify({ error: "Admin not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const config: Record<string, string> = {};
      for (const row of configData) config[row.key] = row.value;

      const inputHash = await hashPassword(password || "");

      if (username !== config.ADMIN_USERNAME || inputHash !== config.ADMIN_PASSWORD_HASH) {
        return new Response(
          JSON.stringify({ error: "Invalid credentials" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const sessionToken = generateToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      await supabase.from("app_config").upsert([
        { key: "ADMIN_SESSION_TOKEN", value: sessionToken },
        { key: "ADMIN_SESSION_EXPIRES", value: expiresAt },
      ]);

      return new Response(
        JSON.stringify({ token: sessionToken, expiresAt }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "verify") {
      const { data: tokenData } = await supabase
        .from("app_config")
        .select("key, value")
        .in("key", ["ADMIN_SESSION_TOKEN", "ADMIN_SESSION_EXPIRES"]);

      if (!tokenData || tokenData.length < 2) {
        return new Response(
          JSON.stringify({ valid: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const config: Record<string, string> = {};
      for (const row of tokenData) config[row.key] = row.value;

      const isValid = token === config.ADMIN_SESSION_TOKEN &&
        new Date(config.ADMIN_SESSION_EXPIRES) > new Date();

      return new Response(
        JSON.stringify({ valid: isValid }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "change_password") {
      const { new_password, token: verifyToken } = body;

      const { data: tokenData } = await supabase
        .from("app_config")
        .select("key, value")
        .in("key", ["ADMIN_SESSION_TOKEN", "ADMIN_SESSION_EXPIRES"]);

      if (!tokenData || tokenData.length < 2) {
        return new Response(
          JSON.stringify({ error: "Not authenticated" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const config: Record<string, string> = {};
      for (const row of tokenData) config[row.key] = row.value;

      const isValid = verifyToken === config.ADMIN_SESSION_TOKEN &&
        new Date(config.ADMIN_SESSION_EXPIRES) > new Date();

      if (!isValid) {
        return new Response(
          JSON.stringify({ error: "Not authenticated" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (!new_password || new_password.length < 6) {
        return new Response(
          JSON.stringify({ error: "Password must be at least 6 characters" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const newHash = await hashPassword(new_password);
      await supabase.from("app_config").upsert([
        { key: "ADMIN_PASSWORD_HASH", value: newHash },
      ]);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

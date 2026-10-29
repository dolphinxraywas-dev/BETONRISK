// Supabase Edge Function starter: validates Telegram Web App initData and rolls dice server-side.
// Configure TELEGRAM_BOT_TOKEN as an Edge Function secret before deployment.
// This function does not credit tokens or accept payments.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function verifyTelegramInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData);
  const suppliedHash = params.get("hash");
  const authDate = Number(params.get("auth_date") || 0);
  if (!suppliedHash || !authDate) throw new Error("Missing Telegram signature");
  if (Math.abs(Date.now() / 1000 - authDate) > 300) throw new Error("Expired Telegram initData");
  params.delete("hash");
  const dataCheckString = [...params.entries()].sort(([a],[b]) => a.localeCompare(b))
    .map(([k,v]) => `${k}=${v}`).join("\n");
  const encoder = new TextEncoder();
  // Telegram's WebApp validation key is HMAC_SHA256("WebAppData", botToken).
  const secretKey = await crypto.subtle.importKey(
    "raw", encoder.encode("WebAppData"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const secret = await crypto.subtle.sign("HMAC", secretKey, encoder.encode(botToken));
  const validationKey = await crypto.subtle.importKey(
    "raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", validationKey, encoder.encode(dataCheckString)));
  const actualHash = [...signature].map(b => b.toString(16).padStart(2, "0")).join("");
  if (actualHash.length !== suppliedHash.length) throw new Error("Invalid Telegram signature");
  const a = encoder.encode(actualHash), b = encoder.encode(suppliedHash);
  let diff = 0; for (let i=0;i<a.length;i++) diff |= a[i] ^ b[i];
  if (diff !== 0) throw new Error("Invalid Telegram signature");
  const userText = params.get("user");
  if (!userText) throw new Error("Missing Telegram user");
  return JSON.parse(userText) as { id: number; first_name?: string; username?: string };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });
  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) throw new Error("Server configuration missing");
    const body = await req.json();
    if (typeof body.initData !== "string" || body.initData.length > 8192) {
      return Response.json({ error: "Invalid request" }, { status: 400, headers: cors });
    }
    const user = await verifyTelegramInitData(body.initData, botToken);
    const picks = body.picks;
    if (!Array.isArray(picks) || picks.length !== 2 ||
        picks.some((n: unknown) => !Number.isInteger(n) || Number(n) < 1 || Number(n) > 6)) {
      return Response.json({ error: "Choose two numbers from 1 to 6" }, { status: 400, headers: cors });
    }
    const rollDie = () => {
      const range = 0x100000000;
      const limit = range - (range % 6);
      const buf = new Uint32Array(1);
      let value: number;
      do { crypto.getRandomValues(buf); value = buf[0]; } while (value >= limit);
      return value % 6 + 1;
    };
    const dice = Array.from({ length: 6 }, rollDie);
    const counts = new Map<number, number>();
    for (const d of dice) counts.set(d, (counts.get(d) || 0) + 1);
    let matchCount = 0;
    for (const p of picks) if ((counts.get(p) || 0) >= 2) matchCount += counts.get(p) || 0;
    return Response.json({
      player: { id: user.id, first_name: user.first_name || null, username: user.username || null },
      dice, picks, matchCount, demoReward: matchCount * 10,
      note: "Demo result only. No real wallet, payment, or cash value."
    }, { headers: { ...cors, "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Request failed" },
      { status: 401, headers: { ...cors, "Cache-Control": "no-store" } });
  }
});

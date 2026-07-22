// ============================================================
// EDGE FUNCTION : ai-assistant
// Appelle l'API Claude (Anthropic) côté serveur — la clé API
// reste secrète, jamais visible dans le navigateur.
//
// Déploiement :
//   supabase functions deploy ai-assistant
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-xxxxx
// ============================================================
import { serve } from "https://deno.land/std@0.203.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const { message } = await req.json();
    const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY n'est pas configurée côté serveur." }),
        { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 500,
        system:
          "Tu es l'assistant officiel de Together We Can, une plateforme communautaire (éducation, formations, opportunités, entrepreneuriat, marketplace, sport, art). Réponds en français, de façon brève, chaleureuse et utile. Oriente vers les bonnes sections de l'app quand c'est pertinent.",
        messages: [{ role: "user", content: message }],
      }),
    });

    const data = await response.json();
    const reply = data?.content?.[0]?.text || "Désolé, je n'ai pas pu répondre pour le moment.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }
});

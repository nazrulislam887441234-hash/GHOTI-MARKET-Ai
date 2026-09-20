import { GoogleGenAI } from "@google/genai";

interface Env {
  GEMINI_API_KEY: string;
  ALLOWED_ORIGIN?: string;
}

interface ChatRequest {
  message?: string;
  previousInteractionId?: string | null;
}

const SYSTEM_INSTRUCTION = `
You are GHOTI MARKET AI, the official and exclusive AI assistant for GHOTI MARKET (ghotimarket.com).
Your job is exclusively to provide accurate information regarding GHOTI MARKET based on official sources:
- Main Shop: https://ghotimarket.com, https://www.ghotimarket.com
- Seller: https://seller.ghotimarket.com
- Reseller: https://reseller.ghotimarket.com
- Landing Page: https://landing.ghotimarket.com
- About: https://about.ghotimarket.com
- Main App: https://app.ghotimarket.com
- Seller App: https://app.ghotimarket.com/seller
- Affiliate: https://ghotimarket.com/Affiliate/register

STRICT RULES:
1. NEVER identify as ChatGPT, Gemini, Claude, Antigravity, or any other AI. You are strictly GHOTI MARKET AI.
2. Answer ONLY questions related to GHOTI MARKET. Reject unrelated topics politely.
3. NEVER guess or fabricate products, prices, discounts, sellers, shops, categories, delivery details, returns, refunds, policies, or commissions.
4. Always attempt to verify current information using Google Search and URL Context tools against official GHOTI MARKET domains.
5. If information cannot be verified from official sources, explicitly state: "আমি অনুমান করে তথ্য দিতে চাই না। GHOTI MARKET-এর বর্তমান অফিসিয়াল source-এ এই তথ্যটি নিশ্চিতভাবে পাওয়া যাচ্ছে না।"
6. No hallucinations or unverified claims.
`;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = env.ALLOWED_ORIGIN || "https://ghotimarket.com";

    const corsHeaders = {
      "Access-Control-Allow-Origin": origin.includes("localhost") || origin.includes("127.0.0.1") || origin === allowedOrigin ? origin : allowedOrigin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST" || !request.url.endsWith("/api/chat")) {
      return new Response(JSON.stringify({ success: false, error: "Not Found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const body: ChatRequest = await request.json();
      const message = body.message?.trim();
      const previousInteractionId = body.previousInteractionId || null;

      if (!message) {
        return new Response(JSON.stringify({ success: false, error: "Message is required." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (message.length > 2000) {
        return new Response(JSON.stringify({ success: false, error: "Message is too long (max 2000 characters)." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!env.GEMINI_API_KEY) {
        return new Response(JSON.stringify({ success: false, error: "Server configuration error." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

      const interactionOptions: any = {
        model: "gemini-3.5-flash-lite",
        input: message,
        tools: [
          { type: "google_search" },
          { type: "url_context" }
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
        environment: "remote"
      };

      if (previousInteractionId) {
        interactionOptions.previousInteractionId = previousInteractionId;
      }

      const interaction = await ai.interactions.create(interactionOptions);

      // Handle response or polling if background is true / asynchronous completion if needed
      let resultText = "";
      let currentInteractionId = interaction.id;

      if (interaction.status === "completed") {
        resultText = interaction.outputs?.[0]?.text || "কোনো উত্তর পাওয়া যায়নি।";
      } else {
        // Quick safeguard polling if not instantly completed
        let status = interaction.status;
        let attempts = 0;
        let currentObj = interaction;

        while (status === "in_progress" && attempts < 5) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          currentObj = await ai.interactions.get({ id: currentInteractionId });
          status = currentObj.status;
          attempts++;
        }

        if (status === "completed") {
          resultText = currentObj.outputs?.[0]?.text || "কোনো উত্তর পাওয়া যায়নি।";
        } else {
          resultText = "GHOTI MARKET AI বর্তমানে ব্যস্ত রয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।";
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          reply: resultText,
          interactionId: currentInteractionId,
          previousInteractionId: currentInteractionId,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (err: any) {
      return new Response(
        JSON.stringify({ success: false, error: "দুঃখিত, এই মুহূর্তে GHOTI MARKET AI-এর সঙ্গে সংযোগ করা যাচ্ছে না।" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  },
};

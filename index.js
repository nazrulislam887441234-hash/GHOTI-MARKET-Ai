export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-goog-api-key"
      }});
    }

    const GEMINI_KEY = env.GEMINI_API_KEY;
    const PROJECT_ID = "ghotimarket";

    let productsText = "";
    try {
      const fbRes = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/products?pageSize=150`);
      const fbData = await fbRes.json();
      productsText = fbData.documents?.map(doc => {
        const f = doc.fields;
        const id = doc.name.split('/').pop();
        return `ID:${id} | Name:${f.name?.stringValue || f.title?.stringValue || ''} | Price:${f.price?.stringValue || f.price?.integerValue || f.price?.doubleValue || ''}`;
      }).join("\n") || "No products";
    } catch (e) { productsText = "Product list loading failed"; }

    let userQuery = "";
    if (request.method === "POST") {
      try {
        const body = await request.json();
        userQuery = body.message || body.q || "";
      } catch {}
    } else {
      userQuery = new URL(request.url).searchParams.get("q") || "";
    }

    if (!userQuery) {
      return new Response(JSON.stringify({ status: "ok", message: "Ghoti Market API is Live!", source: "ghotimarket.com ONLY" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
const systemPrompt = `
You are Ghoti AI, Official Shopping Assistant of Ghoti Market (ghotimarket.com).
Created by: Ghoti Market Team, Sylhet, Bangladesh.

PRODUCT LIST (REAL-TIME from Firebase):
${productsText}

IDENTITY RULES (MOST IMPORTANT):
- If user asks: "tumi ke, tomar nam ki, who are you, what's your name, who made you" etc:
  -> Bangla: "আমি Ghoti AI 😊 আমাকে Ghoti Market Team, Sylhet বানিয়েছে। আমি ghotimarket.com এর Official Shopping Assistant!"
  -> English: "I am Ghoti AI 😊 Created by Ghoti Market Team, Sylhet. I am the Official Shopping Assistant for ghotimarket.com!"

PRODUCT SEARCH RULES - FUZZY MATCH (VERY IMPORTANT):
- User may NOT type full name! You must do SMART FUZZY SEARCH.
- Examples:
  User says "i-phone ache?" or "iphone" or "I phone" -> Search PRODUCT LIST for any product containing "iphone" or "15 pro" or "pro max". Case-insensitive, ignore hyphen, space.
  User says "bracelet" -> Show all bracelets like "Trendy Couple Sun Moon Bracelet"
  User says "15 Pro max" -> If list has "iPhone 15 Pro Max 256GB" -> It's a MATCH!
- Logic: Break user query into keywords. If ANY keyword matches ANY part of a product name in list, show that product!
- Show 1-3 closest matches. Don't require exact full name.
- If multiple matches: List them: "বস, iPhone related 2 টা Product পাইছি: ..."
- Always show: Product Name + Price + ID

- If NO keyword matches at all: Then say "দুঃখিত বস, এই Product টি Ghoti Market এ এখন Available নেই।" / "Sorry boss, not available"

- NEVER answer weather, news, coding, general knowledge.

User Query: ${userQuery}
Language Rule: Reply in same language as User Query. If query is "iphone ache" (Bangla+English mix) reply in Bangla.
Be friendly, use "বস" in Bangla.
`;

    // UPDATED MODEL: gemini-3.6-flash
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_KEY
      },
      body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
    });

    const geminiData = await geminiRes.json();
    const aiReply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || `Error: ${JSON.stringify(geminiData).slice(0,200)}`;

    return new Response(JSON.stringify({
      reply: aiReply,
      query: userQuery,
      locked: true
    }), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" }
    });
  }
}

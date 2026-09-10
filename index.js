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
Your Creator Info: You were built by Ghoti Market Dev Team.

PRODUCT LIST (REAL-TIME from Firebase):
${productsText}

IDENTITY RULES (MOST IMPORTANT):
- If user asks ANY identity question like: "tumi ke, tomar nam ki, who are you, what's your name, who made you, who created you, apnake ke baniyeche, tomar kaj ki, what is your job" in ANY language or ANY spelling (tumi ke / tmi ke / who r u / apni ke):
  -> ALWAYS reply with your identity. NEVER say product not available for these questions.
  -> If user asks in Bangla (তুমি কে, নাম কি): Reply in Bangla: "আমি Ghoti AI 😊 আমাকে Ghoti Market Team, Sylhet বানিয়েছে। আমি ghotimarket.com এর Official Shopping Assistant, Product খুঁজতে সাহায্য করি!"
  -> If user asks in English (who are you, your name): Reply in English: "I am Ghoti AI 😊 Created by Ghoti Market Team, Sylhet. I am the Official Shopping Assistant for ghotimarket.com!"

PRODUCT RULES:
- If product exists in PRODUCT LIST: Reply with Name, Price, ID in user's language.
- If product NOT in list: Reply in user's language: Bangla -> "দুঃখিত বস, এই Product টি Ghoti Market এ এখন Available নেই।" / English -> "Sorry boss, this product is not available in Ghoti Market right now."
- NEVER answer weather, news, coding, general knowledge. Reply: Bangla -> "বস, আমি শুধু Ghoti Market এর Product নিয়ে Help করি!" / English -> "Boss, I only help with Ghoti Market products!"

User Query: ${userQuery}
Answer in same language as User Query (Bangla if Bangla, English if English).
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

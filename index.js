export default {
  async fetch(request, env) {
    // CORS - যাতে তোমার UI থেকে Call করা যায়
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }});
    }

    const GEMINI_KEY = env.GEMINI_API_KEY;
    const PROJECT_ID = "ghotimarket";

    // 1. Firebase থেকে Product আনা (Cache 5 min)
    let productsText = "";
    try {
      const fbRes = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/products?pageSize=150`);
      const fbData = await fbRes.json();
      productsText = fbData.documents?.map(doc => {
        const f = doc.fields;
        const id = doc.name.split('/').pop();
        return `ID:${id} | Name:${f.name?.stringValue || f.title?.stringValue || ''} | Price:${f.price?.stringValue || f.price?.integerValue || f.price?.doubleValue || ''} | ${f.stock? 'In Stock' : ''}`;
      }).join("\n") || "No products";
    } catch (e) { productsText = "Product list loading failed"; }

    // 2. User Query নেওয়া - GET এবং POST দুটোই Support করবে
    let userQuery = "";
    let history = [];
    if (request.method === "POST") {
      try {
        const body = await request.json();
        userQuery = body.message || body.q || "";
        history = body.history || [];
      } catch {}
    } else {
      userQuery = new URL(request.url).searchParams.get("q") || "";
    }

    if (!userQuery) {
      return new Response(JSON.stringify({ status: "ok", message: "Ghoti Market API is Live! Use POST {message: '...'}", source: "ghotimarket.com ONLY" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    // 3. LOCKED PROMPT - 100% Ghoti Market Only
    const systemPrompt = `
    You are Ghoti Market AI for ghotimarket.com
    STRICT RULES:
    1. ONLY answer from PRODUCT LIST below. No outside knowledge.
    2. PRODUCT LIST:
    ${productsText}
    3. If not in list: reply exactly "দুঃখিত বস, এই Product টি Ghoti Market এ এখন Available নেই।"
    4. Reply in Bangla, friendly, with Price + Product ID.
    5. NEVER answer weather, news, coding, general knowledge.

    Chat History: ${JSON.stringify(history).slice(0,1000)}
    User: ${userQuery}
    `;

    // 4. Gemini Call
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
    });
    const geminiData = await geminiRes.json();
    const aiReply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "দুঃখিত বস, এখন উত্তর দিতে পারছি না।";

    // 5. API Response - তোমার UI এটা পাবে
    return new Response(JSON.stringify({
      reply: aiReply,
      query: userQuery,
      locked: true,
      source: "api.ghotimarket.com -> ghotimarket firebase only"
    }), {
      headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" }
    });
  }
}

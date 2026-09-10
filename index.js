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
    You are Ghoti Market AI for ghotimarket.com
    STRICT RULES:
    1. ONLY answer from PRODUCT LIST below.
    2. PRODUCT LIST: ${productsText}
    3. If not in list: reply exactly "দুঃখিত বস, এই Product টি Ghoti Market এ এখন Available নেই।"
    4. Reply in Bangla, friendly, with Price + Product ID.
    5. NEVER answer weather, news, coding, general knowledge.
    User: ${userQuery}
    `;

    // NEW AUTH KEY FIX - Use x-goog-api-key header
    const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`, {
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

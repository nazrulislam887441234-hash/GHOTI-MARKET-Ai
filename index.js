export default {
  async fetch(request, env) {
    // CORS
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, x-goog-api-key" }});
    }

    const GEMINI_KEY = env.GEMINI_API_KEY;
    const PROJECT_ID = "ghotimarket";
    const CACHE_TTL = 600;

    // 1. PRODUCTS FETCH - LINK FIX:? দিয়ে
    let productsText = "";
    try {
      const cacheKey = `https://cache.ghotimarket.com/products`;
      const cache = caches.default;
      let fbData;
      let cachedRes = await cache.match(cacheKey);
      if (cachedRes) {
        fbData = await cachedRes.json();
      } else {
        const fbRes = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/products?pageSize=200`);
        fbData = await fbRes.json();
        const toCache = new Response(JSON.stringify(fbData), { headers: { "Cache-Control": `max-age=${CACHE_TTL}` } });
        await cache.put(cacheKey, toCache);
      }
      if (fbData.documents) {
        productsText = fbData.documents.map(doc => {
          const f = doc.fields;
          const id = doc.name.split('/').pop();
          const name = f.name?.stringValue || f.title?.stringValue || 'No Name';
          const priceRaw = f.price?.stringValue || f.price?.integerValue || f.price?.doubleValue || '0';
          const price = parseInt(priceRaw) || 0;
          const slug = f.slug?.stringValue || f.productSlug?.stringValue || id;
          let keywords = '';
          if (f.keywords?.arrayValue?.values) {
            keywords = f.keywords.arrayValue.values.map(v => v.stringValue).join(', ');
          } else {
            keywords = f.keywords?.stringValue || f.tags?.stringValue || '';
          }
          // FIX HERE:? দিয়ে লিংক
          return `Name:${name} | Price:${price} | SLUG:${slug} | Keywords:${keywords} | LINK:https://ghotimarket.com/product?${slug}`;
        }).join("\n");
      }
    } catch (e) { productsText = "Product load failed"; }

    // 2. LIVE FETCH - আগের সব লিংক + about.ghotimarket.com
    const cache = caches.default;
    let policyKnowledge = "";
    let aboutKnowledge = "";

    try {
      const policyKey = new Request("https://cache.ghotimarket.com/policy-live-v6");
      let pCached = await cache.match(policyKey);
      if (pCached) {
        policyKnowledge = await pCached.text();
      } else {
        const urls = [
          "https://ghotimarket.com/",
          "https://ghotimarket.com/privacy-policy",
          "https://ghotimarket.com/termsandcondition",
          "https://ghotimarket.com/delivery-policy.html",
          "https://ghotimarket.com/return%26refund-policy",
          "https://ghotimarket.com/contact",
          "https://seller.ghotimarket.com/signup",
          "https://reseller.ghotimarket.com/signup",
          "https://reseller.ghotimarket.com/terms",
          "https://reseller.ghotimarket.com/privacy-policy"
        ];
        const fetches = urls.map(async u => {
          try { const r = await fetch(u); let h = await r.text(); h = h.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,4000); return `--- LIVE FROM ${u} ---\n${h}\n`; } catch { return ""; }
        });
        policyKnowledge = (await Promise.all(fetches)).join("\n");
        await cache.put(policyKey, new Response(policyKnowledge, { headers: { "Cache-Control": "max-age=3600" } }));
      }

      const aboutKey = new Request("https://cache.ghotimarket.com/about-live-v6");
      let aCached = await cache.match(aboutKey);
      if (aCached) {
        aboutKnowledge = await aCached.text();
      } else {
        try {
          const r = await fetch("https://about.ghotimarket.com");
          let h = await r.text();
          aboutKnowledge = h.replace(/<script[\s\S]*?<\/script>/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,8000);
          await cache.put(aboutKey, new Response(aboutKnowledge, { headers: { "Cache-Control": "max-age=3600" } }));
        } catch { aboutKnowledge = "Ghoti Market is Bangladesh trending marketplace from Sylhet. Details at https://about.ghotimarket.com"; }
      }
    } catch(e){ policyKnowledge = "Policy load failed"; }

    let userQuery = "";
    if (request.method === "POST") { try { const b = await request.json(); userQuery = b.message || b.q || ""; } catch {} }
    else { userQuery = new URL(request.url).searchParams.get("q") || ""; }

    if (!userQuery) {
      return new Response(JSON.stringify({ status: "Ghoti AI Live ✅", version: "api + about Live, Link Format?" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

const systemPrompt = `
You are Ghoti AI, Official Assistant of ghotimarket.com. Created by Ghoti Market Team, Sylhet, Bangladesh. You run at api.ghotimarket.com

PRODUCT DB (LINK FORMAT MUST BE https://ghotimarket.com/product?SLUG with? not /):
${productsText}

OLD WEBSITE KNOWLEDGE (LIVE FROM ALL OLD LINKS):
${policyKnowledge}

ABOUT GHOTI MARKET KNOWLEDGE (LIVE FROM https://about.ghotimarket.com):
${aboutKnowledge}

INSTRUCTIONS:
1. IDENTITY: If asked who are you -> BN: "আমি Ghoti AI 😊 Ghoti Market Team বানিয়েছে।" EN: "I am Ghoti AI, created by Ghoti Market Team."
2. PRODUCT SEARCH: Fuzzy match Name+Keywords. ALWAYS give LINK as https://ghotimarket.com/product?SLUG - MUST USE? NOT /. Example: https://ghotimarket.com/product?i-phone - NEVER use /product/i-phone
3. POLICY: Answer from OLD WEBSITE KNOWLEDGE and ALWAYS give relevant link.
4. ABOUT GHOTI: If query contains "Ghoti Market ki / What is Ghoti Market / About Ghoti / ঘটি মার্কেট কি" -> Use ONLY ABOUT KNOWLEDGE from https://about.ghotimarket.com and give link https://about.ghotimarket.com + https://ghotimarket.com
5. Language: User's language, use "বস" in Bangla.

User Query: ${userQuery}
`;

    try {
      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
      });
      const geminiData = await geminiRes.json();
      const aiReply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "দুঃখিত বস, একটু সমস্যা হচ্ছে।";

      return new Response(JSON.stringify({ reply: aiReply, query: userQuery, status: "success" }), {
        headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" }
      });
    } catch (err) {
      return new Response(JSON.stringify({ reply: "Server busy, try again boss!", error: err.message }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }
  }
}

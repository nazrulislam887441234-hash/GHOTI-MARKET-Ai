export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, x-goog-api-key"
        }
      });
    }

    const GEMINI_KEY = env.GEMINI_API_KEY;
    const PROJECT_ID = "ghotimarket";
    const cache = caches.default;

    // 1. PRODUCTS FETCH WITH CACHE (10 min) & PAGINATION SUPPORT
    let productsText = "";
    try {
      const prodCacheKey = new Request("https://cache.ghotimarket.com/products");
      let cached = await cache.match(prodCacheKey);
      let allDocuments = [];
      
      if (cached) {
        const cachedData = await cached.json();
        allDocuments = cachedData.documents || [];
      } else {
        let pageToken = "";
        do {
          let url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/products?pageSize=200`;
          if (pageToken) {
            url += `&pageToken=${pageToken}`;
          }
          const fbRes = await fetch(url);
          const fbData = await fbRes.json();
          if (fbData.documents) {
            allDocuments = allDocuments.concat(fbData.documents);
          }
          pageToken = fbData.nextPageToken || "";
        } while (pageToken);

        await cache.put(
          prodCacheKey,
          new Response(JSON.stringify({ documents: allDocuments }), {
            headers: { "Cache-Control": "max-age=600" }
          })
        );
      }

      if (allDocuments.length > 0) {
        productsText = allDocuments.map(doc => {
          const f = doc.fields;
          const id = doc.name.split('/').pop();
          const name = f.name?.stringValue || f.title?.stringValue || 'No Name';
          const priceRaw = f.price?.stringValue || f.price?.integerValue || f.price?.doubleValue || '0';
          const price = parseInt(priceRaw) || 0;
          const oldPriceRaw = f.oldPrice?.stringValue || f.oldPrice?.integerValue || f.oldPrice?.doubleValue || '';
          const oldPrice = oldPriceRaw ? ` | OldPrice:${oldPriceRaw}` : '';
          const slug = f.slug?.stringValue || f.productSlug?.stringValue || id;
          const description = f.description?.stringValue ? ` | Desc:${f.description.stringValue.slice(0, 150)}` : '';
          const active = f.active?.booleanValue !== false; // default true if missing
          
          let keywords = f.keywords?.arrayValue?.values
            ? f.keywords.arrayValue.values.map(v => v.stringValue).join(', ')
            : (f.keywords?.stringValue || f.tags?.stringValue || '');
            
          return `Active:${active} | Name:${name} | Price:${price}${oldPrice} | SLUG:${slug} | Keywords:${keywords}${description} | LINK:https://ghotimarket.com/product?${slug}`;
        }).join("\n");
      }
    } catch (e) {
      productsText = "Product load failed";
    }

    // 2. LIVE POLICY FETCH WITH CACHE (1 hour) - PARALLEL FETCH
    const policyUrls = [
      "https://ghotimarket.com/privacy-policy",
      "https://ghotimarket.com/termsandcondition",
      "https://ghotimarket.com/",
      "https://ghotimarket.com/return%26refund-policy",
      "https://ghotimarket.com/delivery-policy.html",
      "https://seller.ghotimarket.com/signup",
      "https://reseller.ghotimarket.com/signup",
      "https://reseller.ghotimarket.com/privacy-policy",
      "https://ghotimarket.com/contact",
      "https://reseller.ghotimarket.com/terms"
    ];

    let policyKnowledge = "";
    try {
      const policyCacheKey = new Request("https://cache.ghotimarket.com/policies");
      let cachedPolicy = await cache.match(policyCacheKey);
      if (cachedPolicy) {
        policyKnowledge = await cachedPolicy.text();
      } else {
        const fetches = policyUrls.map(async (url) => {
          try {
            const res = await fetch(url, { headers: { "User-Agent": "GhotiBot/1.0" } });
            let html = await res.text();
            let text = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 4000);
            return `\n--- LIVE CONTENT FROM ${url} ---\n${text}\n`;
          } catch {
            return `\n--- ${url} - failed to load ---\n`;
          }
        });
        const results = await Promise.all(fetches);
        policyKnowledge = results.join("\n");
        await cache.put(
          policyCacheKey,
          new Response(policyKnowledge, { headers: { "Cache-Control": "max-age=3600" } })
        );
      }
    } catch (e) {
      policyKnowledge = "Policy pages load failed";
    }

    let userQuery = "";
    if (request.method === "POST") {
      try {
        const b = await request.json();
        userQuery = b.message || b.q || "";
      } catch {}
    } else {
      userQuery = new URL(request.url).searchParams.get("q") || "";
    }

    if (!userQuery) {
      return new Response(
        JSON.stringify({ status: "Ghoti AI Live with Strict Read-Only & New URL Format ✅" }),
        { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const systemPrompt = `
You are Ghoti AI, Official Shopping Assistant of ghotimarket.com. Created by Ghoti Market Team, Sylhet, Bangladesh.

STRICT READ-ONLY SYSTEM RULES:
1. YOU ARE STRICTLY READ-ONLY. You CANNOT create, edit, delete products, modify prices, create/cancel/modify orders, change order status, create seller/reseller/user accounts, modify user data, write/update/delete in Firestore, initiate payments/refunds, send WhatsApp/SMS/emails, or change website content.
2. If the user asks you to perform any write/mutation/action (e.g., "delete my product", "change price", "create order", "update database", "open account"), you MUST strictly reply: "দুঃখিত বস, আমি শুধু তথ্য দিতে পারি। কোনো পরিবর্তন বা action নিতে পারি না।"
3. PRODUCT LINK FORMAT: You MUST ONLY use the URL format: https://ghotimarket.com/product?SLUG. NEVER use slashes like /product/SLUG.
4. NO HALLUCINATION: Do not invent products, prices, discounts, delivery times, policies, or contact details. If information is missing from the database or live content, state clearly that it is not available.
5. IDENTITY: If user asks "tumi ke / who are you" -> Answer: "আমি Ghoti AI। আমাকে Ghoti Market Team তৈরি করেছে। আমি ghotimarket.com-এর Official Shopping Assistant।"
6. POLICY & HOMEPAGE: Summarize strictly from the REAL LIVE WEBSITE CONTENT below and always provide the exact source URL. For delivery, use https://ghotimarket.com/delivery-policy.html. For return/refund, use https://ghotimarket.com/return%26refund-policy.
7. LANGUAGE & TONE: Match user's language. Use "বস" in Bangla queries. Be helpful, concise, and friendly without excessive emojis.

PRODUCT DATABASE:
${productsText}

REAL LIVE WEBSITE CONTENT:
${policyKnowledge}

User Query: ${userQuery}
`;

    try {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY },
          body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
        }
      );
      const geminiData = await geminiRes.json();
      const aiReply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "দুঃখিত বস, একটু সমস্যা হচ্ছে।";
      return new Response(
        JSON.stringify({ reply: aiReply, query: userQuery, live: true }),
        { headers: { "Content-Type": "application/json; charset=utf-8", "Access-Control-Allow-Origin": "*" } }
      );
    } catch (err) {
      return new Response(
        JSON.stringify({ reply: "Server busy boss, try again!", error: "Internal processing error" }),
        { headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }
  }
};

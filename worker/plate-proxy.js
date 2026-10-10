// Exemple de Cloudflare Worker : proxy vers une API SIV (RegCheck / API Plaque).
// La clé reste secrète côté Worker : `wrangler secret put PLATE_API_KEY`
// Variables : PLATE_API_URL_UPSTREAM (URL de l'API, ex. https://api.exemple.fr/plaque),
//             ALLOWED_ORIGIN (ex. https://victeams.github.io)
// Réponse attendue par le front : { "brand", "model", "year", "version"|"engine", "fuel_type" }

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || "*";
    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin",
    };
    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "GET") return json({ error: "method_not_allowed" }, 405);

    const plate = (new URL(request.url).searchParams.get("plate") || "").toUpperCase();
    if (!/^[A-Z]{2}-\d{3}-[A-Z]{2}$/.test(plate)) return json({ error: "invalid_plate" }, 400);
    if (!env.PLATE_API_KEY || !env.PLATE_API_URL_UPSTREAM) return json({ error: "not_configured" }, 503);

    try {
      const upstream = new URL(env.PLATE_API_URL_UPSTREAM);
      upstream.searchParams.set("plate", plate);
      const res = await fetch(upstream, { headers: { Authorization: "Bearer " + env.PLATE_API_KEY } });
      if (!res.ok) return json({ error: "upstream_error" }, res.status === 429 ? 429 : 502);
      const data = await res.json();
      // Adapter ici le mapping selon le fournisseur choisi.
      return json({
        brand: data.brand || data.marque || null,
        model: data.model || data.modele || null,
        year: data.year || data.annee || null,
        version: data.version || data.engine || data.motorisation || null,
        fuel_type: data.fuel_type || data.energie || null,
      });
    } catch (e) {
      return json({ error: "proxy_failure" }, 502);
    }
  },
};

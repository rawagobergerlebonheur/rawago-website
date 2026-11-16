const GALLICA_SRU = "https://gallica.bnf.fr/SRU";
const GALLICA_OAI = "https://gallica.bnf.fr/services/OAIRecord";

export async function onRequestGet({ request }) {
  const incoming = new URL(request.url);
  const mode = incoming.searchParams.get("mode") || "search";

  let target;
  if (mode === "search") {
    const startRecord = Number.parseInt(incoming.searchParams.get("startRecord") || "1", 10);
    const maximumRecords = Number.parseInt(incoming.searchParams.get("maximumRecords") || "50", 10);
    if (!Number.isInteger(startRecord) || startRecord < 1 || startRecord > 10000000) {
      return new Response("Paramètre startRecord invalide.", { status: 400 });
    }
    if (!Number.isInteger(maximumRecords) || maximumRecords < 1 || maximumRecords > 50) {
      return new Response("maximumRecords doit être compris entre 1 et 50.", { status: 400 });
    }
    const params = new URLSearchParams({
      version: "1.2",
      operation: "searchRetrieve",
      query: 'access any "fayes" and dc.language any "fre" and dc.type any "monographie"',
      startRecord: String(startRecord),
      maximumRecords: String(maximumRecords)
    });
    target = `${GALLICA_SRU}?${params.toString()}`;
  } else if (mode === "record") {
    const ark = incoming.searchParams.get("ark") || "";
    if (!/^[a-zA-Z0-9._-]{3,100}$/.test(ark)) {
      return new Response("Identifiant ARK invalide.", { status: 400 });
    }
    target = `${GALLICA_OAI}?${new URLSearchParams({ ark: `ark:/12148/${ark}` }).toString()}`;
  } else {
    return new Response("Mode de requête inconnu.", { status: 400 });
  }

  try {
    const upstream = await fetch(target, {
      headers: { Accept: "application/xml,text/xml;q=0.9,*/*;q=0.8" },
      cf: { cacheTtl: 300, cacheEverything: true }
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=60",
        "X-Content-Type-Options": "nosniff"
      }
    });
  } catch (error) {
    return new Response(`Impossible de joindre Gallica : ${error.message}`, {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" }
    });
  }
}


import { useEffect, useState } from "react";
import { supabase } from "../supabase";

const bookCategories = [
  "Livres et ouvrages",
  "Articles scientifiques",
  "Documents historiques",
  "Méthodologie et recherche",
  "Romans et littérature",
  "Développement personnel",
  "Culture générale et savoirs du monde",
  "Ressources professionnelles et entrepreneuriat",
  "Biographies et autobiographies",
  "Philosophie et grands penseurs",
  "Sciences, technologie et innovation",
  "Arts, culture et créativité",
  "Éducation, société et citoyenneté",
  "Environnement et développement durable"
];

const bulkSearches = [
  {
    category: "Livres et ouvrages",
    target: 100,
    query: 'mediatype:texts AND (subject:law OR subject:economics OR subject:"political science" OR subject:sociology OR subject:philosophy)'
  },
  {
    category: "Documents historiques",
    target: 100,
    query: 'mediatype:texts AND (subject:"African history" OR subject:Senegal OR subject:"international relations")'
  },
  {
    category: "Méthodologie et recherche",
    target: 100,
    query: 'mediatype:texts AND (subject:"research methodology" OR subject:"academic writing" OR subject:"research methods")'
  },
  {
    category: "Romans et littérature",
    target: 100,
    query: 'mediatype:texts AND (subject:fiction OR subject:novels OR subject:"African literature" OR subject:literature)'
  },
  {
    category: "Développement personnel",
    target: 100,
    query: 'mediatype:texts AND (subject:"self help" OR subject:"personal development" OR subject:leadership OR subject:motivation)'
  },
  {
    category: "Culture générale et savoirs du monde",
    target: 30,
    query: 'mediatype:texts AND (subject:geopolitics OR subject:education OR subject:culture OR subject:general knowledge)'
  },
  {
    category: "Ressources professionnelles et entrepreneuriat",
    target: 30,
    query: 'mediatype:texts AND (subject:management OR subject:entrepreneurship OR subject:leadership OR subject:business)'
  },
  {
    category: "Biographies et autobiographies",
    target: 30,
    query: 'mediatype:texts AND (subject:biography OR subject:autobiography OR subject:"biographical literature")'
  },
  {
    category: "Philosophie et grands penseurs",
    target: 30,
    query: 'mediatype:texts AND (subject:philosophy OR subject:"philosophical thought" OR subject:ethics)'
  },
  {
    category: "Sciences, technologie et innovation",
    target: 30,
    query: 'mediatype:texts AND (subject:science OR subject:technology OR subject:innovation OR subject:computing)'
  },
  {
    category: "Arts, culture et créativité",
    target: 30,
    query: 'mediatype:texts AND (subject:arts OR subject:music OR subject:cinema OR subject:creativity)'
  },
  {
    category: "Éducation, société et citoyenneté",
    target: 30,
    query: 'mediatype:texts AND (subject:education OR subject:society OR subject:citizenship OR subject:"human rights")'
  },
  {
    category: "Environnement et développement durable",
    target: 30,
    query: 'mediatype:texts AND (subject:environment OR subject:climate OR subject:biodiversity OR subject:sustainability)'
  }
];

const articleTarget = 100;

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function cleanText(value) {
  if (!value) return "";

  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatCrossrefDate(item) {
  const date =
    item["published-print"] ||
    item["published-online"] ||
    item.created;

  const parts = date?.["date-parts"]?.[0];

  return parts ? parts.join("-") : "";
}

// Licences explicitement ouvertes et compatibles avec une réutilisation,
// sous réserve de respecter leurs conditions (attribution, partage à l'identique).
function approvedLicense(url) {
  if (!url) return false;

  const normalized = String(url)
    .trim()
    .toLowerCase()
    .replace(/^http:\/\//, "https://")
    .replace(/\/$/, "");

  return [
    "https://creativecommons.org/publicdomain/zero/1.0",
    "https://creativecommons.org/licenses/by/4.0",
    "https://creativecommons.org/licenses/by-sa/4.0",
    "https://creativecommons.org/licenses/by/3.0",
    "https://creativecommons.org/licenses/by-sa/3.0"
  ].includes(normalized);
}

function getCrossrefOpenLicense(item) {
  const today = new Date().toISOString().slice(0, 10);
  const licenses = item?.license || [];

  return licenses.find(license => {
    const version = String(license["content-version"] || "").toLowerCase();
    const start = license.start?.["date-parts"]?.[0]?.join("-") || "";
    const appliesToUsableVersion = !version || ["vor", "am", "unspecified"].includes(version);
    const alreadyEffective = !start || start <= today;
    return appliesToUsableVersion && alreadyEffective && approvedLicense(license.URL);
  }) || null;
}

function xmlValues(xml, localName) {
  return Array.from(xml.getElementsByTagName("*"))
    .filter(node => node.localName === localName)
    .map(node => cleanText(node.textContent))
    .filter(Boolean);
}

function parseGallicaRecord(recordData) {
  const values = name => Array.from(recordData.getElementsByTagName("*"))
    .filter(node => node.localName === name)
    .map(node => cleanText(node.textContent))
    .filter(Boolean);
  const title = values("title")[0];
  const identifier = values("identifier").find(value =>
    value.includes("gallica.bnf.fr/ark:/12148/")
  );
  const rights = values("rights");
  const authors = values("creator");
  const languages = values("language");
  const description = values("description")[0] || "";
  const publisher = values("publisher")[0] || "";

  if (!title || !identifier) return null;

  const publicDomain = rights.some(value =>
    /domaine public|public domain/i.test(value)
  );
  const french = languages.some(value =>
    /^(fre|fra|français|french)$/i.test(value)
  );

  return {
    title,
    identifier,
    authors,
    description,
    publisher,
    rights,
    publicDomain,
    french
  };
}

function Admin() {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [requests, setRequests] = useState([]);
  const [clients, setClients] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(null);

  const [bookSearch, setBookSearch] = useState("");
  const [bookCategory, setBookCategory] = useState(bookCategories[0]);
  const [bookResults, setBookResults] = useState([]);
  const [searchingBooks, setSearchingBooks] = useState(false);
  const [bookError, setBookError] = useState("");
  const [bookMessage, setBookMessage] = useState("");
  const [importingBook, setImportingBook] = useState(null);
  const [importedBooks, setImportedBooks] = useState([]);

  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState("");
  const [bulkError, setBulkError] = useState("");
  const [bulkSummary, setBulkSummary] = useState([]);

  // Gestion et validation du catalogue documentaire
  const [catalogBooks, setCatalogBooks] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [catalogMessage, setCatalogMessage] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogFilter, setCatalogFilter] = useState("all");
  const [catalogSaving, setCatalogSaving] = useState(null);
  const [rightsScanning, setRightsScanning] = useState(false);
  const [rightsProgress, setRightsProgress] = useState("");
  const [rightsSummary, setRightsSummary] = useState(null);
  const [gallicaImporting, setGallicaImporting] = useState(false);
  const [gallicaProgress, setGallicaProgress] = useState("");
  const [gallicaError, setGallicaError] = useState("");
  const [gallicaSummary, setGallicaSummary] = useState(null);
  const [gallicaStartRecord, setGallicaStartRecord] = useState(1);

  useEffect(() => {
    let active = true;

    async function loadAdminData() {
      const { data: sessionData } =
        await supabase.auth.getSession();

      const session = sessionData.session;

      if (!session) {
        if (active) {
          setError("Veuillez vous connecter.");
          setLoading(false);
        }
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle();

      if (!active) return;

      if (profileError || profile?.role !== "admin") {
        setError("Accès réservé aux administrateurs.");
        setLoading(false);
        return;
      }

      setAuthorized(true);

      const [requestsResult, clientsResult, catalogResult] =
        await Promise.all([
          supabase
            .from("service_requests")
            .select("*")
            .order("created_at", { ascending: false }),

          supabase
            .from("profiles")
            .select("id, full_name, phone, country, created_at"),

          supabase
            .from("books_catalog")
            .select("id, title, authors, description, publisher, published_date, category, source, source_id, cover_url, rights_status, is_active, license_url, rights_evidence, rights_checked_at")
            .order("title", { ascending: true })
            .limit(1000)
        ]);

      if (!active) return;

      if (requestsResult.error) {
        setError(requestsResult.error.message);
      } else {
        setRequests(requestsResult.data || []);
      }

      if (clientsResult.error) {
        setError(clientsResult.error.message);
      } else {
        setClients(clientsResult.data || []);
      }

      if (catalogResult.error) {
        setCatalogError(
          "Impossible de charger le catalogue : " + catalogResult.error.message
        );
      } else {
        setCatalogBooks(catalogResult.data || []);
      }
      setCatalogLoading(false);

      setLoading(false);
    }

    loadAdminData();

    return () => {
      active = false;
    };
  }, []);

  async function changeStatus(requestId, newStatus) {
    setSaving(requestId);
    setError("");

    const { error } = await supabase
      .from("service_requests")
      .update({ status: newStatus })
      .eq("id", requestId);

    if (error) {
      setError(error.message);
    } else {
      setRequests(previous =>
        previous.map(item =>
          item.id === requestId
            ? { ...item, status: newStatus }
            : item
        )
      );
    }

    setSaving(null);
  }

  async function searchBooks(event) {
    event.preventDefault();

    if (!bookSearch.trim()) {
      setBookError("Saisis un titre ou un nom d'auteur.");
      return;
    }

    setSearchingBooks(true);
    setBookError("");
    setBookMessage("");
    setBookResults([]);

    try {
      const fields =
        "key,title,author_name,first_publish_year,edition_count,cover_i,isbn,publisher";

      const url =
        "https://openlibrary.org/search.json?q=" +
        encodeURIComponent(bookSearch.trim()) +
        "&fields=" + fields +
        "&limit=20";

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          "Le service de recherche est momentanément indisponible."
        );
      }

      const data = await response.json();

      setBookResults(data.docs || []);

      if (!data.docs || data.docs.length === 0) {
        setBookMessage(
          "Aucun ouvrage trouvé. Essaie un autre titre ou auteur."
        );
      }
    } catch (err) {
      setBookError(
        err.message || "Impossible de rechercher les ouvrages."
      );
    } finally {
      setSearchingBooks(false);
    }
  }

  async function addBookToCatalog(book) {
    const sourceId = book.key;

    if (!sourceId) {
      setBookError(
        "Cette référence ne possède pas d'identifiant exploitable."
      );
      return;
    }

    setImportingBook(sourceId);
    setBookError("");
    setBookMessage("");

    const bookData = {
      title: book.title || "Titre non renseigné",
      authors: book.author_name || [],
      publisher: book.publisher?.[0] || null,
      published_date: book.first_publish_year
        ? String(book.first_publish_year)
        : null,
      isbn: book.isbn?.[0] || null,
      cover_url: book.cover_i
        ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
        : null,
      category: bookCategory,
      source: "Open Library",
      source_id: sourceId,
      rights_status: "pending",
      is_active: false,
      license_url: null,
      rights_evidence: "Licence non vérifiée automatiquement (Open Library).",
      rights_checked_at: null
    };

    const { error: insertError } = await supabase
      .from("books_catalog")
      .insert(bookData);

    if (insertError) {
      if (insertError.code === "23505") {
        setBookError(
          "Cet ouvrage est déjà enregistré dans le catalogue."
        );
      } else {
        setBookError(
          "Impossible d'ajouter cet ouvrage : " +
          insertError.message
        );
      }
    } else {
      setImportedBooks(previous => [...previous, sourceId]);
      setBookMessage(
        "Ouvrage ajouté avec succès. Il reste en attente de vérification."
      );
    }

    setImportingBook(null);
  }

  async function fetchInternetArchiveBooks(item) {
    const params = new URLSearchParams();

    params.set("q", item.query);

    [
      "identifier",
      "title",
      "creator",
      "date",
      "description",
      "publisher",
      "language",
      "licenseurl",
      "rights"
    ].forEach(field => {
      params.append("fl[]", field);
    });

    params.set("rows", String(item.target));
    params.set("output", "json");
    params.append("sort[]", "downloads desc");

    const response = await fetch(
      "https://archive.org/advancedsearch.php?" +
      params.toString()
    );

    if (!response.ok) {
      throw new Error(
        "La recherche documentaire a échoué pour : " +
        item.category
      );
    }

    const data = await response.json();
    const documents = data?.response?.docs || [];

    return documents
      .filter(item => item.identifier && item.title)
      .slice(0, item.target)
      .map(document => ({
        title: cleanText(document.title) || "Titre non renseigné",
        authors: toArray(document.creator)
          .map(cleanText)
          .filter(Boolean),
        description: cleanText(document.description) || null,
        publisher: cleanText(document.publisher) || null,
        published_date: document.date
          ? String(document.date).slice(0, 20)
          : null,
        isbn: null,
        cover_url: document.identifier
          ? `https://archive.org/services/img/${encodeURIComponent(document.identifier)}`
          : null,
        category: item.category,
        source: "Internet Archive",
        source_id: document.identifier,
        rights_status: "pending",
        is_active: false,
        license_url: document.licenseurl || null,
        rights_evidence: document.rights || null,
        rights_checked_at: null
      }));
  }

  async function fetchCrossrefArticles() {
    const params = new URLSearchParams();

    params.set(
      "query.bibliographic",
      "sciences humaines éducation méthodologie recherche"
    );
    params.set("filter", "type:journal-article");
    params.set("rows", String(articleTarget));
    params.set("mailto", "rawagobergerlebonheur@gmail.com");

    const response = await fetch(
      "https://api.crossref.org/works?" + params.toString()
    );

    if (!response.ok) {
      throw new Error(
        "La recherche des articles scientifiques a échoué."
      );
    }

    const data = await response.json();
    const articles = data?.message?.items || [];

    return articles
      .filter(item => item.DOI && item.title?.[0])
      .slice(0, articleTarget)
      .map(item => {
        const authors = (item.author || [])
          .map(author =>
            [author.given, author.family]
              .filter(Boolean)
              .join(" ")
          )
          .filter(Boolean);

        const journal = item["container-title"]?.[0] || "";

        return {
          title: cleanText(item.title?.[0]) ||
            "Titre non renseigné",
          authors,
          description: cleanText(item.abstract) || null,
          publisher: cleanText(journal || item.publisher) || null,
          published_date: formatCrossrefDate(item) || null,
          isbn: null,
          cover_url: null,
          category: "Articles scientifiques",
          source: "Crossref",
          source_id: item.DOI,
          rights_status: "pending",
          is_active: false,
          license_url: item.license?.[0]?.URL || null,
          rights_evidence: item.license?.length
            ? `Licence Crossref déclarée : ${item.license.map(license => license.URL).filter(Boolean).join(", ")}`
            : "Aucune licence déclarée dans les métadonnées Crossref.",
          rights_checked_at: null
        };
      });
  }

  async function importAllCategories() {
    setBulkImporting(true);
    setBulkError("");
    setBulkSummary([]);
    setBulkProgress("Préparation de l'importation...");

    const allBooks = [];
    const categoryCounts = [];

    try {
      for (let index = 0; index < bulkSearches.length; index++) {
        const item = bulkSearches[index];

        setBulkProgress(
          `Domaine ${index + 1} sur 14 : ${item.category}. Objectif : ${item.target} références.`
        );

        const books = await fetchInternetArchiveBooks(item);

        allBooks.push(...books);

        categoryCounts.push({
          category: item.category,
          target: item.target,
          found: books.length
        });

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setBulkProgress(
        "Domaine 14 sur 14 : recherche des articles scientifiques..."
      );

      const articles = await fetchCrossrefArticles();

      allBooks.push(...articles);

      categoryCounts.push({
        category: "Articles scientifiques",
        target: articleTarget,
        found: articles.length
      });

      // Élimination des doublons à l'intérieur du lot.
      const uniqueBooks = Array.from(
        new Map(
          allBooks.map(book => [
            `${book.source}:${book.source_id}`,
            book
          ])
        ).values()
      );

      if (uniqueBooks.length === 0) {
        throw new Error(
          "Aucune référence exploitable n'a été trouvée."
        );
      }

      setBulkProgress(
        `${uniqueBooks.length} références trouvées. Vérification des doublons dans Supabase...`
      );

      // Vérification des références déjà enregistrées.
      const existingKeys = new Set();

      const sourceGroups = [
        ...new Set(uniqueBooks.map(book => book.source))
      ];

      for (const source of sourceGroups) {
        const sourceBooks = uniqueBooks.filter(
          book => book.source === source
        );

        const ids = sourceBooks.map(book => book.source_id);

        for (let index = 0; index < ids.length; index += 100) {
          const batch = ids.slice(index, index + 100);

          const { data, error: checkError } = await supabase
            .from("books_catalog")
            .select("source_id")
            .eq("source", source)
            .in("source_id", batch);

          if (checkError) {
            throw new Error(
              "Impossible de vérifier les doublons : " +
              checkError.message
            );
          }

          (data || []).forEach(item => {
            existingKeys.add(`${source}:${item.source_id}`);
          });
        }
      }

      const newBooks = uniqueBooks.filter(
        book => !existingKeys.has(
          `${book.source}:${book.source_id}`
        )
      );

      if (newBooks.length === 0) {
        setBulkSummary(
          categoryCounts.map(item => ({
            ...item,
            added: 0
          }))
        );

        setBulkProgress(
          "Aucune nouvelle référence à ajouter : tous les résultats trouvés sont déjà enregistrés."
        );

        return;
      }

      setBulkProgress(
        `${newBooks.length} nouvelles références à enregistrer dans Supabase...`
      );

      // Insertion par lots pour éviter une requête trop volumineuse.
      const addedCounts = {};

      for (let index = 0; index < newBooks.length; index += 50) {
        const batch = newBooks.slice(index, index + 50);

        const { data, error: insertError } = await supabase
          .from("books_catalog")
          .insert(batch)
          .select("id, category");

        if (insertError) {
          throw new Error(
            "Erreur lors de l'enregistrement du lot " +
            (Math.floor(index / 50) + 1) +
            " : " +
            insertError.message
          );
        }

        (data || []).forEach(book => {
          addedCounts[book.category] =
            (addedCounts[book.category] || 0) + 1;
        });
      }

      const finalSummary = categoryCounts.map(item => ({
        ...item,
        added: addedCounts[item.category] || 0
      }));

      setBulkSummary(finalSummary);

      const totalAdded = Object.values(addedCounts)
        .reduce((total, value) => total + value, 0);

      setBulkProgress(
        `Importation terminée : ${totalAdded} nouvelles références enregistrées sur ${uniqueBooks.length} références trouvées.`
      );
    } catch (err) {
      setBulkError(
        err.message ||
        "Une erreur est survenue pendant l'importation."
      );
      setBulkProgress("");
    } finally {
      setBulkImporting(false);
    }
  }

  async function importGallicaPublicDomain() {
    setGallicaImporting(true);
    setGallicaError("");
    setGallicaSummary(null);
    setGallicaProgress("Recherche des livres français signalés libres de droits par la BnF...");

    try {
      const collected = [];
      const maxPages = 10;
      const pageSize = 50;
      let pagesRead = 0;
      let reachedEnd = false;

      for (let page = 0; page < maxPages; page++) {
        const response = await fetch("/api/gallica?" + new URLSearchParams({ mode: "search", startRecord: String(gallicaStartRecord + page * pageSize), maximumRecords: String(pageSize) }).toString());
        if (!response.ok) throw new Error("Gallica (BnF) a répondu HTTP " + response.status + ".");
        const xml = new DOMParser().parseFromString(await response.text(), "application/xml");
        if (xml.getElementsByTagName("parsererror").length) {
          throw new Error("La réponse XML de Gallica n'a pas pu être lue.");
        }

        const records = Array.from(xml.getElementsByTagName("*"))
          .filter(node => node.localName === "recordData");
        if (records.length === 0) {
          reachedEnd = true;
          break;
        }
        pagesRead += 1;

        for (const record of records) {
          const parsed = parseGallicaRecord(record);
          if (!parsed || !parsed.french || !parsed.publicDomain) continue;
          const ark = parsed.identifier.match(/ark:\/\/12148\/(.+)$/i)?.[1];
          if (!ark) continue;

          collected.push({
            title: parsed.title,
            authors: parsed.authors,
            description: parsed.description || null,
            publisher: parsed.publisher || null,
            published_date: null,
            isbn: null,
            cover_url: null,
            category: "Livres et ouvrages",
            source: "Gallica (BnF)",
            source_id: ark,
            rights_status: "verified",
            is_active: true,
            license_url: null,
            rights_evidence: "BnF Gallica : filtre access=fayes et mention explicite « domaine public » dans dc:rights. Notice et lien vers le document original ; aucun fichier BnF n'est réhébergé.",
            rights_checked_at: new Date().toISOString()
          });
        }

        setGallicaProgress("Pages Gallica examinées : " + (page + 1) + " — " + collected.length + " livres répondant aux critères.");
        if (records.length < pageSize) {
          reachedEnd = true;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 350));
      }
      if (pagesRead > 0) {
        setGallicaStartRecord(gallicaStartRecord + pagesRead * pageSize);
      }

      const unique = Array.from(new Map(collected.map(book => [book.source_id, book])).values());
      if (unique.length === 0) {
        setGallicaSummary({ found: 0, added: 0, skipped: 0 });
        setGallicaProgress(reachedEnd
          ? "Fin des résultats Gallica atteinte : aucun nouveau livre admissible dans ce lot."
          : "Aucun livre admissible dans ce lot. Tu peux lancer le lot suivant pour poursuivre la recherche.");
        return;
      }

      const ids = unique.map(book => book.source_id);
      const existing = new Set();
      for (let index = 0; index < ids.length; index += 100) {
        const { data, error: lookupError } = await supabase
          .from("books_catalog")
          .select("source_id")
          .eq("source", "Gallica (BnF)")
          .in("source_id", ids.slice(index, index + 100));
        if (lookupError) throw new Error("Vérification des doublons : " + lookupError.message);
        (data || []).forEach(row => existing.add(row.source_id));
      }

      const fresh = unique.filter(book => !existing.has(book.source_id));
      let added = 0;
      for (let index = 0; index < fresh.length; index += 50) {
        const { data, error: insertError } = await supabase
          .from("books_catalog")
          .insert(fresh.slice(index, index + 50))
          .select("id");
        if (insertError) throw new Error("Enregistrement dans le catalogue : " + insertError.message);
        added += data?.length || 0;
      }

      setGallicaSummary({ found: unique.length, added, skipped: unique.length - added });
      setGallicaProgress("Lot terminé : " + added + " livres ajoutés. " +
        (reachedEnd ? "Fin des résultats atteinte." : "Prochain lot à partir du résultat " + (gallicaStartRecord + pagesRead * pageSize) + ".") +
        " Les notices sont publiées avec un lien vers Gallica ; les fichiers ne sont pas copiés sur RAWAGO.");
      const { data: refreshed, error: refreshError } = await supabase
        .from("books_catalog")
        .select("id, title, authors, description, publisher, published_date, category, source, source_id, cover_url, rights_status, is_active, license_url, rights_evidence, rights_checked_at")
        .order("title", { ascending: true })
        .limit(1000);
      if (!refreshError && refreshed) setCatalogBooks(refreshed);
    } catch (error) {
      setGallicaError(error.message || "L'importation Gallica a échoué.");
      setGallicaProgress("");
    } finally {
      setGallicaImporting(false);
    }
  }

  async function scanCatalogRights() {
    // Réexaminer toutes les références non publiées, y compris celles
    // qui auraient été marquées manuellement auparavant.
    const candidates = catalogBooks.filter(book => !book.is_active);

    if (candidates.length === 0) {
      setRightsSummary({ eligible: 0, uncertain: 0, scanned: 0 });
      setRightsProgress("Aucune référence en attente de contrôle.");
      return;
    }

    setRightsScanning(true);
    setRightsSummary(null);
    setCatalogError("");
    setCatalogMessage("");

    let nextIndex = 0;
    let scanned = 0;
    let eligible = 0;
    let uncertain = 0;
    const updatedRows = new Map();

    async function inspectBook(book) {
      let licenseUrl = null;
      let evidence = "Aucune licence ouverte admissible identifiée.";
      let approved = false;

      try {
        if (book.source === "Internet Archive") {
          const response = await fetch(
            `https://archive.org/metadata/${encodeURIComponent(book.source_id)}`
          );
          if (!response.ok) throw new Error(`Internet Archive : HTTP ${response.status}`);
          const data = await response.json();
          const metadata = data?.metadata || {};
          licenseUrl = metadata.licenseurl || null;
          approved = approvedLicense(licenseUrl);
          evidence = licenseUrl
            ? `Licence déclarée par Internet Archive : ${licenseUrl}`
            : `Aucun champ licenseurl dans les métadonnées. Mention de droits : ${cleanText(metadata.rights) || "non renseignée"}.`;
        } else if (book.source === "Crossref") {
          const response = await fetch(
            `https://api.crossref.org/works/${encodeURIComponent(book.source_id)}?mailto=rawagobergerlebonheur@gmail.com`
          );
          if (!response.ok) throw new Error(`Crossref : HTTP ${response.status}`);
          const data = await response.json();
          const item = data?.message || {};
          const license = getCrossrefOpenLicense(item);
          licenseUrl = license?.URL || item.license?.[0]?.URL || null;
          approved = Boolean(license);
          evidence = license
            ? `Licence Crossref déclarée (${license["content-version"] || "version non précisée"}) : ${license.URL}`
            : licenseUrl
              ? `Licence Crossref trouvée mais non admissible automatiquement : ${licenseUrl}`
              : "Aucune licence admissible déclarée dans les métadonnées Crossref.";
        } else if (book.source === "Gallica (BnF)") {
          const response = await fetch(
            `/api/gallica?${new URLSearchParams({ mode: "record", ark: book.source_id }).toString()}`
          );
          if (!response.ok) throw new Error(`Gallica (BnF) : HTTP ${response.status}`);
          const xml = new DOMParser().parseFromString(await response.text(), "application/xml");
          const rights = xmlValues(xml, "rights");
          const hasPublicDomain = rights.some(value => /domaine public|public domain/i.test(value));
          approved = hasPublicDomain;
          evidence = hasPublicDomain
            ? `BnF Gallica : mention explicite de domaine public dans la notice (${rights.join(" ; ")}).`
            : `La notice Gallica ne confirme pas le domaine public : ${rights.join(" ; ") || "aucune mention de droits"}.`;
        } else {
          evidence = `Source ${book.source || "inconnue"} : aucune vérification automatique disponible.`;
        }
      } catch (error) {
        evidence = `Contrôle automatique impossible : ${error.message}`;
      }

      const checkedAt = new Date().toISOString();
      const changes = {
        license_url: licenseUrl,
        rights_evidence: evidence,
        rights_checked_at: checkedAt
      };

      // Seules les licences de la liste blanche sont publiées automatiquement.
      // Les autres notices restent inactives et en attente.
      if (approved) {
        changes.rights_status = "verified";
        changes.is_active = true;
        eligible += 1;
      } else {
        changes.rights_status = "pending";
        changes.is_active = false;
        uncertain += 1;
      }

      const { data, error: updateError } = await supabase
        .from("books_catalog")
        .update(changes)
        .eq("id", book.id)
        .select("id, rights_status, is_active, license_url, rights_evidence, rights_checked_at")
        .maybeSingle();

      if (updateError) {
        throw new Error(`Mise à jour de « ${book.title} » : ${updateError.message}`);
      }

      if (data) updatedRows.set(book.id, { ...book, ...data });
      scanned += 1;
    }

    async function worker() {
      while (true) {
        const index = nextIndex++;
        if (index >= candidates.length) return;
        const book = candidates[index];
        setRightsProgress(`Analyse automatique : ${scanned + 1} / ${candidates.length} — ${book.title}`);
        try {
          await inspectBook(book);
        } catch (error) {
          uncertain += 1;
          scanned += 1;
          console.error(error);
        }
      }
    }

    try {
      await Promise.all(Array.from({ length: 4 }, () => worker()));
      setCatalogBooks(previous => previous.map(book => updatedRows.get(book.id) || book));
      setRightsSummary({ eligible, uncertain, scanned });
      setRightsProgress(`Analyse terminée : ${scanned} références examinées.`);
      setCatalogMessage(`${eligible} références disposant d'une licence admissible ont été publiées automatiquement. ${uncertain} restent non publiées et en attente.`);
    } catch (error) {
      setCatalogError(error.message || "Le contrôle automatique a échoué.");
      setRightsProgress("Analyse interrompue. Les références déjà traitées ont conservé leur résultat.");
      setCatalogBooks(previous => previous.map(book => updatedRows.get(book.id) || book));
    } finally {
      setRightsScanning(false);
    }
  }

  async function updateCatalogBook(book, changes, successMessage) {
    setCatalogSaving(book.id);
    setCatalogError("");
    setCatalogMessage("");

    const { data, error: updateError } = await supabase
      .from("books_catalog")
      .update(changes)
      .eq("id", book.id)
      .select("id, rights_status, is_active, license_url, rights_evidence, rights_checked_at")
      .maybeSingle();

    if (updateError) {
      setCatalogError(
        "La mise à jour a échoué : " + updateError.message
      );
    } else if (!data) {
      setCatalogError(
        "Aucune modification confirmée. Vérifie les autorisations de la table."
      );
    } else {
      setCatalogBooks(previous =>
        previous.map(item =>
          item.id === book.id ? { ...item, ...data } : item
        )
      );
      setCatalogMessage(successMessage);
    }

    setCatalogSaving(null);
  }

  function unpublishCatalogBook(book) {
    updateCatalogBook(
      book,
      { is_active: false },
      "Référence retirée de la bibliothèque publique."
    );
  }

  const normalizedCatalogSearch = catalogSearch.trim().toLowerCase();
  const filteredCatalogBooks = catalogBooks.filter(book => {
    const matchesSearch =
      !normalizedCatalogSearch ||
      [
        book.title,
        ...(Array.isArray(book.authors) ? book.authors : []),
        book.category,
        book.source
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedCatalogSearch);

    const matchesFilter =
      catalogFilter === "all" ||
      (catalogFilter === "pending" && book.rights_status !== "verified") ||
      (catalogFilter === "verified" && book.rights_status === "verified" && !book.is_active) ||
      (catalogFilter === "published" && book.is_active);

    return matchesSearch && matchesFilter;
  });

  const statusLabels = {
    pending: "En attente",
    reviewing: "À l'étude",
    accepted: "Acceptée",
    in_progress: "En cours",
    completed: "Terminée",
    rejected: "Refusée"
  };

  const totalTarget =
    bulkSearches.reduce((total, item) => total + item.target, 0) +
    articleTarget;

  if (loading) {
    return (
      <main className="section">
        <p>Chargement de l'administration...</p>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="section">
        <h1>Administration</h1>
        <p className="form-error">{error}</p>
        <a className="btn primary" href="/espace-client">
          Accéder à mon compte
        </a>
      </main>
    );
  }

  return (
    <main className="section">
      <div className="section-head">
        <div className="eyebrow">
          ESPACE DE GESTION
        </div>

        <h1>Administration</h1>

        <p>
          Gestion des demandes, consultation des clients
          et administration des ressources documentaires.
        </p>
      </div>

      {error && <p className="form-error">{error}</p>}

      <section
        className="dashboard-panel"
        style={{ marginBottom: "35px" }}
      >
        <div className="eyebrow">BIBLIOTHÈQUE RAWAGO</div>

        <h2>Importation automatique du catalogue</h2>

        <p>
          Recherche et importation groupée de références
          documentaires dans les quatorze domaines de la bibliothèque.
        </p>

        <div
          style={{
            background: "#f5f1e8",
            borderRadius: "10px",
            padding: "18px",
            margin: "20px 0"
          }}
        >
          <h3>Objectif de l'importation</h3>

          <h2 style={{ color: "#159B96" }}>
            {totalTarget} références
          </h2>

          <p>
            Six domaines prioritaires : 100 références chacun.
          </p>

          <p>
            Huit domaines complémentaires : 30 références chacun.
          </p>

          <ul>
            {bulkSearches.map(item => (
              <li key={item.category}>
                {item.category} : {item.target} références
              </li>
            ))}

            <li>
              Articles scientifiques : {articleTarget} références
            </li>
          </ul>

          <p style={{ fontSize: "13px" }}>
            Les objectifs indiquent le nombre recherché.
            Le nombre réellement importé dépend des résultats disponibles
            et des doublons déjà présents.
          </p>
        </div>

        <button
          className="btn primary"
          type="button"
          onClick={importAllCategories}
          disabled={bulkImporting}
        >
          {bulkImporting
            ? "Importation en cours..."
            : `Importer automatiquement les ${totalTarget} références →`}
        </button>

        {bulkProgress && (
          <p
            role="status"
            style={{
              marginTop: "20px",
              padding: "14px",
              background: "#edf8f6",
              borderRadius: "8px"
            }}
          >
            {bulkProgress}
          </p>
        )}

        {bulkError && (
          <p className="form-error" role="alert">
            {bulkError}
          </p>
        )}

        {bulkSummary.length > 0 && (
          <div style={{ marginTop: "25px" }}>
            <h3>Bilan de l'importation</h3>

            <div className="request-list">
              {bulkSummary.map(item => (
                <article
                  className="request-item"
                  key={item.category}
                >
                  <strong>{item.category}</strong>

                  <p>
                    Objectif : {item.target}
                  </p>

                  <p>
                    Références trouvées : {item.found}
                  </p>

                  <p>
                    Nouvelles références ajoutées : {item.added}
                  </p>
                </article>
              ))}
            </div>
          </div>
        )}

        <p style={{ fontSize: "12px", color: "#777", marginTop: "25px" }}>
          Sources : Internet Archive et Crossref.
          Le contrôle automatique se fonde sur les licences déclarées par les sources.
          Il ne constitue pas une garantie juridique : les notices et les images
          ne confèrent pas à elles seules un droit de distribution. Les références
          sans licence admissible explicite restent non publiées.
        </p>
      </section>

      <section
        className="dashboard-panel"
        style={{ marginBottom: "35px" }}
      >
        <div className="eyebrow">FONDS PATRIMONIAL FRANCOPHONE</div>
        <h2>Livres du domaine public français — Gallica / BnF</h2>
        <p>
          Recherche en lots dans Gallica les monographies en français que la BnF
          classe comme libres de droits et dont la notice mentionne explicitement
          le domaine public. Les notices sont ajoutées à « Livres et ouvrages ».
        </p>
        <p style={{ fontSize: "13px", color: "#777" }}>
          L'importation conserve les références et les liens vers Gallica ; elle
          ne télécharge ni ne réhéberge les fichiers numérisés. La mention de la
          BnF est un indicateur de sélection, pas une garantie juridique universelle
          pour chaque élément éditorial (traduction, préface, illustration, etc.).
        </p>
        <button
          className="btn primary"
          type="button"
          onClick={importGallicaPublicDomain}
          disabled={gallicaImporting}
        >
          {gallicaImporting ? "Recherche et importation en cours..." : `Importer le prochain lot de livres (jusqu'à 500) →`}
        </button>
        {gallicaProgress && <p role="status" style={{ marginTop: "14px" }}>{gallicaProgress}</p>}
        {gallicaError && <p className="form-error" role="alert">{gallicaError}</p>}
        {gallicaSummary && (
          <p className="form-message" role="status">
            Bilan : {gallicaSummary.found} notices admissibles trouvées, {gallicaSummary.added} ajoutées, {gallicaSummary.skipped} déjà présentes.
          </p>
        )}
        <p style={{ fontSize: "12px", color: "#777", marginTop: "12px" }}>
          Source : <a href="https://gallica.bnf.fr/" target="_blank" rel="noopener noreferrer">Gallica, Bibliothèque nationale de France</a>.
          Début du prochain lot : résultat {gallicaStartRecord}.
        </p>
      </section>

      <section
        className="dashboard-panel"
        style={{ marginBottom: "35px" }}
      >
        <div className="eyebrow">CONTRÔLE ÉDITORIAL</div>
        <h2>Gestion de la bibliothèque</h2>
        <p>
          Consulte les références importées, vérifie leurs conditions de
          réutilisation, puis décide séparément de leur publication.
        </p>

        <div className="dashboard-grid" style={{ margin: "20px 0" }}>
          <div className="dashboard-panel">
            <strong>{catalogBooks.length}</strong>
            <p>Références dans le catalogue</p>
          </div>
          <div className="dashboard-panel">
            <strong>{catalogBooks.filter(book => book.rights_status === "verified").length}</strong>
            <p>Droits marqués comme vérifiés</p>
          </div>
          <div className="dashboard-panel">
            <strong>{catalogBooks.filter(book => book.is_active).length}</strong>
            <p>Références publiées</p>
          </div>
        </div>

        <p style={{ fontSize: "13px", color: "#777" }}>
          Important : « Vérifier les droits » signifie que tu as contrôlé
          toi-même la licence, les conditions de réutilisation et, si nécessaire,
          l'autorisation de diffusion. La présence d'une notice ou d'une
          couverture ne constitue pas une autorisation.
        </p>

        <div style={{ background: "#f5f1e8", borderRadius: "10px", padding: "18px", margin: "20px 0" }}>
          <h3>Contrôle automatique des licences</h3>
          <p>
            RAWAGO recherche les licences explicites CC0, CC BY et CC BY-SA
            (versions 3.0 et 4.0). Les références admissibles sont publiées
            automatiquement ; les autres restent en attente. Le Public Domain
            Mark seul n'est pas traité comme une licence suffisante.
          </p>
          <button
            className="btn primary"
            type="button"
            onClick={scanCatalogRights}
            disabled={rightsScanning || catalogLoading}
          >
            {rightsScanning ? "Analyse des licences en cours..." : "Analyser les licences et publier les références admissibles →"}
          </button>
          {rightsProgress && <p role="status" style={{ marginTop: "14px" }}>{rightsProgress}</p>}
          {rightsSummary && (
            <p style={{ marginTop: "10px" }}>
              Bilan : {rightsSummary.scanned} analysées, {rightsSummary.eligible} publiées automatiquement, {rightsSummary.uncertain} maintenues en attente.
            </p>
          )}
        </div>

        <label style={{ display: "block", margin: "18px 0" }}>
          Rechercher dans le catalogue
          <input
            type="search"
            value={catalogSearch}
            onChange={event => setCatalogSearch(event.target.value)}
            placeholder="Titre, auteur, catégorie ou source..."
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "8px"
            }}
          />
        </label>

        <label style={{ display: "block", marginBottom: "20px" }}>
          Afficher
          <select
            value={catalogFilter}
            onChange={event => setCatalogFilter(event.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "8px"
            }}
          >
            <option value="all">Toutes les références</option>
            <option value="pending">Droits en attente</option>
            <option value="verified">Droits vérifiés, non publiées</option>
            <option value="published">Références publiées</option>
          </select>
        </label>

        {catalogError && (
          <p className="form-error" role="alert">{catalogError}</p>
        )}
        {catalogMessage && (
          <p className="form-message" role="status">{catalogMessage}</p>
        )}

        {catalogLoading ? (
          <p>Chargement du catalogue...</p>
        ) : filteredCatalogBooks.length === 0 ? (
          <p className="empty-state">
            Aucune référence ne correspond à cette recherche.
          </p>
        ) : (
          <>
            <p>
              Affichage de {Math.min(filteredCatalogBooks.length, 50)} sur{" "}
              {filteredCatalogBooks.length} références correspondant au filtre.
            </p>
            <div className="request-list">
              {filteredCatalogBooks.slice(0, 50).map(book => (
                <article className="request-item" key={book.id}>
                  <div style={{
                    display: "flex",
                    gap: "16px",
                    alignItems: "flex-start",
                    flexWrap: "wrap"
                  }}>
                    {book.cover_url ? (
                      <img
                        src={book.cover_url}
                        alt={`Couverture : ${book.title}`}
                        loading="lazy"
                        style={{
                          width: "78px",
                          height: "110px",
                          objectFit: "contain",
                          background: "#f5f1e8",
                          borderRadius: "6px"
                        }}
                      />
                    ) : (
                      <div style={{
                        width: "78px",
                        height: "110px",
                        display: "grid",
                        placeItems: "center",
                        textAlign: "center",
                        background: "#f5f1e8",
                        borderRadius: "6px",
                        fontSize: "12px",
                        color: "#777"
                      }}>
                        Sans couverture
                      </div>
                    )}

                    <div style={{ flex: "1 1 240px" }}>
                      <h3>{book.title || "Titre non renseigné"}</h3>
                      <p>
                        <strong>Auteur(s) :</strong>{" "}
                        {Array.isArray(book.authors) && book.authors.length
                          ? book.authors.join(", ")
                          : "Non renseigné"}
                      </p>
                      <p><strong>Catégorie :</strong> {book.category || "Non renseignée"}</p>
                      <p><strong>Source :</strong> {book.source || "Non renseignée"}</p>
                      <p>
                        <strong>État des droits :</strong>{" "}
                        {book.rights_status === "verified"
                          ? (book.rights_evidence ? "Licence admissible détectée" : "Vérifiés manuellement")
                          : book.rights_status || "En attente"}
                      </p>
                      <p>
                        <strong>Publication :</strong>{" "}
                        {book.is_active ? "Publiée" : "Non publiée"}
                      </p>
                      {book.license_url && (
                        <p>
                          <strong>Licence détectée :</strong>{" "}
                          <a href={book.license_url} target="_blank" rel="noopener noreferrer">Consulter la licence</a>
                        </p>
                      )}
                      {book.rights_evidence && (
                        <p><strong>Résultat du contrôle :</strong> {book.rights_evidence}</p>
                      )}

                      <div style={{
                        display: "flex",
                        gap: "10px",
                        flexWrap: "wrap",
                        marginTop: "12px"
                      }}>
                        {!book.is_active && (
                          <span style={{ fontSize: "13px", color: "#777" }}>
                            En attente du prochain contrôle automatique.
                          </span>
                        )}

                        {book.is_active && (
                          <button
                            className="btn secondary"
                            type="button"
                            disabled={catalogSaving === book.id}
                            onClick={() => unpublishCatalogBook(book)}
                          >
                            {catalogSaving === book.id
                              ? "Mise à jour..."
                              : "Retirer de la bibliothèque"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section
        className="dashboard-panel"
        style={{ marginBottom: "35px" }}
      >
        <div className="eyebrow">IMPORTATION INDIVIDUELLE</div>

        <h2>Ajouter des ouvrages au catalogue</h2>

        <p>
          Recherche un ouvrage dans Open Library et importe
          ses principales informations bibliographiques.
        </p>

        <form onSubmit={searchBooks}>
          <label>
            Titre ou auteur

            <input
              type="search"
              value={bookSearch}
              onChange={event => setBookSearch(event.target.value)}
              placeholder="Ex. : droit constitutionnel, économie, auteur..."
              style={{
                width: "100%",
                padding: "13px",
                marginTop: "8px",
                marginBottom: "18px"
              }}
            />
          </label>

          <label>
            Catégorie de destination

            <select
              value={bookCategory}
              onChange={event => setBookCategory(event.target.value)}
              style={{
                width: "100%",
                padding: "13px",
                marginTop: "8px",
                marginBottom: "18px"
              }}
            >
              {bookCategories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <button
            className="btn primary"
            type="submit"
            disabled={searchingBooks}
          >
            {searchingBooks
              ? "Recherche en cours..."
              : "Rechercher des ouvrages →"}
          </button>
        </form>

        {bookError && (
          <p className="form-error" role="alert" style={{ marginTop: "18px" }}>
            {bookError}
          </p>
        )}

        {bookMessage && (
          <p className="form-message" style={{ marginTop: "18px" }}>
            {bookMessage}
          </p>
        )}

        {bookResults.length > 0 && (
          <div style={{ marginTop: "30px" }}>
            <h3>Résultats de recherche</h3>

            <div className="request-list">
              {bookResults.map(book => {
                const alreadyImported =
                  importedBooks.includes(book.key);

                return (
                  <article
                    className="request-item"
                    key={book.key}
                    style={{
                      display: "flex",
                      gap: "18px",
                      alignItems: "flex-start",
                      flexWrap: "wrap"
                    }}
                  >
                    <div
                      style={{
                        width: "95px",
                        height: "135px",
                        flexShrink: 0,
                        background: "#f5f1e8",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden"
                      }}
                    >
                      {book.cover_i ? (
                        <img
                          src={`https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`}
                          alt={`Couverture de ${book.title}`}
                          loading="lazy"
                          style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            objectFit: "contain"
                          }}
                        />
                      ) : (
                        <small>Sans couverture</small>
                      )}
                    </div>

                    <div style={{ flex: "1 1 220px" }}>
                      <h3>{book.title || "Titre non renseigné"}</h3>

                      <p>
                        <strong>Auteur(s) :</strong>{" "}
                        {book.author_name?.join(", ") || "Non renseigné"}
                      </p>

                      <p>
                        <strong>Première publication :</strong>{" "}
                        {book.first_publish_year || "Non renseignée"}
                      </p>

                      <p>
                        <strong>Éditions :</strong>{" "}
                        {book.edition_count || "Non renseignées"}
                      </p>

                      <p>
                        <strong>ISBN :</strong>{" "}
                        {book.isbn?.[0] || "Non renseigné"}
                      </p>

                      <button
                        className="btn primary"
                        type="button"
                        disabled={
                          alreadyImported ||
                          importingBook === book.key
                        }
                        onClick={() => addBookToCatalog(book)}
                      >
                        {alreadyImported
                          ? "Ajouté"
                          : importingBook === book.key
                            ? "Ajout en cours..."
                            : "Ajouter au catalogue"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <div className="dashboard-grid">
        <div className="dashboard-panel">
          <h2>Vue d'ensemble</h2>

          <p>
            Nombre de demandes : <strong>{requests.length}</strong>
          </p>

          <p>
            Nombre de comptes clients : <strong>{clients.length}</strong>
          </p>
        </div>

        <div className="dashboard-panel">
          <h2>Liste des clients</h2>

          {clients.length === 0 ? (
            <p>Aucun client enregistré.</p>
          ) : (
            <div className="request-list">
              {clients.map(client => (
                <article className="request-item" key={client.id}>
                  <h3>{client.full_name || "Nom non renseigné"}</h3>

                  <p>
                    Téléphone : {client.phone || "Non renseigné"}
                  </p>

                  <p>
                    Pays : {client.country || "Non renseigné"}
                  </p>

                  {client.phone && (
                    <a
                      className="btn primary"
                      href={`https://wa.me/${client.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Contacter sur WhatsApp
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-panel">
        <div className="request-heading">
          <h2>Demandes des clients</h2>
          <span>{requests.length}</span>
        </div>

        {requests.length === 0 ? (
          <p className="empty-state">
            Aucune demande pour le moment.
          </p>
        ) : (
          <div className="request-list">
            {requests.map(item => {
              const client = clients.find(
                person => person.id === item.client_id
              );

              return (
                <article className="request-item" key={item.id}>
                  <div className="request-item-top">
                    <b>{item.service}</b>

                    <span className={`status status-${item.status}`}>
                      {statusLabels[item.status] || item.status}
                    </span>
                  </div>

                  <p>
                    <strong>Client : </strong>
                    {client?.full_name || "Nom non renseigné"}
                  </p>

                  <p>
                    <strong>Description : </strong>
                    {item.description}
                  </p>

                  <small>
                    Reçue le{" "}
                    {new Date(item.created_at).toLocaleDateString("fr-FR")}
                  </small>

                  <label className="admin-status-control">
                    Modifier le statut

                    <select
                      value={item.status}
                      disabled={saving === item.id}
                      onChange={event =>
                        changeStatus(item.id, event.target.value)
                      }
                    >
                      <option value="pending">En attente</option>
                      <option value="reviewing">À l'étude</option>
                      <option value="accepted">Acceptée</option>
                      <option value="in_progress">En cours</option>
                      <option value="completed">Terminée</option>
                      <option value="rejected">Refusée</option>
                    </select>
                  </label>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export default Admin;

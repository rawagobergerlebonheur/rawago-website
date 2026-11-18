
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabase";

const defaultCategories = [
  { number: "01", title: 'Philosophie et religions', description: 'Philosophie, religions, spiritualités et grands courants de pensée.' },
  { number: "02", title: 'Droit et sciences politiques', description: 'Droit, institutions, gouvernance et relations politiques.' },
  { number: "03", title: 'Développement personnel et ressources professionnelles', description: 'Leadership, confiance en soi, compétences et vie professionnelle.' },
  { number: "04", title: 'Éducation et sciences sociales', description: 'Éducation, sciences humaines et compréhension des sociétés.' },
  { number: "05", title: 'Culture générale et savoirs du monde', description: 'Histoire des idées, géopolitique, société et connaissance du monde.' },
  { number: "06", title: 'Romans et littérature', description: 'Romans, récits et littérature francophone et internationale.' },
  { number: "07", title: 'Économie et finances', description: 'Économie, gestion, finances et développement.' },
  { number: "08", title: 'Arts, santé et bien-être', description: 'Arts, santé, équilibre personnel et bien-être.' },
  { number: "09", title: 'Psychologie et développement personnel', description: 'Psychologie, comportement et connaissance de soi.' },
  { number: "10", title: 'Éducation et pédagogie', description: 'Pédagogie, apprentissage et pratiques éducatives.' },
  { number: "11", title: 'Histoire africaine', description: 'Histoire des peuples, royaumes et sociétés africaines.' },
  { number: "12", title: 'Sociologie et anthropologie', description: 'Sociétés, cultures, groupes humains et transformations sociales.' },
  { number: "13", title: 'Philosophie', description: 'Philosophie, éthique et pensée critique.' },
  { number: "14", title: 'Littérature classique', description: 'Œuvres classiques et grands textes littéraires.' },
  { number: "15", title: 'Environnement et développement durable', description: 'Écologie, climat, biodiversité et développement durable.' },
  { number: "16", title: 'Méthodologie et recherche', description: 'Méthodologie universitaire, recherche, mémoire et rédaction.' },
  { number: "17", title: 'Religion, spiritualités et sociétés', description: 'Religions, spiritualités et faits religieux dans les sociétés.' },
  { number: "18", title: 'Littérature contemporaine', description: 'Littérature contemporaine et écritures actuelles.' },
  { number: "19", title: 'Histoire générale', description: 'Histoire mondiale, périodes et événements historiques.' },
  { number: "20", title: 'Biographies et autobiographies', description: 'Parcours de vie, témoignages et mémoires.' },
  { number: "21", title: 'Romans africains et francophones', description: 'Romans africains et littératures francophones.' },
  { number: "22", title: 'Arts, culture et créativité', description: 'Arts visuels, patrimoine, musique et création.' },
  { number: "23", title: 'Sciences et technologie', description: 'Sciences, innovations et technologies.' },
  { number: "24", title: 'Droit et citoyenneté', description: 'Droits, libertés, citoyenneté et vie publique.' },
  { number: "25", title: 'Poésie', description: 'Poésie classique, moderne et contemporaine.' },
  { number: "26", title: 'Théâtre', description: 'Théâtre, dramaturgie et textes de scène.' },
  { number: "27", title: 'Économie et entrepreneuriat', description: 'Entrepreneuriat, économie des organisations et innovation.' },
  { number: "28", title: 'Technologie et ingénierie', description: 'Ingénierie, technologies et applications techniques.' },
  { number: "29", title: 'Histoire et géographie', description: 'Territoires, géographie et histoire des espaces.' }
];

function authorsList(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch {}
    return trimmed.split(/[;,]/).map(item => item.trim()).filter(Boolean);
  }
  return [];
}


function normalizeCoverText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function titleMatchScore(candidate, wanted) {
  const a = new Set(normalizeCoverText(candidate).split(" ").filter(Boolean));
  const b = new Set(normalizeCoverText(wanted).split(" ").filter(Boolean));
  if (!a.size || !b.size) return 0;
  const intersection = [...b].filter(word => a.has(word)).length;
  // Le titre doit être le critère principal, sans exiger une égalité parfaite.
  return intersection / b.size;
}

async function getJson(url) {
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

function cleanCoverUrl(url) {
  if (!url || typeof url !== "string") return "";
  return url.replace(/^http:\/\//i, "https://").replace("&amp;", "&");
}

async function findRealBookCovers(book) {
  const title = String(book.title || "").trim();
  const authors = authorsList(book.authors);
  const author = authors.join(" ").trim();
  const isbn = String(book.isbn || "").replace(/[^0-9Xx]/g, "");
  const candidates = [];

  // L'ISBN est la recherche la plus précise lorsqu'il existe.
  if (isbn) {
    const googleIsbn = await getJson(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(`isbn:${isbn}`)}&maxResults=10&printType=books`
    );
    for (const item of googleIsbn?.items || []) {
      const info = item.volumeInfo || {};
      const image = info.imageLinks?.extraLarge || info.imageLinks?.large || info.imageLinks?.medium || info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;
      if (image) candidates.push({ url: cleanCoverUrl(image), score: 1.2 });
    }

    const openIsbn = await getJson(
      `https://openlibrary.org/api/books?bibkeys=${encodeURIComponent(`ISBN:${isbn}`)}&format=json&jscmd=data`
    );
    const cover = openIsbn?.[`ISBN:${isbn}`]?.cover;
    if (cover?.large || cover?.medium || cover?.small) {
      candidates.push({ url: cleanCoverUrl(cover.large || cover.medium || cover.small), score: 1.15 });
    }
  }

  // Google Books : plusieurs formulations, avec et sans auteur.
  const googleQueries = [
    author ? `intitle:${title} inauthor:${author}` : `intitle:${title}`,
    `${title} ${author}`.trim(),
    title
  ];

  for (const query of googleQueries) {
    const data = await getJson(
      `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20&printType=books&langRestrict=fr`
    );
    for (const item of data?.items || []) {
      const info = item.volumeInfo || {};
      const image = info.imageLinks?.extraLarge || info.imageLinks?.large || info.imageLinks?.medium || info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail;
      if (!image) continue;

      const titleScore = titleMatchScore(info.title, title);
      const authorScore = author && info.authors?.length
        ? titleMatchScore(info.authors.join(" "), author)
        : 0.35;

      // On accepte les éditions dont le titre est clairement apparenté.
      if (titleScore >= 0.5) {
        candidates.push({
          url: cleanCoverUrl(image),
          score: titleScore * 0.82 + authorScore * 0.18
        });
      }
    }
    if (candidates.some(item => item.score >= 0.98)) break;
  }

  // Open Library : recherche par titre + auteur, puis titre seul.
  const openQueries = [
    new URLSearchParams({ title, author, limit: "30", fields: "title,author_name,cover_i,isbn" }),
    new URLSearchParams({ title, limit: "30", fields: "title,author_name,cover_i,isbn" })
  ];

  for (const params of openQueries) {
    const data = await getJson(`https://openlibrary.org/search.json?${params.toString()}`);
    for (const item of data?.docs || []) {
      if (!item.cover_i) continue;
      const titleScore = titleMatchScore(item.title, title);
      const authorScore = author && item.author_name?.length
        ? titleMatchScore(item.author_name.join(" "), author)
        : 0.3;
      if (titleScore >= 0.5) {
        candidates.push({
          url: `https://covers.openlibrary.org/b/id/${item.cover_i}-L.jpg`,
          score: titleScore * 0.82 + authorScore * 0.18
        });
      }
    }
  }

  const unique = new Map();
  candidates
    .filter(item => item.url)
    .sort((a, b) => b.score - a.score)
    .forEach(item => {
      if (!unique.has(item.url)) unique.set(item.url, item);
    });

  return [...unique.keys()].slice(0, 8);
}

function BookCover({ book, onResolved }) {
  const coverPalettes = [
    { bg: "#F3E5C8", accent: "#D7B477", ink: "#273D43", detail: "#E8D2A8" },
    { bg: "#DCE9DF", accent: "#8EAE9A", ink: "#28453D", detail: "#BFD5C7" },
    { bg: "#F0D9D0", accent: "#C88E7B", ink: "#513B39", detail: "#E5BFB2" },
    { bg: "#DCE8F0", accent: "#8CAFC5", ink: "#29465A", detail: "#BDD2E0" },
    { bg: "#E8E0F1", accent: "#AA96C5", ink: "#443B58", detail: "#D2C5E3" },
    { bg: "#F2E7B9", accent: "#C5A64D", ink: "#4B4328", detail: "#E6D68F" },
    { bg: "#D9E8E7", accent: "#7FAEAA", ink: "#294847", detail: "#B8D5D2" },
    { bg: "#EBDCCB", accent: "#B58B68", ink: "#4C3C31", detail: "#DCC4AC" }
  ];
  const paletteSeed = String(book.title || "ouvrage").split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const palette = coverPalettes[paletteSeed % coverPalettes.length];
  const [urls, setUrls] = useState(
    book.cover_url && /^https?:\/\//i.test(book.cover_url) ? [book.cover_url] : []
  );
  const [failedUrls, setFailedUrls] = useState([]);
  const [searching, setSearching] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const currentUrl = urls.find(url => !failedUrls.includes(url));

  useEffect(() => {
    let cancelled = false;

    async function searchCover() {
      setSearching(true);
      setFailed(false);
      const results = await findRealBookCovers(book);
      if (cancelled) return;

      setUrls(current => {
        const merged = [...current, ...results];
        return [...new Set(merged)];
      });
      setSearching(false);
      if (!results.length && !book.cover_url) setFailed(true);
    }

    searchCover();
    return () => { cancelled = true; };
  }, [book.id]);

  const handleImageError = () => {
    if (currentUrl) setFailedUrls(current => [...current, currentUrl]);
    if (!searching && failedUrls.length + 1 >= urls.length) setFailed(true);
  };

  const handleImageLoad = () => {
    setFailed(false);
    if (!saved && currentUrl) {
      setSaved(true);
      onResolved?.(book, currentUrl);
    }
  };

  return (
    <div className="library-book-cover" style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center"
    }}>
      {currentUrl ? (
        <img
          src={currentUrl}
          alt={`Couverture de ${book.title}`}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={handleImageError}
          onLoad={handleImageLoad}
          style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", padding: "10px", boxSizing: "border-box" }}
        />
      ) : (
        <div
          role="img"
          aria-label={`Couverture de remplacement pour ${book.title || "cet ouvrage"}`}
          style={{
            width: "100%",
            height: "100%",
            minHeight: "0",
            boxSizing: "border-box",
            position: "relative",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "24px 22px 20px",
            background: `linear-gradient(145deg, ${palette.bg} 0%, ${palette.detail} 100%)`,
            color: palette.ink,
            border: `1px solid ${palette.accent}`
          }}
        >
          <div style={{
            position: "absolute", width: "190px", height: "190px", borderRadius: "50%",
            right: "-62px", top: "-72px", background: palette.accent, opacity: .20
          }} />
          <div style={{
            position: "absolute", width: "150px", height: "150px", borderRadius: "50%",
            left: "-78px", bottom: "-72px", border: `1px solid ${palette.accent}`, opacity: .55
          }} />
          <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "Georgia, serif", fontSize: "13px", letterSpacing: "2px", fontWeight: 700 }}>LIVRE</span>
            <span style={{ width: "34px", height: "34px", borderRadius: "50%", border: `1px solid ${palette.accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "17px" }}>✦</span>
          </div>
          <div style={{ position: "relative", zIndex: 1, margin: "auto 0", padding: "18px 0 14px" }}>
            <div style={{ width: "42px", height: "3px", background: palette.accent, marginBottom: "17px" }} />
            <div style={{
              fontFamily: "Georgia, 'Times New Roman', serif", fontSize: "clamp(17px, 1.45vw, 23px)",
              lineHeight: 1.12, fontWeight: 700, overflowWrap: "anywhere", maxHeight: "5.6em", overflow: "hidden"
            }}>{book.title || "Ouvrage"}</div>
          </div>
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ width: "100%", height: "1px", background: palette.accent, marginBottom: "12px" }} />
            <div style={{ fontSize: "12px", lineHeight: 1.25, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {authorsList(book.authors).join(", ") || "Auteur non renseigné"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Library() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState(defaultCategories);
  const [activeCategory, setActiveCategory] = useState(defaultCategories[0]);
  const [search, setSearch] = useState("");
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resolvedCovers, setResolvedCovers] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const booksPerPage = 24;

  async function rememberResolvedCover(book, coverUrl) {
    setResolvedCovers((current) => ({ ...current, [book.id]: coverUrl }));
    const { error: updateError } = await supabase
      .from("books_catalog")
      .update({ cover_url: coverUrl })
      .eq("id", book.id);
    if (updateError) console.warn("Couverture trouvée mais non enregistrée dans Supabase:", updateError.message);
  }

  // Charge tout le catalogue actif une seule fois.
  // Les catégories sont construites depuis Supabase afin de correspondre
  // exactement aux valeurs réellement enregistrées dans books_catalog.
  useEffect(() => {
    let cancelled = false;

    async function loadBooks() {
      setLoading(true);
      setError("");

      // Supabase limite souvent les réponses à 1 000 lignes : on lit le catalogue par lots.
      const pageSize = 500;
      let loadedBooks = [];
      let offset = 0;
      let fetchError = null;

      while (true) {
        const { data, error: batchError } = await supabase
          .from("books_catalog")
          .select("id, title, authors, description, publisher, published_date, isbn, cover_url, category, reference_price, reference_currency, created_at")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .range(offset, offset + pageSize - 1);

        if (batchError) { fetchError = batchError; break; }
        const batch = data || [];
        loadedBooks = loadedBooks.concat(batch);
        if (batch.length < pageSize) break;
        offset += pageSize;
      }

      if (cancelled) return;

      if (fetchError) {
        setBooks([]);
        setError(fetchError.message);
        setLoading(false);
        return;
      }
      setBooks(loadedBooks);

      const categoryNames = [...new Set(
        loadedBooks
          .map((book) => (book.category || "").trim())
          .filter(Boolean)
      )].sort((a, b) => a.localeCompare(b, "fr"));

      // Les 29 rubriques restent visibles même lorsqu'une rubrique est momentanément vide.
      const extraCategories = categoryNames
        .filter(title => !defaultCategories.some(category => category.title === title))
        .map((title, index) => ({
          number: String(defaultCategories.length + index + 1).padStart(2, "0"),
          title,
          description: "Découvrez les ouvrages et références de cette thématique."
        }));
      const allCategories = [...defaultCategories, ...extraCategories];
      setCategories(allCategories);
      setActiveCategory(current => allCategories.find(category => category.title === current.title) || allCategories[0]);

      setLoading(false);
    }

    loadBooks();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredBooks = books.filter((book) => {
    if ((book.category || "").trim() !== activeCategory.title) return false;

    const term = search.trim().toLowerCase();

    if (!term) return true;

    const searchableText = [
      book.title,
      ...authorsList(book.authors),
      book.publisher,
      book.description,
      book.isbn
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(term);
  });

  const totalPages = Math.max(1, Math.ceil(filteredBooks.length / booksPerPage));
  const visibleBooks = filteredBooks.slice((currentPage - 1) * booksPerPage, currentPage * booksPerPage);

  function requestBook(book) {
    navigate("/commande-livre", {
      state: {
        book: {
          id: book.id,
          title: book.title || "Ouvrage sans titre",
          authors: authorsList(book.authors),
          publisher: book.publisher || "",
          published_date: book.published_date || "",
          isbn: book.isbn || "",
          category: book.category || activeCategory.title,
          description: book.description || "",
          cover_url: resolvedCovers[book.id] || book.cover_url || "",
          reference_price: book.reference_price ?? null,
          reference_currency: book.reference_currency || "XOF"
        }
      }
    });
  }

  return (
    <main className="section library-page">
      <style>{`
        .library-page {
          --library-ink: #172f35;
          --library-muted: #64777b;
          --library-line: #e5ecea;
          --library-accent: #16877f;
          --library-soft: #f3f8f6;
          color: var(--library-ink);
        }
        .library-page .library-hero {
          display: grid;
          grid-template-columns: minmax(0, 1.05fr) minmax(280px, .95fr);
          align-items: center;
          gap: clamp(28px, 5vw, 64px);
          max-width: 1180px;
          margin: 0 auto 48px;
        }
        .library-page .section-head {
          max-width: 650px;
          margin: 0;
          text-align: left;
        }
        .library-page .library-hero-visual {
          position: relative;
          min-height: 310px;
          overflow: hidden;
          border-radius: 22px;
          background: #e7eee9;
          box-shadow: 0 18px 45px rgba(23, 59, 61, .13);
        }
        .library-page .library-hero-visual img {
          display: block; width: 100%; height: 100%; min-height: 310px;
          object-fit: cover; object-position: center;
        }
        .library-page .library-hero-visual::after {
          content: ""; position: absolute; inset: 45% 0 0;
          background: linear-gradient(180deg, transparent, rgba(15, 39, 39, .48));
          pointer-events: none;
        }
        .library-page .library-hero-caption {
          position: absolute; z-index: 1; left: 22px; bottom: 20px;
          color: #fff; font-size: 11px; font-weight: 750;
          letter-spacing: .16em; text-transform: uppercase;
        }
        .library-page .section-head .eyebrow,
        .library-page .eyebrow {
          color: var(--library-accent);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .17em;
        }
        .library-page .section-head h1 {
          margin: 14px 0 12px;
          color: var(--library-ink);
          font-size: clamp(34px, 5vw, 56px);
          line-height: 1.04;
          letter-spacing: -.045em;
          font-weight: 750;
        }
        .library-page .section-head p {
          max-width: 650px;
          margin: 0 auto;
          color: var(--library-muted);
          font-size: 16px;
          line-height: 1.8;
        }
        .library-page .library-category-section { margin: 24px 0 28px; }
        .library-page .library-category-heading {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; margin-bottom: 16px;
        }
        .library-page .library-category-heading h2 {
          margin: 0; color: var(--library-ink); font-size: clamp(20px, 2vw, 25px);
          letter-spacing: -.025em;
        }
        .library-page .library-category-count {
          color: var(--library-muted); font-size: 12px; white-space: nowrap;
          padding: 7px 11px; border: 1px solid var(--library-line); border-radius: 99px;
          background: #fff;
        }
        .library-page .library-category-nav {
          display: flex; gap: 10px; overflow-x: auto; overflow-y: hidden;
          padding: 5px 2px 12px; scroll-padding-inline: 12px;
          scrollbar-width: none; -ms-overflow-style: none; -webkit-overflow-scrolling: touch;
        }
        .library-page .library-category-nav::-webkit-scrollbar { display: none; }
        .library-page .library-category-chip {
          flex: 0 0 auto; min-height: 42px; display: inline-flex; align-items: center;
          gap: 9px; padding: 10px 16px; border: 1px solid var(--library-line);
          border-radius: 12px; background: #fff; color: #40565a !important;
          font: inherit; font-size: 12px; font-weight: 650; white-space: nowrap;
          cursor: pointer; transition: all .2s ease;
        }
        .library-page .library-category-chip:hover {
          border-color: #a9d2cb; background: #f7fbfa; transform: translateY(-1px);
        }
        .library-page .library-category-nav > button.library-category-chip[aria-pressed="true"] {
          color: #fff !important;
          border: 1px solid #173b3d !important;
          background: linear-gradient(135deg, #173b3d 0%, #205b57 100%) !important;
          box-shadow: 0 8px 20px rgba(23,59,61,.20);
        }
        .library-page .library-category-nav > button.library-category-chip[aria-pressed="true"] span {
          color: #fff !important;
        }
        .library-page .library-category-nav > button.library-category-chip[aria-pressed="true"] .library-category-chip-number {
          color: #a9e0d5 !important;
        }
        .library-page .library-category-nav > button.library-category-chip[aria-pressed="true"]:hover {
          background: linear-gradient(135deg, #1b4a4b 0%, #26736b 100%) !important;
          border-color: #1b4a4b !important;
        }
        .library-page .library-category-chip:focus-visible,
        .library-page .library-search:focus-visible {
          outline: 3px solid rgba(22,135,127,.2); outline-offset: 2px;
        }
        .library-page .library-category-chip-number {
          color: #9aa9a9; font-size: 9px; font-weight: 800; letter-spacing: .08em;
        }
        .library-page .library-category-chip[aria-pressed="true"] .library-category-chip-number { color: #9dd7cd; }
        .library-page .library-catalog-heading { margin-bottom: 22px; }
        .library-page .library-catalog-heading h2 {
          margin: 8px 0 7px; color: var(--library-ink);
          font-size: clamp(24px, 3vw, 32px); letter-spacing: -.035em;
        }
        .library-page .library-catalog-heading p { margin: 0; color: var(--library-muted); line-height: 1.65; }
        .library-page .library-search {
          width: 100%; max-width: 560px; box-sizing: border-box;
          padding: 15px 18px 15px 46px; border-radius: 13px;
          border: 1px solid #dfe8e5; background-color: #fff;
          color: var(--library-ink); font: inherit; font-size: 14px;
          margin: 0 0 28px;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%23748787' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='11' cy='11' r='7'/%3E%3Cpath d='m20 20-4-4'/%3E%3C/svg%3E");
          background-repeat: no-repeat; background-position: 16px center;
          box-shadow: 0 4px 16px rgba(25,55,55,.035);
          transition: border-color .2s ease, box-shadow .2s ease, background-color .2s ease;
        }
        .library-page .library-search::placeholder { color: #91a0a0; }
        .library-page .library-search:focus {
          outline: none;
          border-color: #16877f;
          box-shadow: 0 0 0 4px rgba(22,135,127,.11), 0 10px 24px rgba(25,55,55,.06);
        }
        .library-page .library-book-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 20px; align-items: stretch;
        }
        .library-page .library-book-card {
          display: flex; flex-direction: column; min-width: 0; gap: 0;
          padding: 13px; border: 1px solid #e6eeeb; border-radius: 20px;
          background: linear-gradient(180deg, #fff 0%, #fffefa 100%);
          box-shadow: 0 7px 24px rgba(25,55,55,.045);
          transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease;
        }
        .library-page .library-book-card:hover {
          transform: translateY(-5px); border-color: #c9ded9;
          box-shadow: 0 16px 34px rgba(25,55,55,.10);
        }
        .library-page .library-book-card .library-book-cover {
          height: 205px; margin-bottom: 17px; border-radius: 13px;
          overflow: hidden; background: linear-gradient(145deg,#f5f7f5,#eaf0ed);
          box-shadow: inset 0 0 0 1px rgba(23,59,61,.035);
        }
        .library-page .library-book-card .library-book-cover img {
          width: 100%; height: 100%; object-fit: contain; display: block;
          padding: 10px; box-sizing: border-box;
        }
        .library-page .library-book-title {
          margin: 0 0 8px; color: var(--library-ink);
          font-size: 17px; line-height: 1.32; letter-spacing: -.025em;
          font-weight: 750; display: -webkit-box; -webkit-line-clamp: 2;
          -webkit-box-orient: vertical; overflow: hidden; min-height: 2.64em;
        }
        .library-page .library-book-author {
          margin: 0 0 6px; color: #47666a; font-size: 13px; font-weight: 650;
          line-height: 1.5;
        }
        .library-page .library-book-publisher {
          margin: 0 0 12px; color: #8a9999; font-size: 11px; line-height: 1.45;
        }
        .library-page .library-book-description {
          margin: 0 0 17px; color: #65777a; font-size: 12px; line-height: 1.75;
          display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical;
          overflow: hidden; min-height: 5.25em;
        }
        .library-page .library-book-bottom { margin-top: auto; padding-top: 13px; border-top: 1px solid #edf1ef; }
        .library-page .library-format-label {
          display: inline-flex; align-items: center; gap: 7px; margin-bottom: 11px;
          color: #53696c; font-size: 11px; font-weight: 700;
        }
        .library-page .library-format-label::before {
          content: ""; width: 7px; height: 7px; border-radius: 50%; background: #20a18f;
          box-shadow: 0 0 0 3px #e5f4ef;
        }
        .library-page .library-format-text { margin: 0 0 14px; color: #8a9999; font-size: 11px; }
        .library-page .library-book-card .library-order-button {
          width: 100%; min-height: 44px; display: flex; align-items: center;
          justify-content: center; gap: 8px; padding: 11px 14px;
          border: 1px solid #173b3d; border-radius: 10px; background: #173b3d;
          color: #fff; font: inherit; font-size: 12px; font-weight: 700;
          cursor: pointer; transition: background .2s ease, transform .2s ease, box-shadow .2s ease;
        }
        .library-page .library-book-card .library-order-button:hover {
          background: #1d7770; border-color: #1d7770;
          box-shadow: 0 7px 16px rgba(23,119,112,.18); transform: translateY(-1px);
        }
        .library-page .library-note { color: #879595; font-size: 11px; line-height: 1.6; margin-top: 22px; }
        .library-page .about-copy { color: var(--library-muted); line-height: 1.8; }
        .library-page .about-copy h2 { color: var(--library-ink); letter-spacing: -.03em; }
        .library-page .library-request-panel {
          position: relative; overflow: hidden; margin-top: 48px;
          padding: clamp(28px, 5vw, 54px); border-radius: 22px;
          background: radial-gradient(circle at 88% 12%, rgba(89,180,160,.22), transparent 28%), linear-gradient(125deg,#142f35 0%,#1b4948 100%);
          color: #fff; text-align: left; box-shadow: 0 18px 42px rgba(20,47,53,.16);
        }
        .library-page .library-request-panel .eyebrow { color: #a6ddd0; }
        .library-page .library-request-panel h2 {
          max-width: 620px; margin: 12px 0; color: #fff;
          font-size: clamp(27px, 4vw, 42px); line-height: 1.12; letter-spacing: -.04em;
        }
        .library-page .library-request-panel p {
          max-width: 620px; margin: 0 0 24px; color: rgba(255,255,255,.76);
          font-size: 14px; line-height: 1.8;
        }
        .library-page .library-request-panel .library-contact-button {
          display: inline-flex; align-items: center; justify-content: center;
          min-height: 46px; padding: 12px 19px; border: 0; border-radius: 10px;
          background: #fff; color: #173b3d; font: inherit; font-size: 13px;
          font-weight: 750; cursor: pointer; transition: transform .2s ease, background .2s ease;
        }
        .library-page .library-request-panel .library-contact-button:hover { transform: translateY(-2px); background: #eaf5f1; }
        @media (max-width: 680px) {
          .library-page .library-hero { grid-template-columns: 1fr; gap: 22px; margin-bottom: 32px; }
          .library-page .section-head { margin-bottom: 0; text-align: left; }
          .library-page .section-head p { font-size: 14px; }
          .library-page .library-hero-visual,
          .library-page .library-hero-visual img { min-height: 220px; }
          .library-page .library-category-section { margin: 20px 0 24px; }
          .library-page .library-category-chip { min-height: 39px; padding: 9px 12px; font-size: 11px; }
          .library-page .library-book-grid { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 12px; }
          .library-page .library-book-card { padding: 10px; border-radius: 16px; }
          .library-page .library-book-card .library-book-cover { height: 165px; margin-bottom: 13px; }
          .library-page .library-book-title { font-size: 14px; }
          .library-page .library-book-author { font-size: 11px; }
          .library-page .library-book-description { font-size: 11px; }
          .library-page .library-book-card .library-order-button { min-height: 41px; padding: 9px 7px; font-size: 10px; }
        }
        @media (max-width: 380px) {
          .library-page .library-book-grid { grid-template-columns: 1fr; }
          .library-page .library-book-card .library-book-cover { height: 210px; }
        }
        /* Correctifs mobiles : titres, hero et pagination */
        @media (max-width: 680px) {
          .library-page {
            width: 100%;
            max-width: 100%;
            overflow-x: clip;
            padding-left: 18px;
            padding-right: 18px;
          }
          .library-page .library-hero {
            display: flex;
            flex-direction: column;
            align-items: stretch;
            gap: 24px;
            width: 100%;
            min-width: 0;
          }
          .library-page .section-head,
          .library-page .section-head h1,
          .library-page .section-head p {
            width: 100%;
            max-width: 100%;
            min-width: 0;
            overflow: visible;
            overflow-wrap: anywhere;
            word-break: normal;
          }
          .library-page .section-head h1 {
            display: block;
            font-size: clamp(32px, 9vw, 42px);
            line-height: 1.12;
            letter-spacing: -.035em;
            white-space: normal;
            text-wrap: pretty;
          }
          .library-page .library-hero-visual {
            width: 100%;
            min-width: 0;
            min-height: 220px;
            aspect-ratio: 1.35 / 1;
          }
          .library-page .library-hero-visual img {
            width: 100%;
            height: 100%;
            min-height: 220px;
            object-fit: cover;
          }
          .library-page .library-pagination {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
            align-items: center;
            justify-content: stretch;
            gap: 10px !important;
            width: 100%;
            margin: 24px 0 !important;
          }
          .library-page .library-pagination > span {
            grid-column: 1 / -1;
            grid-row: 1;
            text-align: center;
            padding: 4px 0 8px;
            line-height: 1.5;
          }
          .library-page .library-pagination > button {
            width: 100%;
            min-width: 0;
            min-height: 44px;
            justify-content: center;
            padding: 10px 8px;
            white-space: nowrap;
            font-size: 12px;
          }
          .library-page .library-pagination > button:first-of-type { grid-column: 1; grid-row: 2; }
          .library-page .library-pagination > button:last-of-type { grid-column: 2; grid-row: 2; }
          .library-page .library-category-heading {
            align-items: flex-start;
            flex-wrap: wrap;
          }
          .library-page .library-category-heading h2 {
            min-width: 0;
            font-size: clamp(21px, 6vw, 26px);
          }
        }
        @media (max-width: 380px) {
          .library-page { padding-left: 14px; padding-right: 14px; }
          .library-page .section-head h1 { font-size: 32px; }
        }
      `}</style>

      <section className="library-hero" aria-label="Présentation de la bibliothèque">
        <div className="section-head">
          <div className="eyebrow">
            SAVOIR · DOCUMENTATION · TRANSMISSION
          </div>

          <h1>Bibliothèque et ressources</h1>

          <p>
            Découvrez une sélection d'ouvrages et de références
            pour approfondir vos connaissances, nourrir votre curiosité
            et enrichir votre parcours.
          </p>
        </div>

        <div className="library-hero-visual">
          <img
            src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1400&q=85"
            alt="Grande bibliothèque avec des rayonnages de livres"
            loading="eager"
          />
          <span className="library-hero-caption">Un espace dédié au savoir</span>
        </div>
      </section>

      <section className="library-category-section" aria-label="Domaines de la bibliothèque">
        <div className="library-category-heading">
          <h2>Explorer les domaines</h2>
          <span className="library-category-count">{categories.length} thématiques</span>
        </div>

        <div className="library-category-nav">
          {categories.map((category) => (
            <button
              key={category.number}
              type="button"
              className="library-category-chip"
              onClick={(event) => {
                setActiveCategory(category);
                setCurrentPage(1);
                setSearch("");
                event.currentTarget.scrollIntoView({
                  behavior: "smooth",
                  block: "nearest",
                  inline: "center"
                });
              }}
              aria-pressed={activeCategory.number === category.number}
            >
              <span className="library-category-chip-number">{category.number}</span>
              <span>{category.title}</span>
            </button>
          ))}
        </div>
      </section>

      <section style={{ marginTop: "8px" }}>
        <div className="library-catalog-heading">
          <div className="eyebrow">CATALOGUE DOCUMENTAIRE</div>
          <h2>{activeCategory.title}</h2>
          <p>{activeCategory.description}</p>
        </div>

        <input
          type="search"
          value={search}
          onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); }}
          placeholder="Rechercher un titre ou un auteur..."
          aria-label="Rechercher un ouvrage"
          className="library-search"
        />

        {loading && <p>Chargement des ouvrages...</p>}

        {error && (
          <p role="alert" style={{ color: "#b42318" }}>
            Erreur Supabase : {error}
          </p>
        )}

        {!loading && !error && filteredBooks.length === 0 && (
          <p>
            {search.trim()
              ? "Aucun ouvrage ne correspond à votre recherche."
              : "Aucun ouvrage n'est disponible dans cette rubrique pour le moment."}
          </p>
        )}

        {!loading && !error && filteredBooks.length > 0 && (
          <div className="library-book-grid">
            {visibleBooks.map((book) => {
              const authors =
                authorsList(book.authors).join(", ") || "Auteur non renseigné";

              return (
                <article
                  key={book.id}
                  className="library-book-card"
                >
                  <BookCover book={book} onResolved={rememberResolvedCover} />

                  <h3 className="library-book-title">{book.title}</h3>

                  <p className="library-book-author">{authors}</p>

                  <p className="library-book-publisher">
                    {book.publisher || "Éditeur non renseigné"}
                  </p>

                  {book.description && (
                    <p className="library-book-description">
                      {book.description}
                    </p>
                  )}

                  <div className="library-book-bottom">
                    <div className="library-format-label">Documents numériques</div>
                    <p className="library-format-text">Disponibles en PDF et EPUB.</p>
                    <button
                      className="library-order-button"
                      type="button"
                      onClick={() => requestBook(book)}
                    >
                      Commander ce document <span aria-hidden="true">↗</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && !error && filteredBooks.length > booksPerPage && (
          <nav className="library-pagination" aria-label="Pagination du catalogue" style={{display:"flex",justifyContent:"center",alignItems:"center",gap:"12px",flexWrap:"wrap",margin:"28px 0"}}>
            <button type="button" className="library-category-chip" disabled={currentPage === 1} onClick={() => setCurrentPage(page => Math.max(1, page - 1))}>← Précédent</button>
            <span style={{color:"#52686a",fontSize:"13px"}}>Page {currentPage} sur {totalPages} · {filteredBooks.length} ouvrages</span>
            <button type="button" className="library-category-chip" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}>Suivant →</button>
          </nav>
        )}

        <p className="library-note">
          Les références présentées sont soumises à vérification de disponibilité et des droits applicables.
        </p>
      </section>

      <section className="about-copy" style={{ marginTop: "55px" }}>
        <h2>Une bibliothèque tournée vers le partage</h2>

        <p>
          RAWAGO souhaite mettre à votre disposition une sélection
          de références documentaires dans différents domaines
          du savoir, de la littérature et de la culture.
        </p>

        <p>
          Les documents numériques sont proposés en PDF et EPUB, sous réserve
          de disponibilité et des droits applicables.
        </p>
      </section>

      <section
        className="library-request-panel"
        aria-labelledby="library-request-title"
      >
        <div className="eyebrow">RECHERCHE PERSONNALISÉE</div>
        <h2 id="library-request-title" style={{ marginTop: "10px" }}>
          Vous ne trouvez pas votre livre ?
        </h2>
        <p style={{ maxWidth: "650px", margin: "12px auto 22px" }}>
          Vous recherchez un ouvrage absent du catalogue ? Je peux le chercher
          pour vous. Contactez-moi en précisant le titre et, si possible,
          le nom de l’auteur : je vous accompagnerai dans votre recherche.
        </p>
        <button
          className="library-contact-button"
          type="button"
          onClick={() => navigate("/contact")}
        >
          Me contacter <span aria-hidden="true">↗</span>
        </button>
      </section>
    </main>
  );
}

export default Library;

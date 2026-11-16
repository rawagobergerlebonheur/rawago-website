
import { useEffect, useState } from "react";
import { supabase } from "../supabase";

const categories = [
  { number: "01", title: "Livres et ouvrages", description: "Droit, économie, sciences politiques, sociologie et philosophie." },
  { number: "02", title: "Articles scientifiques", description: "Recherche académique, sciences humaines et publications scientifiques." },
  { number: "03", title: "Documents historiques", description: "Histoire africaine, histoire du Sénégal et relations internationales." },
  { number: "04", title: "Méthodologie et recherche", description: "Mémoire, thèse, rédaction scientifique et méthodologie universitaire." },
  { number: "05", title: "Romans et littérature", description: "Romans africains, littérature francophone, classiques, poésie et nouvelles." },
  { number: "06", title: "Développement personnel", description: "Confiance en soi, leadership, discipline, habitudes et gestion du temps." },
  { number: "07", title: "Culture générale et savoirs du monde", description: "Géopolitique, société, éducation et connaissance du monde." },
  { number: "08", title: "Ressources professionnelles et entrepreneuriat", description: "Management, entrepreneuriat, stratégie et vie professionnelle." },
  { number: "09", title: "Biographies et autobiographies", description: "Parcours de personnalités, scientifiques, entrepreneurs et penseurs." },
  { number: "10", title: "Philosophie et grands penseurs", description: "Grands courants philosophiques, pensée critique et débats d'idées." },
  { number: "11", title: "Sciences, technologie et innovation", description: "Sciences, numérique, intelligence artificielle et découvertes." },
  { number: "12", title: "Arts, culture et créativité", description: "Arts, musique, cinéma, patrimoine et expression créative." },
  { number: "13", title: "Éducation, société et citoyenneté", description: "Éducation, institutions, droits, citoyenneté et vie sociale." },
  { number: "14", title: "Environnement et développement durable", description: "Écologie, climat, biodiversité et développement durable." }
];

function Library() {
  const [activeCategory, setActiveCategory] = useState(categories[0]);
  const [search, setSearch] = useState("");
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadBooks() {
      setLoading(true);
      setError("");

      const { data, error: fetchError } = await supabase
        .from("books_catalog")
        .select(
          "id, title, authors, description, publisher, published_date, isbn, cover_url, category, reference_price, reference_currency"
        )
        .eq("category", activeCategory.title)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(100);

      if (cancelled) return;

      if (fetchError) {
        setBooks([]);
        setError(fetchError.message);
      } else {
        setBooks(data || []);
      }

      setLoading(false);
    }

    loadBooks();

    return () => {
      cancelled = true;
    };
  }, [activeCategory]);

  const filteredBooks = books.filter((book) => {
    const term = search.trim().toLowerCase();

    if (!term) return true;

    const searchableText = [
      book.title,
      ...(book.authors || []),
      book.publisher,
      book.description,
      book.isbn
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return searchableText.includes(term);
  });

  function requestBook(book) {
    const title = book.title || "Ouvrage sans titre";
    const authors = book.authors?.join(", ") || "Auteur non renseigné";

    const subject = encodeURIComponent(
      `Demande de prix - ${title}`
    );

    const body = encodeURIComponent(
      `Bonjour,\n\n` +
      `Je souhaite obtenir des informations et un meilleur prix pour cet ouvrage :\n\n` +
      `Titre : ${title}\n` +
      `Auteur(s) : ${authors}\n` +
      `Éditeur : ${book.publisher || "Non renseigné"}\n` +
      `ISBN : ${book.isbn || "Non renseigné"}\n` +
      `Catégorie : ${activeCategory.title}\n\n` +
      `Merci de me communiquer les conditions de disponibilité, ` +
      `les possibilités d'accès numérique et votre meilleure proposition tarifaire en FCFA.\n\n` +
      `Cordialement.`
    );

    window.location.href =
      `mailto:rawagobergerlebonheur@gmail.com?subject=${subject}&body=${body}`;
  }

  return (
    <main className="section">
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

      <section style={{ marginBottom: "35px" }}>
        <h2>Explorer les domaines</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "14px",
            marginTop: "20px"
          }}
        >
          {categories.map((category) => (
            <button
              key={category.number}
              type="button"
              onClick={() => {
                setActiveCategory(category);
                setSearch("");
              }}
              aria-pressed={activeCategory.number === category.number}
              style={{
                textAlign: "left",
                padding: "18px",
                borderRadius: "12px",
                border:
                  activeCategory.number === category.number
                    ? "2px solid #159B96"
                    : "1px solid #ddd",
                background:
                  activeCategory.number === category.number
                    ? "#edf8f6"
                    : "#fff",
                cursor: "pointer",
                color: "#172B3D"
              }}
            >
              <strong>
                {category.number} · {category.title}
              </strong>

              <p style={{ fontSize: "13px", marginBottom: 0 }}>
                {category.description}
              </p>
            </button>
          ))}
        </div>
      </section>

      <section style={{ marginTop: "40px" }}>
        <div style={{ marginBottom: "20px" }}>
          <div className="eyebrow">CATALOGUE DOCUMENTAIRE</div>
          <h2>{activeCategory.title}</h2>
          <p>{activeCategory.description}</p>
        </div>

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher un titre ou un auteur..."
          aria-label="Rechercher un ouvrage"
          style={{
            width: "100%",
            maxWidth: "500px",
            padding: "13px 15px",
            borderRadius: "8px",
            border: "1px solid #ccc",
            marginBottom: "25px"
          }}
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
              gap: "24px"
            }}
          >
            {filteredBooks.map((book) => {
              const authors =
                book.authors?.join(", ") || "Auteur non renseigné";

              return (
                <article
                  key={book.id}
                  className="card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: "16px",
                    gap: "10px"
                  }}
                >
                  <div
                    style={{
                      height: "225px",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      background: "#f5f1e8",
                      borderRadius: "8px",
                      overflow: "hidden"
                    }}
                  >
                    {book.cover_url ? (
                      <img
                        src={book.cover_url}
                        alt={`Couverture de ${book.title}`}
                        loading="lazy"
                        style={{
                          maxHeight: "100%",
                          maxWidth: "100%",
                          objectFit: "contain"
                        }}
                      />
                    ) : (
                      <span>Couverture indisponible</span>
                    )}
                  </div>

                  <h3 style={{ fontSize: "16px", margin: "5px 0" }}>
                    {book.title}
                  </h3>

                  <p style={{ fontSize: "13px", margin: 0 }}>
                    {authors}
                  </p>

                  <p style={{ fontSize: "12px", color: "#777", margin: 0 }}>
                    {book.publisher || "Éditeur non renseigné"}
                  </p>

                  {book.description && (
                    <p style={{ fontSize: "13px", margin: 0 }}>
                      {book.description.length > 160
                        ? `${book.description.slice(0, 160)}...`
                        : book.description}
                    </p>
                  )}

                  <div style={{ marginTop: "auto" }}>
                    <strong style={{ color: "#159B96" }}>
                      Tarif sur demande · FCFA
                    </strong>

                    <p style={{ fontSize: "13px", margin: "10px 0 0" }}>
                      <strong>Trop cher ?</strong>
                      <br />
                      Obtenez un meilleur prix grâce à mon accompagnement.
                    </p>

                    <button
                      className="btn primary"
                      type="button"
                      onClick={() => requestBook(book)}
                      style={{
                        width: "100%",
                        marginTop: "12px"
                      }}
                    >
                      Obtenir un prix réduit →
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p style={{ fontSize: "12px", color: "#777", marginTop: "25px" }}>
          Les références présentées sont soumises à vérification
          de disponibilité et des droits applicables.
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
          Pour chaque ouvrage, vous pouvez adresser une demande
          de prix. La disponibilité, les droits de distribution
          et les conditions d'accès seront vérifiés avant toute
          confirmation.
        </p>
      </section>
    </main>
  );
}

export default Library;

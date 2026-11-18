import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabase";

const BUCKET = "rawago-events";
const DEFAULT_CATEGORIES = [
  "Toutes", "Ateliers", "Rencontres", "Conférences", "Formations",
  "Club de lecture", "Expression & prise de parole", "Orientation académique",
  "Rencontres professionnelles"
];

// Formats proposés : ils présentent les activités possibles sans inventer de dates.
const ACTIVITY_FORMATS = [
  {
    category: "ATELIERS PRATIQUES",
    title: "Méthodologie universitaire",
    description: "Apprendre à construire une dissertation, organiser ses idées, préparer un mémoire et conduire une recherche documentaire.",
    image: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=900&q=85",
    alt: "Étudiants travaillant dans une bibliothèque"
  },
  {
    category: "LECTURE & LITTÉRATURE",
    title: "Club de lecture",
    description: "Lire une œuvre ensemble, découvrir des auteurs, présenter ses lectures et échanger autour des textes.",
    image: "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=900&q=85",
    alt: "Livres ouverts pour une séance de lecture"
  },
  {
    category: "CONFÉRENCES & DÉBATS",
    title: "Rencontres intellectuelles",
    description: "Explorer des sujets liés à l'histoire, à la philosophie, à la culture, à la société et aux grands enjeux contemporains.",
    image: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&w=900&q=85",
    alt: "Conférencier devant un public"
  },
  {
    category: "EXPRESSION",
    title: "Prise de parole en public",
    description: "S'entraîner à présenter une idée, argumenter, structurer un discours et participer à un débat avec assurance.",
    image: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=900&q=85",
    alt: "Participants à un atelier collectif"
  },
  {
    category: "ORIENTATION",
    title: "Orientation académique",
    description: "Échanger sur les parcours d'études, les concours, les méthodes de travail et les choix d'orientation.",
    image: "https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=900&q=85",
    alt: "Étudiants échangeant autour de leurs études"
  },
  {
    category: "TÉMOIGNAGES & PARTAGE",
    title: "Rencontres avec des professionnels",
    description: "Découvrir des parcours, écouter des expériences et dialoguer avec des enseignants, chercheurs, auteurs et professionnels.",
    image: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=900&q=85",
    alt: "Groupe de personnes participant à une rencontre"
  }
];

function formatEventDate(value) {
  if (!value) return "Date à préciser";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric"
  }).format(date);
}

function publicImage(path) {
  if (!path) return "";
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

function Events() {
  const [events, setEvents] = useState([]);
  const [activeCategory, setActiveCategory] = useState("Toutes");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadEvents() {
      setLoading(true);
      setError("");
      const { data, error: loadError } = await supabase
        .from("events")
        .select("id, title, category, description, event_date, start_time, end_time, location, status, cover_path, gallery_paths, created_at")
        .eq("status", "published")
        .order("event_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (cancelled) return;
      if (loadError) {
        setError(loadError.message || "Une erreur est survenue lors du chargement des événements.");
        setEvents([]);
      } else {
        setEvents(data || []);
      }
      setLoading(false);
    }

    loadEvents();
    return () => { cancelled = true; };
  }, []);

  const categories = useMemo(() => {
    const found = [...new Set(events.map(item => item.category).filter(Boolean))];
    return ["Toutes", ...new Set([...DEFAULT_CATEGORIES.slice(1), ...found])];
  }, [events]);

  const visibleEvents = useMemo(() => {
    if (activeCategory === "Toutes") return events;
    return events.filter(item => item.category === activeCategory);
  }, [events, activeCategory]);

  return (
    <main className="section events-page">
      <style>{`
        .events-page { color:#17343a; }
        .events-page .events-intro { position:relative; z-index:0; display:grid; grid-template-columns:minmax(0,1fr) minmax(300px,.95fr); align-items:center; gap:clamp(28px,5vw,64px); width:100%; max-width:1180px; min-height:350px; margin:0 auto 48px; padding:clamp(22px,4vw,42px); overflow:hidden; border:1px solid #e5eeeb; border-radius:22px; background:linear-gradient(115deg,#fbfdfb 0%,#f3f8f5 100%); }
        .events-page .events-intro-copy { max-width:560px; }
        .events-page .events-intro .eyebrow { color:#16877f; font-size:10px; font-weight:800; letter-spacing:.17em; }
        .events-page .events-intro h1 { margin:14px 0 16px; font-size:clamp(34px,5vw,58px); line-height:1.05; letter-spacing:-.045em; }
        .events-page .events-intro p { max-width:520px; margin:0; color:#64777b; line-height:1.8; }
        .events-page .events-intro-visual { position:relative; min-height:270px; height:100%; align-self:stretch; overflow:hidden; border-radius:16px; background:#dce9e3; }
        .events-page .events-intro-visual img { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; }
        .events-page .events-intro-visual::after { content:""; position:absolute; inset:45% 0 0; background:linear-gradient(transparent,rgba(13,43,43,.35)); pointer-events:none; }
        .events-page .events-intro-caption { position:absolute; z-index:1; bottom:18px; left:20px; color:#fff; font-size:11px; font-weight:750; letter-spacing:.13em; text-transform:uppercase; }
        .events-page .activity-formats { max-width:1180px; margin:0 auto 54px; }
        .events-page .activity-formats-head { max-width:720px; margin:0 auto 26px; text-align:center; }
        .events-page .activity-formats-head .eyebrow { color:#16877f; font-size:10px; font-weight:800; letter-spacing:.17em; }
        .events-page .activity-formats-head h2 { margin:10px 0; color:#17343a; font-size:clamp(25px,3vw,36px); }
        .events-page .activity-formats-head p { color:#64777b; line-height:1.75; }
        .events-page .activity-formats-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:18px; }
        .events-page .activity-format-card { overflow:hidden; border:1px solid #e5eeeb; border-radius:16px; background:#fff; box-shadow:0 7px 22px rgba(23,59,61,.045); }
        .events-page .activity-format-card img { display:block; width:100%; height:178px; object-fit:cover; background:#edf3f0; }
        .events-page .activity-format-body { padding:18px; }
        .events-page .activity-format-category { color:#16877f; font-size:9px; font-weight:800; letter-spacing:.13em; }
        .events-page .activity-format-body h3 { margin:8px 0; color:#17343a; font-size:18px; }
        .events-page .activity-format-body p { margin:0; color:#64777b; font-size:13px; line-height:1.7; }
        .events-page .activity-format-note { margin:16px 0 0; color:#71827f; font-size:11px; font-style:italic; }
        .events-page .events-filters { display:flex; justify-content:center; flex-wrap:wrap; gap:9px; margin:0 0 30px; }
        .events-page .events-filter { border:1px solid #dfe9e6; border-radius:99px; padding:10px 16px; background:#fff; color:#40585b; font:inherit; font-size:12px; font-weight:700; cursor:pointer; }
        .events-page .events-filter.active { background:#173b3d; color:#fff; border-color:#173b3d; }
        .events-page .events-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:20px; }
        .events-page .event-card { min-width:0; overflow:hidden; border:1px solid #e5eeeb; border-radius:18px; background:#fff; box-shadow:0 8px 25px rgba(23,59,61,.055); }
        .events-page .event-cover { width:100%; height:215px; display:block; object-fit:cover; background:#edf3f0; }
        .events-page .event-cover-placeholder { height:150px; display:grid; place-items:center; background:linear-gradient(135deg,#e7f0ec,#d7e8e1); color:#4d7770; font-size:34px; }
        .events-page .event-body { padding:20px; }
        .events-page .event-category { color:#16877f; font-size:10px; font-weight:800; letter-spacing:.14em; text-transform:uppercase; }
        .events-page .event-body h2 { margin:9px 0 10px; font-size:21px; line-height:1.25; letter-spacing:-.025em; }
        .events-page .event-description { color:#64777b; font-size:13px; line-height:1.75; white-space:pre-line; }
        .events-page .event-meta { display:grid; gap:7px; margin-top:17px; padding-top:14px; border-top:1px solid #edf1ef; color:#52696b; font-size:12px; }
        .events-page .event-gallery { display:flex; gap:8px; overflow-x:auto; margin-top:14px; }
        .events-page .event-gallery img { width:76px; height:62px; flex:0 0 auto; border-radius:8px; object-fit:cover; }
        .events-page .events-state { position:relative; z-index:1; display:block; clear:both; width:100%; min-height:108px; margin:0 0 48px; padding:32px 28px; text-align:center; border:1px solid #e5eeeb; border-radius:16px; color:#64777b; background:#fbfdfc; }
        .events-page .events-state.error { color:#a33a32; }
        .events-page .events-contact { margin-top:48px; padding:clamp(26px,5vw,48px); border-radius:20px; background:linear-gradient(125deg,#142f35,#1b4948); color:#fff; }
        .events-page .events-contact h2 { color:#fff !important; margin:0 0 10px; font-size:clamp(24px,3vw,34px); }
        .events-page .events-contact p { max-width:620px; color:rgba(255,255,255,.82) !important; line-height:1.8; }
        .events-page .events-contact a { display:inline-flex; margin-top:8px; padding:12px 18px; border-radius:9px; background:#fff; color:#173b3d; text-decoration:none; font-size:13px; font-weight:750; }
        @media(max-width:900px) { .events-page .activity-formats-grid { grid-template-columns:repeat(2,minmax(0,1fr)); } }
        @media(max-width:760px) { .events-page .events-intro { grid-template-columns:1fr; min-height:0; gap:22px; margin-bottom:32px; padding:20px; } .events-page .events-intro-visual { min-height:220px; height:220px; } .events-page .events-intro p { font-size:14px; } }
        @media(max-width:600px) { .events-page .events-intro { text-align:left; } .events-page .events-grid,.events-page .activity-formats-grid { grid-template-columns:1fr; } .events-page .activity-formats-head { text-align:left; } }
      `}</style>

      <header className="events-intro">
        <div className="events-intro-copy">
          <div className="eyebrow">RENCONTRES · APPRENTISSAGE · PARTAGE</div>
          <h1>Agenda et événements</h1>
          <p>Retrouvez les activités, les rencontres et les initiatives qui favorisent la transmission du savoir et le développement des compétences.</p>
        </div>
        <div className="events-intro-visual">
          <img
            src="https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=1400&q=85"
            alt="Participants réunis lors d'une rencontre et d'un échange collectif"
            loading="eager"
          />
          <span className="events-intro-caption">Apprendre · Échanger · Construire</span>
        </div>
      </header>

      <section className="activity-formats" aria-labelledby="activity-formats-title">
        <div className="activity-formats-head">
          <div className="eyebrow">APPRENDRE · COMPRENDRE · PARTAGER</div>
          <h2 id="activity-formats-title">Les activités proposées</h2>
          <p>Des ateliers, des rencontres et des espaces d'échange pour accompagner les apprentissages et nourrir la curiosité. Les dates des prochaines sessions seront annoncées dans la programmation ci-dessous.</p>
        </div>
        <div className="activity-formats-grid">
          {ACTIVITY_FORMATS.map(activity => (
            <article className="activity-format-card" key={activity.title}>
              <img src={activity.image} alt={activity.alt} loading="lazy" />
              <div className="activity-format-body">
                <div className="activity-format-category">{activity.category}</div>
                <h3>{activity.title}</h3>
                <p>{activity.description}</p>
              </div>
            </article>
          ))}
        </div>
        <p className="activity-format-note">Ces visuels illustrent les formats d'activités proposés ; ils ne correspondent pas à des événements déjà programmés.</p>
      </section>

      {!loading && !error && events.length > 0 && (
        <nav className="events-filters" aria-label="Filtrer les événements par catégorie">
          {categories.map(category => (
            <button key={category} type="button" className={`events-filter ${activeCategory === category ? "active" : ""}`} aria-pressed={activeCategory === category} onClick={() => setActiveCategory(category)}>
              {category}
            </button>
          ))}
        </nav>
      )}

      {loading ? (
        <div className="events-state">Chargement des événements...</div>
      ) : error ? (
        <div className="events-state error" role="alert">Impossible de charger les événements. {error}</div>
      ) : visibleEvents.length === 0 ? (
        <div className="events-state">{events.length === 0 ? "Aucune date n'est encore annoncée. Les prochaines sessions seront affichées ici dès leur publication." : "Aucun événement dans cette catégorie pour le moment."}</div>
      ) : (
        <section className="events-grid" aria-label="Événements publiés">
          {visibleEvents.map(item => {
            const cover = publicImage(item.cover_path);
            const gallery = (item.gallery_paths || []).filter(path => path && path !== item.cover_path);
            return (
              <article className="event-card" key={item.id}>
                {cover ? <img className="event-cover" src={cover} alt={item.title} loading="lazy" /> : <div className="event-cover-placeholder" aria-hidden="true">✦</div>}
                <div className="event-body">
                  <div className="event-category">{item.category || "Activité"}</div>
                  <h2>{item.title}</h2>
                  {item.description && <p className="event-description">{item.description}</p>}
                  <div className="event-meta">
                    <span>◷ {formatEventDate(item.event_date)}</span>
                    {(item.start_time || item.end_time) && <span>Heure : {item.start_time ? item.start_time.slice(0, 5) : ""}{item.end_time ? ` – ${item.end_time.slice(0, 5)}` : ""}</span>}
                    {item.location && <span>⌖ {item.location}</span>}
                  </div>
                  {gallery.length > 0 && <div className="event-gallery" aria-label={`Galerie de ${item.title}`}>{gallery.map(path => <img key={path} src={publicImage(path)} alt={`Photo de ${item.title}`} loading="lazy" />)}</div>}
                </div>
              </article>
            );
          })}
        </section>
      )}

      <section className="events-contact">
        <h2>Participer aux prochaines activités</h2>
        <p>Vous souhaitez obtenir des précisions sur une activité ou proposer une rencontre ? Contactez-nous pour échanger avec notre équipe.</p>
        <Link to="/contact">Nous contacter ↗</Link>
      </section>
    </main>
  );
}

export default Events;

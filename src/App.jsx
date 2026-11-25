import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { BrowserRouter, Routes, Route, NavLink, Link, useLocation } from "react-router-dom";

import Home from "./pages/Home";
import Services from "./pages/Services";
import About from "./pages/About";
import Library from "./pages/Library";
import BookCheckout from "./pages/BookCheckout";
import Knowledge from "./pages/Knowledge";
import Community from "./pages/Community";
import Events from "./pages/Events";
import Contact from "./pages/Contact";
import ClientArea from "./pages/ClientArea";
import Admin from "./pages/Admin";
import BookOrdersAdmin from "./pages/BookOrdersAdmin";
import Cockpit from "./pages/Cockpit";

function SiteShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showTopButton, setShowTopButton] = useState(false);
  const [brandPhotoUrl, setBrandPhotoUrl] = useState("/portrait-rawago.jpeg");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [recentPages, setRecentPages] = useState([]);
  const [readingScale, setReadingScale] = useState(() => {
    const saved = Number(localStorage.getItem("rawago-reading-scale"));
    return saved >= 0.9 && saved <= 1.2 ? saved : 1;
  });
  const location = useLocation();

  // Premium personal tools: recent pages and adjustable reading comfort.
  useEffect(() => {
    try { setRecentPages(JSON.parse(localStorage.getItem("rawago-recent-pages") || "[]")); } catch { setRecentPages([]); }
  }, []);
  useEffect(() => {
    const path = location.pathname;
    const labelMap = { "/": "Accueil", "/services": "Nos services", "/a-propos": "À propos", "/bibliotheque": "Bibliothèque", "/commande-livre": "Commander un livre", "/savoirs": "Savoirs", "/communaute": "Communauté", "/agenda": "Agenda", "/contact": "Contact", "/espace-client": "Espace client" };
    if (path.startsWith("/administration")) return;
    const item = { path, label: labelMap[path] || "Page RAWAGO", visitedAt: Date.now() };
    setRecentPages(prev => {
      const next = [item, ...prev.filter(p => p.path !== path)].slice(0, 6);
      try { localStorage.setItem("rawago-recent-pages", JSON.stringify(next)); } catch {}
      return next;
    });
  }, [location.pathname]);
  useEffect(() => {
    document.documentElement.style.setProperty("--rawago-reading-scale", String(readingScale));
    try { localStorage.setItem("rawago-reading-scale", String(readingScale)); } catch {}
  }, [readingScale]);

  // Premium shortcuts: scroll-to-top visibility and keyboard search shortcut.
  useEffect(() => {
    const onScroll = () => setShowTopButton(window.scrollY > 420);
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setSearchOpen(true); setSearchQuery(""); }
      if (event.key === "Escape") setSearchOpen(false);
    };
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true }); window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("keydown", onKey); };
  }, []);

  // RAWAGO motion system: scroll progress + gentle reveal on sections/cards.
  useEffect(() => {
    const updateProgress = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? (window.scrollY / max) * 100 : 0;
      document.documentElement.style.setProperty("--rawago-scroll-progress", `${progress}%`);
    };
    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targets = document.querySelectorAll(
      ".page-transition main > section, .page-transition main .card, .page-transition main article, .page-transition main .home-service-card, .page-transition main .dashboard-panel"
    );
    if (reduceMotion || !("IntersectionObserver" in window)) return;
    targets.forEach((el) => el.classList.add("rawago-reveal"));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -35px 0px" });
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [location.pathname]);

  useEffect(() => {
    let active = true;
    async function loadBrandPhoto() {
      const { data, error } = await supabase.storage
        .from("rawago-brand-assets")
        .download("brand/portrait-rawago.jpeg");
      if (!active || error || !data) return;
      const { data: publicData } = supabase.storage
        .from("rawago-brand-assets")
        .getPublicUrl("brand/portrait-rawago.jpeg");
      if (active && publicData?.publicUrl) {
        setBrandPhotoUrl(`${publicData.publicUrl}?v=${Date.now()}`);
      }
    }
    loadBrandPhoto();
    return () => { active = false; };
  }, []);
  const navigation = [
    { label: "Accueil", path: "/" },
    { label: "Nos services", path: "/services" },
    { label: "À propos", path: "/a-propos" },
    { label: "Bibliothèque", path: "/bibliotheque" },
    { label: "Savoirs", path: "/savoirs" },
    { label: "Communauté", path: "/communaute" },
    { label: "Agenda", path: "/agenda" },
    { label: "Contact", path: "/contact" },
  ];
  const searchablePages = [...navigation, { label: "Espace client", path: "/espace-client" }, { label: "Commander un livre", path: "/commande-livre" }, { label: "Mon cockpit RAWAGO", path: "/cockpit" }];
  const filteredPages = searchablePages.filter((item) => item.label.toLowerCase().includes(searchQuery.trim().toLowerCase()));

  return (
    <>
      <div className="rawago-scroll-progress" aria-hidden="true" />
      <header className="site-header">
        <div className="header-top-row">
          <Link className="brand" to="/" onClick={() => setMenuOpen(false)} aria-label="Berger-Le-Bonheur RAWAGO, accueil">
            <img src={brandPhotoUrl} alt="Portrait de Berger-Le-Bonheur RAWAGO" className="brand-photo" />
            <span className="brand-wordmark">
              BERGER-LE-BONHEUR              <small>RAWAGO <i>·</i> SAVOIR & TRANSMISSION</small>
            </span>
          </Link>
          <div className="header-actions">
            <NavLink className="nav-cockpit-link" to="/cockpit" onClick={() => setMenuOpen(false)}>Mon cockpit <span>✦</span></NavLink>
            <Link className="nav-client-link" to="/espace-client" onClick={() => setMenuOpen(false)}>Espace client <span>↗</span></Link>
          </div>
          <button className="mobile-menu-toggle" type="button" aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}>
            <span></span><span></span>
          </button>
        </div>
        <nav className={menuOpen ? "site-nav show" : "site-nav"} aria-label="Navigation principale">
          {navigation.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.path === "/"} onClick={() => setMenuOpen(false)}>{item.label}</NavLink>
          ))}
          <NavLink className="mobile-utility-link nav-cockpit-link" to="/cockpit" onClick={() => setMenuOpen(false)}>Mon cockpit ✦</NavLink>
          <Link className="mobile-utility-link nav-client-link" to="/espace-client" onClick={() => setMenuOpen(false)}>Espace client ↗</Link>
        </nav>
      </header>

      <div key={location.pathname} className="page-transition">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/services" element={<Services />} />
          <Route path="/a-propos" element={<About />} />
          <Route path="/bibliotheque" element={<Library />} />
          <Route path="/commande-livre" element={<BookCheckout />} />
          <Route path="/administration-commandes-livres" element={<BookOrdersAdmin />} />
          <Route path="/savoirs" element={<Knowledge />} />
          <Route path="/communaute" element={<Community />} />
          <Route path="/agenda" element={<Events />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/espace-client" element={<ClientArea />} />
          <Route path="/cockpit" element={<Cockpit />} />
          <Route path="/administration" element={<Admin />} />
          <Route path="*" element={<main className="section"><div className="eyebrow">ERREUR 404</div><h1>Cette page semble introuvable.</h1><p>Revenez à l'accueil pour poursuivre votre exploration.</p><Link className="btn primary" to="/">Retour à l'accueil ↗</Link></main>} />
        </Routes>
      </div>

      {searchOpen && (
        <div className="rawago-search-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSearchOpen(false); }}>
          <section className="rawago-search-panel" role="dialog" aria-modal="true" aria-label="Recherche rapide RAWAGO">
            <div className="rawago-search-head"><span>RECHERCHE RAPIDE</span><button type="button" onClick={() => setSearchOpen(false)} aria-label="Fermer">×</button></div>
            <input autoFocus type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Que recherchez-vous sur RAWAGO ?" />
            <div className="rawago-search-results">
              {filteredPages.map((item) => <Link key={item.path} to={item.path} onClick={() => setSearchOpen(false)}>{item.label}<span>↗</span></Link>)}
              {filteredPages.length === 0 && <p>Aucun résultat. Essayez un autre mot.</p>}
            </div>
            <small>Astuce : Ctrl / ⌘ + K pour ouvrir la recherche</small>
          </section>
        </div>
      )}
      <div className="rawago-tools-wrap">
        {toolsOpen && <aside className="rawago-tools-panel" aria-label="Outils de confort RAWAGO">
          <div className="rawago-tools-title"><span>VOTRE CONFORT</span><button type="button" aria-label="Fermer les outils" onClick={() => setToolsOpen(false)}>×</button></div>
          <div className="rawago-reading-tools"><span>Confort de lecture</span><div><button type="button" aria-label="Réduire la taille du texte" disabled={readingScale <= .9} onClick={() => setReadingScale(v => Math.max(.9, Math.round((v - .05) * 100) / 100))}>A−</button><strong>{Math.round(readingScale * 100)}%</strong><button type="button" aria-label="Augmenter la taille du texte" disabled={readingScale >= 1.2} onClick={() => setReadingScale(v => Math.min(1.2, Math.round((v + .05) * 100) / 100))}>A+</button><button type="button" onClick={() => setReadingScale(1)}>Réinitialiser</button></div></div>
          <div className="rawago-recent"><div className="rawago-recent-head"><span>Pages récemment consultées</span>{recentPages.length > 0 && <button type="button" onClick={() => {setRecentPages([]); try { localStorage.removeItem("rawago-recent-pages"); } catch {} }}>Effacer</button>}</div>{recentPages.length ? recentPages.map(item => <Link key={item.path} to={item.path} onClick={() => setToolsOpen(false)}>{item.label}<b>↗</b></Link>) : <p>Vos pages visitées apparaîtront ici.</p>}</div>
          <div className="rawago-tools-links"><Link to="/bibliotheque" onClick={() => setToolsOpen(false)}>Bibliothèque</Link><Link to="/espace-client" onClick={() => setToolsOpen(false)}>Espace client</Link><Link to="/cockpit" onClick={() => setToolsOpen(false)}>Mon cockpit RAWAGO</Link><button type="button" onClick={() => {setToolsOpen(false);setSearchOpen(true);setSearchQuery("");}}>Recherche rapide</button></div>
        </aside>}
        <button className="rawago-tools-toggle" type="button" aria-expanded={toolsOpen} onClick={() => setToolsOpen(v => !v)} aria-label={toolsOpen ? "Fermer les outils RAWAGO" : "Ouvrir les outils RAWAGO"}><span>Aa</span><small>Outils</small></button>
      </div>
      {showTopButton && <button className="rawago-back-top" type="button" aria-label="Retour en haut" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>↑</button>}
      <footer className="site-footer">
        <div className="footer-main">
          <Link className="brand light" to="/">
            <img
              src={brandPhotoUrl}
              alt="Portrait de Berger-Le-Bonheur RAWAGO"
              className="brand-photo"
              style={{ width: 64, height: 64, minWidth: 64, borderRadius: "50%", objectFit: "cover", objectPosition: "center 28%", display: "block" }}
            />
            <span className="brand-wordmark">BERGER-LE-BONHEUR<small>RAWAGO · SAVOIR & TRANSMISSION</small></span>
          </Link>
          <p>Le savoir réussit lorsqu'il est partagé.</p>
          <Link className="footer-contact" to="/contact">Entrer en contact ↗</Link>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Berger-Le-Bonheur RAWAGO</span>
          <span>Connaissance · Méthode · Accompagnement</span>
        </div>
      </footer>
    </>
  );
}

function App() {
  return <BrowserRouter><SiteShell /></BrowserRouter>;
}

export default App;

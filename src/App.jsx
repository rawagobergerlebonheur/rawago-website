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

function SiteShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [brandPhotoUrl, setBrandPhotoUrl] = useState("/portrait-rawago.jpeg");
  const location = useLocation();

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

  return (
    <>
      <header className="site-header">
        <Link className="brand" to="/" onClick={() => setMenuOpen(false)} aria-label="Berger-Le-Bonheur RAWAGO, accueil">
          <img
            src={brandPhotoUrl}
            alt="Portrait de Berger-Le-Bonheur RAWAGO"
            className="brand-photo"
            style={{ width: 64, height: 64, minWidth: 64, borderRadius: "50%", objectFit: "cover", objectPosition: "center 28%", display: "block" }}
          />
          <span className="brand-wordmark">
            BERGER-LE-BONHEUR
            <small>RAWAGO <i>·</i> SAVOIR & TRANSMISSION</small>
          </span>
        </Link>

        <button className="mobile-menu-toggle" type="button" aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}>
          <span></span><span></span>
        </button>

        <nav className={menuOpen ? "site-nav show" : "site-nav"} aria-label="Navigation principale">
          {navigation.map((item) => (
            <NavLink key={item.path} to={item.path} end={item.path === "/"} onClick={() => setMenuOpen(false)}>
              {item.label}
            </NavLink>
          ))}
          <Link className="nav-client-link" to="/espace-client" onClick={() => setMenuOpen(false)}>Espace client <span>↗</span></Link>
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
          <Route path="/administration" element={<Admin />} />
          <Route path="*" element={<main className="section"><div className="eyebrow">ERREUR 404</div><h1>Cette page semble introuvable.</h1><p>Revenez à l'accueil pour poursuivre votre exploration.</p><Link className="btn primary" to="/">Retour à l'accueil ↗</Link></main>} />
        </Routes>
      </div>

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

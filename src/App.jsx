
import { BrowserRouter, Routes, Route, NavLink, Link } from "react-router-dom";

import Home from "./pages/Home";
import Services from "./pages/Services";
import About from "./pages/About";
import Library from "./pages/Library";
import Knowledge from "./pages/Knowledge";
import Community from "./pages/Community";
import Events from "./pages/Events";
import Contact from "./pages/Contact";
import ClientArea from "./pages/ClientArea";
import Admin from "./pages/Admin";

function App() {
  const navigation = [
    { label: "Accueil", path: "/" },
    { label: "Services", path: "/services" },
    { label: "À propos", path: "/a-propos" },
    { label: "Bibliothèque", path: "/bibliotheque" },
    { label: "Savoirs et réflexions", path: "/savoirs" },
    { label: "Communauté", path: "/communaute" },
    { label: "Agenda", path: "/agenda" },
    { label: "Contact", path: "/contact" },
    { label: "Espace client", path: "/espace-client" }
  ];

  return (
    <BrowserRouter>
      <header>
        <Link className="brand" to="/">
          <img
            className="mark"
            src="/portrait-rawago.jpeg"
            alt="Portrait de Berger-Le-Bonheur RAWAGO"
          />

          <span>
            BERGER-LE-BONHEUR
            <small>RAWAGO</small>
          </span>
        </Link>

        <nav>
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/services" element={<Services />} />
        <Route path="/a-propos" element={<About />} />
        <Route path="/bibliotheque" element={<Library />} />
        <Route path="/savoirs" element={<Knowledge />} />
        <Route path="/communaute" element={<Community />} />
        <Route path="/agenda" element={<Events />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/espace-client" element={<ClientArea />} />
        <Route path="/administration" element={<Admin />} />

        <Route
          path="*"
          element={
            <main className="section">
              <h1>Page introuvable</h1>
              <p>La page demandée n'existe pas.</p>
              <Link className="btn primary" to="/">
                Retour à l'accueil
              </Link>
            </main>
          }
        />
      </Routes>

      <footer>
        <Link className="brand light" to="/">
          <img
            className="mark"
            src="/portrait-rawago.jpeg"
            alt="Portrait de Berger-Le-Bonheur RAWAGO"
          />

          <span>
            BERGER-LE-BONHEUR
            <small>RAWAGO</small>
          </span>
        </Link>

        <p>Le savoir réussit lorsqu'il est partagé.</p>

        <span>
          © {new Date().getFullYear()} Berger-Le-Bonheur RAWAGO
        </span>
      </footer>
    </BrowserRouter>
  );
}

export default App;

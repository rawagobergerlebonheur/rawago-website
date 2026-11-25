import { Link } from "react-router-dom";

function Home() {
  return (
    <main className="home-page">
      <section className="hero hero-premium">
        <div className="hero-copy">
          <div className="eyebrow hero-eyebrow"><span className="eyebrow-line"></span> SAVOIR · ACCOMPAGNEMENT · PARTAGE</div>
          <p className="hero-kicker">Donner du sens au savoir.</p>
          <h1>Votre ambition mérite <em>les bonnes ressources.</em></h1>
          <p className="hero-description">
            Un espace dédié à l’apprentissage, à la réflexion et à la progression.
            Des ressources pertinentes et un accompagnement attentif pour faire
            avancer vos idées, vos études et vos projets.
          </p>
          <div className="actions">
            <Link className="btn primary" to="/services">Découvrir nos services <span>↗</span></Link>
            <Link className="btn secondary" to="/bibliotheque">Explorer la bibliothèque</Link>
          </div>
          <div className="hero-footnote"><span className="footnote-dot"></span> À distance dans le monde entier · En présentiel au Sénégal</div>
        </div>
        <div className="hero-visual hero-art">
          <div className="hero-image-frame">
            <img src="https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=1400&q=88" alt="Étudiants réunis autour d'un travail d'apprentissage" />
          </div>
          <div className="hero-image-index">01 <span>/</span> APPRENDRE AUTREMENT</div>
          <div className="floating-note">
            <span className="note-symbol">✳</span>
            <span><small>NOTRE CONVICTION</small><strong>Le savoir ouvre<br />de nouvelles voies.</strong>
          </span></div>
          <div className="hero-orbit" aria-hidden="true"></div>
        </div>
      </section>

      <section className="home-intro section">
        <div className="intro-label"><span>01</span> NOTRE APPROCHE</div>
        <div className="intro-content">
          <h2>Apprendre avec méthode.<br /><em>Progresser avec confiance.</em></h2>
          <p>Nous réunissons accompagnement humain, exigence intellectuelle et ressources documentaires pour vous aider à avancer avec clarté, à chaque étape de votre parcours.</p>
          <Link className="text-link" to="/a-propos">Découvrir notre vision <span>↗</span></Link>
        </div>
      </section>


      <section className="home-cockpit-promo" aria-labelledby="home-cockpit-title">
        <div className="home-cockpit-inner">
          <div className="home-cockpit-mark" aria-hidden="true">✦</div>
          <div className="home-cockpit-copy">
            <div className="eyebrow">VOTRE ESPACE DE PROGRESSION</div>
            <h2 id="home-cockpit-title">Un espace pour <em>organiser vos idées.</em></h2>
            <p>Planifiez vos journées, rassemblez vos notes, suivez vos objectifs et gardez le cap avec votre Cockpit RAWAGO — un outil personnel simple, accessible à tout moment.</p>
            <Link className="btn primary" to="/cockpit">Ouvrir mon cockpit <span>↗</span></Link>
          </div>
          <div className="home-cockpit-illustration">
            <img
              src="/images/cockpit-illustration.png"
              alt="Illustration du Cockpit RAWAGO sur ordinateur : tableau de bord, tâches, notes, objectifs et minuterie de concentration"
              loading="lazy"
            />
            <div className="cockpit-illustration-caption">Planifier · Organiser · Progresser</div>
          </div>
        </div>
      </section>

      <section className="home-cta">
        <div><div className="eyebrow">FAISONS LE PREMIER PAS</div><h2>Un projet, une question,<br /><em>une ambition à faire grandir ?</em></h2></div>
        <Link className="btn light-button" to="/contact">Parlons de votre projet <span>↗</span></Link>
      </section>
    </main>
  );
}

export default Home;

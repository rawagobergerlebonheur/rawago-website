
function Home() {
  return (
    <main>
      <section className="hero" id="home">
        <div className="hero-copy">
          <div className="eyebrow">
            SAVOIR · ACCOMPAGNEMENT · PARTAGE
          </div>

          <h1>
            Le savoir ouvre des chemins.
            <br />
            Avançons ensemble.
          </h1>

          <p>
            Un accompagnement humain et rigoureux pour apprendre,
            progresser, trouver les bonnes ressources et concrétiser
            vos projets.
          </p>

          <div className="actions">
            <a className="btn primary" href="/services">
              Découvrir nos services →
            </a>

            <a className="btn secondary" href="/contact">
              Parlons de votre projet
            </a>
          </div>

          <div className="trust">
            <span>
              À distance dans le monde entier · En présentiel au Sénégal
            </span>
          </div>
        </div>

        <div className="hero-visual">
          <img
            src="https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=1200&q=85"
            alt="Des élèves étudiant ensemble"
          />
          <div className="visual-note">
            <span>
              Apprendre, comprendre,
              <br />
              <b>aller plus loin.</b>
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;

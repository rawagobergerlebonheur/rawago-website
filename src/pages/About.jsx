function About() {
  return (
    <main className="about-page">
      <style>{`
        .about-page {
          --about-ink: #142d32;
          --about-muted: #60747a;
          --about-teal: #16877f;
          --about-teal-dark: #0f625e;
          --about-gold: #c7a36b;
          --about-paper: #f7f6f1;
          --about-line: rgba(20,45,50,.13);
          color: var(--about-ink);
          background: var(--about-paper);
          overflow: hidden;
          isolation: isolate;
        }
        .about-page * { box-sizing: border-box; }
        .about-page .about-hero {
          position: relative;
          padding: clamp(58px, 7vw, 104px) clamp(22px, 6vw, 100px);
          background:
            radial-gradient(circle at 8% 5%, rgba(22,135,127,.07), transparent 28%),
            linear-gradient(135deg, #f0f5f3 0%, #edf3f1 58%, #f6f3eb 100%);
        }
        .about-page .about-hero::before {
          content: "";
          position: absolute;
          width: min(42vw, 540px);
          aspect-ratio: 1;
          border: 1px solid rgba(199,163,107,.3);
          border-radius: 50%;
          right: -210px;
          top: -270px;
          pointer-events: none;
        }
        .about-page .about-hero-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.3fr) minmax(300px, .72fr);
          gap: clamp(34px, 6vw, 92px);
          align-items: center;
          max-width: 1420px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }
        .about-page .about-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 12px;
          color: var(--about-teal);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .24em;
          text-transform: uppercase;
          margin-bottom: 24px;
        }
        .about-page .about-eyebrow::before {
          content: "";
          width: 32px;
          height: 1px;
          background: var(--about-gold);
        }
        .about-page h1, .about-page h2, .about-page h3, .about-page p { margin-top: 0; }
        .about-page .about-hero h1 {
          max-width: 900px;
          margin-bottom: 26px;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(42px, 5.1vw, 76px);
          font-weight: 500;
          line-height: 1.01;
          letter-spacing: -.048em;
          text-wrap: balance;
        }
        .about-page .about-lead {
          max-width: 790px;
          margin: 0;
          color: #526b72;
          font-size: clamp(16px, 1.25vw, 19px);
          line-height: 1.9;
        }
        .about-page .about-stamp {
          position: relative;
          min-height: 440px;
          height: clamp(390px, 39vw, 520px);
          padding: 0;
          border: 1px solid rgba(199,163,107,.5);
          border-radius: 22px;
          background: #15383b;
          box-shadow: 0 28px 70px rgba(17,48,51,.16);
          overflow: hidden;
          isolation: isolate;
        }
        .about-page .about-stamp::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: 1;
          background: linear-gradient(180deg, transparent 55%, rgba(10,31,35,.76) 100%);
          pointer-events: none;
        }
        .about-page .about-stamp-photo {
          position: absolute;
          inset: 0;
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center 18%;
          border-radius: 21px;
        }
        .about-page .about-stamp-caption {
          position: absolute;
          z-index: 2;
          left: 24px;
          right: 24px;
          bottom: 24px;
          display: flex;
          align-items: center;
          gap: 12px;
          width: auto;
          margin: 0;
          padding: 15px 18px;
          color: #fff;
          background: rgba(15,43,46,.62);
          border: 1px solid rgba(255,255,255,.24);
          border-radius: 10px;
          backdrop-filter: blur(12px);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .16em;
          text-transform: uppercase;
        }
        .about-page .about-stamp-caption::before {
          content: "";
          width: 7px;
          height: 7px;
          flex: 0 0 7px;
          border-radius: 50%;
          background: var(--about-gold);
        }
        .about-page .about-body {
          max-width: 1420px;
          margin: 0 auto;
          padding: clamp(30px, 3vw, 44px) clamp(22px, 6vw, 100px) clamp(58px, 7vw, 100px);
        }
        .about-page .about-body-grid {
          display: block;
          width: 100%;
          max-width: 1120px;
          margin: 0 auto;
        }
        .about-page .about-copy {
          display: block;
          width: 100%;
          min-width: 0;
          max-width: 100%;
        }
        .about-page .about-copy p {
          max-width: 100%;
          color: var(--about-muted);
          font-size: 16px;
          line-height: 1.95;
          margin-bottom: 24px;
        }
        .about-page .about-copy h2 {
          margin: 58px 0 20px;
          max-width: 900px;
          font: 500 clamp(29px, 3vw, 43px)/1.12 Georgia, "Times New Roman", serif;
          letter-spacing: -.035em;
          color: var(--about-ink);
          text-wrap: balance;
        }
        .about-page .about-copy h2:first-of-type { margin-top: 54px; }
        .about-page .about-copy ul {
          list-style: none;
          padding: 0;
          margin: 30px 0 34px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0 28px;
          width: 100%;
        }
        .about-page .about-copy li {
          position: relative;
          padding: 17px 8px 17px 30px;
          border-bottom: 1px solid var(--about-line);
          color: #526a72;
          line-height: 1.65;
        }
        .about-page .about-copy li::before {
          content: "";
          position: absolute;
          left: 2px;
          top: 25px;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--about-teal);
          box-shadow: 0 0 0 5px rgba(22,135,127,.09);
        }
        .about-page .about-aside {
          width: 100%;
          max-width: 1120px;
          margin: 54px auto 0;
        }
        .about-page .about-aside-card {
          display: grid;
          grid-template-columns: auto 1fr;
          align-items: center;
          column-gap: 26px;
          width: 100%;
          padding: clamp(24px, 3.5vw, 42px);
          border: 1px solid rgba(22,135,127,.18);
          border-radius: 18px;
          background: linear-gradient(110deg, #eaf2ef, #f4f3ec);
          box-shadow: 0 16px 45px rgba(20,44,49,.045);
        }
        .about-page .about-aside-number {
          display: grid;
          place-items: center;
          width: 72px;
          height: 72px;
          border: 1px solid rgba(199,163,107,.65);
          border-radius: 50%;
          color: #b68f54;
          font: italic 36px Georgia, serif;
        }
        .about-page .about-aside-card strong {
          display: block;
          font: 500 clamp(24px, 2.5vw, 32px)/1.15 Georgia, serif;
          margin-bottom: 8px;
        }
        .about-page .about-aside-card p {
          grid-column: 2;
          margin: 0;
          color: var(--about-muted);
          font-size: 14px;
          line-height: 1.8;
        }
        .about-page .about-values {
          max-width: 1240px;
          margin: clamp(60px, 7vw, 90px) auto 0;
          padding: clamp(30px, 4.5vw, 60px);
          border-radius: 22px;
          background:
            radial-gradient(circle at 100% 0%, rgba(37,111,103,.28), transparent 34%),
            #142f34;
          color: #f6f3ec;
          position: relative;
          overflow: hidden;
        }
        .about-page .about-values::after {
          content: "R.";
          position: absolute;
          right: 20px;
          bottom: -105px;
          color: rgba(255,255,255,.035);
          font: 400 280px Georgia, serif;
          pointer-events: none;
        }
        .about-page .about-values-heading {
          max-width: 700px;
          margin-bottom: 34px;
          position: relative;
          z-index: 1;
        }
        .about-page .about-values-heading .about-eyebrow { color: #75c4b9; }
        .about-page .about-values-heading h2 {
          color: #f7f2e8;
          margin: 0;
          font: 500 clamp(30px, 3.3vw, 46px)/1.1 Georgia, serif;
          letter-spacing: -.03em;
        }
        .about-page .about-values-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          position: relative;
          z-index: 1;
        }
        .about-page .about-value {
          padding: 28px;
          border: 1px solid rgba(255,255,255,.14);
          border-radius: 14px;
          background: rgba(255,255,255,.045);
          min-height: 220px;
          transition: transform .2s ease, background .2s ease, border-color .2s ease;
        }
        .about-page .about-value:hover {
          transform: translateY(-4px);
          background: rgba(255,255,255,.075);
          border-color: rgba(199,163,107,.42);
        }
        .about-page .about-value-index {
          display: block;
          color: var(--about-gold);
          font: italic 23px Georgia, serif;
          margin-bottom: 24px;
        }
        .about-page .about-value h3 {
          color: #f6f0e4;
          font: 500 22px/1.2 Georgia, serif;
          margin-bottom: 13px;
        }
        .about-page .about-value p {
          color: #c1d0cd;
          font-size: 14px;
          line-height: 1.8;
          margin: 0;
        }
        .about-page .about-signoff {
          max-width: 1120px;
          margin: 42px auto 28px;
          padding: 4px 0 4px 22px;
          border-left: 2px solid var(--about-gold);
          color: #526a72;
          font-size: 17px;
          line-height: 1.8;
        }
        .about-page .about-signoff strong { color: var(--about-ink); }
        .about-page .about-contact-link {
          margin-left: max(0px, calc((100% - 1120px) / 2));
          display: inline-flex;
          align-items: center;
          gap: 18px;
          padding: 16px 23px;
          border-radius: 5px;
          color: #fff;
          background: var(--about-teal);
          text-decoration: none;
          font-weight: 700;
          transition: transform .2s ease, background .2s ease, box-shadow .2s ease;
          box-shadow: 0 9px 22px rgba(22,135,127,.15);
        }
        .about-page .about-contact-link:hover {
          transform: translateY(-2px);
          background: var(--about-teal-dark);
          box-shadow: 0 13px 28px rgba(22,135,127,.22);
        }
        @media (max-width: 900px) {
          .about-page .about-hero-grid { grid-template-columns: 1fr; }
          .about-page .about-stamp { min-height: 340px; height: min(82vw, 480px); }
          .about-page .about-values-grid { grid-template-columns: 1fr; }
          .about-page .about-value { min-height: auto; }
          .about-page .about-contact-link { margin-left: 0; }
        }
        @media (max-width: 600px) {
          .about-page .about-hero { padding: 52px 22px; }
          .about-page .about-body { padding: 30px 22px 52px; }
          .about-page .about-copy ul { grid-template-columns: 1fr; }
          .about-page .about-values { padding: 28px 20px; border-radius: 14px; }
          .about-page .about-copy h2 { margin-top: 42px; }
          .about-page .about-aside-card { grid-template-columns: 1fr; gap: 18px; }
          .about-page .about-aside-card p { grid-column: 1; }
          .about-page .about-stamp-caption { left: 14px; right: 14px; bottom: 14px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .about-page .about-value, .about-page .about-contact-link { transition: none; }
        }
      `}</style>

      <section className="about-hero">
        <div className="about-hero-grid">
          <div>
            <div className="about-eyebrow">Notre identité</div>
            <h1>La connaissance au service de l'humain et du progrès.</h1>
            <p className="about-lead">
              À travers ce projet, je vous propose un accompagnement intellectuel,
              éducatif et professionnel, fondé sur une conviction profonde :
              « Le savoir prend toute sa valeur lorsqu'il permet à chacun de
              progresser, de développer son potentiel et de concrétiser ses ambitions. »
            </p>
          </div>

          <div className="about-stamp" aria-label="Portrait professionnel de Berger-Le-Bonheur RAWAGO">
            <img
              className="about-stamp-photo"
              src="/portrait-rawago.jpeg"
              alt="Portrait professionnel de Berger-Le-Bonheur RAWAGO"
            />
            <span className="about-stamp-caption">Berger-Le-Bonheur RAWAGO · Fondateur</span>
          </div>
        </div>
      </section>

      <section className="about-body">
        <div className="about-body-grid">
          <div className="about-copy">
            <p>
              Juriste de formation, titulaire d'un Master en droit public obtenu
              avec la mention Bien, je suis animé par un intérêt particulier pour
              la connaissance, la recherche, la transmission des savoirs, la
              gouvernance et le développement humain. Mon parcours universitaire
              m'a permis d'acquérir des compétences en recherche documentaire,
              analyse, rédaction, synthèse et méthodologie, qui constituent
              aujourd'hui les fondements essentiels de mon approche.
            </p>

            <h2>Un parcours diversifié, une expérience au service de l'accompagnement</h2>
            <p>
              Mon expérience professionnelle m'a conduit à évoluer dans différents
              environnements, notamment dans les domaines administratif, commercial,
              pédagogique et opérationnel.
            </p>

            <h2>Ce que je vous propose</h2>
            <p>
              Dans une approche humaine, rigoureuse et personnalisée, j'accompagne
              les apprenants, les étudiants, les parents et les professionnels
              dans leurs différents besoins :
            </p>

            <ul>
              <li>L'accompagnement scolaire et universitaire ;</li>
              <li>La préparation aux examens et concours ;</li>
              <li>L'acquisition de méthodes de travail et de techniques d'apprentissage ;</li>
              <li>L'initiation à la recherche, la méthodologie universitaire et la recherche documentaire ;</li>
              <li>L'appui à la rédaction, à l'organisation et à la structuration de travaux ;</li>
              <li>L'accompagnement et le soutien dans les projets professionnels.</li>
            </ul>

            <p>
              Mon rôle n'est pas de faire le travail à votre place, mais de vous
              guider, de vous transmettre des méthodes et de vous donner les outils
              nécessaires pour progresser et gagner en autonomie.
            </p>

            <h2>Une vision, des valeurs et un engagement</h2>
            <p>
              Au-delà de mes formations et de mes expériences, RAWAGO porte une
              ambition plus large : faire de la connaissance un levier d'émancipation,
              d'épanouissement et de progrès individuel et collectif.
            </p>
            <p>
              Mon engagement repose sur des valeurs essentielles : la rigueur,
              l'intégrité, l'écoute, la disponibilité, le respect et le partage
              des connaissances.
            </p>
            <p>
              Je souhaite ainsi contribuer, à mon échelle, à une société dans
              laquelle chacun peut accéder au savoir, développer ses compétences
              et disposer d'un accompagnement de qualité pour construire son avenir.
            </p>
          </div>

          <aside className="about-aside">
            <div className="about-aside-card">
              <span className="about-aside-number">R.</span>
              <strong>Apprendre, comprendre, progresser.</strong>
              <p>
                Une démarche d'accompagnement qui place la méthode, l'autonomie
                et la transmission au cœur de chaque parcours.
              </p>
            </div>
          </aside>
        </div>

        <section className="about-values">
          <div className="about-values-heading">
            <div className="about-eyebrow">Notre engagement</div>
            <h2>Une vision fondée sur trois dimensions</h2>
          </div>

          <div className="about-values-grid">
            <article className="about-value">
              <span className="about-value-index">01</span>
              <h3>Une dimension institutionnelle</h3>
              <p>
                Une démarche professionnelle, rigoureuse et crédible, fondée
                sur la qualité des services et le respect des engagements.
              </p>
            </article>
            <article className="about-value">
              <span className="about-value-index">02</span>
              <h3>Une dimension éducative et intellectuelle</h3>
              <p>
                La valorisation du savoir, de la réflexion, de la recherche
                et de la transmission des connaissances.
              </p>
            </article>
            <article className="about-value">
              <span className="about-value-index">03</span>
              <h3>Une dimension collaborative</h3>
              <p>
                Un espace de partage, d'échange et d'apprentissage collectif
                où les expériences de chacun enrichissent la communauté.
              </p>
            </article>
          </div>
        </section>

        <p className="about-signoff">
          <strong>
            Berger-Le-Bonheur RAWAGO — Le savoir, l'accompagnement et l'engagement
            au service de votre progression.
          </strong>
        </p>

        <a className="about-contact-link" href="/contact">
          Entrer en contact <span aria-hidden="true">↗</span>
        </a>
      </section>
    </main>
  );
}

export default About;

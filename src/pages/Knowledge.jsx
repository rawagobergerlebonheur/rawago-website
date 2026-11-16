
function Knowledge() {
  const articles = [
    {
      category: "ÉDUCATION",
      number: "01",
      title: "Le savoir comme outil d'émancipation",
      description:
        "Comprendre comment l'éducation et la transmission des connaissances contribuent au développement personnel et collectif."
    },
    {
      category: "MÉTHODOLOGIE",
      number: "02",
      title: "Apprendre à construire une réflexion",
      description:
        "Découvrir les principes essentiels pour organiser ses idées, développer une argumentation et construire un raisonnement."
    },
    {
      category: "CULTURE GÉNÉRALE",
      number: "03",
      title: "Comprendre le monde qui nous entoure",
      description:
        "Explorer les grands sujets historiques, sociaux, culturels et intellectuels qui façonnent nos sociétés."
    },
    {
      category: "RECHERCHE",
      number: "04",
      title: "La rigueur dans le travail intellectuel",
      description:
        "Réfléchir à l'importance des sources fiables, de la méthode et de l'esprit critique dans la recherche."
    }
  ];

  return (
    <main className="section">
      <div className="section-head">
        <div className="eyebrow">
          CONNAISSANCE · RÉFLEXION · CULTURE
        </div>

        <h1>Savoirs et réflexions</h1>

        <p>
          Un espace de découverte, d'analyse et de partage
          autour des idées, des connaissances et des grands
          enjeux de notre époque.
        </p>
      </div>

      <div className="cards">
        {articles.map((article) => (
          <article className="card" key={article.number}>
            <div className="eyebrow">
              {article.category}
            </div>

            <h2>{article.title}</h2>

            <p>{article.description}</p>

            <span className="form-note">
              Publication à venir
            </span>
          </article>
        ))}
      </div>

      <section className="about-copy">
        <h2>La connaissance se partage</h2>

        <p>
          Cet espace accueillera progressivement des articles,
          des analyses, des réflexions et des contributions
          destinés à stimuler la curiosité, le débat constructif
          et l'esprit critique.
        </p>

        <p>
          Notre ambition est de faire du savoir un outil
          de compréhension, de dialogue et de progrès.
        </p>
      </section>
    </main>
  );
}

export default Knowledge;

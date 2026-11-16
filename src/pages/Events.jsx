
function Events() {
  const activities = [
    {
      number: "01",
      category: "ATELIERS",
      title: "Ateliers de méthodologie",
      description:
        "Des séances consacrées à la dissertation, à la recherche documentaire, à l'organisation des idées et aux techniques de travail."
    },
    {
      number: "02",
      category: "RENCONTRES",
      title: "Rencontres intellectuelles",
      description:
        "Des moments d'échange autour de sujets éducatifs, culturels, historiques et sociaux."
    },
    {
      number: "03",
      category: "CONFÉRENCES",
      title: "Conférences et débats",
      description:
        "Des espaces de réflexion et de discussion pour découvrir différentes perspectives et enrichir les connaissances."
    },
    {
      number: "04",
      category: "FORMATIONS",
      title: "Séances de formation",
      description:
        "Des activités destinées à renforcer les compétences personnelles, académiques et professionnelles."
    }
  ];

  return (
    <main className="section">
      <div className="section-head">
        <div className="eyebrow">
          RENCONTRES · APPRENTISSAGE · PARTAGE
        </div>

        <h1>Agenda et événements</h1>

        <p>
          Retrouvez les activités, les rencontres et les
          initiatives qui favorisent la transmission du savoir
          et le développement des compétences.
        </p>
      </div>

      <div className="cards">
        {activities.map((activity) => (
          <article className="card" key={activity.number}>
            <div className="eyebrow">
              {activity.category}
            </div>

            <h2>{activity.title}</h2>

            <p>{activity.description}</p>

            <span className="form-note">
              Programme à venir
            </span>
          </article>
        ))}
      </div>

      <section className="about-copy">
        <h2>Participer aux prochaines activités</h2>

        <p>
          Les dates, les modalités de participation et les
          informations pratiques seront communiquées au fur
          et à mesure de la programmation.
        </p>

        <a className="btn primary" href="/contact">
          Nous contacter →
        </a>
      </section>
    </main>
  );
}

export default Events;

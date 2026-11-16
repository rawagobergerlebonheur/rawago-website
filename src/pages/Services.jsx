
function Services() {
  const services = [
    {
      number: "01",
      title: "Accompagnement scolaire et universitaire",
      description:
        "Un accompagnement personnalisé pour renforcer les connaissances, développer les capacités de réflexion et progresser dans son parcours scolaire ou universitaire.",
    },
    {
      number: "02",
      title: "Préparation aux concours",
      description:
        "Une préparation structurée aux épreuves écrites et orales, avec un travail sur les connaissances, la méthode et la gestion du temps.",
    },
    {
      number: "03",
      title: "Méthodologie et recherche",
      description:
        "Un appui pour organiser ses idées, construire une réflexion, maîtriser la dissertation et avancer dans ses travaux de recherche.",
    },
    {
      number: "04",
      title: "Recherche documentaire",
      description:
        "Une recherche ciblée de livres, articles scientifiques, documents historiques et ressources fiables.",
    },
    {
      number: "05",
      title: "Accompagnement professionnel",
      description:
        "Un soutien méthodologique pour structurer ses projets, améliorer son expression écrite et orale et identifier les ressources utiles.",
    },
  ];

  return (
    <main className="services section">
      <div className="section-head">
        <div className="eyebrow">NOS DOMAINES D'EXPERTISE</div>
        <h1>Des services adaptés à vos ambitions</h1>
        <p>
          Des solutions personnalisées fondées sur la connaissance,
          la méthode et l'accompagnement humain.
        </p>
      </div>

      <div className="cards">
        {services.map((service) => (
          <article className="card" key={service.number}>
            <div className="eyebrow">{service.number}</div>
            <h2>{service.title}</h2>
            <p>{service.description}</p>
            <a href="/contact">
              Présenter mon besoin →
            </a>
          </article>
        ))}
      </div>
    </main>
  );
}

export default Services;

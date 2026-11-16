
function Community() {
  const spaces = [
    {
      number: "01",
      title: "Échanges et discussions",
      description:
        "Un espace pour partager des idées, poser des questions et échanger autour de sujets éducatifs, culturels et intellectuels."
    },
    {
      number: "02",
      title: "Partage d'expériences",
      description:
        "Des témoignages et expériences pour apprendre les uns des autres et enrichir les parcours de chacun."
    },
    {
      number: "03",
      title: "Entraide et collaboration",
      description:
        "Un cadre pour encourager l'entraide, les initiatives collectives et la coopération entre les membres."
    },
    {
      number: "04",
      title: "Vie de la communauté",
      description:
        "Des actualités, des annonces et des informations sur les activités et les projets de la communauté."
    }
  ];

  return (
    <main className="section">
      <div className="section-head">
        <div className="eyebrow">
          ÉCHANGE · PARTAGE · COLLABORATION
        </div>

        <h1>Une communauté qui avance ensemble</h1>

        <p>
          Un espace de rencontre et de partage où les
          connaissances, les expériences et les idées
          contribuent à une intelligence collective.
        </p>
      </div>

      <div className="cards">
        {spaces.map((space) => (
          <article className="card" key={space.number}>
            <div className="eyebrow">{space.number}</div>

            <h2>{space.title}</h2>

            <p>{space.description}</p>
          </article>
        ))}
      </div>

      <section className="about-copy">
        <h2>Construisons un espace de dialogue</h2>

        <p>
          La communauté a vocation à accueillir des échanges
          respectueux, des contributions et des initiatives
          qui favorisent l'apprentissage et le partage.
        </p>

        <p>
          Les membres pourront progressivement participer
          aux discussions, commenter les publications et
          partager leurs expériences.
        </p>

        <a className="btn primary" href="/espace-client">
          Accéder à mon espace →
        </a>
      </section>
    </main>
  );
}

export default Community;

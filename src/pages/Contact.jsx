
import { useState } from "react";

function Contact() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    country: "",
    service: "",
    message: ""
  });

  const [sent, setSent] = useState(false);

  function update(field, value) {
    setForm(previous => ({
      ...previous,
      [field]: value
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const subject = encodeURIComponent(
      "Nouvelle demande de contact - RAWAGO"
    );

    const body = encodeURIComponent(
      `Nom : ${form.name}\n` +
      `E-mail : ${form.email}\n` +
      `Pays : ${form.country}\n` +
      `Service : ${form.service}\n\n` +
      `Message :\n${form.message}`
    );

    window.location.href =
      `mailto:rawagobergerlebonheur@gmail.com?subject=${subject}&body=${body}`;

    setSent(true);
  }

  return (
    <main className="contact section">
      <div className="contact-intro">
        <div className="eyebrow">
          UN PREMIER ÉCHANGE
        </div>

        <h1>Parlons de votre projet</h1>

        <p>
          Vous avez un besoin éducatif, documentaire ou
          professionnel ? Présentez-nous votre projet.
          Nous étudierons votre demande avec attention.
        </p>

        <div className="contact-line">
          <span>
            Réponse personnalisée · Devis selon la nature
            et la complexité de votre demande
          </span>
        </div>

        <h3>Nos modalités d'accompagnement</h3>

        <p>
          À distance dans le monde entier.
          En présentiel au Sénégal.
        </p>

        <h3>Adresse e-mail</h3>

        <p>
          rawagobergerlebonheur@gmail.com
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <label>
          Votre nom complet
          <input
            type="text"
            required
            value={form.name}
            onChange={event => update("name", event.target.value)}
          />
        </label>

        <label>
          Votre adresse e-mail
          <input
            type="email"
            required
            value={form.email}
            onChange={event => update("email", event.target.value)}
          />
        </label>

        <label>
          Votre pays
          <input
            type="text"
            value={form.country}
            onChange={event => update("country", event.target.value)}
          />
        </label>

        <label>
          Service souhaité
          <select
            required
            value={form.service}
            onChange={event => update("service", event.target.value)}
          >
            <option value="">Choisir un service</option>
            <option>Accompagnement scolaire et universitaire</option>
            <option>Préparation aux concours</option>
            <option>Méthodologie et recherche</option>
            <option>Recherche documentaire</option>
            <option>Accompagnement professionnel</option>
            <option>Autre demande</option>
          </select>
        </label>

        <label>
          Décrivez votre besoin
          <textarea
            rows="6"
            required
            value={form.message}
            onChange={event => update("message", event.target.value)}
            placeholder="Présentez votre projet et vos attentes..."
          />
        </label>

        <p className="form-note">
          Votre demande sera étudiée avant toute proposition
          d'accompagnement ou de devis.
        </p>

        <button className="btn primary" type="submit">
          Envoyer ma demande →
        </button>

        {sent && (
          <p className="form-message">
            Votre application de messagerie devrait s'ouvrir
            pour vous permettre d'envoyer votre demande.
          </p>
        )}
      </form>
    </main>
  );
}

export default Contact;

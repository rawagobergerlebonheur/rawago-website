
import { useState } from "react";
import { supabase } from "../supabase";

const INITIAL_FORM = {
  name: "",
  email: "",
  country: "",
  service: "",
  message: ""
};

export default function Contact() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [submitError, setSubmitError] = useState("");

  function update(field, value) {
    setForm(current => ({
      ...current,
      [field]: value
    }));
    setSent(false);
    setSubmitError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSending(true);
    setSent(false);
    setSubmitError("");

    try {
      const { error } = await supabase
        .from("contact_requests")
        .insert({
          name: form.name.trim(),
          email: form.email.trim(),
          country: form.country.trim() || null,
          service: form.service,
          message: form.message.trim()
        });

      if (error) throw error;

      setSent(true);
      setForm({ ...INITIAL_FORM });

    } catch (error) {
      console.error("Erreur formulaire RAWAGO :", error);
      setSubmitError(
        error.message || "Une erreur est survenue. Veuillez réessayer."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="rawago-contact">
      <style>{`
        .rawago-contact {
          --rc-ink: #173239;
          --rc-muted: #687a7d;
          --rc-green: #075b4b;
          --rc-teal: #159b91;
          width: 100%;
          padding: 54px clamp(18px, 5vw, 76px) 76px;
          background: #fbfaf7;
          color: var(--rc-ink);
          overflow: hidden;
          isolation: isolate;
        }

        .rawago-contact, .rawago-contact * {
          box-sizing: border-box;
        }

        .rawago-contact__inner {
          width: 100%;
          max-width: 1320px;
          margin: 0 auto;
        }

        .rawago-contact__grid {
          display: grid;
          grid-template-columns: minmax(0, .95fr) minmax(0, 1.05fr);
          align-items: start;
          gap: clamp(24px, 4vw, 58px);
          width: 100%;
        }

        .rawago-contact__intro,
        .rawago-contact__form-card {
          min-width: 0;
        }

        .rawago-contact__eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          margin: 0 0 18px;
          padding: 8px 14px;
          border-radius: 30px;
          background: #e1f0e9;
          color: #176b5d;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .15em;
          text-transform: uppercase;
        }

        .rawago-contact__title {
          display: block;
          width: 100%;
          max-width: 650px;
          margin: 0 0 18px;
          padding: 0;
          color: var(--rc-ink);
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(40px, 4.7vw, 66px);
          font-weight: 500;
          line-height: 1.06;
          letter-spacing: -.04em;
        }

        .rawago-contact__lead {
          max-width: 610px;
          margin: 0 0 24px;
          color: var(--rc-muted);
          font-size: 16px;
          line-height: 1.8;
        }

        .rawago-contact__image {
          display: block;
          width: 100%;
          height: clamp(220px, 25vw, 330px);
          margin: 24px 0 25px;
          padding: 0;
          overflow: hidden;
          border-radius: 18px 64px 18px 18px;
          background: #e9e4d8;
          box-shadow: 0 14px 34px rgba(25,48,43,.10);
        }

        .rawago-contact__image img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }

        .rawago-contact__benefits {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          padding: 22px;
          border: 1px solid #e8e9df;
          border-radius: 17px;
          background: #f1f4ed;
        }

        .rawago-contact__benefit {
          min-width: 0;
        }

        .rawago-contact__benefit + .rawago-contact__benefit {
          border-left: 1px solid #d8e0d9;
          padding-left: 14px;
        }

        .rawago-contact__benefit-icon {
          display: grid;
          place-items: center;
          width: 36px;
          height: 36px;
          margin-bottom: 10px;
          border-radius: 11px;
          background: #dceee6;
          color: var(--rc-green);
          font-size: 17px;
        }

        .rawago-contact__benefit strong {
          display: block;
          margin: 0 0 5px;
          font-size: 13px;
          line-height: 1.4;
        }

        .rawago-contact__benefit span {
          display: block;
          color: var(--rc-muted);
          font-size: 11px;
          line-height: 1.55;
        }

        .rawago-contact__form-card {
          width: 100%;
          padding: clamp(22px, 3vw, 40px);
          border: 1px solid #e7e9e5;
          border-radius: 20px;
          background: #fff;
          box-shadow: 0 18px 48px rgba(27,48,43,.07);
        }

        .rawago-contact__form-heading {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin: 0 0 26px;
        }

        .rawago-contact__mail-icon {
          display: grid;
          flex: 0 0 46px;
          place-items: center;
          width: 46px;
          height: 46px;
          border-radius: 13px;
          background: var(--rc-green);
          color: #fff;
          font-size: 21px;
        }

        .rawago-contact__form-heading h2 {
          margin: 0 0 7px;
          color: var(--rc-ink);
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(24px, 2.2vw, 31px);
          font-weight: 500;
          line-height: 1.2;
        }

        .rawago-contact__form-heading p {
          margin: 0;
          color: var(--rc-muted);
          font-size: 13px;
          line-height: 1.6;
        }

        .rawago-contact__form {
          display: block;
          width: 100%;
          margin: 0;
        }

        .rawago-contact__fields {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px 15px;
          width: 100%;
        }

        .rawago-contact__field {
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 8px;
          min-width: 0;
          width: 100%;
          margin: 0;
          color: #294249;
          font-size: 12px;
          font-weight: 700;
        }

        .rawago-contact__field--full {
          grid-column: 1 / -1;
        }

        .rawago-contact__field input,
        .rawago-contact__field select,
        .rawago-contact__field textarea {
          display: block;
          width: 100%;
          max-width: 100%;
          min-width: 0;
          margin: 0;
          padding: 13px 14px;
          border: 1px solid #d8e0dd;
          border-radius: 10px;
          background: #fff;
          color: #203a40;
          font-family: inherit;
          font-size: 14px;
          font-weight: 400;
          line-height: 1.5;
          outline: none;
          box-shadow: none;
          transition: border-color .2s, box-shadow .2s;
        }

        .rawago-contact__field input,
        .rawago-contact__field select {
          min-height: 48px;
        }

        .rawago-contact__field textarea {
          min-height: 140px;
          resize: vertical;
        }

        .rawago-contact__field input:focus,
        .rawago-contact__field select:focus,
        .rawago-contact__field textarea:focus {
          border-color: var(--rc-teal);
          box-shadow: 0 0 0 3px rgba(21,155,145,.12);
        }

        .rawago-contact__field input::placeholder,
        .rawago-contact__field textarea::placeholder {
          color: #9aa7a8;
        }

        .rawago-contact__note {
          display: flex;
          align-items: flex-start;
          gap: 9px;
          margin: 19px 0;
          color: #718083;
          font-size: 11px;
          line-height: 1.65;
        }

        .rawago-contact__submit {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          min-height: 52px;
          padding: 14px 18px;
          border: 0;
          border-radius: 10px;
          background: var(--rc-green);
          color: #fff;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: background .2s, transform .2s;
        }

        .rawago-contact__submit:hover {
          background: #08725d;
          transform: translateY(-1px);
        }

        .rawago-contact__submit:disabled {
          opacity: .65;
          cursor: wait;
          transform: none;
        }

        .rawago-contact__success,
        .rawago-contact__error {
          margin: 15px 0 0;
          padding: 12px 14px;
          border-radius: 9px;
          font-size: 12px;
          line-height: 1.6;
        }

        .rawago-contact__success {
          background: #e9f5ed;
          color: #27654b;
        }

        .rawago-contact__error {
          background: #fff0ed;
          color: #a33c2e;
        }

        @media (max-width: 900px) {
          .rawago-contact__grid {
            grid-template-columns: minmax(0, 1fr);
          }

          .rawago-contact__image {
            height: 300px;
          }
        }

        @media (max-width: 560px) {
          .rawago-contact {
            padding: 36px 16px 56px;
          }

          .rawago-contact__title {
            font-size: clamp(39px, 11vw, 54px);
          }

          .rawago-contact__fields {
            grid-template-columns: minmax(0, 1fr);
          }

          .rawago-contact__field--full {
            grid-column: auto;
          }

          .rawago-contact__form-card {
            padding: 21px 16px;
          }

          .rawago-contact__benefits {
            grid-template-columns: minmax(0, 1fr);
          }

          .rawago-contact__benefit + .rawago-contact__benefit {
            border-left: 0;
            border-top: 1px solid #d8e0d9;
            padding: 14px 0 0;
          }
        }
      `}</style>

      <div className="rawago-contact__inner">
        <div className="rawago-contact__grid">

          <section className="rawago-contact__intro">
            <div className="rawago-contact__eyebrow">
              Contact · Un premier échange
            </div>

            <h1 className="rawago-contact__title">
              Parlons de votre projet.
            </h1>

            <p className="rawago-contact__lead">
              Vous avez un besoin éducatif, documentaire ou professionnel ?
              Présentez-nous votre projet. Nous prendrons le temps de comprendre
              vos attentes et de vous proposer une réponse adaptée.
            </p>

            <figure className="rawago-contact__image">
              <img
                src="/contact-illustration.jpg"
                alt="Illustration de l'univers de travail et de recherche RAWAGO"
                loading="lazy"
              />
            </figure>

            <div className="rawago-contact__benefits">
              <div className="rawago-contact__benefit">
                <div className="rawago-contact__benefit-icon" aria-hidden="true">
                  ↗
                </div>
                <strong>À distance</strong>
                <span>
                  Un accompagnement accessible depuis le monde entier.
                </span>
              </div>

              <div className="rawago-contact__benefit">
                <div className="rawago-contact__benefit-icon" aria-hidden="true">
                  ⌖
                </div>
                <strong>En présentiel</strong>
                <span>
                  Des échanges et un accompagnement au Sénégal.
                </span>
              </div>

              <div className="rawago-contact__benefit">
                <div className="rawago-contact__benefit-icon" aria-hidden="true">
                  ✓
                </div>
                <strong>Une réponse sur mesure</strong>
                <span>
                  Une proposition adaptée à vos objectifs et à votre demande.
                </span>
              </div>
            </div>
          </section>

          <section className="rawago-contact__form-card">
            <div className="rawago-contact__form-heading">
              <div className="rawago-contact__mail-icon" aria-hidden="true">
                ✉
              </div>
              <div>
                <h2>Nous contacter</h2>
                <p>
                  Remplissez le formulaire et nous reviendrons vers vous
                  dans les meilleurs délais.
                </p>
              </div>
            </div>

            <form
              className="rawago-contact__form"
              onSubmit={handleSubmit}
            >
              <div className="rawago-contact__fields">

                <label className="rawago-contact__field">
                  Votre nom complet *
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    maxLength={160}
                    value={form.name}
                    onChange={event => update("name", event.target.value)}
                    placeholder="Ex. : Marie Diop"
                  />
                </label>

                <label className="rawago-contact__field">
                  Votre adresse e-mail *
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    maxLength={200}
                    value={form.email}
                    onChange={event => update("email", event.target.value)}
                    placeholder="vous@exemple.com"
                  />
                </label>

                <label className="rawago-contact__field">
                  Votre pays
                  <input
                    type="text"
                    autoComplete="country-name"
                    maxLength={100}
                    value={form.country}
                    onChange={event => update("country", event.target.value)}
                    placeholder="Votre pays de résidence"
                  />
                </label>

                <label className="rawago-contact__field">
                  Service souhaité *
                  <select
                    required
                    value={form.service}
                    onChange={event => update("service", event.target.value)}
                  >
                    <option value="">Choisir un service</option>
                    <option value="Accompagnement scolaire et universitaire">
                      Accompagnement scolaire et universitaire
                    </option>
                    <option value="Préparation aux concours">
                      Préparation aux concours
                    </option>
                    <option value="Méthodologie et recherche">
                      Méthodologie et recherche
                    </option>
                    <option value="Recherche documentaire">
                      Recherche documentaire
                    </option>
                    <option value="Accompagnement professionnel">
                      Accompagnement professionnel
                    </option>
                    <option value="Accompagnement éducatif">
                      Accompagnement éducatif
                    </option>
                    <option value="Appui professionnel">
                      Appui professionnel
                    </option>
                  </select>
                </label>

                <label className="rawago-contact__field rawago-contact__field--full">
                  Décrivez votre projet *
                  <textarea
                    rows={6}
                    required
                    maxLength={5000}
                    value={form.message}
                    onChange={event => update("message", event.target.value)}
                    placeholder="Présentez votre projet, vos objectifs et vos attentes..."
                  />
                </label>

              </div>

              <p className="rawago-contact__note">
                <span aria-hidden="true">ⓘ</span>
                <span>
                  Vos informations sont utilisées uniquement pour répondre
                  à votre demande. Aucun devis ni engagement n’est établi
                  sans échange préalable.
                </span>
              </p>

              <button
                className="rawago-contact__submit"
                type="submit"
                disabled={sending}
              >
                {sending ? "Envoi en cours..." : "Envoyer ma demande"}
                {!sending && <span aria-hidden="true">↗</span>}
              </button>

              {sent && (
                <p className="rawago-contact__success" role="status">
                  Votre demande a bien été enregistrée.
                  Nous reviendrons vers vous dans les meilleurs délais.
                </p>
              )}

              {submitError && (
                <p className="rawago-contact__error" role="alert">
                  Votre demande n'a pas pu être enregistrée : {submitError}
                </p>
              )}
            </form>
          </section>

        </div>
      </div>
    </main>
  );
}

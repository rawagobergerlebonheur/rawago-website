
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabase";

// =====================================================
// FORMATAGE DES DONNEES
// =====================================================

function formatAuthors(authors) {
  if (Array.isArray(authors)) {
    return authors
      .filter(Boolean)
      .map(author => String(author))
      .join(", ");
  }

  if (typeof authors === "string") {
    const value = authors.trim();

    if (!value) return "Non renseigné";

    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed
          .filter(Boolean)
          .map(author => String(author))
          .join(", ") || "Non renseigné";
      }
    } catch {
      // Texte simple : on le conserve tel quel.
    }

    return value;
  }

  return "Non renseigné";
}

function formatDate(value) {
  if (!value) return "Date non disponible";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date non disponible";
  }

  return date.toLocaleString("fr-FR");
}

function formatPaymentMethod(method) {
  const methods = {
    wave: "Wave",
    orange_money: "Orange Money",
    card: "Carte bancaire",
    bank_transfer: "Virement bancaire",
    paypal: "PayPal",
    tap_tap_send: "TapTap Send",
    other: "Autre",
  };

  return methods[method] || method || "Non renseigné";
}

function formatAmount(amount, currency) {
  if (amount === null || amount === undefined || amount === "") {
    return "Non défini";
  }

  const number = Number(amount);

  if (!Number.isFinite(number)) return String(amount);

  return `${number.toLocaleString("fr-FR")} ${currency || ""}`.trim();
}

// =====================================================
// ADMINISTRATION DES COMMANDES DE LIVRES
// =====================================================

function BookOrdersAdmin() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [quotes, setQuotes] = useState({});
  const [notes, setNotes] = useState({});

  // ===================================================
  // CHARGEMENT DES COMMANDES ET VERIFICATION ADMIN
  // ===================================================

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        const user = sessionData?.session?.user;

        if (!user) {
          if (active) {
            setError(
              "Veuillez vous connecter avec un compte administrateur."
            );
            setLoading(false);
          }
          return;
        }

        const { data: profile, error: profileError } =
          await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError || profile?.role !== "admin") {
          if (active) {
            setError("Accès réservé aux administrateurs.");
            setLoading(false);
          }
          return;
        }

        if (!active) return;

        setAuthorized(true);

        const { data, error: loadError } =
          await supabase
            .from("book_orders")
            .select("*")
            .order("created_at", { ascending: false });

        if (!active) return;

        if (loadError) {
          throw loadError;
        }

        const loadedOrders = data || [];

        setOrders(loadedOrders);

        setQuotes(
          Object.fromEntries(
            loadedOrders.map(order => [
              order.id,
              order.quoted_price ?? "",
            ])
          )
        );

        setNotes(
          Object.fromEntries(
            loadedOrders.map(order => [
              order.id,
              order.admin_note ?? "",
            ])
          )
        );

      } catch (err) {
        console.error("Chargement des commandes :", err);

        if (active) {
          setError(
            "Impossible de charger les commandes : " +
            (err.message || "Erreur inconnue.")
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  // ===================================================
  // ENREGISTRER LE PRIX FINAL
  // ===================================================

  async function saveQuote(order) {
    const amount = Number(quotes[order.id]);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Saisissez un prix final supérieur à zéro.");
      return;
    }

    setSavingId(order.id);
    setError("");

    try {
      const { data, error: updateError } =
        await supabase
          .from("book_orders")
          .update({
            quoted_price: amount,
            quoted_currency: "XOF",
            status: "quote_sent",
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id)
          .select("*")
          .single();

      if (updateError) throw updateError;

      setOrders(previous =>
        previous.map(item =>
          item.id === order.id ? data : item
        )
      );

    } catch (err) {
      console.error("Enregistrement du tarif :", err);

      setError(
        "Impossible d'enregistrer le tarif : " +
        err.message
      );
    } finally {
      setSavingId(null);
    }
  }

  // ===================================================
  // ENREGISTRER UN MESSAGE POUR LE CLIENT
  // ===================================================

  async function saveNote(order) {
    setSavingId(order.id);
    setError("");

    try {
      const { data, error: updateError } =
        await supabase
          .from("book_orders")
          .update({
            admin_note:
              (notes[order.id] || "").trim() || null,
          })
          .eq("id", order.id)
          .select("*")
          .single();

      if (updateError) throw updateError;

      setOrders(previous =>
        previous.map(item =>
          item.id === order.id ? data : item
        )
      );

    } catch (err) {
      console.error("Enregistrement du message :", err);

      setError(
        "Impossible d'enregistrer le message : " +
        err.message
      );
    } finally {
      setSavingId(null);
    }
  }

  // ===================================================
  // MODIFIER LE STATUT D'UNE COMMANDE
  // ===================================================

  async function updateStatus(order, status) {
    setSavingId(order.id);
    setError("");

    try {
      const { data, error: updateError } =
        await supabase
          .from("book_orders")
          .update({
            status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id)
          .select("*")
          .single();

      if (updateError) throw updateError;

      setOrders(previous =>
        previous.map(item =>
          item.id === order.id ? data : item
        )
      );

    } catch (err) {
      console.error("Modification du statut :", err);

      setError(
        "Impossible de modifier le statut : " +
        err.message
      );
    } finally {
      setSavingId(null);
    }
  }

  // ===================================================
  // ETATS DE CHARGEMENT ET AUTORISATION
  // ===================================================

  if (loading) {
    return (
      <main className="section">
        <p>Chargement des commandes...</p>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="section">
        <h1>Commandes de la bibliothèque</h1>

        <p role="alert" style={{ color: "#b42318" }}>
          {error}
        </p>

        <Link to="/administration">
          Retour à l'administration
        </Link>
      </main>
    );
  }

  // ===================================================
  // AFFICHAGE PRINCIPAL
  // ===================================================

  return (
    <main className="section">

      <div className="eyebrow">
        ADMINISTRATION · BIBLIOTHÈQUE
      </div>

      <h1>Demandes de commande de livres</h1>

      <p>
        Vérifiez la disponibilité des ouvrages, communiquez
        le tarif définitif et convenez des modalités de
        règlement avec chaque client avant toute livraison.
      </p>

      {error && (
        <p
          role="alert"
          style={{
            color: "#b42318",
            background: "#fff1f0",
            padding: "12px",
            borderRadius: "8px",
          }}
        >
          {error}
        </p>
      )}

      {orders.length === 0 ? (

        <div className="card" style={{ padding: "25px" }}>
          <h2>Aucune demande pour le moment</h2>
          <p>
            Les nouvelles demandes de livres apparaîtront ici.
          </p>
        </div>

      ) : (

        <div style={{ display: "grid", gap: "18px" }}>

          {orders.map(order => (

            <article
              className="card"
              key={order.id}
              style={{
                padding: "20px",
                borderRadius: "12px",
              }}
            >

              {/* LIVRE ET STATUT */}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <h2 style={{ marginTop: 0 }}>
                  {order.book_title || "Titre non renseigné"}
                </h2>

                <strong>
                  {order.status || "Statut non défini"}
                </strong>
              </div>

              {/* INFORMATIONS DU LIVRE */}

              <div style={{ marginBottom: "18px" }}>

                <p>
                  <strong>Auteur(s) :</strong>{" "}
                  {formatAuthors(order.book_authors)}
                </p>

                <p>
                  <strong>Format :</strong>{" "}
                  {order.book_format || "Non renseigné"}
                </p>

                {order.book_isbn && (
                  <p>
                    <strong>ISBN :</strong>{" "}
                    {order.book_isbn}
                  </p>
                )}

                {order.book_publisher && (
                  <p>
                    <strong>Éditeur :</strong>{" "}
                    {order.book_publisher}
                  </p>
                )}

                {order.book_category && (
                  <p>
                    <strong>Catégorie :</strong>{" "}
                    {order.book_category}
                  </p>
                )}

              </div>

              <hr />

              {/* INFORMATIONS DU CLIENT */}

              <h3>Coordonnées du client</h3>

              <p>
                <strong>Nom :</strong>{" "}
                {order.customer_name || "Non renseigné"}
              </p>

              <p>
                <strong>E-mail :</strong>{" "}
                {order.customer_email || "Non renseigné"}
              </p>

              <p>
                <strong>Téléphone / WhatsApp :</strong>{" "}
                {order.customer_phone || "Non renseigné"}
              </p>

              <p>
                <strong>Pays :</strong>{" "}
                {order.customer_country || "Non renseigné"}
              </p>

              <p>
                <strong>Moyen de paiement souhaité :</strong>{" "}
                {formatPaymentMethod(
                  order.preferred_payment_method
                )}
              </p>

              {order.customer_note && (
                <p>
                  <strong>Précisions :</strong>{" "}
                  {order.customer_note}
                </p>
              )}

              <p>
                <small>
                  Demande reçue le {formatDate(order.created_at)}
                  {" · "}
                  Référence{" "}
                  {String(order.id).slice(0, 8).toUpperCase()}
                </small>
              </p>

              <hr />

              {/* PRIX ET STATUT */}

              <h3>Gestion de la demande</h3>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  flexWrap: "wrap",
                  alignItems: "end",
                }}
              >

                <label style={{ flex: "1 1 180px" }}>
                  Prix final (FCFA)

                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={quotes[order.id] ?? ""}
                    onChange={event =>
                      setQuotes(previous => ({
                        ...previous,
                        [order.id]: event.target.value,
                      }))
                    }
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: "7px",
                    }}
                  />
                </label>

                <button
                  className="btn primary"
                  type="button"
                  disabled={savingId === order.id}
                  onClick={() => saveQuote(order)}
                >
                  {savingId === order.id
                    ? "Enregistrement..."
                    : "Enregistrer le tarif"}
                </button>

                <label style={{ flex: "1 1 180px" }}>
                  Statut

                  <select
                    value={order.status || "pending_quote"}
                    disabled={savingId === order.id}
                    onChange={event =>
                      updateStatus(order, event.target.value)
                    }
                    style={{
                      display: "block",
                      width: "100%",
                      marginTop: "7px",
                    }}
                  >
                    <option value="request_received">
                      Nouvelle demande
                    </option>

                    <option value="pending_quote">
                      À traiter
                    </option>

                    <option value="quote_sent">
                      Tarif communiqué
                    </option>

                    <option value="pending_payment">
                      En attente de paiement
                    </option>

                    <option value="paid">
                      Paiement confirmé
                    </option>

                    <option value="cancelled">
                      Annulée
                    </option>

                    <option value="unavailable">
                      Ouvrage indisponible
                    </option>

                    <option value="fulfilled">
                      Document livré
                    </option>
                  </select>
                </label>

              </div>

              {order.quoted_price !== null &&
                order.quoted_price !== undefined && (
                  <p>
                    <strong>Tarif enregistré :</strong>{" "}
                    {formatAmount(
                      order.quoted_price,
                      order.quoted_currency
                    )}
                  </p>
                )}

              <hr />

              {/* MESSAGE CLIENT */}

              <h3>Message destiné au client</h3>

              <p>
                Ce message sera enregistré dans le suivi de la
                commande.
              </p>

              <label style={{ display: "block" }}>
                Message visible par le client

                <textarea
                  rows="3"
                  maxLength={1200}
                  value={notes[order.id] ?? ""}
                  onChange={event =>
                    setNotes(previous => ({
                      ...previous,
                      [order.id]: event.target.value,
                    }))
                  }
                  placeholder="Ex. : Bonjour, votre ouvrage est disponible. Voici les modalités de règlement..."
                  style={{
                    display: "block",
                    width: "100%",
                    marginTop: "7px",
                  }}
                />
              </label>

              <button
                className="btn secondary"
                type="button"
                disabled={savingId === order.id}
                onClick={() => saveNote(order)}
                style={{ marginTop: "10px" }}
              >
                {savingId === order.id
                  ? "Enregistrement..."
                  : "Enregistrer le message client"}
              </button>

              {/* CONTACT DIRECT */}

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginTop: "18px",
                }}
              >

                {order.customer_phone && (
                  <a
                    className="btn secondary"
                    href={
                      "https://wa.me/" +
                      String(order.customer_phone).replace(
                        /[^0-9]/g,
                        ""
                      )
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Contacter sur WhatsApp
                  </a>
                )}

                {order.customer_email && (
                  <a
                    className="btn secondary"
                    href={`mailto:${encodeURIComponent(
                      order.customer_email
                    )}`}
                  >
                    Envoyer un e-mail
                  </a>
                )}

              </div>

            </article>

          ))}

        </div>

      )}

      <p style={{ marginTop: "24px" }}>
        <Link to="/administration">
          ← Retour au tableau de bord
        </Link>
      </p>

    </main>
  );
}

export default BookOrdersAdmin;

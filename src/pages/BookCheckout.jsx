import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { supabase } from "../supabase";

const UEMOA_COUNTRIES = [
  "benin", "burkina faso", "cote d'ivoire", "cote divoire",
  "guinee-bissau", "guinee bissau", "mali", "niger", "senegal", "togo"
];

const LOCAL_METHODS = [
  { value: "wave", label: "Wave", detail: "Le règlement pourra être organisé après confirmation de disponibilité." },
  { value: "orange_money", label: "Orange Money", detail: "Le règlement pourra être organisé après confirmation de disponibilité." },
  { value: "bank_transfer", label: "Virement bancaire", detail: "Modalités communiquées directement si cette option est retenue." },
  { value: "to_discuss", label: "Je souhaite être conseillé", detail: "Nous conviendrons ensemble du moyen de règlement." }
];

const INTERNATIONAL_METHODS = [
  { value: "paypal", label: "PayPal", detail: "Possibilité à étudier selon votre pays et les frais applicables." },
  { value: "taptap_send", label: "TapTap Send", detail: "À étudier selon le pays d'envoi et les possibilités de réception." },
  { value: "bank_transfer", label: "Virement bancaire", detail: "Coordonnées et conditions communiquées après étude de la demande." },
  { value: "to_discuss", label: "Autre solution / à convenir", detail: "Nous prendrons contact pour choisir une solution adaptée." }
];

function normalizeCountry(country) {
  return String(country || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function isUemoaCountry(country) {
  return UEMOA_COUNTRIES.includes(normalizeCountry(country));
}

const METHOD_LABELS = Object.fromEntries(
  [...LOCAL_METHODS, ...INTERNATIONAL_METHODS].map(method => [method.value, method.label])
);


function checkoutAuthors(value) {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter(Boolean).map(String);
    } catch {}
    return trimmed.split(/[;,]/).map(item => item.trim()).filter(Boolean);
  }
  return [];
}

// Reprend exactement la palette et la composition éditoriale de la bibliothèque.
function EditorialBookCover({ book }) {
  const coverPalettes = [
    { bg: "#F3E5C8", accent: "#D7B477", ink: "#273D43", detail: "#E8D2A8" },
    { bg: "#DCE9DF", accent: "#8EAE9A", ink: "#28453D", detail: "#BFD5C7" },
    { bg: "#F0D9D0", accent: "#C88E7B", ink: "#513B39", detail: "#E5BFB2" },
    { bg: "#DCE8F0", accent: "#8CAFC5", ink: "#29465A", detail: "#BDD2E0" },
    { bg: "#E8E0F1", accent: "#AA96C5", ink: "#443B58", detail: "#D2C5E3" },
    { bg: "#F2E7B9", accent: "#C5A64D", ink: "#4B4328", detail: "#E6D68F" },
    { bg: "#D9E8E7", accent: "#7FAEAA", ink: "#294847", detail: "#B8D5D2" },
    { bg: "#EBDCCB", accent: "#B58B68", ink: "#4C3C31", detail: "#DCC4AC" }
  ];
  const paletteSeed = String(book.title || "ouvrage")
    .split("")
    .reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const palette = coverPalettes[paletteSeed % coverPalettes.length];
  const [imageFailed, setImageFailed] = useState(false);
  const authors = checkoutAuthors(book.authors).join(", ") || "Auteur non renseigné";

  const frameStyle = {
    width: "100%",
    height: "100%",
    minHeight: "190px",
    boxSizing: "border-box",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "20px 18px 17px",
    background: `linear-gradient(145deg, ${palette.bg} 0%, ${palette.detail} 100%)`,
    color: palette.ink,
    border: `1px solid ${palette.accent}`
  };

  if (book.cover_url && !imageFailed) {
    return (
      <div className="checkout-cover" style={{ overflow: "hidden" }}>
        <img
          src={book.cover_url}
          alt={`Couverture de ${book.title}`}
          referrerPolicy="no-referrer"
          onError={() => setImageFailed(true)}
          style={{ width: "100%", height: "100%", minHeight: "190px", objectFit: "cover", display: "block" }}
        />
      </div>
    );
  }

  return (
    <div className="checkout-cover" style={frameStyle} role="img" aria-label={`Couverture éditoriale de ${book.title || "cet ouvrage"}`}>
      <div style={{
        position: "absolute", width: "150px", height: "150px", borderRadius: "50%",
        right: "-52px", top: "-58px", background: palette.accent, opacity: .20
      }} />
      <div style={{
        position: "absolute", width: "120px", height: "120px", borderRadius: "50%",
        left: "-62px", bottom: "-58px", border: `1px solid ${palette.accent}`, opacity: .55
      }} />
      <div style={{ position: "relative", zIndex: 1, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "Georgia, serif", fontSize: "11px", letterSpacing: "1.8px", fontWeight: 700 }}>LIVRE</span>
        <span style={{ width: "30px", height: "30px", borderRadius: "50%", border: `1px solid ${palette.accent}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px" }}>✦</span>
      </div>
      <div style={{ position: "relative", zIndex: 1, margin: "auto 0", padding: "14px 0 12px" }}>
        <div style={{ width: "36px", height: "3px", background: palette.accent, marginBottom: "13px" }} />
        <div style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "clamp(15px, 1.25vw, 20px)",
          lineHeight: 1.12,
          fontWeight: 700,
          overflowWrap: "anywhere",
          maxHeight: "5.6em",
          overflow: "hidden"
        }}>{book.title || "Ouvrage"}</div>
      </div>
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ width: "100%", height: "1px", background: palette.accent, marginBottom: "10px" }} />
        <div style={{ fontSize: "11px", lineHeight: 1.25, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {authors}
        </div>
      </div>
    </div>
  );
}

export default function BookCheckout() {
  const location = useLocation();
  const book = location.state?.book;
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", country: "Sénégal",
    payment_method: "wave", format: "PDF", note: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const local = useMemo(() => isUemoaCountry(form.country), [form.country]);
  const methods = local ? LOCAL_METHODS : INTERNATIONAL_METHODS;

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data, error: authError }) => {
      if (!active) return;
      const current = data?.user || null;
      setUser(current);
      if (current) setForm(previous => ({
        ...previous,
        email: current.email || previous.email,
        full_name: current.user_metadata?.full_name || current.user_metadata?.name || previous.full_name,
        phone: current.user_metadata?.phone || previous.phone
      }));
      if (authError) setError("Votre session n'a pas pu être vérifiée. Veuillez vous reconnecter.");
      setLoadingUser(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const options = isUemoaCountry(form.country) ? LOCAL_METHODS : INTERNATIONAL_METHODS;
    if (!options.some(option => option.value === form.payment_method)) {
      setForm(previous => ({ ...previous, payment_method: options[0].value }));
    }
  }, [form.country, form.payment_method]);

  async function submitRequest(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!user) { setError("Connectez-vous pour transmettre votre demande."); return; }
    if (!book?.id) { setError("Veuillez revenir à la bibliothèque et sélectionner un ouvrage."); return; }
    setSaving(true);

    const { data, error: insertError } = await supabase
      .from("book_orders")
      .insert({
        user_id: user.id,
        book_id: book.id,
        book_title: String(book.title || "Ouvrage demandé").slice(0, 500),
        book_authors: Array.isArray(book.authors) ? book.authors : [],
        book_publisher: book.publisher || null,
        book_isbn: book.isbn || null,
        book_category: book.category || null,
        book_cover_url: book.cover_url || null,
        customer_name: form.full_name.trim(),
        customer_email: form.email.trim(),
        customer_phone: form.phone.trim(),
        customer_country: form.country.trim(),
        preferred_payment_method: form.payment_method,
        book_format: form.format,
        amount: null,
        currency: null,
        transfer_reference: null,
        customer_note: form.note.trim() || null,
        status: "request_received"
      })
      .select("id")
      .single();

    setSaving(false);
    if (insertError) {
      console.error("RAWAGO request submission:", insertError);
      setError("Votre demande n'a pas pu être enregistrée. Veuillez réessayer ou contacter RAWAGO.");
      return;
    }
    setSuccess(data.id);
  }

  if (loadingUser) return <main className="checkout-shell"><div className="checkout-loading">Vérification de votre espace membre…</div></main>;
  if (!user) return <main className="checkout-shell"><section className="checkout-member"><span className="checkout-kicker">BIBLIOTHÈQUE RAWAGO</span><h1>Votre espace membre</h1><p>La demande d'ouvrage est réservée aux membres. Connectez-vous ou créez gratuitement votre compte pour continuer.</p><Link className="btn primary" to="/espace-client">Me connecter / créer un compte</Link><Link className="checkout-back" to="/bibliotheque">← Retour à la bibliothèque</Link></section></main>;
  if (!book) return <main className="checkout-shell"><section className="checkout-member"><h1>Choisir un ouvrage</h1><p>Ouvrez la bibliothèque et sélectionnez le document que vous souhaitez demander.</p><Link className="btn primary" to="/bibliotheque">Voir la bibliothèque</Link></section></main>;

  if (success) return <main className="checkout-shell"><section className="checkout-success"><div className="checkout-success-icon">✓</div><span className="checkout-kicker">DEMANDE TRANSMISE</span><h1>Merci, votre demande est enregistrée.</h1><p>Votre référence est <strong>{success.slice(0, 8).toUpperCase()}</strong>.</p><p><strong>Aucun paiement n'a été effectué.</strong> Notre équipe va d'abord vérifier la disponibilité de l'ouvrage et vous recontactera par WhatsApp ou e-mail pour vous confirmer les possibilités, le prix définitif et les modalités de règlement.</p><p>Vous pouvez également suivre les informations de votre demande dans votre espace client si cette fonctionnalité y est disponible.</p><Link className="btn primary" to="/espace-client">Accéder à mon espace client</Link><Link className="checkout-back" to="/bibliotheque">Retour à la bibliothèque</Link></section></main>;

  return <main className="checkout-shell">
    <div className="checkout-heading"><span className="checkout-kicker">BIBLIOTHÈQUE · DEMANDE D'OUVRAGE</span><h1>Demander cet ouvrage</h1><p>Vérifions d'abord sa disponibilité. Aucun paiement ne vous sera demandé à cette étape.</p></div>
    <form className="checkout-layout" onSubmit={submitRequest}>
      <div className="checkout-main-column">
        <section className="checkout-panel checkout-book-panel">
          <div className="checkout-panel-heading"><span className="checkout-step">01</span><div><h2>Votre ouvrage</h2><p>Vérifiez le document souhaité.</p></div></div>
          <div className="checkout-book-info"><EditorialBookCover book={book} /><div className="checkout-book-meta"><h3>{book.title}</h3><p>{checkoutAuthors(book.authors).join(", ") || "Auteur non renseigné"}</p><span className="checkout-digital-tag">FORMAT NUMÉRIQUE · {form.format}</span></div></div>
          <section className="checkout-book-summary" aria-labelledby="checkout-book-summary-title" style={{ marginTop: "24px", padding: "20px 22px", borderRadius: "12px", background: "#F7F8F6", border: "1px solid #E7ECE8" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
              <span aria-hidden="true" style={{ width: "30px", height: "30px", borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#E4F2EF", color: "#16877F", fontSize: "15px" }}>▤</span>
              <h3 id="checkout-book-summary-title" style={{ margin: 0, fontSize: "18px", color: "#1D3445" }}>Résumé de l’ouvrage</h3>
            </div>
            {String(book.description || "").trim() ? (
              <p style={{ margin: 0, color: "#596B78", lineHeight: 1.75, whiteSpace: "pre-line" }}>{String(book.description).trim()}</p>
            ) : (
              <p style={{ margin: 0, color: "#71808B", lineHeight: 1.7, fontStyle: "italic" }}>Le résumé de cet ouvrage n’est pas encore disponible. Notre équipe pourra vous renseigner avant la confirmation de votre demande.</p>
            )}
            {(book.category || book.publisher || book.published_date) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "14px" }}>
                {book.category && <span style={{ padding: "6px 10px", borderRadius: "20px", background: "#EAF1EE", color: "#48645D", fontSize: "12px" }}>{book.category}</span>}
                {book.publisher && <span style={{ padding: "6px 10px", borderRadius: "20px", background: "#EEF1F4", color: "#566575", fontSize: "12px" }}>{book.publisher}</span>}
                {book.published_date && <span style={{ padding: "6px 10px", borderRadius: "20px", background: "#EEF1F4", color: "#566575", fontSize: "12px" }}>{book.published_date}</span>}
              </div>
            )}
          </section>
          <div className="checkout-format"><div><strong>Format souhaité</strong><small>Vous pourrez confirmer le format avec notre équipe.</small></div><div className="checkout-format-options"><label className={form.format === "PDF" ? "selected" : ""}><input type="radio" name="format" checked={form.format === "PDF"} onChange={() => setForm(previous => ({ ...previous, format: "PDF" }))} /><span>PDF</span></label><label className={form.format === "EPUB" ? "selected" : ""}><input type="radio" name="format" checked={form.format === "EPUB"} onChange={() => setForm(previous => ({ ...previous, format: "EPUB" }))} /><span>EPUB</span></label></div></div>
        </section>
        <section className="checkout-panel">
          <div className="checkout-panel-heading"><span className="checkout-step">02</span><div><h2>Vos coordonnées</h2><p>Pour que nous puissions vous répondre et vous tenir informé.</p></div></div>
          <div className="checkout-fields"><label>Nom et prénom<input required maxLength="160" autoComplete="name" value={form.full_name} onChange={event => setForm(previous => ({ ...previous, full_name: event.target.value }))} placeholder="Votre nom complet" /></label><label>Adresse e-mail<input required type="email" maxLength="200" autoComplete="email" value={form.email} onChange={event => setForm(previous => ({ ...previous, email: event.target.value }))} placeholder="vous@exemple.com" /></label><label>Téléphone / WhatsApp<input required type="tel" maxLength="40" autoComplete="tel" value={form.phone} onChange={event => setForm(previous => ({ ...previous, phone: event.target.value }))} placeholder="Indicatif international et numéro" /></label><label>Pays de résidence<input required maxLength="100" value={form.country} onChange={event => setForm(previous => ({ ...previous, country: event.target.value }))} placeholder="Votre pays" /></label></div>
        </section>
        <section className="checkout-panel">
          <div className="checkout-panel-heading"><span className="checkout-step">03</span><div><h2>Modalités de règlement envisagées</h2><p>Indiquez les solutions qui pourraient vous convenir. Il ne s'agit pas d'un paiement.</p></div></div>
          <div className="checkout-zone-note"><strong>{local ? "Zone UEMOA" : "Hors zone UEMOA"}</strong><p>{local ? "Pour les pays de l'UEMOA, les options possibles sont Wave, Orange Money ou virement bancaire. Nous vérifierons d'abord que le livre est disponible avant de vous communiquer les modalités." : "Pour les demandes internationales, y compris l'Afrique du Sud et l'Afrique de l'Est, nous étudierons avec vous une solution adaptée à votre pays : PayPal, TapTap Send, virement bancaire ou autre accord."}</p></div>
          <div className="checkout-methods">{methods.map(method => <label key={method.value} className={`checkout-method ${form.payment_method === method.value ? "selected" : ""}`}><input type="radio" name="payment_method" checked={form.payment_method === method.value} onChange={() => setForm(previous => ({ ...previous, payment_method: method.value }))} /><span className="checkout-method-radio"/><span className="checkout-method-copy"><strong>{method.label}</strong><small>{method.detail}</small></span><span className="checkout-method-arrow">›</span></label>)}</div>
          <label className="checkout-note">Précisions ou autre moyen de paiement souhaité <span>(facultatif)</span><textarea rows="3" maxLength="1000" value={form.note} onChange={event => setForm(previous => ({ ...previous, note: event.target.value }))} placeholder="Indiquez vos préférences ou toute précision utile…" /></label>
        </section>
      </div>
      <aside className="checkout-summary"><span className="checkout-kicker">RÉCAPITULATIF</span><h2>Votre demande</h2><div className="checkout-summary-book"><strong>{book.title}</strong><small>{form.format} · Document numérique souhaité</small></div><div className="checkout-summary-line"><span>Disponibilité</span><strong>À vérifier</strong></div><div className="checkout-summary-line"><span>Prix définitif</span><strong>À confirmer</strong></div><div className="checkout-summary-total"><span>Paiement</span><strong>Pas maintenant</strong></div>{error && <p className="checkout-form-error" role="alert">{error}</p>}<button className="btn primary checkout-submit" type="submit" disabled={saving}>{saving ? "Transmission de votre demande…" : "Envoyer ma demande"}</button><p className="checkout-secure-note">Aucun débit, aucun transfert et aucune obligation de paiement à cette étape. Nous vérifions d'abord la disponibilité, puis nous vous contactons.</p><Link className="checkout-back" to="/bibliotheque">← Retour à la bibliothèque</Link></aside>
    </form>
  </main>;
}

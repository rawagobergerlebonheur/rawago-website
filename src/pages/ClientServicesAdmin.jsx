import { useEffect, useState } from "react";
import { supabase } from "../supabase";

const STATUS = {
  appointments: [
    ["pending", "En attente"],
    ["confirmed", "Confirmé"],
    ["cancelled", "Annulé"],
    ["completed", "Terminé"]
  ],
  books: [
    ["received", "Reçue"],
    ["searching", "Recherche en cours"],
    ["available", "Disponible"],
    ["unavailable", "Indisponible"],
    ["ordered", "Commandé"],
    ["delivered", "Livré"],
    ["cancelled", "Annulé"]
  ],
  tickets: [
    ["open", "Ouvert"],
    ["in_progress", "En cours"],
    ["closed", "Clôturé"]
  ]
};

function ClientServicesAdmin() {
  const [activeTab, setActiveTab] = useState("appointments");
  const [appointments, setAppointments] = useState([]);
  const [books, setBooks] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [resourceForm, setResourceForm] = useState({
    client_id: "", title: "", subject: "", description: "", resource_url: "", due_date: ""
  });
  const [notificationForm, setNotificationForm] = useState({
    client_id: "", title: "", body: "", action_url: ""
  });
  const [clients, setClients] = useState([]);

  async function loadAll() {
    setError("");
    const [a, b, t, c] = await Promise.all([
      supabase.from("client_appointments").select("*").order("created_at", { ascending: false }),
      supabase.from("client_book_requests").select("*").order("created_at", { ascending: false }),
      supabase.from("client_support_tickets").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, full_name").order("full_name")
    ]);
    if (a.error) setError(a.error.message); else setAppointments(a.data || []);
    if (b.error) setError(b.error.message); else setBooks(b.data || []);
    if (t.error) setError(t.error.message); else setTickets(t.data || []);
    if (!c.error) setClients(c.data || []);
  }

  useEffect(() => { loadAll(); }, []);

  async function updateStatus(table, id, status, setter, rows) {
    setSavingId(id); setError(""); setNotice("");
    const { data, error: updateError } = await supabase.from(table)
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id).select().single();
    if (updateError) setError(updateError.message);
    else {
      setter(rows.map(row => row.id === id ? data : row));
      setNotice("Statut mis à jour.");
    }
    setSavingId(null);
  }

  async function saveBookQuote(item, value) {
    const amount = value === "" ? null : Number(value);
    if (amount !== null && (!Number.isFinite(amount) || amount < 0)) {
      setError("Indique un montant valide."); return;
    }
    setSavingId(item.id); setError(""); setNotice("");
    const { data, error: updateError } = await supabase.from("client_book_requests")
      .update({ quoted_price: amount, updated_at: new Date().toISOString() })
      .eq("id", item.id).select().single();
    if (updateError) setError(updateError.message);
    else {
      setBooks(previous => previous.map(row => row.id === item.id ? data : row));
      setNotice("Montant indicatif enregistré.");
    }
    setSavingId(null);
  }

  async function saveTicketReply(item, reply) {
    setSavingId(item.id); setError(""); setNotice("");
    const { data, error: updateError } = await supabase.from("client_support_tickets")
      .update({ admin_reply: reply, updated_at: new Date().toISOString() })
      .eq("id", item.id).select().single();
    if (updateError) setError(updateError.message);
    else {
      setTickets(previous => previous.map(row => row.id === item.id ? data : row));
      setNotice("Réponse enregistrée. Pour l'envoyer au client en temps réel, utilisez également la messagerie client.");
    }
    setSavingId(null);
  }

  async function assignLearningItem(event) {
    event.preventDefault();
    if (!resourceForm.client_id || !resourceForm.title.trim()) {
      setError("Sélectionne un client et renseigne le titre du support."); return;
    }
    setSavingId("resource"); setError(""); setNotice("");
    const { error: insertError } = await supabase.from("client_learning_items").insert({
      ...resourceForm,
      title: resourceForm.title.trim(),
      description: resourceForm.description.trim() || null,
      subject: resourceForm.subject.trim() || null,
      resource_url: resourceForm.resource_url.trim() || null,
      due_date: resourceForm.due_date || null
    });
    if (insertError) setError(insertError.message);
    else {
      setNotice("Support ajouté à l'espace du client.");
      setResourceForm({ client_id: "", title: "", subject: "", description: "", resource_url: "", due_date: "" });
    }
    setSavingId(null);
  }

  async function sendNotification(event) {
    event.preventDefault();
    if (!notificationForm.client_id || !notificationForm.title.trim() || !notificationForm.body.trim()) {
      setError("Sélectionne un client et renseigne le titre et le message."); return;
    }
    setSavingId("notification"); setError(""); setNotice("");
    const { error: insertError } = await supabase.from("client_notifications").insert({
      ...notificationForm,
      title: notificationForm.title.trim(),
      body: notificationForm.body.trim(),
      action_url: notificationForm.action_url.trim() || null
    });
    if (insertError) setError(insertError.message);
    else {
      setNotice("Notification envoyée dans l'espace client.");
      setNotificationForm({ client_id: "", title: "", body: "", action_url: "" });
    }
    setSavingId(null);
  }

  const clientName = id => clients.find(client => client.id === id)?.full_name || "Client";

  return (
    <section className="dashboard-panel" style={{ marginBottom: 28 }}>
      <div className="eyebrow">SUIVI DES SERVICES CLIENTS</div>
      <h2>Demandes et accompagnement client</h2>
      <p>Traitez les demandes de rendez-vous, les recherches de livres, l'assistance et les contenus personnalisés.</p>

      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="form-message" role="status">{notice}</p>}

      <div style={{display:"flex",gap:8,flexWrap:"wrap",margin:"18px 0"}}>
        {[
          ["appointments", `Rendez-vous (${appointments.length})`],
          ["books", `Livres (${books.length})`],
          ["tickets", `Assistance (${tickets.length})`],
          ["learning", "Supports pédagogiques"],
          ["notifications", "Notifications"]
        ].map(([id,label]) => (
          <button key={id} type="button" className={`btn ${activeTab === id ? "primary" : "secondary"}`} onClick={() => setActiveTab(id)}>{label}</button>
        ))}
        <button type="button" className="btn secondary" onClick={loadAll}>Actualiser</button>
      </div>

      {activeTab === "appointments" && (
        <div className="request-list">
          {appointments.length === 0 ? <p className="empty-state">Aucune demande de rendez-vous.</p> : appointments.map(item => (
            <article className="request-item" key={item.id}>
              <div className="eyebrow">{clientName(item.client_id)}</div>
              <h3>{item.subject}</h3><p>{item.details}</p>
              <small>{item.preferred_date || "Date flexible"} {item.preferred_time || ""} · {item.mode === "in_person" ? "Présentiel" : item.mode === "phone" ? "Téléphone" : "À distance"}</small>
              <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",marginTop:12}}>
                <select value={item.status} disabled={savingId === item.id} onChange={event => updateStatus("client_appointments",item.id,event.target.value,setAppointments,appointments)}>
                  {STATUS.appointments.map(([value,label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                {item.admin_note && <small>Note : {item.admin_note}</small>}
              </div>
            </article>
          ))}
        </div>
      )}

      {activeTab === "books" && (
        <div className="request-list">
          {books.length === 0 ? <p className="empty-state">Aucune recherche de livre.</p> : books.map(item => (
            <article className="request-item" key={item.id}>
              <div className="eyebrow">{clientName(item.client_id)} · {item.level || "Niveau non précisé"}</div>
              <h3>{item.title}</h3><p>{item.author || "Auteur non précisé"}{item.details ? ` · ${item.details}` : ""}</p>
              <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginTop:12}}>
                <select value={item.status} disabled={savingId === item.id} onChange={event => updateStatus("client_book_requests",item.id,event.target.value,setBooks,books)}>
                  {STATUS.books.map(([value,label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <label>Prix indicatif (FCFA)
                  <input type="number" min="0" step="1" defaultValue={item.quoted_price ?? ""} onBlur={event => saveBookQuote(item,event.target.value)} style={{maxWidth:160}} />
                </label>
              </div>
            </article>
          ))}
        </div>
      )}

      {activeTab === "tickets" && (
        <div className="request-list">
          {tickets.length === 0 ? <p className="empty-state">Aucun ticket d'assistance.</p> : tickets.map(item => (
            <article className="request-item" key={item.id}>
              <div className="eyebrow">{clientName(item.client_id)} · {item.status}</div>
              <h3>{item.subject}</h3><p>{item.message}</p>
              <textarea rows="3" defaultValue={item.admin_reply || ""} placeholder="Réponse interne / suivi..." id={`ticket-reply-${item.id}`} />
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:10}}>
                <button className="btn secondary" type="button" disabled={savingId === item.id} onClick={() => saveTicketReply(item,document.getElementById(`ticket-reply-${item.id}`)?.value || "")}>Enregistrer la réponse</button>
                <select value={item.status} onChange={event => updateStatus("client_support_tickets",item.id,event.target.value,setTickets,tickets)}>
                  {STATUS.tickets.map(([value,label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </div>
            </article>
          ))}
        </div>
      )}

      {activeTab === "learning" && (
        <form className="admin-note-form" onSubmit={assignLearningItem}>
          <h3>Attribuer un support pédagogique</h3>
          <label>Client</label><select value={resourceForm.client_id} onChange={event => setResourceForm(previous => ({...previous,client_id:event.target.value}))} required><option value="">Choisir un client</option>{clients.map(client => <option key={client.id} value={client.id}>{client.full_name || client.id}</option>)}</select>
          <label>Titre</label><input required value={resourceForm.title} onChange={event => setResourceForm(previous => ({...previous,title:event.target.value}))}/>
          <label>Matière / thème</label><input value={resourceForm.subject} onChange={event => setResourceForm(previous => ({...previous,subject:event.target.value}))}/>
          <label>Description</label><textarea rows="3" value={resourceForm.description} onChange={event => setResourceForm(previous => ({...previous,description:event.target.value}))}/>
          <label>Lien du document ou support</label><input type="url" value={resourceForm.resource_url} onChange={event => setResourceForm(previous => ({...previous,resource_url:event.target.value}))} placeholder="https://..."/>
          <label>Date limite (facultative)</label><input type="date" value={resourceForm.due_date} onChange={event => setResourceForm(previous => ({...previous,due_date:event.target.value}))}/>
          <button className="btn primary" disabled={savingId === "resource"}>{savingId === "resource" ? "Enregistrement..." : "Attribuer au client"}</button>
        </form>
      )}

      {activeTab === "notifications" && (
        <form className="admin-note-form" onSubmit={sendNotification}>
          <h3>Envoyer une notification</h3>
          <label>Client</label><select value={notificationForm.client_id} onChange={event => setNotificationForm(previous => ({...previous,client_id:event.target.value}))} required><option value="">Choisir un client</option>{clients.map(client => <option key={client.id} value={client.id}>{client.full_name || client.id}</option>)}</select>
          <label>Titre</label><input required value={notificationForm.title} onChange={event => setNotificationForm(previous => ({...previous,title:event.target.value}))}/>
          <label>Message</label><textarea rows="4" required value={notificationForm.body} onChange={event => setNotificationForm(previous => ({...previous,body:event.target.value}))}/>
          <label>Lien (facultatif)</label><input type="url" value={notificationForm.action_url} onChange={event => setNotificationForm(previous => ({...previous,action_url:event.target.value}))} placeholder="https://..."/>
          <button className="btn primary" disabled={savingId === "notification"}>{savingId === "notification" ? "Envoi..." : "Envoyer la notification"}</button>
        </form>
      )}
    </section>
  );
}

export default ClientServicesAdmin;

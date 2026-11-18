import { useEffect, useState } from "react";
import { supabase } from "../supabase";

const BUCKET = "rawago-events";

const categories = [
  "Ateliers",
  "Rencontres",
  "Conférences",
  "Formations",
  "Club de lecture",
  "Expression & prise de parole",
  "Orientation académique",
  "Rencontres professionnelles"
];

const emptyForm = {
  title: "",
  category: "Ateliers",
  description: "",
  event_date: "",
  start_time: "",
  end_time: "",
  location: "",
  status: "draft",
  cover_path: "",
  gallery_paths: []
};

function EventsAdmin() {
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const publicUrl = (path) => {
    if (!path) return "";
    return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  };

  async function loadEvents() {
    setLoading(true);
    setError("");

    const { data, error: loadError } = await supabase
      .from("events")
      .select("*")
      .order("event_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (loadError) {
      setError("Impossible de charger les activités : " + loadError.message);
    } else {
      setEvents(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadEvents();
  }, []);

  function updateField(name, value) {
    setForm(current => ({ ...current, [name]: value }));
  }

  function startEditing(item) {
    setEditingId(item.id);
    setSelectedFiles([]);
    setForm({
      title: item.title || "",
      category: item.category || "Ateliers",
      description: item.description || "",
      event_date: item.event_date || "",
      start_time: item.start_time ? item.start_time.slice(0, 5) : "",
      end_time: item.end_time ? item.end_time.slice(0, 5) : "",
      location: item.location || "",
      status: item.status || "draft",
      cover_path: item.cover_path || "",
      gallery_paths: item.gallery_paths || []
    });
    setNotice("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setForm({ ...emptyForm, gallery_paths: [] });
    setEditingId(null);
    setSelectedFiles([]);
    setError("");
    setNotice("");
  }

  function handleFiles(event) {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file =>
      ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type) &&
      file.size <= 8 * 1024 * 1024
    );

    if (validFiles.length !== files.length) {
      setError(
        "Certains fichiers ont été ignorés. Formats autorisés : JPG, PNG, WEBP et AVIF, 8 Mo maximum par image."
      );
    } else {
      setError("");
    }

    setSelectedFiles(validFiles);
  }

  async function uploadPhotos(files, eventId) {
    const uploadedPaths = [];

    for (const file of files) {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const uniqueName =
        `${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;
      const path = `${eventId}/${uniqueName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type
        });

      if (uploadError) {
        if (uploadedPaths.length) {
          await supabase.storage.from(BUCKET).remove(uploadedPaths);
        }
        throw new Error(
          `Erreur lors de l'envoi de ${file.name} : ${uploadError.message}`
        );
      }

      uploadedPaths.push(path);
    }

    return uploadedPaths;
  }

  async function saveEvent(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    if (!form.title.trim()) {
      setError("Le titre de l'activité est obligatoire.");
      setSaving(false);
      return;
    }

    if (
      form.start_time &&
      form.end_time &&
      form.end_time < form.start_time
    ) {
      setError("L'heure de fin doit être postérieure à l'heure de début.");
      setSaving(false);
      return;
    }

    let eventId = editingId;
    let newlyUploaded = [];

    try {
      if (!eventId) {
        const { data: userData, error: userError } =
          await supabase.auth.getUser();

        if (userError) throw userError;

        const { data: created, error: createError } = await supabase
          .from("events")
          .insert({
            title: form.title.trim(),
            category: form.category,
            description: form.description.trim(),
            event_date: form.event_date || null,
            start_time: form.start_time || null,
            end_time: form.end_time || null,
            location: form.location.trim() || null,
            status: "draft",
            created_by: userData?.user?.id || null
          })
          .select()
          .single();

        if (createError) throw createError;
        eventId = created.id;
      }

      if (selectedFiles.length) {
        newlyUploaded = await uploadPhotos(selectedFiles, eventId);
      }

      const allGallery = [
        ...(form.gallery_paths || []),
        ...newlyUploaded
      ];

      const coverPath =
        form.cover_path || newlyUploaded[0] || allGallery[0] || "";

      const payload = {
        title: form.title.trim(),
        category: form.category,
        description: form.description.trim(),
        event_date: form.event_date || null,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        location: form.location.trim() || null,
        status: form.status,
        cover_path: coverPath || null,
        gallery_paths: allGallery,
        updated_at: new Date().toISOString(),
        published_at:
          form.status === "published" ? new Date().toISOString() : null
      };

      const { error: updateError } = await supabase
        .from("events")
        .update(payload)
        .eq("id", eventId);

      if (updateError) throw updateError;

      setNotice(
        form.status === "published"
          ? "Activité publiée avec succès. Elle est maintenant visible sur le site."
          : "Brouillon enregistré avec succès."
      );

      setForm({ ...emptyForm, gallery_paths: [] });
      setEditingId(null);
      setSelectedFiles([]);
      await loadEvents();
    } catch (saveError) {
      if (newlyUploaded.length) {
        await supabase.storage.from(BUCKET).remove(newlyUploaded);
      }

      setError(
        saveError?.message ||
        "Une erreur est survenue pendant l'enregistrement."
      );
    } finally {
      setSaving(false);
    }
  }

  async function removePhoto(path) {
    if (!window.confirm("Retirer cette photo de la galerie ?")) return;

    const nextGallery = (form.gallery_paths || []).filter(
      item => item !== path
    );
    const nextCover =
      form.cover_path === path ? (nextGallery[0] || "") : form.cover_path;

    if (editingId) {
      const { error: updateError } = await supabase
        .from("events")
        .update({
          gallery_paths: nextGallery,
          cover_path: nextCover || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingId);

      if (updateError) {
        setError("Impossible de retirer la photo : " + updateError.message);
        return;
      }

      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove([path]);

      if (storageError) {
        setError("La photo a été retirée de la fiche, mais pas du stockage : " + storageError.message);
      } else {
        setNotice("Photo retirée de la galerie.");
      }

      setForm(current => ({
        ...current,
        gallery_paths: nextGallery,
        cover_path: nextCover
      }));
      await loadEvents();
    } else {
      setForm(current => ({
        ...current,
        gallery_paths: nextGallery,
        cover_path: nextCover
      }));
    }
  }

  async function deleteEvent(item) {
    const confirmed = window.confirm(
      `Supprimer définitivement « ${item.title} » et ses photos ?`
    );
    if (!confirmed) return;

    setDeletingId(item.id);
    setError("");
    setNotice("");

    try {
      const paths = [
        ...(item.gallery_paths || []),
        ...(item.cover_path ? [item.cover_path] : [])
      ];
      const uniquePaths = [...new Set(paths)];

      if (uniquePaths.length) {
        const { error: storageError } = await supabase.storage
          .from(BUCKET)
          .remove(uniquePaths);

        if (storageError) throw storageError;
      }

      const { error: deleteError } = await supabase
        .from("events")
        .delete()
        .eq("id", item.id);

      if (deleteError) throw deleteError;

      if (editingId === item.id) {
        setForm({ ...emptyForm, gallery_paths: [] });
        setEditingId(null);
        setSelectedFiles([]);
      }

      setNotice("Activité supprimée.");
      await loadEvents();
    } catch (deleteError) {
      setError(
        "Impossible de supprimer l'activité : " +
        (deleteError?.message || "erreur inconnue")
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className="dashboard-panel" style={{ marginBottom: "30px" }}>
      <div className="eyebrow">
        PROGRAMMATION · RENCONTRES · TRANSMISSION
      </div>

      <h2>{editingId ? "Modifier une activité" : "Ajouter une activité"}</h2>

      <p>
        Ajoutez une activité, choisissez sa catégorie, renseignez les informations pratiques et illustrez-la avec une ou plusieurs photos. Vous pouvez la publier ou la garder en brouillon.
      </p>

      {error && (
        <p className="form-error" role="alert">{error}</p>
      )}

      {notice && (
        <p className="form-message" role="status">{notice}</p>
      )}

      <form className="admin-note-form" onSubmit={saveEvent}>
        <label htmlFor="event-title">Titre de l'activité</label>
        <input
          id="event-title"
          value={form.title}
          onChange={event => updateField("title", event.target.value)}
          maxLength={200}
          required
          placeholder="Ex. Atelier de méthodologie universitaire"
        />

        <label htmlFor="event-category">Catégorie</label>
        <select
          id="event-category"
          value={form.category}
          onChange={event => updateField("category", event.target.value)}
        >
          {categories.map(category => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <label htmlFor="event-description">Description</label>
        <textarea
          id="event-description"
          rows={6}
          value={form.description}
          onChange={event => updateField("description", event.target.value)}
          placeholder="Présentez le programme, les objectifs et les modalités..."
        />

        <label htmlFor="event-date">Date</label>
        <input
          id="event-date"
          type="date"
          value={form.event_date}
          onChange={event => updateField("event_date", event.target.value)}
        />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "14px"
          }}
        >
          <div>
            <label htmlFor="event-start">Heure de début</label>
            <input
              id="event-start"
              type="time"
              value={form.start_time}
              onChange={event => updateField("start_time", event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="event-end">Heure de fin</label>
            <input
              id="event-end"
              type="time"
              value={form.end_time}
              onChange={event => updateField("end_time", event.target.value)}
            />
          </div>
        </div>

        <label htmlFor="event-location">Lieu</label>
        <input
          id="event-location"
          value={form.location}
          onChange={event => updateField("location", event.target.value)}
          placeholder="Ex. Dakar, Sénégal — ou En ligne"
        />

        <label htmlFor="event-photos">
          Photos de l'activité (8 Mo maximum par photo)
        </label>
        <input
          id="event-photos"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          multiple
          onChange={handleFiles}
        />

        {selectedFiles.length > 0 && (
          <p>{selectedFiles.length} photo(s) sélectionnée(s).</p>
        )}

        {form.gallery_paths.length > 0 && (
          <div style={{ margin: "12px 0" }}>
            <strong>Photos déjà enregistrées</strong>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
                gap: "12px",
                marginTop: "12px"
              }}
            >
              {form.gallery_paths.map(path => (
                <div key={path}>
                  <img
                    src={publicUrl(path)}
                    alt="Photo de l'activité"
                    style={{
                      width: "100%",
                      height: "110px",
                      objectFit: "cover",
                      borderRadius: "8px"
                    }}
                  />

                  <button
                    type="button"
                    className="btn secondary"
                    style={{ marginTop: "6px", padding: "6px 9px" }}
                    onClick={() => removePhoto(path)}
                  >
                    Retirer
                  </button>

                  {form.cover_path === path && (
                    <small style={{ display: "block" }}>
                      Photo principale
                    </small>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <label htmlFor="event-status">Publication</label>
        <select
          id="event-status"
          value={form.status}
          onChange={event => updateField("status", event.target.value)}
        >
          <option value="draft">Enregistrer comme brouillon</option>
          <option value="published">Publier sur le site</option>
        </select>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button className="btn primary" type="submit" disabled={saving}>
            {saving
              ? "Enregistrement..."
              : editingId
                ? "Enregistrer les modifications"
                : "Enregistrer l'activité"}
          </button>

          {editingId && (
            <button
              className="btn secondary"
              type="button"
              onClick={resetForm}
              disabled={saving}
            >
              Annuler
            </button>
          )}
        </div>
      </form>

      <div style={{ marginTop: "36px" }}>
        <h2>Activités enregistrées ({events.length})</h2>

        {loading ? (
          <p>Chargement des activités...</p>
        ) : events.length === 0 ? (
          <p className="empty-state">
            Aucune activité enregistrée pour le moment.
          </p>
        ) : (
          <div className="request-list">
            {events.map(item => (
              <article className="request-item" key={item.id}>
                <div className="eyebrow">
                  {item.category} ·{" "}
                  {item.status === "published" ? "PUBLIÉ" : "BROUILLON"}
                </div>

                <h3>{item.title}</h3>

                {item.cover_path && (
                  <img
                    src={publicUrl(item.cover_path)}
                    alt={item.title}
                    style={{
                      width: "min(100%, 320px)",
                      maxHeight: "190px",
                      objectFit: "cover",
                      borderRadius: "10px"
                    }}
                  />
                )}

                <p>{item.description}</p>

                <small>
                  {item.event_date
                    ? new Date(`${item.event_date}T12:00:00`).toLocaleDateString("fr-FR")
                    : "Date à préciser"}
                  {item.start_time ? ` · ${item.start_time.slice(0, 5)}` : ""}
                  {item.end_time ? ` – ${item.end_time.slice(0, 5)}` : ""}
                  {item.location ? ` · ${item.location}` : ""}
                </small>

                <div
                  style={{
                    display: "flex",
                    gap: "10px",
                    flexWrap: "wrap",
                    marginTop: "12px"
                  }}
                >
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => startEditing(item)}
                    disabled={saving || deletingId === item.id}
                  >
                    Modifier
                  </button>

                  <button
                    className="btn secondary"
                    type="button"
                    onClick={() => deleteEvent(item)}
                    disabled={deletingId === item.id || saving}
                  >
                    {deletingId === item.id ? "Suppression..." : "Supprimer"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default EventsAdmin;

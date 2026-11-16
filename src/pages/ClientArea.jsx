
import { useEffect, useState } from "react";
import { supabase } from "../supabase";

function ClientArea() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [requests, setRequests] = useState([]);
  const [saving, setSaving] = useState(false);

  const [authForm, setAuthForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: ""
  });

  const [requestForm, setRequestForm] = useState({
    service: "Accompagnement scolaire et universitaire",
    description: ""
  });

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        setError(error.message);
      }

      setSession(data.session);
      setLoading(false);
    }

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (mounted) {
          setSession(newSession);
          setError("");
          setMessage("");
        }
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadProfileAndRequests() {
      if (!session?.user) {
        setProfile(null);
        setRequests([]);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!active) return;

      if (profileError) {
        setError(profileError.message);
        return;
      }

      setProfile(profileData);

      const { data: requestData, error: requestError } = await supabase
        .from("service_requests")
        .select("*")
        .eq("client_id", session.user.id)
        .order("created_at", { ascending: false });

      if (!active) return;

      if (requestError) {
        setError(requestError.message);
      } else {
        setRequests(requestData || []);
      }
    }

    loadProfileAndRequests();

    return () => {
      active = false;
    };
  }, [session]);

  function updateAuth(field, value) {
    setAuthForm(previous => ({
      ...previous,
      [field]: value
    }));
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (authMode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email: authForm.email,
        password: authForm.password,
        options: {
          data: {
            full_name: authForm.fullName,
            phone: authForm.phone.trim()
          }
        }
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (!data.session) {
        setMessage(
          "Votre inscription est enregistrée. Consultez votre boîte e-mail pour confirmer votre adresse."
        );
      } else {
        setMessage("Votre compte a été créé.");
      }

      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: authForm.email,
      password: authForm.password
    });

    if (error) {
      setError(error.message);
    }
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setError(error.message);
    } else {
      setMessage("Vous êtes déconnecté.");
    }
  }

  async function handleRequestSubmit(event) {
    event.preventDefault();

    if (!session?.user) return;

    setSaving(true);
    setError("");
    setMessage("");

    const { error } = await supabase
      .from("service_requests")
      .insert({
        client_id: session.user.id,
        service: requestForm.service,
        description: requestForm.description
      });

    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("Votre demande a bien été enregistrée.");

    setRequestForm({
      service: "Accompagnement scolaire et universitaire",
      description: ""
    });

    const { data } = await supabase
      .from("service_requests")
      .select("*")
      .eq("client_id", session.user.id)
      .order("created_at", { ascending: false });

    setRequests(data || []);
  }

  const statusLabels = {
    pending: "En attente",
    reviewing: "À l'étude",
    accepted: "Acceptée",
    in_progress: "En cours",
    completed: "Terminée",
    rejected: "Refusée"
  };

  if (loading) {
    return (
      <main className="section">
        <p>Chargement de votre espace client...</p>
      </main>
    );
  }

  return (
    <main className="client-area section">
      <div className="section-head">
        <div className="eyebrow">VOTRE ESPACE PERSONNEL</div>
        <h1>Espace client</h1>
        <p>
          Retrouvez vos demandes et suivez leur évolution
          dans votre espace personnel sécurisé.
        </p>
      </div>

      {error && <p className="form-error">{error}</p>}
      {message && <p className="form-message">{message}</p>}

      {!session ? (
        <div className="auth-card">
          <div className="ico">👤</div>

          <h2>
            {authMode === "login"
              ? "Connexion à votre compte"
              : "Créer votre compte client"}
          </h2>

          <div className="auth-switch">
            <button
              type="button"
              className={authMode === "login" ? "active" : ""}
              onClick={() => {
                setAuthMode("login");
                setError("");
                setMessage("");
              }}
            >
              Se connecter
            </button>

            <button
              type="button"
              className={authMode === "signup" ? "active" : ""}
              onClick={() => {
                setAuthMode("signup");
                setError("");
                setMessage("");
              }}
            >
              Créer un compte
            </button>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            {authMode === "signup" && (
              <>
                <label>
                  Nom complet
                  <input
                    type="text"
                    required
                    value={authForm.fullName}
                    onChange={event =>
                      updateAuth("fullName", event.target.value)
                    }
                  />
                </label>

                <label>
                  Numéro WhatsApp avec indicatif du pays
                  <input
                    type="tel"
                    required
                    placeholder="+221 77 123 45 67"
                    value={authForm.phone}
                    onChange={event =>
                      updateAuth("phone", event.target.value)
                    }
                  />
                </label>
              </>
            )}

            <label>
              Adresse e-mail
              <input
                type="email"
                required
                value={authForm.email}
                onChange={event =>
                  updateAuth("email", event.target.value)
                }
              />
            </label>

            <label>
              Mot de passe
              <input
                type="password"
                required
                minLength="6"
                value={authForm.password}
                onChange={event =>
                  updateAuth("password", event.target.value)
                }
              />
            </label>

            <button className="btn primary" type="submit">
              {authMode === "login"
                ? "Me connecter"
                : "Créer mon compte"}
            </button>
          </form>
        </div>
      ) : (
        <div className="dashboard">
          <div className="dashboard-heading">
            <div>
              <div className="eyebrow">BIENVENUE</div>
              <h2>
                {profile?.full_name || session.user.email}
              </h2>
              <p>{session.user.email}</p>
            </div>

            <button
              className="btn secondary dark-button"
              type="button"
              onClick={handleSignOut}
            >
              Déconnexion
            </button>
          </div>

          {profile?.role === "admin" ? (
            <div className="dashboard-panel">
              <h2>Compte administrateur</h2>
              <p>
                Votre compte dispose des droits administrateur.
                L'espace d'administration sera accessible depuis
                sa page dédiée.
              </p>
              <a className="btn primary" href="/administration">
                Accéder à l'administration →
              </a>
            </div>
          ) : (
            <div className="dashboard-grid">
              <div className="dashboard-panel">
                <h2>Nouvelle demande</h2>

                <form
                  className="auth-form"
                  onSubmit={handleRequestSubmit}
                >
                  <label>
                    Service souhaité
                    <select
                      value={requestForm.service}
                      onChange={event =>
                        setRequestForm(previous => ({
                          ...previous,
                          service: event.target.value
                        }))
                      }
                    >
                      <option>
                        Accompagnement scolaire et universitaire
                      </option>
                      <option>Préparation aux concours</option>
                      <option>Méthodologie et recherche</option>
                      <option>Recherche documentaire</option>
                      <option>Accompagnement professionnel</option>
                    </select>
                  </label>

                  <label>
                    Décrivez votre besoin
                    <textarea
                      rows="6"
                      required
                      value={requestForm.description}
                      onChange={event =>
                        setRequestForm(previous => ({
                          ...previous,
                          description: event.target.value
                        }))
                      }
                      placeholder="Présentez votre objectif et vos attentes..."
                    />
                  </label>

                  <button
                    className="btn primary"
                    type="submit"
                    disabled={saving}
                  >
                    {saving
                      ? "Envoi en cours..."
                      : "Envoyer ma demande"}
                  </button>
                </form>
              </div>

              <div className="dashboard-panel">
                <div className="request-heading">
                  <h2>Mes demandes</h2>
                  <span>{requests.length}</span>
                </div>

                {requests.length === 0 ? (
                  <p className="empty-state">
                    Vous n'avez pas encore envoyé de demande.
                  </p>
                ) : (
                  <div className="request-list">
                    {requests.map(item => (
                      <article
                        className="request-item"
                        key={item.id}
                      >
                        <div className="request-item-top">
                          <b>{item.service}</b>
                          <span className={`status status-${item.status}`}>
                            {statusLabels[item.status] || item.status}
                          </span>
                        </div>

                        <p>{item.description}</p>

                        <small>
                          Envoyée le{" "}
                          {new Date(item.created_at).toLocaleDateString(
                            "fr-FR"
                          )}
                        </small>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

export default ClientArea;

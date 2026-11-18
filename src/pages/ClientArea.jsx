import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../supabase";

const SERVICES = [
  "Accompagnement scolaire et universitaire",
  "Préparation aux concours",
  "Méthodologie et recherche",
  "Recherche documentaire",
  "Accompagnement professionnel",
];

const STATUS_LABELS = {
  pending: "En attente",
  reviewing: "À l'étude",
  accepted: "Acceptée",
  in_progress: "En cours",
  completed: "Terminée",
  rejected: "Refusée",
};

function formatDate(value) {
  if (!value) return "Date non disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date non disponible";
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function ClientArea() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [requests, setRequests] = useState([]);
  const [saving, setSaving] = useState(false);
  const [authSaving, setAuthSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [clientSection, setClientSection] = useState("overview");
  const [clientSidebarCollapsed, setClientSidebarCollapsed] = useState(false);
  const [profileForm, setProfileForm] = useState({ fullName: "", phone: "" });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [emailForm, setEmailForm] = useState({ email: "" });
  const [emailSaving, setEmailSaving] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageDraft, setMessageDraft] = useState("");
  const [messageAttachment, setMessageAttachment] = useState(null);
  const [messageSaving, setMessageSaving] = useState(false);
  const [adminOnline, setAdminOnline] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const [notification, setNotification] = useState("");
  const [notificationCount, setNotificationCount] = useState(0);
  const [appointments, setAppointments] = useState([]);
  const [bookRequests, setBookRequests] = useState([]);
  const [learningItems, setLearningItems] = useState([]);
  const [clientNotifications, setClientNotifications] = useState([]);
  const [clientPreferences, setClientPreferences] = useState({ email_updates: true, email_messages: true, email_appointments: true, product_updates: false });
  const [favorites, setFavorites] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [appointmentForm, setAppointmentForm] = useState({ subject: "", preferred_date: "", preferred_time: "", mode: "distance", details: "" });
  const [bookForm, setBookForm] = useState({ title: "", author: "", level: "", details: "" });
  const [supportForm, setSupportForm] = useState({ subject: "Question sur une prestation", message: "" });
  const [favoriteForm, setFavoriteForm] = useState({ title: "", resource_url: "", resource_type: "resource" });
  const [portalSaving, setPortalSaving] = useState(false);
  const knownClientMessageIds = useRef(new Set());
  const chatPresenceChannelRef = useRef(null);

  const [authForm, setAuthForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    password: "",
  });

  const [requestForm, setRequestForm] = useState({
    service: SERVICES[0],
    description: "",
  });
  const [editingRequestId, setEditingRequestId] = useState(null);
  const [requestEditForm, setRequestEditForm] = useState({
    service: SERVICES[0],
    description: "",
  });
  const [requestActionSaving, setRequestActionSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data, error: sessionError } = await supabase.auth.getSession();

      if (!mounted) return;

      if (sessionError) setError(sessionError.message);
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

  const loadProfileAndRequests = useCallback(async () => {
    if (!session?.user) {
      setProfile(null);
      setRequests([]);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, role, phone, avatar_url")
      .eq("id", session.user.id)
      .maybeSingle();

    if (profileError) {
      setError(profileError.message);
      return;
    }

    setProfile(profileData);
    setProfileForm({ fullName: profileData?.full_name || session.user.user_metadata?.full_name || "", phone: profileData?.phone || session.user.user_metadata?.phone || "" });
    setAvatarPreview(profileData?.avatar_url || session.user.user_metadata?.avatar_url || "");
    setEmailForm({ email: session.user.email || "" });

    const { data: requestData, error: requestError } = await supabase
      .from("service_requests")
      .select("*")
      .eq("client_id", session.user.id)
      .order("created_at", { ascending: false });

    if (requestError) {
      setError(requestError.message);
      return;
    }

    setRequests(requestData || []);

    const { data: messageData, error: messageError } = await supabase
      .from("client_messages")
      .select("*")
      .eq("client_id", session.user.id)
      .order("created_at", { ascending: true });

    if (messageError) {
      setError(messageError.message);
    } else {
      knownClientMessageIds.current = new Set((messageData || []).map(item => item.id));
      setMessages(messageData || []);
    }
  }, [session]);

  const loadClientModules = useCallback(async () => {
    if (!session?.user?.id) return;
    const userId = session.user.id;
    const results = await Promise.all([
      supabase.from("client_appointments").select("*").eq("client_id", userId).order("created_at", { ascending: false }),
      supabase.from("client_book_requests").select("*").eq("client_id", userId).order("created_at", { ascending: false }),
      supabase.from("client_learning_items").select("*").eq("client_id", userId).order("created_at", { ascending: false }),
      supabase.from("client_notifications").select("*").eq("client_id", userId).order("created_at", { ascending: false }).limit(50),
      supabase.from("client_favorites").select("*").eq("client_id", userId).order("created_at", { ascending: false }),
      supabase.from("client_support_tickets").select("*").eq("client_id", userId).order("created_at", { ascending: false }),
      supabase.from("client_activity_logs").select("*").eq("client_id", userId).order("created_at", { ascending: false }).limit(50),
      supabase.from("client_preferences").select("preferences").eq("client_id", userId).maybeSingle()
    ]);
    const setters = [setAppointments, setBookRequests, setLearningItems, setClientNotifications, setFavorites, setSupportTickets, setActivityLogs];
    results.forEach((result, index) => {
      if (index < setters.length) {
        if (!result.error) setters[index](result.data || []);
        else console.warn("RAWAGO client module:", result.error.message);
      }
    });
    if (!results[3].error) setNotificationCount((results[3].data || []).filter(item => !item.read_at).length);
    if (!results[7].error && results[7].data?.preferences) {
      setClientPreferences(previous => ({ ...previous, ...results[7].data.preferences }));
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id && profile?.role !== "admin") loadClientModules();
  }, [session?.user?.id, profile?.role, loadClientModules]);

  useEffect(() => {
    let active = true;

    async function loadData() {
      if (!session?.user) {
        setProfile(null);
        setRequests([]);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name, role, phone, avatar_url")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!active) return;

      if (profileError) {
        setError(profileError.message);
        return;
      }

      setProfile(profileData);
      setProfileForm({ fullName: profileData?.full_name || session.user.user_metadata?.full_name || "", phone: profileData?.phone || session.user.user_metadata?.phone || "" });
      setAvatarPreview(profileData?.avatar_url || session.user.user_metadata?.avatar_url || "");
      setEmailForm({ email: session.user.email || "" });

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

      const { data: messageData, error: messageError } = await supabase
        .from("client_messages")
        .select("*")
        .eq("client_id", session.user.id)
        .order("created_at", { ascending: true });

      if (!active) return;

      if (messageError) {
        setError(messageError.message);
      } else {
        knownClientMessageIds.current = new Set((messageData || []).map(item => item.id));
        setMessages(messageData || []);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, [session]);

  // Réception instantanée des réponses RAWAGO via Supabase Realtime.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || profile?.role === "admin") return;

    const channel = supabase
      .channel(`rawago-client-messages-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "client_messages",
          filter: `client_id=eq.${userId}`
        },
        payload => {
          const item = payload.new;
          if (!item?.id || knownClientMessageIds.current.has(item.id)) return;

          knownClientMessageIds.current.add(item.id);
          setMessages(previous =>
            previous.some(messageItem => messageItem.id === item.id)
              ? previous
              : [...previous, item]
          );

          if (item.sender_id !== userId) {
            setNotification("Vous avez reçu une nouvelle réponse de RAWAGO.");
            setNotificationCount(previous => previous + 1);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "client_messages",
          filter: `client_id=eq.${userId}`
        },
        payload => {
          setMessages(previous => previous.map(item =>
            item.id === payload.new.id ? { ...item, ...payload.new } : item
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, profile?.role]);

  // Présence et indicateur de saisie de l'administration.
  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || profile?.role === "admin") return;

    const channel = supabase.channel(`rawago-chat-presence-${userId}`, {
      config: { presence: { key: userId }, broadcast: { self: false } }
    });

    chatPresenceChannelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setAdminOnline(Object.values(state).flat().some(entry => entry.role === "admin"));
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.sender === "admin") {
          setAdminTyping(Boolean(payload.typing));
        }
      })
      .subscribe(async status => {
        if (status === "SUBSCRIBED") {
          await channel.track({ role: "client", online_at: new Date().toISOString() });
        }
      });

    return () => {
      chatPresenceChannelRef.current = null;
      setAdminOnline(false);
      setAdminTyping(false);
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, profile?.role]);

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || profile?.role === "admin") return;

    const markAdminMessagesRead = async () => {
      const unread = messages.filter(item => item.sender_id !== userId && !item.read_at);
      if (unread.length === 0) return;

      const now = new Date().toISOString();
      const { error: readError } = await supabase
        .from("client_messages")
        .update({ read_at: now })
        .in("id", unread.map(item => item.id));

      if (!readError) {
        setMessages(previous => previous.map(item =>
          unread.some(unreadItem => unreadItem.id === item.id)
            ? { ...item, read_at: now }
            : item
        ));
      }
    };

    markAdminMessagesRead();
  }, [session?.user?.id, profile?.role, messages]);

  async function handleProfileSave(event) {
    event.preventDefault();
    if (!session?.user) return;
    const fullName = profileForm.fullName.trim();
    const phone = profileForm.phone.trim();
    if (!fullName) { setError("Veuillez renseigner votre nom complet."); return; }

    setProfileSaving(true); setError(""); setMessage("");
    let avatarUrl = avatarPreview;
    let uploadedPath = null;
    try {
      if (avatarFile) {
        if (!avatarFile.type.startsWith("image/") || avatarFile.size > 5 * 1024 * 1024) {
          throw new Error("Choisissez une image JPG, PNG ou WebP de 5 Mo maximum.");
        }
        const extension = (avatarFile.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        uploadedPath = `${session.user.id}/avatar-${Date.now()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("rawago-avatars").upload(uploadedPath, avatarFile, { upsert: true, contentType: avatarFile.type });
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage.from("rawago-avatars").getPublicUrl(uploadedPath);
        avatarUrl = publicData.publicUrl;
      }

      const { error: authUpdateError } = await supabase.auth.updateUser({ data: { full_name: fullName, phone, avatar_url: avatarUrl || null } });
      if (authUpdateError) throw authUpdateError;

      const profilePayload = { id: session.user.id, full_name: fullName, phone, avatar_url: avatarUrl || null };
      const { error: profileUpdateError } = await supabase.from("profiles").upsert(profilePayload, { onConflict: "id" });
      if (profileUpdateError) throw profileUpdateError;

      setProfile(previous => ({ ...(previous || {}), full_name: fullName, phone, avatar_url: avatarUrl || null }));
      setAvatarPreview(avatarUrl || ""); setAvatarFile(null);
      const input = document.getElementById("rawago-avatar-input"); if (input) input.value = "";
      setMessage("Votre profil a été mis à jour.");
      await logClientActivity("profile_updated");
    } catch (saveError) {
      if (uploadedPath) await supabase.storage.from("rawago-avatars").remove([uploadedPath]);
      setError("La mise à jour du profil a échoué : " + saveError.message);
    } finally { setProfileSaving(false); }
  }

  async function handlePasswordChange(event) {
    event.preventDefault();
    setError(""); setMessage("");
    if (!passwordForm.currentPassword) { setError("Saisissez votre mot de passe actuel pour confirmer votre identité."); return; }
    if (passwordForm.newPassword.length < 8) { setError("Le nouveau mot de passe doit contenir au moins 8 caractères."); return; }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { setError("La confirmation du mot de passe ne correspond pas."); return; }
    setPasswordSaving(true);
    const { error: verifyError } = await supabase.auth.signInWithPassword({ email: session.user.email, password: passwordForm.currentPassword });
    if (verifyError) {
      setPasswordSaving(false);
      setError("Votre mot de passe actuel est incorrect.");
      return;
    }
    const { error: passwordError } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
    setPasswordSaving(false);
    if (passwordError) setError("Impossible de modifier le mot de passe : " + passwordError.message);
    else { setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); setMessage("Votre mot de passe a été modifié."); await logClientActivity("password_changed"); }
  }

  async function handleEmailChange(event) {
    event.preventDefault();
    if (!emailForm.email.trim() || emailForm.email.trim() === session?.user?.email) return;
    setEmailSaving(true); setError(""); setMessage("");
    const { error: emailError } = await supabase.auth.updateUser({ email: emailForm.email.trim() });
    setEmailSaving(false);
    if (emailError) setError("Impossible de modifier l'adresse e-mail : " + emailError.message);
    else setMessage("Un e-mail de confirmation a été envoyé à votre nouvelle adresse. Validez-le pour terminer le changement.");
  }

  function updateAuth(field, value) {
    setAuthForm((previous) => ({ ...previous, [field]: value }));
  }

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setAuthSaving(true);

    try {
      if (authMode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: authForm.email.trim(),
          password: authForm.password,
          options: {
            data: {
              full_name: authForm.fullName.trim(),
              phone: authForm.phone.trim(),
            },
          },
        });

        if (signUpError) throw signUpError;

        if (!data.session) {
          setMessage(
            "Votre inscription est enregistrée. Consultez votre boîte e-mail pour confirmer votre adresse."
          );
        } else {
          setMessage("Votre compte a été créé.");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: authForm.email.trim(),
          password: authForm.password,
        });

        if (signInError) throw signInError;
      }
    } catch (authError) {
      setError(authError.message || "Une erreur est survenue.");
    } finally {
      setAuthSaving(false);
    }
  }

  async function handleSignOut() {
    setError("");
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setError(signOutError.message);
    } else {
      setMessage("Vous êtes déconnecté.");
      setProfile(null);
      setRequests([]);
      setMessages([]);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    setError("");
    await loadProfileAndRequests();
    await loadClientModules();
    setRefreshing(false);
  }

  async function logClientActivity(action, details = {}) {
    if (!session?.user?.id) return;
    const { data } = await supabase.from("client_activity_logs").insert({ client_id: session.user.id, action, details }).select().maybeSingle();
    if (data) setActivityLogs(previous => [data, ...previous].slice(0, 50));
  }

  async function submitAppointmentRequest(event) {
    event.preventDefault();
    if (!appointmentForm.subject.trim() || !appointmentForm.details.trim()) { setError("Précisez le motif et les détails du rendez-vous."); return; }
    setPortalSaving(true); setError(""); setMessage("");
    const { data, error: insertError } = await supabase.from("client_appointments").insert({
      client_id: session.user.id, subject: appointmentForm.subject.trim(),
      preferred_date: appointmentForm.preferred_date || null, preferred_time: appointmentForm.preferred_time || null,
      mode: appointmentForm.mode, details: appointmentForm.details.trim(), status: "pending"
    }).select().single();
    setPortalSaving(false);
    if (insertError) { setError("Demande non envoyée : " + insertError.message); return; }
    setAppointments(previous => [data, ...previous]);
    setAppointmentForm({ subject: "", preferred_date: "", preferred_time: "", mode: "distance", details: "" });
    setMessage("Votre demande de rendez-vous a été transmise à RAWAGO.");
    await logClientActivity("appointment_requested", { subject: data.subject });
  }

  async function submitBookRequest(event) {
    event.preventDefault();
    if (!bookForm.title.trim()) { setError("Indiquez le titre du livre recherché."); return; }
    setPortalSaving(true); setError(""); setMessage("");
    const { data, error: insertError } = await supabase.from("client_book_requests").insert({
      client_id: session.user.id, title: bookForm.title.trim(), author: bookForm.author.trim() || null,
      level: bookForm.level.trim() || null, details: bookForm.details.trim() || null, status: "received"
    }).select().single();
    setPortalSaving(false);
    if (insertError) { setError("Demande de livre non envoyée : " + insertError.message); return; }
    setBookRequests(previous => [data, ...previous]);
    setBookForm({ title: "", author: "", level: "", details: "" });
    setMessage("Votre recherche de livre a été transmise.");
    await logClientActivity("book_request_created", { title: data.title });
  }

  async function submitSupportTicket(event) {
    event.preventDefault();
    if (!supportForm.message.trim()) { setError("Écrivez votre message avant de l'envoyer."); return; }
    setPortalSaving(true); setError(""); setMessage("");
    const { data, error: insertError } = await supabase.from("client_support_tickets").insert({
      client_id: session.user.id, subject: supportForm.subject, message: supportForm.message.trim(), status: "open"
    }).select().single();
    setPortalSaving(false);
    if (insertError) { setError("Demande d'assistance non envoyée : " + insertError.message); return; }
    setSupportTickets(previous => [data, ...previous]);
    setSupportForm({ subject: "Question sur une prestation", message: "" });
    setMessage("Votre demande d'assistance a été envoyée.");
    await logClientActivity("support_ticket_created", { subject: data.subject });
  }

  async function toggleFavorite(item) {
    const existing = favorites.find(favorite => favorite.resource_url === item.resource_url);
    if (existing) {
      const { error: deleteError } = await supabase.from("client_favorites").delete().eq("id", existing.id).eq("client_id", session.user.id);
      if (deleteError) { setError(deleteError.message); return; }
      setFavorites(previous => previous.filter(favorite => favorite.id !== existing.id));
      setMessage("Ressource retirée des favoris.");
    } else {
      const { data, error: insertError } = await supabase.from("client_favorites").insert({
        client_id: session.user.id, title: item.title, resource_url: item.resource_url, resource_type: item.resource_type || "resource"
      }).select().single();
      if (insertError) { setError(insertError.message); return; }
      setFavorites(previous => [data, ...previous]);
      setMessage("Ressource ajoutée aux favoris.");
    }
  }

  async function addFavorite(event) {
    event.preventDefault();
    if (!favoriteForm.title.trim() || !favoriteForm.resource_url.trim()) { setError("Renseignez le titre et le lien de la ressource."); return; }
    setPortalSaving(true); setError(""); setMessage("");
    const { data, error: insertError } = await supabase.from("client_favorites").insert({
      client_id: session.user.id, title: favoriteForm.title.trim(),
      resource_url: favoriteForm.resource_url.trim(), resource_type: favoriteForm.resource_type
    }).select().single();
    setPortalSaving(false);
    if (insertError) { setError("Impossible d'ajouter ce favori : " + insertError.message); return; }
    setFavorites(previous => [data, ...previous]);
    setFavoriteForm({ title: "", resource_url: "", resource_type: "resource" });
    setMessage("Ressource ajoutée à vos favoris.");
    await logClientActivity("favorite_added", { title: data.title });
  }

  async function markNotificationRead(item) {
    const { error: updateError } = await supabase.from("client_notifications").update({ read_at: new Date().toISOString() }).eq("id", item.id).eq("client_id", session.user.id);
    if (updateError) { setError(updateError.message); return; }
    setClientNotifications(previous => previous.map(row => row.id === item.id ? { ...row, read_at: new Date().toISOString() } : row));
  }

  async function saveClientPreferences(event) {
    event.preventDefault();
    setPortalSaving(true); setError(""); setMessage("");
    const { error: prefError } = await supabase.from("client_preferences").upsert({
      client_id: session.user.id, preferences: clientPreferences, updated_at: new Date().toISOString()
    }, { onConflict: "client_id" });
    setPortalSaving(false);
    if (prefError) { setError("Impossible d'enregistrer vos préférences : " + prefError.message); return; }
    setMessage("Vos préférences ont été enregistrées.");
    await logClientActivity("notification_preferences_updated");
  }

  async function broadcastClientTyping(isTyping) {
    const userId = session?.user?.id;
    if (!userId) return;
    const channel = chatPresenceChannelRef.current;
    if (!channel) return;
    await channel.send({
      type: "broadcast",
      event: "typing",
      payload: { sender: "client", typing: isTyping }
    });
  }

  async function handleMessageSubmit(event) {
    event.preventDefault();

    if (!session?.user) return;
    const body = messageDraft.trim();
    if (!body && !messageAttachment) return;

    setMessageSaving(true);
    setError("");
    setMessage("");

    let uploadedPath = null;

    try {
      let attachment = {};
      if (messageAttachment) {
        const file = messageAttachment;
        const allowedTypes = [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "image/jpeg", "image/png", "image/webp"
        ];
        if (!allowedTypes.includes(file.type) || file.size > 10 * 1024 * 1024) {
          throw new Error("Format non autorisé ou fichier supérieur à 10 Mo.");
        }

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        uploadedPath = `${session.user.id}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage
          .from("rawago-chat-files")
          .upload(uploadedPath, file, { contentType: file.type, upsert: false });

        if (uploadError) throw uploadError;

        attachment = {
          attachment_path: uploadedPath,
          attachment_name: file.name,
          attachment_mime: file.type,
          attachment_size: file.size
        };
      }

      const messageBody = body || `Pièce jointe : ${messageAttachment.name}`;
      const { data, error: insertError } = await supabase
        .from("client_messages")
        .insert({
          client_id: session.user.id,
          sender_id: session.user.id,
          body: messageBody,
          ...attachment
        })
        .select()
        .single();

      if (insertError) throw insertError;

      knownClientMessageIds.current.add(data.id);
      setMessages(previous => [...previous, data]);
      setMessageDraft("");
      setMessageAttachment(null);
      setMessage("Votre message a bien été envoyé.");
      const input = document.getElementById("rawago-client-attachment");
      if (input) input.value = "";
    } catch (sendError) {
      if (uploadedPath) {
        await supabase.storage.from("rawago-chat-files").remove([uploadedPath]);
      }
      setError("Votre message n'a pas pu être envoyé : " + sendError.message);
    }

    setMessageSaving(false);
  }

  async function openChatAttachment(path) {
    const { data, error: signedError } = await supabase.storage
      .from("rawago-chat-files")
      .createSignedUrl(path, 60);
    if (signedError) {
      setError("Impossible d'ouvrir le fichier : " + signedError.message);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function handleRequestSubmit(event) {
    event.preventDefault();

    if (!session?.user) return;

    const description = requestForm.description.trim();
    if (!description) {
      setError("Veuillez décrire votre besoin avant d'envoyer la demande.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const { error: insertError } = await supabase
      .from("service_requests")
      .insert({
        client_id: session.user.id,
        service: requestForm.service,
        description,
      });

    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setMessage("Votre demande a bien été enregistrée.");
    await logClientActivity("service_request_created", { service: requestForm.service });
    setRequestForm({ service: SERVICES[0], description: "" });
    await loadProfileAndRequests();
  }

  function startRequestEdit(item) {
    setEditingRequestId(item.id);
    setRequestEditForm({
      service: item.service || SERVICES[0],
      description: item.description || "",
    });
    setError("");
    setMessage("");
  }

  function cancelRequestEdit() {
    setEditingRequestId(null);
    setRequestEditForm({ service: SERVICES[0], description: "" });
  }

  async function saveRequestEdit(event, requestId) {
    event.preventDefault();
    if (!session?.user || !requestEditForm.description.trim()) {
      setError("Veuillez renseigner la description de votre demande.");
      return;
    }

    setRequestActionSaving(true);
    setError("");
    setMessage("");

    const { data, error: updateError } = await supabase
      .from("service_requests")
      .update({
        service: requestEditForm.service,
        description: requestEditForm.description.trim(),
      })
      .eq("id", requestId)
      .eq("client_id", session.user.id)
      .select("*")
      .maybeSingle();

    if (updateError) {
      setError("La modification n'a pas pu être enregistrée : " + updateError.message);
    } else if (!data) {
      setError("Aucune modification confirmée. Vérifiez vos autorisations ou actualisez la page.");
    } else {
      setRequests(previous => previous.map(item => item.id === requestId ? data : item));
      setEditingRequestId(null);
      setMessage("Votre demande a été modifiée.");
    }

    setRequestActionSaving(false);
  }

  async function deleteRequest(requestId) {
    if (!session?.user) return;
    const confirmed = window.confirm(
      "Supprimer définitivement cette demande ? Cette action est irréversible."
    );
    if (!confirmed) return;

    setRequestActionSaving(true);
    setError("");
    setMessage("");

    const { data, error: deleteError } = await supabase
      .from("service_requests")
      .delete()
      .eq("id", requestId)
      .eq("client_id", session.user.id)
      .select("id")
      .maybeSingle();

    if (deleteError) {
      setError("La suppression n'a pas pu être effectuée : " + deleteError.message);
    } else if (!data) {
      setError("Aucune suppression confirmée. Vérifiez vos autorisations ou actualisez la page.");
    } else {
      setRequests(previous => previous.filter(item => item.id !== requestId));
      if (editingRequestId === requestId) cancelRequestEdit();
      setMessage("Votre demande a été supprimée.");
    }

    setRequestActionSaving(false);
  }

  const requestCounts = {
    total: requests.length,
    active: requests.filter((item) =>
      ["pending", "reviewing", "accepted", "in_progress"].includes(item.status)
    ).length,
    completed: requests.filter((item) => item.status === "completed").length,
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
      <style>{`
        .client-area {
          --client-ink: #193936;
          --client-green: #173B38;
          --client-green-2: #24534D;
          --client-teal: #16877D;
          --client-muted: #71817B;
          --client-line: #E5E9E2;
          --client-paper: #F7F6F0;
          color: var(--client-ink);
          max-width: 1500px;
          padding-top: 28px;
          padding-bottom: 60px;
        }
        .client-area * { box-sizing: border-box; }
        .client-area .client-shell {
          display: grid;
          grid-template-columns: 258px minmax(0, 1fr);
          min-height: 720px;
          border: 1px solid #E6E8E1;
          border-radius: 22px;
          overflow: hidden;
          background: var(--client-paper);
          box-shadow: 0 18px 55px rgba(26,54,48,.08);
        }
        .client-area .client-shell.is-collapsed { grid-template-columns: 82px minmax(0,1fr); }
        .client-area .client-sidebar {
          display: flex; flex-direction: column; min-width: 0;
          padding: 24px 15px;
          color: #F8F7F0;
          background: linear-gradient(180deg,#173B38 0%,#102D2B 100%);
        }
        .client-area .client-brand {
          display: flex; align-items: center; gap: 12px;
          padding: 4px 9px 24px; margin-bottom: 23px;
          border-bottom: 1px solid rgba(255,255,255,.13);
          min-height: 65px;
        }
        .client-area .client-brand-mark {
          display: grid; place-items: center; flex: 0 0 42px;
          width: 42px; height: 42px; border-radius: 14px;
          background: #F4F0E6; color: #173B38;
          font: 700 25px Georgia,serif;
        }
        .client-area .client-brand-name { font-size: 12px; letter-spacing: .17em; font-weight: 800; }
        .client-area .client-brand-sub { color: #A8C9BE; font-size: 9px; letter-spacing: .13em; margin-top: 5px; }
        .client-area .client-nav-caption {
          padding: 0 12px 10px; color: #91B2A8; font-size: 9px;
          font-weight: 800; letter-spacing: .16em; text-transform: uppercase;
        }
        .client-area .client-nav-list {
          display: flex; flex-direction: column; align-items: stretch; gap: 3px;
          width: 100%; min-width: 0;
        }
        .client-area .client-nav-button {
          display: flex; flex-direction: row; align-items: center; justify-content: flex-start;
          gap: 12px; width: 100%; min-width: 0;
          min-height: 45px; margin: 3px 0; padding: 10px 12px;
          border: 1px solid transparent; border-radius: 11px;
          color: #D8E5DF; background: transparent; text-align: left;
          font: inherit; font-size: 13px; font-weight: 550;
          white-space: nowrap; overflow: hidden; cursor: pointer; transition: .18s ease;
        }
        .client-area .client-nav-button:hover { background: rgba(255,255,255,.08); color: #FFF; }
        .client-area .client-nav-button.active {
          color: #173B38; background: #F4F0E6;
          box-shadow: 0 6px 18px rgba(0,0,0,.12);
        }
        .client-area .client-nav-icon { width: 22px; flex: 0 0 22px; text-align: center; font-size: 17px; }
        .client-area .client-nav-button > span:nth-child(2) { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
        .client-area .client-nav-count {
          margin-left: auto; min-width: 21px; padding: 3px 6px;
          border-radius: 20px; background: rgba(255,255,255,.12);
          color: #F5F4ED; font-size: 10px; text-align: center;
        }
        .client-area .client-nav-button.active .client-nav-count { background: #DCEBE4; color: #173B38; }
        .client-area .client-sidebar-bottom { margin-top: auto; padding-top: 16px; border-top: 1px solid rgba(255,255,255,.13); }
        .client-area .client-collapse-button {
          width: 100%; padding: 10px; border: 1px solid rgba(255,255,255,.16);
          border-radius: 10px; color: #E4EEE9; background: rgba(255,255,255,.06);
          cursor: pointer; font: inherit; font-size: 12px;
        }
        .client-area .client-main { min-width: 0; padding: 28px 30px 36px; background: #F7F6F0; }
        .client-area .client-topbar {
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: 16px; padding-bottom: 22px; margin-bottom: 25px;
          border-bottom: 1px solid var(--client-line);
        }
        .client-area .client-kicker { color: #87938D; font-size: 10px; letter-spacing: .12em; text-transform: uppercase; }
        .client-area .client-welcome-title {
          margin: 7px 0 5px; color: #193936; font: 600 clamp(25px,3vw,34px) Georgia,'Times New Roman',serif;
        }
        .client-area .client-welcome-sub { margin: 0; color: #71817B; font-size: 13px; overflow-wrap: anywhere; }
        .client-area .client-top-actions { display: flex; gap: 9px; flex-wrap: wrap; }
        .client-area .client-heading-copy { min-width: 0; }
        .client-area .client-topbar { align-items: center; }
        .client-area .client-top-actions { flex: 0 0 auto; align-items: center; justify-content: flex-end; }
        .client-area .client-top-actions .btn { min-height: 42px; white-space: nowrap; padding: 10px 15px; }
        .client-area .client-hero {
          display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(280px, .95fr);
          min-height: 265px; margin: 0 0 23px; overflow: hidden;
          border-radius: 18px; background: #173B38;
          box-shadow: 0 12px 30px rgba(23,59,56,.13);
        }
        .client-area .client-hero-copy {
          display: flex; flex-direction: column; align-items: flex-start; justify-content: center;
          padding: 30px 34px; color: #F8F6EF;
          background: radial-gradient(circle at 10% 10%, rgba(44,119,105,.42), transparent 48%), linear-gradient(135deg,#173B38,#102D2B);
        }
        .client-area .client-hero-overline { color: #A9D2C5; font-size: 9px; font-weight: 800; letter-spacing: .19em; }
        .client-area .client-hero-copy h2 {
          margin: 13px 0 9px; color: #FFF8EA; font: 600 clamp(25px,3vw,37px)/1.12 Georgia,'Times New Roman',serif;
        }
        .client-area .client-hero-copy p { max-width: 440px; margin: 0; color: #D4E2DA; font-size: 13px; line-height: 1.7; }
        .client-area .client-hero-link {
          display: inline-flex; align-items: center; gap: 14px; margin-top: 20px;
          padding: 10px 15px; border: 1px solid rgba(244,240,230,.42); border-radius: 8px;
          background: #F4F0E6; color: #173B38; font: 700 12px Arial, sans-serif; cursor: pointer;
        }
        .client-area .client-hero-link:hover { background: #FFF; transform: translateY(-1px); }
        .client-area .client-hero-image { position: relative; min-height: 265px; overflow: hidden; }
        .client-area .client-hero-image::after {
          content: ""; position: absolute; inset: 0;
          background: linear-gradient(90deg,rgba(16,45,43,.2),transparent 55%),linear-gradient(0deg,rgba(12,35,33,.48),transparent 50%);
          pointer-events: none;
        }
        .client-area .client-hero-image img { display: block; width: 100%; height: 100%; min-height: 265px; object-fit: cover; object-position: center; }
        .client-area .client-hero-image-caption {
          position: absolute; z-index: 1; right: 18px; bottom: 17px;
          color: #FFF; font-size: 9px; font-weight: 800; letter-spacing: .16em;
        }
        .client-area .client-workspace { min-width: 0; }
        .client-area .dashboard-summary {
          display: grid !important; grid-template-columns: repeat(3,minmax(0,1fr)) !important;
          gap: 14px !important; margin-bottom: 22px !important;
        }
        .client-area .dashboard-panel {
          color: #193936 !important; background: #FFF !important;
          border: 1px solid #E7EAE4 !important; border-radius: 15px !important;
          box-shadow: 0 5px 18px rgba(26,54,48,.035);
        }
        .client-area .dashboard-panel h2,
        .client-area .dashboard-panel h3,
        .client-area .dashboard-panel strong { color: #193936 !important; }
        .client-area .dashboard-panel p,
        .client-area .dashboard-panel small,
        .client-area .dashboard-panel label { color: #687A73 !important; }
        .client-area .dashboard-panel .eyebrow,
        .client-area .dashboard-summary .eyebrow { color: #16877D !important; letter-spacing: .13em; }
        .client-area .dashboard-panel input,
        .client-area .dashboard-panel select,
        .client-area .dashboard-panel textarea,
        .client-area .auth-form input,
        .client-area .auth-form select,
        .client-area .auth-form textarea {
          color: #193936 !important; background: #FFF !important;
          border: 1px solid #D6DED8 !important; border-radius: 9px !important;
        }
        .client-area .dashboard-panel input:focus,
        .client-area .dashboard-panel select:focus,
        .client-area .dashboard-panel textarea:focus,
        .client-area .auth-form input:focus,
        .client-area .auth-form select:focus,
        .client-area .auth-form textarea:focus {
          outline: 2px solid rgba(22,135,125,.16); border-color: #16877D !important;
        }
        .client-area .btn.primary {
          color: #FFF !important; background: #173B38 !important;
          border: 1px solid #173B38 !important; border-radius: 9px !important;
        }
        .client-area .btn.primary:hover { background: #24534D !important; }
        .client-area .btn.secondary {
          color: #25433F !important; background: #FFF !important;
          border: 1px solid #D6DED8 !important; border-radius: 9px !important;
        }
        .client-area .btn.secondary:hover { background: #EFF5F0 !important; border-color: #9BB9AA !important; }
        .client-area .dashboard-heading { display: none; }
        .client-area .dashboard-grid { gap: 18px; }
        .client-area .request-item {
          color: #193936 !important; background: #FAFBF8 !important;
          border: 1px solid #E7EAE4 !important; border-radius: 13px !important;
          padding: 17px !important;
        }
        .client-area .request-item p,
        .client-area .request-item small { color: #687A73 !important; }
        .client-area .request-item strong,
        .client-area .request-item b { color: #193936 !important; }
        .client-area .form-error { color: #B42318 !important; }
        .client-area .form-message { color: #16805F !important; }
        .client-area .empty-state { color: #71817B !important; }
        .client-area .auth-card {
          max-width: 560px; margin: 35px auto; padding: 34px;
          background: #FFF; border: 1px solid #E7EAE4; border-radius: 18px;
          box-shadow: 0 18px 50px rgba(26,54,48,.07);
        }
        .client-area .auth-card h2 { color: #193936; font: 600 29px Georgia,serif; }
        .client-area .auth-switch { display: flex; gap: 8px; padding: 6px; margin: 18px 0; border-radius: 11px; background: #F1F4EF; }
        .client-area .auth-switch button { flex: 1; padding: 11px; border: 0; border-radius: 8px; color: #536B63; background: transparent; cursor: pointer; }
        .client-area .auth-switch button.active { color: #173B38; background: #FFF; box-shadow: 0 2px 8px rgba(26,54,48,.08); }
        .client-area .auth-form { display: grid; gap: 13px; }
        .client-area .auth-form label { display: grid; gap: 7px; color: #536B63; font-size: 13px; }
        .client-area .auth-form input,
        .client-area .auth-form select,
        .client-area .auth-form textarea { width: 100%; padding: 12px 13px; font: inherit; }

        .client-area .client-profile-chip { display: inline-flex; align-items: center; gap: 8px; margin-right: 4px; color: #526B63; font-size: 11px; font-weight: 700; }
        .client-area .client-profile-chip img, .client-area .client-profile-chip span { width: 34px; height: 34px; border-radius: 50%; object-fit: cover; }
        .client-area .client-profile-chip span { display: grid; place-items: center; color: #F4F0E6; background: #173B38; font: 600 16px Georgia,serif; }
        .client-area .client-profile-chip small { max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .client-area .client-settings-grid { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 18px; align-items: start; }
        .client-area .client-settings-stack { display: grid; gap: 18px; min-width: 0; }
        .client-area .client-settings-card { padding: 24px; min-width: 0; }
        .client-area .client-settings-card h2 { margin: 8px 0; color: #193936; font: 600 24px Georgia,serif; }
        .client-area .client-settings-card h3 { color: #193936; font: 600 20px Georgia,serif; }
        .client-area .client-avatar-editor { display: grid; justify-items: start; gap: 9px; margin: 10px 0 8px; }
        .client-area .client-avatar-editor img, .client-area .client-avatar-editor > span { width: 104px; height: 104px; border-radius: 50%; object-fit: cover; border: 4px solid #E6F0E9; }
        .client-area .client-avatar-editor > span { display: grid; place-items: center; background: #173B38; color: #F4F0E6; font: 600 38px Georgia,serif; }
        .client-area .client-avatar-upload { display: inline-flex; padding: 9px 13px; border: 1px solid #D6DED8; border-radius: 8px; color: #24534D; background: #F7FAF6; cursor: pointer; font-size: 12px; font-weight: 700; }
        .client-area #rawago-avatar-input { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
        .client-area .client-security-note { background: #F1F6F0 !important; }
        .client-area .client-security-note ul { padding-left: 20px; color: #687A73; font-size: 13px; line-height: 1.8; }
        .client-area .client-module-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:16px; }
        .client-area .client-module-card { background:#fff; border:1px solid #E7EAE4; border-radius:15px; padding:22px; box-shadow:0 5px 18px rgba(26,54,48,.035); }
        .client-area .client-module-card h2,.client-area .client-module-card h3 { color:#193936; }
        .client-area .client-module-card p,.client-area .client-module-card small { color:#687A73; }
        .client-area .client-module-form { display:grid; gap:12px; margin-top:16px; }
        .client-area .client-module-form label { display:grid; gap:7px; color:#536B63; font-size:13px; }
        .client-area .client-module-form input,.client-area .client-module-form select,.client-area .client-module-form textarea { width:100%; padding:12px 13px; border:1px solid #D6DED8; border-radius:9px; color:#193936; background:#fff; font:inherit; }
        .client-area .client-module-list { display:grid; gap:11px; margin-top:15px; }
        .client-area .client-module-row { padding:15px; border:1px solid #E7EAE4; border-radius:12px; background:#FAFBF8; }
        .client-area .client-module-row h3 { margin:0 0 6px; font-size:15px; color:#193936; }
        .client-area .client-module-row p { margin:5px 0; color:#687A73; font-size:13px; line-height:1.6; }
        .client-area .client-module-meta { display:flex; flex-wrap:wrap; gap:8px; align-items:center; color:#7B8982; font-size:11px; margin-top:8px; }
        .client-area .client-tag { display:inline-flex; padding:5px 9px; border-radius:30px; background:#EAF2EC; color:#28634F; font-size:11px; font-weight:700; }
        .client-area .client-empty { padding:22px; text-align:center; border:1px dashed #CCD8D0; border-radius:12px; color:#71817B; background:#FBFCF9; }
        @media (max-width:640px) { .client-area .client-module-grid { grid-template-columns:1fr; } .client-area .client-module-card { padding:17px; } }

        @media (max-width: 900px) {
          .client-area { padding-top: 12px; padding-bottom: 35px; }
          .client-area .client-shell,
          .client-area .client-shell.is-collapsed { grid-template-columns: 1fr; }
          .client-area .client-sidebar { padding: 14px; }
          .client-area .client-brand { padding-bottom: 13px; margin-bottom: 13px; }
          .client-area .client-nav-caption,
          .client-area .client-sidebar-bottom { display: none; }
          .client-area .client-nav-list { display: flex; gap: 7px; overflow-x: auto; padding-bottom: 4px; }
          .client-area .client-nav-button { width: auto; flex: 0 0 auto; min-height: 40px; padding: 9px 12px; }
          .client-area .client-main { padding: 22px 18px 27px; }
        }
        @media (max-width: 640px) {
          .client-area .dashboard-summary { grid-template-columns: 1fr !important; }
          .client-area .client-settings-grid { grid-template-columns: 1fr; }
          .client-area .client-topbar { flex-direction: column; align-items: stretch; }
          .client-area .client-top-actions { width: 100%; justify-content: flex-start; }
          .client-area .client-hero { grid-template-columns: 1fr; }
          .client-area .client-hero-copy { padding: 25px 22px; }
          .client-area .client-hero-image { min-height: 170px; }
          .client-area .client-hero-image img { min-height: 170px; max-height: 190px; }
          .client-area .client-top-actions .btn { flex: 1; }
          .client-area .client-main { padding: 18px 13px 22px; }
          .client-area .auth-card { margin: 18px auto; padding: 22px; }
          .client-area .dashboard-panel { padding: 18px !important; }
        }

        /* Ajustements responsive RAWAGO */
        .client-area, .client-area * { min-width: 0; }
        .client-area .client-shell { width: 100%; }
        .client-area .client-nav-button { color: #E8F0EB; }
        .client-area .client-nav-button.active { color: #173B38; }
        .client-area .client-nav-button:focus-visible {
          outline: 3px solid #C9AD7E; outline-offset: 2px;
        }
        .client-area input[type="file"] {
          display: block; width: 100%; max-width: 100%; min-width: 0;
          padding: 10px; border: 1px dashed #AFC2B7; border-radius: 9px;
          color: #25433F; background: #F8FAF7; font: inherit;
        }
        .client-area input[type="file"]::file-selector-button {
          margin: 0 10px 0 0; padding: 8px 11px; border: 0;
          border-radius: 7px; color: #FFF; background: #173B38;
          font: 700 12px Arial, sans-serif; cursor: pointer;
        }
        .client-area .request-item,
        .client-area .client-module-row { overflow-wrap: anywhere; }
        .client-area .client-module-grid,
        .client-area .client-settings-grid,
        .client-area .client-workspace { min-width: 0; }
        @media (max-width: 900px) {
          .client-area .client-shell,
          .client-area .client-shell.is-collapsed { grid-template-columns: minmax(0, 1fr); }
          .client-area .client-sidebar { padding: 14px 12px; }
          .client-area .client-brand { padding-bottom: 12px; margin-bottom: 12px; }
          .client-area .client-nav-caption { display: none; }
          .client-area .client-nav-list {
            display: flex; flex-direction: row; align-items: stretch;
            gap: 8px; width: 100%; overflow-x: auto; overflow-y: hidden;
            padding: 2px 2px 9px; overscroll-behavior-x: contain;
            scrollbar-width: thin; -webkit-overflow-scrolling: touch;
          }
          .client-area .client-nav-button {
            flex: 0 0 auto; width: auto; min-width: max-content;
            min-height: 42px; margin: 0; padding: 9px 12px;
            color: #E8F0EB; font-size: 12px;
          }
          .client-area .client-nav-button.active {
            color: #173B38; background: #F4F0E6;
          }
          .client-area .client-nav-count { flex: 0 0 auto; }
          .client-area .client-sidebar-bottom { display: none; }
          .client-area .client-main { padding: 20px 16px 25px; }
          .client-area .client-topbar { flex-wrap: wrap; align-items: flex-start; }
          .client-area .client-top-actions { justify-content: flex-start; width: 100%; }
        }
        @media (max-width: 600px) {
          .client-area .client-main { padding: 16px 11px 22px; }
          .client-area .client-topbar { gap: 12px; margin-bottom: 18px; padding-bottom: 16px; }
          .client-area .client-welcome-title { font-size: 26px; }
          .client-area .client-top-actions { gap: 7px; }
          .client-area .client-top-actions .btn { flex: 1 1 125px; white-space: normal; }
          .client-area .client-profile-chip { flex: 1 1 100%; }
          .client-area .client-hero { grid-template-columns: minmax(0,1fr); }
          .client-area .client-hero-copy { padding: 23px 19px; }
          .client-area .client-hero-image,
          .client-area .client-hero-image img { min-height: 155px; max-height: 190px; }
          .client-area .dashboard-panel { padding: 15px !important; }
          .client-area .request-item { max-width: 100% !important; padding: 12px !important; }
          .client-area .auth-card { margin: 12px auto; padding: 19px; }
          .client-area .auth-switch { flex-wrap: wrap; }
          .client-area .auth-switch button { min-width: 110px; }
          .client-area .client-module-card { padding: 16px; }
          .client-area input, .client-area select, .client-area textarea { max-width: 100%; }
        }


        /* Correctif renforcé du menu client sur petits écrans */
        .client-area .client-shell > .client-sidebar {
          background: linear-gradient(180deg,#173B38 0%,#102D2B 100%) !important;
          color: #F8F7F0 !important;
        }
        .client-area .client-shell > .client-sidebar .client-nav-list {
          background: transparent !important;
        }
        .client-area .client-shell > .client-sidebar .client-nav-button {
          color: #F0F5F1 !important; opacity: 1 !important;
          background-color: transparent; border-color: transparent;
          text-decoration: none !important;
        }
        .client-area .client-shell > .client-sidebar .client-nav-button:hover,
        .client-area .client-shell > .client-sidebar .client-nav-button:focus-visible {
          color: #FFFFFF !important; background: rgba(255,255,255,.12) !important;
        }
        .client-area .client-shell > .client-sidebar .client-nav-button.active {
          color: #173B38 !important; background: #F4F0E6 !important;
          border-color: #D8C7A4 !important; opacity: 1 !important;
        }
        .client-area .client-shell > .client-sidebar .client-nav-button.active .client-nav-count {
          color: #173B38 !important; background: #DCEBE4 !important;
        }
        .client-area .client-main,
        .client-area .client-main > *,
        .client-area .dashboard-panel,
        .client-area .dashboard-heading { min-width: 0 !important; max-width: 100%; }
        .client-area input[type="file"] {
          display:block !important; box-sizing:border-box !important;
          width:100% !important; min-width:0 !important; max-width:100% !important;
          overflow:hidden !important; white-space:normal !important;
          font-size:12px !important; padding:8px !important;
        }
        .client-area input[type="file"]::file-selector-button {
          max-width:48%; margin-right:7px !important; padding:8px 9px !important;
          font-size:11px !important; white-space:nowrap;
        }
        @media (max-width: 900px) {
          .client-area .client-shell > .client-sidebar { display:flex !important; }
          .client-area .client-nav-list {
            display:flex !important; flex-direction:row !important;
            align-items:stretch !important; flex-wrap:nowrap !important;
            gap:7px !important; width:100% !important; max-width:100% !important;
            overflow-x:auto !important; overflow-y:hidden !important;
            padding:4px 2px 10px !important;
          }
          .client-area .client-nav-button {
            flex:0 0 auto !important; width:auto !important; min-width:max-content !important;
            min-height:42px !important; margin:0 !important; padding:9px 12px !important;
            color:#F0F5F1 !important; font-size:12px !important;
          }
          .client-area .client-nav-button.active {
            color:#173B38 !important; background:#F4F0E6 !important;
          }
        }
        @media (max-width: 600px) {
          .client-area .client-main { padding-left:11px !important; padding-right:11px !important; }
          .client-area .dashboard-panel { padding:15px !important; overflow:hidden; }
          .client-area input[type="file"] { font-size:11px !important; }
          .client-area input[type="file"]::file-selector-button { max-width:44%; }
        }



        /* REFONTE MOBILE COMPLETE — ESPACE CLIENT (ordinateur inchangé) */
        @media (max-width: 760px) {
          .client-area { width:100% !important; max-width:100% !important; padding:10px 0 28px !important; }
          .client-area .client-shell,
          .client-area .client-shell.is-collapsed {
            display:flex !important; flex-direction:column !important; width:100% !important;
            min-height:0 !important; border-radius:16px !important; overflow:visible !important;
          }
          .client-area .client-sidebar {
            display:block !important; width:100% !important; padding:16px 14px 13px !important;
            border-radius:15px 15px 0 0 !important; overflow:visible !important;
          }
          .client-area .client-brand {
            display:flex !important; align-items:center !important; gap:12px !important;
            min-height:48px !important; padding:0 2px 13px !important; margin:0 0 12px !important;
          }
          .client-area .client-brand-mark { width:40px !important; height:40px !important; flex-basis:40px !important; }
          .client-area .client-brand-name { font-size:12px !important; }
          .client-area .client-brand-sub { font-size:9px !important; }
          .client-area .client-nav-caption { display:block !important; padding:0 2px 9px !important; font-size:9px !important; }
          .client-area .client-nav-list {
            display:grid !important; grid-template-columns:repeat(2,minmax(0,1fr)) !important;
            align-items:stretch !important; gap:8px !important; width:100% !important;
            overflow:visible !important; padding:0 !important; margin:0 !important;
          }
          .client-area .client-nav-button {
            display:flex !important; width:100% !important; min-width:0 !important; min-height:52px !important;
            height:auto !important; flex:none !important; margin:0 !important; padding:10px 9px !important;
            gap:8px !important; white-space:normal !important; overflow:visible !important;
            border:1px solid rgba(255,255,255,.14) !important; border-radius:11px !important;
            color:#F4F7F4 !important; background:rgba(255,255,255,.055) !important;
            font-size:12px !important; line-height:1.25 !important; text-align:left !important;
          }
          .client-area .client-nav-button > span:nth-child(2) {
            display:block !important; flex:1 1 auto !important; min-width:0 !important;
            white-space:normal !important; overflow:visible !important; text-overflow:clip !important;
            overflow-wrap:anywhere !important;
          }
          .client-area .client-nav-icon { flex:0 0 20px !important; width:20px !important; font-size:16px !important; }
          .client-area .client-nav-count { flex:0 0 auto !important; margin-left:auto !important; }
          .client-area .client-nav-button.active {
            color:#173B38 !important; background:#F4F0E6 !important;
            border-color:#D8C7A4 !important; box-shadow:0 4px 12px rgba(0,0,0,.12) !important;
          }
          .client-area .client-sidebar-bottom { display:none !important; }
          .client-area .client-main { width:100% !important; min-width:0 !important; padding:18px 13px 22px !important; overflow:visible !important; }
          .client-area .client-topbar { display:flex !important; flex-direction:column !important; align-items:stretch !important; gap:13px !important; padding-bottom:16px !important; margin-bottom:17px !important; }
          .client-area .client-heading-copy { width:100% !important; min-width:0 !important; }
          .client-area .client-kicker { font-size:9px !important; letter-spacing:.12em !important; overflow-wrap:anywhere !important; }
          .client-area .client-welcome-title { font-size:clamp(23px,7vw,30px) !important; line-height:1.12 !important; overflow-wrap:anywhere !important; margin:7px 0 !important; }
          .client-area .client-welcome-sub { font-size:14px !important; line-height:1.5 !important; }
          .client-area .client-top-actions { display:grid !important; grid-template-columns:minmax(0,1fr) minmax(0,1fr) !important; width:100% !important; gap:8px !important; }
          .client-area .client-profile-chip { grid-column:1/-1 !important; width:100% !important; min-width:0 !important; }
          .client-area .client-top-actions .btn { width:100% !important; min-width:0 !important; min-height:44px !important; padding:10px 8px !important; white-space:normal !important; font-size:12px !important; }
          .client-area .client-hero { display:flex !important; flex-direction:column !important; gap:0 !important; margin:0 0 16px !important; }
          .client-area .client-hero-copy { width:100% !important; padding:20px 17px !important; }
          .client-area .client-hero-copy h2 { font-size:25px !important; line-height:1.15 !important; }
          .client-area .client-hero-image { width:100% !important; min-height:150px !important; height:170px !important; }
          .client-area .client-hero-image img { width:100% !important; height:170px !important; min-height:170px !important; object-fit:cover !important; }
          .client-area .client-workspace,
          .client-area .dashboard-grid,
          .client-area .client-settings-grid,
          .client-area .client-module-grid { display:grid !important; grid-template-columns:minmax(0,1fr) !important; gap:13px !important; width:100% !important; }
          .client-area .dashboard-summary { display:grid !important; grid-template-columns:minmax(0,1fr) !important; gap:11px !important; margin:0 0 16px !important; }
          .client-area .dashboard-panel,
          .client-area .client-module-card { width:100% !important; min-width:0 !important; max-width:100% !important; padding:16px !important; margin-left:0 !important; margin-right:0 !important; border-radius:13px !important; }
          .client-area .dashboard-panel h2,
          .client-area .dashboard-panel h3 { font-size:19px !important; line-height:1.25 !important; overflow-wrap:anywhere !important; }
          .client-area .request-item,
          .client-area .client-module-row { width:100% !important; max-width:100% !important; min-width:0 !important; padding:12px !important; overflow-wrap:anywhere !important; }
          .client-area .request-item-top { display:flex !important; flex-wrap:wrap !important; gap:8px !important; }
          .client-area input:not([type=checkbox]):not([type=radio]),
          .client-area select,.client-area textarea { width:100% !important; max-width:100% !important; min-width:0 !important; font-size:16px !important; }
          .client-area input[type=file] { width:100% !important; max-width:100% !important; min-width:0 !important; font-size:10px !important; overflow:hidden !important; }
          .client-area .btn { max-width:100% !important; white-space:normal !important; overflow-wrap:anywhere !important; }
          .client-area table { display:block !important; width:100% !important; max-width:100% !important; overflow-x:auto !important; }
        }
        /* NAVIGATION MOBILE — grille dédiée, sans chevauchement avec le contenu */
        @media (max-width:760px) {
          .client-area .client-shell,
          .client-area .client-shell.is-collapsed {
            display:flex !important; flex-direction:column !important;
            align-items:stretch !important; gap:0 !important;
            height:auto !important; min-height:0 !important; overflow:visible !important;
          }
          .client-area .client-sidebar {
            position:relative !important; inset:auto !important; z-index:2 !important;
            display:block !important; flex:0 0 auto !important;
            width:100% !important; height:auto !important; min-height:0 !important;
            max-height:none !important; margin:0 !important;
            overflow:visible !important; transform:none !important;
          }
          .client-area .client-nav-caption { display:block !important; position:static !important; }
          .client-area .client-nav-list {
            position:static !important; inset:auto !important; transform:none !important;
            display:grid !important; grid-template-columns:repeat(2,minmax(0,1fr)) !important;
            grid-auto-flow:row !important; grid-auto-rows:minmax(54px,auto) !important;
            align-items:stretch !important; justify-items:stretch !important;
            gap:9px !important; width:100% !important; height:auto !important;
            min-height:0 !important; max-height:none !important;
            margin:0 !important; padding:0 0 5px !important;
            overflow:visible !important; white-space:normal !important;
          }
          .client-area .client-nav-button {
            position:relative !important; inset:auto !important; transform:none !important;
            display:flex !important; float:none !important; align-self:stretch !important;
            width:100% !important; min-width:0 !important; max-width:none !important;
            height:auto !important; min-height:54px !important; max-height:none !important;
            margin:0 !important; padding:10px 11px !important;
            flex:none !important; white-space:normal !important;
            overflow:visible !important; line-height:1.3 !important;
          }
          .client-area .client-nav-button > span:nth-child(2) {
            display:block !important; position:static !important;
            flex:1 1 auto !important; min-width:0 !important;
            white-space:normal !important; overflow-wrap:anywhere !important;
          }
          .client-area .client-sidebar-bottom { display:none !important; }
          .client-area .client-main {
            position:relative !important; z-index:1 !important;
            display:block !important; flex:0 0 auto !important;
            clear:both !important; width:100% !important; height:auto !important;
            margin:0 !important; transform:none !important;
          }
        }
        @media (max-width:380px) {
          .client-area .client-nav-list { grid-template-columns:minmax(0,1fr) !important; }
          .client-area .client-nav-button { min-height:48px !important; }
          .client-area .client-main { padding-left:10px !important; padding-right:10px !important; }
        }


        /* RAWAGO — navigation mobile premium et transitions douces */
        @keyframes rawagoPanelEnter {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes rawagoNavEnter {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width:760px) {
          .client-area .client-shell,
          .client-area .client-shell.is-collapsed {
            display:flex !important; flex-direction:column !important;
            gap:0 !important; height:auto !important; min-height:0 !important;
            overflow:visible !important; background:#F5F3EC !important;
          }
          .client-area .client-sidebar {
            position:relative !important; inset:auto !important; z-index:3 !important;
            display:block !important; width:calc(100% - 20px) !important;
            height:auto !important; min-height:0 !important; max-height:none !important;
            margin:10px auto 14px !important; padding:17px !important;
            border:1px solid rgba(208,195,164,.42) !important;
            border-radius:22px !important; overflow:visible !important;
            background:linear-gradient(145deg,#123B36 0%,#1D5149 100%) !important;
            box-shadow:0 12px 32px rgba(20,55,49,.16) !important;
            transform:none !important;
          }
          .client-area .client-brand {
            display:flex !important; align-items:center !important; gap:12px !important;
            padding:0 2px 14px !important; margin:0 0 14px !important;
            border-bottom:1px solid rgba(255,255,255,.15) !important;
          }
          .client-area .client-brand-mark {
            width:44px !important; height:44px !important; flex:0 0 44px !important;
            border-radius:14px !important; background:#F4F0E6 !important; color:#173B38 !important;
            display:grid !important; place-items:center !important; font-size:25px !important;
          }
          .client-area .client-brand-name { color:#fff !important; font-size:14px !important; letter-spacing:.2em !important; }
          .client-area .client-brand-sub { color:#C4D5CE !important; font-size:9px !important; letter-spacing:.2em !important; }
          .client-area .client-nav-caption {
            display:block !important; color:#D7C7A4 !important; font-size:9px !important;
            font-weight:800 !important; letter-spacing:.2em !important; text-transform:uppercase !important;
            padding:0 2px 11px !important;
          }
          .client-area .client-nav-list {
            position:static !important; inset:auto !important; transform:none !important;
            display:grid !important; grid-template-columns:repeat(2,minmax(0,1fr)) !important;
            grid-auto-flow:row !important; grid-auto-rows:minmax(62px,auto) !important;
            gap:9px !important; width:100% !important; height:auto !important;
            min-height:0 !important; max-height:none !important; margin:0 !important;
            padding:0 !important; overflow:visible !important; white-space:normal !important;
          }
          .client-area .client-nav-button {
            position:relative !important; display:flex !important; align-items:center !important;
            width:100% !important; min-width:0 !important; max-width:none !important;
            min-height:62px !important; height:auto !important; max-height:none !important;
            margin:0 !important; padding:10px 9px !important; gap:8px !important;
            border:1px solid rgba(255,255,255,.16) !important; border-radius:14px !important;
            background:rgba(255,255,255,.075) !important; color:#F8F7F1 !important;
            box-shadow:inset 0 1px 0 rgba(255,255,255,.06) !important;
            font-size:11px !important; font-weight:650 !important; line-height:1.3 !important;
            text-align:left !important; white-space:normal !important; overflow:visible !important;
            transform:none !important; animation:rawagoNavEnter .38s both ease-out !important;
            transition:background .22s ease,border-color .22s ease,transform .22s ease,box-shadow .22s ease !important;
          }
          .client-area .client-nav-button:nth-child(2) { animation-delay:.025s !important; }
          .client-area .client-nav-button:nth-child(3) { animation-delay:.05s !important; }
          .client-area .client-nav-button:nth-child(4) { animation-delay:.075s !important; }
          .client-area .client-nav-button:nth-child(5) { animation-delay:.1s !important; }
          .client-area .client-nav-button:nth-child(6) { animation-delay:.125s !important; }
          .client-area .client-nav-button > span:nth-child(2) {
            display:block !important; position:static !important; flex:1 1 auto !important;
            min-width:0 !important; white-space:normal !important; overflow:visible !important;
            text-overflow:clip !important; overflow-wrap:break-word !important;
          }
          .client-area .client-nav-icon {
            display:grid !important; place-items:center !important; flex:0 0 27px !important;
            width:27px !important; height:27px !important; border-radius:9px !important;
            background:rgba(255,255,255,.11) !important; color:#E6D7B7 !important;
            font-size:16px !important;
          }
          .client-area .client-nav-count { flex:0 0 auto !important; margin-left:auto !important; }
          .client-area .client-nav-button.active {
            color:#173B38 !important; background:linear-gradient(135deg,#F8F4E9,#EDE5D3) !important;
            border-color:#D6C39C !important; box-shadow:0 7px 18px rgba(0,0,0,.16) !important;
          }
          .client-area .client-nav-button.active .client-nav-icon { background:#DCE8E0 !important; color:#173B38 !important; }
          .client-area .client-nav-button:active { transform:scale(.975) !important; }
          .client-area .client-sidebar-bottom { display:none !important; }
          .client-area .client-main {
            position:relative !important; z-index:1 !important; display:block !important;
            width:100% !important; min-width:0 !important; height:auto !important;
            margin:0 !important; padding:14px 12px 28px !important;
            overflow:visible !important; transform:none !important;
            background:#F5F3EC !important;
          }
          .client-area .client-main > * { min-width:0 !important; max-width:100% !important; }
          .client-area .client-topbar,
          .client-area .dashboard-panel,
          .client-area .client-module-card { animation:rawagoPanelEnter .42s ease-out both !important; }
        }
        @media (max-width:390px) {
          .client-area .client-sidebar { width:calc(100% - 14px) !important; padding:13px !important; border-radius:18px !important; }
          .client-area .client-nav-list { gap:7px !important; }
          .client-area .client-nav-button { min-height:58px !important; padding:8px 7px !important; font-size:10px !important; gap:6px !important; }
          .client-area .client-nav-icon { flex-basis:24px !important; width:24px !important; height:24px !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .client-area .client-nav-button, .client-area .client-main > *, .client-area .client-topbar,
          .client-area .dashboard-panel, .client-area .client-module-card { animation:none !important; transition:none !important; }
        }

      `}</style>

      {notification && (
        <div
          role="alert"
          style={{
            position: "fixed",
            top: "90px",
            right: "24px",
            zIndex: 10000,
            width: "min(390px, calc(100vw - 32px))",
            padding: "18px 20px",
            borderRadius: "12px",
            background: "#172B3D",
            color: "#ffffff",
            boxShadow: "0 12px 36px rgba(0,0,0,.22)"
          }}
        >
          <strong>Nouvelle notification ({notificationCount})</strong>
          <p style={{ margin: "8px 0 12px", color: "#ffffff" }}>{notification}</p>
          <button
            type="button"
            onClick={() => {
              setClientSection("messages");
              setNotification("");
            }}
            style={{ color: "#172B3D", background: "#ffffff", border: 0, borderRadius: "6px", padding: "7px 12px", cursor: "pointer", marginRight: "8px" }}
          >
            Ouvrir la messagerie
          </button>
          <button type="button" onClick={() => setNotification("")} style={{ color: "#172B3D", background: "#ffffff", border: 0, borderRadius: "6px", padding: "7px 12px", cursor: "pointer" }}>
            Fermer
          </button>
        </div>
      )}
      {!session && <div className="section-head">
        <div className="eyebrow">VOTRE ESPACE PERSONNEL</div>
        <h1>Espace client</h1>
        <p>
          Retrouvez vos demandes, suivez leur évolution et échangez avec notre équipe
          depuis votre espace personnel sécurisé.
        </p>
      </div>}

      {error && <p className="form-error" role="alert">{error}</p>}
      {message && <p className="form-message" role="status">{message}</p>}

      {!session ? (
        <div className="auth-card">
          <div className="ico" aria-hidden="true">👤</div>
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
                    autoComplete="name"
                    value={authForm.fullName}
                    onChange={(event) => updateAuth("fullName", event.target.value)}
                  />
                </label>
                <label>
                  Numéro WhatsApp avec indicatif du pays
                  <input
                    type="tel"
                    required
                    autoComplete="tel"
                    placeholder="+221 77 123 45 67"
                    value={authForm.phone}
                    onChange={(event) => updateAuth("phone", event.target.value)}
                  />
                </label>
              </>
            )}

            <label>
              Adresse e-mail
              <input
                type="email"
                required
                autoComplete="email"
                value={authForm.email}
                onChange={(event) => updateAuth("email", event.target.value)}
              />
            </label>
            <label>
              Mot de passe
              <input
                type="password"
                required
                minLength="6"
                autoComplete={authMode === "login" ? "current-password" : "new-password"}
                value={authForm.password}
                onChange={(event) => updateAuth("password", event.target.value)}
              />
            </label>

            <button className="btn primary" type="submit" disabled={authSaving}>
              {authSaving
                ? "Veuillez patienter..."
                : authMode === "login"
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
              <h2>{profile?.full_name || session.user.email}</h2>
              <p>{session.user.email}</p>
            </div>

            <div className="dashboard-actions">
              <button
                className="btn secondary"
                type="button"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                {refreshing ? "Actualisation..." : "Actualiser"}
              </button>
              <button
                className="btn secondary dark-button"
                type="button"
                onClick={handleSignOut}
              >
                Déconnexion
              </button>
            </div>
          </div>

          {profile?.role === "admin" ? (
            <div className="dashboard-panel">
              <h2>Compte administrateur</h2>
              <p>
                Votre compte dispose des droits administrateur. Retrouvez la
                gestion des demandes et des ressources dans l'espace dédié.
              </p>
              <a className="btn primary" href="/administration">
                Accéder à l'administration →
              </a>
            </div>
          ) : (
            <div className={`client-shell ${clientSidebarCollapsed ? "is-collapsed" : ""}`}>
              <aside className="client-sidebar">
                <div className="client-brand">
                  <div className="client-brand-mark">R.</div>
                  {!clientSidebarCollapsed && <div>
                    <div className="client-brand-name">RAWAGO</div>
                    <div className="client-brand-sub">ESPACE CLIENT</div>
                  </div>}
                </div>
                {!clientSidebarCollapsed && <div className="client-nav-caption">Mon espace</div>}
                <nav className="client-nav-list" aria-label="Navigation de l'espace client">
                  {[
                    { id: "overview", label: "Vue d'ensemble", icon: "⌂" },
                    { id: "requests", label: "Mes demandes", icon: "▤", count: requests.length },
                    { id: "documents", label: "Mes documents", icon: "▣" },
                    { id: "messages", label: "Messagerie", icon: "✉", count: notificationCount },
                    { id: "learning", label: "Mon accompagnement", icon: "✦" },
                    { id: "books", label: "Mes livres", icon: "▣" },
                    { id: "appointments", label: "Mes rendez-vous", icon: "◷" },
                    { id: "payments", label: "Mes paiements", icon: "₣" },
                    { id: "notifications", label: "Notifications", icon: "♧", count: clientNotifications.filter(item => !item.read_at).length },
                    { id: "favorites", label: "Mes favoris", icon: "♡" },
                    { id: "help", label: "Centre d'aide", icon: "?" },
                    { id: "activity", label: "Historique", icon: "↻" },
                    { id: "settings", label: "Paramètres", icon: "⚙" }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      title={item.label}
                      onClick={() => setClientSection(item.id)}
                      aria-current={clientSection === item.id ? "page" : undefined}
                      className={`client-nav-button ${clientSection === item.id ? "active" : ""}`}
                    >
                      <span className="client-nav-icon">{item.icon}</span>
                      {!clientSidebarCollapsed && <span>{item.label}</span>}
                      {!clientSidebarCollapsed && item.count > 0 && <span className="client-nav-count">{item.count}</span>}
                    </button>
                  ))}
                </nav>
                <div className="client-sidebar-bottom">
                  <button type="button" className="client-collapse-button" onClick={() => setClientSidebarCollapsed(value => !value)}>
                    {clientSidebarCollapsed ? "»" : "«  Réduire le menu"}
                  </button>
                </div>
              </aside>
              <div className="client-main">
                <header className="client-topbar">
                  <div className="client-heading-copy">
                    <div className="client-kicker">BERGER-LE-BONHEUR · ESPACE PERSONNEL</div>
                    <h1 className="client-welcome-title">
                      {clientSection === "overview" ? "Votre espace, en toute simplicité" :
                       clientSection === "requests" ? "Suivi de vos demandes" :
                       clientSection === "documents" ? "Vos documents" :
                       clientSection === "learning" ? "Mon accompagnement" :
                       clientSection === "books" ? "Mes commandes de livres" :
                       clientSection === "appointments" ? "Mes rendez-vous" :
                       clientSection === "payments" ? "Mes paiements" :
                       clientSection === "notifications" ? "Mes notifications" :
                       clientSection === "favorites" ? "Mes favoris" :
                       clientSection === "help" ? "Centre d'aide" :
                       clientSection === "activity" ? "Historique de mon compte" :
                       clientSection === "settings" ? "Paramètres de mon compte" : "Votre messagerie"}
                    </h1>
                    <p className="client-welcome-sub">Bonjour {profile?.full_name || "et bienvenue"}.</p>
                  </div>
                  <div className="client-top-actions">
                    <div className="client-profile-chip" title="Votre profil">
                      {avatarPreview ? <img src={avatarPreview} alt="" /> : <span>{(profileForm.fullName || session.user.email || "R").charAt(0).toUpperCase()}</span>}
                      <small>{profileForm.fullName || "Mon compte"}</small>
                    </div>
                    <button className="btn secondary" type="button" onClick={handleRefresh} disabled={refreshing}>
                      {refreshing ? "Actualisation..." : "Actualiser"}
                    </button>
                    <button className="btn secondary" type="button" onClick={handleSignOut}>
                      Déconnexion
                    </button>
                  </div>
                </header>
                {clientSection === "overview" && (
                  <section className="client-hero">
                    <div className="client-hero-copy">
                      <span className="client-hero-overline">UN ESPACE QUI VOUS EST DÉDIÉ</span>
                      <h2>Avançons ensemble<br />dans vos projets.</h2>
                      <p>Retrouvez vos demandes, vos documents et vos échanges avec l’équipe RAWAGO au même endroit.</p>
                      <button type="button" className="client-hero-link" onClick={() => setClientSection("requests")}>
                        Voir mes demandes <span aria-hidden="true">→</span>
                      </button>
                    </div>
                    <div className="client-hero-image">
                      <img
                        src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&w=1100&q=85"
                        alt="Bibliothèque lumineuse et espace de lecture"
                      />
                      <div className="client-hero-image-caption">SAVOIR · ACCOMPAGNEMENT · TRANSMISSION</div>
                    </div>
                  </section>
                )}
                <div className="client-workspace">
              {clientSection === "overview" && (
              <div
                className="dashboard-summary"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                  gap: "16px",
                  marginBottom: "24px",
                }}
              >
                <article
                  className="dashboard-panel"
                  style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "8px" }}
                >
                  <span className="eyebrow">TOTAL DES DEMANDES</span>
                  <strong style={{ fontSize: "2rem", lineHeight: 1.1 }}>{requestCounts.total}</strong>
                  <p style={{ margin: 0 }}>Demande(s) envoyée(s)</p>
                </article>
                <article
                  className="dashboard-panel"
                  style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "8px" }}
                >
                  <span className="eyebrow">EN COURS</span>
                  <strong style={{ fontSize: "2rem", lineHeight: 1.1 }}>{requestCounts.active}</strong>
                  <p style={{ margin: 0 }}>Demande(s) à suivre</p>
                </article>
                <article
                  className="dashboard-panel"
                  style={{ padding: "22px", display: "flex", flexDirection: "column", gap: "8px" }}
                >
                  <span className="eyebrow">TERMINÉES</span>
                  <strong style={{ fontSize: "2rem", lineHeight: 1.1 }}>{requestCounts.completed}</strong>
                  <p style={{ margin: 0 }}>Dossier(s) terminé(s)</p>
                </article>
              </div>
              )}

              {clientSection === "overview" && (
                <section className="dashboard-panel">
                  <div className="eyebrow">VOTRE ACTIVITÉ</div>
                  <h2>Bienvenue dans votre espace personnel</h2>
                  <p>
                    Retrouvez rapidement vos prestations, vos documents et vos échanges avec notre équipe.
                  </p>
                  <div className="dashboard-grid">
                    <button type="button" className="btn secondary" onClick={() => setClientSection("requests")}>
                      Consulter mes demandes →
                    </button>
                    <button type="button" className="btn secondary" onClick={() => setClientSection("documents")}>
                      Retrouver mes documents →
                    </button>
                    <button type="button" className="btn secondary" onClick={() => setClientSection("messages")}>
                      Ouvrir ma messagerie →
                    </button>
                  </div>
                  {requests.length > 0 && (
                    <div style={{ marginTop: "20px" }}>
                      <h3>Dernière demande</h3>
                      <article className="request-item">
                        <div className="request-item-top">
                          <strong>{requests[0].service}</strong>
                          <span className={`status status-${requests[0].status || "pending"}`}>
                            {STATUS_LABELS[requests[0].status] || "Statut à préciser"}
                          </span>
                        </div>
                        <p>{requests[0].description}</p>
                        <small>Envoyée le {formatDate(requests[0].created_at)}</small>
                      </article>
                    </div>
                  )}
                </section>
              )}

              {clientSection === "requests" && (
              <div className="dashboard-grid">
                <div className="dashboard-panel">
                  <h2>Nouvelle demande</h2>
                  <p>
                    Présentez votre besoin. Notre équipe pourra ensuite
                    étudier votre demande et vous répondre.
                  </p>

                  <form className="auth-form" onSubmit={handleRequestSubmit}>
                    <label>
                      Service souhaité
                      <select
                        value={requestForm.service}
                        onChange={(event) =>
                          setRequestForm((previous) => ({
                            ...previous,
                            service: event.target.value,
                          }))
                        }
                      >
                        {SERVICES.map((service) => (
                          <option key={service} value={service}>{service}</option>
                        ))}
                      </select>
                    </label>

                    <label>
                      Décrivez votre besoin
                      <textarea
                        rows="6"
                        required
                        value={requestForm.description}
                        onChange={(event) =>
                          setRequestForm((previous) => ({
                            ...previous,
                            description: event.target.value,
                          }))
                        }
                        placeholder="Présentez votre objectif, votre contexte et vos attentes..."
                      />
                    </label>

                    <button className="btn primary" type="submit" disabled={saving}>
                      {saving ? "Envoi en cours..." : "Envoyer ma demande"}
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
                      Vous n'avez pas encore envoyé de demande. Utilisez le
                      formulaire pour présenter votre premier besoin à RAWAGO.
                    </p>
                  ) : (
                    <div className="request-list">
                      {requests.map((item) => (
                        <article className="request-item" key={item.id}>
                          {editingRequestId === item.id ? (
                            <form className="auth-form" onSubmit={event => saveRequestEdit(event, item.id)}>
                              <h3>Modifier ma demande</h3>
                              <label>
                                Service souhaité
                                <select
                                  value={requestEditForm.service}
                                  onChange={event => setRequestEditForm(previous => ({ ...previous, service: event.target.value }))}
                                >
                                  {SERVICES.map(service => <option key={service} value={service}>{service}</option>)}
                                </select>
                              </label>
                              <label>
                                Description
                                <textarea
                                  rows="5"
                                  required
                                  value={requestEditForm.description}
                                  onChange={event => setRequestEditForm(previous => ({ ...previous, description: event.target.value }))}
                                />
                              </label>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
                                <button className="btn primary" type="submit" disabled={requestActionSaving}>
                                  {requestActionSaving ? "Enregistrement..." : "Enregistrer"}
                                </button>
                                <button className="btn secondary" type="button" onClick={cancelRequestEdit} disabled={requestActionSaving}>
                                  Annuler
                                </button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <div className="request-item-top">
                                <b>{item.service}</b>
                                <span className={`status status-${item.status || "pending"}`}>
                                  {STATUS_LABELS[item.status] || "Statut à préciser"}
                                </span>
                              </div>
                              <p style={{ whiteSpace: "pre-wrap" }}>{item.description}</p>
                              <small>Envoyée le {formatDate(item.created_at)}</small>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "12px" }}>
                                <button className="btn secondary" type="button" onClick={() => startRequestEdit(item)} disabled={requestActionSaving}>
                                  Modifier
                                </button>
                                <button className="btn secondary" type="button" onClick={() => deleteRequest(item.id)} disabled={requestActionSaving}>
                                  Supprimer
                                </button>
                              </div>
                            </>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              )}

              {clientSection === "documents" && (
                <section className="dashboard-panel">
                  <div className="eyebrow">VOS FICHIERS</div>
                  <h2>Mes documents partagés</h2>
                  <p>Retrouvez les documents échangés avec RAWAGO dans votre messagerie privée.</p>
                  {messages.filter(item => item.attachment_path).length === 0 ? (
                    <p className="empty-state">Aucun document partagé pour le moment.</p>
                  ) : (
                    <div className="request-list">
                      {messages.filter(item => item.attachment_path).map(item => (
                        <article className="request-item" key={item.id}>
                          <div className="request-item-top">
                            <strong>{item.attachment_name || "Document partagé"}</strong>
                            <small>{formatDate(item.created_at)}</small>
                          </div>
                          <p>{item.sender_id === session.user.id ? "Envoyé par vous" : "Envoyé par l’équipe"}</p>
                          <button
                            type="button"
                            className="btn secondary"
                            onClick={() => openChatAttachment(item.attachment_path)}
                          >
                            <span aria-hidden="true">📎</span> Ouvrir le document
                          </button>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {clientSection === "messages" && (
              <section className="dashboard-panel" style={{ marginTop: "24px" }}>
                <div className="eyebrow">ÉCHANGES PRIVÉS</div>
                <h2>Ma messagerie {notificationCount > 0 && <span className="status status-pending">{notificationCount} nouveau(x)</span>}</h2>
                <p>Échanges privés avec notre équipe.</p>
                <p style={{ margin: "0 0 12px", fontSize: "0.9rem" }}>
                  <span style={{ color: adminOnline ? "#159B96" : "#8a8a8a" }}>●</span>
                  {" "}{adminOnline ? "Équipe en ligne" : "Équipe hors ligne"}
                </p>
                {adminTyping && <p style={{ fontStyle: "italic", color: "#64748b" }}>L’équipe écrit…</p>}

                <div
                  className="request-list"
                  aria-live="polite"
                  style={{
                    maxHeight: "360px",
                    overflowY: "auto",
                    padding: "16px",
                    background: "#f5f1e8",
                    borderRadius: "10px",
                    marginBottom: "16px"
                  }}
                >
                  {messages.length === 0 ? (
                    <p className="empty-state">Aucun message pour le moment. Vous pouvez contacter notre équipe à l'aide du formulaire ci-dessous.</p>
                  ) : (
                    messages.map(item => (
                      <article
                        className="request-item"
                        key={item.id}
                        style={{
                          maxWidth: "85%",
                          marginLeft: item.sender_id === session.user.id ? "auto" : "0",
                          background: item.sender_id === session.user.id ? "#e2f2ef" : "#ffffff"
                        }}
                      >
                        <strong>{item.sender_id === session.user.id ? "Vous" : "Équipe"}</strong>
                        <p style={{ whiteSpace: "pre-wrap", fontStyle: item.deleted_at ? "italic" : "normal" }}>{item.body}</p>
                        {item.edited_at && !item.deleted_at && <small> · Modifié par l’équipe</small>}
                        {item.attachment_path && !item.deleted_at && (
                          <button
                            type="button"
                            className="btn secondary"
                            onClick={() => openChatAttachment(item.attachment_path)}
                            style={{ marginTop: "8px" }}
                          >
                            <span aria-hidden="true">📎</span> {item.attachment_name || "Ouvrir la pièce jointe"}
                          </button>
                        )}
                        <small>
                          {new Date(item.created_at).toLocaleString("fr-FR")}
                          {item.sender_id === session.user.id && (
                            <span> · {item.read_at ? "Lu par l’équipe" : "Envoyé"}</span>
                          )}
                        </small>
                      </article>
                    ))
                  )}
                </div>

                <form className="auth-form" onSubmit={handleMessageSubmit}>
                  <label>
                    Votre message
                    <textarea
                      rows="4"
                      maxLength="10000"
                      value={messageDraft}
                      onChange={event => {
                        setMessageDraft(event.target.value);
                        broadcastClientTyping(Boolean(event.target.value.trim()));
                      }}
                      onBlur={() => broadcastClientTyping(false)}
                      placeholder="Écrivez votre message à notre équipe..."
                    />
                  </label>
                  <label style={{ display: "block", margin: "12px 0" }}>
                    Joindre un document ou une image (10 Mo maximum)
                    <input
                      id="rawago-client-attachment"
                      type="file"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                      onChange={event => setMessageAttachment(event.target.files?.[0] || null)}
                    />
                  </label>
                  {messageAttachment && <small>Fichier sélectionné : {messageAttachment.name}</small>}
                  <button className="btn primary" type="submit" disabled={messageSaving || (!messageDraft.trim() && !messageAttachment)}>
                    {messageSaving ? "Envoi..." : "Envoyer le message"}
                  </button>
                </form>
              </section>
              )}

              {clientSection === "learning" && (
                <section className="dashboard-panel">
                  <div className="eyebrow">RESSOURCES & PROGRESSION</div><h2>Mon accompagnement pédagogique</h2>
                  <p>Retrouvez les supports, exercices et consignes partagés par votre accompagnateur RAWAGO.</p>
                  {learningItems.length === 0 ? <div className="client-empty">Aucune ressource pédagogique ne vous a encore été attribuée.</div> :
                    <div className="client-module-list">{learningItems.map(item => <article className="client-module-row" key={item.id}><h3>{item.title}</h3><p>{item.description}</p><div className="client-module-meta"><span className="client-tag">{item.subject || "Ressource"}</span>{item.due_date && <span>À consulter avant le {formatDate(item.due_date)}</span>}</div>{item.resource_url && <a className="btn secondary" href={item.resource_url} target="_blank" rel="noreferrer">Ouvrir le support →</a>}</article>)}</div>}
                </section>
              )}

              {clientSection === "books" && (
                <div className="client-module-grid">
                  <section className="client-module-card"><div className="eyebrow">RECHERCHE DOCUMENTAIRE</div><h2>Demander un livre</h2><p>Indiquez le titre ou le sujet recherché. L'équipe RAWAGO vous répondra dans votre espace client.</p>
                    <form className="client-module-form" onSubmit={submitBookRequest}>
                      <label>Titre du livre<input required value={bookForm.title} onChange={event => setBookForm(previous => ({ ...previous, title: event.target.value }))} /></label>
                      <label>Auteur<input value={bookForm.author} onChange={event => setBookForm(previous => ({ ...previous, author: event.target.value }))} /></label>
                      <label>Niveau d'étude<input value={bookForm.level} onChange={event => setBookForm(previous => ({ ...previous, level: event.target.value }))} placeholder="Collège, Lycée, Licence, Master..." /></label>
                      <label>Précisions<textarea rows="3" value={bookForm.details} onChange={event => setBookForm(previous => ({ ...previous, details: event.target.value }))} /></label>
                      <button className="btn primary" disabled={portalSaving}>{portalSaving ? "Envoi..." : "Envoyer ma recherche"}</button>
                    </form>
                  </section>
                  <section className="client-module-card"><div className="eyebrow">MES RECHERCHES</div><h2>Historique des demandes</h2>
                    {bookRequests.length === 0 ? <div className="client-empty">Aucune demande de livre pour le moment.</div> : <div className="client-module-list">{bookRequests.map(item => <article className="client-module-row" key={item.id}><h3>{item.title}</h3><p>{item.author || "Auteur non précisé"}</p><div className="client-module-meta"><span className="client-tag">{({received:"Reçue",searching:"Recherche en cours",available:"Disponible",unavailable:"Indisponible",ordered:"Commandé",delivered:"Livré",cancelled:"Annulée"})[item.status] || "Reçue"}</span><span>{formatDate(item.created_at)}</span>{item.quoted_price != null && <strong>{Number(item.quoted_price).toLocaleString("fr-FR")} {item.currency || "FCFA"}</strong>}</div></article>)}</div>}
                  </section>
                </div>
              )}

              {clientSection === "appointments" && (
                <div className="client-module-grid">
                  <section className="client-module-card"><div className="eyebrow">PRISE DE CONTACT</div><h2>Demander un rendez-vous</h2><p>Proposez vos disponibilités. L'équipe RAWAGO vous confirmera le créneau par la messagerie.</p>
                    <form className="client-module-form" onSubmit={submitAppointmentRequest}>
                      <label>Motif du rendez-vous<input required value={appointmentForm.subject} onChange={event => setAppointmentForm(previous => ({ ...previous, subject: event.target.value }))} /></label>
                      <label>Date souhaitée<input type="date" min={new Date().toISOString().slice(0,10)} value={appointmentForm.preferred_date} onChange={event => setAppointmentForm(previous => ({ ...previous, preferred_date: event.target.value }))} /></label>
                      <label>Heure souhaitée<input type="time" value={appointmentForm.preferred_time} onChange={event => setAppointmentForm(previous => ({ ...previous, preferred_time: event.target.value }))} /></label>
                      <label>Modalité<select value={appointmentForm.mode} onChange={event => setAppointmentForm(previous => ({ ...previous, mode: event.target.value }))}><option value="distance">À distance</option><option value="in_person">En présentiel (Sénégal)</option><option value="phone">Par téléphone</option></select></label>
                      <label>Informations complémentaires<textarea rows="4" required value={appointmentForm.details} onChange={event => setAppointmentForm(previous => ({ ...previous, details: event.target.value }))} /></label>
                      <button className="btn primary" disabled={portalSaving}>{portalSaving ? "Envoi..." : "Envoyer ma demande de rendez-vous"}</button>
                    </form>
                  </section>
                  <section className="client-module-card"><div className="eyebrow">MES DEMANDES DE RENDEZ-VOUS</div><h2>Suivi</h2>
                    {appointments.length === 0 ? <div className="client-empty">Aucune demande de rendez-vous pour le moment.</div> : <div className="client-module-list">{appointments.map(item => <article className="client-module-row" key={item.id}><h3>{item.subject}</h3><p>{item.details}</p>{item.admin_note && <p><strong>Message de RAWAGO :</strong> {item.admin_note}</p>}<div className="client-module-meta"><span className="client-tag">{item.status === "confirmed" ? "Confirmé" : item.status === "cancelled" ? "Annulé" : item.status === "completed" ? "Terminé" : "En attente de confirmation"}</span><span>{item.preferred_date ? formatDate(item.preferred_date) : "Date flexible"} {item.preferred_time || ""}</span><span>{item.mode === "in_person" ? "Présentiel" : item.mode === "phone" ? "Téléphone" : "À distance"}</span></div></article>)}</div>}
                  </section>
                </div>
              )}

              {clientSection === "payments" && (
                <section className="dashboard-panel"><div className="eyebrow">SUIVI FINANCIER</div><h2>Mes paiements et factures</h2><p>Le paiement en ligne sera activé dans une prochaine phase. Aucun paiement n'est demandé depuis cette page pour le moment.</p><div className="client-module-grid"><div className="client-module-card"><h3>Wave & Orange Money</h3><p>Les paiements mobiles seront proposés après activation du module sécurisé.</p><span className="client-tag">Prévu en phase 2</span></div><div className="client-module-card"><h3>Carte bancaire</h3><p>Le règlement par carte et le téléchargement des factures seront intégrés ultérieurement.</p><span className="client-tag">Prévu en phase 2</span></div></div></section>
              )}

              {clientSection === "notifications" && (
                <section className="dashboard-panel"><div className="eyebrow">CENTRE DE NOTIFICATIONS</div><h2>Mes notifications</h2>
                  {clientNotifications.length === 0 ? <div className="client-empty">Vous n'avez pas encore de notification.</div> : <div className="client-module-list">{clientNotifications.map(item => <article className="client-module-row" key={item.id}><div className="request-item-top"><h3>{item.title}</h3>{!item.read_at && <span className="client-tag">Non lue</span>}</div><p>{item.body}</p><div className="client-module-meta"><span>{formatDate(item.created_at)}</span>{item.action_url && <a href={item.action_url}>Consulter →</a>}{!item.read_at && <button className="btn secondary" type="button" onClick={() => markNotificationRead(item)}>Marquer comme lue</button>}</div></article>)}</div>}
                </section>
              )}

              {clientSection === "favorites" && (
                <section className="dashboard-panel"><div className="eyebrow">MA SÉLECTION</div><h2>Mes favoris</h2><p>Les ressources et livres que vous choisissez de conserver seront regroupés ici.</p>
                  <form className="client-module-form" onSubmit={addFavorite}>
                    <label>Nom de la ressource<input required value={favoriteForm.title} onChange={event => setFavoriteForm(previous => ({...previous,title:event.target.value}))} placeholder="Titre du livre ou de la ressource" /></label>
                    <label>Lien de la ressource<input required type="url" value={favoriteForm.resource_url} onChange={event => setFavoriteForm(previous => ({...previous,resource_url:event.target.value}))} placeholder="https://..." /></label>
                    <label>Type<select value={favoriteForm.resource_type} onChange={event => setFavoriteForm(previous => ({...previous,resource_type:event.target.value}))}><option value="resource">Ressource</option><option value="book">Livre</option><option value="article">Article</option><option value="website">Site web</option></select></label>
                    <button className="btn primary" disabled={portalSaving}>{portalSaving ? "Ajout..." : "Ajouter aux favoris"}</button>
                  </form>
                  {favorites.length === 0 ? <div className="client-empty" style={{marginTop:16}}>Aucun favori enregistré pour le moment.</div> : <div className="client-module-list">{favorites.map(item => <article className="client-module-row" key={item.id}><h3>{item.title}</h3><div className="client-module-meta"><span className="client-tag">{item.resource_type}</span>{item.resource_url && <a href={item.resource_url} target="_blank" rel="noreferrer">Ouvrir →</a>}<button className="btn secondary" type="button" onClick={() => toggleFavorite(item)}>Retirer des favoris</button></div></article>)}</div>}
                </section>
              )}

              {clientSection === "help" && (
                <div className="client-module-grid"><section className="client-module-card"><div className="eyebrow">ASSISTANCE RAWAGO</div><h2>Comment pouvons-nous vous aider ?</h2>
                  <form className="client-module-form" onSubmit={submitSupportTicket}><label>Objet<select value={supportForm.subject} onChange={event => setSupportForm(previous => ({ ...previous, subject: event.target.value }))}><option>Question sur une prestation</option><option>Problème de compte</option><option>Question sur une commande de livre</option><option>Question sur un rendez-vous</option><option>Autre demande</option></select></label><label>Votre message<textarea rows="5" required value={supportForm.message} onChange={event => setSupportForm(previous => ({ ...previous, message: event.target.value }))} /></label><button className="btn primary" disabled={portalSaving}>{portalSaving ? "Envoi..." : "Envoyer à l'assistance"}</button></form>
                </section><section className="client-module-card"><div className="eyebrow">MES TICKETS</div><h2>Mes demandes d'aide</h2>
                  {supportTickets.length === 0 ? <div className="client-empty">Aucune demande d'assistance.</div> : <div className="client-module-list">{supportTickets.map(item => <article className="client-module-row" key={item.id}><h3>{item.subject}</h3><p>{item.message}</p>{item.admin_reply && <p><strong>Réponse de RAWAGO :</strong> {item.admin_reply}</p>}<div className="client-module-meta"><span className="client-tag">{item.status === "closed" ? "Clôturée" : item.status === "in_progress" ? "En cours" : "Ouverte"}</span><span>{formatDate(item.created_at)}</span></div></article>)}</div>}
                </section></div>
              )}

              {clientSection === "activity" && (
                <section className="dashboard-panel"><div className="eyebrow">TRANSPARENCE & SUIVI</div><h2>Historique de mon compte</h2>
                  {activityLogs.length === 0 ? <div className="client-empty">Votre historique apparaîtra au fil de vos actions dans l'espace client.</div> : <div className="client-module-list">{activityLogs.map(item => <article className="client-module-row" key={item.id}><h3>{({appointment_requested:"Demande de rendez-vous envoyée",book_request_created:"Recherche de livre envoyée",support_ticket_created:"Demande d'assistance créée"})[item.action] || item.action}</h3><div className="client-module-meta"><span>{formatDate(item.created_at)}</span></div></article>)}</div>}
                </section>
              )}

              {clientSection === "settings" && (
                <div className="client-settings-grid">
                  <section className="dashboard-panel client-settings-card">
                    <div className="eyebrow">INFORMATIONS PERSONNELLES</div>
                    <h2>Mon profil</h2>
                    <p>Gérez votre photo et les informations associées à votre compte RAWAGO.</p>
                    <form className="auth-form" onSubmit={handleProfileSave}>
                      <div className="client-avatar-editor">
                        {avatarPreview ? <img src={avatarPreview} alt="Photo de profil" /> : <span>{(profileForm.fullName || session.user.email || "R").charAt(0).toUpperCase()}</span>}
                        <label className="client-avatar-upload" htmlFor="rawago-avatar-input">Ajouter une photo</label>
                        <input id="rawago-avatar-input" type="file" accept="image/png,image/jpeg,image/webp" onChange={event => {
                          const file = event.target.files?.[0] || null; setAvatarFile(file);
                          if (file) setAvatarPreview(URL.createObjectURL(file));
                        }} />
                        <small>JPG, PNG ou WebP · 5 Mo maximum</small>
                        {avatarPreview && <button className="btn secondary" type="button" onClick={() => { setAvatarPreview(""); setAvatarFile(null); const input = document.getElementById("rawago-avatar-input"); if (input) input.value = ""; }}>Retirer la photo</button>}
                      </div>
                      <label>Nom complet<input value={profileForm.fullName} onChange={event => setProfileForm(previous => ({ ...previous, fullName: event.target.value }))} required autoComplete="name" /></label>
                      <label>Téléphone<input value={profileForm.phone} onChange={event => setProfileForm(previous => ({ ...previous, phone: event.target.value }))} autoComplete="tel" placeholder="Votre numéro de téléphone" /></label>
                      <button className="btn primary" type="submit" disabled={profileSaving}>{profileSaving ? "Enregistrement..." : "Enregistrer mon profil"}</button>
                    </form>
                  </section>

                  <div className="client-settings-stack">
                    <section className="dashboard-panel client-settings-card">
                      <div className="eyebrow">SÉCURITÉ</div>
                      <h2>Modifier mon mot de passe</h2>
                      <p>Choisissez un mot de passe personnel d'au moins 8 caractères.</p>
                      <form className="auth-form" onSubmit={handlePasswordChange}>
                        <label>Mot de passe actuel<input type="password" autoComplete="current-password" value={passwordForm.currentPassword} onChange={event => setPasswordForm(previous => ({ ...previous, currentPassword: event.target.value }))} required /></label>
                        <label>Nouveau mot de passe<input type="password" minLength="8" autoComplete="new-password" value={passwordForm.newPassword} onChange={event => setPasswordForm(previous => ({ ...previous, newPassword: event.target.value }))} required /></label>
                        <label>Confirmer le nouveau mot de passe<input type="password" minLength="8" autoComplete="new-password" value={passwordForm.confirmPassword} onChange={event => setPasswordForm(previous => ({ ...previous, confirmPassword: event.target.value }))} required /></label>
                        <button className="btn primary" type="submit" disabled={passwordSaving}>{passwordSaving ? "Modification..." : "Mettre à jour le mot de passe"}</button>
                      </form>
                    </section>

                    <section className="dashboard-panel client-settings-card">
                      <div className="eyebrow">COORDONNÉES DE CONNEXION</div>
                      <h2>Adresse e-mail</h2>
                      <p>Une confirmation sera demandée avant que la nouvelle adresse soit utilisée.</p>
                      <form className="auth-form" onSubmit={handleEmailChange}>
                        <label>Adresse e-mail actuelle<input type="email" value={session.user.email || ""} readOnly /></label>
                        <label>Nouvelle adresse e-mail<input type="email" value={emailForm.email} onChange={event => setEmailForm({ email: event.target.value })} required autoComplete="email" /></label>
                        <button className="btn secondary" type="submit" disabled={emailSaving || emailForm.email.trim() === session.user.email}>{emailSaving ? "Envoi..." : "Demander le changement d'e-mail"}</button>
                      </form>
                    </section>

                    <section className="dashboard-panel client-settings-card">
                      <div className="eyebrow">MES PRÉFÉRENCES</div>
                      <h2>Notifications et communication</h2>
                      <p>Choisissez les informations que vous souhaitez recevoir dans votre espace client.</p>
                      <form className="auth-form" onSubmit={saveClientPreferences}>
                        {[
                          ["email_updates", "Afficher les mises à jour de mes demandes"],
                          ["email_messages", "Afficher les nouveaux messages"],
                          ["email_appointments", "Afficher les confirmations de rendez-vous"],
                          ["product_updates", "Afficher les actualités et nouveautés RAWAGO"]
                        ].map(([key, label]) => (
                          <label key={key} style={{display:"flex",alignItems:"center",gap:10}}>
                            <input type="checkbox" checked={Boolean(clientPreferences[key])} onChange={event => setClientPreferences(previous => ({...previous,[key]:event.target.checked}))} />
                            <span>{label}</span>
                          </label>
                        ))}
                        <button className="btn primary" type="submit" disabled={portalSaving}>{portalSaving ? "Enregistrement..." : "Enregistrer mes préférences"}</button>
                      </form>
                    </section>

                    <section className="dashboard-panel client-settings-card client-security-note">
                      <div className="eyebrow">BONNES PRATIQUES</div>
                      <h3>Protégez votre compte</h3>
                      <ul>
                        <li>Ne partagez jamais votre mot de passe.</li>
                        <li>Utilisez un mot de passe unique et difficile à deviner.</li>
                        <li>Déconnectez-vous après utilisation sur un appareil partagé.</li>
                      </ul>
                      <button className="btn secondary" type="button" onClick={handleSignOut}>Me déconnecter</button>
                    </section>
                  </div>
                </div>
              )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

export default ClientArea;

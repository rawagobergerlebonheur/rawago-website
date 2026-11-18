import BookOrdersAdmin from "./BookOrdersAdmin";
import EventsAdmin from "./EventsAdmin";

import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabase";

const bookCategories = [
  'Arts, culture et créativité',
  'Arts, santé et bien-être',
  'Biographies et autobiographies',
  'Culture générale et savoirs du monde',
  'Droit et citoyenneté',
  'Droit et sciences politiques',
  'Développement personnel et ressources professionnelles',
  'Environnement et développement durable',
  'Histoire africaine',
  'Histoire et géographie',
  'Histoire générale',
  'Littérature classique',
  'Littérature contemporaine',
  'Méthodologie et recherche',
  'Philosophie',
  'Philosophie et religions',
  'Poésie',
  'Psychologie et développement personnel',
  'Religion, spiritualités et sociétés',
  'Romans africains et francophones',
  'Romans et littérature',
  'Sciences et technologie',
  'Sociologie et anthropologie',
  'Technologie et ingénierie',
  'Théâtre',
  'Économie et entrepreneuriat',
  'Économie et finances',
  'Éducation et pédagogie',
  'Éducation et sciences sociales'
];

const bulkSearches = [
  {
    category: "Droit et sciences politiques",
    target: 100,
    query: 'mediatype:texts AND (subject:law OR subject:economics OR subject:"political science" OR subject:sociology OR subject:philosophy)'
  },
  {
    category: "Histoire africaine",
    target: 100,
    query: 'mediatype:texts AND (subject:"African history" OR subject:Senegal OR subject:"international relations")'
  },
  {
    category: "Méthodologie et recherche",
    target: 100,
    query: 'mediatype:texts AND (subject:"research methodology" OR subject:"academic writing" OR subject:"research methods")'
  },
  {
    category: "Romans et littérature",
    target: 100,
    query: 'mediatype:texts AND (subject:fiction OR subject:novels OR subject:"African literature" OR subject:literature)'
  },
  {
    category: "Développement personnel et ressources professionnelles",
    target: 100,
    query: 'mediatype:texts AND (subject:"self help" OR subject:"personal development" OR subject:leadership OR subject:motivation)'
  },
  {
    category: "Culture générale et savoirs du monde",
    target: 30,
    query: 'mediatype:texts AND (subject:geopolitics OR subject:education OR subject:culture OR subject:general knowledge)'
  },
  {
    category: "Économie et entrepreneuriat",
    target: 30,
    query: 'mediatype:texts AND (subject:management OR subject:entrepreneurship OR subject:leadership OR subject:business)'
  },
  {
    category: "Biographies et autobiographies",
    target: 30,
    query: 'mediatype:texts AND (subject:biography OR subject:autobiography OR subject:"biographical literature")'
  },
  {
    category: "Philosophie et religions",
    target: 30,
    query: 'mediatype:texts AND (subject:philosophy OR subject:"philosophical thought" OR subject:ethics)'
  },
  {
    category: "Sciences et technologie",
    target: 30,
    query: 'mediatype:texts AND (subject:science OR subject:technology OR subject:innovation OR subject:computing)'
  },
  {
    category: "Arts, culture et créativité",
    target: 30,
    query: 'mediatype:texts AND (subject:arts OR subject:music OR subject:cinema OR subject:creativity)'
  },
  {
    category: "Éducation et sciences sociales",
    target: 30,
    query: 'mediatype:texts AND (subject:education OR subject:society OR subject:citizenship OR subject:"human rights")'
  },
  {
    category: "Environnement et développement durable",
    target: 30,
    query: 'mediatype:texts AND (subject:environment OR subject:climate OR subject:biodiversity OR subject:sustainability)'
  }
];

const articleTarget = 100;

function toArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function cleanText(value) {
  if (!value) return "";

  return String(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatCrossrefDate(item) {
  const date =
    item["published-print"] ||
    item["published-online"] ||
    item.created;

  const parts = date?.["date-parts"]?.[0];

  return parts ? parts.join("-") : "";
}

// Licences explicitement ouvertes et compatibles avec une réutilisation,
// sous réserve de respecter leurs conditions (attribution, partage à l'identique).
function approvedLicense(url) {
  if (!url) return false;

  const normalized = String(url)
    .trim()
    .toLowerCase()
    .replace(/^http:\/\//, "https://")
    .replace(/\/$/, "");

  return [
    "https://creativecommons.org/publicdomain/zero/1.0",
    "https://creativecommons.org/licenses/by/4.0",
    "https://creativecommons.org/licenses/by-sa/4.0",
    "https://creativecommons.org/licenses/by/3.0",
    "https://creativecommons.org/licenses/by-sa/3.0"
  ].includes(normalized);
}

function getCrossrefOpenLicense(item) {
  const today = new Date().toISOString().slice(0, 10);
  const licenses = item?.license || [];

  return licenses.find(license => {
    const version = String(license["content-version"] || "").toLowerCase();
    const start = license.start?.["date-parts"]?.[0]?.join("-") || "";
    const appliesToUsableVersion = !version || ["vor", "am", "unspecified"].includes(version);
    const alreadyEffective = !start || start <= today;
    return appliesToUsableVersion && alreadyEffective && approvedLicense(license.URL);
  }) || null;
}


function normalizeCatalogValue(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function catalogDuplicateKey(book) {
  const isbn = String(book?.isbn || "").replace(/[^0-9Xx]/g, "").toUpperCase();
  if (isbn.length >= 10) return `isbn:${isbn}`;

  const title = normalizeCatalogValue(book?.title);
  const rawAuthors = Array.isArray(book?.authors)
    ? book.authors
    : book?.authors
      ? String(book.authors).split(/[;,|]/)
      : [];
  const authors = rawAuthors
    .map(normalizeCatalogValue)
    .filter(Boolean)
    .sort()
    .join(" ");

  // Sans auteur ni ISBN, un titre seul ne suffit pas à écarter une notice.
  return title && authors ? `title-author:${title}::${authors}` : null;
}

function parseCatalogCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i], next = text[i + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell); cell = "";
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (cell.length || row.length) { row.push(cell); if (row.some(value => value.trim())) rows.push(row); }
  if (rows.length < 2) throw new Error("Le fichier CSV est vide ou ne contient aucune ligne de données.");
  const headers = rows[0].map(value => normalizeCatalogValue(value));
  const find = (...names) => names.map(name => headers.indexOf(normalizeCatalogValue(name))).find(index => index >= 0);
  const columns = {
    title: find("title", "titre"),
    authors: find("authors", "author", "auteurs", "auteur"),
    category: find("category", "categorie", "catégorie"),
    description: find("description", "resume", "résumé"),
    publisher: find("publisher", "editeur", "éditeur"),
    published_date: find("published_date", "date", "annee", "année"),
    isbn: find("isbn"),
    cover_url: find("cover_url", "couverture", "image"),
    language: find("language", "langue"),
    is_active: find("is_active", "actif", "publie", "publié"),
    rights_status: find("rights_status", "statut_droits", "droits")
  };
  if (columns.title == null) throw new Error("La colonne « title » ou « titre » est obligatoire.");
  return rows.slice(1).map((values, index) => {
    const get = key => columns[key] == null ? "" : String(values[columns[key]] || "").trim();
    const title = get("title");
    if (!title) return null;
    const rawAuthors = get("authors");
    return {
      title,
      authors: rawAuthors ? rawAuthors.split(/\s*[;|]\s*/).filter(Boolean) : [],
      category: get("category") || "Droit et sciences politiques",
      description: get("description") || null,
      publisher: get("publisher") || null,
      published_date: get("published_date") || null,
      isbn: get("isbn") || null,
      cover_url: get("cover_url") || null,
      language: get("language") || "fr",
      source: get("source") || "Import CSV RAWAGO",
      source_id: `csv-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      rights_status: get("rights_status") || "pending",
      // Les notices du fichier RAWAGO restent en attente tant que leurs métadonnées ne sont pas vérifiées.
      is_active: columns.is_active == null
        ? false
        : !["false", "0", "non", "no", "inactif", "brouillon"].includes(
            normalizeCatalogValue(get("is_active"))
          ),
      license_url: null,
      rights_evidence: "Notice importée depuis un fichier CSV. Les droits de l'ouvrage et du fichier restent à vérifier.",
      rights_checked_at: null
    };
  }).filter(Boolean);
}

function Admin() {
  const [activeAdminPage, setActiveAdminPage] = useState("dashboard");
  const [adminSidebarCollapsed, setAdminSidebarCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [requests, setRequests] = useState([]);
  const [contactRequests, setContactRequests] = useState([]);
  const [contactRequestsError, setContactRequestsError] = useState("");
  const [clients, setClients] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingMessageBody, setEditingMessageBody] = useState("");
  const [adminUserId, setAdminUserId] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminFullName, setAdminFullName] = useState("");
  const [accountEmailInput, setAccountEmailInput] = useState("");
  const [accountNameInput, setAccountNameInput] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountPasswordConfirm, setAccountPasswordConfirm] = useState("");
  const [accountSaving, setAccountSaving] = useState(false);
  const [accountNotice, setAccountNotice] = useState("");
  const [accountError, setAccountError] = useState("");
  const [messages, setMessages] = useState([]);
  const [selectedMessageClient, setSelectedMessageClient] = useState("");
  const [chatClientSearch, setChatClientSearch] = useState("");
  const [adminReply, setAdminReply] = useState("");
  const [adminAttachment, setAdminAttachment] = useState(null);
  const [messageSaving, setMessageSaving] = useState(false);
  const [messageError, setMessageError] = useState("");
  const [messageNotice, setMessageNotice] = useState("");
  const [clientOnline, setClientOnline] = useState(false);
  const [clientTyping, setClientTyping] = useState(false);
  const [notification, setNotification] = useState("");
  const knownAdminMessageIds = useRef(new Set());
  const chatPresenceChannelRef = useRef(null);

  const [bookSearch, setBookSearch] = useState("");
  const [bookCategory, setBookCategory] = useState(bookCategories[0]);
  const [bookResults, setBookResults] = useState([]);
  const [searchingBooks, setSearchingBooks] = useState(false);
  const [bookError, setBookError] = useState("");
  const [bookMessage, setBookMessage] = useState("");
  const [importingBook, setImportingBook] = useState(null);
  const [importedBooks, setImportedBooks] = useState([]);

  const [adminNotes, setAdminNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [notesError, setNotesError] = useState("");
  const [notesNotice, setNotesNotice] = useState("");
  const [editingNoteId, setEditingNoteId] = useState(null);

  // Publications de la rubrique « Savoirs et réflexions »
  const [knowledgeArticles, setKnowledgeArticles] = useState([]);
  const [knowledgeLoading, setKnowledgeLoading] = useState(false);
  const [knowledgeSaving, setKnowledgeSaving] = useState(false);
  const [knowledgeError, setKnowledgeError] = useState("");
  const [knowledgeNotice, setKnowledgeNotice] = useState("");
  const [editingKnowledgeId, setEditingKnowledgeId] = useState(null);
  const [knowledgeTitle, setKnowledgeTitle] = useState("");
  const [knowledgeCategory, setKnowledgeCategory] = useState("ÉDUCATION");
  const [knowledgeSummary, setKnowledgeSummary] = useState("");
  const [knowledgeContent, setKnowledgeContent] = useState("");
  const [knowledgeImage, setKnowledgeImage] = useState("");
  const [knowledgeStatus, setKnowledgeStatus] = useState("draft");
  const knowledgeCategories = ["ÉDUCATION", "MÉTHODOLOGIE", "CULTURE GÉNÉRALE", "RECHERCHE", "LITTÉRATURE", "SOCIÉTÉ", "HISTOIRE", "PHILOSOPHIE"];

  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState("");
  const [bulkError, setBulkError] = useState("");
  const [bulkSummary, setBulkSummary] = useState([]);

  // Gestion et validation du catalogue documentaire
  const [catalogBooks, setCatalogBooks] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [catalogMessage, setCatalogMessage] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogFilter, setCatalogFilter] = useState("all");
  const [catalogSaving, setCatalogSaving] = useState(null);
  const [rightsScanning, setRightsScanning] = useState(false);
  const [rightsProgress, setRightsProgress] = useState("");
  const [rightsSummary, setRightsSummary] = useState(null);
  const [csvPreview, setCsvPreview] = useState([]);
  const [csvFileName, setCsvFileName] = useState("");
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvMode, setCsvMode] = useState("append");
  const [csvNotice, setCsvNotice] = useState("");


  useEffect(() => {
    if (!authorized) return;
    let active = true;
    async function loadKnowledgeArticles() {
      setKnowledgeLoading(true);
      setKnowledgeError("");
      const { data, error: loadError } = await supabase
        .from("knowledge_articles")
        .select("*")
        .order("updated_at", { ascending: false });
      if (!active) return;
      if (loadError) setKnowledgeError("Impossible de charger les publications : " + loadError.message);
      else setKnowledgeArticles(data || []);
      setKnowledgeLoading(false);
    }
    loadKnowledgeArticles();
    return () => { active = false; };
  }, [authorized]);

  useEffect(() => {
    if (!authorized) return;
    let active = true;

    async function loadNotes() {
      setNotesLoading(true);
      setNotesError("");
      const { data, error: loadError } = await supabase
        .from("admin_notes")
        .select("id, admin_id, title, body, created_at, updated_at")
        .order("updated_at", { ascending: false });

      if (!active) return;
      if (loadError) setNotesError("Impossible de charger les notes : " + loadError.message);
      else setAdminNotes(data || []);
      setNotesLoading(false);
    }

    loadNotes();
    return () => { active = false; };
  }, [authorized]);

  useEffect(() => {
    let active = true;

    async function loadAdminData() {
      const { data: sessionData } =
        await supabase.auth.getSession();

      const session = sessionData.session;

      if (!session) {
        if (active) {
          setError("Veuillez vous connecter.");
          setLoading(false);
        }
        return;
      }

      const { data: profile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role, full_name")
          .eq("id", session.user.id)
          .maybeSingle();

      if (!active) return;

      if (profileError || profile?.role !== "admin") {
        setError("Accès réservé aux administrateurs.");
        setLoading(false);
        return;
      }

      setAuthorized(true);
      setAdminUserId(session.user.id);
      setAdminEmail(session.user.email || "");
      setAccountEmailInput(session.user.email || "");
      const initialAdminName = profile?.full_name || session.user.user_metadata?.full_name || "";
      setAdminFullName(initialAdminName);
      setAccountNameInput(initialAdminName);

      const [requestsResult, contactRequestsResult, clientsResult, catalogResult, messagesResult] =
        await Promise.all([
          supabase
            .from("service_requests")
            .select("*")
            .order("created_at", { ascending: false }),

          supabase
            .from("contact_requests")
            .select("id, name, email, country, service, message, created_at")
            .order("created_at", { ascending: false }),

          supabase
            .from("profiles")
            .select("id, full_name, phone, country, created_at"),

          supabase
            .from("books_catalog")
            .select("id, title, authors, description, publisher, published_date, category, source, source_id, cover_url, rights_status, is_active, license_url, rights_evidence, rights_checked_at")
            .order("title", { ascending: true })
            .limit(1000),

          supabase
            .from("client_messages")
            .select("*")
            .order("created_at", { ascending: true })
            .limit(2000)
        ]);

      if (!active) return;

      if (requestsResult.error) {
        setError(requestsResult.error.message);
      } else {
        setRequests(requestsResult.data || []);
      }

      if (contactRequestsResult.error) {
        setContactRequestsError("Impossible de charger les demandes du formulaire de contact : " + contactRequestsResult.error.message);
      } else {
        setContactRequests(contactRequestsResult.data || []);
        setContactRequestsError("");
      }

      if (clientsResult.error) {
        setError(clientsResult.error.message);
      } else {
        setClients(clientsResult.data || []);
      }

      if (catalogResult.error) {
        setCatalogError(
          "Impossible de charger le catalogue : " + catalogResult.error.message
        );
      } else {
        setCatalogBooks(catalogResult.data || []);
      }

      if (messagesResult.error) {
        setMessageError("Impossible de charger les messages : " + messagesResult.error.message);
      } else {
        const loadedMessages = messagesResult.data || [];
        knownAdminMessageIds.current = new Set(loadedMessages.map(item => item.id));
        setMessages(loadedMessages);
        const firstClientWithMessages = loadedMessages[0]?.client_id || clientsResult.data?.[0]?.id || "";
        setSelectedMessageClient(firstClientWithMessages);
      }
      setCatalogLoading(false);

      setLoading(false);
    }

    loadAdminData();

    return () => {
      active = false;
    };
  }, []);

  // Réception instantanée des nouveaux messages clients via Supabase Realtime.
  useEffect(() => {
    if (!authorized || !adminUserId) return;

    const channel = supabase
      .channel("rawago-admin-client-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "client_messages"
        },
        payload => {
          const item = payload.new;
          if (!item?.id || knownAdminMessageIds.current.has(item.id)) return;

          knownAdminMessageIds.current.add(item.id);
          setMessages(previous =>
            previous.some(messageItem => messageItem.id === item.id)
              ? previous
              : [...previous, item]
          );

          if (item.sender_id !== adminUserId) {
            setNotification("Nouveau message reçu d'un client.");
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "client_messages"
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
  }, [authorized, adminUserId]);

  // Présence et indicateur de saisie dans la conversation sélectionnée.
  useEffect(() => {
    if (!authorized || !adminUserId || !selectedMessageClient) return;

    const channel = supabase.channel(`rawago-chat-presence-${selectedMessageClient}`, {
      config: { presence: { key: adminUserId }, broadcast: { self: false } }
    });

    chatPresenceChannelRef.current = channel;

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setClientOnline(Object.values(state).flat().some(entry => entry.role === "client"));
      })
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        if (payload?.sender === "client") {
          setClientTyping(Boolean(payload.typing));
        }
      })
      .subscribe(async status => {
        if (status === "SUBSCRIBED") {
          await channel.track({ role: "admin", online_at: new Date().toISOString() });
        }
      });

    return () => {
      chatPresenceChannelRef.current = null;
      setClientOnline(false);
      setClientTyping(false);
      supabase.removeChannel(channel);
    };
  }, [authorized, adminUserId, selectedMessageClient]);

  useEffect(() => {
    if (!authorized || !adminUserId || !selectedMessageClient) return;

    const markClientMessagesRead = async () => {
      const unread = messages.filter(item =>
        item.client_id === selectedMessageClient &&
        item.sender_id !== adminUserId &&
        !item.read_at
      );
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

    markClientMessagesRead();
  }, [authorized, adminUserId, selectedMessageClient, messages]);

  async function broadcastAdminTyping(isTyping) {
    if (!selectedMessageClient || !adminUserId) return;
    const channel = chatPresenceChannelRef.current;
    if (!channel) return;
    await channel.send({
      type: "broadcast",
      event: "typing",
      payload: { sender: "admin", typing: isTyping }
    });
  }

  async function sendAdminReply(event) {
    event.preventDefault();
    const body = adminReply.trim();

    if (!selectedMessageClient || (!body && !adminAttachment) || !adminUserId) return;

    setMessageSaving(true);
    setMessageError("");
    setMessageNotice("");

    let attachment = null;
    let uploadedPath = null;

    try {
      if (adminAttachment) {
        const file = adminAttachment;
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
        uploadedPath = `${selectedMessageClient}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
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

      const messageBody = body || `Pièce jointe : ${adminAttachment.name}`;
      const { data, error: insertError } = await supabase
        .from("client_messages")
        .insert({
          client_id: selectedMessageClient,
          sender_id: adminUserId,
          body: messageBody,
          ...(attachment || {})
        })
        .select()
        .single();

      if (insertError) throw insertError;

      knownAdminMessageIds.current.add(data.id);
      setMessages(previous => [...previous, data]);
      setAdminReply("");
      setAdminAttachment(null);
      setMessageNotice("Votre message a été envoyé.");
      const input = document.getElementById("rawago-admin-attachment");
      if (input) input.value = "";
    } catch (sendError) {
      if (uploadedPath) {
        await supabase.storage.from("rawago-chat-files").remove([uploadedPath]);
      }
      setMessageError("Le message n'a pas pu être envoyé : " + sendError.message);
    }

    setMessageSaving(false);
  }

  async function saveAdminMessageEdit(event, messageId) {
    event.preventDefault();
    const body = editingMessageBody.trim();
    if (!body) { setMessageError("Le message ne peut pas être vide."); return; }
    const { data, error: updateError } = await supabase
      .from("client_messages")
      .update({ body, edited_at: new Date().toISOString() })
      .eq("id", messageId)
      .eq("sender_id", adminUserId)
      .select("*")
      .maybeSingle();
    if (updateError || !data) {
      setMessageError("Modification impossible : " + (updateError?.message || "autorisation refusée."));
      return;
    }
    setMessages(previous => previous.map(item => item.id === messageId ? data : item));
    setEditingMessageId(null);
    setEditingMessageBody("");
    setMessageNotice("Réponse modifiée.");
  }

  async function deleteAdminMessage(messageId) {
    if (!window.confirm("Supprimer cette réponse ? Le client verra une mention indiquant que le message a été supprimé.")) return;
    const { data, error: updateError } = await supabase
      .from("client_messages")
      .update({ body: "Message supprimé par l’administration.", deleted_at: new Date().toISOString(), edited_at: null, attachment_path: null, attachment_name: null, attachment_mime: null, attachment_size: null })
      .eq("id", messageId)
      .eq("sender_id", adminUserId)
      .is("deleted_at", null)
      .select("*")
      .maybeSingle();
    if (updateError || !data) {
      setMessageError("Suppression impossible : " + (updateError?.message || "autorisation refusée."));
      return;
    }
    setMessages(previous => previous.map(item => item.id === messageId ? data : item));
    setMessageNotice("Réponse supprimée.");
  }

  async function openChatAttachment(path) {
    const { data, error: signedError } = await supabase.storage
      .from("rawago-chat-files")
      .createSignedUrl(path, 60);
    if (signedError) {
      setMessageError("Impossible d'ouvrir le fichier : " + signedError.message);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function changeStatus(requestId, newStatus) {
    setSaving(requestId);
    setError("");

    const { error } = await supabase
      .from("service_requests")
      .update({ status: newStatus })
      .eq("id", requestId);

    if (error) {
      setError(error.message);
    } else {
      setRequests(previous =>
        previous.map(item =>
          item.id === requestId
            ? { ...item, status: newStatus }
            : item
        )
      );
    }

    setSaving(null);
  }

  async function searchBooks(event) {
    event.preventDefault();

    if (!bookSearch.trim()) {
      setBookError("Saisis un titre ou un nom d'auteur.");
      return;
    }

    setSearchingBooks(true);
    setBookError("");
    setBookMessage("");
    setBookResults([]);

    try {
      const fields =
        "key,title,author_name,first_publish_year,edition_count,cover_i,isbn,publisher";

      const url =
        "https://openlibrary.org/search.json?q=" +
        encodeURIComponent(bookSearch.trim()) +
        "&fields=" + fields +
        "&limit=20";

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(
          "Le service de recherche est momentanément indisponible."
        );
      }

      const data = await response.json();

      setBookResults(data.docs || []);

      if (!data.docs || data.docs.length === 0) {
        setBookMessage(
          "Aucun ouvrage trouvé. Essaie un autre titre ou auteur."
        );
      }
    } catch (err) {
      setBookError(
        err.message || "Impossible de rechercher les ouvrages."
      );
    } finally {
      setSearchingBooks(false);
    }
  }

  async function addBookToCatalog(book) {
    const sourceId = book.key;

    if (!sourceId) {
      setBookError(
        "Cette référence ne possède pas d'identifiant exploitable."
      );
      return;
    }

    setImportingBook(sourceId);
    setBookError("");
    setBookMessage("");

    const bookData = {
      title: book.title || "Titre non renseigné",
      authors: book.author_name || [],
      publisher: book.publisher?.[0] || null,
      published_date: book.first_publish_year
        ? String(book.first_publish_year)
        : null,
      isbn: book.isbn?.[0] || null,
      cover_url: book.cover_i
        ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`
        : null,
      category: bookCategory,
      source: "Open Library",
      source_id: sourceId,
      rights_status: "pending",
      is_active: true,
      license_url: null,
      rights_evidence: "Métadonnées bibliographiques importées. Les droits du fichier ou de l'édition ne sont pas établis par cette notice.",
      rights_checked_at: null
    };

    const { error: insertError } = await supabase
      .from("books_catalog")
      .insert(bookData);

    if (insertError) {
      if (insertError.code === "23505") {
        setBookError(
          "Cet ouvrage est déjà enregistré dans le catalogue."
        );
      } else {
        setBookError(
          "Impossible d'ajouter cet ouvrage : " +
          insertError.message
        );
      }
    } else {
      setImportedBooks(previous => [...previous, sourceId]);
      setBookMessage(
        "Ouvrage ajouté et publié dans le catalogue. Les informations de droits restent indépendantes de la publication."
      );
    }

    setImportingBook(null);
  }

  async function fetchInternetArchiveBooks(item) {
    const params = new URLSearchParams();

    params.set("q", item.query);

    [
      "identifier",
      "title",
      "creator",
      "date",
      "description",
      "publisher",
      "language",
      "licenseurl",
      "rights"
    ].forEach(field => {
      params.append("fl[]", field);
    });

    params.set("rows", String(item.target));
    params.set("output", "json");
    params.append("sort[]", "downloads desc");

    const response = await fetch(
      "https://archive.org/advancedsearch.php?" +
      params.toString()
    );

    if (!response.ok) {
      throw new Error(
        "La recherche documentaire a échoué pour : " +
        item.category
      );
    }

    const data = await response.json();
    const documents = data?.response?.docs || [];

    return documents
      .filter(item => item.identifier && item.title)
      .slice(0, item.target)
      .map(document => ({
        title: cleanText(document.title) || "Titre non renseigné",
        authors: toArray(document.creator)
          .map(cleanText)
          .filter(Boolean),
        description: cleanText(document.description) || null,
        publisher: cleanText(document.publisher) || null,
        published_date: document.date
          ? String(document.date).slice(0, 20)
          : null,
        isbn: null,
        cover_url: document.identifier
          ? `https://archive.org/services/img/${encodeURIComponent(document.identifier)}`
          : null,
        category: item.category,
        source: "Internet Archive",
        source_id: document.identifier,
        rights_status: "pending",
        is_active: true,
        license_url: document.licenseurl || null,
        rights_evidence: document.rights || null,
        rights_checked_at: null
      }));
  }

  async function fetchCrossrefArticles() {
    const params = new URLSearchParams();

    params.set(
      "query.bibliographic",
      "sciences humaines éducation méthodologie recherche"
    );
    params.set("filter", "type:journal-article");
    params.set("rows", String(articleTarget));
    params.set("mailto", "rawagobergerlebonheur@gmail.com");

    const response = await fetch(
      "https://api.crossref.org/works?" + params.toString()
    );

    if (!response.ok) {
      throw new Error(
        "La recherche des articles scientifiques a échoué."
      );
    }

    const data = await response.json();
    const articles = data?.message?.items || [];

    return articles
      .filter(item => item.DOI && item.title?.[0])
      .slice(0, articleTarget)
      .map(item => {
        const authors = (item.author || [])
          .map(author =>
            [author.given, author.family]
              .filter(Boolean)
              .join(" ")
          )
          .filter(Boolean);

        const journal = item["container-title"]?.[0] || "";

        return {
          title: cleanText(item.title?.[0]) ||
            "Titre non renseigné",
          authors,
          description: cleanText(item.abstract) || null,
          publisher: cleanText(journal || item.publisher) || null,
          published_date: formatCrossrefDate(item) || null,
          isbn: null,
          cover_url: null,
          category: "Éducation et sciences sociales",
          source: "Crossref",
          source_id: item.DOI,
          rights_status: "pending",
          is_active: true,
          license_url: item.license?.[0]?.URL || null,
          rights_evidence: item.license?.length
            ? `Licence Crossref déclarée : ${item.license.map(license => license.URL).filter(Boolean).join(", ")}`
            : "Aucune licence déclarée dans les métadonnées Crossref.",
          rights_checked_at: null
        };
      });
  }

  async function importAllCategories() {
    setBulkImporting(true);
    setBulkError("");
    setBulkSummary([]);
    setBulkProgress("Préparation de l'importation...");

    const allBooks = [];
    const categoryCounts = [];

    try {
      for (let index = 0; index < bulkSearches.length; index++) {
        const item = bulkSearches[index];

        setBulkProgress(
          `Domaine ${index + 1} sur 13 : ${item.category}. Objectif : ${item.target} références.`
        );

        const books = await fetchInternetArchiveBooks(item);

        allBooks.push(...books);

        categoryCounts.push({
          category: item.category,
          target: item.target,
          found: books.length
        });

        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setBulkProgress(
        "Finalisation de la recherche des articles scientifiques..."
      );

      const articles = await fetchCrossrefArticles();

      allBooks.push(...articles);

      categoryCounts.push({
        category: "Éducation et sciences sociales",
        target: articleTarget,
        found: articles.length
      });

      // Élimination des doublons à l'intérieur du lot.
      const uniqueBooks = Array.from(
        new Map(
          allBooks.map(book => [
            `${book.source}:${book.source_id}`,
            book
          ])
        ).values()
      );

      if (uniqueBooks.length === 0) {
        throw new Error(
          "Aucune référence exploitable n'a été trouvée."
        );
      }

      setBulkProgress(
        `${uniqueBooks.length} références trouvées. Vérification des doublons dans Supabase...`
      );

      // Vérification des références déjà enregistrées.
      const existingKeys = new Set();

      const sourceGroups = [
        ...new Set(uniqueBooks.map(book => book.source))
      ];

      for (const source of sourceGroups) {
        const sourceBooks = uniqueBooks.filter(
          book => book.source === source
        );

        const ids = sourceBooks.map(book => book.source_id);

        for (let index = 0; index < ids.length; index += 100) {
          const batch = ids.slice(index, index + 100);

          const { data, error: checkError } = await supabase
            .from("books_catalog")
            .select("source_id")
            .eq("source", source)
            .in("source_id", batch);

          if (checkError) {
            throw new Error(
              "Impossible de vérifier les doublons : " +
              checkError.message
            );
          }

          (data || []).forEach(item => {
            existingKeys.add(`${source}:${item.source_id}`);
          });
        }
      }

      const newBooks = uniqueBooks.filter(
        book => !existingKeys.has(
          `${book.source}:${book.source_id}`
        )
      );

      if (newBooks.length === 0) {
        setBulkSummary(
          categoryCounts.map(item => ({
            ...item,
            added: 0
          }))
        );

        setBulkProgress(
          "Aucune nouvelle référence à ajouter : tous les résultats trouvés sont déjà enregistrés."
        );

        return;
      }

      setBulkProgress(
        `${newBooks.length} nouvelles références à enregistrer dans Supabase...`
      );

      // Insertion par lots pour éviter une requête trop volumineuse.
      const addedCounts = {};

      for (let index = 0; index < newBooks.length; index += 50) {
        const batch = newBooks.slice(index, index + 50);

        const { data, error: insertError } = await supabase
          .from("books_catalog")
          .insert(batch)
          .select("id, category");

        if (insertError) {
          throw new Error(
            "Erreur lors de l'enregistrement du lot " +
            (Math.floor(index / 50) + 1) +
            " : " +
            insertError.message
          );
        }

        (data || []).forEach(book => {
          addedCounts[book.category] =
            (addedCounts[book.category] || 0) + 1;
        });
      }

      const finalSummary = categoryCounts.map(item => ({
        ...item,
        added: addedCounts[item.category] || 0
      }));

      setBulkSummary(finalSummary);

      const totalAdded = Object.values(addedCounts)
        .reduce((total, value) => total + value, 0);

      setBulkProgress(
        `Importation terminée : ${totalAdded} nouvelles références ajoutées et publiées sur ${uniqueBooks.length} références trouvées.`
      );
    } catch (err) {
      setBulkError(
        err.message ||
        "Une erreur est survenue pendant l'importation."
      );
      setBulkProgress("");
    } finally {
      setBulkImporting(false);
    }
  }


  async function prepareCsvImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setCatalogError("");
    setCatalogMessage("");
    setCsvNotice("Lecture du fichier et vérification du catalogue en cours...");
    setCsvPreview([]);
    setCsvFileName(file.name);

    try {
      const csvText = await file.text();
      const parsed = parseCatalogCsv(String(csvText || "").replace(/^\uFEFF/, ""));

      // Charger toutes les références Supabase par pages de 1 000 :
      // catalogBooks est volontairement limité dans le chargement initial.
      const existingBooks = [];
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        const { data, error: loadError } = await supabase
          .from("books_catalog")
          .select("id, title, authors, isbn")
          .order("id", { ascending: true })
          .range(from, from + pageSize - 1);
        if (loadError) throw loadError;
        existingBooks.push(...(data || []));
        if (!data || data.length < pageSize) break;
      }

      const existingKeys = new Set(
        existingBooks.map(catalogDuplicateKey).filter(Boolean)
      );
      const seenCsvKeys = new Set();
      const prepared = parsed.map(book => {
        const key = catalogDuplicateKey(book);
        let duplicateReason = "";
        if (key && existingKeys.has(key)) duplicateReason = "already-in-catalog";
        else if (key && seenCsvKeys.has(key)) duplicateReason = "repeated-in-file";
        if (key) seenCsvKeys.add(key);
        return {
          ...book,
          _duplicate: Boolean(duplicateReason),
          _duplicateReason: duplicateReason
        };
      });

      const inCatalog = prepared.filter(book => book._duplicateReason === "already-in-catalog").length;
      const inFile = prepared.filter(book => book._duplicateReason === "repeated-in-file").length;
      const withoutReliableKey = prepared.filter(book => !catalogDuplicateKey(book)).length;
      setCsvPreview(prepared);
      setCsvNotice(
        `${prepared.length} références détectées. ${inCatalog} déjà présentes dans Supabase ; ${inFile} répétées dans le CSV ; ${withoutReliableKey} sans ISBN ni auteur exploitable (conservées pour contrôle).`
      );
    } catch (error) {
      setCatalogError(error.message || "Lecture du fichier impossible.");
      setCsvPreview([]);
      setCsvNotice("");
    } finally {
      event.target.value = "";
    }
  }

  async function importCsvPreview() {
    const rows = csvPreview.filter(book => !book._duplicate).map(({ _duplicate, ...book }) => book);
    if (!rows.length) {
      setCatalogMessage("Aucune nouvelle référence à importer : toutes les lignes sont déjà présentes ou en doublon dans le fichier.");
      return;
    }
    setCsvImporting(true);
    setCatalogError("");
    setCatalogMessage("");
    try {
      let inserted = 0;
      for (let index = 0; index < rows.length; index += 50) {
        const { data, error: insertError } = await supabase
          .from("books_catalog").insert(rows.slice(index, index + 50)).select("*");
        if (insertError) throw insertError;
        inserted += data?.length || 0;
      }
      const { data, error: reloadError } = await supabase
        .from("books_catalog")
        .select("id, title, authors, description, publisher, published_date, category, source, source_id, cover_url, rights_status, is_active, license_url, rights_evidence, rights_checked_at")
        .order("title", { ascending: true }).limit(1000);
      if (reloadError) throw reloadError;
      setCatalogBooks(data || []);
      setCatalogMessage(`${inserted} référence(s) importée(s) avec succès. Les doublons probables ont été ignorés.`);
      setCsvPreview([]);
      setCsvFileName("");
    } catch (error) {
      setCatalogError("Importation interrompue : " + error.message + ". Les lots déjà enregistrés restent dans le catalogue.");
    } finally {
      setCsvImporting(false);
    }
  }

  async function replaceCatalogFromCsv() {
    const rows = csvPreview.map(({ _duplicate, ...book }) => book);
    if (!rows.length) return;
    const confirmed = window.confirm(
      `ATTENTION : remplacer intégralement le catalogue par les ${rows.length} références du fichier « ${csvFileName} » ?\\n\\nToutes les références actuellement dans Supabase seront supprimées. Cette opération ne peut pas être annulée.`
    );
    if (!confirmed) return;
    setCsvImporting(true);
    setCatalogError("");
    setCatalogMessage("");
    try {
      const { data, error: replaceError } = await supabase.rpc("replace_books_catalog", { p_books: rows });
      if (replaceError) {
        throw new Error(replaceError.message.includes("replace_books_catalog")
          ? "La fonction sécurisée replace_books_catalog n'est pas encore installée dans Supabase. Utilise d'abord le script SQL fourni avec ce fichier."
          : replaceError.message);
      }
      const { data: refreshed, error: reloadError } = await supabase
        .from("books_catalog")
        .select("id, title, authors, description, publisher, published_date, category, source, source_id, cover_url, rights_status, is_active, license_url, rights_evidence, rights_checked_at")
        .order("title", { ascending: true }).limit(1000);
      if (reloadError) throw reloadError;
      setCatalogBooks(refreshed || []);
      setCatalogMessage(`Catalogue remplacé. ${refreshed?.length || data || rows.length} référence(s) sont maintenant enregistrées.`);
      setCsvPreview([]);
      setCsvFileName("");
    } catch (error) {
      setCatalogError("Remplacement non effectué : " + error.message);
    } finally {
      setCsvImporting(false);
    }
  }

  async function deleteCatalogBook(book) {
    if (!window.confirm(`Supprimer définitivement « ${book.title} » du catalogue ?`)) return;
    setCatalogSaving(book.id);
    setCatalogError("");
    setCatalogMessage("");
    const { error: deleteError } = await supabase.from("books_catalog").delete().eq("id", book.id);
    if (deleteError) {
      setCatalogError("Suppression impossible : " + deleteError.message);
    } else {
      setCatalogBooks(previous => previous.filter(item => item.id !== book.id));
      setCatalogMessage(`« ${book.title} » a été supprimé du catalogue.`);
    }
    setCatalogSaving(null);
  }

  async function scanCatalogRights() {
    // Réexaminer toutes les références non publiées, y compris celles
    // qui auraient été marquées manuellement auparavant.
    const candidates = catalogBooks.filter(book => !book.is_active);

    if (candidates.length === 0) {
      setRightsSummary({ eligible: 0, uncertain: 0, scanned: 0 });
      setRightsProgress("Aucune référence en attente de contrôle.");
      return;
    }

    setRightsScanning(true);
    setRightsSummary(null);
    setCatalogError("");
    setCatalogMessage("");

    let nextIndex = 0;
    let scanned = 0;
    let eligible = 0;
    let uncertain = 0;
    const updatedRows = new Map();

    async function inspectBook(book) {
      let licenseUrl = null;
      let evidence = "Aucune licence ouverte admissible identifiée.";
      let approved = false;

      try {
        if (book.source === "Internet Archive") {
          const response = await fetch(
            `https://archive.org/metadata/${encodeURIComponent(book.source_id)}`
          );
          if (!response.ok) throw new Error(`Internet Archive : HTTP ${response.status}`);
          const data = await response.json();
          const metadata = data?.metadata || {};
          licenseUrl = metadata.licenseurl || null;
          approved = approvedLicense(licenseUrl);
          evidence = licenseUrl
            ? `Licence déclarée par Internet Archive : ${licenseUrl}`
            : `Aucun champ licenseurl dans les métadonnées. Mention de droits : ${cleanText(metadata.rights) || "non renseignée"}.`;
        } else if (book.source === "Crossref") {
          const response = await fetch(
            `https://api.crossref.org/works/${encodeURIComponent(book.source_id)}?mailto=rawagobergerlebonheur@gmail.com`
          );
          if (!response.ok) throw new Error(`Crossref : HTTP ${response.status}`);
          const data = await response.json();
          const item = data?.message || {};
          const license = getCrossrefOpenLicense(item);
          licenseUrl = license?.URL || item.license?.[0]?.URL || null;
          approved = Boolean(license);
          evidence = license
            ? `Licence Crossref déclarée (${license["content-version"] || "version non précisée"}) : ${license.URL}`
            : licenseUrl
              ? `Licence Crossref trouvée mais non admissible automatiquement : ${licenseUrl}`
              : "Aucune licence admissible déclarée dans les métadonnées Crossref.";
        } else {
          evidence = `Source ${book.source || "inconnue"} : aucune vérification automatique disponible.`;
        }
      } catch (error) {
        evidence = `Contrôle automatique impossible : ${error.message}`;
      }

      const checkedAt = new Date().toISOString();
      const changes = {
        license_url: licenseUrl,
        rights_evidence: evidence,
        rights_checked_at: checkedAt
      };

      // Seules les licences de la liste blanche sont publiées automatiquement.
      // Les autres notices restent inactives et en attente.
      if (approved) {
        changes.rights_status = "verified";
        changes.is_active = true;
        eligible += 1;
      } else {
        changes.rights_status = "pending";
        changes.is_active = false;
        uncertain += 1;
      }

      const { data, error: updateError } = await supabase
        .from("books_catalog")
        .update(changes)
        .eq("id", book.id)
        .select("id, rights_status, is_active, license_url, rights_evidence, rights_checked_at")
        .maybeSingle();

      if (updateError) {
        throw new Error(`Mise à jour de « ${book.title} » : ${updateError.message}`);
      }

      if (data) updatedRows.set(book.id, { ...book, ...data });
      scanned += 1;
    }

    async function worker() {
      while (true) {
        const index = nextIndex++;
        if (index >= candidates.length) return;
        const book = candidates[index];
        setRightsProgress(`Analyse automatique : ${scanned + 1} / ${candidates.length} — ${book.title}`);
        try {
          await inspectBook(book);
        } catch (error) {
          uncertain += 1;
          scanned += 1;
          console.error(error);
        }
      }
    }

    try {
      await Promise.all(Array.from({ length: 4 }, () => worker()));
      setCatalogBooks(previous => previous.map(book => updatedRows.get(book.id) || book));
      setRightsSummary({ eligible, uncertain, scanned });
      setRightsProgress(`Analyse terminée : ${scanned} références examinées.`);
      setCatalogMessage(`${eligible} références disposant d'une licence admissible ont été publiées automatiquement. ${uncertain} restent non publiées et en attente.`);
    } catch (error) {
      setCatalogError(error.message || "Le contrôle automatique a échoué.");
      setRightsProgress("Analyse interrompue. Les références déjà traitées ont conservé leur résultat.");
      setCatalogBooks(previous => previous.map(book => updatedRows.get(book.id) || book));
    } finally {
      setRightsScanning(false);
    }
  }

  async function publishAllExistingReferences() {
    const unpublishedCount = catalogBooks.filter(book => !book.is_active).length;

    if (unpublishedCount === 0) {
      setCatalogMessage("Toutes les références du catalogue sont déjà publiées.");
      return;
    }

    const confirmed = window.confirm(
      `Confirmer la publication des ${unpublishedCount} références actuellement non publiées ?\n\nCette action rendra visibles les notices bibliographiques dans la bibliothèque RAWAGO. Elle ne donne pas le droit de redistribuer les fichiers, PDF ou numérisations associés.`
    );
    if (!confirmed) return;

    setCatalogSaving("all");
    setCatalogError("");
    setCatalogMessage("");

    const { data, error: publishError } = await supabase
      .from("books_catalog")
      .update({ is_active: true })
      .eq("is_active", false)
      .select("id");

    if (publishError) {
      setCatalogError("La publication groupée a échoué : " + publishError.message);
    } else {
      const publishedIds = new Set((data || []).map(item => item.id));
      setCatalogBooks(previous => previous.map(book =>
        publishedIds.has(book.id) ? { ...book, is_active: true } : book
      ));
      setCatalogMessage(`${publishedIds.size} références ont été publiées. Les informations de droits restent distinctes et non vérifiées lorsque c'est le cas.`);
    }

    setCatalogSaving(null);
  }

  async function updateCatalogBook(book, changes, successMessage) {
    setCatalogSaving(book.id);
    setCatalogError("");
    setCatalogMessage("");

    const { data, error: updateError } = await supabase
      .from("books_catalog")
      .update(changes)
      .eq("id", book.id)
      .select("id, rights_status, is_active, license_url, rights_evidence, rights_checked_at")
      .maybeSingle();

    if (updateError) {
      setCatalogError(
        "La mise à jour a échoué : " + updateError.message
      );
    } else if (!data) {
      setCatalogError(
        "Aucune modification confirmée. Vérifie les autorisations de la table."
      );
    } else {
      setCatalogBooks(previous =>
        previous.map(item =>
          item.id === book.id ? { ...item, ...data } : item
        )
      );
      setCatalogMessage(successMessage);
    }

    setCatalogSaving(null);
  }

  function unpublishCatalogBook(book) {
    updateCatalogBook(
      book,
      { is_active: false },
      "Référence retirée de la bibliothèque publique."
    );
  }


  function resetKnowledgeForm() {
    setEditingKnowledgeId(null);
    setKnowledgeTitle("");
    setKnowledgeCategory("ÉDUCATION");
    setKnowledgeSummary("");
    setKnowledgeContent("");
    setKnowledgeImage("");
    setKnowledgeStatus("draft");
  }

  async function saveKnowledgeArticle(event) {
    event.preventDefault();
    if (!adminUserId || !knowledgeTitle.trim() || !knowledgeSummary.trim() || !knowledgeContent.trim()) {
      setKnowledgeError("Renseigne le titre, le résumé et le contenu de l’article.");
      return;
    }
    setKnowledgeSaving(true);
    setKnowledgeError("");
    setKnowledgeNotice("");
    const now = new Date().toISOString();
    const payload = {
      admin_id: adminUserId,
      title: knowledgeTitle.trim(),
      category: knowledgeCategory,
      summary: knowledgeSummary.trim(),
      content: knowledgeContent.trim(),
      image_url: knowledgeImage.trim() || null,
      status: knowledgeStatus,
      published_at: knowledgeStatus === "published"
        ? (knowledgeArticles.find(item => item.id === editingKnowledgeId)?.published_at || now)
        : null,
      updated_at: now
    };
    const result = editingKnowledgeId
      ? await supabase.from("knowledge_articles").update(payload).eq("id", editingKnowledgeId).select().single()
      : await supabase.from("knowledge_articles").insert(payload).select().single();
    if (result.error) {
      setKnowledgeError("Enregistrement impossible : " + result.error.message);
    } else {
      setKnowledgeArticles(previous => {
        const next = editingKnowledgeId
          ? previous.map(item => item.id === editingKnowledgeId ? result.data : item)
          : [result.data, ...previous];
        return next.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      });
      resetKnowledgeForm();
      setKnowledgeNotice("Article enregistré avec succès.");
    }
    setKnowledgeSaving(false);
  }

  function editKnowledgeArticle(article) {
    setEditingKnowledgeId(article.id);
    setKnowledgeTitle(article.title || "");
    setKnowledgeCategory(article.category || "ÉDUCATION");
    setKnowledgeSummary(article.summary || "");
    setKnowledgeContent(article.content || "");
    setKnowledgeImage(article.image_url || "");
    setKnowledgeStatus(article.status || "draft");
    setKnowledgeError("");
    setKnowledgeNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteKnowledgeArticle(article) {
    if (!window.confirm(`Supprimer l’article « ${article.title} » ?`)) return;
    const { error: deleteError } = await supabase.from("knowledge_articles").delete().eq("id", article.id);
    if (deleteError) setKnowledgeError("Suppression impossible : " + deleteError.message);
    else {
      setKnowledgeArticles(previous => previous.filter(item => item.id !== article.id));
      if (editingKnowledgeId === article.id) resetKnowledgeForm();
      setKnowledgeNotice("Article supprimé.");
    }
  }

  async function saveAdminNote(event) {
    event.preventDefault();
    const title = noteTitle.trim();
    const body = noteBody.trim();
    if (!title || !body || !adminUserId) {
      setNotesError("Ajoute un titre et le contenu de ta note.");
      return;
    }

    setNoteSaving(true);
    setNotesError("");
    setNotesNotice("");
    const payload = { admin_id: adminUserId, title, body, updated_at: new Date().toISOString() };
    const result = editingNoteId
      ? await supabase.from("admin_notes").update(payload).eq("id", editingNoteId).select().single()
      : await supabase.from("admin_notes").insert(payload).select().single();

    if (result.error) {
      setNotesError("Enregistrement impossible : " + result.error.message);
    } else {
      setAdminNotes(previous => {
        const next = editingNoteId
          ? previous.map(note => note.id === editingNoteId ? result.data : note)
          : [result.data, ...previous];
        return next.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
      });
      setNoteTitle("");
      setNoteBody("");
      setEditingNoteId(null);
      setNotesNotice("Note enregistrée.");
    }
    setNoteSaving(false);
  }

  function editAdminNote(note) {
    setEditingNoteId(note.id);
    setNoteTitle(note.title);
    setNoteBody(note.body);
    setNotesError("");
    setNotesNotice("");
  }

  async function deleteAdminNote(noteId) {
    if (!window.confirm("Supprimer définitivement cette note ?")) return;
    const { error: deleteError } = await supabase.from("admin_notes").delete().eq("id", noteId);
    if (deleteError) setNotesError("Suppression impossible : " + deleteError.message);
    else {
      setAdminNotes(previous => previous.filter(note => note.id !== noteId));
      if (editingNoteId === noteId) {
        setEditingNoteId(null);
        setNoteTitle("");
        setNoteBody("");
      }
      setNotesNotice("Note supprimée.");
    }
  }

  function cancelNoteEdit() {
    setEditingNoteId(null);
    setNoteTitle("");
    setNoteBody("");
    setNotesError("");
    setNotesNotice("");
  }

  const normalizedCatalogSearch = catalogSearch.trim().toLowerCase();
  const filteredCatalogBooks = catalogBooks.filter(book => {
    const matchesSearch =
      !normalizedCatalogSearch ||
      [
        book.title,
        ...(Array.isArray(book.authors) ? book.authors : []),
        book.category,
        book.source
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedCatalogSearch);

    const matchesFilter =
      catalogFilter === "all" ||
      (catalogFilter === "pending" && !book.is_active) ||
      (catalogFilter === "verified" && book.rights_status === "verified") ||
      (catalogFilter === "published" && book.is_active);

    return matchesSearch && matchesFilter;
  });

  const statusLabels = {
    pending: "En attente",
    reviewing: "À l'étude",
    accepted: "Acceptée",
    in_progress: "En cours",
    completed: "Terminée",
    rejected: "Refusée"
  };

  const totalTarget =
    bulkSearches.reduce((total, item) => total + item.target, 0) +
    articleTarget;

  // Indicateurs calculés à partir des données déjà chargées depuis Supabase.
  const unreadMessages = messages
    .filter(item => item.sender_id !== adminUserId && !item.read_at)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const recentIncomingMessages = messages
    .filter(item => item.sender_id !== adminUserId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);
  const pendingRequests = requests.filter(item =>
    ["pending", "reviewing"].includes(item.status)
  );
  const inProgressRequests = requests.filter(item =>
    item.status === "in_progress"
  );
  const completedRequests = requests.filter(item =>
    item.status === "completed"
  );
  const recentRequests = [...requests]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 5);

  async function saveAdminAccount(event) {
    event.preventDefault();
    setAccountSaving(true);
    setAccountError("");
    setAccountNotice("");

    try {
      const cleanName = accountNameInput.trim();
      const cleanEmail = accountEmailInput.trim();
      if (!cleanName) throw new Error("Veuillez renseigner votre nom.");
      if (!cleanEmail) throw new Error("Veuillez renseigner une adresse e-mail valide.");

      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({ full_name: cleanName })
        .eq("id", adminUserId);
      if (profileUpdateError) throw profileUpdateError;

      const authChanges = {};
      if (cleanEmail !== adminEmail) authChanges.email = cleanEmail;
      if (accountPassword) {
        if (accountPassword.length < 8) throw new Error("Le nouveau mot de passe doit contenir au moins 8 caractères.");
        if (accountPassword !== accountPasswordConfirm) throw new Error("Les deux mots de passe ne correspondent pas.");
        authChanges.password = accountPassword;
      }

      if (Object.keys(authChanges).length) {
        const { error: authUpdateError } = await supabase.auth.updateUser(authChanges);
        if (authUpdateError) throw authUpdateError;
      }

      setAdminFullName(cleanName);
      if (cleanEmail === adminEmail) setAccountEmailInput(adminEmail);
      else setAccountNotice("Votre demande de changement d'adresse e-mail a été envoyée. Consultez votre boîte mail pour confirmer la nouvelle adresse.");
      if (accountPassword) setAccountNotice(previous => (previous ? previous + " " : "") + "Mot de passe mis à jour.");
      if (!authChanges.email && !authChanges.password) setAccountNotice("Les informations de votre compte ont été enregistrées.");
      setAccountPassword("");
      setAccountPasswordConfirm("");
    } catch (saveError) {
      setAccountError(saveError.message || "Impossible d'enregistrer les réglages du compte.");
    } finally {
      setAccountSaving(false);
    }
  }

  async function signOutAdmin() {
    setAccountError("");
    const { error: signOutError } = await supabase.auth.signOut();
    if (signOutError) {
      setAccountError("La déconnexion a échoué : " + signOutError.message);
      return;
    }
    window.location.href = "/";
  }

  if (loading) {
    return (
      <main className="section admin-area">



        <p>Chargement de l'administration...</p>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="section">
        <h1>Administration</h1>
        <p className="form-error">{error}</p>
        <a className="btn primary" href="/espace-client">
          Accéder à mon compte
        </a>
      </main>
    );
  }

  return (
    <main className="section admin-area">
      <style>{`
        .admin-area {
          --admin-ink: #193936;
          --admin-green: #173B38;
          --admin-green-2: #24534D;
          --admin-teal: #16877D;
          --admin-muted: #71817B;
          --admin-line: #E5E9E2;
          --admin-paper: #F7F6F0;
          color: var(--admin-ink);
          width: 100%;
          max-width: 1600px;
          box-sizing: border-box;
          padding-top: 28px;
          padding-bottom: 60px;
        }
        .admin-area * { box-sizing: border-box; }
        .admin-shell {
          display: grid;
          grid-template-columns: 264px minmax(0, 1fr);
          min-height: 780px;
          background: var(--admin-paper);
          border: 1px solid #E6E8E1;
          border-radius: 22px;
          overflow: hidden;
          box-shadow: 0 18px 55px rgba(26, 54, 48, .08);
        }
        .admin-shell.is-collapsed { grid-template-columns: 82px minmax(0, 1fr); }
        .admin-sidebar {
          background: linear-gradient(180deg, #173B38 0%, #102D2B 100%);
          color: #F8F7F0;
          padding: 25px 15px;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .admin-brand {
          display: flex; align-items: center; gap: 12px;
          padding: 4px 9px 26px; border-bottom: 1px solid rgba(255,255,255,.13);
          margin-bottom: 23px; min-height: 66px;
        }
        .admin-brand-mark {
          width: 42px; height: 42px; flex: 0 0 42px;
          border-radius: 14px; display: grid; place-items: center;
          background: #F4F0E6; color: #173B38;
          font-family: Georgia, serif; font-size: 25px; font-weight: 700;
        }
        .admin-brand-name { font-size: 12px; letter-spacing: .17em; font-weight: 800; }
        .admin-brand-sub { color: #A8C9BE; font-size: 9px; letter-spacing: .16em; margin-top: 5px; }
        .admin-nav-group { margin-bottom: 22px; }
        .admin-nav-label {
          color: #91B2A8; font-size: 9px; letter-spacing: .16em;
          font-weight: 800; padding: 0 12px 10px; text-transform: uppercase;
        }
        .admin-nav-button {
          width: 100%; display: flex; align-items: center; gap: 12px;
          min-height: 44px; padding: 10px 12px; margin: 3px 0;
          border: 1px solid transparent; border-radius: 11px;
          color: #D8E5DF; background: transparent; text-align: left;
          font: inherit; font-size: 13px; font-weight: 550;
          cursor: pointer; transition: .18s ease;
        }
        .admin-nav-button:hover { background: rgba(255,255,255,.08); color: #FFF; }
        .admin-nav-button.active {
          color: #173B38; background: #F4F0E6;
          box-shadow: 0 6px 18px rgba(0,0,0,.12);
        }
        .admin-nav-icon {
          width: 22px; flex: 0 0 22px; text-align: center;
          font-size: 17px; line-height: 1;
        }
        .admin-nav-count {
          margin-left: auto; min-width: 21px; padding: 3px 6px;
          border-radius: 20px; background: rgba(255,255,255,.12);
          color: #F5F4ED; font-size: 10px; text-align: center;
        }
        .admin-nav-button.active .admin-nav-count { background: #DCEBE4; color: #173B38; }
        .admin-sidebar-bottom { margin-top: auto; border-top: 1px solid rgba(255,255,255,.13); padding-top: 16px; }
        .admin-collapse-button {
          width: 100%; border: 1px solid rgba(255,255,255,.16);
          background: rgba(255,255,255,.06); color: #E4EEE9;
          border-radius: 10px; padding: 10px; cursor: pointer; font: inherit; font-size: 12px;
        }
        .admin-main { min-width: 0; padding: 28px 32px 38px; background: #F7F6F0; }
        .admin-topbar {
          display: flex; align-items: center; justify-content: space-between;
          gap: 18px; padding-bottom: 23px; margin-bottom: 27px;
          border-bottom: 1px solid var(--admin-line);
        }
        .admin-breadcrumb { color: #87938D; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; }
        .admin-page-title { color: #193936; font-family: Georgia, 'Times New Roman', serif; font-size: clamp(25px, 3vw, 35px); font-weight: 600; margin: 7px 0 5px; }
        .admin-page-description { color: #71817B; font-size: 13px; margin: 0; line-height: 1.6; }
        .admin-topbar-actions { display: flex; align-items: center; gap: 10px; }
        .admin-live-pill {
          display: inline-flex; align-items: center; gap: 7px;
          border: 1px solid #D6E6DC; background: #EDF5EF; color: #34765C;
          border-radius: 30px; padding: 8px 12px; font-size: 11px; font-weight: 700;
          white-space: nowrap;
        }
        .admin-live-dot { width: 7px; height: 7px; border-radius: 50%; background: #2D9B69; }
        .admin-area .dashboard-panel {
          color: #193936; background: #FFFFFF; border: 1px solid #E7EAE4;
          border-radius: 16px; padding: 25px; box-shadow: 0 5px 18px rgba(26,54,48,.035);
        }
        .admin-area .dashboard-panel h2,
        .admin-area .dashboard-panel h3,
        .admin-area .dashboard-panel h4 { color: #193936 !important; }
        .admin-area .dashboard-panel p,
        .admin-area .dashboard-panel small,
        .admin-area .dashboard-panel label { color: #687A73 !important; }
        .admin-area .eyebrow { color: #16877D !important; letter-spacing: .14em; }
        .admin-area .dashboard-panel input,
        .admin-area .dashboard-panel select,
        .admin-area .dashboard-panel textarea {
          color: #193936 !important; background: #FFFFFF !important;
          border: 1px solid #D6DED8 !important; border-radius: 9px;
        }
        .admin-area .dashboard-panel input:focus,
        .admin-area .dashboard-panel select:focus,
        .admin-area .dashboard-panel textarea:focus {
          outline: 2px solid rgba(22,135,125,.16); border-color: #16877D !important;
        }
        .admin-area .dashboard-panel input::placeholder,
        .admin-area .dashboard-panel textarea::placeholder { color: #98A49E; opacity: 1; }
        .admin-area .btn.primary {
          color: #FFF !important; background: #173B38 !important;
          border: 1px solid #173B38 !important; border-radius: 9px;
        }
        .admin-area .btn.primary:hover { background: #24534D !important; }
        .admin-area .btn.secondary {
          color: #25433F !important; background: #FFF !important;
          border: 1px solid #D6DED8 !important; border-radius: 9px;
        }
        .admin-area .btn.secondary:hover { background: #EFF5F0 !important; border-color: #9BB9AA !important; }
        .admin-area .admin-note-form { display: grid; gap: 10px; max-width: 940px; margin-top: 20px; }
        .admin-area .admin-note-form input,
        .admin-area .admin-note-form textarea { width: 100%; padding: 13px 14px; font: inherit; }
        .admin-area .request-item {
          color: #193936; background: #FAFBF8; border: 1px solid #E7EAE4;
          border-radius: 13px; padding: 18px;
        }
        .admin-area .request-item p,
        .admin-area .request-item small { color: #687A73 !important; }
        .admin-area .request-item h3,
        .admin-area .request-item strong { color: #193936 !important; }
        .admin-area .form-error { color: #B42318 !important; }
        .admin-area .form-message { color: #16805F !important; }
        .admin-area .empty-state { color: #71817B !important; }
        .admin-area .section-head { margin: 0 0 25px; }
        .admin-area .section-head h1 { color: #193936 !important; }
        .admin-area .section-head p { color: #71817B !important; }
        @media (max-width: 900px) {
          .admin-area { padding: 12px 0 35px; }
          .admin-shell, .admin-shell.is-collapsed { grid-template-columns: 1fr; }
          .admin-sidebar { padding: 15px; }
          .admin-brand { padding-bottom: 14px; margin-bottom: 13px; }
          .admin-nav-groups { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 5px; }
          .admin-nav-group { display: contents; }
          .admin-nav-label { display: none; }
          .admin-nav-button { width: auto; flex: 0 0 auto; min-height: 40px; padding: 9px 12px; }
          .admin-sidebar-bottom { display: none; }
          .admin-main { padding: 22px 18px 28px; }
        }
        @media (max-width: 560px) {
          .admin-area .dashboard-panel { padding: 17px; }
          .admin-topbar { align-items: flex-start; }
          .admin-topbar-actions { display: none; }
          .admin-page-description { max-width: 100%; }
          .admin-nav-button { font-size: 11px; }
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
          <strong>Nouvelle notification</strong>
          <p style={{ margin: "8px 0 12px", color: "#ffffff" }}>{notification}</p>
          <button type="button" onClick={() => setNotification("")} style={{ color: "#172B3D", background: "#ffffff", border: 0, borderRadius: "6px", padding: "7px 12px", cursor: "pointer" }}>
            Fermer
          </button>
        </div>
      )}
      <div className={`admin-shell ${adminSidebarCollapsed ? "is-collapsed" : ""}`}>
        <aside className="admin-sidebar">
          <div className="admin-brand">
            <div className="admin-brand-mark">R.</div>
            {!adminSidebarCollapsed && (
              <div>
                <div className="admin-brand-name">RAWAGO</div>
                <div className="admin-brand-sub">ESPACE ADMINISTRATEUR</div>
              </div>
            )}
          </div>

          <div className="admin-nav-groups">
            <div className="admin-nav-group">
              {!adminSidebarCollapsed && <div className="admin-nav-label">Pilotage</div>}
              <button type="button" title="Tableau de bord" className={`admin-nav-button ${activeAdminPage === "dashboard" ? "active" : ""}`} onClick={() => setActiveAdminPage("dashboard")}>
                <span className="admin-nav-icon">⌂</span>{!adminSidebarCollapsed && <span>Vue d'ensemble</span>}
              </button>
            </div>

            <div className="admin-nav-group">
              {!adminSidebarCollapsed && <div className="admin-nav-label">Relation client</div>}
              <button type="button" title="Messagerie des clients" className={`admin-nav-button ${activeAdminPage === "messages" ? "active" : ""}`} onClick={() => setActiveAdminPage("messages")}>
                <span className="admin-nav-icon">✉</span>{!adminSidebarCollapsed && <span>Messagerie</span>}
                {!adminSidebarCollapsed && unreadMessages.length > 0 && <span className="admin-nav-count">{unreadMessages.length}</span>}
              </button>
              <button type="button" title="Demandes clients" className={`admin-nav-button ${activeAdminPage === "requests" ? "active" : ""}`} onClick={() => setActiveAdminPage("requests")}>
                <span className="admin-nav-icon">▤</span>{!adminSidebarCollapsed && <span>Demandes clients</span>}
                {!adminSidebarCollapsed && pendingRequests.length > 0 && <span className="admin-nav-count">{pendingRequests.length}</span>}
              </button>
              <button type="button" title="Liste des clients" className={`admin-nav-button ${activeAdminPage === "clients" ? "active" : ""}`} onClick={() => setActiveAdminPage("clients")}>
                <span className="admin-nav-icon">♙</span>{!adminSidebarCollapsed && <span>Clients</span>}
              </button>
            </div>

            <div className="admin-nav-group">
              {!adminSidebarCollapsed && <div className="admin-nav-label">Contenus & publications</div>}
              <button type="button" title="Bibliothèque et références" className={`admin-nav-button ${activeAdminPage === "references" ? "active" : ""}`} onClick={() => setActiveAdminPage("references")}>
                <span className="admin-nav-icon">▣</span>{!adminSidebarCollapsed && <span>Bibliothèque</span>}
              </button>
              <button type="button" title="Savoirs et réflexions" className={`admin-nav-button ${activeAdminPage === "knowledge" ? "active" : ""}`} onClick={() => setActiveAdminPage("knowledge")}>
                <span className="admin-nav-icon">✎</span>{!adminSidebarCollapsed && <span>Savoirs & réflexions</span>}
              </button>
              <button type="button" title="Agenda et activités" className={`admin-nav-button ${activeAdminPage === "events" ? "active" : ""}`} onClick={() => setActiveAdminPage("events")}>
                <span className="admin-nav-icon">▦</span>{!adminSidebarCollapsed && <span>Agenda & activités</span>}
              </button>
            </div>

            <div className="admin-nav-group">
              {!adminSidebarCollapsed && <div className="admin-nav-label">Gestion interne</div>}
              <button type="button" title="Commandes de livres" className={`admin-nav-button ${activeAdminPage === "bookOrders" ? "active" : ""}`} onClick={() => setActiveAdminPage("bookOrders")}>
                <span className="admin-nav-icon">▧</span>{!adminSidebarCollapsed && <span>Commandes de livres</span>}
              </button>
              <button type="button" title="Notes" className={`admin-nav-button ${activeAdminPage === "notes" ? "active" : ""}`} onClick={() => setActiveAdminPage("notes")}>
                <span className="admin-nav-icon">▤</span>{!adminSidebarCollapsed && <span>Notes personnelles</span>}
              </button>
              <button type="button" title="Réglages du compte" className={`admin-nav-button ${activeAdminPage === "account" ? "active" : ""}`} onClick={() => { setAccountNotice(""); setAccountError(""); setActiveAdminPage("account"); }}>
                <span className="admin-nav-icon">⚙</span>{!adminSidebarCollapsed && <span>Mon compte & réglages</span>}
              </button>
            </div>
          </div>

          <div className="admin-sidebar-bottom">
            <button
              type="button"
              className="admin-collapse-button"
              onClick={() => setAdminSidebarCollapsed(value => !value)}
              aria-label={adminSidebarCollapsed ? "Déployer le menu" : "Réduire le menu"}
            >
              {adminSidebarCollapsed ? "»" : "«  Réduire le menu"}
            </button>
          </div>
        </aside>

        <div className="admin-main">
          <header className="admin-topbar">
            <div>
              <div className="admin-breadcrumb">RAWAGO / Administration</div>
              <h1 className="admin-page-title">
                {activeAdminPage === "bookOrders"
                  ? "Commandes de livres"
                  : activeAdminPage === "events"
                    ? "Agenda et activités"
                    : activeAdminPage === "knowledge"
                      ? "Savoirs et réflexions"
                      : activeAdminPage === "references"
                        ? "Bibliothèque et références"
                        : activeAdminPage === "messages"
                          ? "Messagerie des clients"
                          : activeAdminPage === "requests"
                            ? "Demandes clients"
                            : activeAdminPage === "clients"
                              ? "Espace clients"
                              : activeAdminPage === "notes"
                                ? "Notes personnelles"
                                : activeAdminPage === "account"
                                  ? "Mon compte & réglages"
                                  : "Vue d'ensemble"}
              </h1>
              <p className="admin-page-description">
                {activeAdminPage === "dashboard"
                  ? "Pilotez l'activité de Berger-Le-Bonheur RAWAGO depuis un espace unique."
                  : activeAdminPage === "messages"
                    ? "Consultez et gérez les échanges avec vos clients."
                    : activeAdminPage === "requests"
                      ? "Suivez les demandes et leur progression."
                      : activeAdminPage === "clients"
                        ? "Retrouvez les informations de vos clients."
                        : activeAdminPage === "references"
                          ? "Gérez votre catalogue et vos références documentaires."
                          : activeAdminPage === "knowledge"
                            ? "Rédigez et publiez vos contenus éditoriaux."
                            : activeAdminPage === "events"
                              ? "Organisez les ateliers, rencontres, conférences et formations."
                              : activeAdminPage === "bookOrders"
                                ? "Suivez les commandes et les demandes de livres."
                                : activeAdminPage === "account"
                                  ? "Gérez vos informations personnelles, votre adresse e-mail et votre sécurité."
                                  : "Votre espace privé de travail et d'organisation."}
              </p>
            </div>
            <div className="admin-topbar-actions">
              <span className="admin-live-pill"><span className="admin-live-dot"></span> Espace sécurisé</span>
            </div>
          </header>
      {error && <p className="form-error">{error}</p>}



      {activeAdminPage === "bookOrders" && <BookOrdersAdmin />}

      {activeAdminPage === "events" && <EventsAdmin />}

      {activeAdminPage === "account" && (
        <section className="dashboard-panel" style={{ marginBottom: "28px", maxWidth: "900px" }}>
          <div className="eyebrow">ESPACE PERSONNEL</div>
          <h2 style={{ marginTop: "8px" }}>Paramètres du compte administrateur</h2>
          <p>Modifiez les informations utilisées pour votre compte de connexion et sécurisez votre accès à l'administration.</p>
          {accountError && <p className="form-error" role="alert">{accountError}</p>}
          {accountNotice && <p className="form-message" role="status">{accountNotice}</p>}

          <form className="admin-note-form" onSubmit={saveAdminAccount}>
            <h3>Informations personnelles</h3>
            <label>Nom affiché dans l'administration
              <input value={accountNameInput} onChange={event => setAccountNameInput(event.target.value)} placeholder="Nom et prénom" autoComplete="name" />
            </label>
            <label>Adresse e-mail de connexion
              <input type="email" value={accountEmailInput} onChange={event => setAccountEmailInput(event.target.value)} placeholder="admin@exemple.com" autoComplete="email" />
            </label>
            <small>Un changement d'adresse e-mail peut nécessiter une confirmation envoyée par Supabase à votre boîte mail.</small>
            <div style={{ height: "1px", background: "#E7EAE4", margin: "12px 0" }} />
            <h3>Sécurité et mot de passe</h3>
            <label>Nouveau mot de passe
              <input type="password" value={accountPassword} onChange={event => setAccountPassword(event.target.value)} placeholder="8 caractères minimum" autoComplete="new-password" />
            </label>
            <label>Confirmer le nouveau mot de passe
              <input type="password" value={accountPasswordConfirm} onChange={event => setAccountPasswordConfirm(event.target.value)} placeholder="Répétez le nouveau mot de passe" autoComplete="new-password" />
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "8px" }}>
              <button className="btn primary" type="submit" disabled={accountSaving}>{accountSaving ? "Enregistrement..." : "Enregistrer les réglages"}</button>
              <button className="btn secondary" type="button" onClick={() => { setAccountNameInput(adminFullName); setAccountEmailInput(adminEmail); setAccountPassword(""); setAccountPasswordConfirm(""); setAccountError(""); setAccountNotice(""); }}>Annuler les modifications</button>
            </div>
          </form>

          <div style={{ marginTop: "30px", padding: "20px", borderRadius: "13px", background: "#F8F5EF", border: "1px solid #E9E1D4" }}>
            <h3 style={{ marginTop: 0 }}>Session administrateur</h3>
            <p style={{ marginBottom: "14px" }}>Connecté avec : <strong>{adminEmail || "Adresse e-mail non disponible"}</strong></p>
            <button type="button" className="btn secondary" onClick={signOutAdmin}>Se déconnecter</button>
          </div>
        </section>
      )}

      {activeAdminPage === "knowledge" && (
        <section className="dashboard-panel" style={{ marginBottom: "28px" }}>
          <div className="eyebrow">ESPACE ÉDITORIAL</div>
          <h2>{editingKnowledgeId ? "Modifier une publication" : "Rédiger un article"}</h2>
          <p>Les articles au statut « Publié » seront affichés sur la page publique Savoirs et réflexions.</p>
          {knowledgeError && <p className="form-error" role="alert">{knowledgeError}</p>}
          {knowledgeNotice && <p className="form-message" role="status">{knowledgeNotice}</p>}
          <form className="admin-note-form" onSubmit={saveKnowledgeArticle}>
            <label htmlFor="knowledge-title">Titre de l’article</label>
            <input id="knowledge-title" value={knowledgeTitle} onChange={e => setKnowledgeTitle(e.target.value)} maxLength={200} required placeholder="Titre de votre publication" />
            <label htmlFor="knowledge-category">Catégorie</label>
            <select id="knowledge-category" value={knowledgeCategory} onChange={e => setKnowledgeCategory(e.target.value)}>
              {knowledgeCategories.map(category => <option key={category} value={category}>{category}</option>)}
            </select>
            <label htmlFor="knowledge-summary">Résumé</label>
            <textarea id="knowledge-summary" rows={3} value={knowledgeSummary} onChange={e => setKnowledgeSummary(e.target.value)} maxLength={500} required placeholder="Une courte présentation de l’article..." />
            <label htmlFor="knowledge-content">Contenu de l’article</label>
            <textarea id="knowledge-content" rows={12} value={knowledgeContent} onChange={e => setKnowledgeContent(e.target.value)} required placeholder="Rédigez votre article ici..." />
            <label htmlFor="knowledge-image">Image de couverture (URL facultative)</label>
            <input id="knowledge-image" type="url" value={knowledgeImage} onChange={e => setKnowledgeImage(e.target.value)} placeholder="https://..." />
            <label htmlFor="knowledge-status">Publication</label>
            <select id="knowledge-status" value={knowledgeStatus} onChange={e => setKnowledgeStatus(e.target.value)}>
              <option value="draft">Enregistrer comme brouillon</option>
              <option value="published">Publier immédiatement</option>
            </select>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button className="btn primary" type="submit" disabled={knowledgeSaving}>{knowledgeSaving ? "Enregistrement..." : editingKnowledgeId ? "Enregistrer les modifications" : "Enregistrer l’article"}</button>
              {editingKnowledgeId && <button className="btn secondary" type="button" onClick={resetKnowledgeForm}>Annuler</button>}
            </div>
          </form>
          <div style={{ marginTop: "32px" }}>
            <h2>Publications enregistrées ({knowledgeArticles.length})</h2>
            {knowledgeLoading ? <p>Chargement des publications...</p> : knowledgeArticles.length === 0 ? <p className="empty-state">Aucun article pour le moment.</p> : (
              <div className="request-list">
                {knowledgeArticles.map(article => (
                  <article className="request-item" key={article.id}>
                    <div className="eyebrow">{article.category} · {article.status === "published" ? "PUBLIÉ" : "BROUILLON"}</div>
                    <h3>{article.title}</h3>
                    <p>{article.summary}</p>
                    <small>Mis à jour le {new Date(article.updated_at).toLocaleString("fr-FR")}</small>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
                      <button className="btn secondary" type="button" onClick={() => editKnowledgeArticle(article)}>Modifier</button>
                      <button className="btn secondary" type="button" onClick={() => deleteKnowledgeArticle(article)}>Supprimer</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {activeAdminPage === "references" && (
        <>
      <section className="dashboard-panel" style={{ marginBottom: "35px" }}>
        <div className="eyebrow">IMPORTATION DEPUIS UN FICHIER</div>
        <h2>Importer un catalogue CSV</h2>
        <p>Charge un fichier CSV exporté depuis Excel ou Google Sheets. Colonnes reconnues : title/titre, authors/auteurs, category/catégorie, description, publisher/éditeur, published_date/date, isbn, cover_url et language/langue.</p>
        <label style={{ display: "block", margin: "16px 0" }}>
          Fichier CSV
          <input type="file" accept=".csv,text/csv" onChange={prepareCsvImport} style={{ display: "block", marginTop: "8px" }} />
        </label>
        {csvFileName && <p><strong>Fichier :</strong> {csvFileName}</p>}
        {csvNotice && <p className="form-message" role="status">{csvNotice}</p>}
        {csvPreview.length > 0 && <>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", margin: "14px 0" }}>
            <span><strong>{csvPreview.length}</strong> lignes valides</span>
            <span><strong>{csvPreview.filter(book => !book._duplicate).length}</strong> références à ajouter</span>
            <span><strong>{csvPreview.filter(book => book._duplicateReason === "already-in-catalog").length}</strong> déjà dans Supabase</span>
            <span><strong>{csvPreview.filter(book => book._duplicateReason === "repeated-in-file").length}</strong> répétées dans le CSV</span>
          </div>
          <div style={{ maxHeight: "420px", overflow: "auto", border: "1px solid #E2E8EC", borderRadius: "10px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead><tr><th style={{ textAlign: "left", padding: "10px" }}>Titre</th><th style={{ textAlign: "left", padding: "10px" }}>Auteur(s)</th><th style={{ textAlign: "left", padding: "10px" }}>Catégorie</th><th style={{ textAlign: "left", padding: "10px" }}>Contrôle</th></tr></thead>
              <tbody>{csvPreview.slice(0, 100).map((book, index) => <tr key={`${book.source_id}-${index}`} style={{ borderTop: "1px solid #E2E8EC" }}>
                <td style={{ padding: "10px" }}>{book.title}</td><td style={{ padding: "10px" }}>{book.authors.join(", ") || "Non renseigné"}</td><td style={{ padding: "10px" }}>{book.category}</td>
                <td style={{ padding: "10px", color: book._duplicate ? "#B42318" : "#087F7B" }}>{book._duplicateReason === "already-in-catalog" ? "Déjà dans Supabase — ignoré" : book._duplicateReason === "repeated-in-file" ? "Répétition dans le CSV — ignorée" : "Prêt à importer"}</td>
              </tr>)}</tbody>
            </table>
          </div>
          {csvPreview.length > 100 && <p>Les 100 premières lignes sont affichées. Les {csvPreview.length} lignes seront traitées.</p>}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "18px" }}>
            <button className="btn primary" type="button" disabled={csvImporting || !csvPreview.some(book => !book._duplicate)} onClick={importCsvPreview}>{csvImporting ? "Traitement..." : `Ajouter ${csvPreview.filter(book => !book._duplicate).length} nouvelles références`}</button>
            <button className="btn secondary" type="button" disabled={csvImporting} onClick={replaceCatalogFromCsv}>Remplacer tout le catalogue…</button>
            <button className="btn secondary" type="button" disabled={csvImporting} onClick={() => { setCsvPreview([]); setCsvFileName(""); setCsvNotice(""); }}>Annuler l’aperçu</button>
          </div>
          <small style={{ display: "block", marginTop: "10px" }}>Le remplacement intégral nécessite l’installation préalable de la fonction SQL sécurisée fournie séparément. Sans elle, le catalogue existant ne sera pas supprimé.</small>
        </>}
      </section>

      <section className="dashboard-panel" style={{ marginBottom: "35px" }}>
        <div className="eyebrow">IMPORTATION DEPUIS UN FICHIER</div>
        <h2>Importer un catalogue CSV</h2>
        <p>Charge un fichier CSV exporté depuis Excel ou Google Sheets. Colonnes reconnues : title/titre, authors/auteurs, category/catégorie, description, publisher/éditeur, published_date/date, isbn, cover_url et language/langue.</p>
        <label style={{ display: "block", margin: "16px 0" }}>Fichier CSV
          <input type="file" accept=".csv,text/csv" onChange={prepareCsvImport} style={{ display: "block", marginTop: "8px" }} />
        </label>
        {csvFileName && <p><strong>Fichier :</strong> {csvFileName}</p>}
        {csvNotice && <p className="form-message" role="status">{csvNotice}</p>}
        {csvPreview.length > 0 && <>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", margin: "14px 0" }}>
            <span><strong>{csvPreview.length}</strong> lignes valides</span>
            <span><strong>{csvPreview.filter(book => !book._duplicate).length}</strong> références à ajouter</span>
            <span><strong>{csvPreview.filter(book => book._duplicateReason === "already-in-catalog").length}</strong> déjà dans Supabase</span>
            <span><strong>{csvPreview.filter(book => book._duplicateReason === "repeated-in-file").length}</strong> répétées dans le CSV</span>
          </div>
          <div style={{ maxHeight: "420px", overflow: "auto", border: "1px solid #E2E8EC", borderRadius: "10px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <thead><tr><th style={{ textAlign: "left", padding: "10px" }}>Titre</th><th style={{ textAlign: "left", padding: "10px" }}>Auteur(s)</th><th style={{ textAlign: "left", padding: "10px" }}>Catégorie</th><th style={{ textAlign: "left", padding: "10px" }}>Contrôle</th></tr></thead>
              <tbody>{csvPreview.slice(0, 100).map((book, index) => <tr key={`${book.source_id}-${index}`} style={{ borderTop: "1px solid #E2E8EC" }}>
                <td style={{ padding: "10px" }}>{book.title}</td><td style={{ padding: "10px" }}>{book.authors.join(", ") || "Non renseigné"}</td><td style={{ padding: "10px" }}>{book.category}</td>
                <td style={{ padding: "10px", color: book._duplicate ? "#B42318" : "#087F7B" }}>{book._duplicateReason === "already-in-catalog" ? "Déjà dans Supabase — ignoré" : book._duplicateReason === "repeated-in-file" ? "Répétition dans le CSV — ignorée" : "Prêt à importer"}</td>
              </tr>)}</tbody>
            </table>
          </div>
          {csvPreview.length > 100 && <p>Les 100 premières lignes sont affichées. Les {csvPreview.length} lignes seront traitées.</p>}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "18px" }}>
            <button className="btn primary" type="button" disabled={csvImporting || !csvPreview.some(book => !book._duplicate)} onClick={importCsvPreview}>{csvImporting ? "Traitement..." : `Ajouter ${csvPreview.filter(book => !book._duplicate).length} nouvelles références`}</button>
            <button className="btn secondary" type="button" disabled={csvImporting} onClick={replaceCatalogFromCsv}>Remplacer tout le catalogue…</button>
            <button className="btn secondary" type="button" disabled={csvImporting} onClick={() => { setCsvPreview([]); setCsvFileName(""); setCsvNotice(""); }}>Annuler l’aperçu</button>
          </div>
          <small style={{ display: "block", marginTop: "10px" }}>Le remplacement intégral nécessite l’installation préalable de la fonction SQL sécurisée fournie séparément. Sans elle, le catalogue existant ne sera pas supprimé.</small>
        </>}
      </section>

      <section
        className="dashboard-panel"
        style={{ marginBottom: "35px" }}
      >
        <div className="eyebrow">BIBLIOTHÈQUE</div>

        <h2>Importation automatique du catalogue</h2>

        <p>
          Recherche et importation groupée de références
          documentaires dans les quatorze domaines de la bibliothèque.
        </p>

        <div
          style={{
            background: "#f5f1e8",
            borderRadius: "10px",
            padding: "18px",
            margin: "20px 0"
          }}
        >
          <h3>Objectif de l'importation</h3>

          <h2 style={{ color: "#159B96" }}>
            {totalTarget} références
          </h2>

          <p>
            Six domaines prioritaires : 100 références chacun.
          </p>

          <p>
            Huit domaines complémentaires : 30 références chacun.
          </p>

          <ul>
            {bulkSearches.map(item => (
              <li key={item.category}>
                {item.category} : {item.target} références
              </li>
            ))}

            <li>
              Articles scientifiques : {articleTarget} références
            </li>
          </ul>

          <p style={{ fontSize: "13px" }}>
            Les objectifs indiquent le nombre recherché.
            Le nombre réellement importé dépend des résultats disponibles
            et des doublons déjà présents.
          </p>
        </div>

        <button
          className="btn primary"
          type="button"
          onClick={importAllCategories}
          disabled={bulkImporting}
        >
          {bulkImporting
            ? "Importation en cours..."
            : `Importer automatiquement les ${totalTarget} références →`}
        </button>

        {bulkProgress && (
          <p
            role="status"
            style={{
              marginTop: "20px",
              padding: "14px",
              background: "#edf8f6",
              borderRadius: "8px"
            }}
          >
            {bulkProgress}
          </p>
        )}

        {bulkError && (
          <p className="form-error" role="alert">
            {bulkError}
          </p>
        )}

        {bulkSummary.length > 0 && (
          <div style={{ marginTop: "25px" }}>
            <h3>Bilan de l'importation</h3>

            <div className="request-list">
              {bulkSummary.map(item => (
                <article
                  className="request-item"
                  key={item.category}
                >
                  <strong>{item.category}</strong>

                  <p>
                    Objectif : {item.target}
                  </p>

                  <p>
                    Références trouvées : {item.found}
                  </p>

                  <p>
                    Nouvelles références ajoutées : {item.added}
                  </p>
                </article>
              ))}
            </div>
          </div>
        )}

        <p style={{ fontSize: "12px", color: "#777", marginTop: "25px" }}>
          Sources : Internet Archive et Crossref.
          Les notices bibliographiques importées sont publiées automatiquement.
          Les informations de licence éventuellement fournies par les sources sont
          conservées à titre indicatif ; elles ne constituent pas une autorisation
          de redistribuer les fichiers, couvertures ou numérisations.
        </p>
      </section>

      <section
        className="dashboard-panel"
        style={{ marginBottom: "35px" }}
      >
        <div className="eyebrow">CATALOGUE DOCUMENTAIRE</div>
        <h2>Gestion de la bibliothèque</h2>
        <p>
          Les notices bibliographiques peuvent être publiées sans contrôle préalable des droits.
          Le statut des droits reste une information distincte et ne bloque plus la publication.
        </p>

        <div className="dashboard-grid" style={{ margin: "20px 0" }}>
          <div className="dashboard-panel">
            <strong>{catalogBooks.length}</strong>
            <p>Références dans le catalogue</p>
          </div>
          <div className="dashboard-panel">
            <strong>{catalogBooks.filter(book => book.rights_status === "verified").length}</strong>
            <p>Droits indiqués comme vérifiés (information)</p>
          </div>
          <div className="dashboard-panel">
            <strong>{catalogBooks.filter(book => book.is_active).length}</strong>
            <p>Références publiées</p>
          </div>
        </div>

        <div style={{ background: "#f5f1e8", borderRadius: "10px", padding: "18px", margin: "20px 0" }}>
          <h3>Publication du catalogue</h3>
          <p>
            Cette action publie les notices bibliographiques actuellement non publiées.
            Elle ne met pas à disposition les fichiers PDF et ne confère aucun droit
            supplémentaire sur les ouvrages, les couvertures ou les numérisations.
          </p>
          <button
            className="btn primary"
            type="button"
            onClick={publishAllExistingReferences}
            disabled={catalogSaving === "all" || catalogLoading}
          >
            {catalogSaving === "all" ? "Publication en cours..." : "Publier toutes les références non publiées →"}
          </button>
        </div>

        <label style={{ display: "block", margin: "18px 0" }}>
          Rechercher dans le catalogue
          <input
            type="search"
            value={catalogSearch}
            onChange={event => setCatalogSearch(event.target.value)}
            placeholder="Titre, auteur, catégorie ou source..."
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "8px"
            }}
          />
        </label>

        <label style={{ display: "block", marginBottom: "20px" }}>
          Afficher
          <select
            value={catalogFilter}
            onChange={event => setCatalogFilter(event.target.value)}
            style={{
              width: "100%",
              padding: "12px",
              marginTop: "8px"
            }}
          >
            <option value="all">Toutes les références</option>
            <option value="pending">Non publiées</option>
            <option value="verified">Droits vérifiés (information)</option>
            <option value="published">Références publiées</option>
          </select>
        </label>

        {catalogError && (
          <p className="form-error" role="alert">{catalogError}</p>
        )}
        {catalogMessage && (
          <p className="form-message" role="status">{catalogMessage}</p>
        )}

        {catalogLoading ? (
          <p>Chargement du catalogue...</p>
        ) : filteredCatalogBooks.length === 0 ? (
          <p className="empty-state">
            Aucune référence ne correspond à cette recherche.
          </p>
        ) : (
          <>
            <p>
              Affichage de {Math.min(filteredCatalogBooks.length, 50)} sur{" "}
              {filteredCatalogBooks.length} références correspondant au filtre.
            </p>
            <div className="request-list">
              {filteredCatalogBooks.slice(0, 50).map(book => (
                <article className="request-item" key={book.id}>
                  <div style={{
                    display: "flex",
                    gap: "16px",
                    alignItems: "flex-start",
                    flexWrap: "wrap"
                  }}>
                    {book.cover_url ? (
                      <img
                        src={book.cover_url}
                        alt={`Couverture : ${book.title}`}
                        loading="lazy"
                        style={{
                          width: "78px",
                          height: "110px",
                          objectFit: "contain",
                          background: "#f5f1e8",
                          borderRadius: "6px"
                        }}
                      />
                    ) : (
                      <div style={{
                        width: "78px",
                        height: "110px",
                        display: "grid",
                        placeItems: "center",
                        textAlign: "center",
                        background: "#f5f1e8",
                        borderRadius: "6px",
                        fontSize: "12px",
                        color: "#777"
                      }}>
                        Sans couverture
                      </div>
                    )}

                    <div style={{ flex: "1 1 240px" }}>
                      <h3>{book.title || "Titre non renseigné"}</h3>
                      <p>
                        <strong>Auteur(s) :</strong>{" "}
                        {Array.isArray(book.authors) && book.authors.length
                          ? book.authors.join(", ")
                          : "Non renseigné"}
                      </p>
                      <p><strong>Catégorie :</strong> {book.category || "Non renseignée"}</p>
                      <p><strong>Source :</strong> {book.source || "Non renseignée"}</p>
                      <p>
                        <strong>État des droits :</strong>{" "}
                        {book.rights_status === "verified"
                          ? (book.rights_evidence ? "Licence déclarée comme vérifiée" : "Vérifiés manuellement")
                          : "Non vérifiés — n'empêche pas la publication"}
                      </p>
                      <p>
                        <strong>Publication :</strong>{" "}
                        {book.is_active ? "Publiée" : "Non publiée"}
                      </p>
                      {book.license_url && (
                        <p>
                          <strong>Licence détectée :</strong>{" "}
                          <a href={book.license_url} target="_blank" rel="noopener noreferrer">Consulter la licence</a>
                        </p>
                      )}
                      {book.rights_evidence && (
                        <p><strong>Résultat du contrôle :</strong> {book.rights_evidence}</p>
                      )}

                      <div style={{
                        display: "flex",
                        gap: "10px",
                        flexWrap: "wrap",
                        marginTop: "12px"
                      }}>
                        {!book.is_active && (
                          <button
                            className="btn primary"
                            type="button"
                            disabled={catalogSaving === book.id}
                            onClick={() => updateCatalogBook(book, { is_active: true }, "Référence publiée dans la bibliothèque publique.")}
                          >
                            {catalogSaving === book.id ? "Publication..." : "Publier cette référence"}
                          </button>
                        )}

                        {book.is_active && (
                          <button
                            className="btn secondary"
                            type="button"
                            disabled={catalogSaving === book.id}
                            onClick={() => unpublishCatalogBook(book)}
                          >
                            {catalogSaving === book.id
                              ? "Mise à jour..."
                              : "Retirer de la bibliothèque"}
                          </button>
                        )}
                        <button className="btn secondary" type="button" disabled={catalogSaving === book.id} onClick={() => deleteCatalogBook(book)} style={{ borderColor: "#B42318", color: "#B42318" }}>
                          {catalogSaving === book.id ? "Suppression..." : "Supprimer définitivement"}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      <section
        className="dashboard-panel"
        style={{ marginBottom: "35px" }}
      >
        <div className="eyebrow">IMPORTATION INDIVIDUELLE</div>

        <h2>Ajouter des ouvrages au catalogue</h2>

        <p>
          Recherche un ouvrage dans Open Library et importe
          ses principales informations bibliographiques.
        </p>

        <form onSubmit={searchBooks}>
          <label>
            Titre ou auteur

            <input
              type="search"
              value={bookSearch}
              onChange={event => setBookSearch(event.target.value)}
              placeholder="Ex. : droit constitutionnel, économie, auteur..."
              style={{
                width: "100%",
                padding: "13px",
                marginTop: "8px",
                marginBottom: "18px"
              }}
            />
          </label>

          <label>
            Catégorie de destination

            <select
              value={bookCategory}
              onChange={event => setBookCategory(event.target.value)}
              style={{
                width: "100%",
                padding: "13px",
                marginTop: "8px",
                marginBottom: "18px"
              }}
            >
              {bookCategories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <button
            className="btn primary"
            type="submit"
            disabled={searchingBooks}
          >
            {searchingBooks
              ? "Recherche en cours..."
              : "Rechercher des ouvrages →"}
          </button>
        </form>

        {bookError && (
          <p className="form-error" role="alert" style={{ marginTop: "18px" }}>
            {bookError}
          </p>
        )}

        {bookMessage && (
          <p className="form-message" style={{ marginTop: "18px" }}>
            {bookMessage}
          </p>
        )}

        {bookResults.length > 0 && (
          <div style={{ marginTop: "30px" }}>
            <h3>Résultats de recherche</h3>

            <div className="request-list">
              {bookResults.map(book => {
                const alreadyImported =
                  importedBooks.includes(book.key);

                return (
                  <article
                    className="request-item"
                    key={book.key}
                    style={{
                      display: "flex",
                      gap: "18px",
                      alignItems: "flex-start",
                      flexWrap: "wrap"
                    }}
                  >
                    <div
                      style={{
                        width: "95px",
                        height: "135px",
                        flexShrink: 0,
                        background: "#f5f1e8",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden"
                      }}
                    >
                      {book.cover_i ? (
                        <img
                          src={`https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`}
                          alt={`Couverture de ${book.title}`}
                          loading="lazy"
                          style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            objectFit: "contain"
                          }}
                        />
                      ) : (
                        <small>Sans couverture</small>
                      )}
                    </div>

                    <div style={{ flex: "1 1 220px" }}>
                      <h3>{book.title || "Titre non renseigné"}</h3>

                      <p>
                        <strong>Auteur(s) :</strong>{" "}
                        {book.author_name?.join(", ") || "Non renseigné"}
                      </p>

                      <p>
                        <strong>Première publication :</strong>{" "}
                        {book.first_publish_year || "Non renseignée"}
                      </p>

                      <p>
                        <strong>Éditions :</strong>{" "}
                        {book.edition_count || "Non renseignées"}
                      </p>

                      <p>
                        <strong>ISBN :</strong>{" "}
                        {book.isbn?.[0] || "Non renseigné"}
                      </p>

                      <button
                        className="btn primary"
                        type="button"
                        disabled={
                          alreadyImported ||
                          importingBook === book.key
                        }
                        onClick={() => addBookToCatalog(book)}
                      >
                        {alreadyImported
                          ? "Ajouté"
                          : importingBook === book.key
                            ? "Ajout en cours..."
                            : "Ajouter au catalogue"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        )}
      </section>

        </>
      )}

      {activeAdminPage === "dashboard" && (
        <div style={{ display: "grid", gap: "22px" }}>
          <section className="dashboard-grid" aria-label="Indicateurs de l'activité">
            <article className="dashboard-panel">
              <p className="eyebrow">À TRAITER</p>
              <h2 style={{ fontSize: "2rem", margin: "5px 0" }}>{pendingRequests.length}</h2>
              <p>Demandes en attente ou à l'étude</p>
              <button className="btn secondary" type="button" onClick={() => setActiveAdminPage("requests")}>
                Voir les demandes
              </button>
            </article>
            <article className="dashboard-panel">
              <p className="eyebrow">MESSAGES</p>
              <h2 style={{ fontSize: "2rem", margin: "5px 0" }}>{unreadMessages.length}</h2>
              <p>Messages clients non lus</p>
              <button className="btn secondary" type="button" onClick={() => setActiveAdminPage("messages")}>
                Ouvrir la messagerie
              </button>
            </article>
            <article className="dashboard-panel">
              <p className="eyebrow">EN COURS</p>
              <h2 style={{ fontSize: "2rem", margin: "5px 0" }}>{inProgressRequests.length}</h2>
              <p>Prestations en cours</p>
              <button className="btn secondary" type="button" onClick={() => setActiveAdminPage("requests")}>
                Suivre l'activité
              </button>
            </article>
            <article className="dashboard-panel">
              <p className="eyebrow">COMPTES CLIENTS</p>
              <h2 style={{ fontSize: "2rem", margin: "5px 0" }}>{clients.length}</h2>
              <p>Clients enregistrés · {completedRequests.length} demande(s) terminée(s)</p>
              <button className="btn secondary" type="button" onClick={() => setActiveAdminPage("clients")}>
                Voir les clients
              </button>
            </article>
          </section>

          <section className="dashboard-panel">
            <div className="request-heading">
              <h2>Centre de notifications</h2>
              <span className="status status-pending">{unreadMessages.length} non lu(s)</span>
            </div>
            <p>Les messages non lus restent visibles ici jusqu'à leur ouverture dans la messagerie.</p>
            {unreadMessages.length === 0 ? (
              <p className="empty-state">Aucun message en attente de lecture.</p>
            ) : (
              <div className="request-list">
                {unreadMessages.slice(0, 8).map(item => {
                  const client = clients.find(person => person.id === item.client_id);
                  return (
                    <article className="request-item" key={item.id}>
                      <div className="request-item-top">
                        <strong>{client?.full_name || "Client"}</strong>
                        <small>{new Date(item.created_at).toLocaleString("fr-FR")}</small>
                      </div>
                      <p>{item.attachment_name ? `📎 ${item.attachment_name}` : item.body}</p>
                      <button
                        className="btn primary"
                        type="button"
                        onClick={() => {
                          setSelectedMessageClient(item.client_id);
                          setActiveAdminPage("messages");
                          setNotification("");
                        }}
                      >
                        Ouvrir la conversation
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="dashboard-panel">
            <div className="request-heading">
              <h2>Activité récente</h2>
              <button className="btn secondary" type="button" onClick={() => setActiveAdminPage("requests")}>
                Toutes les demandes
              </button>
            </div>
            <div className="dashboard-grid">
              <div>
                <h3>Derniers messages reçus</h3>
                {recentIncomingMessages.length === 0 ? (
                  <p className="empty-state">Aucun message reçu pour le moment.</p>
                ) : (
                  <div className="request-list">
                    {recentIncomingMessages.map(item => {
                      const client = clients.find(person => person.id === item.client_id);
                      const isUnread = !item.read_at;
                      return (
                        <article className="request-item" key={item.id}>
                          <strong>{client?.full_name || "Client"}</strong>
                          {isUnread && <span className="status status-pending" style={{ marginLeft: "8px" }}>Non lu</span>}
                          <p>{item.attachment_name ? `📎 ${item.attachment_name}` : item.body}</p>
                          <small>{new Date(item.created_at).toLocaleString("fr-FR")}</small>
                          <div style={{ marginTop: "10px" }}>
                            <button className="btn secondary" type="button" onClick={() => {
                              setSelectedMessageClient(item.client_id);
                              setActiveAdminPage("messages");
                            }}>
                              Consulter
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
              <div>
                <h3>Dernières demandes</h3>
                {recentRequests.length === 0 ? (
                  <p className="empty-state">Aucune demande enregistrée.</p>
                ) : (
                  <div className="request-list">
                    {recentRequests.map(item => {
                      const client = clients.find(person => person.id === item.client_id);
                      return (
                        <article className="request-item" key={item.id}>
                          <div className="request-item-top">
                            <strong>{item.service}</strong>
                            <span className={`status status-${item.status}`}>{statusLabels[item.status] || item.status}</span>
                          </div>
                          <p>{client?.full_name || "Client"}</p>
                          <small>{new Date(item.created_at).toLocaleDateString("fr-FR")}</small>
                          <div style={{ marginTop: "10px" }}>
                            <button className="btn secondary" type="button" onClick={() => setActiveAdminPage("requests")}>
                              Ouvrir le suivi
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <p style={{ marginTop: "18px" }}>
              {requests.length} demande(s) au total · {new Set(messages.map(message => message.client_id)).size} conversation(s) · {adminNotes.length} note(s) personnelle(s)
            </p>
          </section>
        </div>
      )}

      {activeAdminPage === "clients" && (
        <section className="dashboard-panel">
          <h2>Liste des clients</h2>
          {clients.length === 0 ? (
            <p>Aucun client enregistré.</p>
          ) : (
            <div className="request-list">
              {clients.map(client => (
                <article className="request-item" key={client.id}>
                  <h3>{client.full_name || "Nom non renseigné"}</h3>
                  <p>Téléphone : {client.phone || "Non renseigné"}</p>
                  <p>Pays : {client.country || "Non renseigné"}</p>
                  {client.phone && (
                    <a
                      className="btn primary"
                      href={`https://wa.me/${client.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Contacter sur WhatsApp
                    </a>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeAdminPage === "notes" && (
        <section className="dashboard-panel">
          <div className="eyebrow">ESPACE PRIVÉ</div>
          <h2>{editingNoteId ? "Modifier une note" : "Nouvelle note"}</h2>
          <p>Vos notes sont privées et accessibles uniquement depuis le compte administrateur.</p>
          {notesError && <p className="form-error" role="alert">{notesError}</p>}
          {notesNotice && <p className="form-message" role="status">{notesNotice}</p>}
          <form onSubmit={saveAdminNote} className="admin-note-form">
            <label htmlFor="admin-note-title">Titre</label>
            <input
              id="admin-note-title"
              type="text"
              value={noteTitle}
              onChange={event => setNoteTitle(event.target.value)}
              placeholder="Ex. À suivre, idées, informations utiles..."
              maxLength={160}
              required
            />
            <label htmlFor="admin-note-body">Contenu</label>
            <textarea
              id="admin-note-body"
              value={noteBody}
              onChange={event => setNoteBody(event.target.value)}
              placeholder="Écrivez ici vos informations et rappels..."
              rows={7}
              required
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
              <button className="btn primary" type="submit" disabled={noteSaving}>
                {noteSaving ? "Enregistrement..." : editingNoteId ? "Enregistrer les modifications" : "Enregistrer la note"}
              </button>
              {editingNoteId && (
                <button className="btn secondary" type="button" onClick={cancelNoteEdit}>Annuler</button>
              )}
            </div>
          </form>
          <div style={{ marginTop: "32px" }}>
            <h2>Notes enregistrées ({adminNotes.length})</h2>
            {notesLoading ? (
              <p>Chargement des notes...</p>
            ) : adminNotes.length === 0 ? (
              <p className="empty-state">Aucune note enregistrée pour le moment.</p>
            ) : (
              <div className="request-list">
                {adminNotes.map(note => (
                  <article className="request-item" key={note.id}>
                    <h3>{note.title}</h3>
                    <p style={{ whiteSpace: "pre-wrap" }}>{note.body}</p>
                    <small>Modifiée le {new Date(note.updated_at).toLocaleString("fr-FR")}</small>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "12px" }}>
                      <button className="btn secondary" type="button" onClick={() => editAdminNote(note)}>Modifier</button>
                      <button className="btn secondary" type="button" onClick={() => deleteAdminNote(note.id)}>Supprimer</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {activeAdminPage === "messages" && (
      <section className="dashboard-panel" style={{ marginBottom: "28px" }}>
        <div className="eyebrow">ÉCHANGES PRIVÉS</div>
        <h2>Messagerie des clients {unreadMessages.length > 0 && <span className="status status-pending">{unreadMessages.length} non lu(s)</span>}</h2>
        <p>Échanges privés en temps réel avec chaque client. Les nouveaux messages apparaissent sans actualiser la page.</p>

        {messageError && <p className="form-error" role="alert">{messageError}</p>}
        {messageNotice && <p className="form-message" role="status">{messageNotice}</p>}

        {clients.length === 0 ? (
          <p className="empty-state">Aucun compte client disponible pour le moment.</p>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 285px), 1fr))",
                gap: "18px",
                alignItems: "stretch"
              }}
            >
              <aside
                style={{
                  border: "1px solid #e4e9ed",
                  borderRadius: "12px",
                  overflow: "hidden",
                  background: "#ffffff",
                  minWidth: 0
                }}
              >
                <div style={{ padding: "16px", borderBottom: "1px solid #e4e9ed" }}>
                  <h3 style={{ margin: "0 0 12px", color: "#172B3D" }}>Conversations</h3>
                  <input
                    type="search"
                    value={chatClientSearch}
                    onChange={event => setChatClientSearch(event.target.value)}
                    placeholder="Rechercher un client..."
                    aria-label="Rechercher un client"
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      padding: "11px 12px",
                      border: "1px solid #d8e0e6",
                      borderRadius: "8px"
                    }}
                  />
                  <small style={{ display: "block", marginTop: "8px", color: "#64748b" }}>
                    {clients.length} client(s)
                  </small>
                </div>
                <div style={{ maxHeight: "570px", overflowY: "auto" }}>
                  {clients
                    .filter(client => {
                      const query = chatClientSearch.trim().toLowerCase();
                      const searchable = `${client.full_name || ""} ${client.country || ""} ${client.email || ""}`.toLowerCase();
                      return !query || searchable.includes(query);
                    })
                    .map(client => {
                      const clientMessages = messages
                        .filter(item => item.client_id === client.id)
                        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                      const lastMessage = clientMessages[clientMessages.length - 1];
                      const unreadCount = clientMessages.filter(item =>
                        item.sender_id !== adminUserId && !item.read_at
                      ).length;
                      const isSelected = client.id === selectedMessageClient;

                      return (
                        <button
                          key={client.id}
                          type="button"
                          onClick={() => {
                            setSelectedMessageClient(client.id);
                            setNotification("");
                          }}
                          aria-pressed={isSelected}
                          style={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            padding: "14px 15px",
                            border: 0,
                            borderBottom: "1px solid #edf0f2",
                            borderLeft: isSelected ? "4px solid #159B96" : "4px solid transparent",
                            background: isSelected ? "#eaf5f3" : "#ffffff",
                            cursor: "pointer",
                            color: "#172B3D"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <strong style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {client.full_name || "Client sans nom"}
                            </strong>
                            {unreadCount > 0 && (
                              <span
                                style={{
                                  flexShrink: 0,
                                  minWidth: "21px",
                                  padding: "2px 6px",
                                  borderRadius: "20px",
                                  background: "#159B96",
                                  color: "#ffffff",
                                  fontSize: "0.75rem",
                                  textAlign: "center"
                                }}
                              >
                                {unreadCount}
                              </span>
                            )}
                          </div>
                          <small style={{ display: "block", color: "#64748b", marginTop: "3px" }}>
                            {client.country || "Pays non renseigné"}
                          </small>
                          <div
                            style={{
                              marginTop: "7px",
                              color: "#64748b",
                              fontSize: "0.84rem",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap"
                            }}
                          >
                            {lastMessage
                              ? `${lastMessage.sender_id === adminUserId ? "Vous : " : ""}${lastMessage.attachment_name ? "📎 " + lastMessage.attachment_name : lastMessage.body}`
                              : "Aucun message"}
                          </div>
                          {lastMessage && (
                            <small style={{ display: "block", marginTop: "5px", color: "#94a3b8" }}>
                              {new Date(lastMessage.created_at).toLocaleDateString("fr-FR")}
                            </small>
                          )}
                        </button>
                      );
                    })}
                  {clients.filter(client => {
                    const query = chatClientSearch.trim().toLowerCase();
                    return !query || `${client.full_name || ""} ${client.country || ""} ${client.email || ""}`.toLowerCase().includes(query);
                  }).length === 0 && (
                    <p style={{ padding: "16px", color: "#64748b" }}>Aucun client trouvé.</p>
                  )}
                </div>
              </aside>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "10px",
                    padding: "12px 15px",
                    marginBottom: "12px",
                    background: "#f5f1e8",
                    borderRadius: "10px"
                  }}
                >
                  <div>
                    <strong>
                      {clients.find(client => client.id === selectedMessageClient)?.full_name || "Sélectionner un client"}
                    </strong>
                    <p style={{ margin: "4px 0 0", fontSize: "0.88rem", color: "#64748b" }}>
                      <span style={{ color: clientOnline ? "#159B96" : "#8a8a8a" }}>●</span>
                      {" "}{clientOnline ? "En ligne" : "Hors ligne"}
                    </p>
                  </div>
                  {clientTyping && (
                    <span style={{ fontStyle: "italic", color: "#64748b", fontSize: "0.9rem" }}>
                      Le client écrit…
                    </span>
                  )}
                </div>

                <div
                  className="request-list"
                  aria-live="polite"
                  style={{
                    maxHeight: "430px",
                    minHeight: "300px",
                    overflowY: "auto",
                    padding: "16px",
                    background: "#f5f1e8",
                    borderRadius: "10px",
                    marginBottom: "16px"
                  }}
                >
              {messages.filter(item => item.client_id === selectedMessageClient).length === 0 ? (
                <p className="empty-state">Aucun message dans cette conversation. Vous pouvez écrire le premier message ci-dessous.</p>
              ) : (
                messages
                  .filter(item => item.client_id === selectedMessageClient)
                  .map(item => (
                    <article
                      className="request-item"
                      key={item.id}
                      style={{
                        maxWidth: "85%",
                        marginLeft: item.sender_id === adminUserId ? "auto" : "0",
                        background: item.sender_id === adminUserId ? "#e2f2ef" : "#ffffff"
                      }}
                    >
                      <strong>{item.sender_id === adminUserId ? "Vous" : "Client"}</strong>
                      {editingMessageId === item.id ? (
                        <form className="auth-form" onSubmit={event => saveAdminMessageEdit(event, item.id)}>
                          <textarea rows="3" maxLength="10000" value={editingMessageBody} onChange={event => setEditingMessageBody(event.target.value)} />
                          <button className="btn primary" type="submit">Enregistrer</button>
                          <button className="btn secondary" type="button" onClick={() => { setEditingMessageId(null); setEditingMessageBody(""); }}>Annuler</button>
                        </form>
                      ) : (
                        <p style={{ whiteSpace: "pre-wrap", fontStyle: item.deleted_at ? "italic" : "normal" }}>{item.body}</p>
                      )}
                      {item.edited_at && !item.deleted_at && <small> · Modifié</small>}
                      {item.sender_id === adminUserId && !item.deleted_at && editingMessageId !== item.id && (
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "8px" }}>
                          <button type="button" className="btn secondary" onClick={() => { setEditingMessageId(item.id); setEditingMessageBody(item.body || ""); }}>Modifier ma réponse</button>
                          <button type="button" className="btn secondary" onClick={() => deleteAdminMessage(item.id)}>Supprimer ma réponse</button>
                        </div>
                      )}
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
                        {item.sender_id === adminUserId && (
                          <span> · {item.read_at ? "Lu par le client" : "Envoyé"}</span>
                        )}
                      </small>
                    </article>
                  ))
              )}
            </div>

            <form className="auth-form" onSubmit={sendAdminReply}>
              <label>
                Votre réponse
                <textarea
                  rows="4"
                  maxLength="10000"
                  value={adminReply}
                  onChange={event => {
                    setAdminReply(event.target.value);
                    broadcastAdminTyping(Boolean(event.target.value.trim()));
                  }}
                  onBlur={() => broadcastAdminTyping(false)}
                  placeholder="Écrivez votre message au client..."
                />
              </label>
              <label style={{ display: "block", margin: "12px 0" }}>
                Joindre un document ou une image (10 Mo maximum)
                <input
                  id="rawago-admin-attachment"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
                  onChange={event => setAdminAttachment(event.target.files?.[0] || null)}
                />
              </label>
              {adminAttachment && <small>Fichier sélectionné : {adminAttachment.name}</small>}
              <button className="btn primary" type="submit" disabled={messageSaving || (!adminReply.trim() && !adminAttachment)}>
                {messageSaving ? "Envoi..." : "Envoyer le message"}
              </button>
            </form>
              </div>
            </div>
          </>
        )}
      </section>
      )}

      {activeAdminPage === "requests" && (
      <div className="dashboard-panel">
        <div className="request-heading">
          <h2>Suivi des demandes</h2>
          <span>{requests.length}</span>
        </div>

        {requests.length === 0 ? (
          <p className="empty-state">
            Aucune demande pour le moment.
          </p>
        ) : (
          <div className="request-list">
            {requests.map(item => {
              const client = clients.find(
                person => person.id === item.client_id
              );

              return (
                <article className="request-item" key={item.id}>
                  <>
                      <div className="request-item-top">
                        <b>{item.service}</b>
                        <span className={`status status-${item.status}`}>
                          {statusLabels[item.status] || item.status}
                        </span>
                      </div>
                      <p><strong>Client : </strong>{client?.full_name || "Nom non renseigné"}</p>
                      <p style={{ whiteSpace: "pre-wrap" }}><strong>Description : </strong>{item.description}</p>
                      <small>
                        Reçue le{" "}
                        {new Date(item.created_at).toLocaleDateString("fr-FR")}
                      </small>
                      <label className="admin-status-control">
                        Modifier le statut
                        <select
                          value={item.status}
                          disabled={saving === item.id}
                          onChange={event => changeStatus(item.id, event.target.value)}
                        >
                          <option value="pending">En attente</option>
                          <option value="reviewing">À l'étude</option>
                          <option value="accepted">Acceptée</option>
                          <option value="in_progress">En cours</option>
                          <option value="completed">Terminée</option>
                          <option value="rejected">Refusée</option>
                        </select>
                      </label>
                    </>
                </article>
              );
            })}
          </div>
        )}

        <div className="dashboard-panel" style={{ marginTop: "24px" }}>
          <div className="request-heading">
            <h2>Messages du formulaire de contact</h2>
            <span>{contactRequests.length}</span>
          </div>

          {contactRequestsError && (
            <p className="error-message" role="alert">{contactRequestsError}</p>
          )}

          {!contactRequestsError && contactRequests.length === 0 ? (
            <p className="empty-state">Aucune demande de contact pour le moment.</p>
          ) : (
            <div className="request-list">
              {contactRequests.map(item => (
                <article className="request-item" key={`contact-${item.id}`}>
                  <div className="request-item-top">
                    <b>{item.service || "Demande de contact"}</b>
                    <span className="status status-pending">Nouveau message</span>
                  </div>
                  <p><strong>Nom : </strong>{item.name || "Non renseigné"}</p>
                  <p><strong>E-mail : </strong><a href={`mailto:${item.email}`}>{item.email || "Non renseigné"}</a></p>
                  {item.country && <p><strong>Pays : </strong>{item.country}</p>}
                  <p style={{ whiteSpace: "pre-wrap" }}><strong>Message : </strong>{item.message || "Aucun message"}</p>
                  <small>Reçue le {item.created_at ? new Date(item.created_at).toLocaleString("fr-FR") : "Date inconnue"}</small>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
      )}
        </div>
      </div>
    </main>
  );
}

export default Admin;

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../supabase";

const SPACES = [
  { key: "discussions", number: "01", title: "Échanges et discussions", description: "Posez vos questions, confrontez vos idées et échangez autour de sujets éducatifs, culturels et intellectuels." },
  { key: "experiences", number: "02", title: "Partage d'expériences", description: "Partagez vos parcours, vos apprentissages et les expériences qui peuvent aider les autres." },
  { key: "collaboration", number: "03", title: "Entraide et collaboration", description: "Trouvez des partenaires, proposez votre aide et faites naître des initiatives collectives." },
  { key: "actualites", number: "04", title: "Vie de la communauté", description: "Retrouvez les annonces, les actualités et les informations importantes de la communauté." },
];

const dateLabel = (value) => value ? new Date(value).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : "";
const clean = (value) => (value || "").trim();

export default function Community() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [activeSpace, setActiveSpace] = useState("discussions");
  const [view, setView] = useState("feed");
  const [posts, setPosts] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [comments, setComments] = useState({});
  const [likes, setLikes] = useState({});
  const [bookmarks, setBookmarks] = useState(new Set());
  const [following, setFollowing] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("recent");
  const [onlyMine, setOnlyMine] = useState(false);
  const [showComposer, setShowComposer] = useState(false);
  const [editingPost, setEditingPost] = useState(null);
  const [expandedPost, setExpandedPost] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [replyTo, setReplyTo] = useState(null);
  const [postForm, setPostForm] = useState({ title: "", content: "", category: "discussions" });
  const [reporting, setReporting] = useState(null);
  const [reportReason, setReportReason] = useState("Contenu inapproprié");
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [communityGroups, setCommunityGroups] = useState([]);
  const [communityEvents, setCommunityEvents] = useState([]);
  const [eventRegistrations, setEventRegistrations] = useState(new Set());
  const [profileForm, setProfileForm] = useState({ full_name: "", bio: "", interests: "" });
  const [groupForm, setGroupForm] = useState({ name: "", description: "", visibility: "public" });
  const [eventForm, setEventForm] = useState({ title: "", description: "", location: "", starts_at: "", event_url: "" });
  const [moderationReports, setModerationReports] = useState([]);
  const [contentReports, setContentReports] = useState([]);

  const currentSpace = SPACES.find((space) => space.key === activeSpace) || SPACES[0];
  const isAdmin = profile?.role === "admin";
  const myId = session?.user?.id;

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) setSession(data.session);
    };
    init();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      if (mounted) setSession(next);
    });
    return () => { mounted = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let active = true;
    const loadProfile = async () => {
      if (!myId) { setProfile(null); return; }
      const { data } = await supabase.from("profiles").select("id, full_name, role").eq("id", myId).maybeSingle();
      if (active) setProfile(data || null);
    };
    loadProfile();
    return () => { active = false; };
  }, [myId]);

  const loadCommunity = useCallback(async () => {
    setLoading(true);
    setError("");
    let query = supabase.from("community_posts").select("*").eq("status", "published");
    if (activeSpace !== "all") query = query.eq("category", activeSpace);
    const { data: postData, error: postError } = await query.order("created_at", { ascending: false }).limit(150);
    if (postError) {
      setError("Chargement impossible : " + postError.message);
      setPosts([]);
      setLoading(false);
      return;
    }
    const loaded = postData || [];
    setPosts(loaded);
    const postIds = loaded.map((post) => post.id);
    const authorIds = [...new Set(loaded.map((post) => post.author_id))];

    if (postIds.length) {
      const [commentResult, likeResult, profileResult] = await Promise.all([
        supabase.from("community_comments").select("*").in("post_id", postIds).eq("status", "published").order("created_at", { ascending: true }),
        supabase.from("community_likes").select("*").in("post_id", postIds),
        supabase.from("profiles").select("id, full_name").in("id", authorIds),
      ]);
      const commentRows = commentResult.data || [];
      const likeRows = likeResult.data || [];
      const profileMap = {};
      (profileResult.data || []).forEach((p) => { profileMap[p.id] = p.full_name || ""; });
      const commentAuthors = [...new Set(commentRows.map((c) => c.author_id))].filter((id) => !profileMap[id]);
      if (commentAuthors.length) {
        const { data: extra } = await supabase.from("profiles").select("id, full_name").in("id", commentAuthors);
        (extra || []).forEach((p) => { profileMap[p.id] = p.full_name || ""; });
      }
      setProfiles((previous) => ({ ...previous, ...profileMap }));
      const byPost = {};
      commentRows.forEach((c) => { (byPost[c.post_id] ||= []).push(c); });
      setComments(byPost);
      const likesByPost = {};
      likeRows.forEach((like) => { (likesByPost[like.post_id] ||= []).push(like); });
      setLikes(likesByPost);
    } else {
      setComments({});
      setLikes({});
    }

    if (myId) {
      const [savedResult, followsResult, notificationResult] = await Promise.all([
        supabase.from("community_bookmarks").select("post_id").eq("user_id", myId),
        supabase.from("community_follows").select("followed_id").eq("follower_id", myId),
        supabase.from("community_notifications").select("*").eq("user_id", myId).order("created_at", { ascending: false }).limit(30),
      ]);
      setBookmarks(new Set((savedResult.data || []).map((x) => x.post_id)));
      setFollowing(new Set((followsResult.data || []).map((x) => x.followed_id)));
      setNotifications(notificationResult.data || []);
      setUnreadCount((notificationResult.data || []).filter((x) => !x.read_at).length);
    } else {
      setBookmarks(new Set());
      setFollowing(new Set());
      setNotifications([]);
      setUnreadCount(0);
    }
    setLoading(false);
  }, [activeSpace, myId]);

  useEffect(() => { loadCommunity(); }, [loadCommunity]);

  useEffect(() => {
    let active = true;
    async function loadExtras() {
      const [groupsResult, eventsResult] = await Promise.all([
        supabase.from("community_groups").select("*").eq("status", "active").order("created_at", { ascending: false }).limit(60),
        supabase.from("community_events").select("*").eq("status", "published").order("starts_at", { ascending: true }).limit(60),
      ]);
      if (!active) return;
      setCommunityGroups(groupsResult.data || []);
      setCommunityEvents(eventsResult.data || []);
      if (myId) {
        const [memberships, reportResult, myProfile] = await Promise.all([
          supabase.from("community_event_attendees").select("event_id").eq("user_id", myId),
          isAdmin ? supabase.from("community_reports").select("*").eq("status", "pending").order("created_at", { ascending: false }) : Promise.resolve({ data: [] }),
          supabase.from("profiles").select("full_name, bio, interests").eq("id", myId).maybeSingle(),
        ]);
        setEventRegistrations(new Set((memberships.data || []).map((x) => x.event_id)));
        setModerationReports(reportResult.data || []);
        if (isAdmin) { const { data: contentRows } = await supabase.from("community_content_reports").select("*").eq("status", "pending").order("created_at", { ascending: false }); setContentReports(contentRows || []); }
        setProfileForm((old) => ({
          ...old,
          full_name: myProfile.data?.full_name || profile?.full_name || "",
          bio: myProfile.data?.bio || "",
          interests: Array.isArray(myProfile.data?.interests) ? myProfile.data.interests.join(", ") : "",
        }));

      } else {
        setEventRegistrations(new Set());
        setModerationReports([]);
        setContentReports([]);
      }
    }
    loadExtras();
    return () => { active = false; };
  }, [myId, isAdmin, profile?.full_name]);

  async function createGroup(event) {
    event.preventDefault();
    if (!requireLogin()) return;
    const name = clean(groupForm.name);
    if (!name) return;
    const { data, error: groupError } = await supabase.from("community_groups").insert({
      created_by: myId, name, description: clean(groupForm.description), visibility: groupForm.visibility,
    }).select().single();
    if (groupError) { setError(groupError.message); return; }
    const { error: memberError } = await supabase.from("community_group_members").insert({
      group_id: data.id, user_id: myId, role: "owner",
    });
    if (memberError) { setError("Groupe créé, mais l'ajout du créateur a échoué : " + memberError.message); return; }
    setGroupForm({ name: "", description: "", visibility: "public" });
    setNotice("Groupe créé.");
    const { data: rows } = await supabase.from("community_groups").select("*").eq("status", "active").order("created_at", { ascending: false });
    setCommunityGroups(rows || []);
  }

  async function joinGroup(group) {
    if (!requireLogin()) return;
    const { error: joinError } = await supabase.from("community_group_members").insert({ group_id: group.id, user_id: myId, role: "member" });
    if (joinError && !joinError.message.toLowerCase().includes("duplicate")) setError(joinError.message);
    else setNotice("Vous avez rejoint le groupe.");
  }

  async function createEvent(event) {
    event.preventDefault();
    if (!requireLogin()) return;
    if (!eventForm.starts_at || Number.isNaN(new Date(eventForm.starts_at).getTime())) {
      setError("Choisissez une date et une heure valides.");
      return;
    }
    const { error: eventError } = await supabase.from("community_events").insert({
      created_by: myId, title: clean(eventForm.title), description: clean(eventForm.description),
      location: clean(eventForm.location) || null, starts_at: new Date(eventForm.starts_at).toISOString(),
      event_url: clean(eventForm.event_url) || null, visibility: "public", status: "published",
    });
    if (eventError) { setError(eventError.message); return; }
    setEventForm({ title: "", description: "", location: "", starts_at: "", event_url: "" });
    setNotice("Événement publié.");
    const { data } = await supabase.from("community_events").select("*").eq("status", "published").order("starts_at", { ascending: true });
    setCommunityEvents(data || []);
  }

  async function toggleEventRegistration(eventItem) {
    if (!requireLogin()) return;
    const exists = eventRegistrations.has(eventItem.id);
    const result = exists
      ? await supabase.from("community_event_attendees").delete().eq("event_id", eventItem.id).eq("user_id", myId)
      : await supabase.from("community_event_attendees").insert({ event_id: eventItem.id, user_id: myId });
    if (result.error) { setError(result.error.message); return; }
    setEventRegistrations((old) => {
      const next = new Set(old);
      exists ? next.delete(eventItem.id) : next.add(eventItem.id);
      return next;
    });
  }

  async function saveCommunityProfile(event) {
    event.preventDefault();
    if (!requireLogin()) return;
    const { error: profileError } = await supabase.from("profiles").update({
      full_name: clean(profileForm.full_name), bio: clean(profileForm.bio),
      interests: clean(profileForm.interests).split(",").map((x) => x.trim()).filter(Boolean),
    }).eq("id", myId);
    if (profileError) { setError(profileError.message); return; }
    setProfile((old) => ({ ...(old || {}), full_name: clean(profileForm.full_name) }));
    setNotice("Profil mis à jour.");
  }

  async function resolveReport(report, status) {
    const { error: reportError } = await supabase.from("community_reports").update({
      status, reviewed_by: myId, reviewed_at: new Date().toISOString(),
    }).eq("id", report.id);
    if (reportError) { setError(reportError.message); return; }
    setModerationReports((old) => old.filter((x) => x.id !== report.id));
    setNotice("Signalement traité.");
  }

  const visiblePosts = useMemo(() => {
    let result = [...posts];
    const needle = search.toLowerCase().trim();
    if (needle) result = result.filter((p) => `${p.title} ${p.content} ${profiles[p.author_id] || ""}`.toLowerCase().includes(needle));
    if (onlyMine && myId) result = result.filter((p) => p.author_id === myId);
    if (view === "saved") result = result.filter((p) => bookmarks.has(p.id));
    if (sort === "popular") result.sort((a, b) => (likes[b.id]?.length || 0) - (likes[a.id]?.length || 0));
    if (sort === "discussed") result.sort((a, b) => (comments[b.id]?.length || 0) - (comments[a.id]?.length || 0));
    return result;
  }, [posts, search, profiles, onlyMine, myId, view, bookmarks, sort, likes, comments]);

  const displayName = (id) => {
    if (id === myId) return profile?.full_name || session?.user?.user_metadata?.full_name || session?.user?.user_metadata?.name || session?.user?.email?.split("@")[0] || "Vous";
    return profiles[id] || "Membre";
  };

  const requireLogin = () => {
    if (myId) return true;
    setError("Connectez-vous à votre espace client pour participer.");
    return false;
  };

  const startNewPost = () => {
    if (!requireLogin()) return;
    setEditingPost(null);
    setPostForm({ title: "", content: "", category: activeSpace === "all" ? "discussions" : activeSpace });
    setShowComposer(true);
    setError("");
  };

  const startEdit = (post) => {
    setEditingPost(post);
    setPostForm({ title: post.title, content: post.content, category: post.category || "discussions" });
    setShowComposer(true);
    setError("");
  };

  async function submitPost(event) {
    event.preventDefault();
    if (!requireLogin()) return;
    const title = clean(postForm.title);
    const content = clean(postForm.content);
    if (!title || !content) { setError("Le titre et le contenu sont obligatoires."); return; }
    setSaving(true);
    const result = editingPost
      ? await supabase.from("community_posts").update({ title, content, category: postForm.category, updated_at: new Date().toISOString() }).eq("id", editingPost.id).eq("author_id", myId)
      : await supabase.from("community_posts").insert({ author_id: myId, category: postForm.category, title, content });
    setSaving(false);
    if (result.error) { setError(result.error.message); return; }
    setNotice(editingPost ? "Publication modifiée." : "Publication publiée.");
    const savedCategory = postForm.category;
    setShowComposer(false);
    setEditingPost(null);
    setPostForm({ title: "", content: "", category: "discussions" });
    const categoryChanged = savedCategory !== activeSpace;
    setActiveSpace(savedCategory);
    setView("feed");
    setOnlyMine(false);
    if (!categoryChanged) await loadCommunity();
  }

  async function deletePost(post) {
    if (!window.confirm("Supprimer définitivement cette publication ?")) return;
    const { error: actionError } = await supabase.from("community_posts").delete().eq("id", post.id);
    if (actionError) { setError(actionError.message); return; }
    setNotice("Publication supprimée.");
    await loadCommunity();
  }

  async function toggleLike(postId) {
    if (!requireLogin()) return;
    const existing = (likes[postId] || []).find((x) => x.user_id === myId);
    const result = existing
      ? await supabase.from("community_likes").delete().eq("id", existing.id)
      : await supabase.from("community_likes").insert({ post_id: postId, user_id: myId });
    if (result.error) { setError(result.error.message); return; }
    await loadCommunity();
  }

  async function toggleBookmark(postId) {
    if (!requireLogin()) return;
    const exists = bookmarks.has(postId);
    const result = exists
      ? await supabase.from("community_bookmarks").delete().eq("post_id", postId).eq("user_id", myId)
      : await supabase.from("community_bookmarks").insert({ post_id: postId, user_id: myId });
    if (result.error) { setError(result.error.message); return; }
    await loadCommunity();
  }

  async function toggleFollow(userId) {
    if (!requireLogin() || userId === myId) return;
    const exists = following.has(userId);
    const result = exists
      ? await supabase.from("community_follows").delete().eq("follower_id", myId).eq("followed_id", userId)
      : await supabase.from("community_follows").insert({ follower_id: myId, followed_id: userId });
    if (result.error) { setError(result.error.message); return; }
    await loadCommunity();
  }

  async function submitComment(event, postId, parentId = null) {
    event.preventDefault();
    if (!requireLogin()) return;
    const content = clean(commentDrafts[parentId || postId]);
    if (!content) return;
    const { error: actionError } = await supabase.from("community_comments").insert({
      post_id: postId, author_id: myId, content, parent_comment_id: parentId,
    });
    if (actionError) { setError(actionError.message); return; }
    setCommentDrafts((old) => ({ ...old, [parentId || postId]: "" }));
    setReplyTo(null);
    setNotice("Votre contribution a été publiée.");
    await loadCommunity();
  }

  async function deleteComment(comment) {
    if (!window.confirm("Supprimer ce commentaire ?")) return;
    const { error: actionError } = await supabase.from("community_comments").delete().eq("id", comment.id);
    if (actionError) { setError(actionError.message); return; }
    await loadCommunity();
  }

  async function submitReport(event) {
    event.preventDefault();
    if (!requireLogin() || !reporting) return;
    const { error: actionError } = await supabase.from("community_reports").insert({
      reporter_id: myId, post_id: reporting.id, reason: reportReason,
    });
    if (actionError) { setError(actionError.message); return; }
    setReporting(null);
    setNotice("Signalement transmis à l'équipe de modération.");
  }

  async function reportCommunityContent(targetType, targetId) {
    if (!requireLogin()) return;
    const reason = window.prompt("Motif du signalement (harcèlement, insulte, spam, sollicitation personnelle, autre) :");
    if (!reason || !clean(reason)) return;
    const { error: reportError } = await supabase.from("community_content_reports").insert({ reporter_id: myId, target_type: targetType, target_id: targetId, reason: clean(reason) });
    if (reportError) { setError(reportError.message); return; }
    setNotice("Signalement transmis à l'équipe de modération.");
  }

  async function moderateCommunityContent(report, action) {
    if (action === "delete") {
      if (!window.confirm("Supprimer définitivement ce contenu signalé ? Cette action est irréversible.")) return;
      const { error: deleteError } = await supabase.rpc("admin_delete_reported_content", { p_report_id: report.id });
      if (deleteError) { setError(deleteError.message); return; }
      setContentReports((old) => old.filter((item) => item.id !== report.id));
      setNotice("Contenu supprimé définitivement.");
    } else {
      const table = report.target_type === "comment" ? "community_comments" : "community_groups";
      const update = report.target_type === "comment" ? { status: action === "hide" ? "hidden" : "published" } : { status: action === "hide" ? "hidden" : "active" };
      const { error: itemError } = await supabase.from(table).update(update).eq("id", report.target_id);
      if (itemError) { setError(itemError.message); return; }
      const { error: reportError } = await supabase.from("community_content_reports").update({ status: action === "hide" ? "action_taken" : "reviewed", reviewed_by: myId, reviewed_at: new Date().toISOString() }).eq("id", report.id);
      if (reportError) { setError(reportError.message); return; }
      setContentReports((old) => old.filter((item) => item.id !== report.id));
      setNotice(action === "hide" ? "Contenu masqué." : "Signalement examiné.");
    }
    await loadCommunity();
    const { data } = await supabase.from("community_groups").select("*").eq("status", "active").order("created_at", { ascending: false });
    setCommunityGroups(data || []);
  }

  async function deleteReportedPost(report) {
    if (!window.confirm("Supprimer définitivement cette publication signalée ? Cette action est irréversible.")) return;
    const { error: deleteError } = await supabase.rpc("admin_delete_reported_post", { p_report_id: report.id });
    if (deleteError) { setError(deleteError.message); return; }
    setModerationReports((old) => old.filter((item) => item.id !== report.id));
    setNotice("Publication supprimée définitivement.");
    await loadCommunity();
  }

  async function moderatePost(post, status) {
    const { error: actionError } = await supabase.from("community_posts").update({ status }).eq("id", post.id);
    if (actionError) { setError(actionError.message); return; }
    setNotice(status === "hidden" ? "Publication masquée." : "Publication rétablie.");
    await loadCommunity();
  }

  async function markNotificationsRead() {
    if (!myId || !unreadCount) return;
    const { error: actionError } = await supabase.from("community_notifications").update({ read_at: new Date().toISOString() }).eq("user_id", myId).is("read_at", null);
    if (!actionError) await loadCommunity();
  }

  const nestedComments = (postId) => {
    const rows = comments[postId] || [];
    const roots = rows.filter((c) => !c.parent_comment_id);
    return roots.map((root) => ({ ...root, replies: rows.filter((c) => c.parent_comment_id === root.id) }));
  };

  return (
    <main className="community-page">
      <style>{`
        .community-page {
          --cm-ink:#173239; --cm-muted:#687a7d; --cm-green:#075b4b;
          --cm-teal:#159b91; --cm-line:#e4e9e5; --cm-cream:#f6f3eb;
          width:100%; max-width:1440px; margin:0 auto; padding:54px clamp(18px,5vw,76px) 88px;
          color:var(--cm-ink); background:#fbfaf7;
        }
        .community-page, .community-page * { box-sizing:border-box; }
        .community-page button, .community-page input, .community-page select, .community-page textarea { font:inherit; }
        .community-page .community-hero {
          display:grid; grid-template-columns:minmax(0,1fr) minmax(0,.92fr); gap:clamp(24px,4vw,58px);
          align-items:center; width:100%; margin:0 auto 34px; padding:18px 0 30px; text-align:left;
        }
        .community-page .community-hero-copy { min-width:0; max-width:680px; }
        .community-page .community-hero .eyebrow { color:var(--cm-teal); font-size:11px; font-weight:800; letter-spacing:.17em; }
        .community-page .community-hero h1 {
          display:block; max-width:660px; margin:18px 0 16px; padding:0;
          color:var(--cm-ink); font:500 clamp(42px,5vw,68px)/1.06 Georgia,"Times New Roman",serif;
          letter-spacing:-.045em; overflow-wrap:normal; word-break:normal;
        }
        .community-page .community-hero p { max-width:620px; margin:0; color:var(--cm-muted); font-size:16px; line-height:1.85; }
        .community-page .community-hero-visual {
          position:relative; min-width:0; min-height:320px; overflow:hidden;
          border-radius:18px 68px 18px 18px; background:#e8f0ed;
          box-shadow:0 18px 42px rgba(23,50,57,.10);
        }
        .community-page .community-hero-visual img { display:block; width:100%; height:100%; min-height:320px; object-fit:cover; }
        .community-page .community-hero-caption {
          position:absolute; left:18px; bottom:18px; padding:11px 15px; border-radius:10px;
          background:rgba(255,255,255,.94); color:var(--cm-ink); font-size:12px; font-weight:700;
        }
        .community-page .community-spaces { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; margin:20px 0 34px; }
        .community-page .community-space {
          display:flex; flex-direction:column; align-items:flex-start; min-width:0; min-height:220px;
          padding:22px; border:1px solid var(--cm-line); border-radius:16px; background:#fff;
          color:var(--cm-ink); text-align:left; cursor:pointer;
          box-shadow:0 7px 22px rgba(23,50,57,.035); transition:transform .2s,border-color .2s,box-shadow .2s;
        }
        .community-page .community-space:hover { transform:translateY(-3px); border-color:#9bc9bf; box-shadow:0 13px 28px rgba(23,50,57,.08); }
        .community-page .community-space.active { border-color:var(--cm-teal); background:#f4faf7; box-shadow:inset 0 0 0 1px var(--cm-teal),0 9px 25px rgba(8,127,123,.08); }
        .community-page .community-space .eyebrow { color:var(--cm-teal); font-size:11px; font-weight:800; letter-spacing:.15em; }
        .community-page .community-space h2 { margin:18px 0 8px; font:500 21px/1.25 Georgia,"Times New Roman",serif; }
        .community-page .community-space p { margin:0 0 18px; color:var(--cm-muted); font-size:13px; line-height:1.65; }
        .community-page .community-space strong { margin-top:auto; color:var(--cm-green); font-size:12px; }
        .community-page .community-panel,.community-page .community-post,.community-page .community-empty,
        .community-page .community-form,.community-page .community-notification-panel {
          min-width:0; padding:clamp(18px,2.5vw,28px); margin:0 0 16px;
          border:1px solid var(--cm-line); border-radius:17px; background:#fff;
          box-shadow:0 9px 28px rgba(23,50,57,.04);
        }
        .community-page .community-panel-head { display:flex; justify-content:space-between; align-items:flex-end; gap:18px; flex-wrap:wrap; }
        .community-page .community-panel-head h2 { margin:8px 0; color:var(--cm-ink); font:500 clamp(25px,3vw,34px)/1.2 Georgia,"Times New Roman",serif; }
        .community-page .community-panel-head p { margin:0; color:var(--cm-muted); line-height:1.65; }
        .community-page .community-btn {
          display:inline-flex; justify-content:center; align-items:center; min-height:43px;
          padding:11px 17px; border:1px solid var(--cm-green); border-radius:9px;
          background:var(--cm-green); color:#fff; font-size:13px; font-weight:700; cursor:pointer;
          transition:background .2s,transform .2s;
        }
        .community-page .community-btn:hover { background:#08725d; transform:translateY(-1px); }
        .community-page .community-btn:disabled { opacity:.55; cursor:not-allowed; transform:none; }
        .community-page .community-btn.secondary { border-color:#d9e8e2; background:#edf5f1; color:var(--cm-green); }
        .community-page .community-btn.danger { border-color:#b42318; background:#b42318; color:#fff; }
        .community-page .community-alert { padding:13px 16px; border-radius:10px; margin:15px 0; font-size:13px; line-height:1.6; }
        .community-page .community-alert.error { background:#fff0ef; color:#a12e28; }
        .community-page .community-alert.success { background:#edf8f2; color:#176b4b; }
        .community-page .community-tabs { display:flex; gap:7px; flex-wrap:wrap; margin:24px 0 18px; padding-bottom:14px; border-bottom:1px solid #edf0ec; }
        .community-page .community-tabs button,.community-page .community-actions button,.community-page .community-member-action {
          min-height:37px; padding:8px 12px; border:1px solid #dfe7e3; border-radius:9px;
          background:#fff; color:#31565a; font-size:12px; font-weight:650; cursor:pointer;
          transition:background .18s,border-color .18s,color .18s;
        }
        .community-page .community-tabs button:hover,.community-page .community-actions button:hover,
        .community-page .community-member-action:hover { border-color:#9bc9bf; background:#f2f8f5; }
        .community-page .community-tabs button.active { border-color:var(--cm-green); background:var(--cm-green); color:#fff; }
        .community-page .community-toolbar { display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin:18px 0; }
        .community-page .community-toolbar input { flex:1 1 280px; }
        .community-page .community-toolbar input,.community-page .community-toolbar select,
        .community-page .community-form input,.community-page .community-form textarea,.community-page .community-form select,
        .community-page .community-comment-form input,.community-page .community-report select {
          width:100%; min-width:0; min-height:44px; padding:11px 13px;
          border:1px solid #dce4df; border-radius:9px; background:#fff; color:var(--cm-ink);
          font-size:13px; outline:none;
        }
        .community-page .community-toolbar select { width:auto; min-width:170px; }
        .community-page input:focus,.community-page textarea:focus,.community-page select:focus { border-color:var(--cm-teal); box-shadow:0 0 0 3px rgba(21,155,145,.11); }
        .community-page .community-my-filter { display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap; margin:18px 0; padding:15px 17px; border:1px solid #dce9e7; border-radius:12px; background:#f7fbfa; }
        .community-page .community-my-filter-label { display:grid; gap:4px; }
        .community-page .community-my-filter-label strong { font-size:13px; }
        .community-page .community-my-filter-label span { color:var(--cm-muted); font-size:12px; }
        .community-page .community-my-filter-switch { display:inline-flex; gap:4px; padding:4px; border:1px solid #d8e5e2; border-radius:10px; background:#eaf1ef; }
        .community-page .community-my-filter-switch button { border:0; border-radius:7px; padding:9px 13px; background:transparent; color:#526a70; font-size:12px; font-weight:700; cursor:pointer; }
        .community-page .community-my-filter-switch button.active { background:#087f7b; color:#fff; }
        .community-page .community-form { display:grid; gap:11px; }
        .community-page .community-form label { color:#294249; font-size:12px; font-weight:700; }
        .community-page .community-form textarea { min-height:110px; resize:vertical; }
        .community-page .community-form-head { display:flex; justify-content:space-between; align-items:center; gap:12px; }
        .community-page .community-form-head h3 { margin:0; font:500 23px Georgia,"Times New Roman",serif; }
        .community-page .community-post-head { display:flex; align-items:center; gap:11px; min-width:0; }
        .community-page .community-avatar { display:grid; place-items:center; flex:none; width:42px; height:42px; border-radius:50%; background:#e8f5f0; color:var(--cm-green); font-weight:800; }
        .community-page .community-author { display:grid; gap:3px; min-width:0; }
        .community-page .community-author small,.community-page .community-post-date { color:#75848e; font-size:11px; }
        .community-page .community-post-menu { display:flex; gap:5px; flex-wrap:wrap; margin-left:auto; }
        .community-page .community-post-menu button { border:0; border-radius:7px; padding:7px 9px; background:#f4f8f5; color:var(--cm-green); font-size:11px; cursor:pointer; }
        .community-page .community-post h3 { margin:18px 0 8px; color:var(--cm-ink); font:500 23px/1.3 Georgia,"Times New Roman",serif; }
        .community-page .community-post-content { color:#40565b; font-size:14px; line-height:1.8; white-space:pre-wrap; overflow-wrap:anywhere; }
        .community-page .community-actions { display:flex; gap:8px; flex-wrap:wrap; padding-top:14px; margin-top:16px; border-top:1px solid #edf0ec; }
        .community-page .community-actions button.liked { border-color:#f4dce1; background:#fff1f3; color:#bb4b61; }
        .community-page .community-comments { padding-top:15px; margin-top:16px; border-top:1px solid #edf0ec; }
        .community-page .community-comment { padding:12px 0; border-bottom:1px solid #f0f2ef; }
        .community-page .community-comment p { margin:7px 0; color:#40565b; font-size:13px; line-height:1.65; white-space:pre-wrap; overflow-wrap:anywhere; }
        .community-page .community-comment-meta { display:flex; align-items:center; gap:9px; flex-wrap:wrap; font-size:12px; }
        .community-page .community-comment-meta small { color:#7b8992; }
        .community-page .community-reply { margin:10px 0 0 22px; padding-left:13px; border-left:2px solid #d9eeeb; }
        .community-page .community-comment-form { display:flex; gap:9px; margin-top:13px; }
        .community-page .community-comment-form input { flex:1; }
        .community-page .community-empty { text-align:center; padding:42px 20px; color:#637582; }
        .community-page .community-report { display:grid; gap:12px; }
        .community-page .community-notification-item { padding:13px 0; border-bottom:1px solid #edf0ec; line-height:1.5; }
        .community-page .community-muted { color:#74838c; font-size:12px; }
        .community-page a { color:var(--cm-green); }
        .community-page button:focus-visible { outline:3px solid #83cbc4; outline-offset:2px; }
        @media(max-width:1050px) {
          .community-page .community-spaces { grid-template-columns:repeat(2,minmax(0,1fr)); }
          .community-page .community-hero { gap:25px; }
        }
        @media(max-width:760px) {
          .community-page { padding:34px 17px 60px; }
          .community-page .community-hero { grid-template-columns:minmax(0,1fr); gap:20px; }
          .community-page .community-hero h1 { font-size:clamp(40px,9vw,56px); }
          .community-page .community-hero-visual,.community-page .community-hero-visual img { min-height:240px; }
          .community-page .community-panel-head { align-items:flex-start; }
        }
        @media(max-width:560px) {
          .community-page .community-spaces { grid-template-columns:minmax(0,1fr); }
          .community-page .community-space { min-height:0; }
          .community-page .community-comment-form { flex-direction:column; }
          .community-page .community-comment-form .community-btn { width:100%; }
          .community-page .community-panel,.community-page .community-post,.community-page .community-form,.community-page .community-notification-panel { padding:17px; }
          .community-page .community-post-menu { width:100%; margin:8px 0 0; }
          .community-page .community-toolbar>* { width:100%; }
          .community-page .community-toolbar select { width:100%; }
          .community-page .community-my-filter { align-items:stretch; }
          .community-page .community-my-filter-switch { width:100%; }
          .community-page .community-my-filter-switch button { flex:1; }
        }
      `}</style>

      <section className="community-hero">
        <div className="community-hero-copy">
          <div className="eyebrow">ÉCHANGE · PARTAGE · COLLABORATION</div>
          <h1>Une communauté qui avance ensemble</h1>
          <p>Un espace de rencontre et de partage où les connaissances, les expériences et les idées contribuent à une intelligence collective.</p>
        </div>
        <div className="community-hero-visual">
          <img src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=85" alt="Des personnes réunies pour échanger et partager leurs idées" loading="eager" />
          <span className="community-hero-caption">Ensemble, apprendre et grandir</span>
        </div>
      </section>

      <section className="community-spaces" aria-label="Espaces de la communauté">
        {SPACES.map((space) => (
          <button type="button" key={space.key} className={`community-space ${activeSpace === space.key ? "active" : ""}`} onClick={() => { setActiveSpace(space.key); setView("feed"); setOnlyMine(false); setNotice(""); setError(""); }}>
            <span className="eyebrow">{space.number}</span>
            <h2>{space.title}</h2>
            <p>{space.description}</p>
            <strong>Explorer →</strong>
          </button>
        ))}
      </section>

      <section className="community-panel">
        <div className="community-panel-head">
          <div><div className="eyebrow">ESPACE COMMUNAUTAIRE</div><h2>{view === "saved" ? "Mes publications enregistrées" : currentSpace.title}</h2><p>{currentSpace.description}</p></div>
          <button className="community-btn" onClick={startNewPost}>+ Nouvelle publication</button>
        </div>

        {error && <div className="community-alert error" role="alert">{error}</div>}
        {notice && <div className="community-alert success" role="status">{notice}</div>}

        <div className="community-tabs">
          <button className={view === "feed" ? "active" : ""} onClick={() => setView("feed")}>Fil d'actualité</button>
          <button className={view === "saved" ? "active" : ""} onClick={() => { setView("saved"); setActiveSpace("all"); }}>Favoris</button>
          {myId && <button className={view === "feed" && onlyMine ? "active" : ""} aria-pressed={view === "feed" && onlyMine} onClick={() => { setOnlyMine(true); setView("feed"); setActiveSpace("all"); }}>Publications</button>}
          {myId && <button onClick={() => setView("notifications")}>Notifications {unreadCount > 0 ? `(${unreadCount})` : ""}</button>}
          <button onClick={() => setView("groups")}>Groupes</button>
          <button onClick={() => setView("events")}>Événements</button>
          {myId && <button onClick={() => setView("profile")}>Mon profil</button>}
          {isAdmin && <button onClick={() => setView("moderation")}>Modération {moderationReports.length ? `(${moderationReports.length})` : ""}</button>}
        </div>

        {view === "feed" && myId && (
          <div className="community-my-filter" aria-label="Filtrer les publications">
            <div className="community-my-filter-label">
              <strong>{onlyMine ? "Vous consultez vos publications" : "Vous consultez toutes les publications"}</strong>
              <span>{onlyMine ? "Seules vos contributions sont affichées." : "Les contributions de toute la communauté sont affichées."}</span>
            </div>
            <div className="community-my-filter-switch" role="group" aria-label="Choisir les publications à afficher">
              <button type="button" className={!onlyMine ? "active" : ""} aria-pressed={!onlyMine} onClick={() => { setOnlyMine(false); setView("feed"); }}>Toutes les publications</button>
              <button type="button" className={onlyMine ? "active" : ""} aria-pressed={onlyMine} onClick={() => { setOnlyMine(true); setView("feed"); }}>Mes publications</button>
            </div>
          </div>
        )}

        {view !== "notifications" && (
          <div className="community-toolbar">
            <input aria-label="Rechercher dans la communauté" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un sujet, un membre, un mot-clé..." />
            <select aria-label="Trier les publications" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="recent">Plus récentes</option><option value="popular">Plus aimées</option><option value="discussed">Plus commentées</option>
            </select>
            {view === "saved" && <button className="community-btn secondary" onClick={() => { setView("feed"); setActiveSpace("discussions"); }}>Retour aux discussions</button>}
          </div>
        )}

        {showComposer && (
          <form className="community-form" onSubmit={submitPost}>
            <div className="community-form-head"><h3>{editingPost ? "Modifier la publication" : "Partager avec la communauté"}</h3><button type="button" className="community-member-action" onClick={() => setShowComposer(false)}>Fermer</button></div>
            <label htmlFor="community-title">Titre</label>
            <input id="community-title" maxLength={160} required value={postForm.title} onChange={(e) => setPostForm((old) => ({ ...old, title: e.target.value }))} placeholder="Donnez un titre à votre publication" />
            <label htmlFor="community-category">Rubrique</label>
            <select id="community-category" required value={postForm.category} onChange={(e) => setPostForm((old) => ({ ...old, category: e.target.value }))}>
              {SPACES.map((space) => <option key={space.key} value={space.key}>{space.title}</option>)}
            </select>
            <label htmlFor="community-content">Votre message</label>
            <textarea id="community-content" rows={6} maxLength={10000} required value={postForm.content} onChange={(e) => setPostForm((old) => ({ ...old, content: e.target.value }))} placeholder="Partagez votre idée, votre question ou votre expérience..." />
            <div className="community-panel-head"><span className="community-muted">{postForm.content.length}/10 000 caractères · Rubrique : {SPACES.find((space) => space.key === postForm.category)?.title || "Discussions"}</span><button className="community-btn" disabled={saving}>{saving ? "Enregistrement..." : editingPost ? "Enregistrer" : "Publier"}</button></div>
          </form>
        )}

        {view === "groups" ? (
          <div className="community-notification-panel">
            <h3>Groupes thématiques</h3>
            <p className="community-muted">Créez des espaces de discussion autour de vos centres d'intérêt.</p>
            {myId && <form className="community-form" onSubmit={createGroup}>
              <h4>Créer un groupe</h4>
              <input required maxLength={100} placeholder="Nom du groupe" value={groupForm.name} onChange={(e) => setGroupForm((old) => ({ ...old, name: e.target.value }))} />
              <textarea rows={3} maxLength={1000} placeholder="Présentez le thème et l'objectif du groupe" value={groupForm.description} onChange={(e) => setGroupForm((old) => ({ ...old, description: e.target.value }))} />
              <select value="public" disabled aria-label="Visibilité du groupe"><option value="public">Groupe public</option></select>
              <button className="community-btn">Créer le groupe</button>
            </form>}
            {!communityGroups.length ? <p className="community-muted">Aucun groupe pour le moment.</p> : communityGroups.map((group) => <article className="community-post" key={group.id}><h3>{group.name}</h3><p>{group.description}</p><small>{group.visibility === "private" ? "Groupe privé" : "Groupe public"}</small>{myId && <div className="community-actions">{group.created_by !== myId && group.visibility === "public" && <button className="community-btn secondary" onClick={() => joinGroup(group)}>Rejoindre</button>}<button className="community-member-action" onClick={() => reportCommunityContent("group", group.id)}>Signaler ce groupe</button></div>}</article>)}
          </div>
        ) : view === "events" ? (
          <div className="community-notification-panel">
            <h3>Agenda de la communauté</h3>
            <p className="community-muted">Rencontres, ateliers, échanges et rendez-vous à venir.</p>
            {myId && <form className="community-form" onSubmit={createEvent}>
              <h4>Proposer un événement</h4>
              <input required maxLength={160} placeholder="Titre de l'événement" value={eventForm.title} onChange={(e) => setEventForm((old) => ({ ...old, title: e.target.value }))} />
              <textarea rows={3} placeholder="Description" value={eventForm.description} onChange={(e) => setEventForm((old) => ({ ...old, description: e.target.value }))} />
              <label>Date et heure</label><input required type="datetime-local" value={eventForm.starts_at} onChange={(e) => setEventForm((old) => ({ ...old, starts_at: e.target.value }))} />
              <input placeholder="Lieu ou lien de visioconférence" value={eventForm.location} onChange={(e) => setEventForm((old) => ({ ...old, location: e.target.value }))} />
              <input type="url" placeholder="Lien d'inscription (facultatif)" value={eventForm.event_url} onChange={(e) => setEventForm((old) => ({ ...old, event_url: e.target.value }))} />
              <button className="community-btn">Publier l'événement</button>
            </form>}
            {!communityEvents.length ? <p className="community-muted">Aucun événement programmé pour le moment.</p> : communityEvents.map((item) => <article className="community-post" key={item.id}><h3>{item.title}</h3><p>{item.description}</p><p><strong>{dateLabel(item.starts_at)}</strong>{item.location ? ` · ${item.location}` : ""}</p>{item.event_url && <p><a href={item.event_url} target="_blank" rel="noreferrer">Informations / inscription</a></p>}{myId && <button className="community-btn secondary" onClick={() => toggleEventRegistration(item)}>{eventRegistrations.has(item.id) ? "Annuler ma participation" : "Je participe"}</button>}</article>)}
          </div>
        ) : view === "profile" ? (
          <form className="community-form" onSubmit={saveCommunityProfile}>
            <h3>Mon profil communautaire</h3>
            <label>Nom affiché</label><input required maxLength={120} value={profileForm.full_name} onChange={(e) => setProfileForm((old) => ({ ...old, full_name: e.target.value }))} />
            <label>Présentation</label><textarea rows={4} maxLength={500} value={profileForm.bio} onChange={(e) => setProfileForm((old) => ({ ...old, bio: e.target.value }))} placeholder="Présentez-vous en quelques lignes..." />
            <label>Centres d'intérêt (séparés par des virgules)</label><input value={profileForm.interests} onChange={(e) => setProfileForm((old) => ({ ...old, interests: e.target.value }))} placeholder="Lecture, littérature, histoire..." />
            <button className="community-btn">Enregistrer mon profil</button>
          </form>
        ) : view === "moderation" && isAdmin ? (
          <div className="community-notification-panel">
            <h3>Signalements à traiter</h3>
            {!moderationReports.length && !contentReports.length ? <p className="community-muted">Aucun signalement en attente.</p> : <>
              {moderationReports.map((report) => <article className="community-post" key={report.id}><strong>{report.reason}</strong><p className="community-muted">Signalement de publication · {dateLabel(report.created_at)}</p><p>Publication concernée : {report.post_id}</p><div className="community-actions"><button onClick={() => resolveReport(report, "reviewed")}>Marquer comme examiné</button><button onClick={() => resolveReport(report, "dismissed")}>Classer sans suite</button><button className="community-btn danger" onClick={() => deleteReportedPost(report)}>Supprimer définitivement</button></div></article>)}
              {contentReports.map((report) => <article className="community-post" key={report.id}><strong>{report.reason}</strong><p className="community-muted">Signalement de {report.target_type === "comment" ? "commentaire" : "groupe"} · {dateLabel(report.created_at)}</p><p>Élément signalé : {report.target_id}</p><div className="community-actions"><button onClick={() => moderateCommunityContent(report, "hide")}>Masquer le contenu</button><button onClick={() => moderateCommunityContent(report, "review")}>Examiner sans masquer</button><button className="community-btn danger" onClick={() => moderateCommunityContent(report, "delete")}>Supprimer définitivement</button></div></article>)}
            </>}
          </div>
        ) : view === "notifications" ? (
          <div className="community-notification-panel">
            <div className="community-panel-head"><h3>Mes notifications</h3><button className="community-btn secondary" onClick={markNotificationsRead}>Tout marquer comme lu</button></div>
            {!notifications.length ? <p className="community-muted">Aucune notification pour le moment.</p> : notifications.map((n) => <div className="community-notification-item" key={n.id}><strong>{n.title || "Nouvelle activité"}</strong><p>{n.body}</p><small>{dateLabel(n.created_at)} {n.read_at ? "· Lu" : "· Non lu"}</small></div>)}
          </div>
        ) : loading ? <div className="community-empty">Chargement des publications...</div> : !visiblePosts.length ? (
          <div className="community-empty"><h3>Aucune publication à afficher</h3><p>Essayez une autre recherche ou lancez la première discussion de cet espace.</p><button className="community-btn" onClick={startNewPost}>Créer une publication</button></div>
        ) : (
          <div>
            {visiblePosts.map((post) => {
              const postComments = nestedComments(post.id);
              const postLikes = likes[post.id] || [];
              const liked = postLikes.some((x) => x.user_id === myId);
              const own = post.author_id === myId;
              const canModerate = isAdmin;
              return (
                <article className="community-post" key={post.id}>
                  <div className="community-post-head">
                    <span className="community-avatar">{(displayName(post.author_id).charAt(0) || "M").toUpperCase()}</span>
                    <div className="community-author"><strong>{displayName(post.author_id)}</strong><small>{dateLabel(post.created_at)}{post.updated_at && post.updated_at !== post.created_at ? " · Modifié" : ""}</small></div>
                    <div className="community-post-menu">
                      {!own && myId && <button onClick={() => toggleFollow(post.author_id)}>{following.has(post.author_id) ? "Ne plus suivre" : "Suivre"}</button>}
                      {(own || canModerate) && <><button onClick={() => startEdit(post)}>Modifier</button><button onClick={() => deletePost(post)}>Supprimer</button></>}
                      {!own && myId && <button onClick={() => setReporting(post)}>Signaler</button>}
                      {canModerate && <button onClick={() => moderatePost(post, "hidden")}>Masquer</button>}
                    </div>
                  </div>
                  <h3>{post.title}</h3>
                  <p className="community-post-content">{post.content}</p>
                  <div className="community-actions">
                    <button className={liked ? "liked" : ""} onClick={() => toggleLike(post.id)}>{liked ? "♥" : "♡"} {postLikes.length} J'aime</button>
                    <button onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}>💬 {comments[post.id]?.length || 0} commentaire(s)</button>
                    <button onClick={() => toggleBookmark(post.id)}>{bookmarks.has(post.id) ? "★ Enregistré" : "☆ Enregistrer"}</button>
                  </div>
                  {expandedPost === post.id && (
                    <div className="community-comments">
                      {postComments.map((comment) => (
                        <div className="community-comment" key={comment.id}>
                          <div className="community-comment-meta"><strong>{displayName(comment.author_id)}</strong><small>{dateLabel(comment.created_at)}</small>{(comment.author_id === myId || isAdmin) && <button className="community-member-action" onClick={() => deleteComment(comment)}>Supprimer</button>}{myId && comment.author_id !== myId && <button className="community-member-action" onClick={() => reportCommunityContent("comment", comment.id)}>Signaler</button>}</div>
                          <p>{comment.content}</p>
                          {myId && <button className="community-member-action" onClick={() => { setReplyTo(comment.id); setCommentDrafts((old) => ({ ...old, [comment.id]: "" })); }}>Répondre</button>}
                          {comment.replies.map((reply) => <div className="community-reply" key={reply.id}><div className="community-comment-meta"><strong>{displayName(reply.author_id)}</strong><small>{dateLabel(reply.created_at)}</small>{(reply.author_id === myId || isAdmin) && <button className="community-member-action" onClick={() => deleteComment(reply)}>Supprimer</button>}{myId && reply.author_id !== myId && <button className="community-member-action" onClick={() => reportCommunityContent("comment", reply.id)}>Signaler</button>}</div><p>{reply.content}</p></div>)}
                          {replyTo === comment.id && <form className="community-comment-form" onSubmit={(e) => submitComment(e, post.id, comment.id)}><input autoFocus value={commentDrafts[comment.id] || ""} onChange={(e) => setCommentDrafts((old) => ({ ...old, [comment.id]: e.target.value }))} placeholder={`Répondre à ${displayName(comment.author_id)}...`} maxLength={3000} required /><button className="community-btn">Répondre</button><button type="button" className="community-member-action" onClick={() => setReplyTo(null)}>Annuler</button></form>}
                        </div>
                      ))}
                      {myId ? <form className="community-comment-form" onSubmit={(e) => submitComment(e, post.id)}><input value={commentDrafts[post.id] || ""} onChange={(e) => setCommentDrafts((old) => ({ ...old, [post.id]: e.target.value }))} placeholder="Écrire un commentaire..." maxLength={3000} required /><button className="community-btn">Envoyer</button></form> : <p className="community-muted">Connectez-vous pour participer à la discussion.</p>}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {reporting && <div className="community-form"><h3>Signaler cette publication</h3><p>Le signalement sera transmis à l'équipe de modération.</p><form className="community-report" onSubmit={submitReport}><select value={reportReason} onChange={(e) => setReportReason(e.target.value)}><option>Contenu inapproprié</option><option>Harcèlement ou propos injurieux</option><option>Spam ou publicité abusive</option><option>Information trompeuse</option><option>Autre motif</option></select><div><button className="community-btn">Envoyer le signalement</button> <button type="button" className="community-member-action" onClick={() => setReporting(null)}>Annuler</button></div></form></div>}

      <section className="about-copy" style={{ maxWidth: 900, margin: "54px auto 0" }}>
        <h2>Un espace de dialogue et d'entraide</h2>
        <p>La communauté repose sur le respect, la bienveillance, la curiosité intellectuelle et le partage des connaissances. Chaque membre contribue à la qualité des échanges.</p>
        <p className="community-muted">Les contenus peuvent être signalés. Les publications contraires aux règles de la communauté peuvent être masquées par l'équipe de modération.</p>
        <a className="btn primary" href="/espace-client">{myId ? "Accéder à mon espace client →" : "Se connecter / Créer un compte →"}</a>
      </section>
    </main>
  );
}

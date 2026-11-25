import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Brain, Check, Clock3, Compass, Flame, Lightbulb, NotebookPen, Pause, Play, RotateCcw, Sparkles, Target, Trash2, ListChecks, Zap, Maximize2, Minimize2, Plus, X } from "lucide-react";

const STORE = "rawago-cockpit-v1";
const goals = ["Réviser un cours", "Préparer un concours", "Améliorer mon français", "Lire davantage", "Trouver un livre", "Organiser mes idées"];
const starterTasks = ["Clarifier mon objectif du jour", "Choisir une ressource RAWAGO", "Faire 25 minutes de concentration"];
function loadState() { try { return JSON.parse(localStorage.getItem(STORE) || "{}"); } catch { return {}; } }
function saveState(patch) { try { const next = { ...loadState(), ...patch }; localStorage.setItem(STORE, JSON.stringify(next)); return next; } catch { return patch; } }
function dayKey() { const d = new Date(); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; }

export default function Cockpit() {
  const initial = useMemo(loadState, []);
  const [goal, setGoal] = useState(initial.goal || "");
  const [tasks, setTasks] = useState(initial.tasks || starterTasks.map((text, i) => ({ id: `starter-${i}`, text, done: false })));
  const [taskText, setTaskText] = useState("");
  const [note, setNote] = useState(initial.note || "");
  const [seconds, setSeconds] = useState(initial.seconds ?? 25 * 60);
  const [running, setRunning] = useState(false);
  const [mode, setMode] = useState(initial.mode || "focus");
  const [sessions, setSessions] = useState(initial.sessions || 0);
  const [sessionsToday, setSessionsToday] = useState(initial.sessionDay === dayKey() ? (initial.sessionsToday || 0) : 0);
  const [welcomeName, setWelcomeName] = useState(initial.welcomeName || "");
  const [focusMode, setFocusMode] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureKind, setCaptureKind] = useState("task");
  const [captureText, setCaptureText] = useState("");
  const totalTasks = tasks.length;
  const doneTasks = tasks.filter(t => t.done).length;
  const taskProgress = totalTasks ? Math.round(doneTasks / totalTasks * 100) : 0;
  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2,"0")}:${String(s % 60).padStart(2,"0")}`;

  useEffect(() => { saveState({ goal, tasks, note, seconds, mode, sessions, sessionsToday, sessionDay: dayKey(), welcomeName }); }, [goal, tasks, note, seconds, mode, sessions, sessionsToday, welcomeName]);
  const completedModeRef = useRef(null);
  useEffect(() => {
    if (!running || seconds !== 0 || completedModeRef.current === mode) return;
    completedModeRef.current = mode;
    if (mode === "focus") {
      setSessions(value => value + 1);
      setSessionsToday(value => value + 1);
      setMode("break");
      setSeconds(5 * 60);
      setRunning(true);
    } else {
      setMode("focus");
      setSeconds(25 * 60);
      setRunning(false);
    }
  }, [running, seconds, mode]);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setSeconds(value => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
  }, [running]);
  const setTimerMode = (next) => { completedModeRef.current = null; setRunning(false); setMode(next); setSeconds(next === "focus" ? 25 * 60 : 5 * 60); };
  const addTask = (e) => { e.preventDefault(); const text = taskText.trim(); if (!text) return; setTasks(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, text, done: false }]); setTaskText(""); };
  const removeTask = (id) => setTasks(prev => prev.filter(t => t.id !== id));
  const clearDone = () => setTasks(prev => prev.filter(t => !t.done));
  const addCapture = (e) => { e.preventDefault(); const text = captureText.trim(); if (!text) return; if (captureKind === "task") setTasks(prev => [...prev, { id: `capture-${Date.now()}`, text, done: false }]); else setNote(prev => prev ? `${prev}\n\n${text}` : text); setCaptureText(""); setCaptureOpen(false); };
  const focusedMinutes = sessionsToday * 25;
  return <main className={`cockpit-page ${focusMode ? "is-focus-mode" : ""}`}>
    <div className="cockpit-actionbar"><button className="cockpit-quick-open" onClick={() => { setCaptureKind("task"); setCaptureOpen(true); }}><Plus size={16}/> Capture rapide</button><button className="cockpit-focus-toggle" onClick={() => setFocusMode(v => !v)}>{focusMode ? <Minimize2 size={16}/> : <Maximize2 size={16}/>} {focusMode ? "Quitter Focus" : "Mode Focus"}</button></div>
    <div className="cockpit-topline"><Link to="/">← Retour à RAWAGO</Link><span>ESPACE PERSONNEL · VOTRE RYTHME</span></div>
    <section className="cockpit-welcome">
      <div><div className="cockpit-eyebrow"><Sparkles size={15}/> RAWAGO INTELLIGENCE</div><h1>{welcomeName ? `Bonjour ${welcomeName},` : "Votre espace pour avancer."}<br/><em>Une chose à la fois.</em></h1><p>Un espace personnel pour mettre de l'ordre dans vos idées, apprendre à votre rythme et garder le cap.</p></div>
      <div className="cockpit-welcome-card"><div className="cockpit-orbit"><Brain size={30}/></div><strong>Le progrès n'a pas besoin d'être bruyant.</strong><span>Il a besoin d'être régulier.</span></div>
    </section>
    <section className="cockpit-daily-stats" aria-label="Statistiques du jour">
      <div><Clock3 size={17}/><strong>{focusedMinutes} min</strong><span>Concentration estimée aujourd'hui</span></div>
      <div><Check size={17}/><strong>{doneTasks}/{totalTasks}</strong><span>Tâches accomplies</span></div>
      <div><Flame size={17}/><strong>{sessionsToday}</strong><span>Sessions focus aujourd'hui</span></div>
      <div><Target size={17}/><strong>{taskProgress}%</strong><span>Progression de la feuille de route</span></div>
    </section>
    <section className="cockpit-grid">
      <article className="cockpit-card cockpit-focus">
        <div className="cockpit-card-title"><div><span className="cockpit-label">TEMPS POUR VOUS</span><h2>Session Focus</h2></div><Clock3 size={21}/></div>
        <div className="cockpit-timer" aria-live="polite"><span>{formatTime(seconds)}</span><small>{mode === "focus" ? "CONCENTRATION" : "PAUSE"}</small></div>
        <div className="cockpit-timer-modes"><button className={mode === "focus" ? "active" : ""} onClick={() => setTimerMode("focus")}>25 min focus</button><button className={mode === "break" ? "active" : ""} onClick={() => setTimerMode("break")}>5 min pause</button></div>
        <div className="cockpit-timer-actions"><button className="cockpit-primary" onClick={() => setRunning(v => !v)}>{running ? <Pause size={17}/> : <Play size={17}/>} {running ? "Pause" : "Démarrer"}</button><button className="cockpit-icon-btn" aria-label="Réinitialiser" onClick={() => { completedModeRef.current = null; setRunning(false); setSeconds(mode === "focus" ? 25 * 60 : 5 * 60); }}><RotateCcw size={17}/></button></div>
        <div className="cockpit-session-count"><Flame size={15}/> {sessionsToday} session{sessionsToday > 1 ? "s" : ""} terminée{sessionsToday > 1 ? "s" : ""} aujourd'hui <span>· {sessions} au total</span></div>
      </article>
      <article className="cockpit-card cockpit-goal">
        <div className="cockpit-card-title"><div><span className="cockpit-label">CAP DU MOMENT</span><h2>Mon intention</h2></div><Target size={21}/></div>
        <p className="cockpit-muted">Qu'aimeriez-vous accomplir en ce moment ?</p><div className="cockpit-goal-list">{goals.map(g => <button key={g} className={goal === g ? "selected" : ""} onClick={() => setGoal(g)}>{goal === g && <Check size={15}/>} {g}</button>)}</div>
        <label className="cockpit-name-label">Comment vous appeler ? <input value={welcomeName} maxLength={24} onChange={e => setWelcomeName(e.target.value)} placeholder="Votre prénom (facultatif)"/></label>
      </article>
      <article className="cockpit-card cockpit-tasks">
        <div className="cockpit-card-title"><div><span className="cockpit-label">PETITS PAS, GRAND CHEMIN</span><h2>Ma feuille de route</h2></div><Compass size={21}/></div>
        <div className="cockpit-task-progress"><div><span>{doneTasks} sur {totalTasks} tâches</span><b>{taskProgress}%</b></div><div className="cockpit-progress-track"><span style={{width:`${taskProgress}%`}}/></div></div>
        <form className="cockpit-task-form" onSubmit={addTask}><input value={taskText} onChange={e => setTaskText(e.target.value)} placeholder="Ajouter une tâche ou une idée" aria-label="Nouvelle tâche"/><button type="submit" aria-label="Ajouter"><span>+</span></button></form>
        <div className="cockpit-task-list">{tasks.map(task => <div key={task.id} className={`cockpit-task ${task.done ? "done" : ""}`}><label><input type="checkbox" checked={task.done} onChange={e => setTasks(prev => prev.map(t => t.id === task.id ? {...t, done:e.target.checked} : t))}/><span>{task.text}</span></label><button aria-label="Supprimer la tâche" onClick={() => removeTask(task.id)}><Trash2 size={15}/></button></div>)}{tasks.length === 0 && <p className="cockpit-empty">Votre liste est vide. Ajoutez votre prochain petit pas.</p>}</div>
        {doneTasks > 0 && <button className="cockpit-clear-done" onClick={clearDone}>Retirer les tâches terminées</button>}
      </article>
      <article className="cockpit-card cockpit-notes">
        <div className="cockpit-card-title"><div><span className="cockpit-label">VOTRE ESPACE PRIVÉ</span><h2>Carnet de savoir</h2></div><NotebookPen size={21}/></div>
        <p className="cockpit-muted">Notez une idée, une citation, une question à explorer. Le contenu est enregistré sur cet appareil.</p><textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Une idée à garder…\n\nUne réflexion, une phrase, une piste de recherche." rows={8}/><div className="cockpit-note-footer"><span><Lightbulb size={14}/> Sauvegarde automatique</span><span>{note.length} caractères</span></div>
      </article>
    </section>
    <section className="cockpit-discovery"><BookOpen size={22}/><div><strong>Et si vous exploriez une nouvelle idée ?</strong><p>La connaissance commence souvent par une question.</p></div><Link to="/savoirs">Explorer les savoirs ↗</Link><Link to="/bibliotheque">Parcourir les livres ↗</Link></section>
    {captureOpen && <div className="cockpit-capture-backdrop" role="dialog" aria-modal="true" aria-label="Capture rapide"><div className="cockpit-capture-modal"><header><div><span className="cockpit-label">CAPTURE UNIVERSELLE</span><h2>Ne perdez pas votre idée.</h2></div><button type="button" onClick={() => setCaptureOpen(false)} aria-label="Fermer"><X size={18}/></button></header><div className="cockpit-capture-switch"><button type="button" className={captureKind === "task" ? "active" : ""} onClick={() => setCaptureKind("task")}><ListChecks size={15}/> Tâche</button><button type="button" className={captureKind === "note" ? "active" : ""} onClick={() => setCaptureKind("note")}><NotebookPen size={15}/> Note</button></div><form onSubmit={addCapture}><textarea autoFocus value={captureText} onChange={e => setCaptureText(e.target.value)} placeholder={captureKind === "task" ? "Quel est le prochain petit pas ?" : "Écrivez votre idée ici…"} rows={4}/><button className="cockpit-primary" type="submit">{captureKind === "task" ? "Ajouter à ma feuille de route" : "Enregistrer dans mon carnet"}</button></form></div></div>}
    <footer className="cockpit-footer">RAWAGO · SAVOIR & TRANSMISSION <span>Votre espace est sauvegardé localement sur cet appareil.</span></footer>
  </main>;
}

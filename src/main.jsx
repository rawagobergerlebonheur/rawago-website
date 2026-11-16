
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BookOpen, GraduationCap, Search, BriefcaseBusiness,
  ArrowRight, Menu, X, Globe2, MessageCircle,
  ShieldCheck, Send, UserRound, LogOut, LockKeyhole,
  RefreshCw
} from 'lucide-react';
import { supabase } from './supabase';
import './style.css';

function App() {
  const [lang, setLang] = useState('fr');
  const [menu, setMenu] = useState(false);
  const fr = lang === 'fr';

  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [adminProfiles, setAdminProfiles] = useState([]);
  const [authMode, setAuthMode] = useState('login');
  const [authMessage, setAuthMessage] = useState('');
  const [authError, setAuthError] = useState('');
  const [authForm, setAuthForm] = useState({
    fullName: '',
    email: '',
    password: ''
  });

  const [requestForm, setRequestForm] = useState({
    service: 'Accompagnement éducatif',
    level: '',
    subject: '',
    preferred_mode: '',
    resource_type: '',
    profession: '',
    description: ''
  });
  const [requestMessage, setRequestMessage] = useState('');
  const [requestError, setRequestError] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);

  const [form, setForm] = useState({
    service: 'Accompagnement éducatif',
    name: '',
    email: '',
    country: '',
    level: '',
    subject: '',
    mode: '',
    resource: '',
    profession: '',
    need: ''
  });

  const copy = fr ? {
    nav: ['Accueil', 'Nos services', 'À propos', 'Contact', 'Espace Client'],
    eyebrow: 'SAVOIR · ACCOMPAGNEMENT · DOCUMENTATION',
    title: 'Le savoir ouvre des chemins.\nAvançons ensemble.',
    intro: 'Un accompagnement humain et rigoureux pour apprendre, progresser, trouver les bonnes ressources et concrétiser vos projets.',
    cta: 'Découvrir les services',
    contact: 'Parler de votre besoin',
    services: 'Des solutions adaptées à vos objectifs',
    sub: 'Un interlocuteur, plusieurs expertises, une approche personnalisée.',
    servicesList: [
      ['Accompagnement éducatif', 'Cours et accompagnement personnalisés en français, histoire, géographie, philosophie, littérature et culture générale.'],
      ['Recherche documentaire', 'Recherche de livres, articles et ressources fiables pour vos études, mémoires, recherches et projets professionnels.'],
      ['Appui professionnel', 'Aide méthodologique, structuration des idées, expression écrite et orale et recherche de ressources pour vos activités.']
    ],
    about: 'Une démarche exigeante, profondément humaine',
    aboutText: 'Berger-Le-Bonheur RAWAGO met la connaissance et la méthode au service de vos ambitions. En tant que fondateur, je porte une vision fondée sur la rigueur, la transmission du savoir et un accompagnement attentif de chaque personne. Chaque demande est étudiée avec attention afin de proposer une réponse adaptée, claire et réaliste.',
    founder: 'Fondateur de Berger-Le-Bonheur RAWAGO',
    levels: 'Collège · Lycée · Licence · Master · Préparation aux concours',
    modal: 'À distance dans le monde entier. En présentiel au Sénégal.',
    quote: 'Parlons de votre projet',
    qtext: 'Expliquez-nous votre besoin. Nous étudierons votre demande et vous proposerons un devis adapté à sa nature et à sa complexité.',
    name: 'Votre nom complet',
    email: 'Votre adresse e-mail',
    country: 'Votre pays',
    service: 'Service souhaité',
    level: 'Votre niveau d’études',
    subject: 'Matière ou discipline',
    mode: 'Modalité souhaitée',
    resource: 'Type de document ou de ressource recherché',
    profession: 'Profession ou domaine d’activité',
    need: 'Décrivez votre besoin',
    send: 'Envoyer ma demande',
    footer: 'Le savoir réussit lorsqu’il est partagé.',
    education: 'Accompagnement éducatif',
    research: 'Recherche documentaire',
    professional: 'Appui professionnel',
    online: 'À distance',
    inPerson: 'En présentiel (Sénégal)',
    placeholder: 'Décrivez votre objectif, vos attentes et les précisions utiles...',
    note: 'Votre demande sera étudiée. Un devis pourra vous être proposé selon sa nature et sa complexité.',
    subjects: ['Français', 'Histoire', 'Géographie', 'Philosophie', 'Littérature', 'Culture générale', 'Méthodologie', 'Autre'],
    levelsList: ['Collège', 'Lycée', 'Licence', 'Master', 'Préparation aux concours', 'Autre'],
    resources: ['Livre', 'Article scientifique', 'Document historique', 'Rapport', 'Mémoire ou recherche', 'Autre']
  } : {
    nav: ['Home', 'Services', 'About', 'Contact', 'Client Area'],
    eyebrow: 'KNOWLEDGE · GUIDANCE · DOCUMENTATION',
    title: 'Knowledge opens paths.\nLet’s move forward together.',
    intro: 'Human-centred, rigorous support to learn, make progress, find the right resources and bring your projects to life.',
    cta: 'Explore services',
    contact: 'Discuss your needs',
    services: 'Solutions tailored to your goals',
    sub: 'One point of contact, several areas of expertise, a personal approach.',
    servicesList: [
      ['Educational support', 'Personalised tutoring in French, history, geography, philosophy, literature and general knowledge.'],
      ['Documentary research', 'Research for books, articles and reliable resources for studies, dissertations, research and professional projects.'],
      ['Professional support', 'Methodology, structuring ideas, written and oral communication and resource research for your work.']
    ],
    about: 'A demanding and deeply human approach',
    aboutText: 'Berger-Le-Bonheur RAWAGO puts knowledge and method at the service of your ambitions. As founder, I promote a vision based on rigour, knowledge sharing and attentive support. Every request is carefully reviewed to provide a clear and relevant response.',
    founder: 'Founder of Berger-Le-Bonheur RAWAGO',
    levels: 'Middle school · High school · Bachelor · Master · Competitive exams',
    modal: 'Online worldwide. In-person in Senegal.',
    quote: 'Let’s discuss your project',
    qtext: 'Tell us what you need. We will review your request and prepare a quote based on its nature and complexity.',
    name: 'Full name',
    email: 'Email address',
    country: 'Country',
    service: 'Requested service',
    level: 'Education level',
    subject: 'Subject or discipline',
    mode: 'Preferred format',
    resource: 'Type of document or resource',
    profession: 'Profession or field of activity',
    need: 'Describe your needs',
    send: 'Send my request',
    footer: 'Knowledge succeeds when it is shared.',
    education: 'Educational support',
    research: 'Documentary research',
    professional: 'Professional support',
    online: 'Online',
    inPerson: 'In person (Senegal)',
    placeholder: 'Describe your goals, expectations and any useful details...',
    note: 'Your request will be reviewed. A quote may be proposed depending on its nature and complexity.',
    subjects: ['French', 'History', 'Geography', 'Philosophy', 'Literature', 'General knowledge', 'Methodology', 'Other'],
    levelsList: ['Middle school', 'High school', 'Bachelor', 'Master', 'Competitive exams', 'Other'],
    resources: ['Book', 'Scientific article', 'Historical document', 'Report', 'Dissertation or research', 'Other']
  };

  const update = (field, value) => {
    setForm(previous => ({ ...previous, [field]: value }));
  };

  const updateAuth = (field, value) => {
    setAuthForm(previous => ({ ...previous, [field]: value }));
  };

  const updateRequest = (field, value) => {
    setRequestForm(previous => ({ ...previous, [field]: value }));
  };

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (error) setAuthError(error.message);
      setSession(data?.session ?? null);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (mounted) {
          setSession(newSession);
          setAuthError('');
          setAuthMessage('');
        }
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      setRequests([]);
      setAdminProfiles([]);
      return;
    }

    let active = true;

    async function loadClientArea() {
      setRequestsLoading(true);
      setAuthError('');
      setRequestError('');

      const profileResult = await supabase
        .from('profiles')
        .select('full_name, role')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!active) return;

      if (profileResult.error) {
        setAuthError(profileResult.error.message);
        setRequestsLoading(false);
        return;
      }

      const currentProfile = profileResult.data;
      setProfile(currentProfile);

      if (currentProfile?.role === 'admin') {
        const [requestsResult, profilesResult] = await Promise.all([
          supabase
            .from('service_requests')
            .select('*')
            .order('created_at', { ascending: false }),
          supabase
            .from('profiles')
            .select('id, full_name')
        ]);

        if (!active) return;

        if (requestsResult.error) {
          setRequestError(requestsResult.error.message);
        } else {
          setRequests(requestsResult.data || []);
        }

        if (profilesResult.error) {
          setAuthError(profilesResult.error.message);
        } else {
          setAdminProfiles(profilesResult.data || []);
        }
      } else {
        const requestsResult = await supabase
          .from('service_requests')
          .select('*')
          .eq('client_id', session.user.id)
          .order('created_at', { ascending: false });

        if (!active) return;

        if (requestsResult.error) {
          setRequestError(requestsResult.error.message);
        } else {
          setRequests(requestsResult.data || []);
        }
        setAdminProfiles([]);
      }

      setRequestsLoading(false);
    }

    loadClientArea();

    return () => {
      active = false;
    };
  }, [session]);

  async function handleAuthSubmit(event) {
    event.preventDefault();
    setAuthError('');
    setAuthMessage('');

    if (authMode === 'signup') {
      const { data, error } = await supabase.auth.signUp({
        email: authForm.email,
        password: authForm.password,
        options: {
          data: { full_name: authForm.fullName }
        }
      });

      if (error) {
        setAuthError(error.message);
        return;
      }

      if (!data.session) {
        setAuthMessage(
          fr
            ? 'Votre inscription est enregistrée. Consultez votre boîte e-mail pour confirmer votre adresse avant de vous connecter.'
            : 'Your registration is saved. Check your inbox to confirm your email address before signing in.'
        );
      } else {
        setAuthMessage(fr ? 'Votre compte a été créé.' : 'Your account has been created.');
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: authForm.email,
      password: authForm.password
    });

    if (error) setAuthError(error.message);
  }

  async function handleSignOut() {
    setAuthError('');
    const { error } = await supabase.auth.signOut();

    if (error) {
      setAuthError(error.message);
    } else {
      setAuthMessage(fr ? 'Vous êtes déconnecté.' : 'You are signed out.');
      setAuthForm({ fullName: '', email: '', password: '' });
    }
  }

  async function handleAdminStatusChange(requestId, newStatus) {
    setRequestError('');

    const { error } = await supabase
      .from('service_requests')
      .update({ status: newStatus })
      .eq('id', requestId);

    if (error) {
      setRequestError(error.message);
      return;
    }

    setRequests(previous =>
      previous.map(item =>
        item.id === requestId ? { ...item, status: newStatus } : item
      )
    );
  }

  async function handleRequestSubmit(event) {
    event.preventDefault();
    if (!session?.user) return;

    setRequestLoading(true);
    setRequestError('');
    setRequestMessage('');

    const payload = {
      client_id: session.user.id,
      service: requestForm.service,
      level: requestForm.level || null,
      subject: requestForm.subject || null,
      preferred_mode: requestForm.preferred_mode || null,
      resource_type: requestForm.resource_type || null,
      profession: requestForm.profession || null,
      description: requestForm.description
    };

    const { error } = await supabase
      .from('service_requests')
      .insert(payload);

    setRequestLoading(false);

    if (error) {
      setRequestError(error.message);
      return;
    }

    setRequestMessage(
      fr
        ? 'Votre demande a bien été enregistrée.'
        : 'Your request has been successfully submitted.'
    );

    setRequestForm({
      service: 'Accompagnement éducatif',
      level: '',
      subject: '',
      preferred_mode: '',
      resource_type: '',
      profession: '',
      description: ''
    });

    const { data } = await supabase
      .from('service_requests')
      .select('*')
      .eq('client_id', session.user.id)
      .order('created_at', { ascending: false });

    setRequests(data || []);
  }

  const portrait = (
    <img
      className="mark"
      src="/portrait-rawago.jpeg"
      alt="Portrait de Berger-Le-Bonheur RAWAGO"
      style={{
        display: 'block',
        width: '50px',
        height: '50px',
        minWidth: '50px',
        objectFit: 'cover',
        objectPosition: 'center 35%',
        padding: 0,
        borderRadius: '50%'
      }}
    />
  );

  const services = [
    { icon: <GraduationCap />, title: copy.servicesList[0][0], text: copy.servicesList[0][1] },
    { icon: <Search />, title: copy.servicesList[1][0], text: copy.servicesList[1][1] },
    { icon: <BriefcaseBusiness />, title: copy.servicesList[2][0], text: copy.servicesList[2][1] }
  ];

  const statusLabel = status => {
    const labels = {
      pending: fr ? 'En attente' : 'Pending',
      reviewing: fr ? 'À l’étude' : 'Under review',
      accepted: fr ? 'Acceptée' : 'Accepted',
      in_progress: fr ? 'En cours' : 'In progress',
      completed: fr ? 'Terminée' : 'Completed',
      rejected: fr ? 'Refusée' : 'Declined'
    };
    return labels[status] || status;
  };

  return (
    <>
      <header>
        <a className="brand" href="#home">
          {portrait}
          <span>BERGER-LE-BONHEUR<small>RAWAGO</small></span>
        </a>

        <button className="mobile" onClick={() => setMenu(!menu)} aria-label="Menu">
          {menu ? <X /> : <Menu />}
        </button>

        <nav className={menu ? 'show' : ''}>
          {copy.nav.map((item, index) => (
            <a
              onClick={() => setMenu(false)}
              href={['#home', '#services', '#about', '#contact', '#espace-client'][index]}
              key={item}
            >
              {item}
            </a>
          ))}
          <button className="lang" onClick={() => setLang(fr ? 'en' : 'fr')}>
            <Globe2 size={16} /> {fr ? 'EN' : 'FR'}
          </button>
        </nav>
      </header>

      <main>
        <section className="hero" id="home">
          <div className="hero-copy">
            <div className="eyebrow">{copy.eyebrow}</div>
            <h1>
              {copy.title.split('\n').map((line, index) => (
                <React.Fragment key={line}>
                  {index > 0 && <br />}
                  {line}
                </React.Fragment>
              ))}
            </h1>
            <p>{copy.intro}</p>
            <div className="actions">
              <a className="btn primary" href="#services">
                {copy.cta}<ArrowRight size={17} />
              </a>
              <a className="btn secondary" href="#contact">{copy.contact}</a>
            </div>
            <div className="trust">
              <ShieldCheck size={18} /><span>{copy.modal}</span>
            </div>
          </div>

          <div className="hero-visual">
            <img
              src="https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=1200&q=85"
              alt="Élèves étudiant ensemble"
            />
            <div className="visual-note">
              <BookOpen />
              <span>Apprendre, comprendre,<br /><b>aller plus loin.</b></span>
            </div>
          </div>
        </section>

        <section className="services section" id="services">
          <div className="section-head">
            <div className="eyebrow">NOS DOMAINES</div>
            <h2>{copy.services}</h2>
            <p>{copy.sub}</p>
          </div>

          <div className="cards">
            {services.map((service, index) => (
              <article className="card" key={index}>
                <div className="ico">{service.icon}</div>
                <h3>{service.title}</h3>
                <p>{service.text}</p>
                <a href="#contact">
                  {fr ? 'Faire une demande' : 'Make an enquiry'} <ArrowRight size={15} />
                </a>
              </article>
            ))}
          </div>
        </section>

        <section className="about section" id="about">
          <div className="about-photo">
            <img
              src="/portrait-rawago.jpeg"
              alt="Portrait professionnel de Berger-Le-Bonheur RAWAGO"
            />
            <div className="photo-tag">BERGER-LE-BONHEUR RAWAGO</div>
          </div>

          <div className="about-copy">
            <div className="eyebrow">{fr ? 'LE FONDATEUR' : 'THE FOUNDER'}</div>
            <h2>{copy.about}</h2>
            <h3>{copy.founder}</h3>
            <p>{copy.aboutText}</p>

            <div className="info">
              <b>{fr ? 'Publics accompagnés' : 'Who we support'}</b>
              <span>{copy.levels}</span>
            </div>

            <div className="info">
              <b>{fr ? 'Modalités' : 'Delivery'}</b>
              <span>{copy.modal}</span>
            </div>
          </div>
        </section>

        <section className="contact section" id="contact">
          <div className="contact-intro">
            <div className="eyebrow">UN PREMIER ÉCHANGE</div>
            <h2>{copy.quote}</h2>
            <p>{copy.qtext}</p>
            <div className="contact-line">
              <MessageCircle />
              <span>
                {fr
                  ? 'Réponse personnalisée · Devis selon la complexité'
                  : 'Personalised response · Quote based on complexity'}
              </span>
            </div>
          </div>

          <form
            action="https://formsubmit.co/rawagobergerlebonheur@gmail.com"
            method="POST"
          >
            <input type="hidden" name="_subject" value="Nouvelle demande - Berger-Le-Bonheur RAWAGO" />
            <input type="hidden" name="_template" value="table" />
            <input type="hidden" name="_captcha" value="true" />

            <label>
              {copy.service}
              <select name="Service demandé" value={form.service} onChange={e => update('service', e.target.value)} required>
                <option value="Accompagnement éducatif">{copy.education}</option>
                <option value="Recherche documentaire">{copy.research}</option>
                <option value="Appui professionnel">{copy.professional}</option>
              </select>
            </label>

            <label>
              {copy.name}
              <input name="Nom" required value={form.name} onChange={e => update('name', e.target.value)} />
            </label>

            <label>
              {copy.email}
              <input name="Email" type="email" required value={form.email} onChange={e => update('email', e.target.value)} />
            </label>

            <label>
              {copy.country}
              <input name="Pays" value={form.country} onChange={e => update('country', e.target.value)} />
            </label>

            {form.service === 'Accompagnement éducatif' && (
              <>
                <label>
                  {copy.level}
                  <select name="Niveau" value={form.level} onChange={e => update('level', e.target.value)}>
                    <option value="">{fr ? 'Choisir un niveau' : 'Choose a level'}</option>
                    {copy.levelsList.map(item => <option key={item}>{item}</option>)}
                  </select>
                </label>

                <label>
                  {copy.subject}
                  <select name="Matière" value={form.subject} onChange={e => update('subject', e.target.value)}>
                    <option value="">{fr ? 'Choisir une matière' : 'Choose a subject'}</option>
                    {copy.subjects.map(item => <option key={item}>{item}</option>)}
                  </select>
                </label>

                <label>
                  {copy.mode}
                  <select name="Modalité" value={form.mode} onChange={e => update('mode', e.target.value)}>
                    <option value="">{fr ? 'Choisir une modalité' : 'Choose a format'}</option>
                    <option value="À distance">{copy.online}</option>
                    <option value="Présentiel">{copy.inPerson}</option>
                  </select>
                </label>
              </>
            )}

            {form.service === 'Recherche documentaire' && (
              <label>
                {copy.resource}
                <select name="Type de ressource" value={form.resource} onChange={e => update('resource', e.target.value)}>
                  <option value="">{fr ? 'Choisir un type' : 'Choose a type'}</option>
                  {copy.resources.map(item => <option key={item}>{item}</option>)}
                </select>
              </label>
            )}

            {form.service === 'Appui professionnel' && (
              <label>
                {copy.profession}
                <input name="Profession ou domaine" value={form.profession} onChange={e => update('profession', e.target.value)} />
              </label>
            )}

            <label>
              {copy.need}
              <textarea
                name="Description de la demande"
                required
                rows="5"
                value={form.need}
                onChange={e => update('need', e.target.value)}
                placeholder={copy.placeholder}
              />
            </label>

            <p className="form-note">{copy.note}</p>

            <button className="btn primary" type="submit">
              {copy.send}<Send size={16} />
            </button>
          </form>
        </section>

        <section className="client-area section" id="espace-client">
          <div className="section-head">
            <div className="eyebrow">
              {fr ? 'VOTRE ESPACE PERSONNEL' : 'YOUR PERSONAL AREA'}
            </div>
            <h2>{fr ? 'Espace Client' : 'Client Area'}</h2>
            <p>
              {fr
                ? 'Créez votre compte pour transmettre vos demandes et suivre leur évolution.'
                : 'Create an account to submit requests and follow their progress.'}
            </p>
          </div>

          {authLoading ? (
            <div className="auth-card">
              <RefreshCw />
              <p>{fr ? 'Chargement de votre espace…' : 'Loading your account…'}</p>
            </div>
          ) : !session ? (
            <div className="auth-card">
              <div className="ico"><UserRound /></div>
              <h3>
                {authMode === 'login'
                  ? (fr ? 'Connexion à votre compte' : 'Sign in to your account')
                  : (fr ? 'Créer votre compte client' : 'Create your client account')}
              </h3>

              <div className="auth-switch">
                <button
                  type="button"
                  className={authMode === 'login' ? 'active' : ''}
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError('');
                    setAuthMessage('');
                  }}
                >
                  {fr ? 'Se connecter' : 'Sign in'}
                </button>

                <button
                  type="button"
                  className={authMode === 'signup' ? 'active' : ''}
                  onClick={() => {
                    setAuthMode('signup');
                    setAuthError('');
                    setAuthMessage('');
                  }}
                >
                  {fr ? 'Créer un compte' : 'Sign up'}
                </button>
              </div>

              <form className="auth-form" onSubmit={handleAuthSubmit}>
                {authMode === 'signup' && (
                  <label>
                    {fr ? 'Nom complet' : 'Full name'}
                    <input
                      type="text"
                      required
                      autoComplete="name"
                      value={authForm.fullName}
                      onChange={e => updateAuth('fullName', e.target.value)}
                    />
                  </label>
                )}

                <label>
                  {fr ? 'Adresse e-mail' : 'Email address'}
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={authForm.email}
                    onChange={e => updateAuth('email', e.target.value)}
                  />
                </label>

                <label>
                  {fr ? 'Mot de passe' : 'Password'}
                  <input
                    type="password"
                    required
                    minLength="6"
                    autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                    value={authForm.password}
                    onChange={e => updateAuth('password', e.target.value)}
                  />
                </label>

                <button className="btn primary" type="submit">
                  {authMode === 'login'
                    ? (fr ? 'Me connecter' : 'Sign in')
                    : (fr ? 'Créer mon compte' : 'Create my account')}
                  <ArrowRight size={16} />
                </button>
              </form>

              {authError && <p className="form-error">{authError}</p>}
              {authMessage && <p className="form-message">{authMessage}</p>}

              <p className="auth-note">
                <LockKeyhole size={15} />
                {fr
                  ? 'Vos informations personnelles sont protégées par votre espace sécurisé.'
                  : 'Your personal information is protected by your secure account.'}
              </p>
            </div>
          ) : (
            <div className="dashboard">
              <div className="dashboard-heading">
                <div>
                  <div className="eyebrow">
                    {profile?.role === 'admin'
                      ? (fr ? 'ESPACE ADMINISTRATEUR' : 'ADMINISTRATOR AREA')
                      : (fr ? 'BIENVENUE' : 'WELCOME')}
                  </div>
                  <h3>{profile?.full_name || session.user.email}</h3>
                  <p>{session.user.email}</p>
                </div>

                <button className="btn secondary dark-button" type="button" onClick={handleSignOut}>
                  <LogOut size={16} />
                  {fr ? 'Déconnexion' : 'Sign out'}
                </button>
              </div>

              {authError && <p className="form-error">{authError}</p>}

              {profile?.role === 'admin' ? (
                <div className="dashboard-panel admin-panel">
                  <div className="request-heading">
                    <div>
                      <div className="eyebrow">{fr ? 'GESTION' : 'MANAGEMENT'}</div>
                      <h3>{fr ? 'Demandes des clients' : 'Client requests'}</h3>
                    </div>
                    <span>{requests.length}</span>
                  </div>

                  <p>
                    {fr
                      ? 'Consultez les demandes reçues et mettez à jour leur état de traitement.'
                      : 'Review incoming requests and update their processing status.'}
                  </p>

                  {requestError && <p className="form-error">{requestError}</p>}

                  {requestsLoading ? (
                    <p>{fr ? 'Chargement des demandes…' : 'Loading requests…'}</p>
                  ) : requests.length === 0 ? (
                    <p className="empty-state">
                      {fr ? 'Aucune demande client pour le moment.' : 'There are no client requests yet.'}
                    </p>
                  ) : (
                    <div className="request-list">
                      {requests.map(item => {
                        const clientProfile = adminProfiles.find(person => person.id === item.client_id);
                        return (
                          <article className="request-item admin-request-item" key={item.id}>
                            <div className="request-item-top">
                              <b>{item.service}</b>
                              <span className={`status status-${item.status}`}>
                                {statusLabel(item.status)}
                              </span>
                            </div>

                            <p>
                              <strong>{fr ? 'Client : ' : 'Client: '}</strong>
                              {clientProfile?.full_name || (fr ? 'Nom non renseigné' : 'Name not provided')}
                            </p>
                            {item.level && <p><strong>{fr ? 'Niveau : ' : 'Level: '}</strong>{item.level}</p>}
                            {item.subject && <p><strong>{fr ? 'Matière : ' : 'Subject: '}</strong>{item.subject}</p>}
                            {item.preferred_mode && <p><strong>{fr ? 'Modalité : ' : 'Format: '}</strong>{item.preferred_mode}</p>}
                            {item.resource_type && <p><strong>{fr ? 'Ressource : ' : 'Resource: '}</strong>{item.resource_type}</p>}
                            {item.profession && <p><strong>{fr ? 'Domaine : ' : 'Field: '}</strong>{item.profession}</p>}
                            <p>{item.description}</p>
                            <small>
                              {fr ? 'Reçue le ' : 'Received on '}
                              {new Date(item.created_at).toLocaleDateString(fr ? 'fr-FR' : 'en-GB')}
                            </small>

                            <label className="admin-status-control">
                              {fr ? 'État de la demande' : 'Request status'}
                              <select
                                value={item.status}
                                onChange={event => handleAdminStatusChange(item.id, event.target.value)}
                              >
                                <option value="pending">{fr ? 'En attente' : 'Pending'}</option>
                                <option value="reviewing">{fr ? 'À l’étude' : 'Under review'}</option>
                                <option value="accepted">{fr ? 'Acceptée' : 'Accepted'}</option>
                                <option value="in_progress">{fr ? 'En cours' : 'In progress'}</option>
                                <option value="completed">{fr ? 'Terminée' : 'Completed'}</option>
                                <option value="rejected">{fr ? 'Refusée' : 'Declined'}</option>
                              </select>
                            </label>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
              <div className="dashboard-grid">
                <div className="dashboard-panel">
                  <h3>{fr ? 'Nouvelle demande' : 'New request'}</h3>
                  <p>
                    {fr
                      ? 'Présentez votre besoin. Vous pourrez suivre son traitement ici.'
                      : 'Describe what you need. You can follow its progress here.'}
                  </p>

                  <form className="auth-form" onSubmit={handleRequestSubmit}>
                    <label>
                      {copy.service}
                      <select
                        value={requestForm.service}
                        onChange={e => updateRequest('service', e.target.value)}
                      >
                        <option value="Accompagnement éducatif">{copy.education}</option>
                        <option value="Recherche documentaire">{copy.research}</option>
                        <option value="Appui professionnel">{copy.professional}</option>
                      </select>
                    </label>

                    {requestForm.service === 'Accompagnement éducatif' && (
                      <>
                        <label>
                          {copy.level}
                          <select
                            value={requestForm.level}
                            onChange={e => updateRequest('level', e.target.value)}
                          >
                            <option value="">{fr ? 'Choisir un niveau' : 'Choose a level'}</option>
                            {copy.levelsList.map(item => <option key={item}>{item}</option>)}
                          </select>
                        </label>

                        <label>
                          {copy.subject}
                          <select
                            value={requestForm.subject}
                            onChange={e => updateRequest('subject', e.target.value)}
                          >
                            <option value="">{fr ? 'Choisir une matière' : 'Choose a subject'}</option>
                            {copy.subjects.map(item => <option key={item}>{item}</option>)}
                          </select>
                        </label>

                        <label>
                          {copy.mode}
                          <select
                            value={requestForm.preferred_mode}
                            onChange={e => updateRequest('preferred_mode', e.target.value)}
                          >
                            <option value="">{fr ? 'Choisir une modalité' : 'Choose a format'}</option>
                            <option value="À distance">{copy.online}</option>
                            <option value="Présentiel">{copy.inPerson}</option>
                          </select>
                        </label>
                      </>
                    )}

                    {requestForm.service === 'Recherche documentaire' && (
                      <label>
                        {copy.resource}
                        <select
                          value={requestForm.resource_type}
                          onChange={e => updateRequest('resource_type', e.target.value)}
                        >
                          <option value="">{fr ? 'Choisir un type' : 'Choose a type'}</option>
                          {copy.resources.map(item => <option key={item}>{item}</option>)}
                        </select>
                      </label>
                    )}

                    {requestForm.service === 'Appui professionnel' && (
                      <label>
                        {copy.profession}
                        <input
                          value={requestForm.profession}
                          onChange={e => updateRequest('profession', e.target.value)}
                        />
                      </label>
                    )}

                    <label>
                      {copy.need}
                      <textarea
                        rows="5"
                        required
                        value={requestForm.description}
                        onChange={e => updateRequest('description', e.target.value)}
                        placeholder={copy.placeholder}
                      />
                    </label>

                    {requestError && <p className="form-error">{requestError}</p>}
                    {requestMessage && <p className="form-message">{requestMessage}</p>}

                    <button className="btn primary" type="submit" disabled={requestLoading}>
                      {requestLoading
                        ? (fr ? 'Envoi en cours…' : 'Sending…')
                        : (fr ? 'Envoyer ma demande' : 'Submit my request')}
                      <Send size={16} />
                    </button>
                  </form>
                </div>

                <div className="dashboard-panel">
                  <div className="request-heading">
                    <h3>{fr ? 'Mes demandes' : 'My requests'}</h3>
                    <span>{requests.length}</span>
                  </div>

                  {requestsLoading ? (
                    <p>{fr ? 'Chargement des demandes…' : 'Loading requests…'}</p>
                  ) : requests.length === 0 ? (
                    <p className="empty-state">
                      {fr
                        ? 'Vous n’avez pas encore envoyé de demande depuis votre espace.'
                        : 'You have not submitted a request from your account yet.'}
                    </p>
                  ) : (
                    <div className="request-list">
                      {requests.map(item => (
                        <article className="request-item" key={item.id}>
                          <div className="request-item-top">
                            <b>{item.service}</b>
                            <span className={`status status-${item.status}`}>
                              {statusLabel(item.status)}
                            </span>
                          </div>

                          {item.subject && <p>{item.subject}</p>}
                          <p>{item.description}</p>

                          <small>
                            {fr ? 'Envoyée le ' : 'Submitted on '}
                            {new Date(item.created_at).toLocaleDateString(
                              fr ? 'fr-FR' : 'en-GB'
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
        </section>
      </main>

      <footer>
        <a className="brand light" href="#home">
          {portrait}
          <span>BERGER-LE-BONHEUR<small>RAWAGO</small></span>
        </a>
        <p>{copy.footer}</p>
        <span>© {new Date().getFullYear()} Berger-Le-Bonheur RAWAGO</span>
      </footer>
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);

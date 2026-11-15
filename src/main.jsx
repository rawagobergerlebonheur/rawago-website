
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BookOpen, GraduationCap, Search, BriefcaseBusiness,
  ArrowRight, Menu, X, Globe2, MessageCircle,
  ShieldCheck, Send
} from 'lucide-react';
import './style.css';

function App() {
  const [lang, setLang] = useState('fr');
  const [menu, setMenu] = useState(false);
  const fr = lang === 'fr';

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
    nav: ['Accueil', 'Nos services', 'À propos', 'Contact'],
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
    aboutText: 'Berger-Le-Bonheur RAWAGO met la connaissance et la méthode au service de vos ambitions. Chaque demande est étudiée avec attention afin de proposer une réponse adaptée, claire et réaliste.',
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
    nav: ['Home', 'Services', 'About', 'Contact'],
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
    aboutText: 'Berger-Le-Bonheur RAWAGO puts knowledge and method at the service of your ambitions. Every request is carefully reviewed to provide a clear and relevant response.',
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

  const services = [
    { icon: <GraduationCap />, title: copy.servicesList[0][0], text: copy.servicesList[0][1] },
    { icon: <Search />, title: copy.servicesList[1][0], text: copy.servicesList[1][1] },
    { icon: <BriefcaseBusiness />, title: copy.servicesList[2][0], text: copy.servicesList[2][1] }
  ];

  return (
    <>
      <header>
        <a className="brand" href="#home">
          <span className="mark">BR</span>
          <span>BERGER-LE-BONHEUR<small>RAWAGO</small></span>
        </a>

        <button className="mobile" onClick={() => setMenu(!menu)} aria-label="Menu">
          {menu ? <X /> : <Menu />}
        </button>

        <nav className={menu ? 'show' : ''}>
          {copy.nav.map((item, index) => (
            <a onClick={() => setMenu(false)} href={['#home', '#services', '#about', '#contact'][index]} key={item}>
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
            <h1>{copy.title.split('\n').map((line, index) => (
              <React.Fragment key={line}>
                {index > 0 && <br />}
                {line}
              </React.Fragment>
            ))}</h1>
            <p>{copy.intro}</p>
            <div className="actions">
              <a className="btn primary" href="#services">{copy.cta}<ArrowRight size={17} /></a>
              <a className="btn secondary" href="#contact">{copy.contact}</a>
            </div>
            <div className="trust"><ShieldCheck size={18} /><span>{copy.modal}</span></div>
          </div>

          <div className="hero-visual">
            <img
              src="https://images.unsplash.com/photo-1529390079861-591de354faf5?auto=format&fit=crop&w=1200&q=85"
              alt="Étudiants échangeant autour de leurs apprentissages"
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
                <a href="#contact">{fr ? 'Faire une demande' : 'Make an enquiry'} <ArrowRight size={15} /></a>
              </article>
            ))}
          </div>
        </section>

        <section className="about section" id="about">
          <div className="about-photo">
            <img
              src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1000&q=85"
              alt="Groupe d’étudiants travaillant ensemble"
            />
            <div className="photo-tag">RAWAGO · Le savoir réussit</div>
          </div>
          <div className="about-copy">
            <div className="eyebrow">NOTRE ENGAGEMENT</div>
            <h2>{copy.about}</h2>
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
              <span>{fr ? 'Réponse personnalisée · Devis selon la complexité' : 'Personalised response · Quote based on complexity'}</span>
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
      </main>

      <footer>
        <a className="brand light" href="#home">
          <span className="mark">BR</span>
          <span>BERGER-LE-BONHEUR<small>RAWAGO</small></span>
        </a>
        <p>{copy.footer}</p>
        <span>© {new Date().getFullYear()} Berger-Le-Bonheur RAWAGO</span>
      </footer>
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);

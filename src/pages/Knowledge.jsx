
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../supabase";

const CATEGORY_LIST = [
  "Actualités",
  "Éducation",
  "Méthodologie",
  "Culture et patrimoine",
  "Histoire",
  "Philosophie",
  "Société et citoyenneté",
  "Économie",
  "Politique et géopolitique",
  "Sciences et technologies",
  "Littérature",
  "Développement personnel",
  "Environnement",
  "Recherche et analyses",
  "Arts et créativité",
];

function normalizeCategory(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function renderArticleContent(content = "") {
  return String(content)
    .split(/\r?\n/)
    .map((line, index) => {
      const value = line.trim();

      if (!value) {
        return <div className="article-spacer" key={index} />;
      }

      if (value.startsWith("### ")) {
        return <h3 key={index}>{value.slice(4)}</h3>;
      }

      if (value.startsWith("## ")) {
        return <h2 key={index}>{value.slice(3)}</h2>;
      }

      if (value.startsWith("# ")) {
        return <h2 key={index}>{value.slice(2)}</h2>;
      }

      if (value.startsWith("- ") || value.startsWith("* ")) {
        return (
          <p className="article-list-item" key={index}>
            • {value.slice(2)}
          </p>
        );
      }

      return <p key={index}>{value}</p>;
    });
}

export default function Knowledge() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Toutes les catégories");
  const [selectedArticle, setSelectedArticle] = useState(null);

  const categoryScrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  /* CHARGEMENT SUPABASE */

  useEffect(() => {
    let active = true;

    async function loadArticles() {
      setLoading(true);
      setError("");

      const { data, error: queryError } = await supabase
        .from("knowledge_articles")
        .select(
          "id, title, category, summary, content, image_url, published_at, created_at"
        )
        .eq("status", "published")
        .order("published_at", { ascending: false });

      if (!active) return;

      if (queryError) {
        setError(
          "Les publications ne peuvent pas être chargées pour le moment."
        );
      } else {
        setArticles(data || []);
      }

      setLoading(false);
    }

    loadArticles();

    return () => {
      active = false;
    };
  }, []);

  /* ACTUALISATION DES FLÈCHES DE DÉFILEMENT */

  function updateScrollButtons() {
    const element = categoryScrollRef.current;
    if (!element) return;

    const maxScroll = element.scrollWidth - element.clientWidth;

    setCanScrollLeft(element.scrollLeft > 3);
    setCanScrollRight(element.scrollLeft < maxScroll - 3);
  }

  useEffect(() => {
    const element = categoryScrollRef.current;
    if (!element) return;

    updateScrollButtons();

    element.addEventListener("scroll", updateScrollButtons, {
      passive: true,
    });

    const observer = new ResizeObserver(updateScrollButtons);
    observer.observe(element);

    return () => {
      element.removeEventListener("scroll", updateScrollButtons);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    updateScrollButtons();
  }, [articles]);

  /* DÉFILEMENT PAR LES FLÈCHES */

  function scrollCategories(direction) {
    const element = categoryScrollRef.current;
    if (!element) return;

    element.scrollBy({
      left: direction * 360,
      behavior: "smooth",
    });
  }

  /* CENTRER LE THÈME ACTIF */

  useEffect(() => {
    const element = categoryScrollRef.current;
    if (!element) return;

    const activeButton = element.querySelector(
      '[aria-pressed="true"]'
    );

    if (activeButton) {
      const containerWidth = element.clientWidth;
      const buttonLeft = activeButton.offsetLeft;
      const buttonWidth = activeButton.offsetWidth;

      const target =
        buttonLeft - containerWidth / 2 + buttonWidth / 2;

      element.scrollTo({
        left: Math.max(0, target),
        behavior: "smooth",
      });
    }
  }, [category]);

  /* COMPTEURS */

  const categoryCounts = useMemo(() => {
    const counts = {};

    CATEGORY_LIST.forEach((item) => {
      counts[item] = articles.filter(
        (article) =>
          normalizeCategory(article.category) === normalizeCategory(item)
      ).length;
    });

    return counts;
  }, [articles]);

  /* FILTRAGE DES PUBLICATIONS */

  const filteredArticles = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("fr");

    return articles.filter((article) => {
      const matchesCategory =
        category === "Toutes les catégories" ||
        normalizeCategory(article.category) === normalizeCategory(category);

      const matchesSearch =
        !term ||
        [
          article.title,
          article.summary,
          article.content,
          article.category,
        ].some((value) =>
          String(value || "").toLocaleLowerCase("fr").includes(term)
        );

      return matchesCategory && matchesSearch;
    });
  }, [articles, category, search]);

  /* NAVIGATION ENTRE LES ARTICLES */

  const selectedIndex = selectedArticle
    ? articles.findIndex((article) => article.id === selectedArticle.id)
    : -1;

  const relatedArticles = useMemo(() => {
    if (!selectedArticle) return [];

    const sameCategory = articles.filter(
      (article) =>
        article.id !== selectedArticle.id &&
        normalizeCategory(article.category) ===
          normalizeCategory(selectedArticle.category)
    );

    const others = articles.filter(
      (article) => article.id !== selectedArticle.id
    );

    return [
      ...sameCategory,
      ...others.filter(
        (article) =>
          !sameCategory.some((item) => item.id === article.id)
      ),
    ].slice(0, 3);
  }, [articles, selectedArticle]);

  function openArticle(article) {
    setSelectedArticle(article);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeArticle() {
    setSelectedArticle(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function formatDate(date) {
    if (!date) return "";

    return new Date(date).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  /* CARTE D'ARTICLE */

  function ArticleCard({ article }) {
    return (
      <article className="knowledge-card">
        <div className="knowledge-card-image">
          {article.image_url ? (
            <img
              src={article.image_url}
              alt={article.title}
              loading="lazy"
            />
          ) : (
            <div className="knowledge-card-image-placeholder">
              R.
            </div>
          )}
        </div>

        <div className="knowledge-card-body">
          <div className="eyebrow">{article.category}</div>

          <h2>{article.title}</h2>

          <p>{article.summary}</p>

          <div className="knowledge-card-meta">
            <button
              className="knowledge-read"
              type="button"
              onClick={() => openArticle(article)}
            >
              Lire l'article <span>→</span>
            </button>
          </div>
        </div>
      </article>
    );
  }

  return (
    <main className="section knowledge-page">

      <style>{`

        .knowledge-page {
          --knowledge-ink: #173239;
          --knowledge-green: #087f78;
          --knowledge-green-dark: #075e59;
          --knowledge-muted: #687d80;
          --knowledge-cream: #f5f1e8;

          color: var(--knowledge-ink);
          position: relative;
          isolation: isolate;
          padding-top: 30px;
          padding-bottom: 80px;
        }

        .knowledge-page *,
        .knowledge-page *::before,
        .knowledge-page *::after {
          box-sizing: border-box;
        }

        /* HERO */

        .knowledge-hero {
          display: grid;
          grid-template-columns: 1fr 1fr;
          min-height: 390px;
          overflow: hidden;
          border-radius: 22px;
          background: var(--knowledge-cream);
          margin: 0 0 48px;
        }

        .knowledge-hero-content {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          padding: clamp(30px, 5vw, 65px);
        }

        .knowledge-hero .eyebrow,
        .knowledge-section-heading .eyebrow {
          color: var(--knowledge-green);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .17em;
          line-height: 1.8;
          text-transform: uppercase;
        }

        .knowledge-hero h1 {
          max-width: 530px;
          margin: 20px 0;
          color: var(--knowledge-ink);
          font-family: Georgia, serif;
          font-size: clamp(42px, 5.5vw, 70px);
          font-weight: 500;
          line-height: 1.02;
          letter-spacing: -.045em;
        }

        .knowledge-hero p {
          max-width: 490px;
          margin: 0;
          color: #627679;
          font-size: 15px;
          line-height: 1.9;
        }

        .knowledge-hero-image {
          position: relative;
          min-height: 390px;
          background:
            linear-gradient(
              90deg,
              rgba(14, 45, 42, .15),
              rgba(14, 45, 42, .05)
            ),
            url("https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1400&q=85")
            center / cover no-repeat;
        }

        .knowledge-hero-image::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            transparent 45%,
            rgba(13, 39, 37, .45)
          );
        }

        .knowledge-hero-caption {
          position: absolute;
          z-index: 1;
          bottom: 28px;
          left: 30px;
          color: white;
          font-size: 11px;
          font-weight: 750;
          letter-spacing: .15em;
          text-transform: uppercase;
        }

        /* INTRODUCTION */

        .knowledge-section-heading {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 25px;
          margin: 0 0 26px;
        }

        .knowledge-section-heading h2 {
          margin: 9px 0 0;
          color: var(--knowledge-ink);
          font-family: Georgia, serif;
          font-size: clamp(27px, 3vw, 38px);
          font-weight: 500;
          letter-spacing: -.035em;
        }

        .knowledge-section-heading p {
          max-width: 440px;
          margin: 0;
          color: #627679;
          font-size: 15px;
          line-height: 1.85;
        }

        /* RECHERCHE */

        .knowledge-search-wrap {
          position: relative;
          margin-bottom: 27px;
        }

        .knowledge-search-icon {
          position: absolute;
          top: 50%;
          left: 19px;
          transform: translateY(-50%);
          color: #81938e;
          font-size: 20px;
          pointer-events: none;
        }

        .knowledge-search {
          width: 100%;
          min-height: 58px;
          padding: 14px 20px 14px 52px;
          border: 1px solid #dce5df;
          border-radius: 14px;
          background: #fff;
          color: var(--knowledge-ink);
          font: inherit;
          font-size: 14px;
          outline: none;
          transition: border-color .2s, box-shadow .2s;
        }

        .knowledge-search:focus {
          border-color: var(--knowledge-green);
          box-shadow: 0 0 0 4px rgba(8,127,120,.09);
        }

        .knowledge-search::placeholder {
          color: #9aa9a5;
        }

        /* CONTENEUR DES CATÉGORIES */

        .knowledge-category-section {
          position: relative;
          margin: 0 0 36px;
          padding: 24px 25px 22px;
          border: 1px solid #e6ece7;
          border-radius: 18px;
          background: linear-gradient(135deg, #fbfcf9, #f3f7f3);
          box-shadow: 0 8px 28px rgba(23,50,57,.035);
        }

        .knowledge-category-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
          margin-bottom: 19px;
        }

        .knowledge-category-title {
          color: var(--knowledge-ink);
          font-family: Georgia, serif;
          font-size: 20px;
          font-weight: 600;
          margin: 0;
        }

        .knowledge-category-hint {
          margin: 5px 0 0;
          color: #879691;
          font-size: 12px;
        }

        .knowledge-category-controls {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .knowledge-scroll-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border: 1px solid #dce6df;
          border-radius: 50%;
          background: white;
          color: var(--knowledge-ink);
          font-size: 21px;
          line-height: 1;
          cursor: pointer;
          transition: all .2s ease;
        }

        .knowledge-scroll-button:hover:not(:disabled) {
          background: var(--knowledge-green);
          border-color: var(--knowledge-green);
          color: white;
          transform: translateY(-2px);
        }

        .knowledge-scroll-button:disabled {
          opacity: .35;
          cursor: default;
        }

        /* DÉFILEMENT HORIZONTAL */

        .knowledge-category-viewport {
          position: relative;
          min-width: 0;
        }

        .knowledge-category-scroll {
          display: flex;
          align-items: center;
          gap: 11px;
          width: 100%;
          overflow-x: auto;
          overflow-y: hidden;
          padding: 5px 3px 12px;
          scroll-behavior: smooth;
          scroll-snap-type: x proximity;
          scrollbar-width: none;
          -ms-overflow-style: none;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x;
          overscroll-behavior-x: contain;
        }

        .knowledge-category-scroll::-webkit-scrollbar {
          display: none;
          width: 0;
          height: 0;
        }

        /* FONDU DISCRET AUX EXTRÉMITÉS */

        .knowledge-category-viewport::before,
        .knowledge-category-viewport::after {
          content: "";
          position: absolute;
          z-index: 2;
          top: 0;
          bottom: 10px;
          width: 34px;
          pointer-events: none;
          opacity: 0;
          transition: opacity .2s ease;
        }

        .knowledge-category-viewport::before {
          left: 0;
          background: linear-gradient(
            90deg,
            #f8faf7,
            rgba(248,250,247,0)
          );
        }

        .knowledge-category-viewport::after {
          right: 0;
          background: linear-gradient(
            270deg,
            #f5f8f4,
            rgba(245,248,244,0)
          );
        }

        .knowledge-category-viewport.has-left::before {
          opacity: 1;
        }

        .knowledge-category-viewport.has-right::after {
          opacity: 1;
        }

        /* BOUTONS DES THÈMES */

        .knowledge-category-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          flex: 0 0 auto;
          min-height: 44px;
          padding: 0 17px;
          border: 1px solid #e0e8e1;
          border-radius: 999px;
          background: white;
          color: #50666a;
          font-family: inherit;
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
          cursor: pointer;
          scroll-snap-align: center;
          transition:
            background .22s ease,
            color .22s ease,
            border-color .22s ease,
            box-shadow .22s ease,
            transform .22s ease;
        }

        .knowledge-category-button:hover {
          border-color: #9bc6ba;
          background: #f0f7f3;
          color: var(--knowledge-green-dark);
          transform: translateY(-2px);
        }

        .knowledge-category-button.active {
          border-color: var(--knowledge-green);
          background: var(--knowledge-green);
          color: white;
          box-shadow: 0 5px 15px rgba(8,127,120,.18);
        }

        .knowledge-category-button.active:hover {
          background: var(--knowledge-green-dark);
          color: white;
        }

        .knowledge-category-count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 22px;
          height: 22px;
          padding: 0 6px;
          border-radius: 20px;
          background: #edf2ee;
          color: #637a72;
          font-size: 10px;
          font-weight: 800;
        }

        .knowledge-category-button.active .knowledge-category-count {
          background: rgba(255,255,255,.2);
          color: white;
        }

        /* RÉSULTATS */

        .knowledge-results-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin: 0 0 19px;
        }

        .knowledge-results-heading h3 {
          margin: 0;
          color: var(--knowledge-ink);
          font-family: Georgia, serif;
          font-size: 23px;
          font-weight: 500;
        }

        .knowledge-results-count {
          color: #82938d;
          font-size: 12px;
        }

        /* CARTES */

        .knowledge-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fill,
            minmax(min(100%, 270px), 1fr)
          );
          gap: 22px;
          align-items: stretch;
        }

        .knowledge-card {
          min-width: 0;
          border: 1px solid #e5ebe6;
          border-radius: 17px;
          overflow: hidden;
          background: white;
          display: flex;
          flex-direction: column;
          transition:
            transform .25s ease,
            box-shadow .25s ease,
            border-color .25s ease;
        }

        .knowledge-card:hover {
          transform: translateY(-5px);
          border-color: #d0e1d9;
          box-shadow: 0 16px 36px rgba(23,50,57,.09);
        }

        .knowledge-card-image {
          position: relative;
          height: 210px;
          overflow: hidden;
          background: #edf1ed;
        }

        .knowledge-card-image img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform .5s ease;
        }

        .knowledge-card:hover .knowledge-card-image img {
          transform: scale(1.045);
        }

        .knowledge-card-image-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background: linear-gradient(145deg, #e8eee9, #f7f2e8);
          color: #69817a;
          font-family: Georgia, serif;
          font-size: 35px;
        }

        .knowledge-card-body {
          display: flex;
          flex-direction: column;
          flex: 1;
          padding: 22px;
        }

        .knowledge-card .eyebrow {
          color: var(--knowledge-green);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .14em;
          text-transform: uppercase;
        }

        .knowledge-card h2 {
          margin: 12px 0 10px;
          color: var(--knowledge-ink);
          font-family: Georgia, serif;
          font-size: 21px;
          font-weight: 600;
          line-height: 1.3;
          letter-spacing: -.02em;
        }

        .knowledge-card p {
          margin: 0 0 20px;
          color: #687d80;
          font-size: 13px;
          line-height: 1.8;
          display: -webkit-box;
          -webkit-line-clamp: 4;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .knowledge-card-meta {
          margin-top: auto;
          padding-top: 15px;
          border-top: 1px solid #edf0ec;
        }

        .knowledge-read {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          border: 0;
          background: transparent;
          color: var(--knowledge-green);
          padding: 0;
          font: inherit;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: gap .2s ease;
        }

        .knowledge-read:hover {
          gap: 15px;
        }

        .knowledge-read span {
          font-size: 17px;
        }

        /* ÉTATS */

        .knowledge-state {
          padding: 45px 25px;
          border: 1px solid #e3ebe5;
          border-radius: 16px;
          background: #f8faf7;
          text-align: center;
        }

        .knowledge-state h2 {
          margin: 0 0 10px;
          color: var(--knowledge-ink);
          font-family: Georgia, serif;
          font-size: 27px;
        }

        .knowledge-state p {
          color: #718386;
          font-size: 14px;
          line-height: 1.8;
        }

        /* LECTURE D'ARTICLE */

        .knowledge-article {
          max-width: 1040px;
          margin: 0 auto;
        }

        .knowledge-article .article-back {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 35px;
          border: 1px solid #dce5df;
          background: white;
          color: var(--knowledge-ink);
          padding: 12px 17px;
          border-radius: 9px;
          font: inherit;
          font-size: 13px;
          cursor: pointer;
        }

        .knowledge-article .article-back:hover {
          border-color: var(--knowledge-green);
          color: var(--knowledge-green);
        }

        .knowledge-article .article-heading {
          max-width: 800px;
          margin: 0 auto;
          text-align: center;
        }

        .knowledge-article .eyebrow {
          color: var(--knowledge-green);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .15em;
          text-transform: uppercase;
        }

        .knowledge-article h1 {
          color: var(--knowledge-ink);
          font-family: Georgia, serif;
          font-size: clamp(36px, 5vw, 58px);
          font-weight: 500;
          line-height: 1.1;
          letter-spacing: -.04em;
          margin: 17px 0;
        }

        .knowledge-article .article-summary {
          color: #627679;
          font-size: 17px;
          line-height: 1.85;
        }

        .knowledge-article .article-date {
          display: inline-block;
          margin-top: 12px;
          color: #899995;
          font-size: 12px;
        }

        .knowledge-article .article-cover {
          display: block;
          width: 100%;
          max-height: 500px;
          object-fit: cover;
          border-radius: 18px;
          margin: 35px 0 45px;
        }

        .knowledge-article .article-content {
          max-width: 760px;
          margin: 0 auto;
          color: #425b5e;
          font-size: 16px;
          line-height: 2;
          overflow-wrap: anywhere;
        }

        .knowledge-article .article-content p {
          margin: 0 0 1.2em;
        }

        .knowledge-article .article-content h2 {
          color: var(--knowledge-ink);
          font-family: Georgia, serif;
          font-size: 29px;
          line-height: 1.3;
          margin: 1.8em 0 .7em;
        }

        .knowledge-article .article-content h3 {
          color: var(--knowledge-ink);
          font-family: Georgia, serif;
          font-size: 23px;
          margin: 1.5em 0 .6em;
        }

        .knowledge-article .article-content .article-spacer {
          height: .6rem;
        }

        .knowledge-article .article-content .article-list-item {
          padding-left: 12px;
          margin-bottom: .5em;
        }

        .article-navigation {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          margin: 40px auto;
          max-width: 760px;
          flex-wrap: wrap;
        }

        .article-navigation button {
          border: 1px solid #dce5df;
          background: white;
          color: var(--knowledge-ink);
          padding: 13px 17px;
          border-radius: 9px;
          font: inherit;
          font-size: 13px;
          cursor: pointer;
        }

        .article-navigation button:hover:not(:disabled) {
          border-color: var(--knowledge-green);
          color: var(--knowledge-green);
        }

        .article-navigation button:disabled {
          opacity: .4;
          cursor: not-allowed;
        }

        .related-section {
          border-top: 1px solid #e4eae5;
          margin-top: 55px;
          padding-top: 35px;
        }

        .related-section > h2 {
          color: var(--knowledge-ink);
          font-family: Georgia, serif;
          font-size: 30px;
          font-weight: 500;
          margin-bottom: 25px;
        }

        /* RESPONSIVE */

        @media (max-width: 760px) {
          .knowledge-page {
            padding-top: 20px;
          }

          .knowledge-hero {
            grid-template-columns: 1fr;
            min-height: auto;
            border-radius: 16px;
          }

          .knowledge-hero-content {
            padding: 34px 27px;
          }

          .knowledge-hero h1 {
            font-size: 46px;
          }

          .knowledge-hero-image {
            min-height: 240px;
          }

          .knowledge-section-heading {
            display: block;
          }

          .knowledge-section-heading p {
            margin-top: 12px;
          }

          .knowledge-category-section {
            padding: 19px 16px 16px;
          }

          .knowledge-category-button {
            min-height: 41px;
            padding: 0 14px;
            font-size: 11px;
          }

          .knowledge-grid {
            grid-template-columns: repeat(
              auto-fill,
              minmax(min(100%, 250px), 1fr)
            );
            gap: 16px;
          }

          .knowledge-card-image {
            height: 190px;
          }
        }

        @media (max-width: 520px) {
          .knowledge-hero h1 {
            font-size: 40px;
          }

          .knowledge-hero p {
            font-size: 14px;
          }

          .knowledge-category-top {
            align-items: flex-start;
          }

          .knowledge-category-title {
            font-size: 17px;
          }

          .knowledge-category-hint {
            font-size: 10px;
          }

          .knowledge-scroll-button {
            width: 33px;
            height: 33px;
          }

          .knowledge-category-scroll {
            gap: 8px;
          }

          .knowledge-category-button {
            min-height: 39px;
            padding: 0 13px;
          }

          .knowledge-grid {
            grid-template-columns: 1fr;
          }

          .knowledge-card-image {
            height: 220px;
          }

          .knowledge-article h1 {
            font-size: 35px;
          }

          .knowledge-article .article-summary {
            font-size: 15px;
          }

          .knowledge-article .article-content {
            font-size: 15px;
          }

          .article-navigation {
            flex-direction: column;
          }

          .article-navigation button {
            width: 100%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .knowledge-page *,
          .knowledge-page *::before,
          .knowledge-page *::after {
            scroll-behavior: auto !important;
            transition-duration: .01ms !important;
          }
        }

      `}</style>

      {selectedArticle ? (

        /* PAGE DE LECTURE */

        <article className="knowledge-article">

          <button
            className="article-back"
            type="button"
            onClick={closeArticle}
          >
            ← Retour aux publications
          </button>

          <div className="article-heading">

            <div className="eyebrow">
              {selectedArticle.category}
            </div>

            <h1>{selectedArticle.title}</h1>

            <p className="article-summary">
              {selectedArticle.summary}
            </p>

            <small className="article-date">
              {formatDate(selectedArticle.published_at)}
            </small>

          </div>

          {selectedArticle.image_url && (
            <img
              className="article-cover"
              src={selectedArticle.image_url}
              alt={selectedArticle.title}
            />
          )}

          <div className="article-content">
            {renderArticleContent(selectedArticle.content)}
          </div>

          <div className="article-navigation">

            <button
              type="button"
              disabled={selectedIndex <= 0}
              onClick={() =>
                openArticle(articles[selectedIndex - 1])
              }
            >
              ← Article précédent
            </button>

            <button
              type="button"
              disabled={
                selectedIndex < 0 ||
                selectedIndex >= articles.length - 1
              }
              onClick={() =>
                openArticle(articles[selectedIndex + 1])
              }
            >
              Article suivant →
            </button>

          </div>

          {relatedArticles.length > 0 && (
            <section className="related-section">

              <h2>À découvrir également</h2>

              <div className="knowledge-grid">
                {relatedArticles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                  />
                ))}
              </div>

            </section>
          )}

        </article>

      ) : (

        /* PAGE PRINCIPALE */

        <>

          <section className="knowledge-hero">

            <div className="knowledge-hero-content">

              <div className="eyebrow">
                CONNAISSANCE · RÉFLEXION · CULTURE
              </div>

              <h1>
                Nourrir
                <br />
                la pensée.
                <br />
                Élargir les horizons.
              </h1>

              <p>
                Un espace de découverte, d'analyse et de partage
                autour des idées, des connaissances et des grands
                enjeux de notre époque. Parce que comprendre le
                monde commence par apprendre à le regarder autrement.
              </p>

            </div>

            <div
              className="knowledge-hero-image"
              role="img"
              aria-label="Espace d'écriture et de réflexion"
            >
              <div className="knowledge-hero-caption">
                Le savoir ouvre des perspectives
              </div>
            </div>

          </section>

          <section className="knowledge-catalogue">

            <div className="knowledge-section-heading">

              <div>
                <div className="eyebrow">
                  EXPLORER NOS PUBLICATIONS
                </div>

                <h2>Idées à découvrir</h2>
              </div>

              <p>
                Des réflexions, des analyses et des ressources
                pour apprendre, comprendre et approfondir
                les sujets qui façonnent notre société.
              </p>

            </div>

            {/* RECHERCHE */}

            <div className="knowledge-search-wrap">

              <span className="knowledge-search-icon">
                ⌕
              </span>

              <input
                className="knowledge-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher un article, un sujet, une idée..."
                aria-label="Rechercher un article"
              />

            </div>

            {/* CATÉGORIES */}

            <section
              className="knowledge-category-section"
              aria-label="Thèmes des publications"
            >

              <div className="knowledge-category-top">

                <div>
                  <h3 className="knowledge-category-title">
                    Explorer par thème
                  </h3>

                  <p className="knowledge-category-hint">
                    Choisissez un thème ou faites défiler les catégories
                  </p>
                </div>

                <div className="knowledge-category-controls">

                  <button
                    type="button"
                    className="knowledge-scroll-button"
                    onClick={() => scrollCategories(-1)}
                    disabled={!canScrollLeft}
                    aria-label="Catégories précédentes"
                  >
                    ‹
                  </button>

                  <button
                    type="button"
                    className="knowledge-scroll-button"
                    onClick={() => scrollCategories(1)}
                    disabled={!canScrollRight}
                    aria-label="Catégories suivantes"
                  >
                    ›
                  </button>

                </div>

              </div>

              <div
                className={
                  "knowledge-category-viewport" +
                  (canScrollLeft ? " has-left" : "") +
                  (canScrollRight ? " has-right" : "")
                }
              >

                <div
                  className="knowledge-category-scroll"
                  ref={categoryScrollRef}
                  role="group"
                  aria-label="Sélection d'une catégorie"
                >

                  <button
                    type="button"
                    className={
                      "knowledge-category-button " +
                      (category === "Toutes les catégories" ? "active" : "")
                    }
                    aria-pressed={category === "Toutes les catégories"}
                    onClick={() =>
                      setCategory("Toutes les catégories")
                    }
                  >
                    Tous les thèmes

                    <span className="knowledge-category-count">
                      {articles.length}
                    </span>
                  </button>

                  {CATEGORY_LIST.map((item) => {
                    const isActive =
                      normalizeCategory(category) ===
                      normalizeCategory(item);

                    return (
                      <button
                        type="button"
                        key={item}
                        className={
                          "knowledge-category-button " +
                          (isActive ? "active" : "")
                        }
                        aria-pressed={isActive}
                        onClick={() => setCategory(item)}
                      >
                        {item}

                        <span className="knowledge-category-count">
                          {categoryCounts[item] || 0}
                        </span>
                      </button>
                    );
                  })}

                </div>

              </div>

            </section>

            {/* RÉSULTATS */}

            <div className="knowledge-results-heading">

              <h3>
                {category === "Toutes les catégories"
                  ? "Toutes les publications"
                  : category}
              </h3>

              <span className="knowledge-results-count">
                {filteredArticles.length} publication
                {filteredArticles.length !== 1 ? "s" : ""}
              </span>

            </div>

            {loading ? (

              <div className="knowledge-state">
                <h2>Un instant...</h2>
                <p>Chargement des publications.</p>
              </div>

            ) : error ? (

              <div className="knowledge-state">
                <h2>Une difficulté est survenue</h2>
                <p>{error}</p>
              </div>

            ) : filteredArticles.length === 0 ? (

              <div className="knowledge-state">

                <h2>
                  {category !== "Toutes les catégories"
                    ? `Rubrique : ${category}`
                    : "La connaissance se partage"}
                </h2>

                <p>
                  {articles.length === 0
                    ? "Les premières publications seront bientôt disponibles."
                    : category !== "Toutes les catégories"
                      ? "Aucun article n'a encore été publié dans cette rubrique. Revenez bientôt découvrir nos prochaines publications."
                      : "Aucun article ne correspond à votre recherche."}
                </p>

                {category !== "Toutes les catégories" && (
                  <button
                    className="knowledge-read"
                    type="button"
                    onClick={() =>
                      setCategory("Toutes les catégories")
                    }
                  >
                    Voir toutes les publications →
                  </button>
                )}

              </div>

            ) : (

              <div className="knowledge-grid">

                {filteredArticles.map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                  />
                ))}

              </div>

            )}

          </section>

        </>

      )}

    </main>
  );
}

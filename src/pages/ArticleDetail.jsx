import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./ArticleDetail.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";

// =====================================================
// URL IMAGE
// =====================================================

function getImageUrl(image) {
  if (!image) return null;

  const url = String(image).trim();

  if (!url) return null;

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("data:")
  ) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${API_URL}${url}`;
  }

  return `${API_URL}/${url}`;
}

function ArticleDetail() {
  const params = useParams();

  const id = params.id || null;
  const slug = params.slug || null;

  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // CHARGER ARTICLE
  // =====================================================

  useEffect(() => {
    const chargerArticle = async () => {
      try {
        setLoading(true);
        setError("");
        setArticle(null);

        const response = await fetch(
          `${API_URL}/api/articles`
        );

        if (!response.ok) {
          throw new Error("Erreur serveur");
        }

        const data = await response.json();

        const articles =
          Array.isArray(data)
            ? data
            : Array.isArray(data.articles)
            ? data.articles
            : [];

        if (articles.length === 0) {
          throw new Error(
            "Aucun article trouvé"
          );
        }

        let articleTrouve = null;

        // =================================================
        // 1. CHERCHE PAR ID
        // =================================================

        if (id) {
          articleTrouve = articles.find(
            (item) =>
              String(item.id_article) ===
              String(id)
          );
        }

        // =================================================
        // 2. CHERCHE PAR SLUG
        // =================================================

        if (!articleTrouve && slug) {
          articleTrouve = articles.find(
            (item) =>
              item.slug &&
              String(item.slug).toLowerCase() ===
                String(slug).toLowerCase()
          );
        }

        // =================================================
        // ARTICLE PA JWENN
        // =================================================

        if (!articleTrouve) {
          setError(
            "Désolé, cette actualité n'existe pas ou n'est plus disponible."
          );

          setArticle(null);
          return;
        }

        // =================================================
        // VERIFYE STATUT
        // =================================================

        if (
          articleTrouve.statut &&
          articleTrouve.statut !== "publie"
        ) {
          setError(
            "Désolé, cette actualité n'est pas encore disponible."
          );

          setArticle(null);
          return;
        }

        // =================================================
        // ARTICLE OK
        // =================================================

        setArticle(articleTrouve);

      } catch (err) {
        console.error(
          "Erreur chargement article :",
          err
        );

        setError(
          "Impossible de charger cette actualité pour le moment."
        );

        setArticle(null);

      } finally {
        setLoading(false);
      }
    };

    chargerArticle();
  }, [id, slug]);

  // =====================================================
  // FONCTION PARTAGER
  // =====================================================

  const partagerArticle = async () => {
    if (!article) return;

    const url = window.location.href;

    const titre =
      article.titre ||
      "Mikwo Pèp La Web TV";

    const texte = `${titre}\n\n${url}`;

    try {
      // =================================================
      // PARTAGE NATIF
      // =================================================

      if (
        navigator.share &&
        typeof navigator.share === "function"
      ) {
        await navigator.share({
          title: titre,
          text: titre,
          url: url,
        });

        return;
      }

      // =================================================
      // SI PARTAGE NATIF PA DISPONIB
      // KOPYE LIEN AN
      // =================================================

      if (
        navigator.clipboard &&
        typeof navigator.clipboard.writeText ===
          "function"
      ) {
        await navigator.clipboard.writeText(
          texte
        );

        alert(
          "Lien de l'article copié. Vous pouvez maintenant le partager."
        );

        return;
      }

      // =================================================
      // DERNYE SOLISYON
      // =================================================

      window.prompt(
        "Copiez le lien de cet article :",
        url
      );

    } catch (err) {
      // Itilizatè a ka fèmen meni Share la.
      // Nou pa montre yon erè nan ka sa a.
      if (
        err?.name !==
        "AbortError"
      ) {
        console.error(
          "Erreur partage :",
          err
        );
      }
    }
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="article-detail-page">
        <div className="article-detail-container">
          <div className="article-loading">
            Chargement de l'actualité...
          </div>
        </div>
      </main>
    );
  }

  // =====================================================
  // ERREUR
  // =====================================================

  if (error || !article) {
    return (
      <main className="article-detail-page">
        <div className="article-detail-container">
          <div className="article-not-found">

            <div className="article-error-icon">
              📰
            </div>

            <h1>
              Article introuvable
            </h1>

            <p>
              {error ||
                "Désolé, cette actualité n'existe pas ou n'est plus disponible."}
            </p>

            <Link
              to="/actualites"
              className="article-back-button"
            >
              ← Retour aux actualités
            </Link>

          </div>
        </div>
      </main>
    );
  }

  // =====================================================
  // IMAGE
  // =====================================================

  const imageUrl = getImageUrl(
    article.image_url ||
      article.image
  );

  // =====================================================
  // DATE
  // =====================================================

  const dateArticle =
    article.created_at
      ? new Date(
          article.created_at
        ).toLocaleDateString(
          "fr-FR",
          {
            day: "2-digit",
            month: "long",
            year: "numeric",
          }
        )
      : "";

  // =====================================================
  // CONTENU
  // =====================================================

  const contenu =
    article.contenu || "";

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <main className="article-detail-page">

      <div className="article-detail-container">

        {/* RETOUR */}

        <Link
          to="/actualites"
          className="article-back-link"
        >
          ← Retour aux actualités
        </Link>

        {/* ARTICLE */}

        <article className="article-detail">

          {/* HEADER */}

          <header className="article-detail-header">

            <span className="article-detail-label">
              ACTUALITÉ
            </span>

            <h1 className="article-detail-title">
              {article.titre}
            </h1>

            <div className="article-detail-meta">

              {article.auteur && (
                <span>
                  Par {article.auteur}
                </span>
              )}

              {dateArticle && (
                <span>
                  {dateArticle}
                </span>
              )}

            </div>

          </header>

          {/* IMAGE */}

          {imageUrl && (
            <div className="article-detail-image-wrapper">

              <img
                src={imageUrl}
                alt={
                  article.titre ||
                  "Image de l'article"
                }
                className="article-detail-image"
                onError={(event) => {
                  event.currentTarget.style.display =
                    "none";
                }}
              />

            </div>
          )}

          {/* CONTENU */}

          <div className="article-detail-content">

            {contenu
              .split("\n")
              .map(
                (paragraph, index) => {

                  if (!paragraph.trim()) {
                    return null;
                  }

                  return (
                    <p key={index}>
                      {paragraph}
                    </p>
                  );
                }
              )}

          </div>

          {/* =================================================
              PARTAGER
          ================================================= */}

          <div className="article-share">

            <button
              type="button"
              className="article-share-button"
              onClick={partagerArticle}
              aria-label="Partager cet article"
            >
              <span
                className="article-share-icon"
                aria-hidden="true"
              >
                ↗️
              </span>

              <span>
                Partager
              </span>
            </button>

          </div>

        </article>

      </div>

    </main>
  );
}

export default ArticleDetail;
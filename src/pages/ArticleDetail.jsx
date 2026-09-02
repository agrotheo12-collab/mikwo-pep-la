import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import "./ArticleDetail.css";

const API_URL = import.meta.env.VITE_API_URL;

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
  /*
   * App.jsx itilize /actualites/:id.
   *
   * Nou rele li "id" isit la.
   *
   * Men nou kite slug tou pou konpatibilite
   * ak ansyen URL yo.
   */

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
          throw new Error(
            "Erreur serveur"
          );
        }

        const data =
          await response.json();

        /*
         * API a dwe retounen yon tableau.
         */

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
          articleTrouve =
            articles.find(
              (item) =>
                String(
                  item.id_article
                ) === String(id)
            );
        }

        // =================================================
        // 2. SI PA GEN ID, CHERCHE PAR SLUG
        // =================================================

        if (!articleTrouve && slug) {
          articleTrouve =
            articles.find(
              (item) =>
                item.slug &&
                String(
                  item.slug
                ).toLowerCase() ===
                  String(
                    slug
                  ).toLowerCase()
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
          articleTrouve.statut !==
            "publie"
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

        setArticle(
          articleTrouve
        );

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

  const imageUrl =
    getImageUrl(
      article.image ||
      article.image_url
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

            <h1>
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
                (
                  paragraph,
                  index
                ) => {

                  if (
                    !paragraph.trim()
                  ) {
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

        </article>

      </div>

    </main>
  );
}

export default ArticleDetail;
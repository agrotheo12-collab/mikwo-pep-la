import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "./Actualites.css";

const API_URL = import.meta.env.VITE_API_URL;

function Actualites() {
  const [actualites, setActualites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState("");
  const [categorieActive, setCategorieActive] = useState("Toutes");

  // =====================================================
  // URL IMAGE / VIDEO
  // =====================================================

  const getMediaUrl = (mediaUrl) => {
    if (!mediaUrl) return "";

    const url = String(mediaUrl).trim();

    if (!url) return "";

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
  };

  // Alias pour les images
  const getImageUrl = (imageUrl) => {
    return getMediaUrl(imageUrl);
  };

  // =====================================================
  // CHARGER LES DONNÉES
  // =====================================================

  useEffect(() => {
    const chargerActualites = async () => {
      try {
        setLoading(true);
        setErreur("");

        const [articlesResponse, photosResponse, videosResponse] =
          await Promise.all([
            fetch(`${API_URL}/api/articles`),
            fetch(`${API_URL}/api/photo-publications`),
            fetch(`${API_URL}/api/videos`),
          ]);

        if (!articlesResponse.ok) {
          throw new Error(
            "Impossible de charger les articles."
          );
        }

        if (!photosResponse.ok) {
          throw new Error(
            "Impossible de charger les publications photo."
          );
        }

        // =================================================
        // ARTICLES
        // =================================================

        const articlesData =
          await articlesResponse.json();

        const articles = Array.isArray(articlesData)
          ? articlesData
          : Array.isArray(articlesData.articles)
          ? articlesData.articles
          : [];

        // =================================================
        // PHOTOS
        // =================================================

        const photosData =
          await photosResponse.json();

        const publicationsPhotos = Array.isArray(
          photosData
        )
          ? photosData
          : Array.isArray(
              photosData.publications
            )
          ? photosData.publications
          : [];

        // =================================================
        // VIDÉOS
        // =================================================

        let videos = [];

        if (videosResponse.ok) {
          const videosData =
            await videosResponse.json();

          videos = Array.isArray(videosData)
            ? videosData
            : Array.isArray(
                videosData.videos
              )
            ? videosData.videos
            : [];
        }

        // =================================================
        // NORMALISER ARTICLES
        // =================================================

        const articlesNormalises = articles
          .filter(
            (article) =>
              article.statut === "publie"
          )
          .map((article) => ({
            type: "article",

            id: `article-${article.id_article}`,

            id_article:
              article.id_article,

            date:
              article.created_at,

            titre:
              article.titre ||
              "Sans titre",

            description:
              article.contenu ||
              "",

            image:
              article.image ||
              article.image_url ||
              "",

            categorie:
              article.categorie ||
              "Actualités",

            auteur:
              article.auteur ||
              "Mikwo Pèp La",

            slug:
              article.slug ||
              "",

            original:
              article,
          }));

        // =================================================
        // NORMALISER PHOTOS
        // =================================================

        const photosNormalisees =
          publicationsPhotos.map(
            (publication) => ({
              type: "photo",

              id:
                `photo-${publication.id_publication}`,

              id_publication:
                publication.id_publication,

              date:
                publication.created_at,

              titre:
                publication.titre ||
                "Reportage photo",

              description:
                publication.description ||
                "",

              categorie:
                publication.categorie ||
                "Actualités",

              auteur:
                publication.auteur ||
                "Mikwo Pèp La",

              photos:
                Array.isArray(
                  publication.photos
                )
                  ? publication.photos
                  : [],

              nombre_photos:
                publication.nombre_photos ||
                0,

              original:
                publication,
            })
          );

        // =================================================
        // NORMALISER VIDÉOS
        // =================================================

        const videosNormalisees =
          videos
            .filter(
              (video) =>
                video.statut === "publie"
            )
            .map((video) => ({
              type: "video",

              id:
                `video-${video.id_video}`,

              id_video:
                video.id_video,

              date:
                video.created_at,

              titre:
                video.titre ||
                "Vidéo",

              description:
                video.description ||
                "",

              video_url:
                video.video_url ||
                "",

              thumbnail:
                video.thumbnail ||
                video.image_url ||
                "",

              categorie:
                video.categorie ||
                "Actualités",

              auteur:
                video.auteur ||
                "Mikwo Pèp La",

              original:
                video,
            }));

        // =================================================
        // FUSION
        // =================================================

        const toutesLesActualites = [
          ...articlesNormalises,
          ...photosNormalisees,
          ...videosNormalisees,
        ];

        toutesLesActualites.sort(
          (a, b) =>
            new Date(b.date) -
            new Date(a.date)
        );

        setActualites(
          toutesLesActualites
        );
      } catch (error) {
        console.error(
          "Erreur Actualités :",
          error
        );

        setErreur(
          "Impossible de charger les actualités."
        );
      } finally {
        setLoading(false);
      }
    };

    chargerActualites();
  }, []);

  // =====================================================
  // CATEGORIES
  // =====================================================

  const categories = useMemo(() => {
    const liste = actualites
      .map(
        (item) =>
          item.categorie
      )
      .filter(Boolean);

    return [
      "Toutes",
      ...Array.from(
        new Set(liste)
      ),
    ];
  }, [actualites]);

  // =====================================================
  // FILTRE
  // =====================================================

  const actualitesFiltrees =
    useMemo(() => {
      if (
        categorieActive ===
        "Toutes"
      ) {
        return actualites;
      }

      return actualites.filter(
        (item) =>
          item.categorie ===
          categorieActive
      );
    }, [
      actualites,
      categorieActive,
    ]);

  // =====================================================
  // À LA UNE
  // =====================================================

  const aLaUne =
    actualitesFiltrees[0];

  const dernieresActualites =
    actualitesFiltrees.slice(1);

  // =====================================================
  // FORMAT DATE
  // =====================================================

  const formatDate = (date) => {
    if (!date) return "";

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "";
    }

    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(parsedDate);
  };

  // =====================================================
  // NETTOYER TEXTE
  // =====================================================

  const nettoyerTexte = (texte) => {
    if (!texte) return "";

    return String(texte)
      .replace(
        /<[^>]*>/g,
        ""
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim();
  };

  // =====================================================
  // DESCRIPTION COURTE
  // =====================================================

  const descriptionCourte = (
    texte,
    longueur = 180
  ) => {
    const propre =
      nettoyerTexte(texte);

    if (
      propre.length <=
      longueur
    ) {
      return propre;
    }

    return `${propre.substring(
      0,
      longueur
    )}...`;
  };

  // =====================================================
  // PREMIÈRE IMAGE PHOTO
  // =====================================================

  const getPhotoPrincipale = (
    publication
  ) => {
    if (
      !publication.photos ||
      publication.photos.length ===
        0
    ) {
      return "";
    }

    const premierePhoto =
      publication.photos[0];

    return getImageUrl(
      premierePhoto.image_url
    );
  };

  // =====================================================
  // IMAGE PRINCIPALE
  // =====================================================

  const getImagePrincipale = (
    item
  ) => {
    if (
      item.type ===
      "article"
    ) {
      return getImageUrl(
        item.image
      );
    }

    if (
      item.type ===
      "photo"
    ) {
      return getPhotoPrincipale(
        item
      );
    }

    if (
      item.type ===
      "video"
    ) {
      return getMediaUrl(
        item.thumbnail
      );
    }

    return "";
  };

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="actualites-page">

        <div className="actualites-loading">

          <div className="actualites-spinner"></div>

          <p>
            Chargement des actualités...
          </p>

        </div>

      </main>
    );
  }

  // =====================================================
  // ERREUR
  // =====================================================

  if (erreur) {
    return (
      <main className="actualites-page">

        <div className="actualites-error">

          <div className="error-icon">
            !
          </div>

          <h2>
            Une erreur est survenue
          </h2>

          <p>
            {erreur}
          </p>

          <button
            onClick={() =>
              window.location.reload()
            }
          >
            Réessayer
          </button>

        </div>

      </main>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <main className="actualites-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <section className="actualites-header">

        <div className="actualites-header-inner">

          <div className="actualites-header-content">

            <span className="actualites-overline">
              MIKWO PÈP LA
            </span>

            <h1>
              Actualités
            </h1>

            <p>
              Toute l'information,
              au cœur de l'actualité
              haïtienne.
            </p>

          </div>

          <div className="actualites-header-badge">

            <span className="badge-dot"></span>

            INFORMATION

          </div>

        </div>

      </section>

      {/* =================================================
          CATEGORIES
      ================================================= */}

      <nav className="categories-bar">

        <div className="categories-inner">

          {categories.map(
            (categorie) => (
              <button
                key={categorie}
                className={
                  categorieActive ===
                  categorie
                    ? "categorie-btn active"
                    : "categorie-btn"
                }
                onClick={() =>
                  setCategorieActive(
                    categorie
                  )
                }
              >
                {categorie}
              </button>
            )
          )}

        </div>

      </nav>

      {/* =================================================
          CONTENU
      ================================================= */}

      <div className="actualites-container">

        {actualitesFiltrees.length ===
        0 ? (

          <div className="actualites-empty">

            <div className="empty-icon">
              📰
            </div>

            <h2>
              Aucune actualité
            </h2>

            <p>
              Aucune publication
              disponible dans cette
              catégorie.
            </p>

          </div>

        ) : (

          <>

            {/* =========================================
                À LA UNE
            ========================================= */}

            {aLaUne && (

              <section className="une-section">

                <div className="section-title">

                  <span></span>

                  <h2>
                    À LA UNE
                  </h2>

                </div>

                <article className="une-card">

                  <div className="une-media">

                    {/* ARTICLE */}

                    {aLaUne.type ===
                      "article" &&
                      getImagePrincipale(
                        aLaUne
                      ) && (

                      <img
                        src={getImagePrincipale(
                          aLaUne
                        )}
                        alt={
                          aLaUne.titre
                        }
                      />

                    )}

                    {/* PHOTO */}

                    {aLaUne.type ===
                      "photo" &&
                      getImagePrincipale(
                        aLaUne
                      ) && (

                      <img
                        src={getImagePrincipale(
                          aLaUne
                        )}
                        alt={
                          aLaUne.titre
                        }
                      />

                    )}

                    {/* VIDEO */}

                    {aLaUne.type ===
                      "video" &&
                      getImagePrincipale(
                        aLaUne
                      ) && (

                      <div className="video-cover">

                        <img
                          src={getImagePrincipale(
                            aLaUne
                          )}
                          alt={
                            aLaUne.titre
                          }
                        />

                        <div className="video-play">

                          ▶️

                        </div>

                      </div>

                    )}

                    {/* PLACEHOLDER */}

                    {!getImagePrincipale(
                      aLaUne
                    ) && (

                      <div className="media-placeholder">

                        <span>
                          MIKWO PÈP LA
                        </span>

                      </div>

                    )}

                    <div className="une-label">
                      À LA UNE
                    </div>

                    {aLaUne.type ===
                      "photo" && (

                      <div className="media-type">

                        📷{" "}
                        {aLaUne.nombre_photos ||
                          aLaUne.photos
                            ?.length ||
                          0}{" "}
                        photos

                      </div>

                    )}

                    {aLaUne.type ===
                      "video" && (

                      <div className="media-type video-label">

                        🎥 VIDÉO

                      </div>

                    )}

                  </div>

                  <div className="une-info">

                    <div className="article-meta">

                      <span>
                        {
                          aLaUne.categorie
                        }
                      </span>

                      <time>
                        {formatDate(
                          aLaUne.date
                        )}
                      </time>

                    </div>

                    <h3>
                      {aLaUne.titre}
                    </h3>

                    {aLaUne.description && (

                      <p>
                        {descriptionCourte(
                          aLaUne.description,
                          260
                        )}
                      </p>

                    )}

                    <div className="une-bottom">

                      <span className="author">

                        Par{" "}

                        {
                          aLaUne.auteur
                        }

                      </span>

                      {/* ARTICLE */}

                      {aLaUne.type ===
                        "article" &&
                      aLaUne.id_article ? (

                        <Link
                          to={`/actualites/${aLaUne.id_article}`}
                          className="read-more"
                        >
                          Lire l'article
                          <span>
                            →
                          </span>
                        </Link>

                      ) : null}

                      {/* PHOTO */}

                      {aLaUne.type ===
                        "photo" && (

                        <Link
                          to="/photos"
                          className="read-more"
                        >
                          Voir le reportage
                          <span>
                            →
                          </span>
                        </Link>

                      )}

                      {/* VIDEO */}

                      {aLaUne.type ===
                        "video" && (

                        <Link
                          to="/videos"
                          className="read-more"
                        >
                          Voir la vidéo
                          <span>
                            →
                          </span>
                        </Link>

                      )}

                    </div>

                  </div>

                </article>

              </section>

            )}

            {/* =========================================
                DERNIÈRES ACTUALITÉS
            ========================================= */}

            {dernieresActualites.length >
              0 && (

              <section className="feed-section">

                <div className="section-title">

                  <span></span>

                  <h2>
                    DERNIÈRES ACTUALITÉS
                  </h2>

                </div>

                <div className="news-feed">

                  {dernieresActualites.map(
                    (actualite) => {

                      // =================================
                      // ARTICLE
                      // =================================

                      if (
                        actualite.type ===
                        "article"
                      ) {

                        return (

                          <article
                            className="news-item"
                            key={
                              actualite.id
                            }
                          >

                            <div className="news-image">

                              {getImagePrincipale(
                                actualite
                              ) ? (

                                <img
                                  src={getImagePrincipale(
                                    actualite
                                  )}
                                  alt={
                                    actualite.titre
                                  }
                                />

                              ) : (

                                <div className="media-placeholder small">

                                  MIKWO PÈP LA

                                </div>

                              )}

                            </div>

                            <div className="news-info">

                              <div className="article-meta">

                                <span>
                                  {
                                    actualite.categorie
                                  }
                                </span>

                                <time>
                                  {formatDate(
                                    actualite.date
                                  )}
                                </time>

                              </div>

                              <h3>
                                {
                                  actualite.titre
                                }
                              </h3>

                              {actualite.description && (

                                <p>
                                  {descriptionCourte(
                                    actualite.description,
                                    180
                                  )}
                                </p>

                              )}

                              <div className="news-footer">

                                <span>
                                  Par{" "}
                                  {
                                    actualite.auteur
                                  }
                                </span>

                                {actualite.id_article && (

                                  <Link
                                    to={`/actualites/${actualite.id_article}`}
                                  >
                                    Lire l'article →
                                  </Link>

                                )}

                              </div>

                            </div>

                          </article>

                        );

                      }

                      // =================================
                      // PUBLICATION PHOTO
                      // =================================

                      if (
                        actualite.type ===
                        "photo"
                      ) {

                        return (

                          <article
                            className="photo-publication"
                            key={
                              actualite.id
                            }
                          >

                            <div className="photo-publication-top">

                              <div className="photo-icon">
                                📷
                              </div>

                              <div>

                                <div className="article-meta">

                                  <span>
                                    {
                                      actualite.categorie
                                    }
                                  </span>

                                  <time>
                                    {formatDate(
                                      actualite.date
                                    )}
                                  </time>

                                </div>

                                <h3>
                                  {
                                    actualite.titre
                                  }
                                </h3>

                              </div>

                            </div>

                            {actualite.description && (

                              <p className="photo-description">
                                {
                                  actualite.description
                                }
                              </p>

                            )}

                            {actualite.photos &&
                              actualite.photos.length >
                                0 && (

                                <div
                                  className={`photo-grid photos-${Math.min(
                                    actualite.photos.length,
                                    4
                                  )}`}
                                >

                                  {actualite.photos
                                    .slice(
                                      0,
                                      4
                                    )
                                    .map(
                                      (
                                        photo,
                                        index
                                      ) => (

                                        <div
                                          className="photo-grid-item"
                                          key={
                                            photo.id_photo ||
                                            index
                                          }
                                        >

                                          <img
                                            src={getImageUrl(
                                              photo.image_url
                                            )}
                                            alt={
                                              photo.titre ||
                                              actualite.titre
                                            }
                                          />

                                          {index ===
                                            3 &&
                                            actualite
                                              .photos
                                              .length >
                                              4 && (

                                            <div className="more-photos">

                                              +
                                              {actualite
                                                .photos
                                                .length -
                                                4}

                                            </div>

                                          )}

                                        </div>

                                      )
                                    )}

                                </div>

                              )}

                            <div className="news-footer">

                              <span>
                                Par{" "}
                                {
                                  actualite.auteur
                                }
                              </span>

                              <Link to="/photos">

                                Voir toutes les
                                photos →

                              </Link>

                            </div>

                          </article>

                        );

                      }

                      // =================================
                      // VIDÉO
                      // =================================

                      if (
                        actualite.type ===
                        "video"
                      ) {

                        return (

                          <article
                            className="video-publication"
                            key={
                              actualite.id
                            }
                          >

                            <div className="video-publication-media">

                              {actualite.thumbnail ? (

                                <div className="video-cover">

                                  <img
                                    src={getMediaUrl(
                                      actualite.thumbnail
                                    )}
                                    alt={
                                      actualite.titre
                                    }
                                  />

                                  <div className="video-play">

                                    ▶️

                                  </div>

                                </div>

                              ) : actualite.video_url ? (

                                <video
                                  controls
                                  preload="metadata"
                                  src={getMediaUrl(
                                    actualite.video_url
                                  )}
                                />

                              ) : (

                                <div className="media-placeholder">

                                  <span>
                                    MIKWO PÈP LA
                                  </span>

                                </div>

                              )}

                            </div>

                            <div className="video-publication-info">

                              <div className="article-meta">

                                <span>
                                  {
                                    actualite.categorie
                                  }
                                </span>

                                <time>
                                  {formatDate(
                                    actualite.date
                                  )}
                                </time>

                              </div>

                              <h3>
                                {
                                  actualite.titre
                                }
                              </h3>

                              {actualite.description && (

                                <p>
                                  {descriptionCourte(
                                    actualite.description,
                                    180
                                  )}
                                </p>

                              )}

                              <div className="news-footer">

                                <span>
                                  Par{" "}
                                  {
                                    actualite.auteur
                                  }
                                </span>

                                <Link to="/videos">

                                  Voir la vidéo →

                                </Link>

                              </div>

                            </div>

                          </article>

                        );

                      }

                      return null;
                    }
                  )}

                </div>

              </section>

            )}

          </>

        )}

      </div>

    </main>
  );
}

export default Actualites;
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./Recherche.css";

// ======================================================
// NORMALISER TEXTE
// Retire aksan + miniskil + karaktè espesyal
// ======================================================

const normaliserTexte = (texte = "") => {
  return texte
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

// ======================================================
// DISTANCE LEVENSHTEIN
// Pèmèt nou tolere erè òtograf
// ======================================================

const distanceLevenshtein = (a, b) => {
  const longueurA = a.length;
  const longueurB = b.length;

  if (longueurA === 0) return longueurB;
  if (longueurB === 0) return longueurA;

  const matrice = Array.from(
    { length: longueurA + 1 },
    () => Array(longueurB + 1).fill(0)
  );

  for (let i = 0; i <= longueurA; i++) {
    matrice[i][0] = i;
  }

  for (let j = 0; j <= longueurB; j++) {
    matrice[0][j] = j;
  }

  for (let i = 1; i <= longueurA; i++) {
    for (let j = 1; j <= longueurB; j++) {
      const cout =
        a[i - 1] === b[j - 1] ? 0 : 1;

      matrice[i][j] = Math.min(
        matrice[i - 1][j] + 1,
        matrice[i][j - 1] + 1,
        matrice[i - 1][j - 1] + cout
      );
    }
  }

  return matrice[longueurA][longueurB];
};

// ======================================================
// CORRESPONDANCE RECHERCHE
// ======================================================

const correspondRecherche = (
  texte,
  recherche
) => {
  const texteNormalise =
    normaliserTexte(texte);

  const rechercheNormalisee =
    normaliserTexte(recherche);

  if (
    !texteNormalise ||
    !rechercheNormalisee
  ) {
    return false;
  }

  // Correspondance exacte
  if (
    texteNormalise.includes(
      rechercheNormalisee
    )
  ) {
    return true;
  }

  const motsRecherche =
    rechercheNormalisee.split(" ");

  const motsTexte =
    texteNormalise.split(" ");

  return motsRecherche.every(
    (motRecherche) => {
      if (motRecherche.length <= 2) {
        return motsTexte.some(
          (motTexte) =>
            motTexte === motRecherche
        );
      }

      return motsTexte.some(
        (motTexte) => {
          // Mot contenu dans l'autre
          if (
            motTexte.includes(motRecherche) ||
            motRecherche.includes(motTexte)
          ) {
            return true;
          }

          const distance =
            distanceLevenshtein(
              motRecherche,
              motTexte
            );

          // Tolérance selon longueur
          if (motRecherche.length <= 4) {
            return distance <= 1;
          }

          if (motRecherche.length <= 7) {
            return distance <= 2;
          }

          return distance <= 3;
        }
      );
    }
  );
};

// ======================================================
// EXTRAIRE URL IMAGE
// ======================================================

const getImageUrl = (imageUrl) => {
  if (!imageUrl) return "";

  if (
    imageUrl.startsWith("http://") ||
    imageUrl.startsWith("https://") ||
    imageUrl.startsWith("data:")
  ) {
    return imageUrl;
  }

  if (imageUrl.startsWith("/")) {
    return `${import.meta.env.VITE_API_URL}${imageUrl}`;
  }

  return `${import.meta.env.VITE_API_URL}/${imageUrl}`;
};

// ======================================================
// FORMAT DATE
// ======================================================

const formatDate = (date) => {
  if (!date) return "";

  try {
    return new Date(date).toLocaleDateString(
      "fr-FR",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );
  } catch {
    return "";
  }
};

// ======================================================
// COMPOSANT
// ======================================================

function Recherche() {
  const [recherche, setRecherche] =
    useState("");

  const [articles, setArticles] =
    useState([]);

  const [videos, setVideos] =
    useState([]);

  const [photos, setPhotos] =
    useState([]);

  const [resultats, setResultats] =
    useState({
      articles: [],
      videos: [],
      photos: [],
    });

  const [loading, setLoading] =
    useState(false);

  const [erreur, setErreur] =
    useState("");

  const [rechercheEffectuee, setRechercheEffectuee] =
    useState(false);

  // ====================================================
  // CHARGER LES DONNÉES
  // ====================================================

  useEffect(() => {
    const chargerDonnees = async () => {
      setLoading(true);
      setErreur("");

      try {
        const [
          articlesResponse,
          videosResponse,
          photosResponse,
        ] = await Promise.all([
          fetch("/api/articles"),
          fetch("/api/videos"),
          fetch("/api/photo-publications"),
        ]);

        if (
          !articlesResponse.ok ||
          !videosResponse.ok ||
          !photosResponse.ok
        ) {
          throw new Error(
            "Impossible de charger les données."
          );
        }

        const articlesData =
          await articlesResponse.json();

        const videosData =
          await videosResponse.json();

        const photosData =
          await photosResponse.json();

        setArticles(
          Array.isArray(articlesData)
            ? articlesData
            : []
        );

        setVideos(
          Array.isArray(videosData)
            ? videosData
            : []
        );

        setPhotos(
          Array.isArray(
            photosData?.publications
          )
            ? photosData.publications
            : []
        );
      } catch (error) {
        console.error(
          "Erreur recherche :",
          error
        );

        setErreur(
          "Impossible de charger les contenus."
        );
      } finally {
        setLoading(false);
      }
    };

    chargerDonnees();
  }, []);

  // ====================================================
  // EFFECTUER RECHERCHE
  // ====================================================

  const effectuerRecherche = () => {
    const terme =
      recherche.trim();

    if (!terme) {
      setResultats({
        articles: [],
        videos: [],
        photos: [],
      });

      setRechercheEffectuee(false);

      return;
    }

    // ----------------------------------------------
    // ARTICLES
    // ----------------------------------------------

    const articlesTrouves =
      articles.filter((article) => {
        return (
          correspondRecherche(
            article.titre,
            terme
          ) ||
          correspondRecherche(
            article.contenu,
            terme
          ) ||
          correspondRecherche(
            article.auteur,
            terme
          ) ||
          correspondRecherche(
            article.slug,
            terme
          )
        );
      });

    // ----------------------------------------------
    // VIDEOS
    // ----------------------------------------------

    const videosTrouvees =
      videos.filter((video) => {
        return (
          correspondRecherche(
            video.titre,
            terme
          ) ||
          correspondRecherche(
            video.description,
            terme
          ) ||
          correspondRecherche(
            video.auteur,
            terme
          )
        );
      });

    // ----------------------------------------------
    // PHOTOS
    // ----------------------------------------------

    const photosTrouvees =
      photos.filter((publication) => {
        return (
          correspondRecherche(
            publication.titre,
            terme
          ) ||
          correspondRecherche(
            publication.description,
            terme
          ) ||
          correspondRecherche(
            publication.auteur,
            terme
          )
        );
      });

    setResultats({
      articles: articlesTrouves,
      videos: videosTrouvees,
      photos: photosTrouvees,
    });

    setRechercheEffectuee(true);
  };

  // ====================================================
  // SUBMIT
  // ====================================================

  const handleSubmit = (e) => {
    e.preventDefault();

    effectuerRecherche();
  };

  // ====================================================
  // NOMBRE TOTAL
  // ====================================================

  const totalResultats =
    resultats.articles.length +
    resultats.videos.length +
    resultats.photos.length;

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <main className="recherche-page">

      <div className="container recherche-container">

        {/* ============================================
            HEADER
        ============================================ */}

        <div className="recherche-header">

          <span className="recherche-kicker">
            MIKWO PÈP LA
          </span>

          <h1>
            Recherche
          </h1>

          <p>
            Recherchez une actualité,
            une vidéo ou une publication
            sur Mikwo Pèp La.
          </p>

        </div>

        {/* ============================================
            FORMULAIRE
        ============================================ */}

        <form
          className="recherche-form"
          onSubmit={handleSubmit}
        >

          <input
            type="search"
            value={recherche}
            onChange={(e) =>
              setRecherche(
                e.target.value
              )
            }
            placeholder="Que recherchez-vous ?"
            aria-label="Rechercher"
          />

          <button
            type="submit"
            disabled={loading}
          >
            🔎 Rechercher
          </button>

        </form>

        {/* ============================================
            LIENS RAPIDES
        ============================================ */}

        <div className="recherche-links">

          <Link to="/actualites">
            Voir les actualités
          </Link>

          <Link to="/photos">
            Voir les photos
          </Link>

          <Link to="/videos">
            Voir les vidéos
          </Link>

        </div>

        {/* ============================================
            LOADING
        ============================================ */}

        {loading && (
          <div className="recherche-loading">

            <div className="recherche-spinner"></div>

            <p>
              Chargement des contenus...
            </p>

          </div>
        )}

        {/* ============================================
            ERREUR
        ============================================ */}

        {!loading && erreur && (
          <div className="recherche-error">

            <div className="recherche-error-icon">
              !
            </div>

            <h2>
              Une erreur est survenue
            </h2>

            <p>
              {erreur}
            </p>

          </div>
        )}

        {/* ============================================
            RÉSULTATS
        ============================================ */}

        {!loading &&
          !erreur &&
          rechercheEffectuee && (
            <section className="recherche-results">

              <div className="recherche-results-header">

                <h2>
                  Résultats de recherche
                </h2>

                <span>
                  {totalResultats} résultat
                  {totalResultats !== 1
                    ? "s"
                    : ""}
                </span>

              </div>

              {/* ======================================
                  AUCUN RÉSULTAT
              ====================================== */}

              {totalResultats === 0 && (
                <div className="recherche-empty">

                  <div className="recherche-empty-icon">
                    🔎
                  </div>

                  <h3>
                    Aucun résultat
                  </h3>

                  <p>
                    Aucun contenu ne correspond
                    à « {recherche} ».
                  </p>

                  <small>
                    Essayez avec un autre mot
                    ou vérifiez l'orthographe.
                  </small>

                </div>
              )}

              {/* ======================================
                  ARTICLES
              ====================================== */}

              {resultats.articles.length > 0 && (
                <section className="recherche-section">

                  <div className="recherche-section-title">

                    <h3>
                      📰 Actualités
                    </h3>

                    <span>
                      {resultats.articles.length}
                    </span>

                  </div>

                  <div className="recherche-grid">

                    {resultats.articles.map(
                      (article) => (
                        <article
                          className="recherche-card"
                          key={
                            article.id_article
                          }
                        >

                          {article.image && (
                            <img
                              src={getImageUrl(
                                article.image
                              )}
                              alt={
                                article.titre
                              }
                              className="recherche-card-image"
                            />
                          )}

                          <div className="recherche-card-content">

                            <span className="recherche-card-type">
                              ACTUALITÉ
                            </span>

                            <h4>
                              {article.titre}
                            </h4>

                            {article.contenu && (
                              <p>
                                {article.contenu
                                  .replace(
                                    /<[^>]*>/g,
                                    ""
                                  )
                                  .slice(
                                    0,
                                    140
                                  )}
                                {article.contenu
                                  .length > 140
                                  ? "..."
                                  : ""}
                              </p>
                            )}

                            <div className="recherche-card-meta">

                              <span>
                                {article.auteur ||
                                  "Mikwo Pèp La"}
                              </span>

                              <span>
                                {formatDate(
                                  article.created_at
                                )}
                              </span>

                            </div>

                            <Link
                              to={`/actualites/${article.slug || article.id_article}`}
                              className="recherche-card-link"
                            >
                              Lire l'article →
                            </Link>

                          </div>

                        </article>
                      )
                    )}

                  </div>

                </section>
              )}

              {/* ======================================
                  VIDEOS
              ====================================== */}

              {resultats.videos.length > 0 && (
                <section className="recherche-section">

                  <div className="recherche-section-title">

                    <h3>
                      🎥 Vidéos
                    </h3>

                    <span>
                      {resultats.videos.length}
                    </span>

                  </div>

                  <div className="recherche-grid">

                    {resultats.videos.map(
                      (video) => (
                        <article
                          className="recherche-card"
                          key={
                            video.id_video
                          }
                        >

                          {video.thumbnail && (
                            <img
                              src={getImageUrl(
                                video.thumbnail
                              )}
                              alt={
                                video.titre
                              }
                              className="recherche-card-image"
                            />
                          )}

                          <div className="recherche-card-content">

                            <span className="recherche-card-type">
                              VIDÉO
                            </span>

                            <h4>
                              {video.titre}
                            </h4>

                            {video.description && (
                              <p>
                                {video.description.slice(
                                  0,
                                  140
                                )}
                                {video.description
                                  .length > 140
                                  ? "..."
                                  : ""}
                              </p>
                            )}

                            <div className="recherche-card-meta">

                              <span>
                                {video.auteur ||
                                  "Mikwo Pèp La"}
                              </span>

                              <span>
                                {formatDate(
                                  video.created_at
                                )}
                              </span>

                            </div>

                            <Link
                              to="/videos"
                              className="recherche-card-link"
                            >
                              Voir la vidéo →
                            </Link>

                          </div>

                        </article>
                      )
                    )}

                  </div>

                </section>
              )}

              {/* ======================================
                  PHOTOS
              ====================================== */}

              {resultats.photos.length > 0 && (
                <section className="recherche-section">

                  <div className="recherche-section-title">

                    <h3>
                      📷 Photos
                    </h3>

                    <span>
                      {resultats.photos.length}
                    </span>

                  </div>

                  <div className="recherche-grid">

                    {resultats.photos.map(
                      (publication) => {

                        const premierePhoto =
                          publication.photos?.[0];

                        return (
                          <article
                            className="recherche-card"
                            key={
                              publication.id_publication
                            }
                          >

                            {premierePhoto?.image_url && (
                              <img
                                src={getImageUrl(
                                  premierePhoto.image_url
                                )}
                                alt={
                                  publication.titre
                                }
                                className="recherche-card-image"
                              />
                            )}

                            <div className="recherche-card-content">

                              <span className="recherche-card-type">
                                PHOTO
                              </span>

                              <h4>
                                {publication.titre}
                              </h4>

                              {publication.description && (
                                <p>
                                  {publication.description.slice(
                                    0,
                                    140
                                  )}
                                  {publication
                                    .description
                                    .length > 140
                                    ? "..."
                                    : ""}
                                </p>
                              )}

                              <div className="recherche-card-meta">

                                <span>
                                  {publication.auteur ||
                                    "Mikwo Pèp La"}
                                </span>

                                <span>
                                  {formatDate(
                                    publication.created_at
                                  )}
                                </span>

                              </div>

                              <Link
                                to="/photos"
                                className="recherche-card-link"
                              >
                                Voir la publication →
                              </Link>

                            </div>

                          </article>
                        );
                      }
                    )}

                  </div>

                </section>
              )}

            </section>
          )}

      </div>

    </main>
  );
}

export default Recherche;
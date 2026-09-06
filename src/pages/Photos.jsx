import {
  useEffect,
  useState,
} from "react";

import {
  Link,
  useParams,
} from "react-router-dom";

import "./Photos.css";

const API_URL = import.meta.env.VITE_API_URL;

// ======================================================
// PHOTOS
// ======================================================

function Photos() {
  const { id } = useParams();

  const publicationId = id
    ? String(id)
    : null;

  // ======================================================
  // STATE
  // ======================================================

  const [publications, setPublications] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  // ======================================================
  // VIEWER
  // ======================================================

  const [viewerOpen, setViewerOpen] =
    useState(false);

  const [viewerPhotos, setViewerPhotos] =
    useState([]);

  const [viewerIndex, setViewerIndex] =
    useState(0);

  // ======================================================
  // IMAGE URL
  // ======================================================

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) {
      return "";
    }

    const url = String(
      imageUrl
    ).trim();

    if (!url) {
      return "";
    }

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

  // ======================================================
// CHARGER PUBLICATIONS
// ======================================================

const chargerPublications = async () => {
  try {
    setLoading(true);
    setError("");

    const response = await fetch(
      `${API_URL}/api/photos`
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          `Erreur serveur : ${response.status}`
      );
    }

    if (data.success === false) {
      throw new Error(
        data.message ||
          "Impossible de charger les photos."
      );
    }

    const photos = Array.isArray(data)
      ? data
      : Array.isArray(data.photos)
      ? data.photos
      : [];

    // ==================================================
    // GROUPEMENT DES PHOTOS
    // ==================================================

    const groupes = new Map();

    photos.forEach((photo) => {
      const key = [
        photo.titre || "",
        photo.description || "",
        photo.statut || "",
        photo.created_at
          ? new Date(
              photo.created_at
            ).getTime()
          : "",
      ].join("|");

      if (!groupes.has(key)) {
        groupes.set(key, {
          id_publication:
            photo.id_photo,

          titre:
            photo.titre || "",

          description:
            photo.description || "",

          statut:
            photo.statut || "publie",

          created_at:
            photo.created_at,

          auteur:
            photo.auteur ||
            "Mikwo Pèp La",

          photos: [],
        });
      }

      groupes
        .get(key)
        .photos.push({
          id_photo:
            photo.id_photo,

          titre:
            photo.titre || "",

          description:
            photo.description || "",

          image_url:
            photo.image_url,

          statut:
            photo.statut,

          created_at:
            photo.created_at,
        });
    });

    const publicationsData =
      Array.from(groupes.values());

    publicationsData.sort(
      (a, b) =>
        new Date(b.created_at) -
        new Date(a.created_at)
    );

    setPublications(
      publicationsData
    );

  } catch (err) {
    console.error(
      "Erreur chargement publications :",
      err
    );

    setError(
      err.message ||
        "Une erreur est survenue lors du chargement des photos."
    );

  } finally {
    setLoading(false);
  }
};

  // ======================================================
  // PUBLICATION DEMANDÉE
  // ======================================================

  const publicationSelectionnee =
    publicationId
      ? publications.find(
          (publication) =>
            String(
              publication.id_publication ??
                publication.id_photo_publication ??
                publication.id_photo ??
                publication.id ??
                ""
            ) === publicationId
        )
      : null;

  // ======================================================
  // DATE
  // ======================================================

  const formatDate = (
    date
  ) => {
    if (!date) {
      return "";
    }

    const parsedDate =
      new Date(date);

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return "";
    }

    return parsedDate.toLocaleDateString(
      "fr-FR",
      {
        day: "numeric",
        month: "long",
        year: "numeric",
      }
    );
  };

  // ======================================================
  // VIEWER
  // ======================================================

  const ouvrirViewer = (
    photos,
    index = 0
  ) => {
    if (
      !Array.isArray(photos) ||
      photos.length === 0
    ) {
      return;
    }

    setViewerPhotos(photos);
    setViewerIndex(index);
    setViewerOpen(true);

    document.body.style.overflow =
      "hidden";
  };

  const fermerViewer = () => {
    setViewerOpen(false);
    setViewerPhotos([]);
    setViewerIndex(0);

    document.body.style.overflow =
      "";
  };

  const photoSuivante = () => {
    if (
      viewerPhotos.length <= 1
    ) {
      return;
    }

    setViewerIndex(
      (index) =>
        index >=
        viewerPhotos.length - 1
          ? 0
          : index + 1
    );
  };

  const photoPrecedente = () => {
    if (
      viewerPhotos.length <= 1
    ) {
      return;
    }

    setViewerIndex(
      (index) =>
        index <= 0
          ? viewerPhotos.length - 1
          : index - 1
    );
  };

  // ======================================================
  // CLAVIER
  // ======================================================

  useEffect(() => {
    const handleKeyDown = (
      event
    ) => {
      if (!viewerOpen) {
        return;
      }

      if (
        event.key === "Escape"
      ) {
        fermerViewer();
      }

      if (
        event.key === "ArrowRight"
      ) {
        photoSuivante();
      }

      if (
        event.key === "ArrowLeft"
      ) {
        photoPrecedente();
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    viewerOpen,
    viewerPhotos.length,
  ]);

  // ======================================================
  // NETTOYAGE
  // ======================================================

  useEffect(() => {
    return () => {
      document.body.style.overflow =
        "";
    };
  }, []);

  // ======================================================
  // PARTAGER
  // ======================================================

  const partagerPublication =
    async (
      publication
    ) => {
      const titre =
        publication.titre ||
        "Photos - Mikwo Pèp La";

      const description =
        publication.description ||
        "Découvrez cette publication photo sur Mikwo Pèp La.";

      const url =
        window.location.href;

      try {
        if (
          navigator.share
        ) {
          await navigator.share({
            title: titre,
            text: description,
            url,
          });

          return;
        }

        if (
          navigator.clipboard &&
          navigator.clipboard.writeText
        ) {
          await navigator.clipboard.writeText(
            url
          );

          alert(
            "Lien copié ! Vous pouvez maintenant le partager."
          );

          return;
        }

        alert(
          `Partagez cette page : ${url}`
        );

      } catch (err) {
        if (
          err?.name ===
          "AbortError"
        ) {
          return;
        }

        console.error(
          "Erreur partage :",
          err
        );
      }
    };

  // ======================================================
  // GRID PHOTO
  // ======================================================

  const renderPhotoGrid = (
    publication
  ) => {
    const photos =
      Array.isArray(
        publication.photos
      )
        ? publication.photos
        : [];

    if (
      photos.length === 0
    ) {
      return (
        <div className="photo-missing">
          Aucune image disponible.
        </div>
      );
    }

    const visibles =
      photos.slice(0, 5);

    const reste =
      photos.length > 5
        ? photos.length - 5
        : 0;

    return (
      <div
        className={`facebook-photo-grid photos-${Math.min(
          photos.length,
          5
        )}`}
      >
        {visibles.map(
          (
            photo,
            index
          ) => {
            const imageUrl =
              getImageUrl(
                photo.image_url
              );

            const afficherPlus =
              index === 4 &&
              reste > 0;

            return (
              <button
                key={
                  photo.id_photo ??
                  `${publication.id_publication}-${index}`
                }
                type="button"
                className={`facebook-photo-item photo-item-${
                  index + 1
                }`}
                onClick={() =>
                  ouvrirViewer(
                    photos,
                    index
                  )
                }
                aria-label={`Voir la photo ${
                  index + 1
                }`}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={
                      photo.titre ||
                      `Photo ${
                        index + 1
                      }`
                    }
                    loading="lazy"
                    decoding="async"
                    onError={(
                      event
                    ) => {
                      console.error(
                        "Image introuvable :",
                        imageUrl
                      );

                      event.currentTarget.alt =
                        "Image indisponible";
                    }}
                  />
                ) : (
                  <div className="photo-missing">
                    Image indisponible
                  </div>
                )}

                {afficherPlus && (
                  <span className="facebook-more-overlay">
                    +{reste}
                  </span>
                )}
              </button>
            );
          }
        )}
      </div>
    );
  };

  // ======================================================
  // LOADING
  // ======================================================

  if (loading) {
    return (
      <main className="photos-page">
        <div className="photos-container">

          <div className="photos-loading">

            <div className="photos-spinner"></div>

            <p>
              Chargement des photos...
            </p>

          </div>

        </div>
      </main>
    );
  }

  // ======================================================
  // ERROR
  // ======================================================

  if (error) {
    return (
      <main className="photos-page">
        <div className="photos-container">

          <div className="photos-error">

            <div className="photos-error-icon">
              !
            </div>

            <h2>
              Impossible de charger les photos
            </h2>

            <p>
              {error}
            </p>

            <button
              type="button"
              onClick={
                chargerPublications
              }
            >
              Réessayer
            </button>

          </div>

        </div>
      </main>
    );
  }

  // ======================================================
  // PUBLICATION NON TROUVÉE
  // ======================================================

  if (
    publicationId &&
    !publicationSelectionnee
  ) {
    return (
      <main className="photos-page">
        <div className="photos-container">

          <div className="photos-error">

            <div className="photos-error-icon">
              404
            </div>

            <h2>
              Publication introuvable
            </h2>

            <p>
              Cette publication photo
              n'existe pas ou n'est plus
              disponible.
            </p>

            <Link
              to="/photos"
              className="photos-home-button"
            >
              ← Retour aux photos
            </Link>

          </div>

        </div>
      </main>
    );
  }

  // ======================================================
  // MODE PUBLICATION UNIQUE
  // ======================================================

  if (
    publicationId &&
    publicationSelectionnee
  ) {
    const publication =
      publicationSelectionnee;

    const photos =
      Array.isArray(
        publication.photos
      )
        ? publication.photos
        : [];

    return (
      <main className="photos-page">

        <div className="photos-container">

          {/* ==================================================
              HEADER
          ================================================== */}

          <header className="photos-header">

            <div>

              <span className="photos-header-label">
                MIKWO PÈP LA
              </span>

              <h1>
                Publication photo
              </h1>

              <p>
                {formatDate(
                  publication.created_at
                )}
              </p>

            </div>

            <Link
              to="/photos"
              className="photos-home-button"
            >
              ← Toutes les photos
            </Link>

          </header>

          {/* ==================================================
              PUBLICATION
          ================================================== */}

          <article className="facebook-photo-post">

            <div className="facebook-post-header">

              <div className="facebook-avatar">
                M
              </div>

              <div className="facebook-author-info">

                <strong>
                  {publication.auteur ||
                    "Mikwo Pèp La"}
                </strong>

                <div className="facebook-post-meta">

                  <span>
                    {formatDate(
                      publication.created_at
                    )}
                  </span>

                  <span>
                    ·
                  </span>

                  <span>
                    Actualités
                  </span>

                  <span>
                    ·
                  </span>

                  <span>
                    🌐
                  </span>

                </div>

              </div>

            </div>

            {(publication.titre ||
              publication.description) && (

              <div className="facebook-post-content">

                {publication.titre && (
                  <h2>
                    {publication.titre}
                  </h2>
                )}

                {publication.description && (
                  <p>
                    {
                      publication.description
                    }
                  </p>
                )}

              </div>

            )}

            {renderPhotoGrid(
              publication
            )}

            <div className="facebook-photo-info">

              <span className="photo-count">
                📷 {photos.length}{" "}
                {photos.length === 1
                  ? "photo"
                  : "photos"}
              </span>

              {photos.length > 0 && (
                <button
                  type="button"
                  className="view-all-button"
                  onClick={() =>
                    ouvrirViewer(
                      photos,
                      0
                    )
                  }
                >
                  Voir les photos
                </button>
              )}

            </div>

            <div className="facebook-post-actions">

              <button
                type="button"
                disabled={
                  photos.length === 0
                }
                onClick={() =>
                  ouvrirViewer(
                    photos,
                    0
                  )
                }
              >
                <span className="action-icon">
                  🖼️
                </span>

                <span>
                  Voir les photos
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  partagerPublication(
                    publication
                  )
                }
              >
                <span className="action-icon">
                  ↗️
                </span>

                <span>
                  Partager
                </span>
              </button>

            </div>

          </article>

        </div>

        {/* ==================================================
            VIEWER
        ================================================== */}

        {viewerOpen &&
          viewerPhotos.length > 0 && (

          <div
            className="facebook-photo-viewer"
            role="dialog"
            aria-modal="true"
          >

            <button
              type="button"
              className="facebook-viewer-close"
              onClick={
                fermerViewer
              }
              aria-label="Fermer"
            >
              ×
            </button>

            <div className="facebook-viewer-counter">
              {viewerIndex + 1} /{" "}
              {viewerPhotos.length}
            </div>

            {viewerPhotos.length >
              1 && (
              <button
                type="button"
                className="facebook-viewer-arrow facebook-viewer-prev"
                onClick={
                  photoPrecedente
                }
                aria-label="Photo précédente"
              >
                ‹
              </button>
            )}

            <div
              className="facebook-viewer-image-container"
              onClick={(
                event
              ) => {
                if (
                  event.target ===
                  event.currentTarget
                ) {
                  fermerViewer();
                }
              }}
            >
              <img
                src={getImageUrl(
                  viewerPhotos[
                    viewerIndex
                  ]?.image_url
                )}
                alt={
                  viewerPhotos[
                    viewerIndex
                  ]?.titre ||
                  "Photo Mikwo Pèp La"
                }
                className="facebook-viewer-image"
              />
            </div>

            {viewerPhotos.length >
              1 && (
              <button
                type="button"
                className="facebook-viewer-arrow facebook-viewer-next"
                onClick={
                  photoSuivante
                }
                aria-label="Photo suivante"
              >
                ›
              </button>
            )}

          </div>
        )}

      </main>
    );
  }

  // ======================================================
  // MODE TOUTES LES PUBLICATIONS
  // ======================================================

  return (
    <main className="photos-page">

      <div className="photos-container">

        {/* ==================================================
            HEADER
        ================================================== */}

        <header className="photos-header">

          <div>

            <span className="photos-header-label">
              MIKWO PÈP LA
            </span>

            <h1>
              Photos
            </h1>

            <p>
              Retrouvez en images toute
              l'actualité de Mikwo Pèp La.
            </p>

          </div>

          <Link
            to="/"
            className="photos-home-button"
          >
            ← Accueil
          </Link>

        </header>

        {/* ==================================================
            AUCUNE PUBLICATION
        ================================================== */}

        {publications.length ===
        0 ? (

          <div className="photos-empty">

            <div className="photos-empty-icon">
              📷
            </div>

            <h2>
              Aucune photo pour le moment
            </h2>

            <p>
              Les nouvelles publications
              photo apparaîtront ici.
            </p>

          </div>

        ) : (

          <section className="facebook-feed">

            {publications.map(
              (
                publication,
                index
              ) => {

                const photos =
                  Array.isArray(
                    publication.photos
                  )
                    ? publication.photos
                    : [];

                return (
                  <article
                    className="facebook-photo-post"
                    key={
                      publication.id_publication ??
                      `publication-${index}`
                    }
                  >

                    <div className="facebook-post-header">

                      <div className="facebook-avatar">
                        M
                      </div>

                      <div className="facebook-author-info">

                        <strong>
                          {publication.auteur ||
                            "Mikwo Pèp La"}
                        </strong>

                        <div className="facebook-post-meta">

                          <span>
                            {formatDate(
                              publication.created_at
                            )}
                          </span>

                          <span>
                            ·
                          </span>

                          <span>
                            Actualités
                          </span>

                          <span>
                            ·
                          </span>

                          <span>
                            🌐
                          </span>

                        </div>

                      </div>

                      <div className="facebook-post-menu">
                        ⋯
                      </div>

                    </div>

                    {(publication.titre ||
                      publication.description) && (

                      <div className="facebook-post-content">

                        {publication.titre && (
                          <h2>
                            {publication.titre}
                          </h2>
                        )}

                        {publication.description && (
                          <p>
                            {
                              publication.description
                            }
                          </p>
                        )}

                      </div>

                    )}

                    {renderPhotoGrid(
                      publication
                    )}

                    <div className="facebook-photo-info">

                      <span className="photo-count">

                        📷{" "}

                        {photos.length}{" "}

                        {photos.length ===
                        1
                          ? "photo"
                          : "photos"}

                      </span>

                      {photos.length >
                        0 && (
                        <button
                          type="button"
                          className="view-all-button"
                          onClick={() =>
                            ouvrirViewer(
                              photos,
                              0
                            )
                          }
                        >
                          Voir les photos
                        </button>
                      )}

                    </div>

                    <div className="facebook-post-actions">

                      <button
                        type="button"
                        disabled={
                          photos.length ===
                          0
                        }
                        onClick={() =>
                          ouvrirViewer(
                            photos,
                            0
                          )
                        }
                      >

                        <span className="action-icon">
                          🖼️
                        </span>

                        <span>
                          Voir les photos
                        </span>

                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          partagerPublication(
                            publication
                          )
                        }
                      >

                        <span className="action-icon">
                          ↗️
                        </span>

                        <span>
                          Partager
                        </span>

                      </button>

                    </div>

                  </article>
                );
              }
            )}

          </section>
        )}

      </div>

      {/* ==================================================
          FULLSCREEN VIEWER
      ================================================== */}

      {viewerOpen &&
        viewerPhotos.length > 0 && (

          <div
            className="facebook-photo-viewer"
            role="dialog"
            aria-modal="true"
          >

            <button
              type="button"
              className="facebook-viewer-close"
              onClick={
                fermerViewer
              }
              aria-label="Fermer"
            >
              ×
            </button>

            <div className="facebook-viewer-counter">
              {viewerIndex + 1} /{" "}
              {viewerPhotos.length}
            </div>

            {viewerPhotos.length >
              1 && (
              <button
                type="button"
                className="facebook-viewer-arrow facebook-viewer-prev"
                onClick={
                  photoPrecedente
                }
                aria-label="Photo précédente"
              >
                ‹
              </button>
            )}

            <div
              className="facebook-viewer-image-container"
              onClick={(
                event
              ) => {
                if (
                  event.target ===
                  event.currentTarget
                ) {
                  fermerViewer();
                }
              }}
            >

              <img
                src={getImageUrl(
                  viewerPhotos[
                    viewerIndex
                  ]?.image_url
                )}
                alt={
                  viewerPhotos[
                    viewerIndex
                  ]?.titre ||
                  "Photo Mikwo Pèp La"
                }
                className="facebook-viewer-image"
              />

            </div>

            {viewerPhotos.length >
              1 && (
              <button
                type="button"
                className="facebook-viewer-arrow facebook-viewer-next"
                onClick={
                  photoSuivante
                }
                aria-label="Photo suivante"
              >
                ›
              </button>
            )}

          </div>
        )}

    </main>
  );
}

export default Photos;
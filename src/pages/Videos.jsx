import { useEffect, useMemo, useRef, useState } from "react";
import "./Videos.css";

const API_URL = "http://localhost:3000";

function Videos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [videoActive, setVideoActive] = useState(null);

  const playerRef = useRef(null);

  // =====================================================
  // CHARGER LES VIDÉOS
  // =====================================================

  useEffect(() => {
    const chargerVideos = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/videos`
        );

        if (!response.ok) {
          throw new Error(
            "Impossible de charger les vidéos."
          );
        }

        const data = await response.json();

        const listeVideos = Array.isArray(data)
          ? data
          : Array.isArray(data.videos)
          ? data.videos
          : [];

        const videosPubliees = listeVideos.filter(
          (video) =>
            !video.statut ||
            video.statut === "publie"
        );

        setVideos(videosPubliees);

        if (videosPubliees.length > 0) {
          setVideoActive(videosPubliees[0]);
        }
      } catch (err) {
        console.error(
          "Erreur vidéos :",
          err
        );

        setError(
          "Impossible de charger les vidéos."
        );
      } finally {
        setLoading(false);
      }
    };

    chargerVideos();
  }, []);

  // =====================================================
  // URL VIDÉO
  // =====================================================

  const getVideoUrl = (videoUrl) => {
    if (!videoUrl) {
      return "";
    }

    const url = String(videoUrl).trim();

    if (!url) {
      return "";
    }

    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("blob:") ||
      url.startsWith("data:")
    ) {
      return url;
    }

    if (url.startsWith("/")) {
      return `${API_URL}${url}`;
    }

    return `${API_URL}/${url}`;
  };

  // =====================================================
  // URL MINIATURE
  // =====================================================

  const getThumbnailUrl = (thumbnail) => {
    if (!thumbnail) {
      return "";
    }

    const url = String(thumbnail).trim();

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

  // =====================================================
  // TYPE VIDÉO
  // =====================================================

  const getVideoType = (videoUrl) => {
    if (!videoUrl) {
      return "video/mp4";
    }

    const extension = String(videoUrl)
      .split("?")[0]
      .split("#")[0]
      .split(".")
      .pop()
      .toLowerCase();

    const types = {
      mp4: "video/mp4",
      webm: "video/webm",
      mov: "video/quicktime",
      m4v: "video/x-m4v",
      avi: "video/x-msvideo",
      mpeg: "video/mpeg",
      mpg: "video/mpeg",
      ogg: "video/ogg",
      ogv: "video/ogg",
    };

    return types[extension] || "video/mp4";
  };

  // =====================================================
  // DATE
  // =====================================================

  const formatDate = (date) => {
    if (!date) {
      return "";
    }

    const parsedDate = new Date(date);

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
  // NETTOYER DESCRIPTION
  // =====================================================

  const nettoyerTexte = (texte) => {
    if (!texte) {
      return "";
    }

    return String(texte)
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  // =====================================================
  // DESCRIPTION COURTE
  // =====================================================

  const descriptionCourte = (
    texte,
    longueur = 220
  ) => {
    const textePropre =
      nettoyerTexte(texte);

    if (
      textePropre.length <= longueur
    ) {
      return textePropre;
    }

    return `${textePropre.substring(
      0,
      longueur
    )}...`;
  };

  // =====================================================
  // SÉLECTIONNER UNE VIDÉO
  // =====================================================

  const selectionnerVideo = (video) => {
    setVideoActive(video);

    // On remonte vers le lecteur
    setTimeout(() => {
      if (playerRef.current) {
        playerRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }, 100);
  };

  // =====================================================
  // LIRE UNE VIDÉO
  // =====================================================

  const regarderVideo = (event, video) => {
    // Empêche le clic de remonter au <article>
    event.stopPropagation();

    setVideoActive(video);

    // Attendre que React affiche le nouveau player
    setTimeout(() => {
      if (playerRef.current) {
        playerRef.current.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });

        const videoElement =
          playerRef.current.querySelector(
            "video"
          );

        if (videoElement) {
          videoElement.play().catch((err) => {
            console.warn(
              "Lecture automatique bloquée par le navigateur :",
              err
            );
          });
        }
      }
    }, 300);
  };

  // =====================================================
  // AUTRES VIDÉOS
  // =====================================================

  const autresVideos = useMemo(() => {
    if (!videoActive) {
      return videos;
    }

    return videos.filter(
      (video) =>
        video.id_video !==
        videoActive.id_video
    );
  }, [videos, videoActive]);

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="videos-page">

        <section className="videos-loading">

          <div className="videos-spinner"></div>

          <p>
            Chargement des vidéos...
          </p>

        </section>

      </main>
    );
  }

  // =====================================================
  // ERREUR
  // =====================================================

  if (error) {
    return (
      <main className="videos-page">

        <section className="videos-error">

          <div className="videos-error-icon">
            !
          </div>

          <h1>
            Une erreur est survenue
          </h1>

          <p>
            {error}
          </p>

          <button
            onClick={() =>
              window.location.reload()
            }
          >
            Réessayer
          </button>

        </section>

      </main>
    );
  }

  // =====================================================
  // AUCUNE VIDÉO
  // =====================================================

  if (videos.length === 0) {
    return (
      <main className="videos-page">

        <section className="videos-header">

          <div className="videos-container">

            <span className="videos-overline">
              MIKWO PÈP LA
            </span>

            <h1>
              Vidéos
            </h1>

            <p>
              Retrouvez toutes les vidéos
              de Mikwo Pèp La.
            </p>

          </div>

        </section>

        <section className="videos-empty">

          <div className="videos-empty-icon">
            ▶️
          </div>

          <h2>
            Aucune vidéo disponible
          </h2>

          <p>
            Les nouvelles vidéos
            apparaîtront ici.
          </p>

        </section>

      </main>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <main className="videos-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <section className="videos-header">

        <div className="videos-container">

          <div>

            <span className="videos-overline">
              MIKWO PÈP LA
            </span>

            <h1>
              Vidéos
            </h1>

            <p>
              Retrouvez toutes les vidéos
              de Mikwo Pèp La.
            </p>

          </div>

          <div className="videos-header-badge">

            <span className="live-dot"></span>

            MIKWO PÈP LA TV

          </div>

        </div>

      </section>

      {/* =================================================
          VIDÉO À LA UNE
      ================================================= */}

      {videoActive && (
        <section
          className="video-featured-section"
          ref={playerRef}
        >

          <div className="videos-container">

            <div className="video-section-title">

              <span></span>

              <h2>
                À LA UNE
              </h2>

            </div>

            <article className="video-featured">

              {/* =================================================
                  PLAYER
              ================================================= */}

              <div className="video-featured-player">

                <video
                  key={videoActive.id_video}
                  controls
                  playsInline
                  preload="metadata"
                  poster={getThumbnailUrl(
                    videoActive.thumbnail
                  )}
                  onError={(event) => {
                    console.error(
                      "Erreur vidéo :",
                      getVideoUrl(
                        videoActive.video_url
                      )
                    );

                    event.currentTarget.classList.add(
                      "video-error"
                    );
                  }}
                >

                  <source
                    src={getVideoUrl(
                      videoActive.video_url
                    )}
                    type={getVideoType(
                      videoActive.video_url
                    )}
                  />

                  Votre navigateur ne prend
                  pas en charge la lecture
                  vidéo.

                </video>

              </div>

              {/* =================================================
                  INFORMATIONS
              ================================================= */}

              <div className="video-featured-info">

                <div className="video-meta">

                  {videoActive.categorie && (
                    <span className="video-category">
                      {videoActive.categorie}
                    </span>
                  )}

                  {videoActive.created_at && (
                    <time>
                      {formatDate(
                        videoActive.created_at
                      )}
                    </time>
                  )}

                </div>

                <h2>
                  {videoActive.titre ||
                    "Sans titre"}
                </h2>

                {videoActive.description && (
                  <p>
                    {descriptionCourte(
                      videoActive.description,
                      300
                    )}
                  </p>
                )}

                <div className="video-featured-footer">

                  <span>
                    Mikwo Pèp La
                  </span>

                  <span className="featured-label">
                    ▶️ À LA UNE
                  </span>

                </div>

              </div>

            </article>

          </div>

        </section>
      )}

      {/* =================================================
          DERNIÈRES VIDÉOS
      ================================================= */}

      {autresVideos.length > 0 && (
        <section className="videos-latest-section">

          <div className="videos-container">

            <div className="video-section-title">

              <span></span>

              <h2>
                DERNIÈRES VIDÉOS
              </h2>

            </div>

            <div className="videos-grid">

              {autresVideos.map(
                (video) => {

                  const thumbnail =
                    getThumbnailUrl(
                      video.thumbnail
                    );

                  return (
                    <article
                      className="video-card"
                      key={
                        video.id_video
                      }
                      onClick={() =>
                        selectionnerVideo(
                          video
                        )
                      }
                    >

                      {/* =================================================
                          MINIATURE
                      ================================================= */}

                      <div className="video-card-media">

                        {thumbnail ? (
                          <img
                            src={thumbnail}
                            alt={
                              video.titre ||
                              "Vidéo Mikwo Pèp La"
                            }
                          />
                        ) : (
                          <div className="video-card-placeholder">
                            MIKWO PÈP LA
                          </div>
                        )}

                        {/* =================================================
                            BOUTON REGARDER
                        ================================================= */}

                        <button
                          type="button"
                          className="video-play-button"
                          aria-label={`Lire ${video.titre || "la vidéo"}`}
                          onClick={(event) =>
                            regarderVideo(
                              event,
                              video
                            )
                          }
                        >
                          ▶️
                        </button>

                        <div className="video-card-overlay">
                          REGARDER
                        </div>

                      </div>

                      {/* =================================================
                          CONTENU
                      ================================================= */}

                      <div className="video-card-content">

                        <div className="video-meta">

                          {video.categorie && (
                            <span className="video-category">
                              {
                                video.categorie
                              }
                            </span>
                          )}

                          {video.created_at && (
                            <time>
                              {new Date(
                                video.created_at
                              ).toLocaleDateString(
                                "fr-FR"
                              )}
                            </time>
                          )}

                        </div>

                        <h3>
                          {video.titre ||
                            "Sans titre"}
                        </h3>

                        {video.description && (
                          <p>
                            {descriptionCourte(
                              video.description,
                              130
                            )}
                          </p>
                        )}

                      </div>

                    </article>
                  );
                }
              )}

            </div>

          </div>

        </section>
      )}

    </main>
  );
}

export default Videos;
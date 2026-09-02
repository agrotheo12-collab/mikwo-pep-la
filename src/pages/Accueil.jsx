import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Hls from "hls.js";
import cover from "../assets/cover.PNG";
import "./Accueil.css";

const API_URL = import.meta.env.VITE_API_URL;

// =====================================================
// MEDIA URL
// =====================================================

function getMediaUrl(mediaUrl) {
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
}

// =====================================================
// YOUTUBE ID
// =====================================================

function getYouTubeVideoId(url) {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    if (
      hostname === "youtu.be" ||
      hostname.endsWith(".youtu.be")
    ) {
      return parsed.pathname
        .replace(/^\/+/, "")
        .split("/")[0]
        .split("?")[0];
    }

    if (hostname.includes("youtube.com")) {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v") || "";
      }

      if (parsed.pathname.startsWith("/live/")) {
        return parsed.pathname
          .split("/live/")[1]
          .split("/")[0]
          .split("?")[0];
      }

      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname
          .split("/embed/")[1]
          .split("/")[0]
          .split("?")[0];
      }

      if (parsed.pathname.startsWith("/v/")) {
        return parsed.pathname
          .split("/v/")[1]
          .split("/")[0]
          .split("?")[0];
      }
    }
  } catch (error) {
    console.error("Erreur URL YouTube :", error);
  }

  return "";
}

// =====================================================
// YOUTUBE EMBED
// =====================================================

function getYouTubeEmbedUrl(url) {
  const videoId = getYouTubeVideoId(url);

  if (!videoId) {
    return "";
  }

  return (
    `https://www.youtube.com/embed/${videoId}` +
    `?autoplay=1&mute=1&rel=0`
  );
}

// =====================================================
// FACEBOOK EMBED
// =====================================================

function getFacebookEmbedUrl(url) {
  if (!url) return "";

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    if (
      !hostname.includes("facebook.com") &&
      !hostname.includes("fb.watch")
    ) {
      return "";
    }

    return (
      "https://www.facebook.com/plugins/video.php" +
      "?href=" +
      encodeURIComponent(url) +
      "&show_text=false" +
      "&autoplay=true" +
      "&allowfullscreen=true"
    );
  } catch (error) {
    console.error("Erreur URL Facebook :", error);
    return "";
  }
}

// =====================================================
// TIKTOK URL
// =====================================================

function getTikTokEmbedUrl(url) {
  if (!url) return "";

  try {
    const parsed = new URL(url);

    if (
      !parsed.hostname
        .toLowerCase()
        .includes("tiktok.com")
    ) {
      return "";
    }

    return url;
  } catch {
    return "";
  }
}

// =====================================================
// ACCUEIL
// =====================================================

function Accueil() {
  const [live, setLive] = useState(null);

  const [liveLoading, setLiveLoading] =
    useState(true);

  const [liveError, setLiveError] =
    useState("");

  // =====================================================
  // ARTICLES
  // =====================================================

  const [articles, setArticles] = useState([]);

  const [loadingArticles, setLoadingArticles] =
    useState(true);

  const [errorArticles, setErrorArticles] =
    useState("");

  // =====================================================
  // PUBLICATIONS PHOTO
  // =====================================================

  const [photoPublications, setPhotoPublications] =
    useState([]);

  const [loadingPhotos, setLoadingPhotos] =
    useState(true);

  const [errorPhotos, setErrorPhotos] =
    useState("");

  // =====================================================
  // VIDEOS
  // =====================================================

  const [videos, setVideos] = useState([]);

  const [loadingVideos, setLoadingVideos] =
    useState(true);

  const [errorVideos, setErrorVideos] =
    useState("");

  // =====================================================
  // LIVE
  // =====================================================

  useEffect(() => {
    const chargerLive = async () => {
      try {
        setLiveLoading(true);
        setLiveError("");

        const response = await fetch(
          `${API_URL}/api/live`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Impossible de charger le direct."
          );
        }

        setLive(data.live || null);
      } catch (error) {
        console.error("Erreur live :", error);

        setLiveError(
          "Impossible de charger la diffusion en direct."
        );
      } finally {
        setLiveLoading(false);
      }
    };

    chargerLive();
  }, []);

  // =====================================================
  // ARTICLES
  // =====================================================

  useEffect(() => {
    const chargerArticles = async () => {
      try {
        setLoadingArticles(true);
        setErrorArticles("");

        const response = await fetch(
          `${API_URL}/api/articles`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Erreur lors du chargement des articles."
          );
        }

        let listeArticles = [];

        if (Array.isArray(data)) {
          listeArticles = data;
        } else if (
          data &&
          Array.isArray(data.articles)
        ) {
          listeArticles = data.articles;
        }

        // -------------------------------------------------
        // ARTICLES PUBLIÉS UNIQUEMENT
        // -------------------------------------------------

        listeArticles = listeArticles.filter(
          (article) => {
            const statut = String(
              article.statut || ""
            ).toLowerCase();

            if (!statut) {
              return true;
            }

            return (
              statut === "publie" ||
              statut === "publié" ||
              statut === "published" ||
              statut === "public" ||
              statut === "en ligne" ||
              statut === "active"
            );
          }
        );

        // -------------------------------------------------
        // PLUS RÉCENT EN PREMIER
        // -------------------------------------------------

        listeArticles.sort((a, b) => {
          const dateA = new Date(
            a.created_at || 0
          ).getTime();

          const dateB = new Date(
            b.created_at || 0
          ).getTime();

          return dateB - dateA;
        });

        setArticles(listeArticles);
      } catch (error) {
        console.error(
          "Erreur articles :",
          error
        );

        setErrorArticles(
          "Impossible de charger les actualités."
        );
      } finally {
        setLoadingArticles(false);
      }
    };

    chargerArticles();
  }, []);

  // =====================================================
  // PUBLICATIONS PHOTO
  // =====================================================

  useEffect(() => {
    const chargerPhotoPublications = async () => {
      try {
        setLoadingPhotos(true);
        setErrorPhotos("");

        const response = await fetch(
          `${API_URL}/api/photo-publications`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Erreur lors du chargement des publications photo."
          );
        }

        let listePublications = [];

        // -------------------------------------------------
        // LE BACKEND PEUT RETOURNER:
        // []
        // OU { publications: [] }
        // -------------------------------------------------

        if (Array.isArray(data)) {
          listePublications = data;
        } else if (
          data &&
          Array.isArray(data.publications)
        ) {
          listePublications = data.publications;
        }

        // -------------------------------------------------
        // GARDER LES PUBLICATIONS PUBLIÉES
        // -------------------------------------------------

        listePublications =
          listePublications.filter(
            (publication) => {
              const statut = String(
                publication.statut || ""
              ).toLowerCase();

              if (!statut) {
                return true;
              }

              return (
                statut === "publie" ||
                statut === "publié" ||
                statut === "published" ||
                statut === "public" ||
                statut === "en ligne" ||
                statut === "active"
              );
            }
          );

        // -------------------------------------------------
        // PLUS RÉCENT EN PREMIER
        // -------------------------------------------------

        listePublications.sort((a, b) => {
          const dateA = new Date(
            a.created_at || 0
          ).getTime();

          const dateB = new Date(
            b.created_at || 0
          ).getTime();

          return dateB - dateA;
        });

        setPhotoPublications(
          listePublications
        );
      } catch (error) {
        console.error(
          "Erreur publications photo :",
          error
        );

        setErrorPhotos(
          "Impossible de charger les publications photo."
        );
      } finally {
        setLoadingPhotos(false);
      }
    };

    chargerPhotoPublications();
  }, []);

  // =====================================================
  // VIDEOS
  // =====================================================

  useEffect(() => {
    const chargerVideos = async () => {
      try {
        setLoadingVideos(true);
        setErrorVideos("");

        const response = await fetch(
          `${API_URL}/api/videos`
        );

        if (!response.ok) {
          throw new Error(
            "Erreur lors du chargement des vidéos."
          );
        }

        const data = await response.json();

        let listeVideos = [];

        if (Array.isArray(data)) {
          listeVideos = data;
        } else if (
          data &&
          Array.isArray(data.videos)
        ) {
          listeVideos = data.videos;
        }

        listeVideos.sort((a, b) => {
          const dateA = new Date(
            a.created_at || 0
          ).getTime();

          const dateB = new Date(
            b.created_at || 0
          ).getTime();

          return dateB - dateA;
        });

        setVideos(listeVideos);
      } catch (error) {
        console.error(
          "Erreur vidéos :",
          error
        );

        setErrorVideos(
          "Impossible de charger les vidéos."
        );
      } finally {
        setLoadingVideos(false);
      }
    };

    chargerVideos();
  }, []);

  // =====================================================
  // HLS
  // =====================================================

  useEffect(() => {
    if (
      !live ||
      live.statut !== "live"
    ) {
      return undefined;
    }

    const streamUrl = String(
      live.stream_url || ""
    ).trim();

    if (
      !streamUrl ||
      !streamUrl
        .toLowerCase()
        .includes(".m3u8")
    ) {
      return undefined;
    }

    const videoElement =
      document.getElementById(
        "accueil-live-video"
      );

    if (!videoElement) {
      return undefined;
    }

    let hls = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(videoElement);

      hls.on(
        Hls.Events.ERROR,
        (event, data) => {
          console.error(
            "Erreur HLS :",
            data
          );
        }
      );
    } else if (
      videoElement.canPlayType(
        "application/vnd.apple.mpegurl"
      )
    ) {
      videoElement.src = streamUrl;
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [live]);

  // =====================================================
  // LIVE PLAYER
  // =====================================================

  const renderLivePlayer = () => {
    if (liveLoading) {
      return (
        <div className="accueil-live-loading">
          <div className="accueil-live-spinner"></div>

          <p>
            Chargement du direct...
          </p>
        </div>
      );
    }

    if (liveError) {
      return (
        <div className="accueil-live-offline">
          <span className="accueil-live-offline-icon">
            📡
          </span>

          <h2>
            Direct indisponible
          </h2>

          <p>
            Le direct n'est pas disponible
            pour le moment.
          </p>

          <Link
            to="/direct"
            className="accueil-live-button"
          >
            Ouvrir la page Direct
          </Link>
        </div>
      );
    }

    if (
      !live ||
      live.statut !== "live"
    ) {
      return (
        <div
          className="accueil-live-offline"
          style={{
            backgroundImage:
              `linear-gradient(
                rgba(0,0,0,.35),
                rgba(0,0,0,.35)
              ), url(${cover})`,
          }}
        >
          <span className="accueil-live-offline-icon">
            📡
          </span>

          <h2>
            Mikwo Pèp La
          </h2>

          <p>
            Aucun direct n'est
            actuellement en cours.
          </p>

          <Link
            to="/direct"
            className="accueil-live-button"
          >
            Voir le direct
          </Link>
        </div>
      );
    }

    const streamUrl = String(
      live.stream_url || ""
    ).trim();

    const sourceType = String(
      live.source_type || ""
    ).toLowerCase();

    // ---------------------------------------------------
    // YOUTUBE
    // ---------------------------------------------------

    if (
      sourceType === "youtube" ||
      streamUrl.includes("youtube.com") ||
      streamUrl.includes("youtu.be")
    ) {
      const youtubeEmbed =
        getYouTubeEmbedUrl(
          streamUrl
        );

      if (youtubeEmbed) {
        return (
          <div className="accueil-live-media">
            <iframe
              className="accueil-live-iframe"
              src={youtubeEmbed}
              title={
                live.titre ||
                "Mikwo Pèp La en direct"
              }
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>
        );
      }

      return (
        <div className="accueil-live-offline">
          <span className="accueil-live-offline-icon">
            ▶️
          </span>

          <h2>
            Direct YouTube
          </h2>

          <p>
            Ce lien YouTube ne peut pas
            être intégré automatiquement.
          </p>

          <a
            href={streamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="accueil-live-button"
          >
            Ouvrir YouTube
          </a>
        </div>
      );
    }

    // ---------------------------------------------------
    // FACEBOOK
    // ---------------------------------------------------

    if (
      sourceType === "facebook" ||
      streamUrl.includes("facebook.com") ||
      streamUrl.includes("fb.watch")
    ) {
      const facebookEmbed =
        getFacebookEmbedUrl(
          streamUrl
        );

      if (facebookEmbed) {
        return (
          <div className="accueil-live-media">
            <iframe
              className="accueil-live-iframe"
              src={facebookEmbed}
              title={
                live.titre ||
                "Mikwo Pèp La Facebook Live"
              }
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              allowFullScreen
            ></iframe>
          </div>
        );
      }

      return (
        <div className="accueil-live-offline">
          <span className="accueil-live-offline-icon">
            📘
          </span>

          <h2>
            Direct Facebook
          </h2>

          <p>
            Ce direct Facebook ne peut pas
            être intégré automatiquement.
          </p>

          <a
            href={streamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="accueil-live-button"
          >
            Ouvrir Facebook
          </a>
        </div>
      );
    }

    // ---------------------------------------------------
    // TIKTOK
    // ---------------------------------------------------

    if (
      sourceType === "tiktok" ||
      streamUrl.includes("tiktok.com")
    ) {
      const tiktokUrl =
        getTikTokEmbedUrl(
          streamUrl
        );

      return (
        <div className="accueil-live-offline">
          <span className="accueil-live-offline-icon">
            🎵
          </span>

          <h2>
            Direct TikTok
          </h2>

          <p>
            TikTok ne permet pas toujours
            d'intégrer un Live directement
            dans un lecteur externe.
          </p>

          {tiktokUrl && (
            <a
              href={tiktokUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="accueil-live-button"
            >
              Ouvrir TikTok
            </a>
          )}
        </div>
      );
    }

    // ---------------------------------------------------
    // HLS
    // ---------------------------------------------------

    if (
      sourceType === "hls" ||
      streamUrl
        .toLowerCase()
        .includes(".m3u8")
    ) {
      return (
        <div className="accueil-live-media">
          <video
            id="accueil-live-video"
            className="accueil-live-video"
            controls
            autoPlay
            muted
            playsInline
            poster={cover}
          >
            Votre navigateur ne prend pas
            en charge la lecture vidéo.
          </video>
        </div>
      );
    }

    // ---------------------------------------------------
    // MP4 / WEBM
    // ---------------------------------------------------

    if (
      sourceType === "mp4" ||
      /\.(mp4|webm|mov|m4v)(\?|$)/i.test(
        streamUrl
      )
    ) {
      return (
        <div className="accueil-live-media">
          <video
            className="accueil-live-video"
            src={streamUrl}
            controls
            autoPlay
            muted
            playsInline
            poster={cover}
            onError={(event) => {
              console.error(
                "Erreur lecture vidéo :",
                event
              );
            }}
          >
            Votre navigateur ne prend pas
            en charge la lecture vidéo.
          </video>
        </div>
      );
    }

    // ---------------------------------------------------
    // AUTRE SOURCE
    // ---------------------------------------------------

    return (
      <div className="accueil-live-offline">
        <span className="accueil-live-offline-icon">
          🌐
        </span>

        <h2>
          Direct disponible
        </h2>

        <p>
          Cette source ne peut pas être
          lue directement dans le lecteur.
        </p>

        <a
          href={streamUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="accueil-live-button"
        >
          Ouvrir la diffusion
        </a>
      </div>
    );
  };

  // =====================================================
  // IMAGE ARTICLE
  // =====================================================

  const getArticleImage = (article) => {
    return (
      article.image_url ||
      article.image ||
      article.photo_url ||
      article.thumbnail ||
      article.cover ||
      ""
    );
  };

  // =====================================================
  // IMAGE PUBLICATION PHOTO
  // =====================================================

  const getPhotoPublicationImage = (
    publication
  ) => {
    // -------------------------------------------------
    // CAS 1 :
    // photos = [{ image_url: "..." }]
    // -------------------------------------------------

    if (
      Array.isArray(publication.photos) &&
      publication.photos.length > 0
    ) {
      const premierePhoto =
        publication.photos[0];

      return (
        premierePhoto?.image_url ||
        premierePhoto?.image ||
        premierePhoto?.photo_url ||
        ""
      );
    }

    // -------------------------------------------------
    // CAS 2 :
    // image_url directement dans publication
    // -------------------------------------------------

    return (
      publication.image_url ||
      publication.image ||
      publication.photo_url ||
      ""
    );
  };

  // =====================================================
  // ID PUBLICATION PHOTO
  // =====================================================

  const getPhotoPublicationId = (
    publication
  ) => {
    return (
      publication.id_publication ||
      publication.id_photo_publication ||
      publication.id_photo ||
      publication.id
    );
  };

  // =====================================================
  // NOMBRE DE PHOTOS
  // =====================================================

  const getPhotoCount = (
    publication
  ) => {
    if (
      Number.isFinite(
        Number(publication.nombre_photos)
      )
    ) {
      return Number(
        publication.nombre_photos
      );
    }

    if (
      Array.isArray(publication.photos)
    ) {
      return publication.photos.length;
    }

    return 1;
  };

  // =====================================================
  // CONTENU À LA UNE
  // =====================================================

  const contenuUne = [
    ...articles.map((article) => ({
      ...article,
      type_contenu: "article",
      date_contenu:
        article.created_at,
    })),

    ...photoPublications.map(
      (publication) => ({
        ...publication,
        type_contenu: "photo",
        date_contenu:
          publication.created_at,
      })
    ),
  ];

  // -----------------------------------------------------
  // PLUS RÉCENT EN PREMIER
  // -----------------------------------------------------

  contenuUne.sort((a, b) => {
    const dateA = new Date(
      a.date_contenu || 0
    ).getTime();

    const dateB = new Date(
      b.date_contenu || 0
    ).getTime();

    return dateB - dateA;
  });

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <main className="accueil">

      {/* =================================================
          FLASH INFO
      ================================================= */}

      <section className="breaking-news">

        <div className="container breaking-news-inner">

          <div className="breaking-label">

            <span className="breaking-dot"></span>

            <strong>
              FLASH INFO
            </strong>

          </div>

          <div className="breaking-track">

            <div className="breaking-content">

              <span>
                Bienvenue sur Mikwo Pèp La —
                votre source d'information
                et d'actualité.
              </span>

              <span>
                Suivez nos dernières nouvelles
                en temps réel.
              </span>

              <span>
                Mikwo Pèp La —
                L'information au service
                du peuple.
              </span>

            </div>

          </div>

        </div>

      </section>

      {/* =================================================
          DIRECT
      ================================================= */}

      <section className="live-section">

        <div className="live-full-container">

          <div className="live-section-header">

            <div className="live-title-wrapper">

              <span className="live-dot"></span>

              <h1>
                EN DIRECT
              </h1>

            </div>

            {live &&
              live.statut === "live" && (
                <span className="live-now-badge">
                  🔴 EN DIRECT
                </span>
              )}

          </div>

          <div className="accueil-live-player">

            {renderLivePlayer()}

          </div>

          {live &&
            live.statut === "live" && (

              <div className="accueil-live-info">

                <div>

                  <span>
                    EN DIRECT
                  </span>

                  <h2>
                    {live.titre ||
                      "Mikwo Pèp La — En direct"}
                  </h2>

                  {live.description && (
                    <p>
                      {live.description}
                    </p>
                  )}

                </div>

                <Link
                  to="/direct"
                  className="accueil-live-full-button"
                >
                  Ouvrir le direct →
                </Link>

              </div>

            )}

        </div>

      </section>

      {/* =================================================
          À LA UNE
      ================================================= */}

      <section className="news-section">

        <div className="container">

          <div className="section-heading">

            <div>

              <span className="section-kicker">
                ACTUALITÉS
              </span>

              <h2>
                À LA UNE
              </h2>

            </div>

            <Link to="/actualites">
              Voir toutes les actualités →
            </Link>

          </div>

          {/* ------------------------------------------------
              CHARGEMENT
          ------------------------------------------------ */}

          {(loadingArticles ||
            loadingPhotos) && (
            <p className="section-message">
              Chargement des actualités...
            </p>
          )}

          {/* ------------------------------------------------
              ERREUR ARTICLES
          ------------------------------------------------ */}

          {errorArticles && (
            <p className="section-message error">
              {errorArticles}
            </p>
          )}

          {/* ------------------------------------------------
              ERREUR PHOTOS
          ------------------------------------------------ */}

          {errorPhotos && (
            <p className="section-message error">
              {errorPhotos}
            </p>
          )}

          {/* ------------------------------------------------
              AUCUN CONTENU
          ------------------------------------------------ */}

          {!loadingArticles &&
            !loadingPhotos &&
            !errorArticles &&
            !errorPhotos &&
            contenuUne.length === 0 && (
              <p className="section-message">
                Aucune actualité disponible
                pour le moment.
              </p>
            )}

          {/* ------------------------------------------------
              À LA UNE
          ------------------------------------------------ */}

          {!loadingArticles &&
            !loadingPhotos &&
            contenuUne.length > 0 && (

              <div className="news-grid">

                {contenuUne
                  .slice(0, 3)
                  .map((contenu) => {

                    // =================================================
                    // ARTICLE
                    // =================================================

                    if (
                      contenu.type_contenu ===
                      "article"
                    ) {

                      const imageUrl =
                        getMediaUrl(
                          getArticleImage(
                            contenu
                          )
                        );

                      return (
                        <article
                          className="news-card"
                          key={`article-${contenu.id_article}`}
                        >

                          <Link
                            to={`/actualites/${contenu.id_article}`}
                            className="news-card-link"
                          >

                            <div className="news-image">

                              {imageUrl ? (

                                <img
                                  src={imageUrl}
                                  alt={
                                    contenu.titre ||
                                    "Actualité Mikwo Pèp La"
                                  }
                                  loading="lazy"
                                  decoding="async"
                                  onError={(event) => {
                                    event.currentTarget.style.display =
                                      "none";
                                  }}
                                />

                              ) : (

                                <div className="image-placeholder">
                                  📰
                                </div>

                              )}

                            </div>

                            <div className="news-content">

                              <span>
                                ACTUALITÉ
                              </span>

                              <h3>
                                {contenu.titre ||
                                  "Sans titre"}
                              </h3>

                              {contenu.contenu && (
                                <p>
                                  {String(
                                    contenu.contenu
                                  )
                                    .replace(
                                      /<[^>]*>/g,
                                      ""
                                    )
                                    .slice(0, 160)}
                                  ...
                                </p>
                              )}

                            </div>

                          </Link>

                        </article>
                      );
                    }

                    // =================================================
                    // PUBLICATION PHOTO
                    // =================================================

                    const imageUrl =
                      getMediaUrl(
                        getPhotoPublicationImage(
                          contenu
                        )
                      );

                    const publicationId =
                      getPhotoPublicationId(
                        contenu
                      );

                    const nombrePhotos =
                      getPhotoCount(
                        contenu
                      );

                    return (
                      <article
                        className="news-card"
                        key={`photo-${publicationId}`}
                      >

                        <Link
                          to={`/photos/${publicationId}`}
                          className="news-card-link"
                        >

                          <div className="news-image">

                            {imageUrl ? (

                              <img
                                src={imageUrl}
                                alt={
                                  contenu.titre ||
                                  "Publication photo Mikwo Pèp La"
                                }
                                loading="lazy"
                                decoding="async"
                                onError={(event) => {
                                  event.currentTarget.style.display =
                                    "none";
                                }}
                              />

                            ) : (

                              <div className="image-placeholder">
                                📷
                              </div>

                            )}

                            <span className="photo-count">
                              📷 {nombrePhotos}{" "}
                              {nombrePhotos > 1
                                ? "photos"
                                : "photo"}
                            </span>

                          </div>

                          <div className="news-content">

                            <span>
                              PHOTOS
                            </span>

                            <h3>
                              {contenu.titre ||
                                "Publication photo"}
                            </h3>

                            {contenu.description && (
                              <p>
                                {
                                  contenu.description
                                }
                              </p>
                            )}

                          </div>

                        </Link>

                      </article>
                    );
                  })}

              </div>

            )}

        </div>

      </section>

      {/* =================================================
          VIDEOS
      ================================================= */}

      <section className="videos-section">

        <div className="container">

          <div className="section-heading">

            <div>

              <span className="section-kicker">
                MIKWO PÈP LA
              </span>

              <h2>
                DERNIÈRES VIDÉOS
              </h2>

            </div>

            <Link to="/videos">
              Voir toutes les vidéos →
            </Link>

          </div>

          {loadingVideos && (
            <p className="section-message">
              Chargement des vidéos...
            </p>
          )}

          {errorVideos && (
            <p className="section-message error">
              {errorVideos}
            </p>
          )}

          {!loadingVideos &&
            !errorVideos &&
            videos.length === 0 && (
              <p className="section-message">
                Aucune vidéo disponible
                pour le moment.
              </p>
            )}

          {!loadingVideos &&
            !errorVideos &&
            videos.length > 0 && (

              <div className="videos-grid">

                {videos
                  .slice(0, 3)
                  .map((video) => {

                    const videoUrl =
                      getMediaUrl(
                        video.video_url
                      );

                    const thumbnailUrl =
                      getMediaUrl(
                        video.thumbnail
                      );

                    return (
                      <article
                        className="video-card"
                        key={
                          video.id_video
                        }
                      >

                        <Link
                          to="/videos"
                          className="video-card-link"
                        >

                          <div className="video-thumbnail">

                            {thumbnailUrl ? (

                              <img
                                src={thumbnailUrl}
                                alt={
                                  video.titre ||
                                  "Vidéo Mikwo Pèp La"
                                }
                                loading="lazy"
                              />

                            ) : videoUrl ? (

                              <video
                                preload="metadata"
                                muted
                                playsInline
                              >

                                <source
                                  src={videoUrl}
                                  type="video/mp4"
                                />

                                Votre navigateur
                                ne prend pas
                                en charge
                                la vidéo.

                              </video>

                            ) : (

                              <div className="video-placeholder">
                                ▶️
                              </div>

                            )}

                            <span className="video-play">
                              ▶️
                            </span>

                          </div>

                          <div className="video-content">

                            <span>
                              VIDÉO
                            </span>

                            <h3>
                              {video.titre}
                            </h3>

                            {video.description && (
                              <p>
                                {
                                  video.description
                                }
                              </p>
                            )}

                          </div>

                        </Link>

                      </article>
                    );
                  })}

              </div>

            )}

        </div>

      </section>

      {/* =================================================
          RÉSEAUX SOCIAUX
      ================================================= */}

      <section className="social-section">

        <div className="container">

          <span className="section-kicker social-kicker">
            RESTEZ CONNECTÉS
          </span>

          <h2>
            SUIVEZ MIKWO PÈP LA
          </h2>

          <p>
            Retrouvez-nous sur nos réseaux sociaux.
          </p>

          <div className="social-buttons">

            <a
              href="https://www.facebook.com/Mikwo509"
              target="_blank"
              rel="noopener noreferrer"
            >
              Facebook
            </a>

            <a
              href="https://youtube.com/@mikwopepla509"
              target="_blank"
              rel="noopener noreferrer"
            >
              YouTube
            </a>

            <a
              href="https://www.tiktok.com/@mikwopepla"
              target="_blank"
              rel="noopener noreferrer"
            >
              TikTok
            </a>

          </div>

        </div>

      </section>

    </main>
  );
}

export default Accueil;
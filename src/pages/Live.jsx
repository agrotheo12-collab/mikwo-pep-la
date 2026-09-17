import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import "./Live.css";

const API_URL = import.meta.env.VITE_API_URL;

function Live() {
  const [live, setLive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  // ======================================================
  // SESSION ID — SPECTATEUR
  // ======================================================

  const getSessionId = () => {
    const key = "mikwo_pep_la_live_session";

    let sessionId = localStorage.getItem(key);

    if (!sessionId) {
      sessionId =
        "viewer-" +
        Date.now() +
        "-" +
        Math.random()
          .toString(36)
          .substring(2, 12);

      localStorage.setItem(key, sessionId);
    }

    return sessionId;
  };

  // ======================================================
  // CHARGER LE DIRECT
  // ======================================================

  useEffect(() => {
    let actif = true;

    const chargerLive = async () => {
      try {
        setLoading(true);
        setError("");

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

        if (!actif) {
          return;
        }

        /*
          Le backend retourne :

          {
            success: true,
            live: {
              id_live,
              titre,
              description,
              stream_url,
              statut,
              source_type
            }
          }
        */

        const liveData = data?.live || null;

        setLive(liveData);
      } catch (err) {
        console.error(
          "Erreur chargement direct :",
          err
        );

        if (actif) {
          setError(
            err.message ||
              "Impossible de charger le direct."
          );

          setLive(null);
        }
      } finally {
        if (actif) {
          setLoading(false);
        }
      }
    };

    chargerLive();

    return () => {
      actif = false;
    };
  }, []);

  // ======================================================
  // ENREGISTRER LA PRÉSENCE DU SPECTATEUR
  // ======================================================

  useEffect(() => {
    if (!live?.id_live) {
      return;
    }

    const sessionId = getSessionId();

    const envoyerPresence = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/live/viewer`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              id_live: live.id_live,
              session_id: sessionId,
            }),
          }
        );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Impossible d'enregistrer la présence."
          );
        }

        /*
          Important :

          Le nombre de spectateurs n'est PAS affiché
          publiquement ici.

          L'Admin le récupère avec :
          GET /api/live/:id/viewers
        */
      } catch (err) {
        console.error(
          "Erreur présence spectateur :",
          err
        );
      }
    };

    envoyerPresence();

    const interval = setInterval(
      envoyerPresence,
      30000
    );

    return () => {
      clearInterval(interval);
    };
  }, [live]);

  // ======================================================
  // NETTOYAGE HLS
  // ======================================================

  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  // ======================================================
  // EXTRAIRE ID YOUTUBE
  // ======================================================

  const getYouTubeId = (url) => {
    if (!url) {
      return null;
    }

    try {
      const parsedUrl = new URL(url);

      if (
        parsedUrl.hostname.includes(
          "youtu.be"
        )
      ) {
        return parsedUrl.pathname
          .replace("/", "")
          .trim();
      }

      if (
        parsedUrl.hostname.includes(
          "youtube.com"
        )
      ) {
        const videoId =
          parsedUrl.searchParams.get("v");

        if (videoId) {
          return videoId;
        }

        const paths =
          parsedUrl.pathname.split(
            "/"
          );

        const liveIndex =
          paths.indexOf("live");

        if (
          liveIndex !== -1 &&
          paths[liveIndex + 1]
        ) {
          return paths[liveIndex + 1];
        }

        const embedIndex =
          paths.indexOf("embed");

        if (
          embedIndex !== -1 &&
          paths[embedIndex + 1]
        ) {
          return paths[
            embedIndex + 1
          ];
        }
      }
    } catch {
      return null;
    }

    return null;
  };

  // ======================================================
  // FACEBOOK URL
  // ======================================================

  const isFacebookUrl = (url) => {
    if (!url) {
      return false;
    }

    return (
      url.includes("facebook.com") ||
      url.includes("fb.watch")
    );
  };

  // ======================================================
  // TIKTOK URL
  // ======================================================

  const isTikTokUrl = (url) => {
    if (!url) {
      return false;
    }

    return url.includes("tiktok.com");
  };

  // ======================================================
  // ZOOM URL
  // ======================================================

  const isZoomUrl = (url) => {
    if (!url) {
      return false;
    }

    return url.includes("zoom.us");
  };

  // ======================================================
  // HLS
  // ======================================================

  const isHlsUrl = (url) => {
    if (!url) {
      return false;
    }

    return (
      url.toLowerCase().includes(".m3u8")
    );
  };

  // ======================================================
  // INITIALISER HLS
  // ======================================================

  useEffect(() => {
    if (!live) {
      return;
    }

    if (
      live.source_type !== "hls" &&
      !isHlsUrl(live.stream_url)
    ) {
      return;
    }

    const video = videoRef.current;

    if (!video) {
      return;
    }

    const streamUrl = live.stream_url;

    if (!streamUrl) {
      return;
    }

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (
      video.canPlayType(
        "application/vnd.apple.mpegurl"
      )
    ) {
      video.src = streamUrl;

      const handleLoadedMetadata =
        () => {
          video.play().catch(() => {});
        };

      video.addEventListener(
        "loadedmetadata",
        handleLoadedMetadata
      );

      return () => {
        video.removeEventListener(
          "loadedmetadata",
          handleLoadedMetadata
        );

        video.removeAttribute("src");
        video.load();
      };
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(
        Hls.Events.MANIFEST_PARSED,
        () => {
          video.play().catch(() => {});
        }
      );

      hls.on(
        Hls.Events.ERROR,
        (
          event,
          data
        ) => {
          console.error(
            "Erreur HLS :",
            data
          );
        }
      );

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    }

    return undefined;
  }, [live]);

  // ======================================================
  // CHARGEMENT
  // ======================================================

  if (loading) {
    return (
      <main className="live-page">
        <section className="live-loading">
          <div className="live-loader"></div>

          <h2>
            Chargement du direct...
          </h2>

          <p>
            Veuillez patienter.
          </p>
        </section>
      </main>
    );
  }

  // ======================================================
  // ERREUR
  // ======================================================

  if (error) {
    return (
      <main className="live-page">
        <section className="live-error">
          <div className="live-error-icon">
            ⚠️
          </div>

          <h2>
            Une erreur est survenue
          </h2>

          <p>
            {error}
          </p>

          <button
            type="button"
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

  // ======================================================
  // AUCUN DIRECT
  // ======================================================

  if (!live) {
    return (
      <main className="live-page">
        <section className="live-offline">
          <div className="live-offline-icon">
            📡
          </div>

          <span className="live-badge">
            DIRECT
          </span>

          <h1>
            Aucun direct disponible
          </h1>

          <p>
            Mikwo Pèp La TV n'est pas
            actuellement en direct.
          </p>
        </section>
      </main>
    );
  }

  // ======================================================
  // DONNÉES DU DIRECT
  // ======================================================

  const streamUrl =
    live.stream_url || "";

  const sourceType =
    live.source_type || "";

  const youtubeId =
    getYouTubeId(streamUrl);

  const isYouTube =
    sourceType === "youtube" ||
    Boolean(youtubeId);

  const isFacebook =
    sourceType === "facebook" ||
    isFacebookUrl(streamUrl);

  const isTikTok =
    sourceType === "tiktok" ||
    isTikTokUrl(streamUrl);

  const isZoom =
    sourceType === "zoom" ||
    isZoomUrl(streamUrl);

  const isHls =
    sourceType === "hls" ||
    isHlsUrl(streamUrl);

  const isLive =
    live.statut === "live";

  // ======================================================
  // YOUTUBE EMBED
  // ======================================================

  const youtubeEmbedUrl = youtubeId
    ? `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`
    : "";

  // ======================================================
  // FACEBOOK EMBED
  // ======================================================

  const facebookEmbedUrl =
    isFacebook && streamUrl
      ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
          streamUrl
        )}&show_text=false&autoplay=true`
      : "";

  // ======================================================
  // RENDU DU PLAYER
  // ======================================================

  const renderPlayer = () => {
    // ----------------------------------------------------
    // YOUTUBE
    // ----------------------------------------------------

    if (isYouTube && youtubeEmbedUrl) {
      return (
        <div className="live-player-frame">
          <iframe
            src={youtubeEmbedUrl}
            title={
              live.titre ||
              "Mikwo Pèp La TV — Direct"
            }
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      );
    }

    // ----------------------------------------------------
    // FACEBOOK
    // ----------------------------------------------------

    if (
      isFacebook &&
      facebookEmbedUrl
    ) {
      return (
        <div className="live-player-frame">
          <iframe
            src={facebookEmbedUrl}
            title={
              live.titre ||
              "Mikwo Pèp La TV — Facebook Live"
            }
            frameBorder="0"
            scrolling="no"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      );
    }

    // ----------------------------------------------------
    // TIKTOK
    // ----------------------------------------------------

    if (isTikTok) {
      return (
        <div className="live-external-player">
          <div className="live-external-icon">
            🎵
          </div>

          <h3>
            TikTok Live
          </h3>

          <p>
            Le direct est disponible
            sur TikTok.
          </p>

          <a
            href={streamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="live-external-button"
          >
            Ouvrir TikTok Live
          </a>
        </div>
      );
    }

    // ----------------------------------------------------
    // ZOOM
    // ----------------------------------------------------

    if (isZoom) {
      return (
        <div className="live-external-player">
          <div className="live-external-icon">
            🟣
          </div>

          <h3>
            Zoom
          </h3>

          <p>
            Le direct est disponible
            via Zoom.
          </p>

          <a
            href={streamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="live-external-button"
          >
            Rejoindre le direct
          </a>
        </div>
      );
    }

    // ----------------------------------------------------
    // HLS / M3U8
    // ----------------------------------------------------

    if (isHls) {
      return (
        <div className="live-player-frame live-video-frame">
          <video
            ref={videoRef}
            controls
            autoPlay
            playsInline
            muted
          >
            Votre navigateur ne supporte
            pas la lecture vidéo.
          </video>
        </div>
      );
    }

    // ----------------------------------------------------
    // MP4
    // ----------------------------------------------------

    if (
      sourceType === "mp4" ||
      streamUrl
        .toLowerCase()
        .endsWith(".mp4")
    ) {
      return (
        <div className="live-player-frame live-video-frame">
          <video
            src={streamUrl}
            controls
            autoPlay
            playsInline
          >
            Votre navigateur ne supporte
            pas la lecture vidéo.
          </video>
        </div>
      );
    }

    // ----------------------------------------------------
    // SOURCE INCONNUE
    // ----------------------------------------------------

    return (
      <div className="live-external-player">
        <div className="live-external-icon">
          📡
        </div>

        <h3>
          Source du direct
        </h3>

        <p>
          Le direct utilise une source
          externe.
        </p>

        {streamUrl && (
          <a
            href={streamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="live-external-button"
          >
            Ouvrir le direct
          </a>
        )}
      </div>
    );
  };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <main className="live-page">

      {/* =================================================
          HERO
      ================================================= */}

      <section className="live-hero">

        <div className="live-hero-content">

          <span className="live-hero-label">
            MIKWO PÈP LA TV
          </span>

          <h1>
            Direct
          </h1>

          <p>
            Suivez Mikwo Pèp La TV en
            direct.
          </p>

        </div>

      </section>

      {/* =================================================
          CONTENU
      ================================================= */}

      <section className="live-content">

        <div className="live-main">

          {/* =============================================
              TITRE
          ============================================= */}

          <div className="live-heading">

            <div>

              <div className="live-status-line">

                <span
                  className={
                    isLive
                      ? "live-status live-status-on"
                      : "live-status live-status-off"
                  }
                >
                  <span></span>

                  {isLive
                    ? "EN DIRECT"
                    : "HORS LIGNE"}
                </span>

              </div>

              <h2>
                {live.titre ||
                  "Mikwo Pèp La TV"}
              </h2>

            </div>

          </div>

          {/* =============================================
              PLAYER
          ============================================= */}

          <div className="live-player">
            {renderPlayer()}
          </div>

          {/* =============================================
              DESCRIPTION
          ============================================= */}

          {live.description && (
            <section className="live-description">

              <h3>
                À propos de ce direct
              </h3>

              <p>
                {live.description}
              </p>

            </section>
          )}

          {/* =============================================
              MESSAGE HORS LIGNE
          ============================================= */}

          {!isLive && (
            <div className="live-offline-notice">

              <span>
                📡
              </span>

              <div>
                <strong>
                  Le direct est actuellement
                  hors ligne.
                </strong>

                <p>
                  Revenez plus tard pour
                  suivre notre prochaine
                  diffusion.
                </p>
              </div>

            </div>
          )}

        </div>

        {/* =================================================
            SIDEBAR
        ================================================= */}

        <aside className="live-sidebar">

          <div className="live-sidebar-card">

            <span className="live-sidebar-label">
              MIKWO PÈP LA
            </span>

            <h3>
              La voix du peuple
            </h3>

            <p>
              Retrouvez toute notre
              actualité, nos émissions et
              nos diffusions en direct.
            </p>

          </div>

          <div className="live-sidebar-card">

            <h3>
              Suivez-nous
            </h3>

            <div className="live-social-links">

              <a
                href="https://www.facebook.com/Mikwo509"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>
                  f
                </span>

                Facebook
              </a>

              <a
                href="https://youtube.com/@mikwopepla509?si=L7pCFMmwYVeq7awo"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>
                  ▶️
                </span>

                YouTube
              </a>

              <a
                href="https://www.tiktok.com/@mikwopepla"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>
                  ♪
                </span>

                TikTok
              </a>

            </div>

          </div>

        </aside>

      </section>

    </main>
  );
}

export default Live;
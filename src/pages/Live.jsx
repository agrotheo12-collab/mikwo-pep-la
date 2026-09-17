import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import "./Live.css";

const API_URL = import.meta.env.VITE_API_URL;

function Live() {
  const [live, setLive] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isPlaying, setIsPlaying] = useState(false);
  const [playerError, setPlayerError] = useState("");

  const [quality, setQuality] = useState("auto");
  const [availableQualities, setAvailableQualities] = useState([]);

  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const sessionIdRef = useRef(null);

  /* ======================================================
     SESSION SPECTATEUR
  ====================================================== */

  const getSessionId = () => {
    if (sessionIdRef.current) {
      return sessionIdRef.current;
    }

    let sessionId = localStorage.getItem(
      "mikwo_live_session_id"
    );

    if (!sessionId) {
      sessionId =
        "viewer-" +
        Date.now() +
        "-" +
        Math.random().toString(36).substring(2, 12);

      localStorage.setItem(
        "mikwo_live_session_id",
        sessionId
      );
    }

    sessionIdRef.current = sessionId;

    return sessionId;
  };

  /* ======================================================
     CHARGER LE LIVE
  ====================================================== */

  useEffect(() => {
    const chargerLive = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/live/public`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Impossible de charger le direct."
          );
        }

        let liveData = null;

        if (data?.live) {
          liveData = data.live;
        } else if (Array.isArray(data)) {
          liveData = data[0] || null;
        } else if (data?.id_live) {
          liveData = data;
        }

        setLive(liveData);
      } catch (err) {
        console.error(
          "Erreur chargement live :",
          err
        );

        setError(
          err.message ||
            "Impossible de charger le direct."
        );

        setLive(null);
      } finally {
        setLoading(false);
      }
    };

    chargerLive();
  }, []);

  /* ======================================================
     ENREGISTRER LA PRÉSENCE DU SPECTATEUR
     
     IMPORTANT :
     Le nombre de spectateurs n'est PAS affiché ici.
     Cette information est réservée à l'Admin.
  ====================================================== */

  useEffect(() => {
    if (!live?.id_live) {
      return;
    }

    const sessionId = getSessionId();

    let actif = true;

    const envoyerPresence = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/live/viewer`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              id_live: live.id_live,
              session_id: sessionId,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Impossible d'enregistrer la présence."
          );
        }

        /*
         * Le backend retourne toujours le nombre
         * de spectateurs, mais nous ne l'affichons
         * jamais sur la partie publique.
         *
         * AdminLive pourra utiliser cette API
         * pour afficher le nombre.
         */

        if (actif && data.success) {
          // Présence enregistrée avec succès.
        }
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
      actif = false;
      clearInterval(interval);
    };
  }, [live]);

  /* ======================================================
     NETTOYAGE HLS
  ====================================================== */

  useEffect(() => {
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  /* ======================================================
     DÉTECTER URL HLS
  ====================================================== */

  const isHlsUrl = (url) => {
    if (!url) return false;

    return (
      url.includes(".m3u8") ||
      url.includes("application/vnd.apple.mpegurl")
    );
  };

  /* ======================================================
     DÉTECTER YOUTUBE
  ====================================================== */

  const getYouTubeEmbedUrl = (url) => {
    if (!url) return null;

    try {
      const parsed = new URL(url);

      if (
        parsed.hostname.includes("youtube.com") ||
        parsed.hostname.includes("youtube-nocookie.com")
      ) {
        if (parsed.pathname === "/watch") {
          const videoId = parsed.searchParams.get("v");

          if (videoId) {
            return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`;
          }
        }

        if (parsed.pathname.startsWith("/live/")) {
          const videoId =
            parsed.pathname.split("/live/")[1];

          if (videoId) {
            return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`;
          }
        }

        if (parsed.pathname.startsWith("/embed/")) {
          return url;
        }
      }

      if (parsed.hostname === "youtu.be") {
        const videoId =
          parsed.pathname.replace("/", "");

        if (videoId) {
          return `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`;
        }
      }
    } catch (error) {
      console.error(
        "URL YouTube invalide :",
        error
      );
    }

    return null;
  };

  /* ======================================================
     DÉTECTER FACEBOOK
  ====================================================== */

  const getFacebookEmbedUrl = (url) => {
    if (!url) return null;

    if (
      url.includes("facebook.com") ||
      url.includes("fb.watch")
    ) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
        url
      )}&show_text=false`;
    }

    return null;
  };

  /* ======================================================
     DÉTECTER TIKTOK
  ====================================================== */

  const isTikTokUrl = (url) => {
    if (!url) return false;

    return (
      url.includes("tiktok.com") ||
      url.includes("vm.tiktok.com")
    );
  };

  /* ======================================================
     DÉTECTER ZOOM
  ====================================================== */

  const isZoomUrl = (url) => {
    if (!url) return false;

    return (
      url.includes("zoom.us") ||
      url.includes("zoom.com")
    );
  };

  /* ======================================================
     INITIALISER HLS
  ====================================================== */

  useEffect(() => {
    if (!live) return;

    const videoUrl =
      live.video_url ||
      live.stream_url ||
      live.url ||
      live.source_url ||
      "";

    if (!videoUrl || !isHlsUrl(videoUrl)) {
      return;
    }

    const video = videoRef.current;

    if (!video) {
      return;
    }

    setPlayerError("");
    setAvailableQualities([]);
    setQuality("auto");

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hlsRef.current = hls;

      hls.loadSource(videoUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        const levels = hls.levels || [];

        const qualities = levels
          .map((level, index) => ({
            index,
            height: level.height,
            bitrate: level.bitrate,
          }))
          .filter(
            (item) =>
              item.height ||
              item.bitrate
          );

        setAvailableQualities(
          qualities
        );
      });

      hls.on(
        Hls.Events.ERROR,
        (_event, data) => {
          console.error(
            "Erreur HLS :",
            data
          );

          if (
            data?.fatal
          ) {
            setPlayerError(
              "Impossible de lire le direct pour le moment."
            );
          }
        }
      );
    } else if (
      video.canPlayType(
        "application/vnd.apple.mpegurl"
      )
    ) {
      video.src = videoUrl;
    } else {
      setPlayerError(
        "Votre navigateur ne supporte pas la lecture du direct."
      );
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [live]);

  /* ======================================================
     CHANGER QUALITÉ
  ====================================================== */

  const handleQualityChange = (event) => {
    const value = event.target.value;

    setQuality(value);

    if (!hlsRef.current) {
      return;
    }

    if (value === "auto") {
      hlsRef.current.currentLevel = -1;
      return;
    }

    hlsRef.current.currentLevel =
      Number(value);
  };

  /* ======================================================
     PLAY / PAUSE
  ====================================================== */

  const handlePlay = async () => {
    const video = videoRef.current;

    if (!video) return;

    try {
      await video.play();
      setIsPlaying(true);
      setPlayerError("");
    } catch (error) {
      console.error(
        "Erreur lecture :",
        error
      );

      setPlayerError(
        "Impossible de démarrer la lecture."
      );
    }
  };

  const handlePause = () => {
    const video = videoRef.current;

    if (!video) return;

    video.pause();
    setIsPlaying(false);
  };

  /* ======================================================
     ÉTATS DE CHARGEMENT
  ====================================================== */

  if (loading) {
    return (
      <main className="live-page">
        <div className="live-loading">
          <div className="live-loader"></div>

          <p>
            Chargement du direct...
          </p>
        </div>
      </main>
    );
  }

  /* ======================================================
     ERREUR
  ====================================================== */

  if (error) {
    return (
      <main className="live-page">
        <section className="live-error">
          <h1>
            Une erreur est survenue
          </h1>

          <p>{error}</p>

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

  /* ======================================================
     AUCUN LIVE
  ====================================================== */

  if (!live) {
    return (
      <main className="live-page">
        <section className="live-offline">
          <div className="live-offline-icon">
            📺
          </div>

          <h1>
            Aucun direct en cours
          </h1>

          <p>
            Mikwo Pèp La n'est pas actuellement
            en direct.
          </p>
        </section>
      </main>
    );
  }

  /* ======================================================
     INFORMATIONS DU LIVE
  ====================================================== */

  const title =
    live.titre ||
    live.title ||
    "Mikwo Pèp La — Direct";

  const description =
    live.description ||
    live.contenu ||
    "";

  const streamUrl =
    live.video_url ||
    live.stream_url ||
    live.url ||
    live.source_url ||
    "";

  const youtubeUrl =
    getYouTubeEmbedUrl(streamUrl);

  const facebookUrl =
    getFacebookEmbedUrl(streamUrl);

  const isTikTok =
    isTikTokUrl(streamUrl);

  const isZoom =
    isZoomUrl(streamUrl);

  const isHls =
    isHlsUrl(streamUrl);

  /* ======================================================
     RENDU PLAYER
  ====================================================== */

  const renderPlayer = () => {
    if (youtubeUrl) {
      return (
        <iframe
          className="live-iframe"
          src={youtubeUrl}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      );
    }

    if (facebookUrl) {
      return (
        <iframe
          className="live-iframe"
          src={facebookUrl}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      );
    }

    if (isTikTok) {
      return (
        <div className="live-external-message">
          <div className="live-external-icon">
            🎵
          </div>

          <h3>
            Direct TikTok
          </h3>

          <p>
            Le direct est disponible sur TikTok.
          </p>

          <a
            href={streamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="live-external-button"
          >
            Ouvrir TikTok
          </a>
        </div>
      );
    }

    if (isZoom) {
      return (
        <div className="live-external-message">
          <div className="live-external-icon">
            🎥
          </div>

          <h3>
            Direct Zoom
          </h3>

          <p>
            Le direct est disponible sur Zoom.
          </p>

          <a
            href={streamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="live-external-button"
          >
            Ouvrir Zoom
          </a>
        </div>
      );
    }

    if (isHls) {
      return (
        <div className="live-video-wrapper">
          <video
            ref={videoRef}
            className="live-video"
            controls
            playsInline
            onPlay={() =>
              setIsPlaying(true)
            }
            onPause={() =>
              setIsPlaying(false)
            }
            onError={() =>
              setPlayerError(
                "Une erreur est survenue pendant la lecture."
              )
            }
          />

          {!isPlaying && (
            <button
              type="button"
              className="live-play-button"
              onClick={handlePlay}
              aria-label="Lire le direct"
            >
              ▶️
            </button>
          )}

          {availableQualities.length >
            0 && (
            <div className="live-quality">
              <label htmlFor="live-quality">
                Qualité
              </label>

              <select
                id="live-quality"
                value={quality}
                onChange={
                  handleQualityChange
                }
              >
                <option value="auto">
                  Auto
                </option>

                {availableQualities.map(
                  (item) => (
                    <option
                      key={item.index}
                      value={item.index}
                    >
                      {item.height
                        ? `${item.height}p`
                        : `${Math.round(
                            item.bitrate / 1000
                          )} kbps`}
                    </option>
                  )
                )}
              </select>
            </div>
          )}
        </div>
      );
    }

    if (streamUrl) {
      return (
        <div className="live-external-message">
          <div className="live-external-icon">
            📡
          </div>

          <h3>
            Direct disponible
          </h3>

          <p>
            Cliquez sur le bouton ci-dessous
            pour accéder au direct.
          </p>

          <a
            href={streamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="live-external-button"
          >
            Ouvrir le direct
          </a>
        </div>
      );
    }

    return (
      <div className="live-external-message">
        <div className="live-external-icon">
          📺
        </div>

        <h3>
          Source indisponible
        </h3>

        <p>
          La source du direct n'est pas
          disponible actuellement.
        </p>
      </div>
    );
  };

  /* ======================================================
     PAGE
  ====================================================== */

  return (
    <main className="live-page">

      {/* ==================================================
          HERO
      ================================================== */}

      <section className="live-hero">
        <div className="live-hero-overlay">
          <div className="live-hero-content">

            <span className="live-badge">
              🔴 EN DIRECT
            </span>

            <h1>
              {title}
            </h1>

            {description && (
              <p>
                {description}
              </p>
            )}

          </div>
        </div>
      </section>

      {/* ==================================================
          CONTENU PRINCIPAL
      ================================================== */}

      <section className="live-content">

        <div className="live-main">

          {/* PLAYER */}

          <div className="live-player-card">

            <div className="live-player">
              {renderPlayer()}
            </div>

            {playerError && (
              <div className="live-player-error">
                {playerError}
              </div>
            )}

          </div>

          {/* INFORMATIONS */}

          <div className="live-info">

            <div className="live-info-top">

              <span className="live-status">
                🔴 EN DIRECT
              </span>

              {live.categorie && (
                <span className="live-category">
                  {live.categorie}
                </span>
              )}

            </div>

            <h2>
              {title}
            </h2>

            {description && (
              <p className="live-description">
                {description}
              </p>
            )}

          </div>

        </div>

        {/* ==================================================
            SIDEBAR
        ================================================== */}

        <aside className="live-sidebar">

          <div className="live-sidebar-card">

            <h3>
              Mikwo Pèp La
            </h3>

            <p>
              Le média du peuple,
              la voix du peuple.
            </p>

            <a
              href="https://www.facebook.com/Mikwo509"
              target="_blank"
              rel="noopener noreferrer"
            >
              Facebook
            </a>

            <a
              href="https://youtube.com/@mikwopepla509?si=L7pCFMmwYVeq7awo"
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

        </aside>

      </section>

    </main>
  );
}

export default Live;
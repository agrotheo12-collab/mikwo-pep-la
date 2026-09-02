import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Link } from "react-router-dom";
import "./Live.css";
import cover from "../assets/logo.JPG";

const API_URL = "http://localhost:3000";

function getYouTubeEmbedUrl(url) {
  if (!url) return "";

  try {
    const parsed = new URL(url);

    if (
      parsed.hostname.includes("youtube.com") ||
      parsed.hostname.includes("youtu.be")
    ) {
      let videoId = "";

      if (parsed.hostname.includes("youtu.be")) {
        videoId = parsed.pathname.replace("/", "");
      }

      if (
        parsed.pathname.includes("/live/") ||
        parsed.pathname.includes("/watch")
      ) {
        videoId =
          parsed.pathname.split("/live/")[1]?.split("/")[0] ||
          parsed.searchParams.get("v") ||
          "";
      }

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1&rel=0`;
      }
    }
  } catch (error) {
    console.error("URL YouTube invalide :", error);
  }

  return "";
}

function isHlsUrl(url) {
  if (!url) return false;

  const value = url.toLowerCase();

  return (
    value.includes(".m3u8") ||
    value.includes("application/vnd.apple.mpegurl") ||
    value.includes("application/x-mpegurl")
  );
}

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

  // =====================================================
  // SESSION SPECTATEUR
  // =====================================================

  const getSessionId = () => {
    let sessionId = localStorage.getItem(
      "mikwo_live_session_id"
    );

    if (!sessionId) {
      sessionId = `viewer-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 12)}`;

      localStorage.setItem(
        "mikwo_live_session_id",
        sessionId
      );
    }

    sessionIdRef.current = sessionId;

    return sessionId;
  };

  // =====================================================
  // CHARGER LE LIVE
  // =====================================================

  const chargerLive = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_URL}/api/live`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Erreur lors du chargement du direct."
        );
      }

      setLive(data.live || null);
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Impossible de charger le direct."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // CHARGEMENT INITIAL
  // =====================================================

  useEffect(() => {
    chargerLive();

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, []);

  // =====================================================
  // ENREGISTRER LE SPECTATEUR
  // =====================================================

  useEffect(() => {
    if (!live) return;

    const sessionId = getSessionId();

    const envoyerPresence = async () => {
      try {
        await fetch(`${API_URL}/api/live/viewer`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            session_id: sessionId,
            id_live: live.id_live,
          }),
        });
      } catch (err) {
        console.error(
          "Erreur présence spectateur :",
          err
        );
      }
    };

    envoyerPresence();

    // Pas de rafraîchissement du LIVE.
    // La présence est seulement actualisée périodiquement.
    const interval = setInterval(
      envoyerPresence,
      30000
    );

    return () => {
      clearInterval(interval);
    };
  }, [live]);

  // =====================================================
  // NETTOYER HLS
  // =====================================================

  const destroyHls = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  };

  // =====================================================
  // CONFIGURER HLS
  // =====================================================

  const setupHls = () => {
    const video = videoRef.current;

    if (!video || !live?.stream_url) return;

    const streamUrl = live.stream_url.trim();

    destroyHls();

    setPlayerError("");
    setAvailableQualities([]);

    // Safari / iPhone / iPad
    if (
      video.canPlayType(
        "application/vnd.apple.mpegurl"
      )
    ) {
      video.src = streamUrl;

      video.play().catch((err) => {
        console.log(
          "Lecture automatique bloquée :",
          err
        );
      });

      return;
    }

    // Chrome / Edge / Firefox
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,

        // Le lecteur choisit automatiquement
        // la meilleure qualité adaptée à Internet.
        startLevel: -1,

        // Tolérance pour connexions faibles.
        maxBufferLength: 20,
        maxMaxBufferLength: 40,

        lowLatencyMode: true,

        backBufferLength: 30,

        capLevelToPlayerSize: true,

        abrEwmaFastLive: 2,
        abrEwmaSlowLive: 5,
      });

      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(
        Hls.Events.MANIFEST_PARSED,
        () => {
          const levels = hls.levels || [];

          const qualities = levels
            .map((level, index) => ({
              index,
              height:
                level.height ||
                0,
              bitrate:
                level.bitrate ||
                0,
            }))
            .filter(
              (item) =>
                item.height > 0
            )
            .sort(
              (a, b) =>
                b.height - a.height
            );

          setAvailableQualities(
            qualities
          );

          video
            .play()
            .catch((err) => {
              console.log(
                "Autoplay bloqué :",
                err
              );
            });
        }
      );

      hls.on(
        Hls.Events.ERROR,
        (event, data) => {
          console.error(
            "Erreur HLS :",
            data
          );

          if (
            data.fatal
          ) {
            switch (
              data.type
            ) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                hls.startLoad();
                break;

              case Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;

              default:
                destroyHls();

                setPlayerError(
                  "La diffusion rencontre un problème. Veuillez réessayer."
                );

                setIsPlaying(false);
                break;
            }
          }
        }
      );

      return;
    }

    setPlayerError(
      "Votre navigateur ne prend pas en charge cette diffusion."
    );
  };

  // =====================================================
  // PLAY
  // =====================================================

  const handlePlay = () => {
    setPlayerError("");

    if (!live) {
      setPlayerError(
        "La diffusion en direct n'est pas disponible pour le moment."
      );

      return;
    }

    if (
      !live.stream_url ||
      !live.stream_url.trim()
    ) {
      setPlayerError(
        "L'URL du direct n'est pas configurée."
      );

      return;
    }

    setIsPlaying(true);
  };

  // =====================================================
  // INITIALISER LE PLAYER
  // =====================================================

  useEffect(() => {
    if (
      isPlaying &&
      live &&
      live.stream_url
    ) {
      const sourceType =
        String(
          live.source_type ||
            ""
        ).toLowerCase();

      const youtubeUrl =
        getYouTubeEmbedUrl(
          live.stream_url
        );

      // YouTube
      if (
        sourceType === "youtube" ||
        youtubeUrl
      ) {
        return;
      }

      // HLS
      if (
        sourceType === "hls" ||
        isHlsUrl(
          live.stream_url
        )
      ) {
        setTimeout(() => {
          setupHls();
        }, 50);
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [isPlaying, live]);

  // =====================================================
  // CHOISIR QUALITÉ
  // =====================================================

  const changerQualite = (value) => {
    setQuality(value);

    if (!hlsRef.current) {
      return;
    }

    const hls = hlsRef.current;

    if (value === "auto") {
      hls.currentLevel = -1;
      return;
    }

    const selected = Number(value);

    if (
      Number.isInteger(
        selected
      )
    ) {
      hls.currentLevel =
        selected;
    }
  };

  // =====================================================
  // ERREUR VIDEO
  // =====================================================

  const handleVideoError = () => {
    setPlayerError(
      "Impossible de charger la diffusion. Vérifiez le flux du direct."
    );
  };

  // =====================================================
  // TYPE DE SOURCE
  // =====================================================

  const sourceType = String(
    live?.source_type || ""
  ).toLowerCase();

  const youtubeEmbedUrl =
    live?.stream_url
      ? getYouTubeEmbedUrl(
          live.stream_url
        )
      : "";

  const isYoutube =
    sourceType === "youtube" ||
    Boolean(youtubeEmbedUrl);

  const isHls =
    sourceType === "hls" ||
    isHlsUrl(
      live?.stream_url
    );

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <main className="live-page">

      {/* =================================================
          HERO
      ================================================= */}

      <section
        className="live-hero"
        style={{
          backgroundImage: `url(${cover})`,
        }}
      >
        <div className="live-hero-overlay"></div>

        <div className="live-container live-hero-content">

          <div className="live-label">
            <span className="live-dot"></span>

            {live?.statut === "live"
              ? "EN DIRECT"
              : "HORS LIGNE"}
          </div>

          <h1>
            MIKWO PÈP LA
          </h1>

          <p>
            Suivez Mikwo Pèp La en
            direct, partout où vous êtes.
          </p>

        </div>
      </section>

      {/* =================================================
          PLAYER
      ================================================= */}

      <section className="live-player-section">

        <div className="live-container">

          {loading ? (

            <div className="live-loading">
              <div className="live-spinner"></div>

              <span>
                Chargement du direct...
              </span>
            </div>

          ) : error ? (

            <div className="live-error">
              {error}
            </div>

          ) : (

            <div className="live-layout">

              <div className="live-main">

                <div
                  className={
                    `live-player ${
                      isPlaying
                        ? "live-player-playing"
                        : ""
                    }`
                  }
                >

                  {!isPlaying ? (

                    <div
                      className="live-player-placeholder"
                      style={{
                        backgroundImage: `url(${cover})`,
                      }}
                    >
                      <div className="live-placeholder-overlay"></div>

                      <div className="live-placeholder-content">

                        <span className="live-big-badge">
                          {live?.statut ===
                          "live"
                            ? "🔴 EN DIRECT"
                            : "⚫ HORS LIGNE"}
                        </span>

                        <button
                          type="button"
                          className="live-play-button"
                          onClick={
                            handlePlay
                          }
                          aria-label="Lancer le direct"
                        >
                          ▶️
                        </button>

                        <h2>
                          {live?.titre ||
                            "MIKWO PÈP LA"}
                        </h2>

                        <p>
                          {playerError ||
                            (live
                              ? live.description ||
                                "Cliquez sur lecture pour suivre le direct."
                              : "La diffusion en direct n'est pas disponible pour le moment.")}
                        </p>

                      </div>
                    </div>

                  ) : (

                    <div className="live-video-wrapper">

                      {isYoutube &&
                      youtubeEmbedUrl ? (

                        <iframe
                          className="live-youtube"
                          src={
                            youtubeEmbedUrl
                          }
                          title={
                            live?.titre ||
                            "Mikwo Pèp La en direct"
                          }
                          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                          allowFullScreen
                        ></iframe>

                      ) : isHls ? (

                        <>
                          <video
                            ref={videoRef}
                            className="live-video"
                            controls
                            autoPlay
                            playsInline
                            muted={false}
                            onError={
                              handleVideoError
                            }
                          />

                          {availableQualities.length >
                            0 && (
                            <div className="live-quality">

                              <label htmlFor="quality">
                                Qualité
                              </label>

                              <select
                                id="quality"
                                value={quality}
                                onChange={(e) =>
                                  changerQualite(
                                    e.target.value
                                  )
                                }
                              >
                                <option value="auto">
                                  Auto — recommandé
                                </option>

                                {availableQualities.map(
                                  (item) => (
                                    <option
                                      key={
                                        item.index
                                      }
                                      value={
                                        item.index
                                      }
                                    >
                                      {item.height}p
                                    </option>
                                  )
                                )}
                              </select>

                            </div>
                          )}

                        </>

                      ) : (

                        <video
                          ref={videoRef}
                          className="live-video"
                          src={
                            live?.stream_url
                          }
                          controls
                          autoPlay
                          playsInline
                          onError={
                            handleVideoError
                          }
                        >
                          Votre navigateur ne
                          prend pas en charge
                          la lecture vidéo.
                        </video>

                      )}

                      {playerError && (
                        <div className="live-player-error">
                          {playerError}
                        </div>
                      )}

                    </div>

                  )}

                </div>

                {/* =================================================
                    INFO
                ================================================= */}

                <div className="live-info">

                  <div className="live-info-top">

                    <span className="live-status">
                      <span className="live-status-dot"></span>

                      {live?.statut ===
                      "live"
                        ? "EN DIRECT"
                        : "HORS LIGNE"}
                    </span>

                    <span className="live-type">
                      Web TV
                    </span>

                  </div>

                  <h2>
                    {live?.titre ||
                      "Mikwo Pèp La — En direct"}
                  </h2>

                  <p>
                    {live?.description ||
                      "Retrouvez nos émissions, reportages, informations et événements sur Mikwo Pèp La."}
                  </p>

                </div>

              </div>

              {/* =================================================
                  SIDEBAR
              ================================================= */}

              <aside className="live-sidebar">

                <div className="live-sidebar-header">
                  <span>
                    MIKWO PÈP LA TV
                  </span>

                  <h2>
                    Votre Web TV
                  </h2>
                </div>

                <div className="live-sidebar-content">

                  <div className="live-sidebar-item">
                    <span>📺</span>

                    <div>
                      <strong>
                        Direct
                      </strong>

                      <p>
                        Regardez nos
                        émissions en temps
                        réel.
                      </p>
                    </div>
                  </div>

                  <div className="live-sidebar-item">
                    <span>📰</span>

                    <div>
                      <strong>
                        Actualités
                      </strong>

                      <p>
                        L'information au
                        service du peuple.
                      </p>
                    </div>
                  </div>

                  <div className="live-sidebar-item">
                    <span>🎥</span>

                    <div>
                      <strong>
                        Vidéos
                      </strong>

                      <p>
                        Retrouvez nos
                        contenus vidéo.
                      </p>
                    </div>
                  </div>

                </div>

                <Link
                  to="/actualites"
                  className="live-sidebar-button"
                >
                  Voir les actualités →
                </Link>

              </aside>

            </div>

          )}

        </div>
      </section>

      {/* =================================================
          POURQUOI SUIVRE
      ================================================= */}

      <section className="live-types-section">

        <div className="live-container">

          <div className="live-section-heading">

            <span>
              MIKWO PÈP LA
            </span>

            <h2>
              Suivez-nous en direct
            </h2>

            <p>
              Une information proche du
              peuple, accessible partout,
              même avec une connexion limitée.
            </p>

          </div>

          <div className="live-types-grid">

            <article className="live-type-card">
              <span>🔴</span>

              <h3>
                En temps réel
              </h3>

              <p>
                Suivez les événements
                importants au moment où
                ils se produisent.
              </p>
            </article>

            <article className="live-type-card">
              <span>📡</span>

              <h3>
                Qualité automatique
              </h3>

              <p>
                Le lecteur HLS peut adapter
                automatiquement la qualité
                à la connexion disponible.
              </p>
            </article>

            <article className="live-type-card">
              <span>📱</span>

              <h3>
                Sur tous vos appareils
              </h3>

              <p>
                Téléphone, tablette,
                ordinateur ou télévision
                compatible.
              </p>
            </article>

          </div>

        </div>
      </section>

      {/* =================================================
          RÉSEAUX SOCIAUX
      ================================================= */}

      <section className="live-social">

        <div className="live-container">

          <span>
            RESTEZ CONNECTÉS
          </span>

          <h2>
            Suivez Mikwo Pèp La
          </h2>

          <p>
            Retrouvez-nous également sur
            nos réseaux sociaux.
          </p>

          <div className="live-social-buttons">

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

export default Live;
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminLive.css";

const API_URL = "http://localhost:3000";

function AdminLive() {
  const navigate = useNavigate();

  const [lives, setLives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState(null);

  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [sourceType, setSourceType] = useState("hls");
  const [streamUrl, setStreamUrl] = useState("");
  const [statut, setStatut] = useState("offline");

  // =====================================================
  // TOKEN
  // =====================================================

  const getToken = () => {
    return localStorage.getItem("mikwo_pep_la_token");
  };

  // =====================================================
  // NORMALISER URL
  // =====================================================

  const normalizeUrl = (url) => {
    if (!url) return "";

    let value = String(url).trim();

    if (!value) return "";

    if (
      !value.startsWith("http://") &&
      !value.startsWith("https://")
    ) {
      value = `https://${value}`;
    }

    return value;
  };

  // =====================================================
  // NOM SOURCE
  // =====================================================

  const getSourceLabel = (source) => {
    switch (source) {
      case "youtube":
        return "YouTube";

      case "facebook":
        return "Facebook";

      case "tiktok":
        return "TikTok";

      case "obs":
        return "OBS / Stream";

      case "switcher":
        return "Switcher";

      case "hls":
        return "HLS";

      case "mp4":
        return "MP4";

      case "custom":
        return "Autre";

      default:
        return source || "Autre";
    }
  };

  // =====================================================
  // ICONE
  // =====================================================

  const getSourceIcon = (source) => {
    switch (source) {
      case "youtube":
        return "▶️";

      case "facebook":
        return "📘";

      case "tiktok":
        return "🎵";

      case "obs":
        return "🎬";

      case "switcher":
        return "🎥";

      case "hls":
        return "📡";

      case "mp4":
        return "🎞️";

      default:
        return "🌐";
    }
  };

  // =====================================================
  // PLACEHOLDER
  // =====================================================

  const getUrlPlaceholder = () => {
    switch (sourceType) {
      case "youtube":
        return "https://www.youtube.com/live/XXXXXXXXXXX";

      case "facebook":
        return "https://www.facebook.com/...";

      case "tiktok":
        return "https://www.tiktok.com/...";

      case "hls":
        return "https://serveur.com/live/stream.m3u8";

      case "mp4":
        return "https://serveur.com/video/live.mp4";

      case "obs":
        return "https://serveur.com/live/stream.m3u8";

      case "switcher":
        return "https://serveur.com/live/stream.m3u8";

      default:
        return "https://serveur.com/live/stream";
    }
  };

  // =====================================================
  // CHARGER LES LIVES
  // =====================================================

  const chargerLives = async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      if (!token) {
        navigate("/login");
        return;
      }

      const response = await fetch(
        `${API_URL}/api/live/all`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Erreur lors du chargement des directs."
        );
      }

      setLives(
        Array.isArray(data.lives)
          ? data.lives
          : []
      );
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Erreur lors du chargement des directs."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // CHARGEMENT
  // =====================================================

  useEffect(() => {
    chargerLives();
  }, []);

  // =====================================================
  // RESET
  // =====================================================

  const resetForm = () => {
    setEditingId(null);
    setTitre("");
    setDescription("");
    setSourceType("hls");
    setStreamUrl("");
    setStatut("offline");

    setMessage("");
    setError("");
  };

  // =====================================================
  // NOUVEAU
  // =====================================================

  const nouveauLive = () => {
    resetForm();

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =====================================================
  // MODIFIER
  // =====================================================

  const modifierLive = (live) => {
    setEditingId(live.id_live);

    setTitre(live.titre || "");

    setDescription(
      live.description || ""
    );

    setSourceType(
      live.source_type || "hls"
    );

    setStreamUrl(
      live.stream_url || ""
    );

    setStatut(
      live.statut === "live"
        ? "live"
        : "offline"
    );

    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =====================================================
  // VALIDATION URL
  // =====================================================

  const validateStreamUrl = () => {
    const url = normalizeUrl(streamUrl);

    if (!url) {
      return "L'URL ou le lien du direct est obligatoire.";
    }

    try {
      new URL(url);
    } catch {
      return "Veuillez entrer une URL valide.";
    }

    if (sourceType === "youtube") {
      if (
        !url.includes("youtube.com") &&
        !url.includes("youtu.be")
      ) {
        return "Veuillez entrer un lien YouTube valide.";
      }
    }

    if (sourceType === "facebook") {
      if (!url.includes("facebook.com")) {
        return "Veuillez entrer un lien Facebook valide.";
      }
    }

    if (sourceType === "tiktok") {
      if (!url.includes("tiktok.com")) {
        return "Veuillez entrer un lien TikTok valide.";
      }
    }

    if (sourceType === "hls") {
      if (
        !url.toLowerCase().includes(".m3u8")
      ) {
        return "Pour HLS, l'URL doit normalement se terminer par .m3u8.";
      }
    }

    return "";
  };

  // =====================================================
  // ENREGISTRER
  // =====================================================

  const enregistrerLive = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!titre.trim()) {
      setError(
        "Le titre du direct est obligatoire."
      );
      return;
    }

    const urlError = validateStreamUrl();

    if (urlError) {
      setError(urlError);
      return;
    }

    const token = getToken();

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      setSaving(true);

      const body = {
        titre: titre.trim(),

        description:
          description.trim(),

        source_type:
          sourceType,

        stream_url:
          normalizeUrl(streamUrl),

        statut,
      };

      const url = editingId
        ? `${API_URL}/api/live/${editingId}`
        : `${API_URL}/api/live`;

      const method = editingId
        ? "PUT"
        : "POST";

      const response = await fetch(
        url,
        {
          method,

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify(body),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Erreur lors de l'enregistrement."
        );
      }

      setMessage(
        editingId
          ? "Direct modifié avec succès."
          : "Direct créé avec succès."
      );

      resetForm();

      await chargerLives();
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Erreur lors de l'enregistrement du direct."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // SUPPRIMER
  // =====================================================

  const supprimerLive = async (id) => {
    const confirmation =
      window.confirm(
        "Voulez-vous vraiment supprimer ce direct ?"
      );

    if (!confirmation) {
      return;
    }

    try {
      setError("");
      setMessage("");

      const token = getToken();

      if (!token) {
        navigate("/login");
        return;
      }

      const response =
        await fetch(
          `${API_URL}/api/live/${id}`,
          {
            method: "DELETE",

            headers: {
              Authorization:
                `Bearer ${token}`,
            },
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Impossible de supprimer le direct."
        );
      }

      setMessage(
        "Direct supprimé avec succès."
      );

      await chargerLives();
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Erreur lors de la suppression."
      );
    }
  };

  // =====================================================
  // CHANGER STATUT
  // =====================================================

  const changerStatut = async (live) => {
    try {
      setError("");
      setMessage("");

      const token = getToken();

      if (!token) {
        navigate("/login");
        return;
      }

      const nouveauStatut =
        live.statut === "live"
          ? "offline"
          : "live";

      const response =
        await fetch(
          `${API_URL}/api/live/${live.id_live}`,
          {
            method: "PUT",

            headers: {
              "Content-Type":
                "application/json",

              Authorization:
                `Bearer ${token}`,
            },

            body: JSON.stringify({
              titre:
                live.titre || "",

              description:
                live.description || "",

              source_type:
                live.source_type || "hls",

              stream_url:
                live.stream_url || "",

              statut:
                nouveauStatut,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Impossible de modifier le statut."
        );
      }

      setMessage(
        nouveauStatut === "live"
          ? "Le direct est maintenant EN DIRECT."
          : "Le direct est maintenant HORS LIGNE."
      );

      await chargerLives();
    } catch (err) {
      console.error(err);

      setError(
        err.message ||
          "Erreur lors du changement de statut."
      );
    }
  };

  // =====================================================
  // RENDER
  // =====================================================

  return (
    <main className="admin-live-page">

      <section className="admin-live-header">

        <div>
          <span className="admin-live-eyebrow">
            MIKWO PÈP LA TV
          </span>

          <h1>
            Gestion du direct
          </h1>

          <p>
            Gérez toutes vos sources de
            diffusion depuis un seul endroit.
          </p>
        </div>

        <button
          type="button"
          className="admin-live-back"
          onClick={() =>
            navigate("/admin")
          }
        >
          ← Retour
        </button>

      </section>

      {message && (
        <div className="admin-live-success">
          {message}
        </div>
      )}

      {error && (
        <div className="admin-live-error">
          {error}
        </div>
      )}

      <section className="admin-live-form-section">

        <div className="admin-live-card">

          <div className="admin-live-card-header">

            <div>
              <span>
                {editingId
                  ? "MODIFICATION"
                  : "NOUVEAU DIRECT"}
              </span>

              <h2>
                {editingId
                  ? "Modifier le direct"
                  : "Créer un direct"}
              </h2>
            </div>

            {editingId && (
              <button
                type="button"
                className="admin-live-cancel"
                onClick={resetForm}
              >
                Annuler
              </button>
            )}

          </div>

          <form
            onSubmit={enregistrerLive}
            className="admin-live-form"
          >

            <div className="admin-live-field">

              <label htmlFor="live-titre">
                Titre du direct
              </label>

              <input
                id="live-titre"
                type="text"
                value={titre}
                onChange={(e) =>
                  setTitre(e.target.value)
                }
                placeholder="Ex : Mikwo Pèp La — En direct"
              />

            </div>

            <div className="admin-live-field">

              <label htmlFor="live-description">
                Description
              </label>

              <textarea
                id="live-description"
                value={description}
                onChange={(e) =>
                  setDescription(e.target.value)
                }
                placeholder="Description du direct..."
                rows="4"
              />

            </div>

            <div className="admin-live-field">

              <label htmlFor="live-source">
                Source de diffusion
              </label>

              <select
                id="live-source"
                value={sourceType}
                onChange={(e) =>
                  setSourceType(e.target.value)
                }
              >

                <option value="hls">
                  📡 HLS / .m3u8
                </option>

                <option value="youtube">
                  ▶️ YouTube
                </option>

                <option value="facebook">
                  📘 Facebook Live
                </option>

                <option value="tiktok">
                  🎵 TikTok Live
                </option>

                <option value="obs">
                  🎬 OBS / Encoder
                </option>

                <option value="switcher">
                  🎥 Switcher
                </option>

                <option value="mp4">
                  🎞️ MP4 / Flux vidéo
                </option>

                <option value="custom">
                  🌐 Autre source
                </option>

              </select>

              <small>
                Choisissez la plateforme ou le
                type de flux utilisé.
              </small>

            </div>

            <div className="admin-live-field">

              <label htmlFor="live-stream-url">
                URL / lien de diffusion
              </label>

              <input
                id="live-stream-url"
                type="text"
                value={streamUrl}
                onChange={(e) =>
                  setStreamUrl(e.target.value)
                }
                placeholder={getUrlPlaceholder()}
              />

              <small>
                {sourceType === "hls" &&
                  "Utilisez une URL .m3u8 directe."}

                {sourceType === "youtube" &&
                  "Tous les formats YouTube classiques sont acceptés."}

                {sourceType === "facebook" &&
                  "Utilisez le lien de la diffusion Facebook."}

                {sourceType === "tiktok" &&
                  "Utilisez le lien de votre TikTok Live."}

                {sourceType === "obs" &&
                  "Fournissez l'URL HLS générée par votre serveur de streaming."}

                {sourceType === "switcher" &&
                  "Fournissez l'URL de lecture de votre serveur ou CDN."}

                {sourceType === "mp4" &&
                  "Utilisez une URL directe vers le flux vidéo."}

                {sourceType === "custom" &&
                  "Entrez l'URL de votre source."}
              </small>

            </div>

            <div className="admin-live-field">

              <label htmlFor="live-status">
                Statut
              </label>

              <select
                id="live-status"
                value={statut}
                onChange={(e) =>
                  setStatut(e.target.value)
                }
              >

                <option value="offline">
                  Hors ligne
                </option>

                <option value="live">
                  En direct
                </option>

              </select>

            </div>

            <button
              type="submit"
              className="admin-live-submit"
              disabled={saving}
            >
              {saving
                ? "Enregistrement..."
                : editingId
                ? "Modifier le direct"
                : "Créer le direct"}
            </button>

          </form>

        </div>

      </section>

      <section className="admin-live-list-section">

        <div className="admin-live-list-header">

          <div>
            <span>
              ADMINISTRATION
            </span>

            <h2>
              Vos directs
            </h2>
          </div>

          <button
            type="button"
            className="admin-live-new-button"
            onClick={nouveauLive}
          >
            + Nouveau direct
          </button>

        </div>

        {loading ? (

          <div className="admin-live-loading">
            Chargement des directs...
          </div>

        ) : lives.length === 0 ? (

          <div className="admin-live-empty">

            <div>📡</div>

            <h3>
              Aucun direct
            </h3>

            <p>
              Créez votre premier direct
              pour commencer.
            </p>

          </div>

        ) : (

          <div className="admin-live-grid">

            {lives.map((live) => (

              <article
                key={live.id_live}
                className="admin-live-item"
              >

                <div className="admin-live-item-top">

                  <span
                    className={
                      live.statut === "live"
                        ? "status-live"
                        : "status-offline"
                    }
                  >

                    <span></span>

                    {live.statut === "live"
                      ? "EN DIRECT"
                      : "HORS LIGNE"}

                  </span>

                  <span className="admin-live-id">
                    #{live.id_live}
                  </span>

                </div>

                <div className="admin-live-source">

                  <span>
                    {getSourceIcon(
                      live.source_type
                    )}
                  </span>

                  <strong>
                    {getSourceLabel(
                      live.source_type
                    )}
                  </strong>

                </div>

                <h3>
                  {live.titre}
                </h3>

                {live.description && (
                  <p>
                    {live.description}
                  </p>
                )}

                <div className="admin-live-url">

                  <strong>
                    Source :
                  </strong>

                  <span>
                    {live.stream_url}
                  </span>

                </div>

                <div className="admin-live-viewers">

                  <span>👁️</span>

                  <strong>
                    {live.spectateurs || 0}
                  </strong>

                  <span>
                    spectateur
                    {Number(
                      live.spectateurs
                    ) > 1
                      ? "s"
                      : ""}
                  </span>

                </div>

                <div className="admin-live-actions">

                  <button
                    type="button"
                    className={
                      live.statut === "live"
                        ? "button-offline"
                        : "button-live"
                    }
                    onClick={() =>
                      changerStatut(live)
                    }
                  >
                    {live.statut === "live"
                      ? "⏹ Arrêter"
                      : "🔴 Démarrer"}
                  </button>

                  <button
                    type="button"
                    className="button-edit"
                    onClick={() =>
                      modifierLive(live)
                    }
                  >
                    ✏️ Modifier
                  </button>

                  <button
                    type="button"
                    className="button-delete"
                    onClick={() =>
                      supprimerLive(
                        live.id_live
                      )
                    }
                  >
                    🗑️
                  </button>

                </div>

              </article>

            ))}

          </div>

        )}

      </section>

    </main>
  );
}

export default AdminLive;
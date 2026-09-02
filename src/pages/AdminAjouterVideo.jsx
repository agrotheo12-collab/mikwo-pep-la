import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminAjouterVideo.css";

function AdminAjouterVideo() {
  const navigate = useNavigate();

  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [statut, setStatut] = useState("brouillon");

  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ======================================================
  // SÉLECTION DE LA VIDÉO
  // ======================================================

  const handleVideoChange = (event) => {
    const file = event.target.files?.[0];

    setError("");
    setMessage("");

    if (!file) {
      setVideoFile(null);
      setVideoPreview("");
      return;
    }

    // Formats autorisés
    const allowedTypes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-msvideo",
      "video/mpeg",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Format vidéo non autorisé. Utilisez MP4, WebM, MOV, AVI ou MPEG."
      );

      event.target.value = "";
      setVideoFile(null);
      setVideoPreview("");

      return;
    }

    // Taille maximale : 500 MB
    const maxSize = 500 * 1024 * 1024;

    if (file.size > maxSize) {
      setError(
        "La vidéo ne doit pas dépasser 500 MB."
      );

      event.target.value = "";
      setVideoFile(null);
      setVideoPreview("");

      return;
    }

    // Supprimer l'ancien preview
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }

    setVideoFile(file);

    const previewUrl = URL.createObjectURL(file);

    setVideoPreview(previewUrl);
  };

  // ======================================================
  // SOUMISSION
  // ======================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setMessage("");

    // Vérifier le titre
    if (!titre.trim()) {
      setError(
        "Veuillez saisir le titre de la vidéo."
      );
      return;
    }

    // Vérifier la vidéo
    if (!videoFile) {
      setError(
        "Veuillez sélectionner une vidéo depuis votre Mac."
      );
      return;
    }

    // Récupérer le token
    const token = localStorage.getItem(
      "mikwo_pep_la_token"
    );

    if (!token) {
      setError(
        "Votre session administrateur a expiré. Veuillez vous reconnecter."
      );

      navigate("/admin/login");

      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();

      // Informations vidéo
      formData.append(
        "titre",
        titre.trim()
      );

      formData.append(
        "description",
        description.trim()
      );

      formData.append(
        "statut",
        statut
      );

      // Fichier vidéo
      formData.append(
        "video",
        videoFile
      );

      // ==================================================
      // ENVOI AU SERVEUR
      // ==================================================

      const response = await fetch(
        "/api/videos",
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${token}`,
          },

          body: formData,
        }
      );

      const data = await response.json();

      // ==================================================
      // SESSION EXPIRÉE
      // ==================================================

      if (response.status === 401) {
        localStorage.removeItem(
          "mikwo_pep_la_token"
        );

        localStorage.removeItem(
          "mikwo_pep_la_user"
        );

        navigate("/admin/login");

        return;
      }

      // ==================================================
      // ERREUR SERVEUR
      // ==================================================

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Erreur lors de l'upload de la vidéo."
        );
      }

      // ==================================================
      // SUCCÈS
      // ==================================================

      setMessage(
        "Vidéo uploadée avec succès."
      );

      // Réinitialiser le formulaire
      setTitre("");
      setDescription("");
      setStatut("brouillon");
      setVideoFile(null);

      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }

      setVideoPreview("");

      // Réinitialiser le champ fichier
      const fileInput =
        document.getElementById("video");

      if (fileInput) {
        fileInput.value = "";
      }

      // Retour vers la liste des vidéos
      setTimeout(() => {
        navigate("/admin/videos");
      }, 1000);

    } catch (err) {
      console.error(
        "Erreur upload vidéo :",
        err
      );

      setError(
        err.message ||
          "Une erreur est survenue lors de l'upload."
      );
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // ANNULER
  // ======================================================

  const handleCancel = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }

    navigate("/admin/videos");
  };

  // ======================================================
  // FORMAT TAILLE
  // ======================================================

  const formatFileSize = (bytes) => {
    if (!bytes) {
      return "0 MB";
    }

    const mb = bytes / (1024 * 1024);

    return `${mb.toFixed(2)} MB`;
  };

  // ======================================================
  // AFFICHAGE
  // ======================================================

  return (
    <main className="admin-video-page">

      <div className="admin-video-container">

        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="admin-video-header">

          <div>

            <span className="admin-video-label">
              ADMINISTRATION
            </span>

            <h1>
              Ajouter une vidéo
            </h1>

            <p>
              Importez une vidéo directement
              depuis votre ordinateur.
            </p>

          </div>

          <button
            type="button"
            className="admin-video-back"
            onClick={handleCancel}
          >
            ← Retour aux vidéos
          </button>

        </div>

        {/* ==================================================
            MESSAGES
        ================================================== */}

        {message && (
          <div className="admin-video-success">
            ✓ {message}
          </div>
        )}

        {error && (
          <div className="admin-video-error">
            ⚠ {error}
          </div>
        )}

        {/* ==================================================
            FORMULAIRE
        ================================================== */}

        <form
          className="admin-video-form"
          onSubmit={handleSubmit}
        >

          {/* ==================================================
              INFORMATIONS DE LA VIDÉO
          ================================================== */}

          <section className="admin-video-card">

            <div className="admin-video-card-header">

              <h2>
                Informations de la vidéo
              </h2>

              <p>
                Renseignez les informations
                principales.
              </p>

            </div>

            {/* TITRE */}

            <div className="admin-form-group">

              <label htmlFor="titre">
                Titre *
              </label>

              <input
                id="titre"
                type="text"
                value={titre}
                onChange={(e) =>
                  setTitre(e.target.value)
                }
                placeholder="Ex. Actualités du jour"
                required
              />

            </div>

            {/* DESCRIPTION */}

            <div className="admin-form-group">

              <label htmlFor="description">
                Description
              </label>

              <textarea
                id="description"
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                placeholder="Décrivez brièvement cette vidéo..."
                rows="6"
              />

            </div>

            {/* STATUT */}

            <div className="admin-form-group">

              <label htmlFor="statut">
                Statut
              </label>

              <select
                id="statut"
                value={statut}
                onChange={(e) =>
                  setStatut(e.target.value)
                }
              >

                <option value="brouillon">
                  Brouillon
                </option>

                <option value="publie">
                  Publié
                </option>

                <option value="archive">
                  Archivé
                </option>

              </select>

            </div>

          </section>

          {/* ==================================================
              UPLOAD VIDÉO
          ================================================== */}

          <section className="admin-video-card">

            <div className="admin-video-card-header">

              <h2>
                Fichier vidéo
              </h2>

              <p>
                Sélectionnez une vidéo depuis
                votre Mac.
              </p>

            </div>

            <div className="admin-video-upload">

              <label
                htmlFor="video"
                className="admin-video-upload-box"
              >

                <div className="admin-video-upload-icon">
                  🎬
                </div>

                <strong>
                  Choisir une vidéo
                </strong>

                <span>
                  MP4, WebM, MOV, AVI ou MPEG
                </span>

                <small>
                  Taille maximale : 500 MB
                </small>

              </label>

              <input
                id="video"
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,video/mpeg"
                onChange={handleVideoChange}
                hidden
              />

            </div>

            {/* ==================================================
                FICHIER SÉLECTIONNÉ
            ================================================== */}

            {videoFile && (
              <div className="admin-video-file">

                <div className="admin-video-file-info">

                  <span className="admin-video-file-icon">
                    🎥
                  </span>

                  <div>

                    <strong>
                      {videoFile.name}
                    </strong>

                    <span>
                      {formatFileSize(
                        videoFile.size
                      )}
                    </span>

                  </div>

                </div>

              </div>
            )}

            {/* ==================================================
                APERÇU
            ================================================== */}

            {videoPreview && (
              <div className="admin-video-preview">

                <h3>
                  Aperçu
                </h3>

                <video
                  src={videoPreview}
                  controls
                  preload="metadata"
                />

              </div>
            )}

          </section>

          {/* ==================================================
              BOUTONS
          ================================================== */}

          <div className="admin-video-actions">

            <button
              type="button"
              className="admin-video-cancel"
              onClick={handleCancel}
              disabled={loading}
            >
              Annuler
            </button>

            <button
              type="submit"
              className="admin-video-submit"
              disabled={loading}
            >

              {loading ? (
                <>
                  Upload en cours...
                </>
              ) : (
                <>
                  🎬 Publier la vidéo
                </>
              )}

            </button>

          </div>

        </form>

      </div>

    </main>
  );
}

export default AdminAjouterVideo;
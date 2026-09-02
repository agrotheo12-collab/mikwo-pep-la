import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminVideos.css";
const API_URL = import.meta.env.VITE_API_URL;
const categories = [
  { id: 1, nom: "Politique" },
  { id: 2, nom: "Société" },
  { id: 3, nom: "Économie" },
  { id: 4, nom: "Sport" },
  { id: 5, nom: "Culture" },
  { id: 6, nom: "Interview" },
  { id: 7, nom: "Service religieux" },
  { id: 8, nom: "Élections" },
  { id: 9, nom: "Agriculture" },
  { id: 10, nom: "Santé" },
  { id: 11, nom: "Éducation" },
  { id: 12, nom: "Technologie" },
];
function AdminVideos() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingVideo, setEditingVideo] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [editForm, setEditForm] = useState({
    titre: "",
    description: "",
    thumbnail: "",
    video_url: "",
    statut: "publie",
    id_categorie: "8",
  });
  const getToken = () => {
    return localStorage.getItem("mikwo_pep_la_token");
  };
  const logout = () => {
    localStorage.removeItem("mikwo_pep_la_token");
    localStorage.removeItem("mikwo_pep_la_user");
    navigate("/admin/login");
  };
  // ======================================================
  // CHARGER VIDÉOS
  // ======================================================
  const chargerVideos = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await fetch(
        `${API_URL}/api/videos`
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          data.message ||
            "Erreur lors du chargement des vidéos."
        );
      }
      setVideos(
        Array.isArray(data)
          ? data
          : data.videos || []
      );
    } catch (err) {
      console.error(err);
      setError(
        "Impossible de charger les vidéos."
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    chargerVideos();
  }, []);
  // ======================================================
  // URL FICHIER
  // ======================================================
  const getFileUrl = (url) => {
    if (!url) return "";
    if (
      url.startsWith("http://") ||
      url.startsWith("https://")
    ) {
      return url;
    }
    return `${API_URL}${
      url.startsWith("/") ? url : `/${url}`
    }`;
  };
  // ======================================================
  // SUPPRIMER
  // ======================================================
  const supprimerVideo = async (id) => {
    const confirmation = window.confirm(
      "Voulez-vous vraiment supprimer cette vidéo ?"
    );
    if (!confirmation) return;
    const token = getToken();
    if (!token) {
      logout();
      return;
    }
    try {
      setMessage("");
      setError("");
      const response = await fetch(
        `${API_URL}/api/videos/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      const data = await response.json();
      if (response.status === 401) {
        logout();
        return;
      }
      if (!response.ok) {
        throw new Error(
          data.message ||
            "Erreur lors de la suppression."
        );
      }
      setVideos((previous) =>
        previous.filter(
          (video) =>
            video.id_video !== id
        )
      );
      setMessage(
        "La vidéo a été supprimée avec succès."
      );
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Erreur lors de la suppression."
      );
    }
  };
  // ======================================================
  // OUVRIR MODIFICATION
  // ======================================================
  const ouvrirModification = (video) => {
    setEditingVideo(video);
    setEditForm({
      titre: video.titre || "",
      description: video.description || "",
      thumbnail: video.thumbnail || "",
      video_url: video.video_url || "",
      statut: video.statut || "publie",
      id_categorie: String(
        video.id_categorie || 8
      ),
    });
    setMessage("");
    setError("");
  };
  // ======================================================
  // FERMER MODIFICATION
  // ======================================================
  const fermerModification = () => {
    setEditingVideo(null);
    setEditForm({
      titre: "",
      description: "",
      thumbnail: "",
      video_url: "",
      statut: "publie",
      id_categorie: "8",
    });
  };
  // ======================================================
  // FORMULAIRE
  // ======================================================
  const handleEditChange = (event) => {
    const {
      name,
      value,
    } = event.target;
    setEditForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };
  // ======================================================
  // MODIFIER
  // ======================================================
  const modifierVideo = async (event) => {
    event.preventDefault();
    if (!editingVideo) return;
    const token = getToken();
    if (!token) {
      logout();
      return;
    }
    if (!editForm.titre.trim()) {
      setError(
        "Le titre de la vidéo est obligatoire."
      );
      return;
    }
    if (!editForm.video_url.trim()) {
      setError(
        "L'URL de la vidéo est obligatoire."
      );
      return;
    }
    if (!editForm.id_categorie) {
      setError(
        "Veuillez sélectionner une catégorie."
      );
      return;
    }
    try {
      setMessage("");
      setError("");
      const response = await fetch(
        `${API_URL}/api/videos/${editingVideo.id_video}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            titre: editForm.titre.trim(),
            description:
              editForm.description.trim(),
            thumbnail:
              editForm.thumbnail.trim() ||
              null,
            video_url:
              editForm.video_url.trim(),
            statut:
              editForm.statut,
            id_categorie:
              Number(
                editForm.id_categorie
              ),
          }),
        }
      );
      const data = await response.json();
      if (response.status === 401) {
        logout();
        return;
      }
      if (!response.ok) {
        throw new Error(
          data.message ||
            "Erreur lors de la modification."
        );
      }
      const videoModifiee =
        data.video ||
        data.data ||
        data;
      setVideos((previous) =>
        previous.map((video) =>
          video.id_video ===
          editingVideo.id_video
            ? {
                ...video,
                ...videoModifiee,
              }
            : video
        )
      );
      setMessage(
        "La vidéo a été modifiée avec succès."
      );
      fermerModification();
    } catch (err) {
      console.error(err);
      setError(
        err.message ||
          "Erreur lors de la modification."
      );
    }
  };
  // ======================================================
  // LECTEUR
  // ======================================================
  const ouvrirLecteur = (video) => {
    setPlayingVideo(video);
  };
  const fermerLecteur = () => {
    setPlayingVideo(null);
  };
  // ======================================================
  // RENDU
  // ======================================================
  return (
    <main className="admin-videos-page">
      <section className="admin-videos-header">
        <div className="admin-videos-container">
          <h1>
            GESTION DES VIDÉOS
          </h1>
          <p>
            Gérez les vidéos de Mikwo Pèp La.
          </p>
        </div>
      </section>
      <section className="admin-videos-content">
        <div className="admin-videos-container">
          <div className="admin-videos-top">
            <div>
              <h2>
                VIDÉOS
              </h2>
              <p>
                {videos.length} vidéo
                {videos.length !== 1
                  ? "s"
                  : ""}{" "}
                disponible
                {videos.length !== 1
                  ? "s"
                  : ""}.
              </p>
            </div>
            <button
              className="admin-add-video-button"
              onClick={() =>
                navigate(
                  "/admin/videos/ajouter"
                )
              }
            >
              + Ajouter une vidéo
            </button>
          </div>
          {message && (
            <div className="admin-video-success">
              {message}
            </div>
          )}
          {error && (
            <div className="admin-video-error">
              {error}
            </div>
          )}
          {loading && (
            <div className="admin-video-message">
              Chargement des vidéos...
            </div>
          )}
          {!loading &&
            !error &&
            videos.length === 0 && (
              <div className="admin-video-message">
                Aucune vidéo disponible.
              </div>
            )}
          {!loading &&
            videos.length > 0 && (
              <div className="admin-videos-list">
                {videos.map((video) => (
                  <article
                    className="admin-video-card"
                    key={video.id_video}
                  >
                    <div className="admin-video-thumbnail">
                      {video.thumbnail ? (
                        <img
                          src={getFileUrl(
                            video.thumbnail
                          )}
                          alt={video.titre}
                          onError={(event) => {
                            event.currentTarget.style.display =
                              "none";
                          }}
                        />
                      ) : (
                        <div className="admin-video-no-thumbnail">
                          🎬
                        </div>
                      )}
                      <button
                        type="button"
                        className="admin-video-play"
                        onClick={() =>
                          ouvrirLecteur(
                            video
                          )
                        }
                      >
                        ▶️
                      </button>
                    </div>
                    <div className="admin-video-info">
                      <span className="admin-video-category">
                        {video.categorie ||
                          categories.find(
                            (cat) =>
                              cat.id ===
                              Number(
                                video.id_categorie
                              )
                          )?.nom ||
                          "Sans catégorie"}
                      </span>
                      <h3>
                        {video.titre}
                      </h3>
                      <p>
                        {video.description ||
                          "Aucune description."}
                      </p>
                      <small>
                        Ajoutée le{" "}
                        {video.created_at
                          ? new Date(
                              video.created_at
                            ).toLocaleDateString(
                              "fr-FR"
                            )
                          : "Date inconnue"}
                      </small>
                    </div>
                    <div className="admin-video-actions">
                      <button
                        className="admin-video-edit-button"
                        onClick={() =>
                          ouvrirModification(
                            video
                          )
                        }
                      >
                        Modifier
                      </button>
                      <button
                        className="admin-video-delete-button"
                        onClick={() =>
                          supprimerVideo(
                            video.id_video
                          )
                        }
                      >
                        Supprimer
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          {/* ==================================================
              MODAL MODIFICATION
          ================================================== */}
          {editingVideo && (
            <div className="admin-video-edit-overlay">
              <div className="admin-video-edit-modal">
                <div className="admin-video-edit-header">
                  <h2>
                    Modifier la vidéo
                  </h2>
                  <button
                    type="button"
                    className="admin-video-close-button"
                    onClick={
                      fermerModification
                    }
                  >
                    ×
                  </button>
                </div>
                <form
                  onSubmit={
                    modifierVideo
                  }
                >
                  <div className="admin-video-form-group">
                    <label>
                      Titre
                    </label>
                    <input
                      name="titre"
                      type="text"
                      value={
                        editForm.titre
                      }
                      onChange={
                        handleEditChange
                      }
                      required
                    />
                  </div>
                  <div className="admin-video-form-group">
                    <label>
                      Description
                    </label>
                    <textarea
                      name="description"
                      rows="6"
                      value={
                        editForm.description
                      }
                      onChange={
                        handleEditChange
                      }
                    />
                  </div>
                  <div className="admin-video-form-group">
                    <label>
                      URL de la miniature
                    </label>
                    <input
                      name="thumbnail"
                      type="text"
                      value={
                        editForm.thumbnail
                      }
                      onChange={
                        handleEditChange
                      }
                      placeholder="/uploads/videos/miniature.jpg"
                    />
                  </div>
                  <div className="admin-video-form-group">
                    <label>
                      URL de la vidéo
                    </label>
                    <input
                      name="video_url"
                      type="text"
                      value={
                        editForm.video_url
                      }
                      onChange={
                        handleEditChange
                      }
                      required
                    />
                  </div>
                  <div className="admin-video-form-group">
                    <label>
                      Catégorie
                    </label>
                    <select
                      name="id_categorie"
                      value={
                        editForm.id_categorie
                      }
                      onChange={
                        handleEditChange
                      }
                      required
                    >
                      {categories.map(
                        (categorie) => (
                          <option
                            key={
                              categorie.id
                            }
                            value={
                              categorie.id
                            }
                          >
                            {categorie.nom}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div className="admin-video-form-group">
                    <label>
                      Statut
                    </label>
                    <select
                      name="statut"
                      value={
                        editForm.statut
                      }
                      onChange={
                        handleEditChange
                      }
                    >
                      <option value="publie">
                        Publié
                      </option>
                      <option value="brouillon">
                        Brouillon
                      </option>
                      <option value="archive">
                        Archivé
                      </option>
                    </select>
                  </div>
                  <div className="admin-video-form-actions">
                    <button
                      type="button"
                      className="admin-video-cancel-button"
                      onClick={
                        fermerModification
                      }
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="admin-video-submit-button"
                    >
                      Enregistrer
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
          {/* ==================================================
              LECTEUR VIDÉO
          ================================================== */}
          {playingVideo && (
            <div
              className="admin-video-player-overlay"
              onClick={fermerLecteur}
            >
              <div
                className="admin-video-player-modal"
                onClick={(event) =>
                  event.stopPropagation()
                }
              >
                <div className="admin-video-player-header">
                  <h2>
                    {playingVideo.titre}
                  </h2>
                  <button
                    type="button"
                    className="admin-video-player-close"
                    onClick={
                      fermerLecteur
                    }
                  >
                    ×
                  </button>
                </div>
                <video
                  className="admin-video-player"
                  src={getFileUrl(
                    playingVideo.video_url
                  )}
                  controls
                  autoPlay
                  playsInline
                />
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
export default AdminVideos;
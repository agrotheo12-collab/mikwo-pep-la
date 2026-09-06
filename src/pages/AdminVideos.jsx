import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminVideos.css";

const API_URL = import.meta.env.VITE_API_URL;

function AdminVideos() {
  const navigate = useNavigate();

  const [videos, setVideos] = useState([]);
  const [categories, setCategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] =
    useState(true);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [editingVideo, setEditingVideo] =
    useState(null);

  const [playingVideo, setPlayingVideo] =
    useState(null);

  const [editForm, setEditForm] = useState({
    titre: "",
    description: "",
    thumbnail: "",
    video_url: "",
    statut: "publie",
  });

  // ======================================================
  // TOKEN
  // ======================================================

  const getToken = () => {
    return localStorage.getItem(
      "mikwo_pep_la_token"
    );
  };

  // ======================================================
  // LOGOUT
  // ======================================================

  const logout = () => {
    localStorage.removeItem(
      "mikwo_pep_la_token"
    );

    localStorage.removeItem(
      "mikwo_pep_la_user"
    );

    navigate("/admin/login");
  };

  // ======================================================
  // CHARGER VIDÉOS ADMIN
  // ======================================================

  const chargerVideos = async () => {
    const token = getToken();

    if (!token) {
      logout();
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_URL}/api/videos/admin`,
        {
          method: "GET",
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
            "Erreur lors du chargement des vidéos."
        );
      }

      const listeVideos =
        Array.isArray(data)
          ? data
          : Array.isArray(data.videos)
          ? data.videos
          : [];

      setVideos(listeVideos);

    } catch (err) {
      console.error(
        "Erreur chargement vidéos :",
        err
      );

      setError(
        err.message ||
          "Impossible de charger les vidéos."
      );

    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // CHARGER CATÉGORIES
  // ======================================================

  const chargerCategories = async () => {
    try {
      setLoadingCategories(true);

      const response = await fetch(
        `${API_URL}/api/categories`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Erreur lors du chargement des catégories."
        );
      }

      const listeCategories =
        Array.isArray(data)
          ? data
          : Array.isArray(data.categories)
          ? data.categories
          : [];

      setCategories(listeCategories);

    } catch (err) {
      console.error(
        "Erreur catégories :",
        err
      );

    } finally {
      setLoadingCategories(false);
    }
  };

  // ======================================================
  // CHARGEMENT INITIAL
  // ======================================================

  useEffect(() => {
    chargerVideos();
    chargerCategories();
  }, []);

  // ======================================================
  // URL FICHIER / CLOUDINARY
  // ======================================================

  const getFileUrl = (url) => {
    if (!url) {
      return "";
    }

    const valeur = String(url).trim();

    if (!valeur) {
      return "";
    }

    // Cloudinary / URL externe
    if (
      valeur.startsWith("http://") ||
      valeur.startsWith("https://") ||
      valeur.startsWith("blob:") ||
      valeur.startsWith("data:")
    ) {
      return valeur;
    }

    // Fichier local
    if (valeur.startsWith("/")) {
      return `${API_URL}${valeur}`;
    }

    return `${API_URL}/${valeur}`;
  };

  // ======================================================
  // CATÉGORIE
  // ======================================================

  const getCategorieNom = (video) => {
    if (video.categorie) {
      return video.categorie;
    }

    if (video.nom_categorie) {
      return video.nom_categorie;
    }

    if (
      video.id_categorie !== undefined &&
      video.id_categorie !== null
    ) {
      const categorie = categories.find(
        (cat) =>
          Number(
            cat.id_categorie || cat.id
          ) ===
          Number(video.id_categorie)
      );

      if (categorie) {
        return categorie.nom;
      }
    }

    return "Sans catégorie";
  };

  // ======================================================
  // SUPPRIMER
  // ======================================================

  const supprimerVideo = async (id) => {
    const confirmation = window.confirm(
      "Voulez-vous vraiment supprimer cette vidéo ?"
    );

    if (!confirmation) {
      return;
    }

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
            Number(video.id_video) !==
            Number(id)
        )
      );

      setPlayingVideo((previous) => {
        if (
          previous &&
          Number(previous.id_video) ===
            Number(id)
        ) {
          return null;
        }

        return previous;
      });

      setMessage(
        "La vidéo a été supprimée avec succès."
      );

    } catch (err) {
      console.error(
        "Erreur suppression vidéo :",
        err
      );

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
      description:
        video.description || "",
      thumbnail:
        video.thumbnail || "",
      video_url:
        video.video_url || "",
      statut:
        video.statut || "publie",
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
    });
  };

  // ======================================================
  // CHANGEMENT FORMULAIRE
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
  // MODIFIER VIDÉO
  // ======================================================

  const modifierVideo = async (event) => {
    event.preventDefault();

    if (!editingVideo) {
      return;
    }

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

    try {
      setMessage("");
      setError("");

      const response = await fetch(
        `${API_URL}/api/videos/${editingVideo.id_video}`,
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
              editForm.titre.trim(),

            description:
              editForm.description.trim(),

            thumbnail:
              editForm.thumbnail.trim() ||
              null,

            video_url:
              editForm.video_url.trim(),

            statut:
              editForm.statut,
          }),
        }
      );

      const data =
        await response.json();

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
          Number(video.id_video) ===
          Number(
            editingVideo.id_video
          )
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
      console.error(
        "Erreur modification vidéo :",
        err
      );

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
  // STATUT
  // ======================================================

  const getStatutLabel = (statut) => {
    const valeur =
      String(statut || "")
        .toLowerCase()
        .trim();

    if (valeur === "publie") {
      return "Publié";
    }

    if (valeur === "brouillon") {
      return "Brouillon";
    }

    if (valeur === "archive") {
      return "Archivé";
    }

    return statut || "Inconnu";
  };

  // ======================================================
  // CLASSE STATUT
  // ======================================================

  const getStatutClass = (statut) => {
    const valeur =
      String(statut || "")
        .toLowerCase()
        .trim();

    if (valeur === "publie") {
      return "admin-video-status-publie";
    }

    if (valeur === "brouillon") {
      return "admin-video-status-brouillon";
    }

    if (valeur === "archive") {
      return "admin-video-status-archive";
    }

    return "";
  };

  // ======================================================
  // RENDU
  // ======================================================

  return (
    <main className="admin-videos-page">

      {/* ==================================================
          HEADER
      ================================================== */}

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


      {/* ==================================================
          CONTENU
      ================================================== */}

      <section className="admin-videos-content">

        <div className="admin-videos-container">

          {/* ==================================================
              TOP
          ================================================== */}

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
              type="button"
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


          {/* ==================================================
              MESSAGE SUCCÈS
          ================================================== */}

          {message && (
            <div className="admin-video-success">
              {message}
            </div>
          )}


          {/* ==================================================
              MESSAGE ERREUR
          ================================================== */}

          {error && (
            <div className="admin-video-error">
              {error}
            </div>
          )}


          {/* ==================================================
              CHARGEMENT
          ================================================== */}

          {loading && (
            <div className="admin-video-message">
              Chargement des vidéos...
            </div>
          )}


          {/* ==================================================
              AUCUNE VIDÉO
          ================================================== */}

          {!loading &&
            !error &&
            videos.length === 0 && (
              <div className="admin-video-message">
                Aucune vidéo disponible.
              </div>
            )}


          {/* ==================================================
              LISTE
          ================================================== */}

          {!loading &&
            videos.length > 0 && (

              <div className="admin-videos-list">

                {videos.map((video) => {

                  const thumbnail =
                    getFileUrl(
                      video.thumbnail
                    );

                  return (
                    <article
                      className="admin-video-card"
                      key={
                        video.id_video
                      }
                    >

                      {/* ======================================
                          MINIATURE
                      ====================================== */}

                      <div className="admin-video-thumbnail">

                        {thumbnail ? (

                          <img
                            src={thumbnail}
                            alt={
                              video.titre ||
                              "Vidéo Mikwo Pèp La"
                            }

                            onError={(
                              event
                            ) => {
                              console.error(
                                "Erreur miniature :",
                                thumbnail
                              );

                              event.currentTarget.style.display =
                                "none";
                            }}
                          />

                        ) : (

                          <div className="admin-video-no-thumbnail">
                            🎬
                          </div>

                        )}


                        {/* PLAY */}

                        <button
                          type="button"
                          className="admin-video-play"
                          aria-label={`Lire ${
                            video.titre ||
                            "la vidéo"
                          }`}
                          onClick={() =>
                            ouvrirLecteur(
                              video
                            )
                          }
                        >
                          ▶️
                        </button>

                      </div>


                      {/* ======================================
                          INFORMATIONS
                      ====================================== */}

                      <div className="admin-video-info">

                        <span className="admin-video-category">

                          {getCategorieNom(
                            video
                          )}

                        </span>


                        <span
                          className={`admin-video-status ${getStatutClass(
                            video.statut
                          )}`}
                        >
                          {getStatutLabel(
                            video.statut
                          )}
                        </span>


                        <h3>
                          {video.titre ||
                            "Sans titre"}
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


                      {/* ======================================
                          ACTIONS
                      ====================================== */}

                      <div className="admin-video-actions">

                        <button
                          type="button"
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
                          type="button"
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
                  );
                })}

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

                  {/* TITRE */}

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


                  {/* DESCRIPTION */}

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


                  {/* MINIATURE */}

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
                      placeholder="https://res.cloudinary.com/..."
                    />

                  </div>


                  {/* VIDÉO */}

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
                      placeholder="https://res.cloudinary.com/..."
                      required
                    />

                  </div>


                  {/* STATUT */}

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


                  {/* ACTIONS */}

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
              onClick={
                fermerLecteur
              }
            >

              <div
                className="admin-video-player-modal"
                onClick={(event) =>
                  event.stopPropagation()
                }
              >

                <div className="admin-video-player-header">

                  <h2>
                    {playingVideo.titre ||
                      "Vidéo"}
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
                  poster={getFileUrl(
                    playingVideo.thumbnail
                  )}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  onError={(event) => {
                    console.error(
                      "Erreur lecture vidéo :",
                      getFileUrl(
                        playingVideo.video_url
                      )
                    );

                    console.error(
                      "MediaError :",
                      event.currentTarget.error
                    );
                  }}
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
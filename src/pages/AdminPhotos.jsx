import {
  useEffect,
  useMemo,
  useState,
} from "react";

import "./AdminPhotos.css";

const API_URL = import.meta.env.VITE_API_URL;

function AdminPhotos() {
  // =====================================================
  // DONNEES
  // =====================================================

  const [photos, setPhotos] = useState([]);

  // =====================================================
  // ETAT
  // =====================================================

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // =====================================================
  // NOUVELLE PUBLICATION
  // =====================================================

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [statut, setStatut] = useState("publie");

  // =====================================================
  // MODIFICATION
  // =====================================================

  const [editingPublication, setEditingPublication] =
    useState(null);

  const [editTitre, setEditTitre] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatut, setEditStatut] = useState("publie");
  const [editNewFiles, setEditNewFiles] = useState([]);

  // =====================================================
  // VIEWER
  // =====================================================

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerPhotos, setViewerPhotos] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(0);

  // =====================================================
  // TOKEN
  // =====================================================

  const getToken = () => {
    return localStorage.getItem("mikwo_pep_la_token") || "";
  };

  // =====================================================
  // URL IMAGE
  // =====================================================

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) {
      return "";
    }

    const url = String(imageUrl).trim();

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
  // SESSION EXPIREE
  // =====================================================

  const sessionExpiree = () => {
    localStorage.removeItem("mikwo_pep_la_token");
    localStorage.removeItem("mikwo_pep_la_user");
  };

  // =====================================================
  // CHARGER PHOTOS
  // =====================================================

  const chargerPhotos = async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      if (!token) {
        throw new Error(
          "Votre session administrateur a expiré. Veuillez vous reconnecter."
        );
      }

      const response = await fetch(
        `${API_URL}/api/photos`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      console.log("📸 Réponse /api/photos :", data);

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        sessionExpiree();

        throw new Error(
          "Votre session administrateur a expiré. Veuillez vous reconnecter."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Impossible de charger les photos."
        );
      }

      if (!Array.isArray(data)) {
        throw new Error(
          "Le serveur a retourné un format de données inattendu."
        );
      }

      setPhotos(data);
    } catch (err) {
      console.error(
        "❌ Erreur chargement photos :",
        err
      );

      setError(
        err.message ||
          "Erreur lors du chargement des photos."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // INITIALISATION
  // =====================================================

  useEffect(() => {
    chargerPhotos();
  }, []);

  // =====================================================
  // GROUPER LES PHOTOS EN PUBLICATIONS
  // =====================================================

  const publications = useMemo(() => {
    const groupes = {};

    photos.forEach((photo) => {
      const key = [
        photo.titre || "",
        photo.description || "",
        photo.statut || "",
        photo.created_at
          ? new Date(photo.created_at).getTime()
          : "",
      ].join("|");

      if (!groupes[key]) {
        groupes[key] = {
          id_publication: photo.id_photo,
          titre: photo.titre || "",
          description: photo.description || "",
          statut: photo.statut || "publie",
          created_at: photo.created_at,
          auteur: photo.auteur,
          photos: [],
        };
      }

      groupes[key].photos.push(photo);
    });

    return Object.values(groupes).sort(
      (a, b) =>
        new Date(b.created_at) -
        new Date(a.created_at)
    );
  }, [photos]);

  // =====================================================
  // FICHIERS NOUVELLE PUBLICATION
  // =====================================================

  const handleFilesChange = (event) => {
    const files = Array.from(
      event.target.files || []
    );

    const typesAutorises = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    const fichiersValides = files.filter(
      (file) =>
        typesAutorises.includes(file.type)
    );

    if (
      fichiersValides.length !==
      files.length
    ) {
      setError(
        "Certains fichiers ont été ignorés. Utilisez JPG, PNG, WEBP ou GIF."
      );
    } else {
      setError("");
    }

    if (fichiersValides.length > 20) {
      setSelectedFiles(
        fichiersValides.slice(0, 20)
      );

      setError(
        "Vous pouvez sélectionner au maximum 20 photos."
      );

      return;
    }

    setSelectedFiles(fichiersValides);
  };

  // =====================================================
  // FICHIERS MODIFICATION
  // =====================================================

  const handleEditFilesChange = (event) => {
    const files = Array.from(
      event.target.files || []
    );

    const typesAutorises = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    const fichiersValides = files.filter(
      (file) =>
        typesAutorises.includes(file.type)
    );

    if (
      fichiersValides.length !==
      files.length
    ) {
      setError(
        "Certains fichiers ont été ignorés. Utilisez JPG, PNG, WEBP ou GIF."
      );
    } else {
      setError("");
    }

    if (fichiersValides.length > 20) {
      setEditNewFiles(
        fichiersValides.slice(0, 20)
      );

      setError(
        "Vous pouvez ajouter au maximum 20 photos à la fois."
      );

      return;
    }

    setEditNewFiles(fichiersValides);
  };

  // =====================================================
  // NOUVELLE PUBLICATION
  // =====================================================

  const handleUpload = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedFiles.length) {
      setError(
        "Veuillez sélectionner au moins une photo."
      );

      return;
    }

    if (!titre.trim()) {
      setError("Veuillez saisir un titre.");
      return;
    }

    const token = getToken();

    if (!token) {
      setError(
        "Votre session administrateur a expiré. Veuillez vous reconnecter."
      );

      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();

      selectedFiles.forEach((file) => {
        formData.append("photos", file);
      });

      formData.append("titre", titre.trim());
      formData.append(
        "description",
        description.trim()
      );
      formData.append("statut", statut);

      const response = await fetch(
        `${API_URL}/api/photos`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      console.log(
        "📤 Réponse upload :",
        data
      );

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        sessionExpiree();

        throw new Error(
          "Votre session administrateur a expiré. Veuillez vous reconnecter."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Erreur lors de l'ajout des photos."
        );
      }

      if (!data?.success) {
        throw new Error(
          data?.message ||
            "Erreur lors de l'ajout des photos."
        );
      }

      setSuccess(
        `${selectedFiles.length} photo(s) ajoutée(s) avec succès.`
      );

      setSelectedFiles([]);
      setTitre("");
      setDescription("");
      setStatut("publie");

      const input = document.getElementById(
        "photo-upload-input"
      );

      if (input) {
        input.value = "";
      }

      await chargerPhotos();
    } catch (err) {
      console.error("❌ Upload :", err);

      setError(
        err.message ||
          "Erreur lors de l'ajout des photos."
      );
    } finally {
      setUploading(false);
    }
  };

  // =====================================================
  // OUVRIR MODIFICATION
  // =====================================================

  const ouvrirModification = (publication) => {
    setEditingPublication(publication);

    setEditTitre(
      publication.titre || ""
    );

    setEditDescription(
      publication.description || ""
    );

    setEditStatut(
      publication.statut || "publie"
    );

    setEditNewFiles([]);

    setError("");
    setSuccess("");
  };

  // =====================================================
  // FERMER MODIFICATION
  // =====================================================

  const fermerModification = () => {
    if (savingEdit) {
      return;
    }

    setEditingPublication(null);
    setEditNewFiles([]);
  };

  // =====================================================
  // SUPPRIMER UNE PHOTO
  // =====================================================

  const supprimerPhoto = async (photo) => {
    const confirmation = window.confirm(
      "Voulez-vous vraiment supprimer cette photo ?\n\nCette action supprimera uniquement cette photo."
    );

    if (!confirmation) {
      return;
    }

    const token = getToken();

    if (!token) {
      setError(
        "Votre session administrateur a expiré. Veuillez vous reconnecter."
      );

      return;
    }

    try {
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_URL}/api/photos/${photo.id_photo}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        sessionExpiree();

        throw new Error(
          "Votre session administrateur a expiré. Veuillez vous reconnecter."
        );
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Impossible de supprimer la photo."
        );
      }

      if (!data?.success) {
        throw new Error(
          data?.message ||
            "Impossible de supprimer la photo."
        );
      }

      setPhotos((current) =>
        current.filter(
          (item) =>
            item.id_photo !== photo.id_photo
        )
      );

      setEditingPublication((current) => {
        if (!current) {
          return null;
        }

        return {
          ...current,
          photos: current.photos.filter(
            (item) =>
              item.id_photo !==
              photo.id_photo
          ),
        };
      });

      setSuccess(
        "La photo a été supprimée."
      );
    } catch (err) {
      console.error(
        "❌ Suppression photo :",
        err
      );

      setError(
        err.message ||
          "Erreur lors de la suppression."
      );
    }
  };

  // =====================================================
  // AJOUTER PHOTOS À LA PUBLICATION
  // =====================================================

  const ajouterPhotosPublication =
    async () => {
      if (!editingPublication) {
        return;
      }

      if (!editNewFiles.length) {
        setError(
          "Sélectionnez au moins une nouvelle photo."
        );

        return;
      }

      if (!editTitre.trim()) {
        setError(
          "Le titre est obligatoire."
        );

        return;
      }

      const token = getToken();

      if (!token) {
        setError(
          "Votre session administrateur a expiré. Veuillez vous reconnecter."
        );

        return;
      }

      try {
        setSavingEdit(true);
        setError("");
        setSuccess("");

        const nombreAjoute =
          editNewFiles.length;

        const formData = new FormData();

        editNewFiles.forEach((file) => {
          formData.append("photos", file);
        });

        formData.append(
          "titre",
          editTitre.trim()
        );

        formData.append(
          "description",
          editDescription.trim()
        );

        formData.append(
          "statut",
          editStatut
        );

        const response = await fetch(
          `${API_URL}/api/photos`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        const data = await response.json();

        console.log(
          "📤 Ajout galerie :",
          data
        );

        if (
          response.status === 401 ||
          response.status === 403
        ) {
          sessionExpiree();

          throw new Error(
            "Votre session administrateur a expiré. Veuillez vous reconnecter."
          );
        }

        if (!response.ok) {
          throw new Error(
            data?.message ||
              "Impossible d'ajouter les photos."
          );
        }

        if (!data?.success) {
          throw new Error(
            data?.message ||
              "Impossible d'ajouter les photos."
          );
        }

        setEditNewFiles([]);

        const input =
          document.getElementById(
            "edit-photo-upload-input"
          );

        if (input) {
          input.value = "";
        }

        await chargerPhotos();

        const publicationActualisee =
          {
            ...editingPublication,
            titre: editTitre.trim(),
            description:
              editDescription.trim(),
            statut: editStatut,
          };

        setEditingPublication(
          publicationActualisee
        );

        setSuccess(
          `${nombreAjoute} nouvelle(s) photo(s) ajoutée(s) à la galerie.`
        );
      } catch (err) {
        console.error(
          "❌ Ajout photos galerie :",
          err
        );

        setError(
          err.message ||
            "Erreur lors de l'ajout des photos."
        );
      } finally {
        setSavingEdit(false);
      }
    };

  // =====================================================
  // ENREGISTRER MODIFICATION
  // =====================================================

  const enregistrerModification =
    async () => {
      if (!editingPublication) {
        return;
      }

      if (!editTitre.trim()) {
        setError(
          "Le titre est obligatoire."
        );

        return;
      }

      const token = getToken();

      if (!token) {
        setError(
          "Votre session administrateur a expiré. Veuillez vous reconnecter."
        );

        return;
      }

      try {
        setSavingEdit(true);
        setError("");
        setSuccess("");

        const photosAmodifier =
          editingPublication.photos || [];

        for (
          const photo of photosAmodifier
        ) {
          const response = await fetch(
            `${API_URL}/api/photos/${photo.id_photo}`,
            {
              method: "PUT",
              headers: {
                "Content-Type":
                  "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                titre: editTitre.trim(),
                description:
                  editDescription.trim(),
                image_url:
                  photo.image_url,
                statut: editStatut,
              }),
            }
          );

          const data =
            await response.json();

          if (
            response.status === 401 ||
            response.status === 403
          ) {
            sessionExpiree();

            throw new Error(
              "Votre session administrateur a expiré. Veuillez vous reconnecter."
            );
          }

          if (!response.ok) {
            throw new Error(
              data?.message ||
                "Impossible de modifier la photo."
            );
          }

          if (!data?.success) {
            throw new Error(
              data?.message ||
                "Impossible de modifier la photo."
            );
          }
        }

        setPhotos((current) =>
          current.map((photo) => {
            const appartient =
              photosAmodifier.some(
                (item) =>
                  item.id_photo ===
                  photo.id_photo
              );

            if (!appartient) {
              return photo;
            }

            return {
              ...photo,
              titre: editTitre.trim(),
              description:
                editDescription.trim(),
              statut: editStatut,
            };
          })
        );

        setEditingPublication(
          (current) => {
            if (!current) {
              return null;
            }

            return {
              ...current,
              titre: editTitre.trim(),
              description:
                editDescription.trim(),
              statut: editStatut,
              photos:
                current.photos.map(
                  (photo) => ({
                    ...photo,
                    titre:
                      editTitre.trim(),
                    description:
                      editDescription.trim(),
                    statut: editStatut,
                  })
                ),
            };
          }
        );

        setSuccess(
          "Publication modifiée avec succès."
        );

        setTimeout(() => {
          setEditingPublication(null);
        }, 600);
      } catch (err) {
        console.error(
          "❌ Modification :",
          err
        );

        setError(
          err.message ||
            "Erreur lors de la modification."
        );
      } finally {
        setSavingEdit(false);
      }
    };

  // =====================================================
  // SUPPRIMER PUBLICATION
  // =====================================================

  const supprimerPublication =
    async (publication) => {
      const photosPublication =
        publication.photos || [];

      const confirmation =
        window.confirm(
          `Voulez-vous vraiment supprimer toute cette publication ?\n\n${photosPublication.length} photo(s) seront supprimées.`
        );

      if (!confirmation) {
        return;
      }

      const token = getToken();

      if (!token) {
        setError(
          "Votre session administrateur a expiré. Veuillez vous reconnecter."
        );

        return;
      }

      try {
        setError("");
        setSuccess("");

        for (
          const photo of photosPublication
        ) {
          const response = await fetch(
            `${API_URL}/api/photos/${photo.id_photo}`,
            {
              method: "DELETE",
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const data =
            await response.json();

          if (
            response.status === 401 ||
            response.status === 403
          ) {
            sessionExpiree();

            throw new Error(
              "Votre session administrateur a expiré. Veuillez vous reconnecter."
            );
          }

          if (!response.ok) {
            throw new Error(
              data?.message ||
                "Impossible de supprimer la publication."
            );
          }

          if (!data?.success) {
            throw new Error(
              data?.message ||
                "Impossible de supprimer la publication."
            );
          }
        }

        const ids = new Set(
          photosPublication.map(
            (photo) =>
              photo.id_photo
          )
        );

        setPhotos((current) =>
          current.filter(
            (photo) =>
              !ids.has(photo.id_photo)
          )
        );

        setEditingPublication(null);

        setSuccess(
          "Publication supprimée avec succès."
        );
      } catch (err) {
        console.error(
          "❌ Suppression publication :",
          err
        );

        setError(
          err.message ||
            "Erreur lors de la suppression."
        );
      }
    };

  // =====================================================
  // VIEWER
  // =====================================================

  const ouvrirViewer = (
    liste,
    index
  ) => {
    if (!liste?.length) {
      return;
    }

    setViewerPhotos(liste);
    setViewerIndex(index);
    setViewerOpen(true);

    document.body.style.overflow =
      "hidden";
  };

  const fermerViewer = () => {
    setViewerOpen(false);
    setViewerPhotos([]);
    setViewerIndex(0);

    document.body.style.overflow = "";
  };

  const photoSuivante = () => {
    if (!viewerPhotos.length) {
      return;
    }

    setViewerIndex((current) =>
      current ===
      viewerPhotos.length - 1
        ? 0
        : current + 1
    );
  };

  const photoPrecedente = () => {
    if (!viewerPhotos.length) {
      return;
    }

    setViewerIndex((current) =>
      current === 0
        ? viewerPhotos.length - 1
        : current - 1
    );
  };

  // =====================================================
  // CLAVIER VIEWER
  // =====================================================

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (!viewerOpen) {
        return;
      }

      if (event.key === "Escape") {
        fermerViewer();
      }

      if (event.key === "ArrowRight") {
        photoSuivante();
      }

      if (event.key === "ArrowLeft") {
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

  // =====================================================
  // NETTOYAGE SCROLL
  // =====================================================

  useEffect(() => {
    return () => {
      document.body.style.overflow =
        "";
    };
  }, []);

  // =====================================================
  // DATE
  // =====================================================

  const formatDate = (date) => {
    if (!date) {
      return "";
    }

    try {
      return new Date(
        date
      ).toLocaleDateString(
        "fr-FR",
        {
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      );
    } catch {
      return "";
    }
  };

  // =====================================================
  // GRILLE PHOTOS
  // =====================================================

  const renderPhotoGrid = (
    publication
  ) => {
    const liste =
      publication.photos || [];

    if (!liste.length) {
      return null;
    }

    const total = liste.length;
    const visibles = Math.min(
      total,
      5
    );

    const photosVisibles =
      liste.slice(
        0,
        visibles
      );

    const reste =
      total > 5
        ? total - 5
        : 0;

    return (
      <div
        className={`admin-facebook-grid admin-photos-${Math.min(
          total,
          5
        )}`}
      >
        {photosVisibles.map(
          (photo, index) => {
            const afficherPlus =
              index ===
                photosVisibles.length -
                  1 &&
              reste > 0;

            return (
              <button
                type="button"
                key={
                  photo.id_photo
                }
                className={`admin-photo-grid-item admin-photo-item-${
                  index + 1
                }`}
                onClick={() =>
                  ouvrirViewer(
                    liste,
                    index
                  )
                }
              >
                <img
                  src={getImageUrl(
                    photo.image_url
                  )}
                  alt={
                    photo.titre ||
                    "Photo"
                  }
                />

                {afficherPlus && (
                  <span className="admin-more-overlay">
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

  // =====================================================
  // LOADING
  // =====================================================

  if (loading) {
    return (
      <main className="admin-photos-page">
        <div className="admin-photos-loading">
          <div className="admin-spinner"></div>

          <p>
            Chargement des photos...
          </p>
        </div>
      </main>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <main className="admin-photos-page">
      <div className="admin-photos-container">

        <header className="admin-photos-header">
          <div>
            <span className="admin-photos-label">
              MIKWO PÈP LA
            </span>

            <h1>
              Gestion des photos
            </h1>

            <p>
              Créez et gérez vos
              publications photo.
            </p>
          </div>

          <div className="admin-photo-total">
            <strong>
              {
                publications.length
              }
            </strong>

            <span>
              publication
              {publications.length !==
              1
                ? "s"
                : ""}
            </span>
          </div>
        </header>

        {error && (
          <div className="admin-message admin-message-error">
            <span>!</span>

            <p>{error}</p>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
            >
              ×
            </button>
          </div>
        )}

        {success && (
          <div className="admin-message admin-message-success">
            <span>✓</span>

            <p>{success}</p>

            <button
              type="button"
              onClick={() =>
                setSuccess("")
              }
            >
              ×
            </button>
          </div>
        )}

        {/* NOUVELLE PUBLICATION */}

        <section className="admin-photo-upload-card">
          <div className="admin-section-title">
            <div className="admin-section-icon">
              +
            </div>

            <div>
              <h2>
                Nouvelle publication
              </h2>

              <p>
                Ajoutez une ou plusieurs
                photos.
              </p>
            </div>
          </div>

          <form
            onSubmit={handleUpload}
            className="admin-photo-form"
          >
            <div className="admin-form-row">
              <div className="admin-form-group">
                <label>Titre</label>

                <input
                  type="text"
                  value={titre}
                  onChange={(e) =>
                    setTitre(
                      e.target.value
                    )
                  }
                  placeholder="Titre de la publication"
                />
              </div>

              <div className="admin-form-group">
                <label>Statut</label>

                <select
                  value={statut}
                  onChange={(e) =>
                    setStatut(
                      e.target.value
                    )
                  }
                >
                  <option value="publie">
                    Publié
                  </option>

                  <option value="brouillon">
                    Brouillon
                  </option>
                </select>
              </div>
            </div>

            <div className="admin-form-group">
              <label>
                Description
              </label>

              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                placeholder="Description de la publication"
                rows="4"
              />
            </div>

            <label
              htmlFor="photo-upload-input"
              className="admin-photo-dropzone"
            >
              <div className="admin-upload-icon">
                📷
              </div>

              <strong>
                Sélectionner les photos
              </strong>

              <span>
                JPG, PNG, WEBP ou GIF ·
                Jusqu'à 20 photos
              </span>

              <input
                id="photo-upload-input"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                multiple
                onChange={
                  handleFilesChange
                }
              />
            </label>

            {selectedFiles.length >
              0 && (
              <div className="admin-selected-files">
                <div className="admin-selected-header">
                  <strong>
                    {
                      selectedFiles.length
                    }{" "}
                    photo
                    {selectedFiles.length >
                    1
                      ? "s"
                      : ""}{" "}
                    sélectionnée
                    {selectedFiles.length >
                    1
                      ? "s"
                      : ""}
                  </strong>
                </div>

                <div className="admin-selected-grid">
                  {selectedFiles.map(
                    (
                      file,
                      index
                    ) => (
                      <div
                        className="admin-selected-item"
                        key={`${file.name}-${index}`}
                      >
                        <img
                          src={URL.createObjectURL(
                            file
                          )}
                          alt={
                            file.name
                          }
                        />
                      </div>
                    )
                  )}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="admin-primary-button"
              disabled={uploading}
            >
              {uploading
                ? "Publication..."
                : "Publier les photos"}
            </button>
          </form>
        </section>

        {/* PUBLICATIONS */}

        <section className="admin-publications-section">
          <div className="admin-section-heading">
            <div>
              <h2>
                Publications
              </h2>

              <p>
                Gérez vos galeries photo.
              </p>
            </div>
          </div>

          {publications.length ===
          0 ? (
            <div className="admin-photo-empty">
              <div>📷</div>

              <h3>
                Aucune publication
              </h3>

              <p>
                Vos publications photo
                apparaîtront ici.
              </p>
            </div>
          ) : (
            <div className="admin-publications-list">
              {publications.map(
                (
                  publication,
                  publicationIndex
                ) => (
                  <article
                    className="admin-facebook-post"
                    key={
                      publication.id_publication ||
                      publicationIndex
                    }
                  >
                    <div className="admin-post-header">
                      <div className="admin-avatar">
                        M
                      </div>

                      <div className="admin-author">
                        <strong>
                          Mikwo Pèp La
                        </strong>

                        <span>
                          {formatDate(
                            publication.created_at
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="admin-post-content">
                      <h3>
                        {publication.titre ||
                          "Sans titre"}
                      </h3>

                      {publication.description && (
                        <p>
                          {
                            publication.description
                          }
                        </p>
                      )}
                    </div>

                    {renderPhotoGrid(
                      publication
                    )}

                    <div className="admin-post-info">
                      <span>
                        📷{" "}
                        {
                          publication
                            .photos
                            .length
                        }{" "}
                        photo
                        {publication
                          .photos
                          .length !==
                        1
                          ? "s"
                          : ""}
                      </span>

                      <span
                        className={`admin-status-badge ${
                          publication.statut ===
                          "publie"
                            ? "published"
                            : "draft"
                        }`}
                      >
                        {publication.statut ===
                        "publie"
                          ? "Publié"
                          : "Brouillon"}
                      </span>
                    </div>

                    <div className="admin-post-actions">
                      <button
                        type="button"
                        onClick={() =>
                          ouvrirModification(
                            publication
                          )
                        }
                      >
                        ✏️ Modifier
                      </button>

                      <button
                        type="button"
                        className="danger-action"
                        onClick={() =>
                          supprimerPublication(
                            publication
                          )
                        }
                      >
                        🗑 Supprimer
                      </button>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>
      </div>

      {/* ===================================================
          MODAL MODIFICATION
      =================================================== */}

      {editingPublication && (
        <div className="admin-edit-overlay">
          <div className="admin-edit-modal">

            <div className="admin-edit-header">
              <div>
                <span>
                  GESTION DE LA GALERIE
                </span>

                <h2>
                  Modifier la publication
                </h2>
              </div>

              <button
                type="button"
                onClick={
                  fermerModification
                }
                disabled={savingEdit}
              >
                ×
              </button>
            </div>

            <div className="admin-edit-body">

              <div className="admin-edit-fields">
                <div className="admin-form-group">
                  <label>Titre</label>

                  <input
                    type="text"
                    value={editTitre}
                    onChange={(e) =>
                      setEditTitre(
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="admin-form-group">
                  <label>
                    Description
                  </label>

                  <textarea
                    value={
                      editDescription
                    }
                    onChange={(e) =>
                      setEditDescription(
                        e.target.value
                      )
                    }
                    rows="4"
                  />
                </div>

                <div className="admin-form-group">
                  <label>
                    Statut
                  </label>

                  <select
                    value={
                      editStatut
                    }
                    onChange={(e) =>
                      setEditStatut(
                        e.target.value
                      )
                    }
                  >
                    <option value="publie">
                      Publié
                    </option>

                    <option value="brouillon">
                      Brouillon
                    </option>
                  </select>
                </div>
              </div>

              <div className="admin-edit-photos-section">
                <div className="admin-edit-section-title">
                  <div>
                    <h3>
                      Photos de la publication
                    </h3>

                    <p>
                      {
                        editingPublication
                          .photos
                          .length
                      }{" "}
                      photo
                      {editingPublication
                        .photos
                        .length !==
                      1
                        ? "s"
                        : ""}{" "}
                      actuellement
                    </p>
                  </div>
                </div>

                {editingPublication
                  .photos.length ===
                0 ? (
                  <div className="admin-no-photos">
                    Cette publication
                    ne contient plus
                    aucune photo.
                  </div>
                ) : (
                  <div className="admin-edit-photo-grid">
                    {editingPublication.photos.map(
                      (photo) => (
                        <div
                          className="admin-edit-photo-item"
                          key={
                            photo.id_photo
                          }
                        >
                          <img
                            src={getImageUrl(
                              photo.image_url
                            )}
                            alt={
                              photo.titre ||
                              "Photo"
                            }
                          />

                          <button
                            type="button"
                            className="admin-delete-photo"
                            onClick={() =>
                              supprimerPhoto(
                                photo
                              )
                            }
                            disabled={
                              savingEdit
                            }
                            title="Supprimer cette photo"
                          >
                            🗑
                          </button>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              <div className="admin-add-photos-section">
                <label
                  htmlFor="edit-photo-upload-input"
                  className="admin-add-photos-box"
                >
                  <div className="admin-add-icon">
                    +
                  </div>

                  <strong>
                    Ajouter des photos
                  </strong>

                  <span>
                    Sélectionnez les
                    nouvelles photos
                    à ajouter à cette
                    galerie.
                  </span>

                  <input
                    id="edit-photo-upload-input"
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                    multiple
                    onChange={
                      handleEditFilesChange
                    }
                  />
                </label>

                {editNewFiles.length >
                  0 && (
                  <div className="admin-new-files-preview">
                    <strong>
                      {
                        editNewFiles.length
                      }{" "}
                      nouvelle
                      {editNewFiles.length >
                      1
                        ? "s"
                        : ""}{" "}
                      photo
                      {editNewFiles.length >
                      1
                        ? "s"
                        : ""}
                    </strong>

                    <div>
                      {editNewFiles.map(
                        (
                          file,
                          index
                        ) => (
                          <img
                            key={`${file.name}-${index}`}
                            src={URL.createObjectURL(
                              file
                            )}
                            alt={
                              file.name
                            }
                          />
                        )
                      )}
                    </div>

                    <button
                      type="button"
                      className="admin-add-files-button"
                      onClick={
                        ajouterPhotosPublication
                      }
                      disabled={
                        savingEdit
                      }
                    >
                      {savingEdit
                        ? "Ajout en cours..."
                        : `Ajouter ${editNewFiles.length} photo${
                            editNewFiles.length >
                            1
                              ? "s"
                              : ""
                          } à la galerie`}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="admin-edit-footer">
              <button
                type="button"
                className="admin-cancel-button"
                onClick={
                  fermerModification
                }
                disabled={savingEdit}
              >
                Annuler
              </button>

              <button
                type="button"
                className="admin-save-button"
                onClick={
                  enregistrerModification
                }
                disabled={savingEdit}
              >
                {savingEdit
                  ? "Enregistrement..."
                  : "Enregistrer les modifications"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          VIEWER
      =================================================== */}

      {viewerOpen &&
        viewerPhotos.length >
          0 && (
          <div className="admin-photo-viewer">

            <button
              type="button"
              className="admin-viewer-close"
              onClick={
                fermerViewer
              }
            >
              ×
            </button>

            <div className="admin-viewer-counter">
              {viewerIndex + 1} /{" "}
              {viewerPhotos.length}
            </div>

            {viewerPhotos.length >
              1 && (
              <button
                type="button"
                className="admin-viewer-arrow admin-viewer-prev"
                onClick={
                  photoPrecedente
                }
              >
                ‹
              </button>
            )}

            <div
              className="admin-viewer-content"
              onClick={(event) => {
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
                alt="Photo"
              />
            </div>

            {viewerPhotos.length >
              1 && (
              <button
                type="button"
                className="admin-viewer-arrow admin-viewer-next"
                onClick={
                  photoSuivante
                }
              >
                ›
              </button>
            )}
          </div>
        )}
    </main>
  );
}

export default AdminPhotos;
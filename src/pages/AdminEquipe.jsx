import { useEffect, useState } from "react";
import "./AdminEquipe.css";

const API_URL = "http://localhost:3000";

function AdminEquipe() {
  const [membres, setMembres] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [nom, setNom] = useState("");
  const [fonction, setFonction] = useState("");
  const [biographie, setBiographie] = useState("");

  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [linkedin, setLinkedin] = useState("");

  const [afficher, setAfficher] = useState(true);
  const [ordre, setOrdre] = useState(0);

  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");

  // =====================================================
  // TOKEN
  // =====================================================

  const getToken = () => {
    return localStorage.getItem("mikwo_pep_la_token");
  };

  // =====================================================
  // HEADERS
  // =====================================================

  const getAuthHeaders = () => {
    const token = getToken();

    return {
      Authorization: `Bearer ${token}`,
    };
  };

  // =====================================================
  // CHARGER LES MEMBRES
  // =====================================================

  const loadMembres = async () => {
    try {
      setLoading(true);

      const token = getToken();

      if (!token) {
        throw new Error(
          "Session administrateur introuvable. Veuillez vous reconnecter."
        );
      }

      const response = await fetch(
        `${API_URL}/api/equipe/admin`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      console.log("Réponse API équipe :", data);

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Erreur API (${response.status})`
        );
      }

      /*
       * Le backend peut retourner :
       *
       * { membres: [...] }
       *
       * ou directement :
       *
       * [...]
       */

      if (Array.isArray(data)) {
        setMembres(data);
      } else if (Array.isArray(data.membres)) {
        setMembres(data.membres);
      } else {
        setMembres([]);
      }
    } catch (error) {
      console.error(
        "Erreur chargement équipe :",
        error
      );

      alert(
        error.message ||
          "Impossible de charger l'équipe."
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // CHARGEMENT INITIAL
  // =====================================================

  useEffect(() => {
    loadMembres();
  }, []);

  // =====================================================
  // RESET
  // =====================================================

  const resetForm = () => {
    setEditingId(null);

    setNom("");
    setFonction("");
    setBiographie("");

    setFacebook("");
    setInstagram("");
    setLinkedin("");

    setAfficher(true);
    setOrdre(0);

    setPhoto(null);
    setPhotoPreview("");
  };

  // =====================================================
  // PHOTO
  // =====================================================

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    // Vérification taille
    if (file.size > 5 * 1024 * 1024) {
      alert(
        "La photo ne doit pas dépasser 5 MB."
      );

      event.target.value = "";
      return;
    }

    // Vérification type
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert(
        "Format de photo non autorisé. Utilisez JPG, PNG, WEBP ou GIF."
      );

      event.target.value = "";
      return;
    }

    setPhoto(file);

    const previewUrl =
      URL.createObjectURL(file);

    setPhotoPreview(previewUrl);
  };

  // =====================================================
  // MODIFIER
  // =====================================================

  const handleEdit = (membre) => {
    setEditingId(
      membre.id_equipe
    );

    setNom(
      membre.nom || ""
    );

    setFonction(
      membre.fonction || ""
    );

    setBiographie(
      membre.biographie || ""
    );

    setFacebook(
      membre.facebook || ""
    );

    setInstagram(
      membre.instagram || ""
    );

    setLinkedin(
      membre.linkedin || ""
    );

    setAfficher(
      membre.afficher !== false
    );

    setOrdre(
      Number(membre.ordre) || 0
    );

    setPhoto(null);

    if (membre.photo) {
      setPhotoPreview(
        getPhotoUrl(membre.photo)
      );
    } else {
      setPhotoPreview("");
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =====================================================
  // ENREGISTRER
  // =====================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!nom.trim()) {
      alert(
        "Le nom est obligatoire."
      );
      return;
    }

    if (!fonction.trim()) {
      alert(
        "La fonction est obligatoire."
      );
      return;
    }

    try {
      setSaving(true);

      const token = getToken();

      if (!token) {
        throw new Error(
          "Session administrateur introuvable."
        );
      }

      const formData = new FormData();

      formData.append(
        "nom",
        nom.trim()
      );

      formData.append(
        "fonction",
        fonction.trim()
      );

      formData.append(
        "biographie",
        biographie.trim()
      );

      formData.append(
        "facebook",
        facebook.trim()
      );

      formData.append(
        "instagram",
        instagram.trim()
      );

      formData.append(
        "linkedin",
        linkedin.trim()
      );

      formData.append(
        "afficher",
        afficher ? "true" : "false"
      );

      formData.append(
        "ordre",
        String(ordre || 0)
      );

      if (photo) {
        formData.append(
          "photo",
          photo
        );
      }

      const url = editingId
        ? `${API_URL}/api/equipe/${editingId}`
        : `${API_URL}/api/equipe`;

      const method = editingId
        ? "PUT"
        : "POST";

      console.log(
        "Requête équipe :",
        method,
        url
      );

      const response = await fetch(
        url,
        {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      console.log(
        "Réponse sauvegarde équipe :",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Erreur API (${response.status})`
        );
      }

      alert(
        editingId
          ? "Membre modifié avec succès."
          : "Membre ajouté avec succès."
      );

      resetForm();

      await loadMembres();
    } catch (error) {
      console.error(
        "Erreur enregistrement membre :",
        error
      );

      alert(
        error.message ||
          "Erreur lors de l'enregistrement."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // SUPPRIMER
  // =====================================================

  const handleDelete = async (id) => {
    const confirmation =
      window.confirm(
        "Voulez-vous vraiment supprimer ce membre de l'équipe ?"
      );

    if (!confirmation) {
      return;
    }

    try {
      const token = getToken();

      if (!token) {
        throw new Error(
          "Session administrateur introuvable."
        );
      }

      const response =
        await fetch(
          `${API_URL}/api/equipe/${id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      let data = {};

      try {
        data = await response.json();
      } catch {
        data = {};
      }

      console.log(
        "Réponse suppression équipe :",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Erreur API (${response.status})`
        );
      }

      alert(
        "Membre supprimé avec succès."
      );

      if (editingId === id) {
        resetForm();
      }

      await loadMembres();
    } catch (error) {
      console.error(
        "Erreur suppression membre :",
        error
      );

      alert(
        error.message ||
          "Erreur lors de la suppression."
      );
    }
  };

  // =====================================================
  // URL PHOTO
  // =====================================================

  const getPhotoUrl = (photoUrl) => {
    if (!photoUrl) {
      return "";
    }

    if (
      photoUrl.startsWith("http://") ||
      photoUrl.startsWith("https://")
    ) {
      return photoUrl;
    }

    if (photoUrl.startsWith("/")) {
      return `${API_URL}${photoUrl}`;
    }

    return `${API_URL}/${photoUrl}`;
  };

  // =====================================================
  // RENDU
  // =====================================================

  return (
    <div className="admin-equipe-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="admin-equipe-header">

        <div>
          <span className="admin-equipe-kicker">
            MIKWO PÈP LA TV
          </span>

          <h1>
            👥 Gestion de l'équipe
          </h1>

          <p>
            Ajoutez et gérez les membres
            de l'équipe de Mikwo Pèp La TV.
          </p>
        </div>

        <div className="admin-equipe-count">
          <strong>
            {membres.length}
          </strong>

          <span>
            Membre
            {membres.length > 1
              ? "s"
              : ""}
          </span>
        </div>

      </header>

      {/* =================================================
          FORMULAIRE
      ================================================= */}

      <section className="admin-equipe-form-card">

        <div className="admin-equipe-section-header">

          <div>
            <span>
              {editingId
                ? "MODIFICATION"
                : "NOUVEAU MEMBRE"}
            </span>

            <h2>
              {editingId
                ? "Modifier le membre"
                : "Ajouter un membre"}
            </h2>
          </div>

          {editingId && (
            <button
              type="button"
              className="admin-equipe-cancel"
              onClick={resetForm}
              disabled={saving}
            >
              Annuler
            </button>
          )}

        </div>

        <form
          onSubmit={handleSubmit}
          className="admin-equipe-form"
        >

          {/* PHOTO */}

          <div className="admin-equipe-photo-section">

            <div className="admin-equipe-photo-preview">

              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt={
                    nom || "Membre de l'équipe"
                  }
                />
              ) : (
                <span>
                  👤
                </span>
              )}

            </div>

            <div>
              <label>
                Photo du membre
              </label>

              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                onChange={
                  handlePhotoChange
                }
              />

              <small>
                JPG, PNG, WEBP ou GIF —
                5 MB maximum.
              </small>
            </div>

          </div>

          {/* INFORMATIONS */}

          <div className="admin-equipe-grid">

            <div className="admin-equipe-field">

              <label>
                Nom complet *
              </label>

              <input
                type="text"
                value={nom}
                onChange={(e) =>
                  setNom(
                    e.target.value
                  )
                }
                placeholder="Ex. Jean Dupont"
                required
              />

            </div>

            <div className="admin-equipe-field">

              <label>
                Fonction *
              </label>

              <input
                type="text"
                value={fonction}
                onChange={(e) =>
                  setFonction(
                    e.target.value
                  )
                }
                placeholder="Ex. Journaliste"
                required
              />

            </div>

          </div>

          {/* BIOGRAPHIE */}

          <div className="admin-equipe-field">

            <label>
              Biographie
            </label>

            <textarea
              value={biographie}
              onChange={(e) =>
                setBiographie(
                  e.target.value
                )
              }
              rows="6"
              placeholder="Présentez brièvement ce membre de l'équipe..."
            />

          </div>

          {/* RÉSEAUX SOCIAUX */}

          <div className="admin-equipe-socials">

            <h3>
              Réseaux sociaux
            </h3>

            <div className="admin-equipe-grid">

              <div className="admin-equipe-field">

                <label>
                  Facebook
                </label>

                <input
                  type="url"
                  value={facebook}
                  onChange={(e) =>
                    setFacebook(
                      e.target.value
                    )
                  }
                  placeholder="https://facebook.com/..."
                />

              </div>

              <div className="admin-equipe-field">

                <label>
                  Instagram
                </label>

                <input
                  type="url"
                  value={instagram}
                  onChange={(e) =>
                    setInstagram(
                      e.target.value
                    )
                  }
                  placeholder="https://instagram.com/..."
                />

              </div>

              <div className="admin-equipe-field">

                <label>
                  LinkedIn
                </label>

                <input
                  type="url"
                  value={linkedin}
                  onChange={(e) =>
                    setLinkedin(
                      e.target.value
                    )
                  }
                  placeholder="https://linkedin.com/in/..."
                />

              </div>

            </div>

          </div>

          {/* OPTIONS */}

          <div className="admin-equipe-options">

            <label className="admin-equipe-checkbox">

              <input
                type="checkbox"
                checked={afficher}
                onChange={(e) =>
                  setAfficher(
                    e.target.checked
                  )
                }
              />

              <span>
                Afficher ce membre sur
                la page À propos
              </span>

            </label>

            <div className="admin-equipe-order">

              <label>
                Ordre d'affichage
              </label>

              <input
                type="number"
                min="0"
                value={ordre}
                onChange={(e) =>
                  setOrdre(
                    Number(
                      e.target.value
                    )
                  )
                }
              />

            </div>

          </div>

          {/* ACTIONS */}

          <div className="admin-equipe-form-actions">

            <button
              type="submit"
              className="admin-equipe-save"
              disabled={saving}
            >
              {saving
                ? "⏳ Enregistrement..."
                : editingId
                ? "💾 Enregistrer les modifications"
                : "➕ Ajouter le membre"}
            </button>

            {editingId && (
              <button
                type="button"
                className="admin-equipe-reset"
                onClick={resetForm}
                disabled={saving}
              >
                Réinitialiser
              </button>
            )}

          </div>

        </form>

      </section>

      {/* =================================================
          LISTE DES MEMBRES
      ================================================= */}

      <section className="admin-equipe-list-card">

        <div className="admin-equipe-list-header">

          <div>
            <span>
              ÉQUIPE
            </span>

            <h2>
              Membres de l'équipe
            </h2>

            <p>
              Les membres activés apparaîtront
              sur la page À propos.
            </p>
          </div>

          <button
            type="button"
            className="admin-equipe-refresh"
            onClick={loadMembres}
            disabled={loading}
          >
            🔄 Actualiser
          </button>

        </div>

        {/* CHARGEMENT */}

        {loading ? (
          <div className="admin-equipe-empty">

            <div className="admin-equipe-loader"></div>

            <p>
              Chargement de l'équipe...
            </p>

          </div>

        ) : membres.length === 0 ? (

          /* AUCUN MEMBRE */

          <div className="admin-equipe-empty">

            <div className="admin-equipe-empty-icon">
              👥
            </div>

            <h3>
              Aucun membre
            </h3>

            <p>
              Ajoutez le premier membre
              de l'équipe.
            </p>

          </div>

        ) : (

          /* TABLE */

          <div className="admin-equipe-table-wrapper">

            <table className="admin-equipe-table">

              <thead>

                <tr>
                  <th>Photo</th>
                  <th>Nom</th>
                  <th>Fonction</th>
                  <th>Affichage</th>
                  <th>Ordre</th>
                  <th>Actions</th>
                </tr>

              </thead>

              <tbody>

                {membres.map(
                  (membre) => (

                    <tr
                      key={
                        membre.id_equipe
                      }
                    >

                      {/* PHOTO */}

                      <td>

                        <div className="admin-equipe-avatar">

                          {membre.photo ? (

                            <img
                              src={getPhotoUrl(
                                membre.photo
                              )}
                              alt={
                                membre.nom ||
                                "Membre"
                              }
                            />

                          ) : (
                            "👤"
                          )}

                        </div>

                      </td>

                      {/* NOM */}

                      <td>

                        <strong>
                          {membre.nom}
                        </strong>

                        {membre.biographie && (

                          <span className="admin-equipe-bio-preview">

                            {membre.biographie.slice(
                              0,
                              80
                            )}

                            {membre.biographie
                              .length > 80
                              ? "..."
                              : ""}

                          </span>

                        )}

                      </td>

                      {/* FONCTION */}

                      <td>
                        {membre.fonction}
                      </td>

                      {/* AFFICHAGE */}

                      <td>

                        {membre.afficher ? (

                          <span className="admin-equipe-status active">
                            ● Visible
                          </span>

                        ) : (

                          <span className="admin-equipe-status hidden">
                            ● Masqué
                          </span>

                        )}

                      </td>

                      {/* ORDRE */}

                      <td>
                        {membre.ordre ?? 0}
                      </td>

                      {/* ACTIONS */}

                      <td>

                        <div className="admin-equipe-actions">

                          <button
                            type="button"
                            className="admin-equipe-edit"
                            onClick={() =>
                              handleEdit(
                                membre
                              )
                            }
                          >
                            ✏️ Modifier
                          </button>

                          <button
                            type="button"
                            className="admin-equipe-delete"
                            onClick={() =>
                              handleDelete(
                                membre.id_equipe
                              )
                            }
                          >
                            🗑️ Supprimer
                          </button>

                        </div>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </section>

    </div>
  );
}

export default AdminEquipe;
import { useEffect, useState } from "react";
import "./AdminActualites.css";

const API_URL = "http://localhost:3000";

const STATUTS = [
  {
    value: "brouillon",
    label: "Brouillon",
  },
  {
    value: "publie",
    label: "Publié",
  },
  {
    value: "archive",
    label: "Archivé",
  },
];

const FORM_INITIAL = {
  titre: "",
  slug: "",
  contenu: "",
  statut: "brouillon",
  image: null,
};

function AdminActualites() {
  const [articles, setArticles] =
    useState([]);

  const [form, setForm] =
    useState(FORM_INITIAL);

  const [editingId, setEditingId] =
    useState(null);

  const [editingImage, setEditingImage] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const token =
    localStorage.getItem(
      "mikwo_pep_la_token"
    );

  // ======================================================
  // IMAGE URL
  // ======================================================

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) {
      return "";
    }

    const url =
      String(imageUrl).trim();

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

  // ======================================================
  // CHARGER ARTICLES
  // ======================================================

  const loadArticles = async () => {
    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          `${API_URL}/api/articles`
        );

      const data =
        await response.json();

      console.log(
        "ARTICLES :",
        data
      );

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Erreur lors du chargement des articles."
        );
      }

      const liste =
        Array.isArray(data)
          ? data
          : Array.isArray(
              data.articles
            )
            ? data.articles
            : [];

      setArticles(liste);
    } catch (error) {
      console.error(
        "ERREUR ARTICLES :",
        error
      );

      setError(
        error.message ||
          "Impossible de charger les articles."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArticles();
  }, []);

  // ======================================================
  // SLUG
  // ======================================================

  const genererSlug = (texte) => {
    return texte
      .toLowerCase()
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        ""
      )
      .replace(
        /[^a-z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        "");
  };

  // ======================================================
  // FORM
  // ======================================================

  const handleTitreChange = (e) => {
    const titre =
      e.target.value;

    setForm((previous) => ({
      ...previous,
      titre,

      slug:
        editingId
          ? previous.slug
          : genererSlug(titre),
    }));
  };

  const handleChange = (e) => {
    const {
      name,
      value,
    } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ======================================================
  // IMAGE
  // ======================================================

  const handleImageChange = (e) => {
    const file =
      e.target.files?.[0] ||
      null;

    setForm((previous) => ({
      ...previous,
      image: file,
    }));
  };

  // ======================================================
  // NOUVEAU
  // ======================================================

  const handleNouveau = () => {
    setEditingId(null);
    setEditingImage("");

    setForm(FORM_INITIAL);

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ======================================================
  // MODIFIER
  // ======================================================

  const handleEdit = (article) => {
    setEditingId(
      article.id_article
    );

    setEditingImage(
      article.image || ""
    );

    setForm({
      titre:
        article.titre || "",

      slug:
        article.slug || "",

      contenu:
        article.contenu || "",

      statut:
        article.statut ||
        "brouillon",

      image: null,
    });

    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // ======================================================
  // ANNULER
  // ======================================================

  const handleCancel = () => {
    setEditingId(null);
    setEditingImage("");

    setForm(FORM_INITIAL);

    setError("");
    setSuccess("");
  };

  // ======================================================
  // ENREGISTRER
  // ======================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");

    const currentToken =
      localStorage.getItem(
        "mikwo_pep_la_token"
      );

    if (!currentToken) {
      setError(
        "Votre session administrateur a expiré. Veuillez vous reconnecter."
      );

      return;
    }

    if (
      !form.titre.trim() ||
      !form.slug.trim() ||
      !form.contenu.trim()
    ) {
      setError(
        "Veuillez remplir tous les champs obligatoires."
      );

      return;
    }

    // ------------------------------------------
    // IMAGE OBLIGATOIRE À LA CRÉATION
    // ------------------------------------------

    if (
      !editingId &&
      !form.image
    ) {
      setError(
        "Veuillez sélectionner une image."
      );

      return;
    }

    setSaving(true);

    try {
      const url =
        editingId
          ? `${API_URL}/api/articles/${editingId}`
          : `${API_URL}/api/articles`;

      const method =
        editingId
          ? "PUT"
          : "POST";

      // ==================================================
      // FORMDATA
      // ==================================================

      const formData =
        new FormData();

      formData.append(
        "titre",
        form.titre.trim()
      );

      formData.append(
        "slug",
        form.slug.trim()
      );

      formData.append(
        "contenu",
        form.contenu.trim()
      );

      formData.append(
        "statut",
        form.statut
      );

      // ------------------------------------------
      // NOUVELLE IMAGE
      // ------------------------------------------
      //
      // Si l'utilisateur choisit une nouvelle image,
      // elle est envoyée au serveur.
      //
      // Si modification sans nouvelle image,
      // aucun fichier n'est envoyé.
      // Le serveur conserve alors l'ancienne.
      //

      if (form.image) {
        formData.append(
          "image",
          form.image
        );
      }

      console.log(
        "ENVOI ARTICLE",
        {
          editingId,
          method,
          image:
            form.image
              ? form.image.name
              : "Aucune nouvelle image",
        }
      );

      // ==================================================
      // FETCH
      // ==================================================
      //
      // IMPORTANT :
      // NE PAS mettre Content-Type ici.
      //
      // Le navigateur le fait automatiquement pour
      // FormData avec la bonne boundary.
      //

      const response =
        await fetch(
          url,
          {
            method,

            headers: {
              Authorization:
                `Bearer ${currentToken}`,
            },

            body: formData,
          }
        );

      const data =
        await response.json();

      console.log(
        "RÉPONSE ARTICLE :",
        data
      );

      // ==================================================
      // SESSION EXPIRÉE
      // ==================================================

      if (
        response.status === 401
      ) {
        localStorage.removeItem(
          "mikwo_pep_la_token"
        );

        localStorage.removeItem(
          "mikwo_pep_la_user"
        );

        window.location.href =
          "/admin/login";

        return;
      }

      // ==================================================
      // ERREUR
      // ==================================================

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Erreur lors de l'enregistrement de l'article."
        );
      }

      // ==================================================
      // SUCCÈS
      // ==================================================

      setSuccess(
        editingId
          ? form.image
            ? "Article et image modifiés avec succès."
            : "Article modifié avec succès."
          : "Article créé avec succès."
      );

      setEditingId(null);
      setEditingImage("");

      setForm(FORM_INITIAL);

      // Réinitialiser input file
      const imageInput =
        document.getElementById(
          "image"
        );

      if (imageInput) {
        imageInput.value = "";
      }

      await loadArticles();
    } catch (error) {
      console.error(
        "ERREUR ENREGISTREMENT :",
        error
      );

      setError(
        error.message ||
          "Une erreur est survenue."
      );
    } finally {
      setSaving(false);
    }
  };

  // ======================================================
  // SUPPRIMER
  // ======================================================

  const handleDelete = async (
    id
  ) => {
    const confirmation =
      window.confirm(
        "Voulez-vous vraiment supprimer cet article ?"
      );

    if (!confirmation) {
      return;
    }

    const currentToken =
      localStorage.getItem(
        "mikwo_pep_la_token"
      );

    if (!currentToken) {
      setError(
        "Votre session administrateur a expiré."
      );

      return;
    }

    setDeletingId(id);

    setError("");
    setSuccess("");

    try {
      const response =
        await fetch(
          `${API_URL}/api/articles/${id}`,
          {
            method: "DELETE",

            headers: {
              Authorization:
                `Bearer ${currentToken}`,
            },
          }
        );

      const data =
        await response.json();

      if (
        response.status === 401
      ) {
        localStorage.removeItem(
          "mikwo_pep_la_token"
        );

        localStorage.removeItem(
          "mikwo_pep_la_user"
        );

        window.location.href =
          "/admin/login";

        return;
      }

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Impossible de supprimer l'article."
        );
      }

      setSuccess(
        "Article supprimé avec succès."
      );

      if (
        editingId === id
      ) {
        setEditingId(null);
        setEditingImage("");
        setForm(
          FORM_INITIAL
        );
      }

      await loadArticles();
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
          "Erreur lors de la suppression."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ======================================================
  // STATUT
  // ======================================================

  const getStatutLabel = (
    statut
  ) => {
    const found =
      STATUTS.find(
        (item) =>
          item.value === statut
      );

    return found
      ? found.label
      : statut;
  };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <main className="admin-actualites-page">
      <div className="admin-actualites-container">

        {/* HEADER */}

        <div className="admin-actualites-header">

          <div>
            <span className="admin-section-label">
              ADMINISTRATION
            </span>

            <h1>
              Actualités
            </h1>

            <p>
              Gérez les articles
              publiés sur Mikwo
              Pèp La.
            </p>
          </div>

          <button
            type="button"
            className="admin-btn-primary"
            onClick={
              handleNouveau
            }
          >
            + Nouvel article
          </button>

        </div>

        {/* MESSAGES */}

        {error && (
          <div className="admin-message admin-message-error">
            {error}
          </div>
        )}

        {success && (
          <div className="admin-message admin-message-success">
            {success}
          </div>
        )}

        {/* FORMULAIRE */}

        <section className="admin-article-form-card">

          <div className="admin-card-title">

            <div>

              <span>
                {editingId
                  ? "MODIFICATION"
                  : "CRÉATION"}
              </span>

              <h2>
                {editingId
                  ? "Modifier l'article"
                  : "Créer un article"}
              </h2>

            </div>

            {editingId && (
              <button
                type="button"
                className="admin-btn-secondary"
                onClick={
                  handleCancel
                }
              >
                Annuler
              </button>
            )}

          </div>

          <form
            className="admin-article-form"
            onSubmit={
              handleSubmit
            }
          >

            <div className="admin-form-grid">

              {/* TITRE */}

              <div className="admin-form-group admin-form-full">

                <label htmlFor="titre">
                  Titre de l'article
                </label>

                <input
                  id="titre"
                  name="titre"
                  type="text"
                  value={
                    form.titre
                  }
                  onChange={
                    handleTitreChange
                  }
                  placeholder="Ex. Haïti face aux nouveaux défis économiques"
                  required
                />

              </div>

              {/* SLUG */}

              <div className="admin-form-group">

                <label htmlFor="slug">
                  Slug
                </label>

                <input
                  id="slug"
                  name="slug"
                  type="text"
                  value={
                    form.slug
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="haiti-face-aux-nouveaux-defis"
                  required
                />

                <small>
                  Utilisé dans
                  l'URL de
                  l'article.
                </small>

              </div>

              {/* STATUT */}

              <div className="admin-form-group">

                <label htmlFor="statut">
                  Statut
                </label>

                <select
                  id="statut"
                  name="statut"
                  value={
                    form.statut
                  }
                  onChange={
                    handleChange
                  }
                >

                  {STATUTS.map(
                    (statut) => (
                      <option
                        key={
                          statut.value
                        }
                        value={
                          statut.value
                        }
                      >
                        {
                          statut.label
                        }
                      </option>
                    )
                  )}

                </select>

              </div>

              {/* IMAGE */}

              <div className="admin-form-group admin-form-full">

                <label htmlFor="image">
                  Image
                </label>

                {editingId &&
                  editingImage && (
                    <div
                      style={{
                        marginBottom:
                          "12px",
                      }}
                    >
                      <p
                        style={{
                          marginBottom:
                            "8px",
                        }}
                      >
                        Image actuelle :
                      </p>

                      <img
                        src={getImageUrl(
                          editingImage
                        )}
                        alt="Image actuelle"
                        style={{
                          width:
                            "180px",
                          height:
                            "110px",
                          objectFit:
                            "cover",
                          borderRadius:
                            "8px",
                          display:
                            "block",
                        }}
                      />
                    </div>
                  )}

                <input
                  id="image"
                  name="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={
                    handleImageChange
                  }
                  required={
                    !editingId
                  }
                />

                <small>
                  {editingId
                    ? "Laissez vide pour conserver l'image actuelle. Sélectionnez une nouvelle image pour la remplacer. JPG, PNG, WEBP ou GIF — maximum 5 MB."
                    : "JPG, PNG, WEBP ou GIF — maximum 5 MB."}
                </small>

                {form.image && (
                  <small
                    style={{
                      display:
                        "block",
                      marginTop:
                        "8px",
                    }}
                  >
                    Nouvelle image :
                    {" "}
                    <strong>
                      {
                        form.image
                          .name
                      }
                    </strong>
                  </small>
                )}

              </div>

              {/* CONTENU */}

              <div className="admin-form-group admin-form-full">

                <label htmlFor="contenu">
                  Contenu
                </label>

                <textarea
                  id="contenu"
                  name="contenu"
                  value={
                    form.contenu
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Écrivez le contenu de votre article..."
                  rows="12"
                  required
                />

              </div>

            </div>

            {/* ACTIONS */}

            <div className="admin-form-actions">

              <button
                type="submit"
                className="admin-btn-primary"
                disabled={
                  saving
                }
              >
                {saving
                  ? "Enregistrement..."
                  : editingId
                    ? "Enregistrer les modifications"
                    : "Publier / Enregistrer"}
              </button>

              {editingId && (
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={
                    handleCancel
                  }
                  disabled={
                    saving
                  }
                >
                  Annuler
                </button>
              )}

            </div>

          </form>

        </section>

        {/* LISTE */}

        <section className="admin-articles-list-section">

          <div className="admin-list-header">

            <div>

              <span className="admin-section-label">
                CONTENU
              </span>

              <h2>
                Articles existants
              </h2>

            </div>

            <div className="admin-articles-count">
              {articles.length} article
              {articles.length !==
              1
                ? "s"
                : ""}
            </div>

          </div>

          {loading ? (

            <div className="admin-empty-state">
              Chargement des articles...
            </div>

          ) : articles.length ===
            0 ? (

            <div className="admin-empty-state">

              <strong>
                Aucun article pour
                le moment.
              </strong>

              <p>
                Créez votre premier
                article pour
                commencer.
              </p>

            </div>

          ) : (

            <div className="admin-articles-table-wrapper">

              <table className="admin-articles-table">

                <thead>

                  <tr>

                    <th>
                      Article
                    </th>

                    <th>
                      Auteur
                    </th>

                    <th>
                      Statut
                    </th>

                    <th>
                      Date
                    </th>

                    <th>
                      Actions
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {articles.map(
                    (article) => (

                      <tr
                        key={
                          article.id_article
                        }
                      >

                        {/* ARTICLE */}

                        <td>

                          <div className="admin-article-title-cell">

                            {article.image && (
                              <img
                                src={getImageUrl(
                                  article.image
                                )}
                                alt={
                                  article.titre
                                }
                                onError={(
                                  e
                                ) => {
                                  e.currentTarget.style.display =
                                    "none";
                                }}
                              />
                            )}

                            <div>

                              <strong>
                                {
                                  article.titre
                                }
                              </strong>

                              <span>
                                /
                                {
                                  article.slug
                                }
                              </span>

                            </div>

                          </div>

                        </td>

                        {/* AUTEUR */}

                        <td>
                          {
                            article.auteur ||
                            "—"
                          }
                        </td>

                        {/* STATUT */}

                        <td>

                          <span
                            className={`admin-status admin-status-${article.statut}`}
                          >
                            {getStatutLabel(
                              article.statut
                            )}
                          </span>

                        </td>

                        {/* DATE */}

                        <td>
                          {article.created_at
                            ? new Date(
                                article.created_at
                              ).toLocaleDateString(
                                "fr-FR"
                              )
                            : "-"}
                        </td>

                        {/* ACTIONS */}

                        <td>

                          <div className="admin-table-actions">

                            <button
                              type="button"
                              className="admin-action-edit"
                              onClick={() =>
                                handleEdit(
                                  article
                                )
                              }
                            >
                              Modifier
                            </button>

                            <button
                              type="button"
                              className="admin-action-delete"
                              onClick={() =>
                                handleDelete(
                                  article.id_article
                                )
                              }
                              disabled={
                                deletingId ===
                                article.id_article
                              }
                            >
                              {deletingId ===
                              article.id_article
                                ? "Suppression..."
                                : "Supprimer"}
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
    </main>
  );
}

export default AdminActualites;
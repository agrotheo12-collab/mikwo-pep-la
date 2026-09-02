import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminAjouterActualite.css";

function AdminAjouterActualite() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);

  const [formData, setFormData] = useState({
    titre: "",
    slug: "",
    contenu: "",
    statut: "publie",
    id_categorie: "8",
  });

  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Erreur lors du chargement des catégories.");
        }

        return response.json();
      })
      .then((data) => {
        setCategories(data);
      })
      .catch((error) => {
        console.error(error);
        setError("Impossible de charger les catégories.");
      });
  }, []);

  const genererSlug = (texte) => {
    return texte
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (name === "titre") {
      setFormData((previous) => ({
        ...previous,
        slug: genererSlug(value),
      }));
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Format non autorisé. Utilisez JPG, PNG, WEBP ou GIF."
      );

      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("L'image ne doit pas dépasser 5 MB.");

      event.target.value = "";
      return;
    }

    setError("");
    setImage(file);

    const imagePreview = URL.createObjectURL(file);
    setPreview(imagePreview);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    const token = localStorage.getItem("mikwo_pep_la_token");

    if (!token) {
      navigate("/admin/login");
      return;
    }

    if (!image) {
      setError("Veuillez sélectionner une image.");
      setLoading(false);
      return;
    }

    try {
      const data = new FormData();

      data.append("titre", formData.titre.trim());
      data.append("slug", formData.slug.trim());
      data.append("contenu", formData.contenu.trim());
      data.append("statut", formData.statut);
      data.append(
        "id_categorie",
        Number(formData.id_categorie)
      );
      data.append("image", image);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/articles`, 
        {
          method: "POST",

          headers: {
            Authorization: `Bearer ${token}`,
          },

          body: data,
        }
      );

      const result = await response.json();

      if (response.status === 401) {
        localStorage.removeItem("mikwo_pep_la_token");
        localStorage.removeItem("mikwo_pep_la_user");

        navigate("/admin/login");
        return;
      }

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Erreur lors de l'ajout de l'article."
        );
      }

      setMessage(
        "L'article a été publié avec succès."
      );

      setFormData({
        titre: "",
        slug: "",
        contenu: "",
        statut: "publie",
        id_categorie: "8",
      });

      setImage(null);
      setPreview("");

      setTimeout(() => {
        navigate("/admin/actualites");
      }, 1200);
    } catch (error) {
      console.error(
        "Erreur ajout article :",
        error
      );

      setError(
        error.message ||
          "Erreur lors de la communication avec le serveur."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-ajouter-page">

      <section className="admin-ajouter-header">
        <div className="admin-ajouter-container">
          <h1>AJOUTER UNE ACTUALITÉ</h1>

          <p>
            Publiez une nouvelle actualité sur
            Mikwo Pèp La.
          </p>
        </div>
      </section>

      <section className="admin-ajouter-content">
        <div className="admin-ajouter-container">

          <form
            className="admin-form-card"
            onSubmit={handleSubmit}
          >

            <h2>Nouvelle actualité</h2>

            {message && (
              <div className="admin-form-message">
                {message}
              </div>
            )}

            {error && (
              <div className="admin-form-error">
                {error}
              </div>
            )}

            <div className="admin-form-group">
              <label htmlFor="titre">
                Titre
              </label>

              <input
                id="titre"
                name="titre"
                type="text"
                value={formData.titre}
                onChange={handleChange}
                placeholder="Titre de l'actualité"
                required
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="slug">
                Slug
              </label>

              <input
                id="slug"
                name="slug"
                type="text"
                value={formData.slug}
                onChange={handleChange}
                placeholder="titre-de-l-actualite"
                required
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="contenu">
                Contenu
              </label>

              <textarea
                id="contenu"
                name="contenu"
                value={formData.contenu}
                onChange={handleChange}
                placeholder="Contenu de l'actualité"
                rows="8"
                required
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="image">
                Image de l'actualité
              </label>

              <input
                id="image"
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageChange}
                required
              />

              <small>
                JPG, PNG, WEBP ou GIF — maximum 5 MB.
              </small>
            </div>

            {preview && (
              <div className="admin-image-preview">
                <p>Aperçu :</p>

                <img
                  src={preview}
                  alt="Aperçu de l'actualité"
                />
              </div>
            )}

            <div className="admin-form-group">
              <label htmlFor="id_categorie">
                Catégorie
              </label>

              <select
                id="id_categorie"
                name="id_categorie"
                value={formData.id_categorie}
                onChange={handleChange}
                required
              >
                {categories.map((categorie) => (
                  <option
                    key={categorie.id_categorie}
                    value={categorie.id_categorie}
                  >
                    {categorie.nom}
                  </option>
                ))}
              </select>
            </div>

            <div className="admin-form-group">
              <label htmlFor="statut">
                Statut
              </label>

              <select
                id="statut"
                name="statut"
                value={formData.statut}
                onChange={handleChange}
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

            <div className="admin-form-actions">

              <button
                type="button"
                className="admin-cancel-button"
                onClick={() =>
                  navigate("/admin/actualites")
                }
                disabled={loading}
              >
                Annuler
              </button>

              <button
                type="submit"
                className="admin-submit-button"
                disabled={loading}
              >
                {loading
                  ? "Publication en cours..."
                  : "Publier l'actualité"}
              </button>

            </div>

          </form>

        </div>
      </section>

    </main>
  );
}

export default AdminAjouterActualite;
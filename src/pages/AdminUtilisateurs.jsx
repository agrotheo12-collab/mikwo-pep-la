import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminUtilisateurs.css";

function AdminUtilisateurs() {
  const navigate = useNavigate();

  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    nom: "",
    email: "",
    password: "",
    role: "journaliste",
  });

  const token = localStorage.getItem(
    "mikwo_pep_la_token"
  );

  const user = JSON.parse(
    localStorage.getItem(
      "mikwo_pep_la_user"
    ) || "{}"
  );

  // ======================================================
  // VÉRIFIER QUE L'UTILISATEUR EST ADMIN
  // ======================================================

  useEffect(() => {
    if (!token || user.role !== "admin") {
      navigate("/admin/login", {
        replace: true,
      });
    }
  }, [token, user.role, navigate]);

  // ======================================================
  // CHARGER LES UTILISATEURS
  // ======================================================

  const chargerUtilisateurs = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/utilisateurs",
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
            "Impossible de charger les utilisateurs."
        );
      }

      setUtilisateurs(data);
    } catch (err) {
      console.error(
        "Erreur utilisateurs :",
        err
      );

      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (
      token &&
      user.role === "admin"
    ) {
      chargerUtilisateurs();
    }
  }, []);

  // ======================================================
  // FORMULAIRE
  // ======================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((ancien) => ({
      ...ancien,
      [name]: value,
    }));
  };

  // ======================================================
  // CRÉER UTILISATEUR
  // ======================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (
      !form.nom.trim() ||
      !form.email.trim() ||
      !form.password.trim()
    ) {
      setError(
        "Veuillez remplir tous les champs obligatoires."
      );
      return;
    }

    if (form.password.length < 6) {
      setError(
        "Le mot de passe doit contenir au moins 6 caractères."
      );
      return;
    }

    try {
      setCreating(true);

      const response = await fetch(
        "/api/utilisateurs",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization: `Bearer ${token}`,
          },

          body: JSON.stringify({
            nom: form.nom.trim(),
            email: form.email.trim(),
            password: form.password,
            role: form.role,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Impossible de créer l'utilisateur."
        );
      }

      setMessage(
        "Utilisateur créé avec succès."
      );

      setForm({
        nom: "",
        email: "",
        password: "",
        role: "journaliste",
      });

      await chargerUtilisateurs();
    } catch (err) {
      console.error(
        "Erreur création utilisateur :",
        err
      );

      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  // ======================================================
  // SUPPRIMER UTILISATEUR
  // ======================================================

  const handleDelete = async (id, nom) => {
    if (
      !window.confirm(
        `Voulez-vous vraiment supprimer le compte de ${nom} ?`
      )
    ) {
      return;
    }

    setMessage("");
    setError("");

    try {
      const response =
        await fetch(
          `/api/utilisateurs/${id}`,
          {
            method: "DELETE",

            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Impossible de supprimer cet utilisateur."
        );
      }

      setMessage(
        "Utilisateur supprimé avec succès."
      );

      await chargerUtilisateurs();
    } catch (err) {
      console.error(
        "Erreur suppression utilisateur :",
        err
      );

      setError(err.message);
    }
  };

  // ======================================================
  // LOGOUT
  // ======================================================

  const handleLogout = () => {
    localStorage.removeItem(
      "mikwo_pep_la_token"
    );

    localStorage.removeItem(
      "mikwo_pep_la_user"
    );

    navigate("/admin/login", {
      replace: true,
    });
  };

  // ======================================================
  // ROLE LABEL
  // ======================================================

  const getRoleLabel = (role) => {
    switch (role) {
      case "admin":
        return "Administrateur";

      case "editeur":
        return "Éditeur";

      case "journaliste":
        return "Journaliste";

      default:
        return role;
    }
  };

  // ======================================================
  // RENDER
  // ======================================================

  return (
    <div className="admin-users-page">

      {/* =========================
          HEADER
      ========================= */}

      <header className="admin-users-header">

        <div>
          <span className="admin-users-brand">
            MIKWO PÈP LA
          </span>

          <h1>
            Gestion des utilisateurs
          </h1>

          <p>
            Gérez les administrateurs,
            éditeurs et journalistes.
          </p>
        </div>

        <div className="admin-users-header-actions">

          <button
            className="admin-users-back"
            onClick={() =>
              navigate("/admin")
            }
          >
            ← Tableau de bord
          </button>

          <button
            className="admin-users-logout"
            onClick={handleLogout}
          >
            🚪 Déconnexion
          </button>

        </div>

      </header>


      {/* =========================
          CONTENU
      ========================= */}

      <main className="admin-users-content">

        {/* =========================
            MESSAGES
        ========================= */}

        {message && (
          <div className="admin-users-success">
            ✅ {message}
          </div>
        )}

        {error && (
          <div className="admin-users-error">
            ❌ {error}
          </div>
        )}


        {/* =========================
            AJOUTER UTILISATEUR
        ========================= */}

        <section className="admin-users-card">

          <div className="admin-users-card-header">

            <div>
              <h2>
                ➕ Ajouter un utilisateur
              </h2>

              <p>
                Créer un nouveau compte
                pour l'équipe.
              </p>
            </div>

          </div>


          <form
            className="admin-users-form"
            onSubmit={handleSubmit}
          >

            {/* NOM */}

            <div className="admin-users-field">

              <label htmlFor="nom">
                Nom complet
              </label>

              <input
                id="nom"
                name="nom"
                type="text"
                placeholder="Ex : Jean Dupont"
                value={form.nom}
                onChange={handleChange}
                required
              />

            </div>


            {/* EMAIL */}

            <div className="admin-users-field">

              <label htmlFor="email">
                Adresse email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                placeholder="Ex : jean@email.com"
                value={form.email}
                onChange={handleChange}
                required
              />

            </div>


            {/* MOT DE PASSE */}

            <div className="admin-users-field">

              <label htmlFor="password">
                Mot de passe
              </label>

              <input
                id="password"
                name="password"
                type="password"
                placeholder="Minimum 6 caractères"
                value={form.password}
                onChange={handleChange}
                minLength={6}
                required
              />

            </div>


            {/* ROLE */}

            <div className="admin-users-field">

              <label htmlFor="role">
                Rôle
              </label>

              <select
                id="role"
                name="role"
                value={form.role}
                onChange={handleChange}
              >

                <option value="journaliste">
                  Journaliste
                </option>

                <option value="editeur">
                  Éditeur
                </option>

                <option value="admin">
                  Administrateur
                </option>

              </select>

            </div>


            {/* BOUTON */}

            <button
              type="submit"
              className="admin-users-submit"
              disabled={creating}
            >
              {creating
                ? "Création..."
                : "➕ Créer l'utilisateur"}
            </button>

          </form>

        </section>


        {/* =========================
            LISTE UTILISATEURS
        ========================= */}

        <section className="admin-users-card">

          <div className="admin-users-card-header">

            <div>
              <h2>
                👥 Utilisateurs
              </h2>

              <p>
                {utilisateurs.length}{" "}
                utilisateur(s) enregistré(s).
              </p>
            </div>

            <button
              className="admin-users-refresh"
              onClick={
                chargerUtilisateurs
              }
            >
              🔄 Actualiser
            </button>

          </div>


          {loading ? (
            <div className="admin-users-loading">
              Chargement des utilisateurs...
            </div>
          ) : utilisateurs.length === 0 ? (
            <div className="admin-users-empty">
              Aucun utilisateur trouvé.
            </div>
          ) : (
            <div className="admin-users-table-wrapper">

              <table className="admin-users-table">

                <thead>

                  <tr>
                    <th>Nom</th>
                    <th>Email</th>
                    <th>Rôle</th>
                    <th>Action</th>
                  </tr>

                </thead>

                <tbody>

                  {utilisateurs.map(
                    (utilisateur) => (

                      <tr
                        key={
                          utilisateur.id_utilisateur
                        }
                      >

                        <td>
                          <strong>
                            {
                              utilisateur.nom
                            }
                          </strong>
                        </td>

                        <td>
                          {
                            utilisateur.email
                          }
                        </td>

                        <td>

                          <span
                            className={`admin-users-role role-${utilisateur.role}`}
                          >
                            {getRoleLabel(
                              utilisateur.role
                            )}
                          </span>

                        </td>

                        <td>

                          {utilisateur.id_utilisateur ===
                          user.id_utilisateur ? (
                            <span className="admin-users-current">
                              Votre compte
                            </span>
                          ) : (
                            <button
                              className="admin-users-delete"
                              onClick={() =>
                                handleDelete(
                                  utilisateur.id_utilisateur,
                                  utilisateur.nom
                                )
                              }
                            >
                              🗑️ Supprimer
                            </button>
                          )}

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </section>

      </main>


      {/* =========================
          FOOTER
      ========================= */}

      <footer className="admin-users-footer">

        <span>
          ©️ {new Date().getFullYear()} Mikwo Pèp La TV
        </span>

        <span>
          Administration sécurisée
        </span>

      </footer>

    </div>
  );
}

export default AdminUtilisateurs;
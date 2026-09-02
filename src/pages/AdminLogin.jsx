import { useState } from "react";
import { useNavigate } from "react-router-dom";

function AdminLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(
          data.message || "Échec de la connexion."
        );
        return;
      }

      // =====================================================
      // ENREGISTREMENT DU TOKEN ADMINISTRATEUR
      // =====================================================

      localStorage.setItem(
        "mikwo_pep_la_token",
        data.token
      );

      // =====================================================
      // ENREGISTREMENT DE L'UTILISATEUR
      // =====================================================

      localStorage.setItem(
        "mikwo_pep_la_user",
        JSON.stringify(data.user)
      );

      // =====================================================
      // REDIRECTION VERS L'ADMIN
      // =====================================================

      navigate("/admin/live");
    } catch (error) {
      console.error("Erreur login :", error);

      setError(
        "Impossible de contacter le serveur."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">

        <h1>Administration</h1>

        <p>
          Connectez-vous à votre espace
          d'administration.
        </p>

        {error && (
          <div className="admin-login-error">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* EMAIL */}
          <div>
            <label htmlFor="email">
              Adresse email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="Votre adresse email"
              required
            />
          </div>

          {/* PASSWORD */}
          <div>
            <label htmlFor="password">
              Mot de passe
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Votre mot de passe"
              required
            />
          </div>

          {/* BOUTON */}
          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Connexion..."
              : "Se connecter"}
          </button>

        </form>
      </div>
    </div>
  );
}

export default AdminLogin;
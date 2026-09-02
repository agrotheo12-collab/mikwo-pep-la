import { useNavigate } from "react-router-dom";
import "./AdminDashboard.css";

function AdminDashboard() {
  const navigate = useNavigate();

  // ==========================================
  // UTILISATEUR CONNECTÉ
  // ==========================================

  const user = JSON.parse(
    localStorage.getItem(
      "mikwo_pep_la_user"
    ) || "{}"
  );

  const role = user.role || "";

  // ==========================================
  // DÉCONNEXION
  // ==========================================

  const handleLogout = () => {
    localStorage.removeItem(
      "mikwo_pep_la_token"
    );

    localStorage.removeItem(
      "mikwo_pep_la_user"
    );

    navigate(
      "/admin/login",
      {
        replace: true,
      }
    );
  };

  // ==========================================
  // MENU ADMIN
  // ==========================================

  const menuItems = [
    {
      icon: "📊",
      title: "Tableau de bord",
      description:
        "Vue générale de l'administration",
      path: "/admin",
      roles: [
        "admin",
        "editeur",
        "journaliste",
      ],
    },

    {
      icon: "📰",
      title: "Actualités",
      description:
        "Gérer les articles et les actualités",
      path: "/admin/actualites",
      roles: [
        "admin",
        "editeur",
        "journaliste",
      ],
    },

    {
      icon: "🎥",
      title: "Vidéos",
      description:
        "Gérer les vidéos publiées",
      path: "/admin/videos",
      roles: [
        "admin",
        "editeur",
        "journaliste",
      ],
    },

    {
      icon: "📷",
      title: "Photos",
      description:
        "Gérer les photos et galeries",
      path: "/admin/photos",
      roles: [
        "admin",
        "editeur",
        "journaliste",
      ],
    },

    {
      icon: "🔴",
      title: "Live",
      description:
        "Gérer les directs et les spectateurs",
      path: "/admin/live",
      roles: [
        "admin",
      ],
    },

    {
      icon: "✉️",
      title: "Messages",
      description:
        "Consulter les messages des visiteurs",
      path: "/admin/messages",
      roles: [
        "admin",
      ],
    },

    {
      icon: "👤",
      title: "Utilisateurs",
      description:
        "Gérer les administrateurs, éditeurs et journalistes",
      path: "/admin/utilisateurs",
      roles: [
        "admin",
      ],
    },

    {
      icon: "👥",
      title: "Équipe",
      description:
        "Gérer les membres de l'équipe de Mikwo Pèp La TV",
      path: "/admin/equipe",
      roles: [
        "admin",
      ],
    },
  ];

  // ==========================================
  // FILTRE MENU SELON WÒL
  // ==========================================

  const visibleMenuItems =
    menuItems.filter((item) =>
      item.roles.includes(role)
    );

  // ==========================================
  // NOM WÒL LA
  // ==========================================

  const getRoleName = () => {
    switch (role) {
      case "admin":
        return "Administrateur";

      case "editeur":
        return "Éditeur";

      case "journaliste":
        return "Journaliste";

      default:
        return "Utilisateur";
    }
  };

  // ==========================================
  // ICÔNE WÒL LA
  // ==========================================

  const getRoleIcon = () => {
    switch (role) {
      case "admin":
        return "👑";

      case "editeur":
        return "✏️";

      case "journaliste":
        return "📰";

      default:
        return "👤";
    }
  };

  // ==========================================
  // RENDU
  // ==========================================

  return (
    <div className="admin-dashboard">

      {/* =====================================
          HEADER
      ===================================== */}

      <header className="admin-dashboard-header">

        <div>

          <span className="admin-dashboard-brand">
            MIKWO PÈP LA
          </span>

          <h1>
            Administration
          </h1>

          <p>
            Bienvenue dans votre espace
            d'administration.
          </p>

        </div>

        <button
          className="admin-logout-button"
          onClick={handleLogout}
        >
          🚪 Déconnexion
        </button>

      </header>

      {/* =====================================
          UTILISATEUR CONNECTÉ
      ===================================== */}

      <section className="admin-user-card">

        <div className="admin-user-icon">
          {getRoleIcon()}
        </div>

        <div>

          <strong>
            {user.nom ||
              "Utilisateur"}
          </strong>

          <span>
            {user.email ||
              "Compte utilisateur"}
          </span>

        </div>

        <div className="admin-role">
          {getRoleName()}
        </div>

      </section>

      {/* =====================================
          MENU
      ===================================== */}

      <main className="admin-dashboard-content">

        <div className="admin-section-title">

          <h2>
            Gestion du site
          </h2>

          <p>
            Sélectionnez une section pour
            gérer le contenu de
            Mikwo Pèp La TV.
          </p>

        </div>

        <div className="admin-menu-grid">

          {visibleMenuItems.map(
            (item) => (

              <button
                key={item.path}
                className="admin-menu-card"
                onClick={() =>
                  navigate(item.path)
                }
              >

                <span className="admin-menu-icon">
                  {item.icon}
                </span>

                <div className="admin-menu-text">

                  <h3>
                    {item.title}
                  </h3>

                  <p>
                    {item.description}
                  </p>

                </div>

                <span className="admin-menu-arrow">
                  →
                </span>

              </button>

            )
          )}

        </div>

      </main>

      {/* =====================================
          FOOTER
      ===================================== */}

      <footer className="admin-dashboard-footer">

        <span>
          ©️{" "}
          {new Date().getFullYear()}{" "}
          Mikwo Pèp La TV
        </span>

        <span>
          🔐 Administration sécurisée
        </span>

      </footer>

    </div>
  );
}

export default AdminDashboard;
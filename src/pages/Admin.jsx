import { useNavigate } from "react-router-dom";
import "./Admin.css";

function Admin() {
  const navigate = useNavigate();

  return (
    <main className="admin-page">
      <div className="admin-header">
        <div>
          <span className="admin-label">MIKWO PÈP LA</span>
          <h1>Tableau de bord</h1>
          <p>
            Gérez votre Web TV, vos actualités, vos vidéos et vos directs.
          </p>
        </div>
      </div>

      <section className="admin-cards">

        {/* ACTUALITÉS */}
        <div
          className="admin-card"
          onClick={() => navigate("/admin/actualites")}
        >
          <div className="admin-card-icon">📰</div>

          <div>
            <h3>Actualités</h3>
            <p>
              Ajouter, modifier et supprimer les actualités.
            </p>
          </div>
        </div>

        {/* VIDÉOS */}
        <div
          className="admin-card"
          onClick={() => navigate("/admin/videos")}
        >
          <div className="admin-card-icon">🎥</div>

          <div>
            <h3>Vidéos</h3>
            <p>
              Gérer les vidéos publiées sur la plateforme.
            </p>
          </div>
        </div>

        {/* DIRECTS */}
        <div
          className="admin-card admin-card-live"
          onClick={() => navigate("/admin/live")}
        >
          <div className="admin-card-icon">🔴</div>

          <div>
            <h3>Gestion des directs</h3>
            <p>
              Surveiller les directs et consulter les spectateurs.
            </p>
          </div>
        </div>

        {/* ÉMISSIONS */}
        <div
          className="admin-card"
          onClick={() => navigate("/emissions")}
        >
          <div className="admin-card-icon">🎙️</div>

          <div>
            <h3>Émissions</h3>
            <p>
              Consulter et gérer les émissions de Mikwo Pèp La.
            </p>
          </div>
        </div>

        {/* PROGRAMMATION */}
        <div
          className="admin-card"
          onClick={() => navigate("/programmation")}
        >
          <div className="admin-card-icon">📅</div>

          <div>
            <h3>Programmation</h3>
            <p>
              Consulter la grille et les horaires des programmes.
            </p>
          </div>
        </div>

        {/* MESSAGES */}
        <div
          className="admin-card"
          onClick={() => navigate("/contact")}
        >
          <div className="admin-card-icon">✉️</div>

          <div>
            <h3>Messages</h3>
            <p>
              Consulter les messages envoyés par les visiteurs.
            </p>
          </div>
        </div>

        {/* PARAMÈTRES */}
        <div className="admin-card">
          <div className="admin-card-icon">⚙️</div>

          <div>
            <h3>Paramètres</h3>
            <p>
              Configurer les paramètres de la Web TV.
            </p>
          </div>
        </div>

      </section>
    </main>
  );
}

export default Admin;
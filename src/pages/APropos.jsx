import { useEffect, useState } from "react";
import "./APropos.css";

const API_URL = import.meta.env.VITE_API_URL;

function APropos() {
  const [membres, setMembres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // =====================================================
  // CHARGER L'ÉQUIPE
  // =====================================================

  useEffect(() => {
    const loadEquipe = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/api/equipe`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Impossible de charger l'équipe."
          );
        }

        setMembres(
          Array.isArray(data.membres)
            ? data.membres
            : []
        );
      } catch (err) {
        console.error(
          "Erreur chargement équipe :",
          err
        );

        setError(
          "Impossible de charger les membres de l'équipe."
        );
      } finally {
        setLoading(false);
      }
    };

    loadEquipe();
  }, []);

  // =====================================================
  // URL PHOTO
  // =====================================================

  const getPhotoUrl = (photo) => {
    if (!photo) {
      return "";
    }

    if (
      photo.startsWith("http://") ||
      photo.startsWith("https://")
    ) {
      return photo;
    }

    if (photo.startsWith("/")) {
      return `${API_URL}${photo}`;
    }

    return `${API_URL}/${photo}`;
  };

  // =====================================================
  // RENDU
  // =====================================================

  return (
    <main className="apropos-page">

      {/* =================================================
          HERO
      ================================================= */}

      <section className="apropos-hero">

        <div className="apropos-container">

          <span className="apropos-kicker">
            MIKWO PÈP LA TV
          </span>

          <h1>
            À propos de nous
          </h1>

          <p>
            Une plateforme d'information,
            de proximité et de communication
            au service du peuple haïtien.
          </p>

        </div>

      </section>

      {/* =================================================
          PRÉSENTATION
      ================================================= */}

      <section className="apropos-section">

        <div className="apropos-container">

          <div className="apropos-content">

            <span className="apropos-section-kicker">
              QUI SOMMES-NOUS ?
            </span>

            <h2>
              Mikwo Pèp La TV
            </h2>

            <p>
              Mikwo Pèp La TV est une plateforme
              médiatique haïtienne qui a pour
              mission d'informer, d'éduquer et
              de donner la parole à la population.
            </p>

            <p>
              À travers l'actualité, les reportages,
              les interviews, les émissions et les
              contenus audiovisuels, nous cherchons
              à rapprocher l'information du public
              et à mettre en lumière les réalités
              de la société haïtienne.
            </p>

          </div>

        </div>

      </section>

      {/* =================================================
          MISSION
      ================================================= */}

      <section className="apropos-mission">

        <div className="apropos-container">

          <div className="apropos-mission-grid">

            <article className="apropos-mission-card">
              <div className="apropos-mission-icon">
                📰
              </div>

              <h3>
                Informer
              </h3>

              <p>
                Fournir une information fiable,
                pertinente et accessible à notre
                audience.
              </p>
            </article>

            <article className="apropos-mission-card">
              <div className="apropos-mission-icon">
                🎙️
              </div>

              <h3>
                Donner la parole
              </h3>

              <p>
                Mettre en avant les voix,
                les opinions et les réalités
                de la population.
              </p>
            </article>

            <article className="apropos-mission-card">
              <div className="apropos-mission-icon">
                📺
              </div>

              <h3>
                Rapprocher
              </h3>

              <p>
                Utiliser les médias numériques
                pour rapprocher l'information
                du public.
              </p>
            </article>

          </div>

        </div>

      </section>

      {/* =================================================
          ÉQUIPE
      ================================================= */}

      <section className="apropos-equipe">

        <div className="apropos-container">

          <div className="apropos-equipe-header">

            <span className="apropos-section-kicker">
              NOTRE ÉQUIPE
            </span>

            <h2>
              Les professionnels derrière
              Mikwo Pèp La TV
            </h2>

            <p>
              Une équipe engagée pour vous
              informer, vous accompagner et
              donner une voix aux réalités
              de notre société.
            </p>

          </div>

          {/* =================================================
              LOADING
          ================================================= */}

          {loading && (
            <div className="apropos-equipe-loading">

              <div className="apropos-loader"></div>

              <p>
                Chargement de notre équipe...
              </p>

            </div>
          )}

          {/* =================================================
              ERREUR
          ================================================= */}

          {!loading && error && (
            <div className="apropos-equipe-error">

              <span>
                ⚠️
              </span>

              <div>
                <strong>
                  Impossible de charger l'équipe
                </strong>

                <p>
                  {error}
                </p>
              </div>

            </div>
          )}

          {/* =================================================
              AUCUN MEMBRE
          ================================================= */}

          {!loading &&
            !error &&
            membres.length === 0 && (

              <div className="apropos-equipe-empty">

                <div className="apropos-equipe-empty-icon">
                  👥
                </div>

                <h3>
                  Notre équipe
                </h3>

                <p>
                  Les membres de notre équipe
                  seront bientôt présentés ici.
                </p>

              </div>

            )}

          {/* =================================================
              MEMBRES
          ================================================= */}

          {!loading &&
            !error &&
            membres.length > 0 && (

              <div className="apropos-equipe-grid">

                {membres.map((membre) => (

                  <article
                    className="apropos-member-card"
                    key={membre.id_equipe}
                  >

                    {/* PHOTO */}

                    <div className="apropos-member-photo">

                      {membre.photo ? (

                        <img
                          src={getPhotoUrl(
                            membre.photo
                          )}
                          alt={membre.nom}
                          loading="lazy"
                        />

                      ) : (

                        <div className="apropos-member-no-photo">
                          <span>
                            👤
                          </span>
                        </div>

                      )}

                      <div className="apropos-member-photo-overlay"></div>

                    </div>

                    {/* INFORMATIONS */}

                    <div className="apropos-member-info">

                      <span className="apropos-member-label">
                        ÉQUIPE MIKWO PÈP LA
                      </span>

                      <h3>
                        {membre.nom}
                      </h3>

                      <div className="apropos-member-function">
                        {membre.fonction}
                      </div>

                      {membre.biographie && (
  <div className="apropos-member-biography">
    {membre.biographie
      .split(/\n\s*\n/)
      .filter((paragraphe) => paragraphe.trim())
      .map((paragraphe, index) => (
        <p key={index}>
          {paragraphe.trim()}
        </p>
      ))}
  </div>
)}

                      {/* RÉSEAUX SOCIAUX */}

                      {(membre.facebook ||
                        membre.instagram ||
                        membre.linkedin) && (

                        <div className="apropos-member-socials">

                          {membre.facebook && (
                            <a
                              href={membre.facebook}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Facebook de ${membre.nom}`}
                              title="Facebook"
                            >
                              <span>
                                f
                              </span>
                            </a>
                          )}

                          {membre.instagram && (
                            <a
                              href={membre.instagram}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`Instagram de ${membre.nom}`}
                              title="Instagram"
                            >
                              <span>
                                ◎
                              </span>
                            </a>
                          )}

                          {membre.linkedin && (
                            <a
                              href={membre.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              aria-label={`LinkedIn de ${membre.nom}`}
                              title="LinkedIn"
                            >
                              <span>
                                in
                              </span>
                            </a>
                          )}

                        </div>

                      )}

                    </div>

                  </article>

                ))}

              </div>

            )}

        </div>

      </section>

      {/* =================================================
          VALEURS
      ================================================= */}

      <section className="apropos-values">

        <div className="apropos-container">

          <div className="apropos-values-content">

            <span className="apropos-section-kicker">
              NOS VALEURS
            </span>

            <h2>
              Une information au service
              de la communauté
            </h2>

            <div className="apropos-values-list">

              <div>
                <strong>
                  Intégrité
                </strong>

                <p>
                  Nous privilégions une information
                  responsable, honnête et respectueuse
                  de notre audience.
                </p>
              </div>

              <div>
                <strong>
                  Proximité
                </strong>

                <p>
                  Nous restons proches des réalités
                  et des préoccupations de la population.
                </p>
              </div>

              <div>
                <strong>
                  Engagement
                </strong>

                <p>
                  Nous travaillons chaque jour pour
                  contribuer positivement à la société.
                </p>
              </div>

            </div>

          </div>

        </div>

      </section>

    </main>
  );
}

export default APropos;
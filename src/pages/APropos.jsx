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

        // =================================================
        // LE BACKEND PEUT RETOURNER :
        //
        // [
        //   {...},
        //   {...}
        // ]
        //
        // OU :
        //
        // {
        //   membres: [...]
        // }
        // =================================================

        let listeMembres = [];

        if (Array.isArray(data)) {
          listeMembres = data;
        } else if (
          data &&
          Array.isArray(data.membres)
        ) {
          listeMembres = data.membres;
        } else if (
          data &&
          Array.isArray(data.equipe)
        ) {
          listeMembres = data.equipe;
        }

        // =================================================
        // AFFICHER UNIQUEMENT LES MEMBRES AUTORISÉS
        // =================================================

        listeMembres = listeMembres.filter(
          (membre) => {
            return (
              membre.afficher === true ||
              membre.afficher === "true" ||
              membre.afficher === 1 ||
              membre.afficher === "1" ||
              membre.afficher === undefined ||
              membre.afficher === null
            );
          }
        );

        // =================================================
        // TRIER PAR ORDRE
        // =================================================

        listeMembres.sort((a, b) => {
          const ordreA =
            Number(a.ordre) || 9999;

          const ordreB =
            Number(b.ordre) || 9999;

          return ordreA - ordreB;
        });

        setMembres(listeMembres);

      } catch (err) {
        console.error(
          "Erreur chargement équipe :",
          err
        );

        setError(
          err.message ||
            "Impossible de charger les membres de l'équipe."
        );

        setMembres([]);

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

    const url = String(photo).trim();

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
  // BIOGRAPHIE
  // =====================================================

  const renderBiography = (membre) => {
    const bio =
      membre.bio ||
      membre.biographie ||
      membre.description ||
      "";

    if (!bio) {
      return null;
    }

    return (
      <div className="apropos-member-biography">

        {String(bio)
          .split(/\r?\n\s*\r?\n/)
          .filter(
            (paragraphe) =>
              paragraphe.trim()
          )
          .map(
            (paragraphe, index) => (
              <p key={index}>
                {paragraphe.trim()}
              </p>
            )
          )}

      </div>
    );
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

                {membres.map((membre) => {

                  const photo =
                    membre.image_url ||
                    membre.photo ||
                    membre.photo_url ||
                    "";

                  const photoUrl =
                    getPhotoUrl(photo);

                  return (

                    <article
                      className="apropos-member-card"
                      key={membre.id_equipe}
                    >

                      {/* =====================================
                          PHOTO
                      ===================================== */}

                      <div className="apropos-member-photo">

                        {photoUrl ? (

                          <img
                            src={photoUrl}
                            alt={
                              membre.nom ||
                              "Membre de l'équipe"
                            }
                            loading="lazy"
                            onError={(event) => {
                              event.currentTarget.style.display =
                                "none";
                            }}
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

                      {/* =====================================
                          INFORMATIONS
                      ===================================== */}

                      <div className="apropos-member-info">

                        <span className="apropos-member-label">
                          ÉQUIPE MIKWO PÈP LA
                        </span>

                        <h3>
                          {membre.nom ||
                            "Membre de l'équipe"}
                        </h3>

                        {membre.fonction && (

                          <div className="apropos-member-function">
                            {membre.fonction}
                          </div>

                        )}

                        {/* BIOGRAPHIE */}

                        {renderBiography(membre)}

                        {/* =====================================
                            RÉSEAUX SOCIAUX
                        ===================================== */}

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

                  );
                })}

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
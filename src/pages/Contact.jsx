import { useState } from "react";
import "./Contact.css";

function Contact() {
  const [formData, setFormData] = useState({
    nom: "",
    email: "",
    sujet: "",
    message: "",
  });

  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setStatus("");
    setSuccess(false);

    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Une erreur est survenue."
        );
      }

      setSuccess(true);

      setStatus(
        data.message ||
          "Votre message a été envoyé avec succès."
      );

      setFormData({
        nom: "",
        email: "",
        sujet: "",
        message: "",
      });
    } catch (error) {
      console.error("Erreur contact :", error);

      setSuccess(false);

      setStatus(
        error.message ||
          "Impossible d'envoyer le message. Veuillez réessayer."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="contact-page">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <section className="contact-header">
        <div className="container">

          <span className="contact-kicker">
            MIKWO PÈP LA
          </span>

          <h1>CONTACT</h1>

          <p>
            Une question, une suggestion ou une information
            à partager ? Contactez Mikwo Pèp La.
          </p>

        </div>
      </section>


      {/* =====================================================
          CONTENU
      ===================================================== */}

      <section className="contact-section">
        <div className="container">

          <div className="contact-grid">

            {/* =================================================
                INFORMATIONS
            ================================================= */}

            <div className="contact-info">

              <span className="contact-section-label">
                NOUS SOMMES À VOTRE ÉCOUTE
              </span>

              <h2>CONTACTEZ-NOUS</h2>

              <p className="contact-description">
                L'équipe de Mikwo Pèp La est à votre
                disposition pour recevoir vos questions,
                suggestions, informations et demandes.
              </p>


              {/* EMAIL */}

              <div className="contact-item">

                <div className="contact-icon">
                  📧
                </div>

                <div>
                  <h3>Email</h3>

                  <p>
                    contact@mikwopepla.com
                  </p>
                </div>

              </div>


              {/* TELEPHONE */}

              <div className="contact-item">

                <div className="contact-icon">
                  📞
                </div>

                <div>
                  <h3>Téléphone</h3>

                  <p>
                    +509 XX XX XX XX
                  </p>
                </div>

              </div>


              {/* ADRESSE */}

              <div className="contact-item">

                <div className="contact-icon">
                  📍
                </div>

                <div>
                  <h3>Adresse</h3>

                  <p>
                    Haïti
                  </p>
                </div>

              </div>


              {/* =================================================
                  RÉSEAUX SOCIAUX
              ================================================= */}

              <div className="contact-social">

                <h3>Suivez-nous</h3>

                <div className="contact-social-links">

                  <a
                    href="https://www.facebook.com/Mikwo509"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook Mikwo Pèp La"
                  >
                    Facebook
                  </a>

                  <a
                    href="https://youtube.com/@mikwopepla509"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="YouTube Mikwo Pèp La"
                  >
                    YouTube
                  </a>

                  <a
                    href="https://www.tiktok.com/@mikwopepla"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="TikTok Mikwo Pèp La"
                  >
                    TikTok
                  </a>

                </div>

              </div>

            </div>


            {/* =================================================
                FORMULAIRE
            ================================================= */}

            <div className="contact-form-container">

              <span className="contact-section-label">
                ÉCRIVEZ-NOUS
              </span>

              <h2>
                ENVOYEZ-NOUS UN MESSAGE
              </h2>

              <form onSubmit={handleSubmit}>

                {/* NOM */}

                <div className="form-group">

                  <label htmlFor="nom">
                    Nom
                  </label>

                  <input
                    type="text"
                    id="nom"
                    name="nom"
                    value={formData.nom}
                    onChange={handleChange}
                    placeholder="Votre nom"
                    autoComplete="name"
                    required
                  />

                </div>


                {/* EMAIL */}

                <div className="form-group">

                  <label htmlFor="email">
                    Email
                  </label>

                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Votre adresse email"
                    autoComplete="email"
                    required
                  />

                </div>


                {/* SUJET */}

                <div className="form-group">

                  <label htmlFor="sujet">
                    Sujet
                  </label>

                  <input
                    type="text"
                    id="sujet"
                    name="sujet"
                    value={formData.sujet}
                    onChange={handleChange}
                    placeholder="Sujet du message"
                    required
                  />

                </div>


                {/* MESSAGE */}

                <div className="form-group">

                  <label htmlFor="message">
                    Message
                  </label>

                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Écrivez votre message..."
                    rows={6}
                    required
                  />

                </div>


                {/* BOUTON */}

                <button
                  type="submit"
                  className="contact-submit"
                  disabled={loading}
                >
                  {loading
                    ? "Envoi en cours..."
                    : "Envoyer le message"}
                </button>


                {/* MESSAGE DE STATUT */}

                {status && (
                  <div
                    className={`contact-status ${
                      success
                        ? "contact-status-success"
                        : "contact-status-error"
                    }`}
                    role="alert"
                  >
                    {success ? "✓" : "⚠"} {status}
                  </div>
                )}

              </form>

            </div>

          </div>

        </div>
      </section>

    </main>
  );
}

export default Contact;
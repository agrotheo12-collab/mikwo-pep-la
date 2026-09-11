import { Link } from "react-router-dom";
import "./Footer.css";
import logo from "../assets/logo.png";

const contacts = [
  {
    number: "+509 44901402",
    whatsapp: "50944901402",
  },
  {
    number: "+509 41030550",
    whatsapp: "50941030550",
  },
];

function Footer() {
  const currentYear = new Date().getFullYear();

  // ==================================================
  // REMONTE PAJ LA ANLÈ
  // ==================================================

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  };

  return (
    <footer className="site-footer">

      {/* ==================================================
          FOOTER PRINCIPAL
      ================================================== */}

      <div className="footer-main">
        <div className="footer-container">

          {/* BRAND */}
          <div className="footer-column footer-brand">

            <Link
              to="/"
              className="footer-logo"
              onClick={scrollToTop}
            >
              <img
                src={logo}
                alt="Mikwo Pèp La"
              />
            </Link>

            <p>
              Mikwo Pèp La est une Web TV d'information,
              d'actualité et de proximité au service du peuple.
            </p>

            <div className="footer-socials">

              <a
                href="https://www.facebook.com/Mikwo509"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
              >
                f
              </a>

              <a
                href="https://youtube.com/@mikwopepla509"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
              >
                ▶️
              </a>

              <a
                href="https://www.tiktok.com/@mikwopepla"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TikTok"
              >
                ♪
              </a>

            </div>

          </div>

          {/* ==================================================
              NAVIGATION
          ================================================== */}

          <div className="footer-column">

            <h3>Navigation</h3>

            <nav className="footer-links">

              <Link
                to="/"
                onClick={scrollToTop}
              >
                Accueil
              </Link>

              <Link
                to="/direct"
                onClick={scrollToTop}
              >
                Direct
              </Link>

              <Link
                to="/actualites"
                onClick={scrollToTop}
              >
                Actualités
              </Link>

              <Link
                to="/photos"
                onClick={scrollToTop}
              >
                Photos
              </Link>

              <Link
                to="/videos"
                onClick={scrollToTop}
              >
                Vidéos
              </Link>

              <Link
                to="/recherche"
                onClick={scrollToTop}
              >
                Recherche
              </Link>

              <Link
                to="/a-propos"
                onClick={scrollToTop}
              >
                À propos
              </Link>

              <Link
                to="/contact"
                onClick={scrollToTop}
              >
                Contact
              </Link>

            </nav>

          </div>

          {/* ==================================================
              CONTACT
          ================================================== */}

          <div className="footer-column">

            <h3>Contactez-nous</h3>

            <div className="footer-contact">

              {/* TÉLÉPHONE */}

              <div className="footer-contact-item">

                <span className="footer-contact-icon">
                  📞
                </span>

                <div>
                  <strong>Téléphone</strong>

                  {contacts.map((contact) => (
                    <a
                      key={contact.number}
                      href={`tel:${contact.number.replace(
                        /\s/g,
                        ""
                      )}`}
                    >
                      {contact.number}
                    </a>
                  ))}

                </div>

              </div>

              {/* WHATSAPP */}

              <div className="footer-contact-item">

                <span className="footer-contact-icon">
                  💬
                </span>

                <div>
                  <strong>WhatsApp</strong>

                  {contacts.map((contact) => (
                    <a
                      key={contact.whatsapp}
                      href={`https://wa.me/${contact.whatsapp}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Écrire sur WhatsApp
                    </a>
                  ))}

                </div>

              </div>

            </div>

          </div>

        </div>
      </div>

      {/* ==================================================
          FOOTER BOTTOM
      ================================================== */}

      <div className="footer-bottom">

        <div className="footer-container footer-bottom-inner">

          <p>
            ©️ {currentYear} Mikwo Pèp La.
            Tous droits réservés.
          </p>

          <p>
            L'information au service du peuple.
          </p>

        </div>

      </div>

    </footer>
  );
}

export default Footer;
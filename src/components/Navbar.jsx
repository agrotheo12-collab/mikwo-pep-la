import { NavLink } from "react-router-dom";
import "./Navbar.css";
import logo from "../assets/logo.png";

function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-container">

        {/* ==================================================
            LOGO
        ================================================== */}

        <NavLink
          to="/"
          className="navbar-logo"
          aria-label="Mikwo Pèp La - Accueil"
        >
          <img
            src={logo}
            alt="Mikwo Pèp La"
          />
        </NavLink>

        {/* ==================================================
            MENU PUBLIC
        ================================================== */}

        <nav
          className="navbar-menu"
          aria-label="Navigation principale"
        >

          {/* ACCUEIL */}

          <NavLink
            to="/"
            className={({ isActive }) =>
              isActive
                ? "navbar-link active"
                : "navbar-link"
            }
          >
            Accueil
          </NavLink>

          {/* DIRECT */}

          <NavLink
            to="/direct"
            className={({ isActive }) =>
              isActive
                ? "navbar-link active"
                : "navbar-link"
            }
          >
            Direct
          </NavLink>

          {/* ACTUALITÉS */}

          <NavLink
            to="/actualites"
            className={({ isActive }) =>
              isActive
                ? "navbar-link active"
                : "navbar-link"
            }
          >
            Actualités
          </NavLink>

          {/* PHOTOS */}

          <NavLink
            to="/photos"
            className={({ isActive }) =>
              isActive
                ? "navbar-link active"
                : "navbar-link"
            }
          >
            Photos
          </NavLink>

          {/* VIDÉOS */}

          <NavLink
            to="/videos"
            className={({ isActive }) =>
              isActive
                ? "navbar-link active"
                : "navbar-link"
            }
          >
            Vidéos
          </NavLink>

          {/* RECHERCHE */}

          <NavLink
            to="/recherche"
            className={({ isActive }) =>
              isActive
                ? "navbar-link active"
                : "navbar-link"
            }
          >
            Recherche
          </NavLink>

          {/* À PROPOS */}

          <NavLink
            to="/a-propos"
            className={({ isActive }) =>
              isActive
                ? "navbar-link active"
                : "navbar-link"
            }
          >
            À propos
          </NavLink>

          {/* CONTACT */}

          <NavLink
            to="/contact"
            className={({ isActive }) =>
              isActive
                ? "navbar-link active"
                : "navbar-link"
            }
          >
            Contact
          </NavLink>

        </nav>

      </div>
    </header>
  );
}

export default Navbar;
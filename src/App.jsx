import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./ProtectedRoute";

// ==================================================
// PAGES PUBLIC
// ==================================================

import Accueil from "./pages/Accueil";
import Actualites from "./pages/Actualites";
import ArticleDetail from "./pages/ArticleDetail";
import Photos from "./pages/Photos";
import Videos from "./pages/Videos";
import Live from "./pages/Live";
import Contact from "./pages/Contact";
import Recherche from "./pages/Recherche";
import APropos from "./pages/APropos";

// ==================================================
// PAGES ADMIN
// ==================================================

import AdminLogin from "./pages/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard";
import AdminActualites from "./pages/AdminActualites";
import AdminAjouterActualite from "./pages/AdminAjouterActualite";
import AdminAjouterVideo from "./pages/AdminAjouterVideo";
import AdminLive from "./pages/AdminLive";
import AdminMessages from "./pages/AdminMessages";
import AdminPhotos from "./pages/AdminPhotos";
import AdminVideos from "./pages/AdminVideos";
import AdminUtilisateurs from "./pages/AdminUtilisateurs";
import AdminEquipe from "./pages/AdminEquipe";

// ==================================================
// CSS
// ==================================================

import "./App.css";

// ==================================================
// RÔLES
// ==================================================

const ADMIN = [
  "admin",
];

const EQUIPE_EDITORIALE = [
  "admin",
  "editeur",
  "journaliste",
];

// ==================================================
// LAYOUT
// ==================================================

function AppLayout() {
  const location = useLocation();

  const isAdmin =
    location.pathname.startsWith("/admin");

  return (
    <>
      {/* ==================================================
          NAVBAR PUBLIC
      ================================================== */}

      {!isAdmin && <Navbar />}

      <Routes>

        {/* ==================================================
            PUBLIC
        ================================================== */}

        <Route
          path="/"
          element={<Accueil />}
        />

        <Route
          path="/direct"
          element={<Live />}
        />

        <Route
          path="/actualites"
          element={<Actualites />}
        />

        <Route
          path="/actualites/:id"
          element={<ArticleDetail />}
        />

        {/* ==================================================
            PHOTOS
        ================================================== */}

        <Route
          path="/photos"
          element={<Photos />}
        />

        <Route
          path="/photos/:id"
          element={<Photos />}
        />

        <Route
          path="/videos"
          element={<Videos />}
        />

        <Route
          path="/contact"
          element={<Contact />}
        />

        <Route
          path="/recherche"
          element={<Recherche />}
        />

        <Route
          path="/a-propos"
          element={<APropos />}
        />

        {/* ==================================================
            ADMIN LOGIN
        ================================================== */}

        <Route
          path="/admin/login"
          element={<AdminLogin />}
        />

        {/* ==================================================
            DASHBOARD
        ================================================== */}

        <Route
          path="/admin"
          element={
            <ProtectedRoute
              roles={EQUIPE_EDITORIALE}
            >
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* ==================================================
            ACTUALITÉS
        ================================================== */}

        <Route
          path="/admin/actualites"
          element={
            <ProtectedRoute
              roles={EQUIPE_EDITORIALE}
            >
              <AdminActualites />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/actualites/ajouter"
          element={
            <ProtectedRoute
              roles={EQUIPE_EDITORIALE}
            >
              <AdminAjouterActualite />
            </ProtectedRoute>
          }
        />

        {/* ==================================================
            PHOTOS ADMIN
        ================================================== */}

        <Route
          path="/admin/photos"
          element={
            <ProtectedRoute
              roles={EQUIPE_EDITORIALE}
            >
              <AdminPhotos />
            </ProtectedRoute>
          }
        />

        {/* ==================================================
            VIDÉOS ADMIN
        ================================================== */}

        <Route
          path="/admin/videos"
          element={
            <ProtectedRoute
              roles={EQUIPE_EDITORIALE}
            >
              <AdminVideos />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/videos/ajouter"
          element={
            <ProtectedRoute
              roles={EQUIPE_EDITORIALE}
            >
              <AdminAjouterVideo />
            </ProtectedRoute>
          }
        />

        {/* ==================================================
            LIVE ADMIN
        ================================================== */}

        <Route
          path="/admin/live"
          element={
            <ProtectedRoute
              roles={ADMIN}
            >
              <AdminLive />
            </ProtectedRoute>
          }
        />

        {/* ==================================================
            MESSAGES ADMIN
        ================================================== */}

        <Route
          path="/admin/messages"
          element={
            <ProtectedRoute
              roles={ADMIN}
            >
              <AdminMessages />
            </ProtectedRoute>
          }
        />

        {/* ==================================================
            UTILISATEURS
        ================================================== */}

        <Route
          path="/admin/utilisateurs"
          element={
            <ProtectedRoute
              roles={ADMIN}
            >
              <AdminUtilisateurs />
            </ProtectedRoute>
          }
        />

        {/* ==================================================
            EQUIPE
        ================================================== */}

        <Route
          path="/admin/equipe"
          element={
            <ProtectedRoute
              roles={ADMIN}
            >
              <AdminEquipe />
            </ProtectedRoute>
          }
        />

        {/* ==================================================
            404
        ================================================== */}

        <Route
          path="*"
          element={
            <main className="page-404">
              <div className="container">

                <h1>404</h1>

                <h2>
                  Page introuvable
                </h2>

                <p>
                  Désolé, cette page
                  n'existe pas.
                </p>

              </div>
            </main>
          }
        />

      </Routes>

      {/* ==================================================
          FOOTER
      ================================================== */}

      {!isAdmin && <Footer />}
    </>
  );
}

// ==================================================
// APP
// ==================================================

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App; 
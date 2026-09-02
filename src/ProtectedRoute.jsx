import { Navigate, useLocation } from "react-router-dom";

function ProtectedRoute({
  children,
  roles = [],
}) {
  const location = useLocation();

  const token = localStorage.getItem(
    "mikwo_pep_la_token"
  );

  const user = JSON.parse(
    localStorage.getItem(
      "mikwo_pep_la_user"
    ) || "{}"
  );

  // ==========================================
  // PA KONEKTE
  // ==========================================

  if (!token) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  // ==========================================
  // PA GEN WÒL
  // ==========================================

  if (!user.role) {
    localStorage.removeItem(
      "mikwo_pep_la_token"
    );

    localStorage.removeItem(
      "mikwo_pep_la_user"
    );

    return (
      <Navigate
        to="/admin/login"
        replace
      />
    );
  }

  // ==========================================
  // VERIFYE WÒL
  // ==========================================

  if (
    roles.length > 0 &&
    !roles.includes(user.role)
  ) {
    return (
      <Navigate
        to="/admin"
        replace
      />
    );
  }

  return children;
}

export default ProtectedRoute;
import { useEffect, useState } from "react";
import "./AdminMessages.css";

function AdminMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [error, setError] = useState("");

  // ======================================================
  // CHARGER LES MESSAGES
  // ======================================================

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem(
        "mikwo_pep_la_token"
      );

      if (!token) {
        setError(
          "Votre session administrateur a expiré. Veuillez vous reconnecter."
        );
        return;
      }

      const response = await fetch(
        "/api/contacts",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem(
          "mikwo_pep_la_token"
        );

        localStorage.removeItem(
          "mikwo_pep_la_user"
        );

        setError(
          "Votre session administrateur a expiré."
        );

        return;
      }

      if (response.status === 403) {
        setError(
          "Vous n'avez pas les permissions nécessaires pour consulter les messages."
        );
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Impossible de charger les messages."
        );
      }

      if (Array.isArray(data)) {
        setMessages(data);
      } else if (
        data &&
        Array.isArray(data.contacts)
      ) {
        setMessages(data.contacts);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error(
        "Erreur chargement messages :",
        error
      );

      setError(
        error.message ||
          "Impossible de charger les messages."
      );
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // CHARGEMENT INITIAL
  // ======================================================

  useEffect(() => {
    loadMessages();
  }, []);

  // ======================================================
  // FORMAT DATE
  // ======================================================

  const formatDate = (date) => {
    if (!date) {
      return "—";
    }

    try {
      return new Date(date).toLocaleString(
        "fr-FR",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }
      );
    } catch {
      return "—";
    }
  };

  // ======================================================
  // SUPPRIMER MESSAGE
  // ======================================================

  const handleDelete = async (id) => {
    const confirmation =
      window.confirm(
        "Voulez-vous vraiment supprimer ce message ?"
      );

    if (!confirmation) {
      return;
    }

    try {
      const token = localStorage.getItem(
        "mikwo_pep_la_token"
      );

      if (!token) {
        setError(
          "Votre session administrateur a expiré."
        );
        return;
      }

      const response = await fetch(
        `/api/contacts/${id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data =
        await response.json();

      if (response.status === 401) {
        localStorage.removeItem(
          "mikwo_pep_la_token"
        );

        localStorage.removeItem(
          "mikwo_pep_la_user"
        );

        setError(
          "Votre session administrateur a expiré."
        );

        return;
      }

      if (response.status === 403) {
        setError(
          "Vous n'avez pas les permissions nécessaires pour supprimer ce message."
        );
        return;
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Impossible de supprimer le message."
        );
      }

      setSelectedMessage(null);

      await loadMessages();
    } catch (error) {
      console.error(
        "Erreur suppression message :",
        error
      );

      setError(
        error.message ||
          "Erreur lors de la suppression du message."
      );
    }
  };

  // ======================================================
  // ACTUALISER
  // ======================================================

  const handleRefresh = () => {
    loadMessages();
  };

  // ======================================================
  // AFFICHAGE
  // ======================================================

  return (
    <main className="admin-messages-page">

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="admin-messages-header">

        <div>
          <span className="admin-messages-kicker">
            MIKWO PÈP LA TV
          </span>

          <h1>
            ✉️ Messages
          </h1>

          <p>
            Consultez les messages reçus depuis
            le formulaire de contact.
          </p>
        </div>

        <div className="messages-header-actions">

          <div className="messages-count">
            <strong>
              {messages.length}
            </strong>

            <span>
              Message
              {messages.length > 1
                ? "s"
                : ""}
            </span>
          </div>

          <button
            type="button"
            className="messages-refresh-btn"
            onClick={handleRefresh}
            disabled={loading}
          >
            🔄{" "}
            {loading
              ? "Chargement..."
              : "Actualiser"}
          </button>

        </div>

      </div>

      {/* ==================================================
          ERREUR
      ================================================== */}

      {error && (
        <div className="admin-messages-error">
          ⚠️ {error}
        </div>
      )}

      {/* ==================================================
          LISTE
      ================================================== */}

      <section className="messages-list-card">

        <div className="messages-list-header">

          <div>
            <h2>
              Boîte de réception
            </h2>

            <p>
              Les messages envoyés par les
              visiteurs de Mikwo Pèp La.
            </p>
          </div>

        </div>

        {/* CHARGEMENT */}

        {loading ? (
          <div className="messages-empty">

            <div className="messages-loader"></div>

            <p>
              Chargement des messages...
            </p>

          </div>

        ) : messages.length === 0 ? (

          /* AUCUN MESSAGE */

          <div className="messages-empty">

            <div className="messages-empty-icon">
              ✉️
            </div>

            <h3>
              Aucun message
            </h3>

            <p>
              Vous n'avez reçu aucun message
              pour le moment.
            </p>

          </div>

        ) : (

          /* TABLE */

          <div className="messages-table-wrapper">

            <table className="messages-table">

              <thead>

                <tr>
                  <th>
                    Expéditeur
                  </th>

                  <th>
                    Sujet
                  </th>

                  <th>
                    Message
                  </th>

                  <th>
                    Date
                  </th>

                  <th>
                    Action
                  </th>
                </tr>

              </thead>

              <tbody>

                {messages.map(
                  (message) => (

                    <tr
                      key={
                        message.id_contact
                      }
                    >

                      {/* EXPÉDITEUR */}

                      <td>

                        <div className="message-sender">

                          <div className="message-avatar">
                            {(
                              message.nom ||
                              "V"
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>

                            <strong>
                              {message.nom ||
                                "Visiteur"}
                            </strong>

                            <span>
                              {message.email ||
                                "—"}
                            </span>

                          </div>

                        </div>

                      </td>

                      {/* SUJET */}

                      <td>

                        <span className="message-subject">
                          {message.sujet ||
                            "Sans sujet"}
                        </span>

                      </td>

                      {/* MESSAGE */}

                      <td>

                        <div className="message-preview">

                          {message.message ||
                            "Message vide"}

                        </div>

                      </td>

                      {/* DATE */}

                      <td>

                        <span className="message-date">

                          {formatDate(
                            message.created_at
                          )}

                        </span>

                      </td>

                      {/* ACTION */}

                      <td>

                        <button
                          type="button"
                          className="message-view-btn"
                          onClick={() =>
                            setSelectedMessage(
                              message
                            )
                          }
                        >
                          👁️ Voir
                        </button>

                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </section>

      {/* ==================================================
          MODAL
      ================================================== */}

      {selectedMessage && (

        <div
          className="message-modal-overlay"
          onClick={() =>
            setSelectedMessage(null)
          }
        >

          <div
            className="message-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* HEADER MODAL */}

            <div className="message-modal-header">

              <div>

                <span>
                  MESSAGE
                </span>

                <h2>
                  {selectedMessage.sujet ||
                    "Sans sujet"}
                </h2>

              </div>

              <button
                type="button"
                className="message-modal-close"
                onClick={() =>
                  setSelectedMessage(null)
                }
              >
                ×
              </button>

            </div>

            {/* BODY */}

            <div className="message-modal-body">

              <div className="message-info">

                <div className="message-info-item">

                  <span>
                    Nom
                  </span>

                  <strong>
                    {selectedMessage.nom ||
                      "Visiteur"}
                  </strong>

                </div>

                <div className="message-info-item">

                  <span>
                    Email
                  </span>

                  <strong>
                    {selectedMessage.email ||
                      "—"}
                  </strong>

                </div>

                <div className="message-info-item">

                  <span>
                    Date
                  </span>

                  <strong>
                    {formatDate(
                      selectedMessage.created_at
                    )}
                  </strong>

                </div>

              </div>

              <div className="message-content">

                <span>
                  Message
                </span>

                <p>
                  {selectedMessage.message ||
                    "Aucun contenu."}
                </p>

              </div>

            </div>

            {/* FOOTER */}

            <div className="message-modal-footer">

              {selectedMessage.email && (
                <a
                  href={`mailto:${selectedMessage.email}`}
                  className="message-reply-btn"
                >
                  ✉️ Répondre par email
                </a>
              )}

              <button
                type="button"
                className="message-delete-btn"
                onClick={() =>
                  handleDelete(
                    selectedMessage.id_contact
                  )
                }
              >
                🗑️ Supprimer
              </button>

            </div>

          </div>

        </div>

      )}

    </main>
  );
}

export default AdminMessages;
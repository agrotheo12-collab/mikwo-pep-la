require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const { spawn } = require("child_process");

const app = express();

// ======================================================
// CONFIGURATION GÉNÉRALE
// ======================================================

const PORT = Number(process.env.PORT) || 3000;

// Sur Render, mettre FFMPEG_PATH dans Environment Variables
// Exemple local Mac : /opt/homebrew/bin/ffmpeg
const ffmpegPath =
  process.env.FFMPEG_PATH || "/opt/homebrew/bin/ffmpeg";

app.use(
  cors({
    origin: process.env.FRONTEND_URL || true,
    credentials: true,
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ======================================================
// DOSSIERS UPLOADS
// ======================================================

const uploadsPath = path.join(__dirname, "uploads");
const videosPath = path.join(uploadsPath, "videos");

if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}

if (!fs.existsSync(videosPath)) {
  fs.mkdirSync(videosPath, { recursive: true });
}

app.use(
  "/uploads",
  express.static(uploadsPath, {
    maxAge: "1d",
  })
);

// ======================================================
// POSTGRESQL
// ======================================================

console.log(
  "DATABASE_URL présente:",
  Boolean(process.env.DATABASE_URL)
);

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
  : new Pool({
      user: process.env.DB_USER || "postgres",
      host: process.env.DB_HOST || "localhost",
      database: process.env.DB_NAME || "Mikwo_Pep_La",
      password: process.env.DB_PASSWORD || "",
      port: Number(process.env.DB_PORT) || 5433,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

pool.on("error", (err) => {
  console.error("❌ Erreur PostgreSQL inattendue:", err);
});

// ======================================================
// CONSTANTES RÔLES
// ======================================================

const ROLES = {
  ADMIN: "admin",

  // IMPORTANT :
  // PostgreSQL utilise "editor", pas "editeur"
  EDITEUR: "editor",

  JOURNALISTE: "journaliste",
};

// ======================================================
// JWT
// ======================================================

function verifierToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Token manquant",
      });
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        message: "Format du token invalide",
      });
    }

    const token = parts[1];

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    req.user = decoded;

    next();
  } catch (error) {
    console.error("❌ Erreur token:", error.message);

    return res.status(401).json({
      message: "Token invalide ou expiré",
    });
  }
}

// ======================================================
// VÉRIFICATION DES RÔLES
// ======================================================

function verifierRole(...rolesAutorises) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Authentification requise",
      });
    }

    if (!rolesAutorises.includes(req.user.role)) {
      return res.status(403).json({
        message: "Accès refusé",
      });
    }

    next();
  };
}

const verifierAdmin = verifierRole(
  ROLES.ADMIN
);

const verifierEditeur = verifierRole(
  ROLES.ADMIN,
  ROLES.EDITEUR
);

const verifierAdminEditeur = verifierEditeur;

const verifierRedacteur = verifierRole(
  ROLES.ADMIN,
  ROLES.EDITEUR,
  ROLES.JOURNALISTE
);

const verifierEquipeEditoriale = verifierRedacteur;

// ======================================================
// VÉRIFICATION PROPRIÉTAIRE
// ======================================================

async function verifierProprietaire(
  table,
  idColumn,
  id,
  user,
  res
) {
  try {
    // Admin et editor peuvent modifier les contenus
    if (
      user.role === ROLES.ADMIN ||
      user.role === ROLES.EDITEUR
    ) {
      return true;
    }

    const result = await pool.query(
      `SELECT id_utilisateur
       FROM ${table}
       WHERE ${idColumn} = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        message: "Élément introuvable",
      });

      return false;
    }

    if (
      Number(result.rows[0].id_utilisateur) !==
      Number(user.id_utilisateur)
    ) {
      res.status(403).json({
        message: "Vous ne pouvez pas modifier cet élément",
      });

      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "❌ Erreur vérification propriétaire:",
      error
    );

    res.status(500).json({
      message: "Erreur serveur",
    });

    return false;
  }
}

// ======================================================
// MULTER - IMAGES
// ======================================================

const allowedImageTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsPath);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);

    const baseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_");

    cb(
      null,
      `${Date.now()}-${baseName}${ext}`
    );
  },
});

const upload = multer({
  storage: imageStorage,

  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 20,
  },

  fileFilter: (req, file, cb) => {
    if (
      allowedImageTypes.includes(
        file.mimetype
      )
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Format image non autorisé. Utilisez JPG, JPEG, PNG, WEBP ou GIF."
        )
      );
    }
  },
});

// ======================================================
// MULTER - VIDÉOS
// ======================================================

const allowedVideoTypes = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/mpeg",
];

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, videosPath);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);

    const baseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_");

    cb(
      null,
      `${Date.now()}-${baseName}${ext}`
    );
  },
});

const uploadVideo = multer({
  storage: videoStorage,

  limits: {
    fileSize: 500 * 1024 * 1024,
  },

  fileFilter: (req, file, cb) => {
    if (
      allowedVideoTypes.includes(
        file.mimetype
      )
    ) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Format vidéo non autorisé."
        )
      );
    }
  },
});

// ======================================================
// UTILITAIRES FICHIERS
// ======================================================

function supprimerImage(imageUrl) {
  if (!imageUrl) return;

  try {
    let filePath = imageUrl;

    if (filePath.startsWith("/uploads/")) {
      filePath = filePath.replace(
        "/uploads/",
        ""
      );
    }

    if (filePath.startsWith("uploads/")) {
      filePath = filePath.replace(
        "uploads/",
        ""
      );
    }

    const absolutePath = path.join(
      uploadsPath,
      filePath
    );

    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);

      console.log(
        "🗑️ Fichier supprimé:",
        absolutePath
      );
    }
  } catch (error) {
    console.error(
      "❌ Erreur suppression fichier:",
      error.message
    );
  }
}

function supprimerVideo(videoUrl) {
  if (!videoUrl) return;

  try {
    let fileName = videoUrl;

    if (fileName.startsWith("/uploads/videos/")) {
      fileName = fileName.replace(
        "/uploads/videos/",
        ""
      );
    }

    if (fileName.startsWith("uploads/videos/")) {
      fileName = fileName.replace(
        "uploads/videos/",
        ""
      );
    }

    const absolutePath = path.join(
      videosPath,
      fileName
    );

    if (fs.existsSync(absolutePath)) {
      fs.unlinkSync(absolutePath);

      console.log(
        "🗑️ Vidéo supprimée:",
        absolutePath
      );
    }
  } catch (error) {
    console.error(
      "❌ Erreur suppression vidéo:",
      error.message
    );
  }
}

// ======================================================
// FFmpeg - TEST
// ======================================================

function testFFmpeg() {
  return new Promise((resolve) => {
    const processFFmpeg = spawn(
      ffmpegPath,
      ["-version"]
    );

    let output = "";

    processFFmpeg.stdout.on(
      "data",
      (data) => {
        output += data.toString();
      }
    );

    processFFmpeg.stderr.on(
      "data",
      (data) => {
        output += data.toString();
      }
    );

    processFFmpeg.on(
      "error",
      (error) => {
        console.error(
          "⚠️ FFmpeg non disponible:",
          error.message
        );

        resolve(false);
      }
    );

    processFFmpeg.on(
      "close",
      (code) => {
        if (code === 0) {
          console.log("✅ FFmpeg disponible");
          resolve(true);
        } else {
          console.error(
            "⚠️ FFmpeg retourne le code:",
            code
          );

          resolve(false);
        }
      }
    );
  });
}

// ======================================================
// GÉNÉRATION THUMBNAIL VIDÉO
// ======================================================

function generateVideoThumbnail(
  videoPath,
  thumbnailPath,
  time = 1
) {
  return new Promise((resolve, reject) => {
    const args = [
      "-ss",
      String(time),
      "-i",
      videoPath,
      "-frames:v",
      "1",
      "-vf",
      "scale=1280:-2",
      "-y",
      thumbnailPath,
    ];

    console.log(
      "🎬 Génération thumbnail:",
      args
    );

    const ffmpeg = spawn(
      ffmpegPath,
      args
    );

    let stderr = "";

    ffmpeg.stderr.on(
      "data",
      (data) => {
        stderr += data.toString();
      }
    );

    ffmpeg.on(
      "error",
      (error) => {
        reject(error);
      }
    );

    ffmpeg.on(
      "close",
      (code) => {
        if (code === 0) {
          resolve(thumbnailPath);
        } else {
          reject(
            new Error(
              `FFmpeg thumbnail échoué (${code}): ${stderr}`
            )
          );
        }
      }
    );
  });
}

// ======================================================
// API TEST
// ======================================================

app.get("/", (req, res) => {
  res.json({
    message: "Mikwo Pèp La TV API fonctionne",
  });
});

app.get("/api", (req, res) => {
  res.json({
    message: "API Mikwo Pèp La TV fonctionne",
  });
});

app.get("/api/test-db", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT NOW()"
    );

    res.json({
      success: true,
      database: "connected",
      time: result.rows[0].now,
    });
  } catch (error) {
    console.error(
      "❌ Test DB:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Erreur connexion base de données",
      error: error.message,
    });
  }
});

// ======================================================
// LOGIN
// ======================================================

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message:
          "Email et mot de passe obligatoires",
      });
    }

    const result = await pool.query(
      `SELECT
        id_utilisateur,
        nom,
        email,
        password,
        role
       FROM utilisateur
       WHERE LOWER(email) = LOWER($1)`,
      [email.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message:
          "Email ou mot de passe incorrect",
      });
    }

    const user = result.rows[0];

    const passwordCorrect =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!passwordCorrect) {
      return res.status(401).json({
        message:
          "Email ou mot de passe incorrect",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error(
        "❌ JWT_SECRET manquant"
      );

      return res.status(500).json({
        message:
          "Configuration serveur incomplète",
      });
    }

    const token = jwt.sign(
      {
        id_utilisateur:
          user.id_utilisateur,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "8h",
      }
    );

    res.json({
      success: true,
      token,

      user: {
        id_utilisateur:
          user.id_utilisateur,
        nom: user.nom,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(
      "❌ Login:",
      error
    );

    res.status(500).json({
      message: "Erreur serveur",
    });
  }
});

// ======================================================
// ARTICLES - PUBLIC
// ======================================================

app.get("/api/articles", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        a.id_article,
        a.titre,
        a.slug,
        a.contenu,

        -- Le frontend peut continuer à utiliser image_url
        a.image AS image_url,

        a.statut,
        a.created_at,
        a.updated_at,
        a.id_utilisateur,

        u.nom AS auteur

      FROM article a

      LEFT JOIN utilisateur u
        ON u.id_utilisateur = a.id_utilisateur

      WHERE a.statut = 'publie'

      ORDER BY a.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(
      "❌ GET articles:",
      error
    );

    res.status(500).json({
      message:
        "Erreur récupération des articles",
    });
  }
});

// ======================================================
// ARTICLE - CRÉER
// ======================================================

app.post(
  "/api/articles",
  verifierToken,
  verifierRedacteur,
  upload.single("image"),
  async (req, res) => {
    try {
      const {
        titre,
        slug,
        contenu,
        statut,
      } = req.body;

      if (
        !titre ||
        !slug ||
        !contenu
      ) {
        if (req.file) {
          supprimerImage(
            `/uploads/${req.file.filename}`
          );
        }

        return res.status(400).json({
          message:
            "Titre, slug et contenu sont obligatoires",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message:
            "Une image est obligatoire",
        });
      }

      const imageUrl =
        `/uploads/${req.file.filename}`;

      const statutFinal =
        statut || "brouillon";

      const result = await pool.query(
        `INSERT INTO article
          (
            titre,
            slug,
            contenu,
            image,
            statut,
            id_utilisateur
          )
         VALUES
          ($1, $2, $3, $4, $5, $6)
         RETURNING
          id_article,
          titre,
          slug,
          contenu,
          image AS image_url,
          statut,
          created_at,
          updated_at,
          id_utilisateur`,
        [
          titre.trim(),
          slug.trim(),
          contenu,
          imageUrl,
          statutFinal,
          req.user.id_utilisateur,
        ]
      );

      res.status(201).json({
        success: true,
        article: result.rows[0],
      });
    } catch (error) {
      if (req.file) {
        supprimerImage(
          `/uploads/${req.file.filename}`
        );
      }

      console.error(
        "❌ POST article:",
        error
      );

      if (
        error.code === "23505"
      ) {
        return res.status(409).json({
          message:
            "Ce slug existe déjà",
        });
      }

      res.status(500).json({
        message:
          "Erreur création article",
        error: error.message,
      });
    }
  }
);

// ======================================================
// ARTICLE - MODIFIER
// ======================================================

app.put(
  "/api/articles/:id",
  verifierToken,
  verifierRedacteur,
  upload.single("image"),
  async (req, res) => {
    const id = Number(req.params.id);

    try {
      if (isNaN(id)) {
        return res.status(400).json({
          message: "ID article invalide",
        });
      }

      const autorise =
        await verifierProprietaire(
          "article",
          "id_article",
          id,
          req.user,
          res
        );

      if (!autorise) return;

      const {
        titre,
        slug,
        contenu,
        statut,
      } = req.body;

      const oldResult =
        await pool.query(
          `SELECT
            id_article,
            image
           FROM article
           WHERE id_article = $1`,
          [id]
        );

      if (
        oldResult.rows.length === 0
      ) {
        if (req.file) {
          supprimerImage(
            `/uploads/${req.file.filename}`
          );
        }

        return res.status(404).json({
          message:
            "Article introuvable",
        });
      }

      const oldImage =
        oldResult.rows[0].image;

      const newImage = req.file
        ? `/uploads/${req.file.filename}`
        : oldImage;

      const result = await pool.query(
        `UPDATE article
         SET
           titre = COALESCE($1, titre),
           slug = COALESCE($2, slug),
           contenu = COALESCE($3, contenu),
           image = $4,
           statut = COALESCE($5, statut),
           updated_at = CURRENT_TIMESTAMP
         WHERE id_article = $6
         RETURNING
           id_article,
           titre,
           slug,
           contenu,
           image AS image_url,
           statut,
           created_at,
           updated_at,
           id_utilisateur`,
        [
          titre || null,
          slug || null,
          contenu || null,
          newImage,
          statut || null,
          id,
        ]
      );

      if (
        req.file &&
        oldImage &&
        oldImage !== newImage
      ) {
        supprimerImage(oldImage);
      }

      res.json({
        success: true,
        article: result.rows[0],
      });
    } catch (error) {
      if (req.file) {
        supprimerImage(
          `/uploads/${req.file.filename}`
        );
      }

      console.error(
        "❌ PUT article:",
        error
      );

      if (
        error.code === "23505"
      ) {
        return res.status(409).json({
          message:
            "Ce slug existe déjà",
        });
      }

      res.status(500).json({
        message:
          "Erreur modification article",
      });
    }
  }
);

// ======================================================
// ARTICLE - SUPPRIMER
// ======================================================

app.delete(
  "/api/articles/:id",
  verifierToken,
  verifierRedacteur,
  async (req, res) => {
    const id = Number(req.params.id);

    try {
      if (isNaN(id)) {
        return res.status(400).json({
          message: "ID invalide",
        });
      }

      const autorise =
        await verifierProprietaire(
          "article",
          "id_article",
          id,
          req.user,
          res
        );

      if (!autorise) return;

      const result = await pool.query(
        `DELETE FROM article
         WHERE id_article = $1
         RETURNING
           image AS image_url`,
        [id]
      );

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          message:
            "Article introuvable",
        });
      }

      supprimerImage(
        result.rows[0].image_url
      );

      res.json({
        success: true,
        message:
          "Article supprimé avec succès",
      });
    } catch (error) {
      console.error(
        "❌ DELETE article:",
        error
      );

      res.status(500).json({
        message:
          "Erreur suppression article",
      });
    }
  }
);

// ======================================================
// PHOTOS - PUBLIC
// ======================================================

app.get("/api/photos", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id_photo,
        p.titre,
        p.description,
        p.image_url,
        p.statut,
        p.created_at,
        p.id_utilisateur,
        u.nom AS auteur

      FROM photo p

      LEFT JOIN utilisateur u
        ON u.id_utilisateur = p.id_utilisateur

      WHERE p.statut = 'publie'

      ORDER BY p.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(
      "❌ GET photos:",
      error
    );

    res.status(500).json({
      message:
        "Erreur récupération photos",
    });
  }
});

// ======================================================
// PUBLICATIONS PHOTOS GROUPÉES
// ======================================================

app.get(
  "/api/photo-publications",
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          MIN(p.id_photo) AS id_publication,
          p.titre,
          p.description,
          p.statut,
          p.created_at,
          p.id_utilisateur,
          u.nom AS auteur,

          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id_photo', p.id_photo,
              'image_url', p.image_url
            )
            ORDER BY p.id_photo ASC
          ) AS photos,

          COUNT(p.id_photo)::int AS nombre_photos

        FROM photo p

        LEFT JOIN utilisateur u
          ON u.id_utilisateur = p.id_utilisateur

        WHERE p.statut = 'publie'

        GROUP BY
          p.titre,
          p.description,
          p.statut,
          p.created_at,
          p.id_utilisateur,
          u.nom

        ORDER BY p.created_at DESC
      `);

      res.json(result.rows);
    } catch (error) {
      console.error(
        "❌ GET photo publications:",
        error
      );

      res.status(500).json({
        message:
          "Erreur récupération publications photos",
      });
    }
  }
);

// ======================================================
// PHOTOS - ADMIN / ÉQUIPE
// ======================================================

app.get(
  "/api/photos/admin",
  verifierToken,
  verifierEquipeEditoriale,
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          p.*,
          u.nom AS auteur

        FROM photo p

        LEFT JOIN utilisateur u
          ON u.id_utilisateur = p.id_utilisateur

        ORDER BY p.created_at DESC
      `);

      res.json(result.rows);
    } catch (error) {
      console.error(
        "❌ GET admin photos:",
        error
      );

      res.status(500).json({
        message:
          "Erreur récupération photos",
      });
    }
  }
);

// ======================================================
// PHOTOS - AJOUTER PLUSIEURS PHOTOS
// ======================================================

app.post(
  "/api/photos",
  verifierToken,
  verifierRedacteur,
  upload.array("photos", 20),
  async (req, res) => {
    try {
      const {
        titre,
        description,
        statut,
      } = req.body;

      if (!titre) {
        if (req.files) {
          req.files.forEach((file) => {
            supprimerImage(
              `/uploads/${file.filename}`
            );
          });
        }

        return res.status(400).json({
          message:
            "Le titre est obligatoire",
        });
      }

      if (
        !req.files ||
        req.files.length === 0
      ) {
        return res.status(400).json({
          message:
            "Au moins une photo est obligatoire",
        });
      }

      const statutFinal =
        statut || "brouillon";

      // Toutes les photos de la même publication
      // reçoivent exactement le même created_at.
      const publicationDate =
        new Date();

      const client =
        await pool.connect();

      try {
        await client.query(
          "BEGIN"
        );

        const insertedPhotos = [];

        for (const file of req.files) {
          const imageUrl =
            `/uploads/${file.filename}`;

          const result =
            await client.query(
              `INSERT INTO photo
                (
                  titre,
                  description,
                  image_url,
                  statut,
                  created_at,
                  id_utilisateur
                )
               VALUES
                ($1, $2, $3, $4, $5, $6)
               RETURNING *`,
              [
                titre.trim(),
                description || null,
                imageUrl,
                statutFinal,
                publicationDate,
                req.user.id_utilisateur,
              ]
            );

          insertedPhotos.push(
            result.rows[0]
          );
        }

        await client.query(
          "COMMIT"
        );

        res.status(201).json({
          success: true,
          message: `${insertedPhotos.length} photo(s) ajoutée(s)`,
          photos: insertedPhotos,
        });
      } catch (error) {
        await client.query(
          "ROLLBACK"
        );

        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      if (req.files) {
        req.files.forEach((file) => {
          supprimerImage(
            `/uploads/${file.filename}`
          );
        });
      }

      console.error(
        "❌ POST photos:",
        error
      );

      res.status(500).json({
        message:
          "Erreur ajout photos",
        error: error.message,
      });
    }
  }
);

// ======================================================
// PHOTO - MODIFIER
// ======================================================

app.put(
  "/api/photos/:id",
  verifierToken,
  verifierRedacteur,
  async (req, res) => {
    const id = Number(req.params.id);

    try {
      if (isNaN(id)) {
        return res.status(400).json({
          message: "ID photo invalide",
        });
      }

      const autorise =
        await verifierProprietaire(
          "photo",
          "id_photo",
          id,
          req.user,
          res
        );

      if (!autorise) return;

      const {
        titre,
        description,
        statut,
      } = req.body;

      const result = await pool.query(
        `UPDATE photo
         SET
           titre = COALESCE($1, titre),
           description = COALESCE($2, description),
           statut = COALESCE($3, statut)
         WHERE id_photo = $4
         RETURNING *`,
        [
          titre || null,
          description !== undefined
            ? description
            : null,
          statut || null,
          id,
        ]
      );

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          message:
            "Photo introuvable",
        });
      }

      res.json({
        success: true,
        photo: result.rows[0],
      });
    } catch (error) {
      console.error(
        "❌ PUT photo:",
        error
      );

      res.status(500).json({
        message:
          "Erreur modification photo",
      });
    }
  }
);

// ======================================================
// PHOTO - SUPPRIMER
// ======================================================

app.delete(
  "/api/photos/:id",
  verifierToken,
  verifierRedacteur,
  async (req, res) => {
    const id = Number(req.params.id);

    try {
      if (isNaN(id)) {
        return res.status(400).json({
          message: "ID photo invalide",
        });
      }

      const autorise =
        await verifierProprietaire(
          "photo",
          "id_photo",
          id,
          req.user,
          res
        );

      if (!autorise) return;

      const result = await pool.query(
        `DELETE FROM photo
         WHERE id_photo = $1
         RETURNING image_url`,
        [id]
      );

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          message:
            "Photo introuvable",
        });
      }

      supprimerImage(
        result.rows[0].image_url
      );

      res.json({
        success: true,
        message:
          "Photo supprimée avec succès",
      });
    } catch (error) {
      console.error(
        "❌ DELETE photo:",
        error
      );

      res.status(500).json({
        message:
          "Erreur suppression photo",
      });
    }
  }
);

// ======================================================
// VIDÉOS - PUBLIC
// ======================================================

app.get("/api/videos", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        v.id_video,
        v.titre,
        v.description,
        v.thumbnail,
        v.video_url,
        v.statut,
        v.created_at,
        v.id_utilisateur,
        u.nom AS auteur

      FROM video v

      LEFT JOIN utilisateur u
        ON u.id_utilisateur = v.id_utilisateur

      WHERE v.statut = 'publie'

      ORDER BY v.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    console.error(
      "❌ GET videos:",
      error
    );

    res.status(500).json({
      message:
        "Erreur récupération vidéos",
    });
  }
});

// ======================================================
// VIDÉOS - ADMIN
// ======================================================

app.get(
  "/api/videos/admin",
  verifierToken,
  verifierEquipeEditoriale,
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          v.*,
          u.nom AS auteur

        FROM video v

        LEFT JOIN utilisateur u
          ON u.id_utilisateur = v.id_utilisateur

        ORDER BY v.created_at DESC
      `);

      res.json(result.rows);
    } catch (error) {
      console.error(
        "❌ GET admin videos:",
        error
      );

      res.status(500).json({
        message:
          "Erreur récupération vidéos",
      });
    }
  }
);

// ======================================================
// VIDÉOS - AJOUTER
// ======================================================

app.post(
  "/api/videos",
  verifierToken,
  verifierRedacteur,
  uploadVideo.single("video"),
  async (req, res) => {
    try {
      const {
        titre,
        description,
        statut,
      } = req.body;

      if (!titre) {
        if (req.file) {
          supprimerVideo(
            `/uploads/videos/${req.file.filename}`
          );
        }

        return res.status(400).json({
          message:
            "Le titre est obligatoire",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          message:
            "Une vidéo est obligatoire",
        });
      }

      const videoUrl =
        `/uploads/videos/${req.file.filename}`;

      const thumbnailFileName =
        `${Date.now()}-thumbnail-${path.basename(
          req.file.filename,
          path.extname(req.file.filename)
        )}.jpg`;

      const thumbnailPath =
        path.join(
          videosPath,
          thumbnailFileName
        );

      let thumbnailUrl = null;

      try {
        await generateVideoThumbnail(
          req.file.path,
          thumbnailPath,
          1
        );

        thumbnailUrl =
          `/uploads/videos/${thumbnailFileName}`;

        console.log(
          "✅ Thumbnail générée:",
          thumbnailUrl
        );
      } catch (thumbnailError) {
        console.warn(
          "⚠️ Thumbnail à 1 seconde échouée. Tentative à 0 seconde..."
        );

        try {
          await generateVideoThumbnail(
            req.file.path,
            thumbnailPath,
            0
          );

          thumbnailUrl =
            `/uploads/videos/${thumbnailFileName}`;

          console.log(
            "✅ Thumbnail générée à 0 seconde"
          );
        } catch (secondError) {
          console.error(
            "❌ Impossible de générer thumbnail:",
            secondError.message
          );

          thumbnailUrl = null;
        }
      }

      const result = await pool.query(
        `INSERT INTO video
          (
            titre,
            description,
            thumbnail,
            video_url,
            statut,
            id_utilisateur
          )
         VALUES
          ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          titre.trim(),
          description || null,
          thumbnailUrl,
          videoUrl,
          statut || "brouillon",
          req.user.id_utilisateur,
        ]
      );

      res.status(201).json({
        success: true,
        message:
          "Vidéo ajoutée avec succès",
        video: result.rows[0],
      });
    } catch (error) {
      if (req.file) {
        supprimerVideo(
          `/uploads/videos/${req.file.filename}`
        );
      }

      console.error(
        "❌ POST video:",
        error
      );

      res.status(500).json({
        message:
          "Erreur ajout vidéo",
        error: error.message,
      });
    }
  }
);

// ======================================================
// VIDÉO - MODIFIER
// ======================================================

app.put(
  "/api/videos/:id",
  verifierToken,
  verifierRedacteur,
  uploadVideo.single("video"),
  async (req, res) => {
    const id = Number(req.params.id);

    let newThumbnailPath = null;

    try {
      if (isNaN(id)) {
        return res.status(400).json({
          message: "ID vidéo invalide",
        });
      }

      const autorise =
        await verifierProprietaire(
          "video",
          "id_video",
          id,
          req.user,
          res
        );

      if (!autorise) return;

      const oldResult =
        await pool.query(
          `SELECT
            video_url,
            thumbnail
           FROM video
           WHERE id_video = $1`,
          [id]
        );

      if (
        oldResult.rows.length === 0
      ) {
        if (req.file) {
          supprimerVideo(
            `/uploads/videos/${req.file.filename}`
          );
        }

        return res.status(404).json({
          message:
            "Vidéo introuvable",
        });
      }

      const oldVideo =
        oldResult.rows[0].video_url;

      const oldThumbnail =
        oldResult.rows[0].thumbnail;

      let newVideo = oldVideo;
      let newThumbnail = oldThumbnail;

      if (req.file) {
        newVideo =
          `/uploads/videos/${req.file.filename}`;

        const thumbnailFileName =
          `${Date.now()}-thumbnail-${path.basename(
            req.file.filename,
            path.extname(req.file.filename)
          )}.jpg`;

        newThumbnailPath =
          path.join(
            videosPath,
            thumbnailFileName
          );

        try {
          await generateVideoThumbnail(
            req.file.path,
            newThumbnailPath,
            1
          );
        } catch (error) {
          try {
            await generateVideoThumbnail(
              req.file.path,
              newThumbnailPath,
              0
            );
          } catch (secondError) {
            console.warn(
              "⚠️ Thumbnail non générée:",
              secondError.message
            );

            newThumbnailPath = null;
          }
        }

        if (newThumbnailPath) {
          newThumbnail =
            `/uploads/videos/${path.basename(
              newThumbnailPath
            )}`;
        } else {
          newThumbnail = null;
        }
      }

      const {
        titre,
        description,
        statut,
      } = req.body;

      const result = await pool.query(
        `UPDATE video
         SET
           titre = COALESCE($1, titre),
           description = COALESCE($2, description),
           thumbnail = $3,
           video_url = $4,
           statut = COALESCE($5, statut)
         WHERE id_video = $6
         RETURNING *`,
        [
          titre || null,
          description !== undefined
            ? description
            : null,
          newThumbnail,
          newVideo,
          statut || null,
          id,
        ]
      );

      if (
        req.file &&
        oldVideo &&
        oldVideo !== newVideo
      ) {
        supprimerVideo(oldVideo);
      }

      if (
        req.file &&
        oldThumbnail &&
        oldThumbnail !== newThumbnail
      ) {
        supprimerVideo(oldThumbnail);
      }

      res.json({
        success: true,
        message:
          "Vidéo modifiée avec succès",
        video: result.rows[0],
      });
    } catch (error) {
      if (req.file) {
        supprimerVideo(
          `/uploads/videos/${req.file.filename}`
        );
      }

      if (
        newThumbnailPath &&
        fs.existsSync(newThumbnailPath)
      ) {
        try {
          fs.unlinkSync(
            newThumbnailPath
          );
        } catch {}
      }

      console.error(
        "❌ PUT video:",
        error
      );

      res.status(500).json({
        message:
          "Erreur modification vidéo",
      });
    }
  }
);

// ======================================================
// VIDÉO - SUPPRIMER
// ======================================================

app.delete(
  "/api/videos/:id",
  verifierToken,
  verifierRedacteur,
  async (req, res) => {
    const id = Number(req.params.id);

    try {
      if (isNaN(id)) {
        return res.status(400).json({
          message: "ID vidéo invalide",
        });
      }

      const autorise =
        await verifierProprietaire(
          "video",
          "id_video",
          id,
          req.user,
          res
        );

      if (!autorise) return;

      const result = await pool.query(
        `DELETE FROM video
         WHERE id_video = $1
         RETURNING
           video_url,
           thumbnail`,
        [id]
      );

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          message:
            "Vidéo introuvable",
        });
      }

      supprimerVideo(
        result.rows[0].video_url
      );

      supprimerVideo(
        result.rows[0].thumbnail
      );

      res.json({
        success: true,
        message:
          "Vidéo supprimée avec succès",
      });
    } catch (error) {
      console.error(
        "❌ DELETE video:",
        error
      );

      res.status(500).json({
        message:
          "Erreur suppression vidéo",
      });
    }
  }
);

// ======================================================
// LIVE - TYPES DE STREAM
// ======================================================

function detectStreamType(url) {
  if (!url) {
    return "youtube";
  }

  const value =
    url.toLowerCase();

  if (
    value.includes("youtube.com") ||
    value.includes("youtu.be")
  ) {
    return "youtube";
  }

  if (
    value.includes(".m3u8")
  ) {
    return "hls";
  }

  if (
    value.includes(".mp4") ||
    value.includes(".webm")
  ) {
    return "video";
  }

  return "youtube";
}

function isValidStreamUrl(url) {
  try {
    const parsed =
      new URL(url);

    return (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:"
    );
  } catch {
    return false;
  }
}

// ======================================================
// LIVE - PUBLIC
// ======================================================

app.get("/api/live", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        l.id_live,
        l.titre,
        l.description,
        l.stream_url,
        l.statut,
        l.created_at,
        l.updated_at,
        l.id_utilisateur,
        l.source_type

      FROM live l

      ORDER BY
        CASE
          WHEN l.statut = 'live'
          THEN 0
          ELSE 1
        END,
        l.created_at DESC

      LIMIT 1
    `);

    if (
      result.rows.length === 0
    ) {
      return res.json(null);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(
      "❌ GET live:",
      error
    );

    res.status(500).json({
      message:
        "Erreur récupération live",
    });
  }
});

// ======================================================
// LIVE - ADMIN
// ======================================================

app.get(
  "/api/live/all",
  verifierToken,
  verifierAdminEditeur,
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          l.id_live,
          l.titre,
          l.description,
          l.stream_url,
          l.statut,
          l.created_at,
          l.updated_at,
          l.id_utilisateur,
          l.source_type,

          (
            SELECT COUNT(*)
            FROM live_viewers lv
            WHERE lv.id_live = l.id_live
              AND lv.last_seen >
                  CURRENT_TIMESTAMP - INTERVAL '2 minutes'
          )::int AS viewers

        FROM live l

        ORDER BY
          l.created_at DESC
      `);

      res.json(result.rows);
    } catch (error) {
      console.error(
        "❌ GET all live:",
        error
      );

      res.status(500).json({
        message:
          "Erreur récupération des lives",
      });
    }
  }
);

// ======================================================
// LIVE - CRÉER
// ======================================================

app.post(
  "/api/live",
  verifierToken,
  verifierAdminEditeur,
  async (req, res) => {
    const client =
      await pool.connect();

    try {
      const {
        titre,
        description,
        stream_url,
        statut,
      } = req.body;

      if (
        !titre ||
        !stream_url
      ) {
        return res.status(400).json({
          message:
            "Titre et URL du stream obligatoires",
        });
      }

      if (
        !isValidStreamUrl(
          stream_url
        )
      ) {
        return res.status(400).json({
          message:
            "URL du stream invalide",
        });
      }

      const statutFinal =
        statut === "live"
          ? "live"
          : "offline";

      const sourceType =
        detectStreamType(
          stream_url
        );

      await client.query(
        "BEGIN"
      );

      // Un seul live actif à la fois
      if (
        statutFinal === "live"
      ) {
        await client.query(`
          UPDATE live
          SET
            statut = 'offline',
            updated_at = CURRENT_TIMESTAMP
          WHERE statut = 'live'
        `);
      }

      const result =
        await client.query(
          `INSERT INTO live
            (
              titre,
              description,
              stream_url,
              source_type,
              statut,
              id_utilisateur
            )
           VALUES
            ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            titre.trim(),
            description || null,
            stream_url.trim(),
            sourceType,
            statutFinal,
            req.user.id_utilisateur,
          ]
        );

      await client.query(
        "COMMIT"
      );

      res.status(201).json({
        success: true,
        message:
          "Live créé avec succès",
        live: result.rows[0],
      });
    } catch (error) {
      await client.query(
        "ROLLBACK"
      );

      console.error(
        "❌ POST live:",
        error
      );

      res.status(500).json({
        message:
          "Erreur création live",
      });
    } finally {
      client.release();
    }
  }
);

// ======================================================
// LIVE - MODIFIER
// ======================================================

app.put(
  "/api/live/:id",
  verifierToken,
  verifierAdminEditeur,
  async (req, res) => {
    const id = Number(req.params.id);

    try {
      if (isNaN(id)) {
        return res.status(400).json({
          message:
            "ID live invalide",
        });
      }

      const {
        titre,
        description,
        stream_url,
        statut,
      } = req.body;

      if (
        stream_url &&
        !isValidStreamUrl(
          stream_url
        )
      ) {
        return res.status(400).json({
          message:
            "URL du stream invalide",
        });
      }

      const current =
        await pool.query(
          `SELECT *
           FROM live
           WHERE id_live = $1`,
          [id]
        );

      if (
        current.rows.length === 0
      ) {
        return res.status(404).json({
          message:
            "Live introuvable",
        });
      }

      const currentLive =
        current.rows[0];

      const finalStreamUrl =
        stream_url ||
        currentLive.stream_url;

      const finalSourceType =
        detectStreamType(
          finalStreamUrl
        );

      const finalStatus =
        statut === "live"
          ? "live"
          : statut === "offline"
          ? "offline"
          : currentLive.statut;

      const client =
        await pool.connect();

      try {
        await client.query(
          "BEGIN"
        );

        if (
          finalStatus === "live"
        ) {
          await client.query(
            `UPDATE live
             SET
               statut = 'offline',
               updated_at = CURRENT_TIMESTAMP
             WHERE
               id_live <> $1
               AND statut = 'live'`,
            [id]
          );
        }

        const result =
          await client.query(
            `UPDATE live
             SET
               titre = COALESCE($1, titre),
               description = COALESCE($2, description),
               stream_url = COALESCE($3, stream_url),
               source_type = $4,
               statut = $5,
               updated_at = CURRENT_TIMESTAMP
             WHERE id_live = $6
             RETURNING *`,
            [
              titre || null,
              description !== undefined
                ? description
                : null,
              stream_url || null,
              finalSourceType,
              finalStatus,
              id,
            ]
          );

        await client.query(
          "COMMIT"
        );

        res.json({
          success: true,
          message:
            "Live modifié avec succès",
          live: result.rows[0],
        });
      } catch (error) {
        await client.query(
          "ROLLBACK"
        );

        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error(
        "❌ PUT live:",
        error
      );

      res.status(500).json({
        message:
          "Erreur modification live",
      });
    }
  }
);

// ======================================================
// LIVE - SUPPRIMER
// ======================================================

app.delete(
  "/api/live/:id",
  verifierToken,
  verifierAdminEditeur,
  async (req, res) => {
    const id = Number(req.params.id);

    try {
      if (isNaN(id)) {
        return res.status(400).json({
          message:
            "ID live invalide",
        });
      }

      // live_viewers sera supprimé automatiquement
      // grâce à ON DELETE CASCADE.
      const result = await pool.query(
        `DELETE FROM live
         WHERE id_live = $1
         RETURNING id_live`,
        [id]
      );

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          message:
            "Live introuvable",
        });
      }

      res.json({
        success: true,
        message:
          "Live supprimé avec succès",
      });
    } catch (error) {
      console.error(
        "❌ DELETE live:",
        error
      );

      res.status(500).json({
        message:
          "Erreur suppression live",
      });
    }
  }
);

// ======================================================
// LIVE - VIEWER
// ======================================================

app.post(
  "/api/live/viewer",
  async (req, res) => {
    try {
      const {
        session_id,
        id_live,
      } = req.body;

      if (
        !session_id ||
        !id_live
      ) {
        return res.status(400).json({
          message:
            "session_id et id_live sont obligatoires",
        });
      }

      const result = await pool.query(
        `INSERT INTO live_viewers
          (
            session_id,
            id_live,
            last_seen
          )
         VALUES
          ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (session_id)
         DO UPDATE SET
           id_live = EXCLUDED.id_live,
           last_seen = CURRENT_TIMESTAMP

         RETURNING *`,
        [
          session_id,
          id_live,
        ]
      );

      res.json({
        success: true,
        viewer: result.rows[0],
      });
    } catch (error) {
      console.error(
        "❌ POST live viewer:",
        error
      );

      res.status(500).json({
        message:
          "Erreur enregistrement viewer",
      });
    }
  }
);

// ======================================================
// UTILISATEURS - LISTE
// ======================================================

app.get(
  "/api/utilisateurs",
  verifierToken,
  verifierAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          id_utilisateur,
          nom,
          email,
          role,
          created_at

        FROM utilisateur

        ORDER BY
          created_at DESC
      `);

      res.json(result.rows);
    } catch (error) {
      console.error(
        "❌ GET utilisateurs:",
        error
      );

      res.status(500).json({
        message:
          "Erreur récupération utilisateurs",
      });
    }
  }
);

// ======================================================
// UTILISATEUR - CRÉER
// ======================================================

app.post(
  "/api/utilisateurs",
  verifierToken,
  verifierAdmin,
  async (req, res) => {
    try {
      const {
        nom,
        email,
        password,
        role,
      } = req.body;

      if (
        !nom ||
        !email ||
        !password
      ) {
        return res.status(400).json({
          message:
            "Nom, email et mot de passe obligatoires",
        });
      }

      let finalRole =
        role || ROLES.JOURNALISTE;

      const rolesValides = [
        ROLES.ADMIN,
        ROLES.EDITEUR,
        ROLES.JOURNALISTE,
      ];

      if (
        !rolesValides.includes(
          finalRole
        )
      ) {
        return res.status(400).json({
          message:
            "Rôle invalide",
        });
      }

      const passwordHash =
        await bcrypt.hash(
          password,
          10
        );

      const result = await pool.query(
        `INSERT INTO utilisateur
          (
            nom,
            email,
            password,
            role
          )
         VALUES
          ($1, $2, $3, $4)
         RETURNING
          id_utilisateur,
          nom,
          email,
          role,
          created_at`,
        [
          nom.trim(),
          email.trim().toLowerCase(),
          passwordHash,
          finalRole,
        ]
      );

      res.status(201).json({
        success: true,
        utilisateur:
          result.rows[0],
      });
    } catch (error) {
      console.error(
        "❌ POST utilisateur:",
        error
      );

      if (
        error.code === "23505"
      ) {
        return res.status(409).json({
          message:
            "Cet email existe déjà",
        });
      }

      res.status(500).json({
        message:
          "Erreur création utilisateur",
      });
    }
  }
);

// ======================================================
// UTILISATEUR - SUPPRIMER
// ======================================================

app.delete(
  "/api/utilisateurs/:id",
  verifierToken,
  verifierAdmin,
  async (req, res) => {
    const id = Number(req.params.id);

    try {
      if (isNaN(id)) {
        return res.status(400).json({
          message:
            "ID utilisateur invalide",
        });
      }

      if (
        Number(req.user.id_utilisateur) ===
        id
      ) {
        return res.status(400).json({
          message:
            "Vous ne pouvez pas supprimer votre propre compte",
        });
      }

      const result = await pool.query(
        `DELETE FROM utilisateur
         WHERE id_utilisateur = $1
         RETURNING
           id_utilisateur,
           nom,
           email`,
        [id]
      );

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          message:
            "Utilisateur introuvable",
        });
      }

      res.json({
        success: true,
        message:
          "Utilisateur supprimé avec succès",
      });
    } catch (error) {
      console.error(
        "❌ DELETE utilisateur:",
        error
      );

      // FK article/photo/video peuvent empêcher
      // la suppression d'un utilisateur qui possède
      // encore du contenu.
      if (
        error.code === "23503"
      ) {
        return res.status(409).json({
          message:
            "Impossible de supprimer cet utilisateur car il possède encore du contenu.",
        });
      }

      res.status(500).json({
        message:
          "Erreur suppression utilisateur",
      });
    }
  }
);

// ======================================================
// CONTACT - PUBLIC
// ======================================================

app.post(
  "/api/contacts",
  async (req, res) => {
    try {
      const {
        nom,
        email,
        sujet,
        message,
      } = req.body;

      if (
        !nom ||
        !email ||
        !message
      ) {
        return res.status(400).json({
          message:
            "Nom, email et message obligatoires",
        });
      }

      // La colonne sujet est NOT NULL dans PostgreSQL.
      const sujetFinal =
        sujet?.trim() ||
        "Contact général";

      const result = await pool.query(
        `INSERT INTO contact
          (
            nom,
            email,
            sujet,
            message
          )
         VALUES
          ($1, $2, $3, $4)
         RETURNING
          id_contact,
          nom,
          email,
          sujet,
          message,
          created_at`,
        [
          nom.trim(),
          email.trim(),
          sujetFinal,
          message.trim(),
        ]
      );

      res.status(201).json({
        success: true,
        message:
          "Message envoyé avec succès",
        contact:
          result.rows[0],
      });
    } catch (error) {
      console.error(
        "❌ POST contact:",
        error
      );

      res.status(500).json({
        message:
          "Erreur envoi message",
      });
    }
  }
);

// ======================================================
// CONTACT - ADMIN
// ======================================================

app.get(
  "/api/contacts",
  verifierToken,
  verifierAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          id_contact,
          nom,
          email,
          sujet,
          message,
          created_at

        FROM contact

        ORDER BY
          created_at DESC
      `);

      res.json(result.rows);
    } catch (error) {
      console.error(
        "❌ GET contacts:",
        error
      );

      res.status(500).json({
        message:
          "Erreur récupération contacts",
      });
    }
  }
);

// ======================================================
// CONTACT - SUPPRIMER
// ======================================================

app.delete(
  "/api/contacts/:id",
  verifierToken,
  verifierAdmin,
  async (req, res) => {
    const id = Number(req.params.id);

    try {
      if (isNaN(id)) {
        return res.status(400).json({
          message:
            "ID contact invalide",
        });
      }

      const result = await pool.query(
        `DELETE FROM contact
         WHERE id_contact = $1
         RETURNING id_contact`,
        [id]
      );

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          message:
            "Contact introuvable",
        });
      }

      res.json({
        success: true,
        message:
          "Message supprimé avec succès",
      });
    } catch (error) {
      console.error(
        "❌ DELETE contact:",
        error
      );

      res.status(500).json({
        message:
          "Erreur suppression contact",
      });
    }
  }
);

// ======================================================
// ÉQUIPE - PUBLIC
// ======================================================

app.get(
  "/api/equipe",
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          id_equipe,
          nom,
          fonction,

          -- Alias pour conserver la compatibilité
          -- avec le frontend actuel
          biographie AS bio,
          photo AS image_url,

          facebook,
          instagram,
          linkedin,
          afficher,
          ordre,
          created_at,
          updated_at

        FROM equipe

        WHERE afficher = TRUE

        ORDER BY
          ordre ASC,
          created_at ASC
      `);

      res.json(result.rows);
    } catch (error) {
      console.error(
        "❌ GET equipe:",
        error
      );

      res.status(500).json({
        message:
          "Erreur récupération équipe",
      });
    }
  }
);

// ======================================================
// ÉQUIPE - ADMIN
// ======================================================

app.get(
  "/api/equipe/admin",
  verifierToken,
  verifierEquipeEditoriale,
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT *
        FROM equipe

        ORDER BY
          ordre ASC,
          created_at ASC
      `);

      res.json(result.rows);
    } catch (error) {
      console.error(
        "❌ GET admin equipe:",
        error
      );

      res.status(500).json({
        message:
          "Erreur récupération équipe",
      });
    }
  }
);

// ======================================================
// ÉQUIPE - AJOUTER
// ======================================================

app.post(
  "/api/equipe",
  verifierToken,
  verifierEquipeEditoriale,
  upload.single("image"),
  async (req, res) => {
    try {
      const {
        nom,
        fonction,
        bio,
        biographie,
        facebook,
        instagram,
        linkedin,
        afficher,
        ordre,
      } = req.body;

      if (
        !nom ||
        !fonction
      ) {
        if (req.file) {
          supprimerImage(
            `/uploads/${req.file.filename}`
          );
        }

        return res.status(400).json({
          message:
            "Nom et fonction obligatoires",
        });
      }

      const photo =
        req.file
          ? `/uploads/${req.file.filename}`
          : null;

      const bioFinal =
        biographie !== undefined
          ? biographie
          : bio || null;

      const afficherFinal =
        afficher === undefined
          ? true
          : String(afficher) === "true";

      const ordreFinal =
        ordre !== undefined
          ? Number(ordre) || 0
          : 0;

      const result = await pool.query(
        `INSERT INTO equipe
          (
            nom,
            fonction,
            biographie,
            photo,
            facebook,
            instagram,
            linkedin,
            afficher,
            ordre
          )
         VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          nom.trim(),
          fonction.trim(),
          bioFinal,
          photo,
          facebook || null,
          instagram || null,
          linkedin || null,
          afficherFinal,
          ordreFinal,
        ]
      );

      res.status(201).json({
        success: true,
        membre:
          result.rows[0],
      });
    } catch (error) {
      if (req.file) {
        supprimerImage(
          `/uploads/${req.file.filename}`
        );
      }

      console.error(
        "❌ POST equipe:",
        error
      );

      res.status(500).json({
        message:
          "Erreur ajout membre équipe",
      });
    }
  }
);

// ======================================================
// ÉQUIPE - MODIFIER
// ======================================================

app.put(
  "/api/equipe/:id",
  verifierToken,
  verifierEquipeEditoriale,
  upload.single("image"),
  async (req, res) => {
    const id = Number(req.params.id);

    try {
      if (isNaN(id)) {
        return res.status(400).json({
          message:
            "ID membre invalide",
        });
      }

      const oldResult =
        await pool.query(
          `SELECT *
           FROM equipe
           WHERE id_equipe = $1`,
          [id]
        );

      if (
        oldResult.rows.length === 0
      ) {
        if (req.file) {
          supprimerImage(
            `/uploads/${req.file.filename}`
          );
        }

        return res.status(404).json({
          message:
            "Membre introuvable",
        });
      }

      const oldMember =
        oldResult.rows[0];

      const {
        nom,
        fonction,
        bio,
        biographie,
        facebook,
        instagram,
        linkedin,
        afficher,
        ordre,
      } = req.body;

      const newPhoto =
        req.file
          ? `/uploads/${req.file.filename}`
          : oldMember.photo;

      const bioFinal =
        biographie !== undefined
          ? biographie
          : bio !== undefined
          ? bio
          : oldMember.biographie;

      let afficherFinal =
        oldMember.afficher;

      if (
        afficher !== undefined
      ) {
        afficherFinal =
          String(afficher) === "true";
      }

      const ordreFinal =
        ordre !== undefined
          ? Number(ordre) || 0
          : oldMember.ordre;

      const result = await pool.query(
        `UPDATE equipe
         SET
           nom = COALESCE($1, nom),
           fonction = COALESCE($2, fonction),
           biographie = $3,
           photo = $4,
           facebook = COALESCE($5, facebook),
           instagram = COALESCE($6, instagram),
           linkedin = COALESCE($7, linkedin),
           afficher = $8,
           ordre = $9,
           updated_at = CURRENT_TIMESTAMP

         WHERE id_equipe = $10

         RETURNING *`,
        [
          nom || null,
          fonction || null,
          bioFinal,
          newPhoto,
          facebook !== undefined
            ? facebook || null
            : oldMember.facebook,
          instagram !== undefined
            ? instagram || null
            : oldMember.instagram,
          linkedin !== undefined
            ? linkedin || null
            : oldMember.linkedin,
          afficherFinal,
          ordreFinal,
          id,
        ]
      );

      if (
        req.file &&
        oldMember.photo &&
        oldMember.photo !== newPhoto
      ) {
        supprimerImage(
          oldMember.photo
        );
      }

      res.json({
        success: true,
        membre:
          result.rows[0],
      });
    } catch (error) {
      if (req.file) {
        supprimerImage(
          `/uploads/${req.file.filename}`
        );
      }

      console.error(
        "❌ PUT equipe:",
        error
      );

      res.status(500).json({
        message:
          "Erreur modification membre",
      });
    }
  }
);

// ======================================================
// ÉQUIPE - SUPPRIMER
// ======================================================

app.delete(
  "/api/equipe/:id",
  verifierToken,
  verifierEquipeEditoriale,
  async (req, res) => {
    const id = Number(req.params.id);

    try {
      if (isNaN(id)) {
        return res.status(400).json({
          message:
            "ID membre invalide",
        });
      }

      const result = await pool.query(
        `DELETE FROM equipe
         WHERE id_equipe = $1
         RETURNING
           id_equipe,
           photo`,
        [id]
      );

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          message:
            "Membre introuvable",
        });
      }

      supprimerImage(

        result.rows[0].photo

      );

      res.json({

        success: true,

        message:

          "Membre supprimé avec succès",

      });

    } catch (error) {

      console.error(

        "❌ DELETE equipe:",

        error

      );

      res.status(500).json({

        message:

          "Erreur suppression membre",

      });

    }

  }

);

// ======================================================

// GESTION ERREURS MULTER

// ======================================================

app.use(

  (error, req, res, next) => {

    if (

      error instanceof multer.MulterError

    ) {

      console.error(

        "❌ Erreur Multer:",

        error

      );

      if (

        error.code ===

        "LIMIT_FILE_SIZE"

      ) {

        return res.status(400).json({

          message:

            "Fichier trop volumineux",

        });

      }

      if (

        error.code ===

        "LIMIT_FILE_COUNT"

      ) {

        return res.status(400).json({

          message:

            "Trop de fichiers",

        });

      }

      return res.status(400).json({

        message:

          error.message,

      });

    }

    if (error) {

      console.error(

        "❌ Erreur serveur:",

        error

      );

      return res.status(400).json({

        message:

          error.message ||

          "Erreur serveur",

      });

    }

    next();

  }

);

// ======================================================

// ROUTE 404

// ======================================================

app.use(

  (req, res) => {

    res.status(404).json({

      success: false,

      message:

        "Route API introuvable",

      path: req.originalUrl,

    });

  }

);

// ======================================================

// DÉMARRAGE SERVEUR

// ======================================================

async function startServer() {

  try {

    // Vérification DB

    await pool.query(

      "SELECT 1"

    );

    console.log(

      "✅ PostgreSQL connecté"

    );

    // Vérification JWT

    if (!process.env.JWT_SECRET) {

      console.warn(

        "⚠️ JWT_SECRET n'est pas défini dans les variables d'environnement."

      );

    } else {

      console.log(

        "✅ JWT_SECRET configuré"

      );

    }

    // Vérification FFmpeg

    await testFFmpeg();

    app.listen(

      PORT,

      "0.0.0.0",

      () => {

        console.log(

          "=========================================="

        );

        console.log(

          "🚀 Mikwo Pèp La TV API démarrée"

        );

        console.log(

          `📡 Port: ${PORT}`

        );

        console.log(

          `🌐 Environnement: ${

            process.env.NODE_ENV ||

            "development"

          }`

        );

        console.log(

          `🗄️ Base: ${

            process.env.DATABASE_URL

              ? "Render PostgreSQL"

              : "PostgreSQL local"

          }`

        );

        console.log(

          "=========================================="

        );

      }

    );

  } catch (error) {

    console.error(

      "❌ Impossible de démarrer le serveur:"

    );

    console.error(

      error

    );

    process.exit(1);

  }

}

startServer();
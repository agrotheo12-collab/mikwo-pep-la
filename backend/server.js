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

const ffmpegPath =

  process.env.FFMPEG_PATH || "/opt/homebrew/bin/ffmpeg";

// ======================================================

// CORS

// ======================================================

app.use(

  cors({

    origin: process.env.FRONTEND_URL || true,

  })

);

// ======================================================

// BODY PARSER

// ======================================================

app.use(express.json({ limit: "2mb" }));

app.use(express.urlencoded({ extended: true }));

// ======================================================

// CONFIGURATION POSTGRESQL

// ======================================================

//

// En local :

// DB_USER, DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT

//

// Sur Render :

// DATABASE_URL

// ======================================================

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

// ======================================================

// DOSSIERS UPLOADS

// ======================================================

const uploadsPath = path.join(__dirname, "uploads");

const videosPath = path.join(uploadsPath, "videos");

if (!fs.existsSync(uploadsPath)) {

  fs.mkdirSync(uploadsPath, {

    recursive: true,

  });

}

if (!fs.existsSync(videosPath)) {

  fs.mkdirSync(videosPath, {

    recursive: true,

  });

}

// Fichiers statiques

app.use(

  "/uploads",

  express.static(uploadsPath, {

    maxAge: "1d",

  })

);

// ======================================================

// MULTER — IMAGES

// ======================================================

const imageStorage = multer.diskStorage({

  destination: function (req, file, cb) {

    cb(null, uploadsPath);

  },

  filename: function (req, file, cb) {

    const extension = path.extname(file.originalname);

    const filename =

      Date.now() +

      "-" +

      Math.round(Math.random() * 1e9) +

      extension;

    cb(null, filename);

  },

});

const allowedImageTypes = [

  "image/jpeg",

  "image/jpg",

  "image/png",

  "image/webp",

  "image/gif",

];

const upload = multer({

  storage: imageStorage,

  fileFilter: function (req, file, cb) {

    if (allowedImageTypes.includes(file.mimetype)) {

      cb(null, true);

    } else {

      cb(

        new Error(

          "Format d'image non autorisé. Utilisez JPG, JPEG, PNG, WEBP ou GIF."

        )

      );

    }

  },

  limits: {

    fileSize: 5 * 1024 * 1024,

    files: 20,

  },

});

// ======================================================

// MULTER — VIDÉOS

// ======================================================

const videoStorage = multer.diskStorage({

  destination: function (req, file, cb) {

    cb(null, videosPath);

  },

  filename: function (req, file, cb) {

    const extension = path.extname(file.originalname);

    const filename =

      Date.now() +

      "-" +

      Math.round(Math.random() * 1e9) +

      extension;

    cb(null, filename);

  },

});

const allowedVideoTypes = [

  "video/mp4",

  "video/webm",

  "video/quicktime",

  "video/x-msvideo",

  "video/mpeg",

];

const uploadVideo = multer({

  storage: videoStorage,

  fileFilter: function (req, file, cb) {

    if (allowedVideoTypes.includes(file.mimetype)) {

      cb(null, true);

    } else {

      cb(

        new Error(

          "Format vidéo non autorisé. Utilisez MP4, WEBM, MOV, AVI ou MPEG."

        )

      );

    }

  },

  limits: {

    fileSize: 500 * 1024 * 1024,

  },

});

// ======================================================

// TEST BASE DE DONNÉES

// ======================================================

app.get("/api/test-db", async (req, res) => {

  try {

    const result = await pool.query("SELECT NOW()");

    res.json({

      success: true,

      message: "Connexion PostgreSQL réussie.",

      time: result.rows[0].now,

    });

  } catch (error) {

    console.error("Erreur PostgreSQL :", error);

    res.status(500).json({

      success: false,

      message: "Erreur de connexion PostgreSQL.",

    });

  }

});

// ======================================================

// API PRINCIPALE

// ======================================================

app.get("/api", (req, res) => {

  res.json({

    success: true,

    message: "API Mikwo Pèp La TV fonctionne.",

  });

});

// ======================================================

// AUTHENTIFICATION

// ======================================================

app.post("/api/login", async (req, res) => {

  try {

    const { email, password } = req.body;

    if (!email || !password) {

      return res.status(400).json({

        message: "Email et mot de passe obligatoires.",

      });

    }

    const result = await pool.query(

      `

      SELECT

        id_utilisateur,

        nom,

        email,

        password,

        role

      FROM utilisateur

      WHERE LOWER(email) = LOWER($1)

      LIMIT 1

      `,

      [email.trim()]

    );

    if (result.rows.length === 0) {

      return res.status(401).json({

        message: "Email ou mot de passe incorrect.",

      });

    }

    const utilisateur = result.rows[0];

    const passwordCorrect = await bcrypt.compare(

      password,

      utilisateur.password

    );

    if (!passwordCorrect) {

      return res.status(401).json({

        message: "Email ou mot de passe incorrect.",

      });

    }

    if (!process.env.JWT_SECRET) {

      console.error("JWT_SECRET manquant.");

      return res.status(500).json({

        message: "Configuration serveur incomplète.",

      });

    }

    const token = jwt.sign(

      {

        id_utilisateur: utilisateur.id_utilisateur,

        email: utilisateur.email,

        role: utilisateur.role,

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

        id_utilisateur: utilisateur.id_utilisateur,

        nom: utilisateur.nom,

        email: utilisateur.email,

        role: utilisateur.role,

      },

    });

  } catch (error) {

    console.error("Erreur login :", error);

    res.status(500).json({

      message: "Erreur serveur.",

    });

  }

});

// ======================================================

// MIDDLEWARE TOKEN

// ======================================================

function verifierToken(req, res, next) {

  try {

    const authorization = req.headers.authorization;

    if (!authorization) {

      return res.status(401).json({

        message: "Token manquant.",

      });

    }

    const parts = authorization.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {

      return res.status(401).json({

        message: "Format du token invalide.",

      });

    }

    const token = parts[1];

    if (!process.env.JWT_SECRET) {

      return res.status(500).json({

        message: "JWT_SECRET non configuré.",

      });

    }

    const decoded = jwt.verify(

      token,

      process.env.JWT_SECRET

    );

    req.user = decoded;

    next();

  } catch (error) {

    console.error("Erreur token :", error);

    return res.status(401).json({

      message: "Token invalide ou expiré.",

    });

  }

}

// ======================================================

// RÔLES

// ======================================================

const ROLES = {

  ADMIN: "admin",

  EDITEUR: "editeur",

  JOURNALISTE: "journaliste",

};

function verifierRole(...rolesAutorises) {

  return (req, res, next) => {

    if (!req.user) {

      return res.status(401).json({

        message: "Authentification requise.",

      });

    }

    if (!rolesAutorises.includes(req.user.role)) {

      return res.status(403).json({

        message: "Accès refusé.",

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

// SUPPRESSION IMAGE

// ======================================================

function supprimerImage(imageUrl) {

  try {

    if (!imageUrl) return;

    const filename = path.basename(imageUrl);

    if (!filename) return;

    const imagePath = path.join(

      uploadsPath,

      filename

    );

    if (fs.existsSync(imagePath)) {

      fs.unlinkSync(imagePath);

      console.log(

        `Image supprimée : ${filename}`

      );

    }

  } catch (error) {

    console.error(

      "Erreur suppression image :",

      error

    );

  }

}

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

  if (

    user.role === ROLES.ADMIN ||

    user.role === ROLES.EDITEUR

  ) {

    return true;

  }

  const result = await pool.query(

    `

    SELECT id_utilisateur

    FROM ${table}

    WHERE ${idColumn} = $1

    `,

    [id]

  );

  if (result.rows.length === 0) {

    res.status(404).json({

      message: "Élément introuvable.",

    });

    return false;

  }

  if (

    Number(result.rows[0].id_utilisateur) !==

    Number(user.id_utilisateur)

  ) {

    res.status(403).json({

      message:

        "Vous n'êtes pas autorisé à modifier cet élément.",

    });

    return false;

  }

  return true;

}

// ======================================================

// ARTICLES — PUBLIC

// ======================================================

app.get("/api/articles", async (req, res) => {

  try {

    const result = await pool.query(`

      SELECT

        a.id_article,

        a.titre,

        a.slug,

        a.contenu,

        a.image_url,

        a.statut,

        a.created_at,

        a.id_utilisateur,

        u.nom AS auteur

      FROM article a

      LEFT JOIN utilisateur u

        ON a.id_utilisateur = u.id_utilisateur

      WHERE a.statut = 'publie'

      ORDER BY a.created_at DESC

    `);

    res.json(result.rows);

  } catch (error) {

    console.error(

      "Erreur récupération articles :",

      error

    );

    res.status(500).json({

      message: "Erreur serveur.",

    });

  }

});

// ======================================================

// AJOUT ARTICLE

// ======================================================

app.post(

  "/api/articles",

  verifierToken,

  verifierEquipeEditoriale,

  upload.single("image"),

  async (req, res) => {

    try {

      const {

        titre,

        slug,

        contenu,

        statut,

      } = req.body;

      if (!titre || !slug || !contenu) {

        if (req.file) {

          supprimerImage(

            `/uploads/${req.file.filename}`

          );

        }

        return res.status(400).json({

          message:

            "Titre, slug et contenu obligatoires.",

        });

      }

      if (!req.file) {

        return res.status(400).json({

          message:

            "Une image est obligatoire.",

        });

      }

      const imageUrl =

        `/uploads/${req.file.filename}`;

      const result = await pool.query(

        `

        INSERT INTO article

        (

          titre,

          slug,

          contenu,

          image_url,

          statut,

          created_at,

          id_utilisateur

        )

        VALUES

        ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)

        RETURNING *

        `,

        [

          titre,

          slug,

          contenu,

          imageUrl,

          statut || "publie",

          req.user.id_utilisateur,

        ]

      );

      res.status(201).json({

        success: true,

        message: "Article ajouté.",

        article: result.rows[0],

      });

    } catch (error) {

      console.error(

        "Erreur ajout article :",

        error

      );

      if (req.file) {

        supprimerImage(

          `/uploads/${req.file.filename}`

        );

      }

      res.status(500).json({

        message: "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// MODIFICATION ARTICLE

// ======================================================

app.put(

  "/api/articles/:id",

  verifierToken,

  verifierEquipeEditoriale,

  upload.single("image"),

  async (req, res) => {

    try {

      const id = req.params.id;

      const autorise =

        await verifierProprietaire(

          "article",

          "id_article",

          id,

          req.user,

          res

        );

      if (!autorise) {

        if (req.file) {

          supprimerImage(

            `/uploads/${req.file.filename}`

          );

        }

        return;

      }

      const {

        titre,

        slug,

        contenu,

        statut,

      } = req.body;

      const oldResult = await pool.query(

        `

        SELECT image_url

        FROM article

        WHERE id_article = $1

        `,

        [id]

      );

      if (oldResult.rows.length === 0) {

        return res.status(404).json({

          message: "Article introuvable.",

        });

      }

      const oldImage =

        oldResult.rows[0].image_url;

      let imageUrl = oldImage;

      if (req.file) {

        imageUrl =

          `/uploads/${req.file.filename}`;

      }

      const result = await pool.query(

        `

        UPDATE article

        SET

          titre = COALESCE($1, titre),

          slug = COALESCE($2, slug),

          contenu = COALESCE($3, contenu),

          image_url = $4,

          statut = COALESCE($5, statut)

        WHERE id_article = $6

        RETURNING *

        `,

        [

          titre,

          slug,

          contenu,

          imageUrl,

          statut,

          id,

        ]

      );

      if (req.file && oldImage) {

        supprimerImage(oldImage);

      }

      res.json({

        success: true,

        message: "Article modifié.",

        article: result.rows[0],

      });

    } catch (error) {

      console.error(

        "Erreur modification article :",

        error

      );

      if (req.file) {

        supprimerImage(

          `/uploads/${req.file.filename}`

        );

      }

      res.status(500).json({

        message: "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// SUPPRESSION ARTICLE

// ======================================================

app.delete(

  "/api/articles/:id",

  verifierToken,

  verifierEquipeEditoriale,

  async (req, res) => {

    try {

      const id = req.params.id;

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

        `

        DELETE FROM article

        WHERE id_article = $1

        RETURNING image_url

        `,

        [id]

      );

      if (result.rows.length === 0) {

        return res.status(404).json({

          message: "Article introuvable.",

        });

      }

      supprimerImage(

        result.rows[0].image_url

      );

      res.json({

        success: true,

        message: "Article supprimé.",

      });

    } catch (error) {

      console.error(

        "Erreur suppression article :",

        error

      );

      res.status(500).json({

        message: "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// PHOTOS — PUBLIC

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

        ON p.id_utilisateur = u.id_utilisateur

      WHERE p.statut = 'publie'

      ORDER BY p.created_at DESC, p.id_photo DESC

    `);

    res.json(result.rows);

  } catch (error) {

    console.error(

      "Erreur récupération photos :",

      error

    );

    res.status(500).json({

      message: "Erreur serveur.",

    });

  }

});

// ======================================================

// PHOTO PUBLICATIONS — GROUPÉES

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

            ORDER BY p.id_photo

          ) AS photos,

          COUNT(p.id_photo)::int AS nombre_photos

        FROM photo p

        LEFT JOIN utilisateur u

          ON p.id_utilisateur = u.id_utilisateur

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

        "Erreur photo publications :",

        error

      );

      res.status(500).json({

        message: "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// AJOUT PHOTOS

// ======================================================

app.post(

  "/api/photos",

  verifierToken,

  verifierEquipeEditoriale,

  upload.array("photos", 20),

  async (req, res) => {

    try {

      const {

        titre,

        description,

        id_categorie,

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

          message: "Titre obligatoire.",

        });

      }

      if (

        !req.files ||

        req.files.length === 0

      ) {

        return res.status(400).json({

          message:

            "Au moins une photo est obligatoire.",

        });

      }

      const publicationDate = new Date();

      const insertedPhotos = [];

      for (const file of req.files) {

        const imageUrl =

          `/uploads/${file.filename}`;

        const result = await pool.query(

          `

          INSERT INTO photo

          (

            titre,

            description,

            image_url,

            statut,

            created_at,

            id_utilisateur,

            id_categorie

          )

          VALUES

          ($1, $2, $3, $4, $5, $6, $7)

          RETURNING *

          `,

          [

            titre,

            description || null,

            imageUrl,

            statut || "publie",

            publicationDate,

            req.user.id_utilisateur,

            id_categorie

              ? Number(id_categorie)

              : null,

          ]

        );

        insertedPhotos.push(

          result.rows[0]

        );

      }

      res.status(201).json({

        success: true,

        message:

          "Publication photo ajoutée.",

        photos: insertedPhotos,

      });

    } catch (error) {

      console.error(

        "Erreur ajout photos :",

        error

      );

      if (req.files) {

        req.files.forEach((file) => {

          supprimerImage(

            `/uploads/${file.filename}`

          );

        });

      }

      res.status(500).json({

        message: "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// MODIFICATION PHOTO

// ======================================================

app.put(

  "/api/photos/:id",

  verifierToken,

  verifierAdminEditeur,

  async (req, res) => {

    try {

      const id = req.params.id;

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

        `

        UPDATE photo

        SET

          titre = COALESCE($1, titre),

          description = COALESCE($2, description),

          statut = COALESCE($3, statut)

        WHERE id_photo = $4

        RETURNING *

        `,

        [

          titre,

          description,

          statut,

          id,

        ]

      );

      res.json({

        success: true,

        message: "Photo modifiée.",

        photo: result.rows[0],

      });

    } catch (error) {

      console.error(

        "Erreur modification photo :",

        error

      );

      res.status(500).json({

        message: "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// SUPPRESSION PHOTO

// ======================================================

app.delete(

  "/api/photos/:id",

  verifierToken,

  verifierAdminEditeur,

  async (req, res) => {

    try {

      const id = req.params.id;

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

        `

        DELETE FROM photo

        WHERE id_photo = $1

        RETURNING image_url

        `,

        [id]

      );

      if (result.rows.length === 0) {

        return res.status(404).json({

          message: "Photo introuvable.",

        });

      }

      supprimerImage(

        result.rows[0].image_url

      );

      res.json({

        success: true,

        message: "Photo supprimée.",

      });

    } catch (error) {

      console.error(

        "Erreur suppression photo :",

        error

      );

      res.status(500).json({

        message: "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// VIDÉOS — PUBLIC

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

        ON v.id_utilisateur = u.id_utilisateur

      WHERE v.statut = 'publie'

      ORDER BY v.created_at DESC

    `);

    res.json(result.rows);

  } catch (error) {

    console.error(

      "Erreur récupération vidéos :",

      error

    );

    res.status(500).json({

      message: "Erreur serveur.",

    });

  }

});

// ======================================================

// VIDÉOS — ADMIN

// ======================================================

app.get(

  "/api/videos/admin",

  verifierToken,

  verifierEditeur,

  async (req, res) => {

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

          ON v.id_utilisateur = u.id_utilisateur

        ORDER BY v.created_at DESC

      `);

      res.json(result.rows);

    } catch (error) {

      console.error(

        "Erreur récupération vidéos admin :",

        error

      );

      res.status(500).json({

        message: "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// FFmpeg — THUMBNAIL VIDÉO

// ======================================================

function generateVideoThumbnail(

  videoPath,

  thumbnailPath,

  time = "00:00:01"

) {

  return new Promise((resolve, reject) => {

    try {

      if (!fs.existsSync(videoPath)) {

        return reject(

          new Error(

            "Fichier vidéo introuvable."

          )

        );

      }

      if (!fs.existsSync(ffmpegPath)) {

        return reject(

          new Error(

            `FFmpeg introuvable : ${ffmpegPath}`

          )

        );

      }

      const args = [

        "-ss",

        time,

        "-i",

        videoPath,

        "-frames:v",

        "1",

        "-vf",

        "scale=1280:-2",

        "-y",

        thumbnailPath,

      ];

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

          if (

            code === 0 &&

            fs.existsSync(thumbnailPath)

          ) {

            resolve(thumbnailPath);

          } else {

            reject(

              new Error(

                `FFmpeg a échoué (${code}) : ${stderr}`

              )

            );

          }

        }

      );

    } catch (error) {

      reject(error);

    }

  });

}

// ======================================================

// AJOUT VIDÉO

// ======================================================

app.post(

  "/api/videos",

  verifierToken,

  verifierRedacteur,

  uploadVideo.single("video"),

  async (req, res) => {

    let thumbnailPath = null;

    try {

      const {

        titre,

        description,

        statut,

      } = req.body;

      if (!titre) {

        if (req.file) {

          fs.unlinkSync(req.file.path);

        }

        return res.status(400).json({

          message: "Titre obligatoire.",

        });

      }

      if (!req.file) {

        return res.status(400).json({

          message:

            "Une vidéo est obligatoire.",

        });

      }

      const videoUrl =

        `/uploads/videos/${req.file.filename}`;

      const thumbnailFilename =

        `${path.parse(req.file.filename).name}-thumbnail.jpg`;

      thumbnailPath = path.join(

        videosPath,

        thumbnailFilename

      );

      try {

        await generateVideoThumbnail(

          req.file.path,

          thumbnailPath,

          "00:00:01"

        );

      } catch (firstError) {

        console.warn(

          "Thumbnail à 1 seconde échoué, tentative à 0 seconde..."

        );

        await generateVideoThumbnail(

          req.file.path,

          thumbnailPath,

          "00:00:00"

        );

      }

      const thumbnailUrl =

        `/uploads/videos/${thumbnailFilename}`;

      const result = await pool.query(

        `

        INSERT INTO video

        (

          titre,

          description,

          thumbnail,

          video_url,

          statut,

          created_at,

          id_utilisateur

        )

        VALUES

        ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)

        RETURNING *

        `,

        [

          titre,

          description || null,

          thumbnailUrl,

          videoUrl,

          statut || "publie",

          req.user.id_utilisateur,

        ]

      );

      res.status(201).json({

        success: true,

        message: "Vidéo ajoutée.",

        video: result.rows[0],

      });

    } catch (error) {

      console.error(

        "Erreur ajout vidéo :",

        error

      );

      if (

        req.file &&

        fs.existsSync(req.file.path)

      ) {

        fs.unlinkSync(req.file.path);

      }

      if (

        thumbnailPath &&

        fs.existsSync(thumbnailPath)

      ) {

        fs.unlinkSync(thumbnailPath);

      }

      res.status(500).json({

        message:

          error.message ||

          "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// MODIFICATION VIDÉO

// ======================================================

app.put(

  "/api/videos/:id",

  verifierToken,

  verifierRedacteur,

  uploadVideo.single("video"),

  async (req, res) => {

    try {

      const id = req.params.id;

      const autorise =

        await verifierProprietaire(

          "video",

          "id_video",

          id,

          req.user,

          res

        );

      if (!autorise) {

        if (req.file) {

          fs.unlinkSync(req.file.path);

        }

        return;

      }

      const {

        titre,

        description,

        statut,

      } = req.body;

      const oldResult = await pool.query(

        `

        SELECT

          video_url,

          thumbnail

        FROM video

        WHERE id_video = $1

        `,

        [id]

      );

      if (oldResult.rows.length === 0) {

        return res.status(404).json({

          message: "Vidéo introuvable.",

        });

      }

      const oldVideo =

        oldResult.rows[0].video_url;

      const oldThumbnail =

        oldResult.rows[0].thumbnail;

      let videoUrl = oldVideo;

      let thumbnailUrl = oldThumbnail;

      if (req.file) {

        videoUrl =

          `/uploads/videos/${req.file.filename}`;

        const thumbnailFilename =

          `${path.parse(req.file.filename).name}-thumbnail.jpg`;

        const thumbnailPath = path.join(

          videosPath,

          thumbnailFilename

        );

        try {

          await generateVideoThumbnail(

            req.file.path,

            thumbnailPath,

            "00:00:01"

          );

        } catch (firstError) {

          console.warn(

            "Thumbnail à 1 seconde échoué, tentative à 0 seconde..."

          );

          await generateVideoThumbnail(

            req.file.path,

            thumbnailPath,

            "00:00:00"

          );

        }

        thumbnailUrl =

          `/uploads/videos/${thumbnailFilename}`;

      }

      const result = await pool.query(

        `

        UPDATE video

        SET

          titre = COALESCE($1, titre),

          description = COALESCE($2, description),

          thumbnail = $3,

          video_url = $4,

          statut = COALESCE($5, statut)

        WHERE id_video = $6

        RETURNING *

        `,

        [

          titre,

          description,

          thumbnailUrl,

          videoUrl,

          statut,

          id,

        ]

      );

      if (req.file) {

        supprimerImage(oldVideo);

        supprimerImage(oldThumbnail);

        const oldVideoFilename =

          path.basename(oldVideo || "");

        const oldVideoPath = path.join(

          videosPath,

          oldVideoFilename

        );

        if (

          oldVideoFilename &&

          fs.existsSync(oldVideoPath)

        ) {

          fs.unlinkSync(oldVideoPath);

        }

        const oldThumbnailFilename =

          path.basename(oldThumbnail || "");

        const oldThumbnailPath = path.join(

          videosPath,

          oldThumbnailFilename

        );

        if (

          oldThumbnailFilename &&

          fs.existsSync(oldThumbnailPath)

        ) {

          fs.unlinkSync(oldThumbnailPath);

        }

      }

      res.json({

        success: true,

        message: "Vidéo modifiée.",

        video: result.rows[0],

      });

    } catch (error) {

      console.error(

        "Erreur modification vidéo :",

        error

      );

      if (req.file) {

        const filePath = req.file.path;

        if (fs.existsSync(filePath)) {

          fs.unlinkSync(filePath);

        }

      }

      res.status(500).json({

        message: "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// SUPPRESSION VIDÉO

// ======================================================

app.delete(

  "/api/videos/:id",

  verifierToken,

  verifierRedacteur,

  async (req, res) => {

    try {

      const id = req.params.id;

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

        `

        DELETE FROM video

        WHERE id_video = $1

        RETURNING video_url, thumbnail

        `,

        [id]

      );

      if (result.rows.length === 0) {

        return res.status(404).json({

          message: "Vidéo introuvable.",

        });

      }

      const {

        video_url,

        thumbnail,

      } = result.rows[0];

      const videoFilename =

        path.basename(video_url || "");

      const videoPath = path.join(

        videosPath,

        videoFilename

      );

      if (

        videoFilename &&

        fs.existsSync(videoPath)

      ) {

        fs.unlinkSync(videoPath);

      }

      const thumbnailFilename =

        path.basename(thumbnail || "");

      const thumbnailPath = path.join(

        videosPath,

        thumbnailFilename

      );

      if (

        thumbnailFilename &&

        fs.existsSync(thumbnailPath)

      ) {

        fs.unlinkSync(thumbnailPath);

      }

      res.json({

        success: true,

        message: "Vidéo supprimée.",

      });

    } catch (error) {

      console.error(

        "Erreur suppression vidéo :",

        error

      );

      res.status(500).json({

        message: "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// LIVE

// ======================================================

function detectStreamType(url) {

  if (!url) return "unknown";

  const lower = url.toLowerCase();

  if (

    lower.includes(".m3u8") ||

    lower.includes("m3u8")

  ) {

    return "hls";

  }

  if (lower.includes(".mp4")) {

    return "mp4";

  }

  if (lower.includes(".webm")) {

    return "webm";

  }

  if (

    lower.includes(".mov") ||

    lower.includes("quicktime")

  ) {

    return "mov";

  }

  return "unknown";

}

function isValidStreamUrl(url) {

  try {

    const parsed = new URL(url);

    return (

      parsed.protocol === "http:" ||

      parsed.protocol === "https:"

    );

  } catch {

    return false;

  }

}

// ======================================================

// LIVE — PUBLIC

// ======================================================

app.get("/api/live", async (req, res) => {

  try {

    const result = await pool.query(`

      SELECT *

      FROM live

      WHERE statut = 'live'

      ORDER BY id_live DESC

      LIMIT 1

    `);

    if (result.rows.length === 0) {

      return res.json({

        is_live: false,

        live: null,

      });

    }

    const live = result.rows[0];

    res.json({

      is_live: true,

      live: {

        ...live,

        stream_type:

          detectStreamType(

            live.stream_url

          ),

      },

    });

  } catch (error) {

    console.error(

      "Erreur live public :",

      error

    );

    res.status(500).json({

      message: "Erreur serveur.",

    });

  }

});

// ======================================================

// LIVE — ADMIN

// ======================================================

app.get(

  "/api/live/all",

  verifierToken,

  verifierEditeur,

  async (req, res) => {

    try {

      const result = await pool.query(`

        SELECT

          l.*,

          COALESCE(

            (

              SELECT COUNT(*)

              FROM live_viewers lv

              WHERE

                lv.id_live = l.id_live

                AND lv.last_seen >

                  CURRENT_TIMESTAMP - INTERVAL '90 seconds'

            ),

            0

          )::int AS viewer_count

        FROM live l

        ORDER BY l.id_live DESC

      `);

      res.json(result.rows);

    } catch (error) {

      console.error(

        "Erreur live admin :",

        error

      );

      res.status(500).json({

        message: "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// AJOUT LIVE

// ======================================================

app.post(

  "/api/live",

  verifierToken,

  verifierEditeur,

  async (req, res) => {

    const client = await pool.connect();

    try {

      const {

        titre,

        stream_url,

        statut,

        description,

      } = req.body;

      if (!titre || !stream_url) {

        return res.status(400).json({

          message:

            "Titre et URL du live obligatoires.",

        });

      }

      if (!isValidStreamUrl(stream_url)) {

        return res.status(400).json({

          message:

            "URL du stream invalide.",

        });

      }

      const finalStatus =

        statut === "live"

          ? "live"

          : "offline";

      await client.query("BEGIN");

      if (finalStatus === "live") {

        await client.query(`

          UPDATE live

          SET statut = 'offline'

          WHERE statut = 'live'

        `);

      }

      const result =

        await client.query(

          `

          INSERT INTO live

          (

            titre,

            description,

            stream_url,

            source_type,

            statut,

            created_at

          )

          VALUES

          ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)

          RETURNING *

          `,

          [

            titre,

            description || null,

            stream_url,

            detectStreamType(

              stream_url

            ),

            finalStatus,

          ]

        );

      await client.query("COMMIT");

      res.status(201).json({

        success: true,

        message: "Live ajouté.",

        live: result.rows[0],

      });

    } catch (error) {

      await client.query("ROLLBACK");

      console.error(

        "Erreur ajout live :",

        error

      );

      res.status(500).json({

        message: "Erreur serveur.",

      });

    } finally {

      client.release();

    }

  }

);

// ======================================================

// MODIFICATION LIVE

// ======================================================

app.put(

  "/api/live/:id",

  verifierToken,

  verifierEditeur,

  async (req, res) => {

    const client = await pool.connect();

    try {

      const id = req.params.id;

      const {

        titre,

        stream_url,

        statut,

        description,

      } = req.body;

      if (!titre || !stream_url) {

        return res.status(400).json({

          message:

            "Titre et URL du live obligatoires.",

        });

      }

      if (!isValidStreamUrl(stream_url)) {

        return res.status(400).json({

          message:

            "URL du stream invalide.",

        });

      }

      const finalStatus =

        statut === "live"

          ? "live"

          : "offline";

      await client.query("BEGIN");

      if (finalStatus === "live") {

        await client.query(

          `

          UPDATE live

          SET statut = 'offline'

          WHERE id_live <> $1

            AND statut = 'live'

          `,

          [id]

        );

      }

      const result =

        await client.query(

          `

          UPDATE live

          SET

            titre = $1,

            description = $2,

            stream_url = $3,

            source_type = $4,

            statut = $5

          WHERE id_live = $6

          RETURNING *

          `,

          [

            titre,

            description || null,

            stream_url,

            detectStreamType(

              stream_url

            ),

            finalStatus,

            id,

          ]

        );

      if (result.rows.length === 0) {

        await client.query("ROLLBACK");

        return res.status(404).json({

          message: "Live introuvable.",

        });

      }

      await client.query("COMMIT");

      res.json({

        success: true,

        message: "Live modifié.",

        live: result.rows[0],

      });

    } catch (error) {

      await client.query("ROLLBACK");

      console.error(

        "Erreur modification live :",

        error

      );

      res.status(500).json({

        message: "Erreur serveur.",

      });

    } finally {

      client.release();

    }

  }

);

// ======================================================

// SUPPRESSION LIVE

// ======================================================

app.delete(

  "/api/live/:id",

  verifierToken,

  verifierEditeur,

  async (req, res) => {

    try {

      const id = req.params.id;

      await pool.query(

        `

        DELETE FROM live_viewers

        WHERE id_live = $1

        `,

        [id]

      );

      const result = await pool.query(

        `

        DELETE FROM live

        WHERE id_live = $1

        RETURNING *

        `,

        [id]

      );

      if (result.rows.length === 0) {

        return res.status(404).json({

          message: "Live introuvable.",

        });

      }

      res.json({

        success: true,

        message: "Live supprimé.",

      });

    } catch (error) {

      console.error(

        "Erreur suppression live :",

        error

      );

      res.status(500).json({

        message: "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// LIVE — VIEWER

// ======================================================

app.post(

  "/api/live/viewer",

  async (req, res) => {

    try {

      const {

        session_id,

        id_live,

      } = req.body;

      if (!session_id || !id_live) {

        return res.status(400).json({

          message:

            "session_id et id_live obligatoires.",

        });

      }

      await pool.query(

        `

        INSERT INTO live_viewers

        (

          session_id,

          last_seen,

          id_live

        )

        VALUES

        ($1, CURRENT_TIMESTAMP, $2)

        ON CONFLICT (session_id)

        DO UPDATE SET

          last_seen = CURRENT_TIMESTAMP,

          id_live = EXCLUDED.id_live

        `,

        [

          session_id,

          id_live,

        ]

      );

      res.json({

        success: true,

      });

    } catch (error) {

      console.error(

        "Erreur viewer live :",

        error

      );

      res.status(500).json({

        message: "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// UTILISATEURS — ADMIN

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

          role

        FROM utilisateur

        ORDER BY id_utilisateur ASC

      `);

      res.json(result.rows);

    } catch (error) {

      console.error(

        "Erreur utilisateurs :",

        error

      );

      res.status(500).json({

        message: "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// AJOUT UTILISATEUR

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

            "Nom, email et mot de passe obligatoires.",

        });

      }

      const finalRole =

        role || ROLES.JOURNALISTE;

      // CORRECTION IMPORTANTE

      if (

        !Object.values(ROLES).includes(

          finalRole

        )

      ) {

        return res.status(400).json({

          message: "Rôle invalide.",

        });

      }

      const existing =

        await pool.query(

          `

          SELECT id_utilisateur

          FROM utilisateur

          WHERE LOWER(email) = LOWER($1)

          `,

          [email.trim()]

        );

      if (existing.rows.length > 0) {

        return res.status(409).json({

          message:

            "Cet email existe déjà.",

        });

      }

      const hashedPassword =

        await bcrypt.hash(

          password,

          10

        );

      const result =

        await pool.query(

          `

          INSERT INTO utilisateur

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

            role

          `,

          [

            nom,

            email.trim(),

            hashedPassword,

            finalRole,

          ]

        );

      res.status(201).json({

        success: true,

        message:

          "Utilisateur ajouté.",

        utilisateur:

          result.rows[0],

      });

    } catch (error) {

      console.error(

        "Erreur ajout utilisateur :",

        error

      );

      res.status(500).json({

        message: "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// SUPPRESSION UTILISATEUR

// ======================================================

app.delete(

  "/api/utilisateurs/:id",

  verifierToken,

  verifierAdmin,

  async (req, res) => {

    try {

      const id = Number(

        req.params.id

      );

      if (

        id ===

        Number(

          req.user.id_utilisateur

        )

      ) {

        return res.status(400).json({

          message:

            "Vous ne pouvez pas supprimer votre propre compte.",

        });

      }

      const result =

        await pool.query(

          `

          DELETE FROM utilisateur

          WHERE id_utilisateur = $1

          RETURNING id_utilisateur

          `,

          [id]

        );

      if (result.rows.length === 0) {

        return res.status(404).json({

          message:

            "Utilisateur introuvable.",

        });

      }

      res.json({

        success: true,

        message:

          "Utilisateur supprimé.",

      });

    } catch (error) {

      console.error(

        "Erreur suppression utilisateur :",

        error

      );

      res.status(500).json({

        message: "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// CONTACTS — ADMIN

// ======================================================

app.get(

  "/api/contacts",

  verifierToken,

  verifierAdmin,

  async (req, res) => {

    try {

      const result =

        await pool.query(`

          SELECT *

          FROM contact

          ORDER BY id_contact DESC

        `);

      res.json(result.rows);

    } catch (error) {

      console.error(

        "Erreur contacts :",

        error

      );

      res.status(500).json({

        message: "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// CONTACT — PUBLIC

// ======================================================

app.post(

  "/api/contacts",

  async (req, res) => {

    try {

      const {

        nom,

        email,

        message,

      } = req.body;

      if (

        !nom ||

        !email ||

        !message

      ) {

        return res.status(400).json({

          message:

            "Nom, email et message obligatoires.",

        });

      }

      const result =

        await pool.query(

          `

          INSERT INTO contact

          (

            nom,

            email,

            message

          )

          VALUES

          ($1, $2, $3)

          RETURNING *

          `,

          [

            nom,

            email,

            message,

          ]

        );

      res.status(201).json({

        success: true,

        message:

          "Message envoyé avec succès.",

        contact:

          result.rows[0],

      });

    } catch (error) {

      console.error(

        "Erreur contact :",

        error

      );

      res.status(500).json({

        message: "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// SUPPRESSION CONTACT

// ======================================================

app.delete(

  "/api/contacts/:id",

  verifierToken,

  verifierAdmin,

  async (req, res) => {

    try {

      const id = req.params.id;

      const result =

        await pool.query(

          `

          DELETE FROM contact

          WHERE id_contact = $1

          RETURNING id_contact

          `,

          [id]

        );

      if (result.rows.length === 0) {

        return res.status(404).json({

          message:

            "Message introuvable.",

        });

      }

      res.json({

        success: true,

        message:

          "Message supprimé.",

      });

    } catch (error) {

      console.error(

        "Erreur suppression contact :",

        error

      );

      res.status(500).json({

        message: "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// NETTOYAGE DES VIEWERS LIVE

// ======================================================

async function nettoyerViewers() {

  try {

    await pool.query(`

      DELETE FROM live_viewers

      WHERE last_seen <

        CURRENT_TIMESTAMP -

        INTERVAL '5 minutes'

    `);

  } catch (error) {

    console.error(

      "Erreur nettoyage viewers :",

      error

    );

  }

}

setInterval(

  nettoyerViewers,

  2 * 60 * 1000

);

// ======================================================

// ÉQUIPE — PUBLIC

// ======================================================

app.get(

  "/api/equipe",

  async (req, res) => {

    try {

      const result =

        await pool.query(`

          SELECT

            id_equipe,

            nom,

            fonction,

            bio,

            image_url,

            afficher

          FROM equipe

          WHERE afficher = true

          ORDER BY id_equipe ASC

        `);

      res.json(result.rows);

    } catch (error) {

      console.error(

        "Erreur équipe public :",

        error

      );

      res.status(500).json({

        message: "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// ÉQUIPE — ADMIN

// ======================================================

app.get(

  "/api/equipe/admin",

  verifierToken,

  verifierAdmin,

  async (req, res) => {

    try {

      const result =

        await pool.query(`

          SELECT *

          FROM equipe

          ORDER BY id_equipe ASC

        `);

      res.json(result.rows);

    } catch (error) {

      console.error(

        "Erreur équipe admin :",

        error

      );

      res.status(500).json({

        message: "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// AJOUT ÉQUIPE

// ======================================================

app.post(

  "/api/equipe",

  verifierToken,

  verifierAdmin,

  upload.single("image"),

  async (req, res) => {

    try {

      const {

        nom,

        fonction,

        bio,

        afficher,

      } = req.body;

      if (!nom || !fonction) {

        if (req.file) {

          supprimerImage(

            `/uploads/${req.file.filename}`

          );

        }

        return res.status(400).json({

          message:

            "Nom et fonction obligatoires.",

        });

      }

      const imageUrl = req.file

        ? `/uploads/${req.file.filename}`

        : null;

      const result =

        await pool.query(

          `

          INSERT INTO equipe

          (

            nom,

            fonction,

            bio,

            image_url,

            afficher

          )

          VALUES

          ($1, $2, $3, $4, $5)

          RETURNING *

          `,

          [

            nom,

            fonction,

            bio || null,

            imageUrl,

            afficher !== "false",

          ]

        );

      res.status(201).json({

        success: true,

        message:

          "Membre ajouté.",

        equipe:

          result.rows[0],

      });

    } catch (error) {

      console.error(

        "Erreur ajout équipe :",

        error

      );

      if (req.file) {

        supprimerImage(

          `/uploads/${req.file.filename}`

        );

      }

      res.status(500).json({

        message: "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// MODIFICATION ÉQUIPE

// ======================================================

app.put(

  "/api/equipe/:id",

  verifierToken,

  verifierAdmin,

  upload.single("image"),

  async (req, res) => {

    try {

      const id = req.params.id;

      const {

        nom,

        fonction,

        bio,

        afficher,

      } = req.body;

      const oldResult =

        await pool.query(

          `

          SELECT image_url

          FROM equipe

          WHERE id_equipe = $1

          `,

          [id]

        );

      if (oldResult.rows.length === 0) {

        if (req.file) {

          supprimerImage(

            `/uploads/${req.file.filename}`

          );

        }

        return res.status(404).json({

          message:

            "Membre introuvable.",

        });

      }

      const oldImage =

        oldResult.rows[0].image_url;

      let imageUrl = oldImage;

      if (req.file) {

        imageUrl =

          `/uploads/${req.file.filename}`;

      }

      const result =

        await pool.query(

          `

          UPDATE equipe

          SET

            nom = COALESCE($1, nom),

            fonction = COALESCE($2, fonction),

            bio = COALESCE($3, bio),

            image_url = $4,

            afficher = COALESCE($5, afficher)

          WHERE id_equipe = $6

          RETURNING *

          `,

          [

            nom,

            fonction,

            bio,

            imageUrl,

            afficher === undefined

              ? undefined

              : afficher !== "false",

            id,

          ]

        );

      if (req.file && oldImage) {

        supprimerImage(oldImage);

      }

      res.json({

        success: true,

        message:

          "Membre modifié.",

        equipe:

          result.rows[0],

      });

    } catch (error) {

      console.error(

        "Erreur modification équipe :",

        error

      );

      if (req.file) {

        supprimerImage(

          `/uploads/${req.file.filename}`

        );

      }

      res.status(500).json({

        message: "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// SUPPRESSION ÉQUIPE

// ======================================================

app.delete(

  "/api/equipe/:id",

  verifierToken,

  verifierAdmin,

  async (req, res) => {

    try {

      const id = req.params.id;

      const result =

        await pool.query(

          `

          DELETE FROM equipe

          WHERE id_equipe = $1

          RETURNING image_url

          `,

          [id]

        );

      if (result.rows.length === 0) {

        return res.status(404).json({

          message:

            "Membre introuvable.",

        });

      }

      supprimerImage(

        result.rows[0].image_url

      );

      res.json({

        success: true,

        message:

          "Membre supprimé.",

      });

    } catch (error) {

      console.error(

        "Erreur suppression équipe :",

        error

      );

      res.status(500).json({

        message: "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// ERREUR MULTER / ERREUR GLOBALE

// ======================================================

app.use(

  (error, req, res, next) => {

    console.error(

      "Erreur globale :",

      error

    );

    if (

      error instanceof multer.MulterError

    ) {

      if (

        error.code ===

        "LIMIT_FILE_SIZE"

      ) {

        return res.status(400).json({

          message:

            "Fichier trop volumineux.",

        });

      }

      if (

        error.code ===

        "LIMIT_FILE_COUNT"

      ) {

        return res.status(400).json({

          message:

            "Trop de fichiers envoyés.",

        });

      }

      return res.status(400).json({

        message:

          error.message ||

          "Erreur upload.",

      });

    }

    if (error) {

      return res.status(400).json({

        message:

          error.message ||

          "Erreur serveur.",

      });

    }

    next();

  }

);

// ======================================================

// ROUTE 404 API

// ======================================================

app.use(

  (req, res) => {

    res.status(404).json({

      success: false,

      message:

        "Route API introuvable.",

      path: req.originalUrl,

    });

  }

);

// ======================================================

// DÉMARRAGE SERVEUR

// ======================================================

async function startServer() {

  try {

    await pool.query("SELECT 1");

    console.log(

      "✅ Connexion PostgreSQL réussie."

    );

    // Vérification FFmpeg

    if (fs.existsSync(ffmpegPath)) {

      console.log(

        `✅ FFmpeg trouvé : ${ffmpegPath}`

      );

    } else {

      console.warn(

        `⚠️ FFmpeg introuvable : ${ffmpegPath}`

      );

    }

    if (!process.env.JWT_SECRET) {

      console.warn(

        "⚠️ JWT_SECRET n'est pas défini."

      );

    }

    app.listen(

      PORT,

      "0.0.0.0",

      () => {

        console.log("");

        console.log(

          "========================================"

        );

        console.log(

          "🎙️ MIKWO PÈP LA TV"

        );

        console.log(

          "========================================"

        );

        console.log(

          `🚀 Serveur démarré sur le port ${PORT}`

        );

        console.log(

          `📡 API : /api`

        );

        console.log(

          `📺 Live : /api/live`

        );

        console.log(

          "========================================"

        );

        console.log("");

      }

    );

  } catch (error) {

    console.error(

      "❌ Impossible de démarrer le serveur :",

      error

    );

    process.exit(1);

  }

}

startServer();
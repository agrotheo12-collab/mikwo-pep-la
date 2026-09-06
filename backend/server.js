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

const { randomUUID } = require("crypto");

const { v2: cloudinary } = require("cloudinary");

const app = express();

// ======================================================

// CLOUDINARY

// ======================================================

cloudinary.config({

  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,

  api_key: process.env.CLOUDINARY_API_KEY,

  api_secret: process.env.CLOUDINARY_API_SECRET,

});

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

    credentials: true,

  })

);

// ======================================================

// BODY PARSER

// ======================================================

app.use(express.json({ limit: "2mb" }));

app.use(express.urlencoded({ extended: true }));

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

      database:

        process.env.DB_NAME || "Mikwo_Pep_La",

      password:

        process.env.DB_PASSWORD || "",

      port:

        Number(process.env.DB_PORT) || 5433,

      max: 20,

      idleTimeoutMillis: 30000,

      connectionTimeoutMillis: 10000,

    });

// ======================================================

// DOSSIERS UPLOADS

// ======================================================

const uploadsPath =

  path.join(__dirname, "uploads");

const videosPath =

  path.join(uploadsPath, "videos");

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

// ======================================================

// FICHIERS STATIQUES

// ======================================================

app.use(

  "/uploads",

  express.static(uploadsPath, {

    maxAge: "1d",

  })

);

// ======================================================

// CLOUDINARY — IMAGE

// ======================================================

async function uploadImageToCloudinary(

  filePath,

  folder

) {

  if (!filePath) {

    throw new Error(

      "Chemin du fichier image manquant."

    );

  }

  if (!fs.existsSync(filePath)) {

    throw new Error(

      `Fichier image introuvable : ${filePath}`

    );

  }

  console.log(

    "☁️ Upload image vers Cloudinary..."

  );

  const result =

    await cloudinary.uploader.upload(

      filePath,

      {

        folder,

        resource_type: "image",

      }

    );

  if (

    !result ||

    !result.secure_url

  ) {

    throw new Error(

      "Cloudinary n'a pas retourné l'URL de l'image."

    );

  }

  console.log(

    "✅ Upload image Cloudinary terminé."

  );

  return {

    url: result.secure_url,

    public_id: result.public_id,

    resource_type:

      result.resource_type || "image",

  };

}

// ======================================================
// ☁️ CLOUDINARY — UPLOAD VIDÉO JUSQU'À 500 MB
// ======================================================


function getCloudinaryPublicIdFromUrl(

  url

) {

  if (

    !url ||

    !url.includes(

      "res.cloudinary.com"

    )

  ) {

    return null;

  }

  try {

    const parsedUrl =

      new URL(url);

    const parts =

      parsedUrl.pathname

        .split("/")

        .filter(Boolean);

    const uploadIndex =

      parts.findIndex(

        (part) =>

          part === "upload"

      );

    if (uploadIndex === -1) {

      return null;

    }

    let publicPath =

      parts.slice(

        uploadIndex + 1

      );

    if (

      publicPath[0] &&

      /^v\d+$/.test(

        publicPath[0]

      )

    ) {

      publicPath.shift();

    }

    if (!publicPath.length) {

      return null;

    }

    const lastPart =

      publicPath.pop();

    const filenameWithoutExtension =

      lastPart.replace(

        /\.[^.]+$/,

        ""

      );

    publicPath.push(

      filenameWithoutExtension

    );

    return publicPath.join("/");

  } catch (error) {

    console.error(

      "❌ Erreur récupération public_id Cloudinary :",

      error

    );

    return null;

  }

}

// ======================================================

// CLOUDINARY — SUPPRIMER IMAGE

// ======================================================

async function deleteImageFromCloudinary(

  url

) {

  const publicId =

    getCloudinaryPublicIdFromUrl(

      url

    );

  if (!publicId) return;

  try {

    await cloudinary.uploader.destroy(

      publicId,

      {

        resource_type: "image",

      }

    );

    console.log(

      "☁️ Image supprimée de Cloudinary :",

      publicId

    );

  } catch (error) {

    console.error(

      "❌ Erreur suppression image Cloudinary :",

      error.message

    );

  }

}

// ======================================================

// CLOUDINARY — SUPPRIMER VIDÉO

// ======================================================

async function deleteVideoFromCloudinary(

  url

) {

  const publicId =

    getCloudinaryPublicIdFromUrl(

      url

    );

  if (!publicId) return;

  try {

    await cloudinary.uploader.destroy(

      publicId,

      {

        resource_type: "video",

      }

    );

    console.log(

      "☁️ Vidéo supprimée de Cloudinary :",

      publicId

    );

  } catch (error) {

    console.error(

      "❌ Erreur suppression vidéo Cloudinary :",

      error.message

    );

  }

}

// ======================================================

// MULTER — IMAGES

// ======================================================

const imageStorage =

  multer.diskStorage({

    destination: function (

      req,

      file,

      cb

    ) {

      cb(null, uploadsPath);

    },

    filename: function (

      req,

      file,

      cb

    ) {

      const extension =

        path.extname(

          file.originalname

        ) || ".jpg";

      const filename =

        Date.now() +

        "-" +

        Math.round(

          Math.random() * 1e9

        ) +

        extension.toLowerCase();

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

  fileFilter: function (

    req,

    file,

    cb

  ) {

    if (

      allowedImageTypes.includes(

        file.mimetype

      )

    ) {

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

    fileSize:

      5 * 1024 * 1024,

    files: 20,

  },

});

// ======================================================
// CLOUDINARY — UPLOAD VIDÉO LARGE PAR CHUNKS
// ======================================================

function uploadVideoToCloudinary(filePath, folder) {
  return new Promise((resolve, reject) => {
    if (!filePath) {
      return reject(
        new Error("Chemin du fichier vidéo manquant.")
      );
    }

    if (!fs.existsSync(filePath)) {
      return reject(
        new Error(`Fichier vidéo introuvable : ${filePath}`)
      );
    }

    const stats = fs.statSync(filePath);

    console.log("☁️ Upload vidéo vers Cloudinary...");
    console.log("📁 Fichier :", filePath);
    console.log(
      "📦 Taille :",
      (stats.size / 1024 / 1024).toFixed(2),
      "MB"
    );
    console.log("🧩 Upload par chunks de 20 MB...");

    const uploadStream =
      cloudinary.uploader.upload_large(
        filePath,
        {
          folder,
          resource_type: "video",
          use_filename: true,
          unique_filename: true,
          overwrite: false,
          chunk_size: 20 * 1024 * 1024,
        },
        (error, result) => {
          if (error) {
            console.error(
              "❌ Erreur upload vidéo Cloudinary :",
              error
            );

            return reject(error);
          }

          if (!result || !result.secure_url) {
            return reject(
              new Error(
                "Cloudinary n'a pas retourné l'URL de la vidéo."
              )
            );
          }

          console.log(
            "✅ Vidéo complètement uploadée sur Cloudinary."
          );

          console.log(
            "☁️ URL :",
            result.secure_url
          );

          resolve({
            url: result.secure_url,
            public_id: result.public_id,
            resource_type:
              result.resource_type || "video",
          });
        }
      );

    uploadStream.on("error", (error) => {
      console.error(
        "❌ Erreur du stream Cloudinary :",
        error
      );

      reject(error);
    });
  });
}

// ======================================================

// FONCTIONS FICHIERS

// ======================================================

function supprimerFichier(

  filePath

) {

  try {

    if (!filePath) return;

    if (fs.existsSync(filePath)) {

      fs.unlinkSync(filePath);

    }

  } catch (error) {

    console.error(

      "Erreur suppression fichier :",

      error

    );

  }

}

// IMPORTANT : utilisé par les routes Cloudinary

function supprimerFichierTemporaire(

  filePath

) {

  try {

    if (!filePath) return;

    if (fs.existsSync(filePath)) {

      fs.unlinkSync(filePath);

    }

  } catch (error) {

    console.error(

      "Erreur suppression fichier temporaire :",

      error

    );

  }

}

function supprimerImage(

  imageUrl

) {

  try {

    if (!imageUrl) return;

    const filename =

      path.basename(imageUrl);

    if (!filename) return;

    const imagePath =

      path.join(

        uploadsPath,

        filename

      );

    supprimerFichier(imagePath);

  } catch (error) {

    console.error(

      "Erreur suppression image :",

      error

    );

  }

}

function supprimerVideo(

  videoUrl

) {

  try {

    if (!videoUrl) return;

    const filename =

      path.basename(videoUrl);

    if (!filename) return;

    const videoPath =

      path.join(

        videosPath,

        filename

      );

    supprimerFichier(videoPath);

  } catch (error) {

    console.error(

      "Erreur suppression vidéo :",

      error

    );

  }

}

// ======================================================

// FFmpeg — THUMBNAIL VIDÉO

// ======================================================

function generateVideoThumbnail(

  videoPath,

  thumbnailPath,

  time = "00:00:01"

) {

  return new Promise(

    (resolve, reject) => {

      try {

        if (

          !fs.existsSync(videoPath)

        ) {

          return reject(

            new Error(

              "Fichier vidéo introuvable."

            )

          );

        }

        if (

          !fs.existsSync(

            ffmpegPath

          )

        ) {

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

        const ffmpeg =

          spawn(

            ffmpegPath,

            args

          );

        let stderr = "";

        ffmpeg.stderr.on(

          "data",

          (data) => {

            stderr +=

              data.toString();

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

              fs.existsSync(

                thumbnailPath

              )

            ) {

              resolve(

                thumbnailPath

              );

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

    }

  );

}

// ======================================================

// API

// ======================================================

app.get(

  "/api",

  (req, res) => {

    res.json({

      success: true,

      message:

        "API Mikwo Pèp La TV fonctionne.",
});

  }

);

app.get(

  "/api/test-db",

  async (req, res) => {

    try {

      const result =

        await pool.query(

          "SELECT NOW()"

        );

      res.json({

        success: true,

        message:

          "Connexion PostgreSQL réussie.",

        time:

          result.rows[0].now,

      });

    } catch (error) {

      console.error(

        "Erreur PostgreSQL :",

        error

      );

      res.status(500).json({

        success: false,

        message:

          "Erreur de connexion PostgreSQL.",

      });

    }

  }

);

// ======================================================

// LOGIN

// ======================================================

app.post(

  "/api/login",

  async (req, res) => {

    try {

      const {

        email,

        password,

      } = req.body;

      if (

        !email ||

        !password

      ) {

        return res

          .status(400)

          .json({

            message:

              "Email et mot de passe obligatoires.",

          });

      }

      const result =

        await pool.query(

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

      if (

        result.rows.length === 0

      ) {

        return res

          .status(401)

          .json({

            message:

              "Email ou mot de passe incorrect.",

          });

      }

      const utilisateur =

        result.rows[0];

      const passwordCorrect =

        await bcrypt.compare(

          password,

          utilisateur.password

        );

      if (!passwordCorrect) {

        return res

          .status(401)

          .json({

            message:

              "Email ou mot de passe incorrect.",

          });

      }

      if (

        !process.env.JWT_SECRET

      ) {

        return res

          .status(500)

          .json({

            message:

              "Configuration serveur incomplète.",

          });

      }

      const token =

        jwt.sign(

          {

            id_utilisateur:

              utilisateur.id_utilisateur,

            email:

              utilisateur.email,

            role:

              utilisateur.role,

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

            utilisateur.id_utilisateur,

          nom:

            utilisateur.nom,

          email:

            utilisateur.email,

          role:

            utilisateur.role,

        },

      });

    } catch (error) {

      console.error(

        "Erreur login :",

        error

      );

      res.status(500).json({

        message:

          "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// AUTH MIDDLEWARE

// ======================================================

function verifierToken(

  req,

  res,

  next

) {

  try {

    const authorization =

      req.headers.authorization;

    if (!authorization) {

      return res

        .status(401)

        .json({

          message:

            "Token manquant.",

        });

    }

    const parts =

      authorization.split(

        " "

      );

    if (

      parts.length !== 2 ||

      parts[0] !== "Bearer"

    ) {

      return res

        .status(401)

        .json({

          message:

            "Format du token invalide.",

        });

    }

    if (

      !process.env.JWT_SECRET

    ) {

      return res

        .status(500)

        .json({

          message:

            "JWT_SECRET non configuré.",

        });

    }

    const decoded =

      jwt.verify(

        parts[1],

        process.env.JWT_SECRET

      );

    req.user = decoded;

    next();

  } catch (error) {

    console.error(

      "Erreur token :",

      error.message

    );

    return res

      .status(401)

      .json({

        message:

          "Token invalide ou expiré.",

      });

  }

}

// ======================================================

// RÔLES

// ======================================================

const ROLES = {

  ADMIN: "admin",

  EDITEUR: "editor",

  JOURNALISTE:

    "journaliste",

};

function verifierRole(

  ...rolesAutorises

) {

  return (

    req,

    res,

    next

  ) => {

    if (!req.user) {

      return res

        .status(401)

        .json({

          message:

            "Authentification requise.",

        });

    }

    if (

      !rolesAutorises.includes(

        req.user.role

      )

    ) {

      return res

        .status(403)

        .json({

          message:

            "Accès refusé.",

        });

    }

    next();

  };

}

const verifierAdmin =

  verifierRole(

    ROLES.ADMIN

  );

const verifierEditeur =

  verifierRole(

    ROLES.ADMIN,

    ROLES.EDITEUR

  );

const verifierAdminEditeur =

  verifierEditeur;

const verifierRedacteur =

  verifierRole(

    ROLES.ADMIN,

    ROLES.EDITEUR,

    ROLES.JOURNALISTE

  );

const verifierEquipeEditoriale =

  verifierRedacteur;

// ======================================================

// PROPRIÉTAIRE

// ======================================================

async function verifierProprietaire(

  table,

  idColumn,

  id,

  user,

  res

) {

  if (

    user.role ===

      ROLES.ADMIN ||

    user.role ===

      ROLES.EDITEUR

  ) {

    return true;

  }

  const tablesAutorisees =

    [

      "article",

      "photo",

      "video",

    ];

  if (

    !tablesAutorisees.includes(

      table

    )

  ) {

    res.status(400).json({

      message:

        "Table non autorisée.",

    });

    return false;

  }

  const result =

    await pool.query(

      `

      SELECT id_utilisateur

      FROM ${table}

      WHERE ${idColumn} = $1

      `,

      [id]

    );

  if (

    result.rows.length === 0

  ) {

    res.status(404).json({

      message:

        "Élément introuvable.",

    });

    return false;

  }

  if (

    Number(

      result.rows[0]

        .id_utilisateur

    ) !==

    Number(

      user.id_utilisateur

    )

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

app.get(

  "/api/articles",

  async (req, res) => {

    try {

      const result =

        await pool.query(`

          SELECT

            a.id_article,

            a.titre,

            a.slug,

            a.contenu,

            a.image AS image_url,

            a.statut,

            a.created_at,

            a.updated_at,

            a.id_utilisateur,

            u.nom AS auteur

          FROM article a

          LEFT JOIN utilisateur u

            ON a.id_utilisateur =

               u.id_utilisateur

          WHERE a.statut = 'publie'

          ORDER BY a.created_at DESC

        `);

      res.json(

        result.rows

      );

    } catch (error) {

      console.error(

        "Erreur récupération articles :",

        error

      );

      res.status(500).json({

        message:

          "Erreur serveur lors de la récupération des articles.",

      });

    }

  }

);

// ======================================================
// ARTICLES — ADMIN
// ======================================================

app.get(
  "/api/articles/admin",
  verifierToken,
  verifierEditeur,
  async (req, res) => {
    try {
      const result =
        await pool.query(`
          SELECT
            a.id_article,
            a.titre,
            a.slug,
            a.contenu,
            a.image AS image_url,
            a.statut,
            a.created_at,
            a.updated_at,
            a.id_utilisateur,
            u.nom AS auteur
          FROM article a
          LEFT JOIN utilisateur u
            ON a.id_utilisateur =
               u.id_utilisateur
          ORDER BY a.created_at DESC
        `);

      res.json(
        result.rows
      );

    } catch (error) {

      console.error(
        "Erreur articles admin :",
        error
      );

      res.status(500).json({
        message:
          "Erreur serveur.",
      });

    }
  }
);

// ======================================================

// ARTICLES — CREATE

// ======================================================

app.post(

  "/api/articles",

  verifierToken,

  verifierEditeur,

  upload.single("image"),

  async (req, res) => {

    let localImagePath =

      null;

    let cloudinaryImage =

      null;

    try {

      const {

        titre,

        slug,

        contenu,

        statut = "brouillon",

      } = req.body;

      if (

        !titre ||

        !titre.trim()

      ) {

        return res

          .status(400)

          .json({

            message:

              "Le titre est obligatoire.",

          });

      }

      if (

        !slug ||

        !slug.trim()

      ) {

        return res

          .status(400)

          .json({

            message:

              "Le slug est obligatoire.",

          });

      }

      if (

        !contenu ||

        !contenu.trim()

      ) {

        return res

          .status(400)

          .json({

            message:

              "Le contenu est obligatoire.",

          });

      }

      if (!req.file) {

        return res

          .status(400)

          .json({

            message:

              "L'image de l'article est obligatoire.",

          });

      }

      localImagePath =

        req.file.path;

      cloudinaryImage =

        await uploadImageToCloudinary(

          localImagePath,

          "mikwo-pep-la/articles"

        );

      const result =

        await pool.query(

          `

          INSERT INTO article (

            titre,

            slug,

            contenu,

            image,

            statut,

            id_utilisateur

          )

          VALUES (

            $1,$2,$3,$4,$5,$6

          )

          RETURNING

            id_article,

            titre,

            slug,

            contenu,

            image AS image_url,

            statut,

            created_at,

            updated_at,

            id_utilisateur

          `,

          [

            titre.trim(),

            slug.trim(),

            contenu.trim(),

            cloudinaryImage.url,

            statut,

            req.user

              .id_utilisateur,

          ]

        );

      supprimerFichierTemporaire(

        localImagePath

      );

      localImagePath = null;

      res.status(201).json({

        success: true,

        message:

          "Article créé avec succès.",

        article:

          result.rows[0],

      });

    } catch (error) {

      console.error(

        "Erreur création article :",

        error

      );

      if (

        localImagePath

      ) {

        supprimerFichierTemporaire(

          localImagePath

        );

      }

      if (

        cloudinaryImage &&

        cloudinaryImage.public_id

      ) {

        await cloudinary.uploader.destroy(

          cloudinaryImage.public_id,

          {

            resource_type:

              "image",

          }

        ).catch(() => {});

      }

      res.status(500).json({

        success: false,

        message:

          error.message ||

          "Erreur serveur lors de la création de l'article.",

      });

    }

  }

);

// ======================================================

// ARTICLES — UPDATE

// ======================================================

app.put(

  "/api/articles/:id",

  verifierToken,

  verifierEditeur,

  upload.single("image"),

  async (req, res) => {

    let localImagePath =

      null;

    let newCloudinaryImage =

      null;

    try {

      const { id } =

        req.params;

      const {

        titre,

        slug,

        contenu,

        statut,

      } = req.body;

      const existing =

        await pool.query(

          `

          SELECT

            id_article,

            image,

            id_utilisateur

          FROM article

          WHERE id_article = $1

          `,

          [id]

        );

      if (

        existing.rows.length ===

        0

      ) {

        return res

          .status(404)

          .json({

            message:

              "Article introuvable.",

          });

      }

      const oldImage =

        existing.rows[0]

          .image;

      if (

        !(await verifierProprietaire(

          "article",

          "id_article",

          id,

          req.user,

          res

        ))

      ) {

        return;

      }

      let imageUrl =

        oldImage;

      if (req.file) {

        localImagePath =

          req.file.path;

        newCloudinaryImage =

          await uploadImageToCloudinary(

            localImagePath,

            "mikwo-pep-la/articles"

          );

        imageUrl =

          newCloudinaryImage.url;

      }

      const nouveauTitre =

        titre !== undefined &&

        titre.trim() !== ""

          ? titre.trim()

          : null;

      const nouveauSlug =

        slug !== undefined &&

        slug.trim() !== ""

          ? slug.trim()

          : null;

      const nouveauContenu =

        contenu !== undefined &&

        contenu.trim() !== ""

          ? contenu.trim()

          : null;

      const nouveauStatut =

        statut !== undefined &&

        statut !== ""

          ? statut

          : null;

      const result =

        await pool.query(

          `

          UPDATE article

          SET

            titre =

              COALESCE($1,titre),

            slug =

              COALESCE($2,slug),

            contenu =

              COALESCE($3,contenu),

            image = $4,

            statut =

              COALESCE($5,statut),

            updated_at = NOW()

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

            id_utilisateur

          `,

          [

            nouveauTitre,

            nouveauSlug,

            nouveauContenu,

            imageUrl,

            nouveauStatut,

            id,

          ]

        );

      if (

        localImagePath

      ) {

        supprimerFichierTemporaire(

          localImagePath

        );

        localImagePath = null;

      }

      if (

        req.file &&

        oldImage &&

        oldImage !== imageUrl

      ) {

        await deleteImageFromCloudinary(

          oldImage

        );

      }

      res.json({

        success: true,

        message:

          "Article modifié avec succès.",

        article:

          result.rows[0],

      });

    } catch (error) {

      console.error(

        "Erreur modification article :",

        error

      );

      if (

        localImagePath

      ) {

        supprimerFichierTemporaire(

          localImagePath

        );

      }

      if (

        newCloudinaryImage &&

        newCloudinaryImage.public_id

      ) {

        await cloudinary.uploader.destroy(

          newCloudinaryImage.public_id,

          {

            resource_type:

              "image",

          }

        ).catch(() => {});

      }

      res.status(500).json({

        success: false,

        message:

          error.message ||

          "Erreur serveur lors de la modification de l'article.",

      });

    }

  }

);

// ======================================================

// ARTICLES — DELETE

// ======================================================

app.delete(

  "/api/articles/:id",

  verifierToken,

  verifierEditeur,

  async (req, res) => {

    try {

      const { id } =

        req.params;

      const existing =

        await pool.query(

          `

          SELECT

            id_article,

            image

          FROM article

          WHERE id_article = $1

          `,

          [id]

        );

      if (

        existing.rows.length ===

        0

      ) {

        return res

          .status(404)

          .json({

            message:

              "Article introuvable.",

          });

      }

      if (

        !(await verifierProprietaire(

          "article",

          "id_article",

          id,

          req.user,

          res

        ))

      ) {

        return;

      }

      const imageUrl =

        existing.rows[0]

          .image;

      await pool.query(

        `

        DELETE FROM article

        WHERE id_article = $1

        `,

        [id]

      );

      if (imageUrl) {

        await deleteImageFromCloudinary(

          imageUrl

        );

      }

      res.json({

        success: true,

        message:

          "Article supprimé avec succès.",

      });

    } catch (error) {

      console.error(

        "Erreur suppression article :",

        error

      );

      res.status(500).json({

        success: false,

        message:

          error.message ||

          "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// PHOTOS — PUBLIC

// ======================================================

app.get(

  "/api/photos",

  async (req, res) => {

    try {

      const result =

        await pool.query(`

          SELECT

            p.id_photo,

            p.titre,

            p.description,

            p.image_url,

            p.statut,

            p.created_at,

            p.id_utilisateur

          FROM photo p

          WHERE p.statut = 'publie'

          ORDER BY

            p.created_at DESC,

            p.id_photo DESC

        `);

      res.json(

        result.rows

      );

    } catch (error) {

      console.error(

        "Erreur GET photos :",

        error

      );

      res.status(500).json({

        success: false,

        message:

          "Erreur lors du chargement des photos.",

      });

    }

  }

);

// ======================================================
// PHOTOS — ADMIN
// ======================================================

app.get(
  "/api/photos/admin",
  verifierToken,
  verifierEditeur,
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          p.id_photo,
          p.titre,
          p.description,
          p.image_url,
          p.statut,
          p.created_at,
          p.id_utilisateur
        FROM photo p
        ORDER BY
          p.created_at DESC,
          p.id_photo DESC
      `);

      res.json(result.rows);

    } catch (error) {
      console.error(
        "Erreur GET photos admin :",
        error
      );

      res.status(500).json({
        success: false,
        message: "Erreur lors du chargement des photos.",
      });
    }
  }
);

// ======================================================

// PHOTOS — CREATE

// ======================================================

app.post(

  "/api/photos",

  verifierToken,

  verifierEditeur,

  upload.array(

    "photos",

    20

  ),

  async (req, res) => {

    const temporaryFiles =

      [];

    const uploadedCloudinaryFiles =

      [];

    try {

      if (

        !req.files ||

        req.files.length === 0

      ) {

        return res

          .status(400)

          .json({

            success: false,

            message:

              "Aucune photo sélectionnée.",

          });

      }

      temporaryFiles.push(

        ...req.files.map(

          (file) =>

            file.path

        )

      );

      const titre =

        req.body.titre

          ? req.body.titre.trim()

          : "";

      const description =

        req.body.description

          ? req.body.description.trim()

          : "";

      const statut =

        req.body.statut ||

        "brouillon";

      const publicationDemandee =

        req.body.id_publication

          ? req.body.id_publication.trim()

          : null;

      if (!titre) {

        return res

          .status(400)

          .json({

            success: false,

            message:

              "Le titre est obligatoire.",

          });

      }

      const statutsAutorises =

        [

          "brouillon",

          "publie",

          "archive",

        ];

      if (

        !statutsAutorises.includes(

          statut

        )

      ) {

        return res

          .status(400)

          .json({

            success: false,

            message:

              "Statut de publication invalide.",

          });

      }

      let idPublication;

      if (

        publicationDemandee

      ) {

        const publication =

          await pool.query(

            `

            SELECT

              id_publication

            FROM photo

            WHERE

              id_publication = $1

            LIMIT 1

            `,

            [publicationDemandee]

          );

        if (

          publication.rows

            .length === 0

        ) {

          return res

            .status(404)

            .json({

              success: false,

              message:

                "Publication photo introuvable.",

            });

        }

        idPublication =

          publicationDemandee;

      } else {

        idPublication =

          randomUUID();

      }

      const cloudinaryFiles =

        [];

      for (

        const file of req.files

      ) {

        const uploaded =

          await uploadImageToCloudinary(

            file.path,

            "mikwo-pep-la/photos"

          );

        cloudinaryFiles.push(

          uploaded

        );

        uploadedCloudinaryFiles.push(

          uploaded

        );

      }

      const client =

        await pool.connect();

      try {

        await client.query(

          "BEGIN"

        );

        const photosInseres =

          [];

        for (

          const file

            of cloudinaryFiles

        ) {

          const result =

            await client.query(

              `

              INSERT INTO photo (

                titre,

                description,

                image_url,

                statut,

                id_utilisateur,

                id_publication

              )

              VALUES (

                $1,$2,$3,$4,$5,$6

              )

              RETURNING

                id_photo,

                id_publication,

                titre,

                description,

                image_url,

                statut,

                created_at,

                id_utilisateur

              `,

              [

                titre,

                description,

                file.url,

                statut,

                req.user

                  .id_utilisateur,

                idPublication,

              ]

            );

          photosInseres.push(

            result.rows[0]

          );

        }

        await client.query(

          "COMMIT"

        );

        for (

          const filePath

            of temporaryFiles

        ) {

          supprimerFichierTemporaire(

            filePath

          );

        }

        res.status(201).json({

          success: true,

          message:

            publicationDemandee

              ? "Photos ajoutées à la publication avec succès."

              : "Publication photo créée avec succès.",

          id_publication:

            idPublication,

          nombre_photos:

            photosInseres.length,

          photos:

            photosInseres,

        });

      } catch (dbError) {

        await client.query(

          "ROLLBACK"

        );

        throw dbError;

      } finally {

        client.release();

      }

    } catch (error) {

      console.error(

        "Erreur POST photos :",

        error

      );

      for (

        const filePath

          of temporaryFiles

      ) {

        supprimerFichierTemporaire(

          filePath

        );

      }

      for (

        const uploaded

          of uploadedCloudinaryFiles

      ) {

        if (

          uploaded.public_id

        ) {

          await cloudinary.uploader.destroy(

            uploaded.public_id,

            {

              resource_type:

                "image",

            }

          ).catch(() => {});

        }

      }

      res.status(500).json({

        success: false,

        message:

          error.message ||

          "Erreur lors de l'ajout des photos.",

      });

    }

  }

);

// ======================================================

// PHOTOS — UPDATE

// ======================================================

app.put(

  "/api/photos/:id_photo",

  verifierToken,

  verifierEditeur,

  async (req, res) => {

    try {

      const idPhoto =

        Number(

          req.params.id_photo

        );

      if (

        !Number.isInteger(

          idPhoto

        )

      ) {

        return res

          .status(400)

          .json({

            success: false,

            message:

              "ID photo invalide.",

          });

      }

      const photoResult =

        await pool.query(

          `

          SELECT

            id_photo,

            id_publication,

            image_url,

            id_utilisateur

          FROM photo

          WHERE id_photo = $1

          `,

          [idPhoto]

        );

      if (

        photoResult.rows

          .length === 0

      ) {

        return res

          .status(404)

          .json({

            success: false,

            message:

              "Photo introuvable.",

          });

      }

      const photo =

        photoResult.rows[0];

      const titre =

        typeof req.body.titre ===

        "string"

          ? req.body.titre.trim()

          : "";

      const description =

        typeof req.body.description ===

        "string"

          ? req.body.description.trim()

          : "";

      const statut =

        typeof req.body.statut ===

        "string"

          ? req.body.statut

          : "brouillon";

      if (!titre) {

        return res

          .status(400)

          .json({

            success: false,

            message:

              "Le titre est obligatoire.",

          });

      }

      const statutsAutorises =

        [

          "brouillon",

          "publie",

          "archive",

        ];

      if (

        !statutsAutorises.includes(

          statut

        )

      ) {

        return res

          .status(400)

          .json({

            success: false,

            message:

              "Statut invalide.",

          });

      }

      if (

        !(await verifierProprietaire(

          "photo",

          "id_photo",

          idPhoto,

          req.user,

          res

        ))

      ) {

        return;

      }

      let result;

      if (

        photo.id_publication

      ) {

        result =

          await pool.query(

            `

            UPDATE photo

            SET

              titre = $1,

              description = $2,

              statut = $3

            WHERE

              id_publication = $4

            RETURNING

              id_photo,

              id_publication,

              titre,

              description,

              image_url,

              statut,

              created_at,

              id_utilisateur

            `,

            [

              titre,

              description,

              statut,

              photo.id_publication,

            ]

          );

      } else {

        result =

          await pool.query(

            `

            UPDATE photo

            SET

              titre = $1,

              description = $2,

              statut = $3

            WHERE id_photo = $4

            RETURNING

              id_photo,

              id_publication,

              titre,

              description,

              image_url,

              statut,

              created_at,

              id_utilisateur

            `,

            [

              titre,

              description,

              statut,

              idPhoto,

            ]

          );

      }

      res.json({

        success: true,

        message:

          "Photo modifiée avec succès.",

        photo:

          result.rows[0],

      });

    } catch (error) {

      console.error(

        "Erreur PUT photo :",

        error

      );

      res.status(500).json({

        success: false,

        message:

          error.message ||

          "Erreur lors de la modification de la photo.",

      });

    }

  }

);

// ======================================================

// PHOTOS — DELETE UNE

// ======================================================

app.delete(

  "/api/photos/:id_photo",

  verifierToken,

  verifierEditeur,

  async (req, res) => {

    try {

      const idPhoto =

        Number(

          req.params.id_photo

        );

      if (

        !Number.isInteger(

          idPhoto

        )

      ) {

        return res

          .status(400)

          .json({

            success: false,

            message:

              "ID photo invalide.",

          });

      }

      const result =

        await pool.query(

          `

          SELECT

            id_photo,

            id_publication,

            image_url

          FROM photo

          WHERE id_photo = $1

          `,

          [idPhoto]

        );

      if (

        result.rows.length ===

        0

      ) {

        return res

          .status(404)

          .json({

            success: false,

            message:

              "Photo introuvable.",

          });

      }

      const photo =

        result.rows[0];

      if (

        !(await verifierProprietaire(

          "photo",

          "id_photo",

          idPhoto,

          req.user,

          res

        ))

      ) {

        return;

      }

      await pool.query(

        `

        DELETE FROM photo

        WHERE id_photo = $1

        `,

        [idPhoto]

      );

      if (

        photo.image_url

      ) {

        await deleteImageFromCloudinary(

          photo.image_url

        );

      }

      res.json({

        success: true,

        message:

          "Photo supprimée avec succès.",

        id_photo: idPhoto,

        id_publication:

          photo.id_publication,

      });

    } catch (error) {

      console.error(

        "Erreur DELETE photo :",

        error

      );

      res.status(500).json({

        success: false,

        message:

          error.message ||

          "Erreur lors de la suppression de la photo.",

      });

    }

  }

);

// ======================================================

// PHOTO PUBLICATION — DELETE

// ======================================================

app.delete(

  "/api/photo-publications/:id_publication",

  verifierToken,

  verifierEditeur,

  async (req, res) => {

    try {

      const idPublication =

        req.params.id_publication;

      const photos =

        await pool.query(

          `

          SELECT

            id_photo,

            image_url

          FROM photo

          WHERE

            id_publication = $1

          `,

          [idPublication]

        );

      if (

        photos.rows.length ===

        0

      ) {

        return res

          .status(404)

          .json({

            success: false,

            message:

              "Publication photo introuvable.",

          });

      }

      if (

        req.user.role !==

          ROLES.ADMIN &&

        req.user.role !==

          ROLES.EDITEUR

      ) {

        const owner =

          await pool.query(

            `

            SELECT id_utilisateur

            FROM photo

            WHERE

              id_publication = $1

            LIMIT 1

            `,

            [idPublication]

          );

        if (

          owner.rows.length ===

            0 ||

          Number(

            owner.rows[0]

              .id_utilisateur

          ) !==

            Number(

              req.user

                .id_utilisateur

            )

        ) {

          return res

            .status(403)

            .json({

              success: false,

              message:

                "Accès refusé.",

            });

        }

      }

      await pool.query(

        `

        DELETE FROM photo

        WHERE

          id_publication = $1

        `,

        [idPublication]

      );

      for (

        const photo of

          photos.rows

      ) {

        if (

          photo.image_url

        ) {

          await deleteImageFromCloudinary(

            photo.image_url

          );

        }

      }

      res.json({

        success: true,

        message:

          "Publication photo supprimée avec succès.",

        id_publication:

          idPublication,

        nombre_photos:

          photos.rows.length,

      });

    } catch (error) {

      console.error(

        "Erreur DELETE publication photo :",

        error

      );

      res.status(500).json({

        success: false,

        message:

          error.message ||

          "Erreur lors de la suppression de la publication.",

      });

    }

  }

);
// ======================================================
// 🎥 VIDEOS — BLOC COMPLET
// ======================================================

// ======================================================
// 🎥 LIMITE UPLOAD VIDÉO : 500 MB
// ======================================================

const MAX_VIDEO_SIZE = 500 * 1024 * 1024;

// ======================================================
// 🎥 MULTER — VIDÉOS
// ======================================================

const videoDirectory = path.join(__dirname, "uploads", "videos");

if (!fs.existsSync(videoDirectory)) {
  fs.mkdirSync(videoDirectory, {
    recursive: true,
  });
}

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, videoDirectory);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${extension}`;

    cb(null, filename);
  },
});

const uploadVideo = multer({
  storage: videoStorage, 
  fileFilter: (req, file, cb) => {
    const allowedVideoTypes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-msvideo",
      "video/mpeg",
    ];

    if (!allowedVideoTypes.includes(file.mimetype)) {
      return cb(
        new Error(
          "Format vidéo non supporté. Utilisez MP4, WebM, MOV, AVI ou MPEG."
        )
      );
    }

    cb(null, true);
  },
});


// ======================================================
// 🧹 SUPPRESSION FICHIER TEMPORAIRE
// ======================================================

function supprimerFichierTemporaire(filePath) {
  if (!filePath) return;

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);

      console.log(
        "🗑️ Fichier temporaire supprimé :",
        filePath
      );
    }
  } catch (error) {
    console.error(
      "⚠️ Erreur suppression fichier temporaire :",
      error
    );
  }
}

// ======================================================
// 🎥 VIDEOS — PUBLIC
// ======================================================

app.get(
  "/api/videos",
  async (req, res) => {
    try {
      const result =
        await pool.query(`
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
            ON v.id_utilisateur =
               u.id_utilisateur
          WHERE LOWER(TRIM(v.statut)) =
                'publie'
          ORDER BY v.created_at DESC
        `);

      res.json({
        success: true,
        videos: result.rows,
      });

    } catch (error) {
      console.error(
        "❌ Erreur GET videos :",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Erreur lors du chargement des vidéos.",
      });
    }
  }
);

// ======================================================
// 🎥 VIDEOS — ADMIN
// ======================================================

app.get(
  "/api/videos/admin",
  verifierToken,
  verifierEditeur,
  async (req, res) => {
    try {
      const result =
        await pool.query(`
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
            ON v.id_utilisateur =
               u.id_utilisateur
          ORDER BY v.created_at DESC
        `);

      res.json({
        success: true,
        videos: result.rows,
      });

    } catch (error) {
      console.error(
        "❌ Erreur GET videos admin :",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Erreur lors du chargement des vidéos.",
      });
    }
  }
);

// ======================================================
// 🎥 VIDEOS — CREATE
// ======================================================

app.post(
  "/api/videos",
  verifierToken,
  verifierRedacteur,
  uploadVideo.single("video"),

  async (req, res) => {
    let videoPath = null;
    let thumbnailPath = null;

    let cloudinaryVideo = null;
    let cloudinaryThumbnail = null;

    try {
      const {
        titre,
        description,
        statut = "brouillon",
      } = req.body;

      // --------------------------------------------------
      // TITRE
      // --------------------------------------------------

      if (
        !titre ||
        !String(titre).trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Le titre est obligatoire.",
        });
      }

      // --------------------------------------------------
      // VIDÉO
      // --------------------------------------------------

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            "Veuillez sélectionner une vidéo.",
        });
      }

      // --------------------------------------------------
      // LIMITE 500 MB
      // --------------------------------------------------

      if (
        req.file.size >
        MAX_VIDEO_SIZE
      ) {
        return res.status(400).json({
          success: false,
          message:
            "La vidéo ne doit pas dépasser 500 MB.",
        });
      }

      videoPath =
        req.file.path;

      console.log("");

      console.log(
        "========================================"
      );

      console.log(
        "🎥 NOUVELLE VIDÉO"
      );

      console.log(
        "========================================"
      );

      console.log(
        "📁 Fichier :",
        videoPath
      );

      console.log(
        "📦 Taille :",
        (
          req.file.size /
          1024 /
          1024
        ).toFixed(2),
        "MB"
      );

      console.log(
        "🎬 FFmpeg :",
        ffmpegPath
      );

      console.log(
        "========================================"
      );

      // --------------------------------------------------
      // MINIATURE
      // --------------------------------------------------

      const videoName =
        path.parse(
          req.file.filename
        ).name;

      thumbnailPath =
        path.join(
          videosPath,
          `${videoName}.jpg`
        );

      try {
        await generateVideoThumbnail(
          videoPath,
          thumbnailPath,
          "00:00:01"
        );

      } catch (firstError) {
        console.warn(
          "⚠️ Thumbnail à 1 seconde échoué."
        );

        try {
          await generateVideoThumbnail(
            videoPath,
            thumbnailPath,
            "00:00:00"
          );

        } catch (secondError) {
          console.error(
            "❌ Impossible de générer la miniature :",
            secondError
          );

          throw new Error(
            "Impossible de générer la miniature de la vidéo."
          );
        }
      }

      // --------------------------------------------------
      // CLOUDINARY — VIDÉO
      // --------------------------------------------------

      cloudinaryVideo =
        await uploadVideoToCloudinary(
          videoPath,
          "mikwo-pep-la/videos"
        );

      if (
        !cloudinaryVideo ||
        !cloudinaryVideo.url
      ) {
        throw new Error(
          "L'URL de la vidéo Cloudinary est introuvable."
        );
      }

      // --------------------------------------------------
      // CLOUDINARY — MINIATURE
      // --------------------------------------------------

      cloudinaryThumbnail =
        await uploadImageToCloudinary(
          thumbnailPath,
          "mikwo-pep-la/video-thumbnails"
        );

      if (
        !cloudinaryThumbnail ||
        !cloudinaryThumbnail.url
      ) {
        throw new Error(
          "L'URL de la miniature Cloudinary est introuvable."
        );
      }

      // --------------------------------------------------
      // STATUT
      // --------------------------------------------------

      let statutFinal =
        String(
          statut || "brouillon"
        )
          .trim()
          .toLowerCase();

      const statutsAutorises = [
        "brouillon",
        "publie",
        "archive",
      ];

      if (
        !statutsAutorises.includes(
          statutFinal
        )
      ) {
        statutFinal =
          "brouillon";
      }

      // --------------------------------------------------
      // DATABASE
      // --------------------------------------------------

      const result =
        await pool.query(
          `
          INSERT INTO video (
            titre,
            description,
            thumbnail,
            video_url,
            statut,
            id_utilisateur
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6
          )
          RETURNING
            id_video,
            titre,
            description,
            thumbnail,
            video_url,
            statut,
            created_at,
            id_utilisateur
          `,
          [
            String(titre).trim(),

            description
              ? String(
                  description
                ).trim()
              : "",

            cloudinaryThumbnail.url,

            cloudinaryVideo.url,

            statutFinal,

            req.user.id_utilisateur,
          ]
        );

      // --------------------------------------------------
      // NETTOYAGE LOCAL
      // --------------------------------------------------

      supprimerFichierTemporaire(
        videoPath
      );

      videoPath = null;

      supprimerFichierTemporaire(
        thumbnailPath
      );

      thumbnailPath = null;

      // --------------------------------------------------
      // RÉPONSE
      // --------------------------------------------------

      res.status(201).json({
        success: true,
        message:
          "Vidéo créée avec succès.",
        video:
          result.rows[0],
      });

    } catch (error) {
      console.error(
        "❌ Erreur création vidéo :",
        error
      );

      // --------------------------------------------------
      // NETTOYAGE LOCAL
      // --------------------------------------------------

      if (videoPath) {
        supprimerFichierTemporaire(
          videoPath
        );
      }

      if (thumbnailPath) {
        supprimerFichierTemporaire(
          thumbnailPath
        );
      }

      // --------------------------------------------------
      // NETTOYAGE CLOUDINARY
      // --------------------------------------------------

      if (
        cloudinaryVideo &&
        cloudinaryVideo.url
      ) {
        try {
          await deleteVideoFromCloudinary(
            cloudinaryVideo.url
          );
        } catch (cloudinaryError) {
          console.error(
            "Erreur suppression vidéo Cloudinary :",
            cloudinaryError
          );
        }
      }

      if (
        cloudinaryThumbnail &&
        cloudinaryThumbnail.url
      ) {
        try {
          await deleteImageFromCloudinary(
            cloudinaryThumbnail.url
          );
        } catch (cloudinaryError) {
          console.error(
            "Erreur suppression miniature Cloudinary :",
            cloudinaryError
          );
        }
      }

      // --------------------------------------------------
      // ERREUR MULTER / TAILLE
      // --------------------------------------------------

      if (
        error &&
        error.code ===
          "LIMIT_FILE_SIZE"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "La vidéo ne doit pas dépasser 500 MB.",
        });
      }

      res.status(500).json({
        success: false,
        message:
          error.message ||
          "Erreur lors de l'ajout de la vidéo.",
      });
    }
  }
);

// ======================================================
// 🎥 VIDEOS — UPDATE
// ======================================================

app.put(
  "/api/videos/:id",
  verifierToken,
  verifierRedacteur,
  uploadVideo.single("video"),

  async (req, res) => {
    let videoPath = null;
    let thumbnailPath = null;

    let newCloudinaryVideo = null;
    let newCloudinaryThumbnail = null;

    try {
      const { id } =
        req.params;

      const {
        titre,
        description,
        statut,
      } = req.body;

      // --------------------------------------------------
      // RECHERCHE
      // --------------------------------------------------

      const existing =
        await pool.query(
          `
          SELECT
            id_video,
            titre,
            description,
            thumbnail,
            video_url,
            statut,
            id_utilisateur
          FROM video
          WHERE id_video = $1
          `,
          [id]
        );

      if (
        existing.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Vidéo introuvable.",
        });
      }

      // --------------------------------------------------
      // PROPRIÉTAIRE
      // --------------------------------------------------

      if (
        !(await verifierProprietaire(
          "video",
          "id_video",
          id,
          req.user,
          res
        ))
      ) {
        return;
      }

      const videoExistante =
        existing.rows[0];

      const oldVideo =
        videoExistante.video_url;

      const oldThumbnail =
        videoExistante.thumbnail;

      let videoUrl =
        oldVideo;

      let thumbnailUrl =
        oldThumbnail;

      // --------------------------------------------------
      // NOUVELLE VIDÉO
      // --------------------------------------------------

      if (req.file) {
        if (
          req.file.size >
          MAX_VIDEO_SIZE
        ) {
          return res.status(400).json({
            success: false,
            message:
              "La vidéo ne doit pas dépasser 500 MB.",
          });
        }

        videoPath =
          req.file.path;

        const videoName =
          path.parse(
            req.file.filename
          ).name;

        thumbnailPath =
          path.join(
            videosPath,
            `${videoName}.jpg`
          );

        // ------------------------------------------------
        // MINIATURE
        // ------------------------------------------------

        try {
          await generateVideoThumbnail(
            videoPath,
            thumbnailPath,
            "00:00:01"
          );

        } catch (firstError) {
          console.warn(
            "⚠️ Thumbnail à 1 seconde échoué."
          );

          await generateVideoThumbnail(
            videoPath,
            thumbnailPath,
            "00:00:00"
          );
        }

        // ------------------------------------------------
        // CLOUDINARY VIDÉO
        // ------------------------------------------------

        newCloudinaryVideo =
          await uploadVideoToCloudinary(
            videoPath,
            "mikwo-pep-la/videos"
          );

        if (
          !newCloudinaryVideo ||
          !newCloudinaryVideo.url
        ) {
          throw new Error(
            "Impossible de récupérer l'URL de la nouvelle vidéo."
          );
        }

        // ------------------------------------------------
        // CLOUDINARY MINIATURE
        // ------------------------------------------------

        newCloudinaryThumbnail =
          await uploadImageToCloudinary(
            thumbnailPath,
            "mikwo-pep-la/video-thumbnails"
          );

        if (
          !newCloudinaryThumbnail ||
          !newCloudinaryThumbnail.url
        ) {
          throw new Error(
            "Impossible de récupérer l'URL de la nouvelle miniature."
          );
        }

        videoUrl =
          newCloudinaryVideo.url;

        thumbnailUrl =
          newCloudinaryThumbnail.url;
      }

      // --------------------------------------------------
      // TITRE
      // --------------------------------------------------

      const nouveauTitre =
        titre !== undefined &&
        String(titre).trim() !== ""
          ? String(titre).trim()
          : null;

      // --------------------------------------------------
      // DESCRIPTION
      // --------------------------------------------------

      const nouvelleDescription =
        description !== undefined
          ? String(
              description
            ).trim()
          : null;

      // --------------------------------------------------
      // STATUT
      // --------------------------------------------------

      let nouveauStatut =
        null;

      if (
        statut !== undefined &&
        String(statut).trim() !== ""
      ) {
        nouveauStatut =
          String(statut)
            .trim()
            .toLowerCase();

        const statutsAutorises = [
          "brouillon",
          "publie",
          "archive",
        ];

        if (
          !statutsAutorises.includes(
            nouveauStatut
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Statut vidéo invalide.",
          });
        }
      }

      // --------------------------------------------------
      // UPDATE DATABASE
      // --------------------------------------------------

      const result =
        await pool.query(
          `
          UPDATE video
          SET
            titre =
              COALESCE($1, titre),

            description =
              COALESCE($2, description),

            thumbnail = $3,

            video_url = $4,

            statut =
              COALESCE($5, statut)

          WHERE id_video = $6

          RETURNING
            id_video,
            titre,
            description,
            thumbnail,
            video_url,
            statut,
            created_at,
            id_utilisateur
          `,
          [
            nouveauTitre,
            nouvelleDescription,
            thumbnailUrl,
            videoUrl,
            nouveauStatut,
            id,
          ]
        );

      // --------------------------------------------------
      // NETTOYAGE LOCAL
      // --------------------------------------------------

      supprimerFichierTemporaire(
        videoPath
      );

      videoPath = null;

      supprimerFichierTemporaire(
        thumbnailPath
      );

      thumbnailPath = null;

      // --------------------------------------------------
      // SUPPRESSION ANCIENNE VIDÉO CLOUDINARY
      // --------------------------------------------------

      if (
        req.file &&
        oldVideo &&
        oldVideo !== videoUrl
      ) {
        try {
          await deleteVideoFromCloudinary(
            oldVideo
          );
        } catch (cloudinaryError) {
          console.error(
            "Erreur suppression ancienne vidéo Cloudinary :",
            cloudinaryError
          );
        }
      }

      // --------------------------------------------------
      // SUPPRESSION ANCIENNE MINIATURE
      // --------------------------------------------------

      if (
        req.file &&
        oldThumbnail &&
        oldThumbnail !== thumbnailUrl
      ) {
        try {
          await deleteImageFromCloudinary(
            oldThumbnail
          );
        } catch (cloudinaryError) {
          console.error(
            "Erreur suppression ancienne miniature Cloudinary :",
            cloudinaryError
          );
        }
      }

      // --------------------------------------------------
      // RÉPONSE
      // --------------------------------------------------

      res.json({
        success: true,
        message:
          "Vidéo modifiée avec succès.",
        video:
          result.rows[0],
      });

    } catch (error) {
      console.error(
        "❌ Erreur modification vidéo :",
        error
      );

      // --------------------------------------------------
      // NETTOYAGE LOCAL
      // --------------------------------------------------

      if (videoPath) {
        supprimerFichierTemporaire(
          videoPath
        );
      }

      if (thumbnailPath) {
        supprimerFichierTemporaire(
          thumbnailPath
        );
      }

      // --------------------------------------------------
      // NETTOYAGE CLOUDINARY
      // --------------------------------------------------

      if (
        newCloudinaryVideo &&
        newCloudinaryVideo.url
      ) {
        try {
          await deleteVideoFromCloudinary(
            newCloudinaryVideo.url
          );
        } catch (cloudinaryError) {
          console.error(
            "Erreur nettoyage nouvelle vidéo Cloudinary :",
            cloudinaryError
          );
        }
      }

      if (
        newCloudinaryThumbnail &&
        newCloudinaryThumbnail.url
      ) {
        try {
          await deleteImageFromCloudinary(
            newCloudinaryThumbnail.url
          );
        } catch (cloudinaryError) {
          console.error(
            "Erreur nettoyage nouvelle miniature Cloudinary :",
            cloudinaryError
          );
        }
      }

      if (
        error &&
        error.code ===
          "LIMIT_FILE_SIZE"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "La vidéo ne doit pas dépasser 500 MB.",
        });
      }

      res.status(500).json({
        success: false,
        message:
          error.message ||
          "Erreur lors de la modification de la vidéo.",
      });
    }
  }
);

// ======================================================
// 🎥 VIDEOS — DELETE
// ======================================================

app.delete(
  "/api/videos/:id",
  verifierToken,
  verifierRedacteur,

  async (req, res) => {
    try {
      const { id } =
        req.params;

      // --------------------------------------------------
      // RECHERCHE
      // --------------------------------------------------

      const existing =
        await pool.query(
          `
          SELECT
            id_video,
            video_url,
            thumbnail,
            id_utilisateur
          FROM video
          WHERE id_video = $1
          `,
          [id]
        );

      if (
        existing.rows.length === 0
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Vidéo introuvable.",
        });
      }

      // --------------------------------------------------
      // PROPRIÉTAIRE
      // --------------------------------------------------

      if (
        !(await verifierProprietaire(
          "video",
          "id_video",
          id,
          req.user,
          res
        ))
      ) {
        return;
      }

      const video =
        existing.rows[0];

      // --------------------------------------------------
      // SUPPRESSION DATABASE
      // --------------------------------------------------

      await pool.query(
        `
        DELETE FROM video
        WHERE id_video = $1
        `,
        [id]
      );

      // --------------------------------------------------
      // SUPPRESSION CLOUDINARY VIDÉO
      // --------------------------------------------------

      if (
        video.video_url
      ) {
        try {
          await deleteVideoFromCloudinary(
            video.video_url
          );
        } catch (cloudinaryError) {
          console.error(
            "Erreur suppression vidéo Cloudinary :",
            cloudinaryError
          );
        }
      }

      // --------------------------------------------------
      // SUPPRESSION CLOUDINARY MINIATURE
      // --------------------------------------------------

      if (
        video.thumbnail
      ) {
        try {
          await deleteImageFromCloudinary(
            video.thumbnail
          );
        } catch (cloudinaryError) {
          console.error(
            "Erreur suppression miniature Cloudinary :",
            cloudinaryError
          );
        }
      }

      // --------------------------------------------------
      // RÉPONSE
      // --------------------------------------------------

      res.json({
        success: true,
        message:
          "Vidéo supprimée avec succès.",
      });

    } catch (error) {
      console.error(
        "❌ Erreur suppression vidéo :",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message ||
          "Erreur lors de la suppression de la vidéo.",
      });
    }
  }
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

            id_equipe ASC

        `);

      res.json(

        result.rows

      );

    } catch (error) {

      console.error(

        "Erreur GET equipe :",

        error

      );

      res.status(500).json({

        success: false,

        message:

          "Erreur lors du chargement de l'équipe.",

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

          SELECT

            id_equipe,

            nom,

            fonction,

            biographie,

            photo,

            facebook,

            instagram,

            linkedin,

            afficher,

            ordre,

            created_at,

            updated_at

          FROM equipe

          ORDER BY

            ordre ASC,

            id_equipe ASC

        `);

      res.json(

        result.rows

      );

    } catch (error) {

      console.error(

        "Erreur equipe admin :",

        error

      );

      res.status(500).json({

        success: false,

        message:

          "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// ÉQUIPE — CREATE

// ======================================================

app.post(

  "/api/equipe",

  verifierToken,

  verifierAdmin,

  upload.single("photo"),

  async (req, res) => {

    let photoUrl =

      null;

    try {

      const {

        nom,

        fonction,

        biographie,

        facebook,

        instagram,

        linkedin,

        afficher = true,

        ordre = 0,

      } = req.body;

      if (

        !nom ||

        !nom.trim()

      ) {

        return res

          .status(400)

          .json({

            success: false,

            message:

              "Le nom est obligatoire.",

          });

      }

      if (req.file) {

        photoUrl =

          `/uploads/${req.file.filename}`;

      }

      const result =

        await pool.query(

          `

          INSERT INTO equipe (

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

          VALUES (

            $1,$2,$3,$4,$5,$6,$7,$8,$9

          )

          RETURNING *

          `,

          [

            nom.trim(),

            fonction || "",

            biographie || "",

            photoUrl,

            facebook || null,

            instagram || null,

            linkedin || null,

            afficher ===

              "false"

              ? false

              : true,

            Number(ordre) ||

              0,

          ]

        );

      res.status(201).json({

        success: true,

        message:

          "Membre ajouté avec succès.",

        equipe:

          result.rows[0],

      });

    } catch (error) {

      console.error(

        "Erreur ajout equipe :",

        error

      );

      res.status(500).json({

        success: false,

        message:

          error.message ||

          "Erreur lors de l'ajout du membre.",

      });

    }

  }

);

// ======================================================

// ÉQUIPE — UPDATE

// ======================================================

app.put(

  "/api/equipe/:id",

  verifierToken,

  verifierAdmin,

  upload.single("photo"),

  async (req, res) => {

    try {

      const { id } =

        req.params;

      const existing =

        await pool.query(

          `

          SELECT

            id_equipe,

            photo

          FROM equipe

          WHERE id_equipe = $1

          `,

          [id]

        );

      if (

        existing.rows.length ===

        0

      ) {

        return res

          .status(404)

          .json({

            success: false,

            message:

              "Membre introuvable.",

          });

      }

      const oldPhoto =

        existing.rows[0]

          .photo;

      const {

        nom,

        fonction,

        biographie,

        facebook,

        instagram,

        linkedin,

        afficher,

        ordre,

      } = req.body;

      let photoUrl =

        oldPhoto;

      if (req.file) {

        photoUrl =

          `/uploads/${req.file.filename}`;

        if (oldPhoto) {

          supprimerImage(

            oldPhoto

          );

        }

      }

      const result =

        await pool.query(

          `

          UPDATE equipe

          SET

            nom =

              COALESCE($1,nom),

            fonction =

              COALESCE($2,fonction),

            biographie =

              COALESCE($3,biographie),

            photo = $4,

            facebook =

              COALESCE($5,facebook),

            instagram =

              COALESCE($6,instagram),

            linkedin =

              COALESCE($7,linkedin),

            afficher =

              COALESCE($8,afficher),

            ordre =

              COALESCE($9,ordre),

            updated_at = NOW()

          WHERE id_equipe = $10

          RETURNING *

          `,

          [

            nom || null,

            fonction || null,

            biographie || null,

            photoUrl,

            facebook || null,

            instagram || null,

            linkedin || null,

            afficher ===

            undefined

              ? null

              : afficher ===

                "true",

            ordre ===

            undefined

              ? null

              : Number(ordre),

            id,

          ]

        );

      res.json({

        success: true,

        message:

          "Membre modifié avec succès.",

        equipe:

          result.rows[0],

      });

    } catch (error) {

      console.error(

        "Erreur modification equipe :",

        error

      );

      res.status(500).json({

        success: false,

        message:

          error.message ||

          "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// ÉQUIPE — DELETE

// ======================================================

app.delete(

  "/api/equipe/:id",

  verifierToken,

  verifierAdmin,

  async (req, res) => {

    try {

      const { id } =

        req.params;

      const existing =

        await pool.query(

          `

          SELECT

            id_equipe,

            photo

          FROM equipe

          WHERE id_equipe = $1

          `,

          [id]

        );

      if (

        existing.rows.length ===

        0

      ) {

        return res

          .status(404)

          .json({

            success: false,

            message:

              "Membre introuvable.",

          });

      }

      const photo =

        existing.rows[0]

          .photo;

      await pool.query(

        `

        DELETE FROM equipe

        WHERE id_equipe = $1

        `,

        [id]

      );

      if (photo) {

        supprimerImage(

          photo

        );

      }

      res.json({

        success: true,

        message:

          "Membre supprimé avec succès.",

      });

    } catch (error) {

      console.error(

        "Erreur suppression equipe :",

        error

      );

      res.status(500).json({

        success: false,

        message:

          "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// LIVE — UTILITAIRES

// ======================================================

function detectStreamType(

  url

) {

  if (!url) {

    return "unknown";

  }

  const value =

    url.toLowerCase();

  if (

    value.includes(

      "youtube.com"

    ) ||

    value.includes(

      "youtu.be"

    )

  ) {

    return "youtube";

  }

  if (

    value.includes(

      "facebook.com"

    ) ||

    value.includes(

      "fb.watch"

    )

  ) {

    return "facebook";

  }

  if (

    value.endsWith(".m3u8")

  ) {

    return "hls";

  }

  if (

    value.endsWith(".mp4") ||

    value.endsWith(".webm")

  ) {

    return "video";

  }

  return "unknown";

}

function isValidStreamUrl(

  url

) {

  try {

    if (!url) return false;

    const parsed =

      new URL(url);

    return (

      parsed.protocol ===

        "http:" ||

      parsed.protocol ===

        "https:"

    );

  } catch {

    return false;

  }

}

// ======================================================
// LIVE — PUBLIC
// ======================================================

app.get(
  "/api/live",
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
          u.nom AS auteur
        FROM live l
        LEFT JOIN utilisateur u
          ON l.id_utilisateur = u.id_utilisateur
        ORDER BY
          l.updated_at DESC NULLS LAST,
          l.created_at DESC
        LIMIT 1
      `);

      res.json({
        success: true,
        live: result.rows[0] || null,
      });

    } catch (error) {
      console.error(
        "Erreur GET live :",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Erreur lors du chargement du live.",
        live: null,
      });
    }
  }
);

// ======================================================
// LIVE — ADMIN
// ======================================================

app.get(
  "/api/live/all",
  verifierToken,
  verifierAdmin,
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
          u.nom AS auteur
        FROM live l
        LEFT JOIN utilisateur u
          ON l.id_utilisateur = u.id_utilisateur
        ORDER BY
          l.created_at DESC
      `);

      res.json(result.rows);

    } catch (error) {
      console.error(
        "Erreur GET live all :",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Erreur serveur.",
      });
    }
  }
);

// ======================================================
// LIVE — CREATE
// ======================================================

app.post(
  "/api/live",
  verifierToken,
  verifierAdmin,
  async (req, res) => {
    const client = await pool.connect();

    try {
      const {
        titre,
        description,
        stream_url,
        statut = "offline",
        source_type,
      } = req.body;

      // --------------------------------------------------
      // VALIDATION TITRE
      // --------------------------------------------------

      if (
        !titre ||
        !titre.trim()
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Le titre est obligatoire.",
          });
      }

      // --------------------------------------------------
      // VALIDATION URL
      // --------------------------------------------------

      if (
        !stream_url ||
        !isValidStreamUrl(
          stream_url
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "URL du stream invalide.",
          });
      }

      const statutFinal =
        String(
          statut || "offline"
        )
          .trim()
          .toLowerCase();

      const detectedType =
        source_type ||
        detectStreamType(
          stream_url
        );

      await client.query(
        "BEGIN"
      );

      // --------------------------------------------------
      // SI NOUVEAU LIVE = LIVE
      // ON COUPE TOUS LES AUTRES
      // --------------------------------------------------

      if (
        statutFinal === "live"
      ) {
        await client.query(`
          UPDATE live
          SET
            statut = 'offline',
            updated_at = NOW()
          WHERE statut = 'live'
        `);
      }

      // --------------------------------------------------
      // CREATION
      // --------------------------------------------------

      const result =
        await client.query(
          `
          INSERT INTO live (
            titre,
            description,
            stream_url,
            statut,
            id_utilisateur,
            source_type,
            updated_at
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            NOW()
          )
          RETURNING *
          `,
          [
            titre.trim(),
            description || "",
            stream_url.trim(),
            statutFinal,
            req.user.id_utilisateur,
            detectedType,
          ]
        );

      await client.query(
        "COMMIT"
      );

      res.status(201).json({
        success: true,
        message:
          "Live créé avec succès.",
        live:
          result.rows[0],
      });

    } catch (error) {
      await client.query(
        "ROLLBACK"
      );

      console.error(
        "Erreur création live :",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.message ||
          "Erreur serveur.",
      });

    } finally {
      client.release();
    }
  }
);

// ======================================================
// LIVE — UPDATE
// ======================================================

app.put(
  "/api/live/:id",
  verifierToken,
  verifierAdmin,
  async (req, res) => {
    const client = await pool.connect();

    try {
      const { id } =
        req.params;

      const {
        titre,
        description,
        stream_url,
        statut,
        source_type,
      } = req.body;

      // --------------------------------------------------
      // VALIDATION URL
      // --------------------------------------------------

      if (
        stream_url !== undefined &&
        stream_url !== null &&
        stream_url !== "" &&
        !isValidStreamUrl(
          stream_url
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "URL du stream invalide.",
          });
      }

      // --------------------------------------------------
      // TYPE SOURCE
      // --------------------------------------------------

      const detectedType =
        source_type ||
        (
          stream_url
            ? detectStreamType(
                stream_url
              )
            : null
        );

      // --------------------------------------------------
      // STATUT
      // --------------------------------------------------

      const statutFinal =
        statut !== undefined &&
        statut !== null
          ? String(statut)
              .trim()
              .toLowerCase()
          : null;

      await client.query(
        "BEGIN"
      );

      // --------------------------------------------------
      // SI CE LIVE DEVIENT ACTIF
      // ON COUPE TOUS LES AUTRES
      // --------------------------------------------------

      if (
        statutFinal === "live"
      ) {
        await client.query(
          `
          UPDATE live
          SET
            statut = 'offline',
            updated_at = NOW()
          WHERE
            statut = 'live'
            AND id_live <> $1
          `,
          [id]
        );
      }

      // --------------------------------------------------
      // UPDATE DU LIVE
      // --------------------------------------------------

      const result =
        await client.query(
          `
          UPDATE live
          SET
            titre =
              COALESCE($1, titre),

            description =
              COALESCE($2, description),

            stream_url =
              COALESCE($3, stream_url),

            statut =
              COALESCE($4, statut),

            source_type =
              COALESCE($5, source_type),

            updated_at =
              NOW()

          WHERE id_live = $6

          RETURNING *
          `,
          [
            titre !== undefined &&
            titre !== null &&
            titre !== ""
              ? titre.trim()
              : null,

            description !== undefined &&
            description !== null
              ? description
              : null,

            stream_url !== undefined &&
            stream_url !== null &&
            stream_url !== ""
              ? stream_url.trim()
              : null,

            statutFinal,

            detectedType,

            id,
          ]
        );

      if (
        result.rows.length ===
        0
      ) {
        await client.query(
          "ROLLBACK"
        );

        return res
          .status(404)
          .json({
            success: false,
            message:
              "Live introuvable.",
          });
      }

      await client.query(
        "COMMIT"
      );

      res.json({
        success: true,
        message:
          "Live modifié avec succès.",
        live:
          result.rows[0],
      });

    } catch (error) {
      await client.query(
        "ROLLBACK"
      );

      console.error(
        "Erreur modification live :",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Erreur serveur.",
      });

    } finally {
      client.release();
    }
  }
);

// ======================================================
// LIVE — DELETE
// ======================================================

app.delete(
  "/api/live/:id",
  verifierToken,
  verifierAdmin,
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const result =
        await pool.query(
          `
          DELETE FROM live
          WHERE id_live = $1
          RETURNING id_live
          `,
          [id]
        );

      if (
        result.rows.length ===
        0
      ) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Live introuvable.",
          });
      }

      await pool.query(
        `
        DELETE FROM live_viewers
        WHERE id_live = $1
        `,
        [id]
      ).catch(() => {});

      res.json({
        success: true,
        message:
          "Live supprimé avec succès.",
      });

    } catch (error) {
      console.error(
        "Erreur suppression live :",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Erreur serveur.",
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

        id_live,

        session_id,

      } = req.body;

      if (

        !id_live ||

        !session_id

      ) {

        return res

          .status(400)

          .json({

            success: false,

            message:

              "id_live et session_id sont obligatoires.",

          });

      }

      await pool.query(

        `

        INSERT INTO live_viewers (

          id_live,

          session_id,

          last_seen

        )

        VALUES (

          $1,$2,NOW()

        )

        ON CONFLICT (

          id_live,

          session_id

        )

        DO UPDATE SET

          last_seen = NOW()

        `,

        [

          id_live,

          session_id,

        ]

      );

      const result =

        await pool.query(

          `

          SELECT COUNT(*)::int

            AS viewers

          FROM live_viewers

          WHERE

            id_live = $1

            AND last_seen >

              NOW() -

              INTERVAL '2 minutes'

          `,

          [id_live]

        );

      res.json({

        success: true,

        viewers:

          result.rows[0]

            .viewers,

      });

    } catch (error) {

      console.error(

        "Erreur viewer live :",

        error

      );

      res.status(500).json({

        success: false,

        message:

          "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// NETTOYAGE VIEWERS

// ======================================================

async function nettoyerViewers() {

  try {

    await pool.query(`

      DELETE FROM live_viewers

      WHERE last_seen <

        NOW() -

        INTERVAL '2 minutes'

    `);

  } catch (error) {

    console.error(

      "Erreur nettoyage viewers :",

      error.message

    );

  }

}

setInterval(

  nettoyerViewers,

  2 * 60 * 1000

);

// ======================================================

// UTILISATEURS — GET

// ======================================================

app.get(

  "/api/utilisateurs",

  verifierToken,

  verifierAdmin,

  async (req, res) => {

    try {

      const result =

        await pool.query(`

          SELECT

            id_utilisateur,

            nom,

            email,

            role

          FROM utilisateur

          ORDER BY

            id_utilisateur DESC

        `);

      res.json(

        result.rows

      );

    } catch (error) {

      console.error(

        "Erreur utilisateurs :",

        error

      );

      res.status(500).json({

        success: false,

        message:

          "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// UTILISATEURS — CREATE

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

        role = "journaliste",

      } = req.body;

      if (

        !nom ||

        !email ||

        !password

      ) {

        return res

          .status(400)

          .json({

            success: false,

            message:

              "Nom, email et mot de passe obligatoires.",

          });

      }

      const rolesAutorises =

        [

          "admin",

          "editor",

          "journaliste",

        ];

      if (

        !rolesAutorises.includes(

          role

        )

      ) {

        return res

          .status(400)

          .json({

            success: false,

            message:

              "Rôle invalide.",

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

          INSERT INTO utilisateur (

            nom,

            email,

            password,

            role

          )

          VALUES (

            $1,$2,$3,$4

          )

          RETURNING

            id_utilisateur,

            nom,

            email,

            role

          `,

          [

            nom.trim(),

            email.trim(),

            hashedPassword,

            role,

          ]

        );

      res.status(201).json({

        success: true,

        message:

          "Utilisateur créé avec succès.",

        utilisateur:

          result.rows[0],

      });

    } catch (error) {

      console.error(

        "Erreur création utilisateur :",

        error

      );

      if (

        error.code ===

        "23505"

      ) {

        return res

          .status(409)

          .json({

            success: false,

            message:

              "Cet email existe déjà.",

          });

      }

      res.status(500).json({

        success: false,

        message:

          "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// UTILISATEURS — DELETE

// ======================================================

app.delete(

  "/api/utilisateurs/:id",

  verifierToken,

  verifierAdmin,

  async (req, res) => {

    try {

      const { id } =

        req.params;

      if (

        Number(id) ===

        Number(

          req.user

            .id_utilisateur

        )

      ) {

        return res

          .status(400)

          .json({

            success: false,

            message:

              "Vous ne pouvez pas supprimer votre propre compte.",

          });

      }

      const result =

        await pool.query(

          `

          DELETE FROM utilisateur

          WHERE id_utilisateur = $1

          RETURNING

            id_utilisateur

          `,

          [id]

        );

      if (

        result.rows.length ===

        0

      ) {

        return res

          .status(404)

          .json({

            success: false,

            message:

              "Utilisateur introuvable.",

          });

      }

      res.json({

        success: true,

        message:

          "Utilisateur supprimé avec succès.",

      });

    } catch (error) {

      console.error(

        "Erreur suppression utilisateur :",

        error

      );

      res.status(500).json({

        success: false,

        message:

          "Impossible de supprimer cet utilisateur.",

      });

    }

  }

);

// ======================================================

// CONTACTS — GET ADMIN

// ======================================================

app.get(

  "/api/contacts",

  verifierToken,

  verifierAdmin,

  async (req, res) => {

    try {

      const result =

        await pool.query(`

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

      res.json(

        result.rows

      );

    } catch (error) {

      console.error(

        "Erreur GET contacts :",

        error

      );

      res.status(500).json({

        success: false,

        message:

          "Erreur lors du chargement des messages.",

      });

    }

  }

);

// ======================================================

// CONTACTS — CREATE PUBLIC

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

        return res

          .status(400)

          .json({

            success: false,

            message:

              "Nom, email et message sont obligatoires.",

          });

      }

      const sujetFinal =

        sujet &&

        sujet.trim()

          ? sujet.trim()

          : "Message depuis le site";

      const result =

        await pool.query(

          `

          INSERT INTO contact (

            nom,

            email,

            sujet,

            message

          )

          VALUES (

            $1,$2,$3,$4

          )

          RETURNING

            id_contact,

            nom,

            email,

            sujet,

            message,

            created_at

          `,

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

          "Votre message a été envoyé avec succès.",

        contact:

          result.rows[0],

      });

    } catch (error) {

      console.error(

        "Erreur POST contact :",

        error

      );

      res.status(500).json({

        success: false,

        message:

          "Erreur lors de l'envoi du message.",

      });

    }

  }

);

// ======================================================

// CONTACTS — DELETE

// ======================================================

app.delete(

  "/api/contacts/:id",

  verifierToken,

  verifierAdmin,

  async (req, res) => {

    try {

      const { id } =

        req.params;

      const result =

        await pool.query(

          `

          DELETE FROM contact

          WHERE id_contact = $1

          RETURNING id_contact

          `,

          [id]

        );

      if (

        result.rows.length ===

        0

      ) {

        return res

          .status(404)

          .json({

            success: false,

            message:

              "Message introuvable.",

          });

      }

      res.json({

        success: true,

        message:

          "Message supprimé avec succès.",

      });

    } catch (error) {

      console.error(

        "Erreur suppression contact :",

        error

      );

      res.status(500).json({

        success: false,

        message:

          "Erreur serveur.",

      });

    }

  }

);

// ======================================================

// ERREUR MULTER / UPLOAD

// ======================================================

app.use(

  (

    error,

    req,

    res,

    next

  ) => {

    if (

      error instanceof

      multer.MulterError

    ) {

      console.error(

        "❌ Erreur Multer :",

        error

      );

      return res

        .status(400)

        .json({

          success: false,

          message:

            error.message ||

            "Erreur lors de l'upload.",

        });

    }

    if (

      error &&

      error.message &&

      error.message.includes(

        "Format d'image non autorisé"

      )

    ) {

      return res

        .status(400)

        .json({

          success: false,

          message:

            error.message,

        });

    }

    if (

      error &&

      error.message &&

      error.message.includes(

        "Format vidéo non autorisé"

      )

    ) {

      return res

        .status(400)

        .json({

          success: false,

          message:

            error.message,

        });

    }

    next(error);

  }

);

// ======================================================

// 404

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

// ERREUR GÉNÉRALE

// ======================================================

app.use(

  (

    error,

    req,

    res,

    next

  ) => {

    console.error(

      "❌ ERREUR SERVEUR GLOBALE :",

      error

    );

    res.status(500).json({

      success: false,

      message:

        error.message ||

        "Erreur interne du serveur.",

    });

  }

);

// ======================================================

// DÉMARRAGE

// ======================================================

async function startServer() {

  try {

    console.log("");

    console.log(

      "=========================================="

    );

    console.log(

      "🚀 DÉMARRAGE MIKWO PÈP LA TV API"

    );

    console.log(

      "=========================================="

    );

    await pool.query(

      "SELECT NOW()"

    );

    console.log(

      "✅ PostgreSQL connecté."

    );

    if (

      fs.existsSync(

        ffmpegPath

      )

    ) {

      console.log(

        "✅ FFmpeg trouvé :",

        ffmpegPath

      );

    } else {

      console.log(

        "⚠️ FFmpeg introuvable :",

        ffmpegPath

      );

    }

    console.log(

      "☁️ Cloudinary :",

      process.env

        .CLOUDINARY_CLOUD_NAME

        ? "configuré"

        : "NON CONFIGURÉ"

    );

    console.log(

      "🔐 JWT_SECRET :",

      process.env.JWT_SECRET

        ? "configuré"

        : "NON CONFIGURÉ"

    );

    app.listen(

      PORT,

      "0.0.0.0",

      () => {

        console.log("");

        console.log(

          "=========================================="

        );

        console.log(

          `✅ Serveur lancé sur le port ${PORT}`

        );

        console.log(

          "=========================================="

        );

        console.log(

          `🌐 API : http://localhost:${PORT}/api`

        );

        console.log(

          "=========================================="

        );

      }

    );

  } catch (error) {

    console.error("");

    console.error(

      "❌ IMPOSSIBLE DE DÉMARRER LE SERVEUR"

    );

    console.error(error);

    process.exit(1);

  }
}
startServer();
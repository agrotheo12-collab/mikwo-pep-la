const bcrypt = require("bcryptjs");

const password = "4402Tl";

bcrypt.hash(password, 10)
  .then((hash) => {
    console.log(hash);
  })
  .catch((error) => {
    console.error(error);
  });
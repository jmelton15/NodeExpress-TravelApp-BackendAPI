const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");


/** return signed JWT for payload {user_id, is_admin}. */

function createToken(user_id, is_admin=false) {
  let payload = {user_id, is_admin};
  return jwt.sign(payload, SECRET_KEY);
}


module.exports = createToken;
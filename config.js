"use strict";

/** Shared config for application; can be required many places. */

require("dotenv").config();
require("colors")
const SECRET_KEY = process.env.SECRET_KEY || "secret-dev";

const PORT = +process.env.PORT || 3001;
 
const profilePicStorage = process.env.PROFILE_PICS_STORE

// Use dev database, testing database, or via env var, production database
function getDatabaseUri() {
  const connectionString = `postrgres://${process.env.DATABASE_USERNAME}:${process.env.DATABASE_PASSWORD}@localhost/dtri`
  return (process.env.NODE_ENV === "test")
      ? "dtri_test"
      : connectionString;
}

// Speed up bcrypt during tests, since the algorithm safety isn't being tested
//
// WJB: Evaluate in 2021 if this should be increased to 13 for non-test use
// const BCRYPT_WORK_FACTOR = process.env.NODE_ENV === "test" ? 1 : 12;

console.log("Jobly Config:".green);
console.log("SECRET_KEY:".yellow, SECRET_KEY);
console.log("PORT:".yellow, PORT.toString());
// console.log("BCRYPT_WORK_FACTOR".yellow, BCRYPT_WORK_FACTOR);
console.log("Database:".yellow,"dtri");
console.log("---");

module.exports = {
  SECRET_KEY,
  PORT,
  // BCRYPT_WORK_FACTOR,
  getDatabaseUri,
  profilePicStorage
};

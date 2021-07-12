process.env.NODE_ENV = "test";

const app = require("../../app");
const request = require("supertest");
const db = require("../../db");
const bcrypt = require("bcrypt");
const createToken = require("../../helpers/createToken");
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../../config");

const base_url = "/users";
// tokens for our sample users
const tokens = {};

beforeEach(async function() {
    async function _pwd(password) {
        return await bcrypt.hash(password,1);
    }

    let sampleUsers = [
        [1,"u1",await _pwd("pwd1"),"email1","u1 bio","pic1"],
        [2,"u2",await _pwd("pwd2"),"email2","u2 bio","pic2"],
        [3,"u3",await _pwd("pwd3"),"email3","u3 bio","pic3"],
    ]

    for (let user of sampleUsers) {
        await db.query(
          `INSERT INTO users (id,username,password,email,bio,avatar_pic_url) VALUES ($1, $2, $3, $4, $5,$6)`,
          user
        );
        tokens[user[1]] = createToken(user[0]);
    }
})


/**GET /[username] => get user based on a username */
describe("GET /username", function() {
    test("returns a user with given username", async function() {
        const resp = await request(app).get(`${base_url}/u2`).set('Authorization',tokens.u1)
        expect(resp.statusCode).toBe(200);
        expect(resp.body.foundUser.username).toEqual("u2");
    })
})

afterEach(async function() {
    await db.query("DELETE FROM users");
  });
  
  afterAll(function() {
    db.end();
  });
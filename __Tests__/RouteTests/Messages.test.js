process.env.NODE_ENV = "test";

const app = require("../../app");
const request = require("supertest");
const db = require("../../db");
const bcrypt = require("bcrypt");
const createToken = require("../../helpers/createToken");
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../../config");

const base_url = "/messages";
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

    let sampleMessages = [
        ["text1","pic1",2,1,"1-2"],
        ["text2","pic2",1,2,"2-1"]
    ]
    for (let msg of sampleMessages) {
        await db.query(
            `INSERT INTO messages (msg_txt,from_user_avatar,to_user_id,from_user_id,conversation_id) VALUES ($1,$2,$3,$4,$5)`,msg
        );
    }
})

/**
 * GET / => gets all messages between two users (conversation)
 */
describe("GET /:toUserId/:fromUserId", function() {
    test("Returns the messages between two users", async function() {
        const resp = await request(app).get(`${base_url}/2/1`).set('Authorization',tokens.u1)
        expect(resp.statusCode).toBe(200);
        expect(resp.body.messages[0].msgTxt).toEqual("text1");
    })
})

/**POST /[create] => sends message to another user */
describe("POST /create", function() {
    test("Creates a new message from a user to another user", async function() {
        const resp = await request(app).post(`${base_url}/create`)
        .set('Authorization',tokens.u1)
        .send({
            msgTxt:"test create",
            toUserId:2,
            fromUserId:1,
            fromUserAvatar:"pic1"
        })
        
        expect(resp.statusCode).toBe(200);
        expect(resp.body.createdMsg.msgTxt).toEqual("test create");
    })
})




afterEach(async function() {
    await db.query("DELETE FROM users");
    await db.query("DELETE FROM messages");
});
  
afterAll(function() {
    db.end();
});
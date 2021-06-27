// "use strict";

// const db = require("../db");
// const { BadRequestError, NotFoundError } = require("../expressError");
// const { sqlForPartialUpdate } = require("../helpers/sql");

// class User {
//     /**
//      * Gets data of a specific user
//      * 
//      * @param {userId} -> Id of user you want to get 
//      * @returns {User:{id,username,avatar_pic_url}}
//      */
//     static async getUser({userId}) {
//         const userQuery = await db.query(
//             `SELECT id,username,avatar_pic_url
//             FROM users
//             WHERE user_id = $1`,[]
//         )
//     }
// }
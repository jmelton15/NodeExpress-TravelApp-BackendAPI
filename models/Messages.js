"use strict";

const db = require("../db");
const { NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

class Messages {

    /**
     * Gets all the messages between two users (puts together a conversation)
     * Only gets the messages that are within 10 days of current date.
     * 
     * @param {toUserId} param0 => id of user who sent message
     * @param {fromUserId} param1  => id of user who message was sent to
     * 
     * @returns {id,msgTxt,toUserId,fromUserId,conversationId
     *           fromUserAvatar:{file path}
     *           toUserAvatar:{file path}
     *          }
     */
    static async get({toUserId,fromUserId}) {
        const dateObj = new Date();
        let tenDaysAgo = dateObj - 1000 * 60 * 60 * 24 * 10;
        tenDaysAgo = new Date(tenDaysAgo);
        
        // these are used to find the correct conversation between the two users
        const convoId1 = `${toUserId}-${fromUserId}`;
        const convoId2 = `${fromUserId}-${toUserId}`;

        const queryResult = await db.query(
            `SELECT messages.id,messages.msg_txt AS "msgTxt",messages.to_user_id AS "toUserId",
            messages.from_user_id AS "fromUserId",messages.conversation_id AS "conversationId",
                    users.avatar_pic_url AS "fromUserAvatar"
             FROM messages
             JOIN users
             ON messages.from_user_id = users.id
             WHERE (messages.conversation_id = $1 OR messages.conversation_id = $2) AND messages.created_on >= $3
             ORDER BY messages.created_on ASC`,[convoId1,convoId2,tenDaysAgo]
        );
        let messages = queryResult.rows;
    
        return messages;
    }


    /**
     * Edit an existing message by changing the text
     * 
     * @param {msgId,newMsgTxt} -> id of the message to edit and the text you want to change to
     * @returns {id,msgTxt,toUserId,fromUserId,fromUserAvatar}
     */
    static async edit({msgId,newMsgTxt}) {
        const queryResult = await db.query(
            `UPDATE messages 
             SET msg_txt = $1
             WHERE id = $2
             RETURNING id,msg_txt AS "msgTxt",to_user_id AS "toUserId",
                      from_user_id AS "fromUserId",from_user_avatar AS "fromUserAvatar"`,
            [newMsgTxt,msgId]
        );
        let editedMsg = queryResult.rows[0];

        if(!editedMsg) throw new NotFoundError(`Was not able to find Message # ${msgId} to edit`);

        return editedMsg;
    }

    /**
     * Deletes an existing message
     * 
     * @param {msgId} -> id of the message you want to delete 
     */
    static async delete({msgId}) {
        const queryResult = await db.query(
            `DELETE 
             FROM messages
             WHERE id = $1 
             RETURNING id`,[msgId]
        );
        const removedMsg = queryResult.rows[0];
        if(!removedMsg) throw new NotFoundError(`No Message Found with message id ${msgId} }`);
    }

    /**
     *  Create a new message to a user with a given Id
     * 
     *  Data should be the text of the message and the id of the user it"s going to
     *     {msgTxt,toUserId}
     * 
     *  returns {id,msg_txt,to_user_id,conversation_id,fromUserAvatar}
     */
     static async createMessage({msgTxt,toUserId,fromUserId,fromUserAvatar}) {
        const convoId = `${toUserId}-${fromUserId}`;
        const queryResult = await db.query(
            `INSERT INTO messages (msg_txt,to_user_id,from_user_id,conversation_id,from_user_avatar) 
             VALUES ($1,$2,$3,$4,$5)
             RETURNING id,msg_txt AS "msgTxt",to_user_id AS "toUserId",from_user_id AS "fromUserId",
             conversation_id AS "conversationId",from_user_avatar AS "fromUserAvatar"`,
             [msgTxt,toUserId,fromUserId,convoId,fromUserAvatar]);
        
        let createdMsg = queryResult.rows[0];

        if(!createdMsg) throw new NotFoundError(`Was not able to create a Message for user ${toUserId}`)
        
        return createdMsg;
    }

}

module.exports = Messages;
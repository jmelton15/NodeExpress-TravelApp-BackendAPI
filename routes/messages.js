"use strict";

/** Routes for messages */

const jsonschema = require("jsonschema");
const express = require("express");

const { BadRequestError } = require("../expressError");
const { ensureLoggedIn,ensureCorrectUserOrAdmin} = require("../middleware/auth");
const {body,check,validationResult} = require('express-validator');
const Messages = require("../models/Messages");


const router = new express.Router();


/** GET / => gets all messages between two users (conversation)
 * 
 *  req.body should be {toUserId,fromUserId}
 * 
 * returns {id,msgTxt,toUserId,fromUserId,conversationId}
 * 
 * auth required: logged in, correct user or admin
*/
router.get("/:toUserId/:fromUserId",ensureCorrectUserOrAdmin,check('toUserId').isNumeric(),check('fromUserId').isNumeric(),
async function(req,res,next) {
    const params = req.params;
    try {
        validationResult(req).throw();
        const messages = await Messages.get(params);
        return res.json({messages});
    } catch(err) {
        console.log(err.mapped())
        return next(err);
    }
})


/**  POST /[create] => sends message to another user
 * 
 *  req.body should be {msgTxt,toUserId, fromUserId}
 * 
 * returns {id,msgTxt,toUserId,fromUserId}
 * 
 * Auth required: logged in 
 * 
 */
 router.post("/create",ensureLoggedIn,check('msgTxt').isLength({max:350}),check('toUserId').isNumeric(),check('fromUserId').isNumeric(),
 async function(req,res,next) {
    const body = req.body;
    try {
        validationResult(req).throw();
        const createdMsg = await Messages.createMessage(body);
        return res.json({createdMsg});
    } catch(err) {
        console.log(err.mapped())
        return next(err);
    }
})

/** PATCH /[edit]/[msgId] => edits message with given id
 * 
 *  data in should be:  params: {msgId}
 *                      body:  {
 *                              userId  => id of logged in user
 *                              newMsgTxt
 *                              } 
 * 
 * returns {id,msgTxt,toUserId,fromUserId}
 * 
 * Auth required: logged in, admin or correct user
 */

router.patch("/edit/:msgId",ensureCorrectUserOrAdmin,check('newMsgTxt').isLength({max:350}),check('msgId').isNumeric(),
async function(req,res,next) {
    let id;
    if(req.params.msgId !== undefined) id = +req.params.msgId;
    const body = req.body;
    try {
        validationResult(req).throw();
        const data = {
            msgId:id,
            newMsgTxt:body.newMsgTxt,
        }
        const editedMsg = await Messages.edit(data);
        return res.json({editedMsg});
    } catch(err) {
        console.log(err.mapped())
        return next(err);
    }
})

/** DELETE /[delete] => {deleted: msgId}
 * 
 *  data in should be:  params: {msgId}
 *                      body:  {userId}  => id of logged in user
 * 
 *  returns {deleted: "Message msgId"}
 * 
 * Auth required: logged in, admin or correct user
 */
router.delete("/delete/:msgId",ensureCorrectUserOrAdmin,async function(req,res,next) {
    let id;
    if(req.params.msgId !== undefined) id = +req.params.msgId;
    const body = req.body;
    try {
       
        await Messages.delete({msgId:id});
        return res.json({deleted:`Message ${id}`});
    } catch(err) {
        return next(err);
    }

})

module.exports = router;
"use strict";

/** Routes for messages */

const jsonschema = require("jsonschema");
const express = require("express");
const multer = require("multer");
const { BadRequestError } = require("../expressError");
const { ensureCorrectUserOrAdmin, ensureLoggedIn } = require("../middleware/auth");
const {body,check,validationResult} = require('express-validator');
const SocialConnections = require("../models/socialConnections");

const router = new express.Router();

//multer options
const upload = multer({
    dest:'images/UserAvatars'
})


/** GET /[username] => get user based on a username
 * 
 *  Data in =>  {username}
 * 
 * returns =>  {id,username,bio,avatar_pic_url}
 * 
 * authorization needed: logged in
 */
router.get("/:username",ensureLoggedIn,async function(req,res,next) {
    const username = req.params.username;
    try {
        // const validator = jsonschema.validate(body,messageCreateSchema);
        // if(!validator.valid) {
        //     const errs = validator.errors.map(e => e.stack);
        //     throw new BadRequestError(errs);
        // }
        const foundUser = await SocialConnections.getUserByUsername({username});
        return res.json({foundUser});
    } catch(err) {
        return next(err);
    }
})


/** GET /[:userID]/connections => user's connections (followers and following)
 * 
 *  Data in =>  {userId}
 * 
 * returns =>  {userData: {id,username,avatar_pic_url},
 *               following:[{id,username,avatar_pic_url},...]
 *               followers:[{id,username,avatar_pic_url},...]
 *              }
 * 
 * authorization needed: logged in, correct user or admin
 */
router.get("/:userId/connections",ensureCorrectUserOrAdmin,check('userId').isNumeric(),
async function(req,res,next) {
    let id;
    if(req.params.userId !== undefined) id = +req.params.userId;
    try {
        // const validator = jsonschema.validate(body,messageCreateSchema);
        // if(!validator.valid) {
        //     const errs = validator.errors.map(e => e.stack);
        //     throw new BadRequestError(errs);
        // }
        const userData = await SocialConnections.getConnections({userId:id});
        return res.json({userData});
    } catch(err) {
        return next(err);
    }
});

/** GET /[:userID]/connections/trips => trips from users someone is following
 * 
 *  Data in =>  {userId}
 * 
 * returns =>  {friendsTrips: 
 *                  {
 *                     {id,username,avatar_pic_url,waypoint_names,start_point,end_point,photo},
 *                          etc....
 *                   }
 *              }
 * 
 * authorization needed: logged in, correct user or admin
 */
router.get("/:userId/connections/trips",ensureCorrectUserOrAdmin,check('userId').isNumeric(), 
async function(req,res,next) {
    let userId;
    if(req.params.userId !== undefined) userId = +req.params.userId;
    try {
        validationResult(req).throw();
        const followingTrips = await SocialConnections.getConnectionsTrips({userId});
        return res.json({followingTrips});
    } catch(err) {
        console.log(err.mapped())
        return next(err);
    }
});


/** POST /[:userId]/[upload]  => 
 * 
 *  Upload An Image As A Profile Pic
 * 
 *  Data in => params /:userId
 * 
 *  returns => {avatar_pic_url}
 * 
 * authorization needed: logged in, correct user or admin
 */
router.post("/:userId/upload",ensureCorrectUserOrAdmin,upload.single('avatarPicUrl'),async function(req,res,next) {
    console.log(req)
    return res.json(req);
})



/** POST /:userFollowingId/follow/:userBeingFollowedId  => {userFollowingId,userBeingFollowedId}
 * 
 *  Follow A User
 * 
 *  Data in => params /:userFollowingId <int>/:userBeingFollowedId <int>
 * 
 *  returns => {userFollowingId,userBeingFollowedId}
 * 
 * authorization needed: logged in, correct user or admin
 */
router.post("/:userFollowingId/follow/:userBeingFollowedId",ensureCorrectUserOrAdmin,
check('userFollowingId').isNumeric(),check('userBeingFollowedId').isNumeric(),
async function(req,res,next) {
    let userFollowingId;
    let userBeingFollowedId;
    if(req.params.userFollowingId !== undefined) userFollowingId = +req.params.userFollowingId;
    if(req.params.userBeingFollowedId !== undefined) userBeingFollowedId = +req.params.userBeingFollowedId;
    try {
        validationResult(req).throw();
        const followedRes = await SocialConnections.follow(userFollowingId,userBeingFollowedId);
        return res.json({followedRes});
    } catch(err) {
        console.log(err.mapped())
        return next(err);
    }
});


/** DELETE /:userFollowingId/unfollow/:userBeingFollowedId 
 * 
 * data in => params /:userFollowingId <int>/unfollow/:userBeingFollowedId <int>
 * 
 * returns => {Success}
 * 
 * authorization needed: logged in, correct user or admin
 */
router.delete("/:userFollowingId/unfollow/:userBeingFollowedId",ensureCorrectUserOrAdmin,
check('userFollowingId').isNumeric(),check('userBeingFollowedId').isNumeric(),
async function(req,res,next) {
    let userFollowingId;
    let userBeingFollowedId;
    if(req.params.userFollowingId !== undefined) userFollowingId = +req.params.userFollowingId;
    if(req.params.userBeingFollowedId !== undefined) userBeingFollowedId = +req.params.userBeingFollowedId;

    try {
        validationResult(req).throw();
        await SocialConnections.unfollow(userFollowingId,userBeingFollowedId);
        return res.json({Success:`User ${userFollowingId} unfollowed user ${userBeingFollowedId}`});
    } catch(err) {
        console.log(err.mapped())
        return next(err);
    }
});


/**POST /:userId/like/:tripId => {userId,tripId}
 * 
 *  Like a Trip 
 * 
 * data needed => params /:userId <int>/like/:tripId <int>
 * 
 * returns => {userId,tripId}
 * 
 * authorization needed: logged in, correct user or admin
 */
router.post("/:userId/like/:tripId",ensureCorrectUserOrAdmin,
check('userId').isNumeric(),check('tripId').isNumeric(),
async function(req,res,next) {
    let userId;
    let tripId;
    if(req.params.userId !== undefined) userId = +req.params.userId;
    if(req.params.tripId !== undefined) tripId = +req.params.tripId;
    try {
        validationResult(req).throw();
        let likedRes = await SocialConnections.addLike({userId,tripId});
        return res.json({likedRes});
    } catch(err) {
        console.log(err.mapped())
        return next(err);
    }
});


/** DELETE /:userId/like/:tripId  => {userId,tripId}
 * 
 * data needed => params /:userId <int>/unlike/:tripId <int>
 * 
 * returns => {userId,tripId}
 * 
 * authorization needed: logged in, correct user or admin
 */
router.delete("/:userId/unlike/:tripId",ensureCorrectUserOrAdmin, 
check('userId').isNumeric(),check('tripId').isNumeric(),
async function(req,res,next) {
    let userId;
    let tripId;
    if(req.params.userId !== undefined) userId = +req.params.userId;
    if(req.params.tripId !== undefined) tripId = +req.params.tripId;
    try {
        validationResult(req).throw();
        let unlikedRes = await SocialConnections.unlike({userId,tripId});
        return res.json({unlikedRes});
    } catch(err) {
        console.log(err.mapped())
        return next(err);
    }
});
 

module.exports = router;


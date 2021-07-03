"use strict";

/** Routes for messages */
const path = require('path');
const jsonschema = require("jsonschema");
const express = require("express");
const multer = require("multer");
const { BadRequestError, UnauthorizedError } = require("../expressError");
const { ensureCorrectUserOrAdmin, ensureLoggedIn } = require("../middleware/auth");
const {body,check,validationResult} = require('express-validator');
const SocialConnections = require("../models/socialConnections");
const {profilePicStorage} = require("../config.js");
const e = require('express');
const router = new express.Router();
const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");

console.log(profilePicStorage)
//multer options
const storage = multer.diskStorage({
    destination: function(req, file, callback) {
      callback(null, profilePicStorage);
    },
    filename: (req, file, callback) => {
        const ext = file.mimetype.split("/")[1];
        callback(null, `${req.params.userId}-${file.fieldname}-${Date.now()}.${ext}`);
      },
  });

const upload = multer({
    storage: storage
})


/** GET /[username] => get user based on a username
 * 
 *  Data in =>  {username}
 * 
 * returns =>  {id,username,bio,follow_count,follower_count,avatar_pic_url}
 * 
 * authorization needed: logged in
 */
router.get("/:username",ensureLoggedIn,async function(req,res,next) {
    const username = req.params.username;
    try {
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
 * returns =>  {userData: {id,username,follow_count,follower_count,avatar_pic_url},
 *               following:[{id,username,follow_count,follower_count,avatar_pic_url},...]
 *               followers:[{id,username,follow_count,follower_count,avatar_pic_url},...]
 *              }
 * 
 * authorization needed: logged in, correct user or admin
 */
router.get("/:userId/connections",ensureCorrectUserOrAdmin,check('userId').isNumeric(),
async function(req,res,next) {
    let id;
    if(req.params.userId !== undefined) id = +req.params.userId;
    try {
        validationResult(req).throw();
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
        return next(err);
    }
});


/** PATCH /[:userId]/bio => 
 * 
 *  Edit bio of given user
 * 
 * Data in => params: :userId
 *            body: bioTxt
 * 
 * return {newBio}
 * 
 * authorization needed: logged in, correct user or admin
 */
router.patch("/:userId/bio",ensureCorrectUserOrAdmin,check('userId').isNumeric(),
async function(req,res,next) {
    let userId;
    if(req.params.userId !== undefined) userId = +req.params.userId;
    const body = req.body;
    if(!body.bioTxt) throw new BadRequestError(`Missing proper request body information. Need "bioTxt" string field`);
    const bioTxt = body.bioTxt
    try {
        validationResult(req).throw();
        const newBio = await SocialConnections.editBio({userId,bioTxt})
        return res.json({newBio})
    } catch(err) {
        return next(err)
    }
});

/** POST /[:userId]/[upload]  => 
 * 
 *  Upload An Image As A Profile Pic
 * 
 *  Data in => params: /:userId
 *             multipart form data: req.file => avatarPicUrl + file
 * 
 *  returns => {avatar_pic_url}
 * 
 * authorization needed: logged in, correct user or admin
 */
router.post("/:userId/upload",ensureCorrectUserOrAdmin,upload.single("avatarPicUrl"),check('userId').isNumeric(), 
async function(req,res,next) {
    console.log(req.file)
    let userId;
    let avatarPicUrl;
    let filename;
    if(req.file) {
        avatarPicUrl = req.file;
        filename = avatarPicUrl.filename;
    }
    if(req.params.userId !== undefined) userId = +req.params.userId;
    if(!req.headers.authorization) throw new UnauthorizedError('You are not authorized to get this file');
    if(+filename.split(/-/)[0] !== userId) throw new UnauthorizedError('You are not authorized to get this file');
    const token = req.headers.authorization;
    try {
        validationResult(req).throw();
        const newAvatar = await SocialConnections.uploadPicture({userId,filename,token})
        return res.json({newAvatar})
    } catch(err) {
        return next(err)
    }
})

/** GET /[:userId]/[uploads]/[:filename]  => 
 * 
 *  Get an image file from the server to display on the front end
 * 
 *  Data in => params: {userId, filename}
 *             
 *  returns =>  file
 * 
 * authorization needed: logged in, correct user or admin
 */
router.get("/:userId/uploads/:filename/:token",check('userId').isNumeric(), 
async function(req,res,next) {
    let filename = req.params.filename;
    let userId;
    if(req.params.userId !== undefined) userId = +req.params.userId;
    if(+filename.split(/-/)[0] !== userId) throw new UnauthorizedError('You are not authorized to get this file');
    let currentUser = jwt.verify(req.params.token,SECRET_KEY);
    try{
        if(currentUser.user_id === userId || currentUser.is_admin === true) {
            validationResult(req).throw();
            res.sendFile(filename,{root:path.join(process.env.IMAGES_PATH,'images/UserAvatars')})
        }
        else {
            throw new UnauthorizedError('You are not authorized to get this file')
        }
    } catch(err) {
        
        return next(err)
    }
})


/** POST /:userId/follow/:userBeingFollowedId  => {userId,userBeingFollowedId}
 * 
 *  Follow A User
 * 
 *  Data in => params /:userId <int>/:userBeingFollowedId <int>
 * 
 *  returns => {userId,userBeingFollowedId}
 * 
 * authorization needed: logged in, correct user or admin
 */
router.post("/:userId/follow/:userBeingFollowedId",ensureCorrectUserOrAdmin,
check('userId').isNumeric(),check('userBeingFollowedId').isNumeric(),
async function(req,res,next) {
    let userId;
    let userBeingFollowedId;
    if(req.params.userId !== undefined) userId = +req.params.userId;
    if(req.params.userBeingFollowedId !== undefined) userBeingFollowedId = +req.params.userBeingFollowedId;
    try {
        validationResult(req).throw();
        const followedRes = await SocialConnections.follow(userId,userBeingFollowedId);
        return res.json({followedRes});
    } catch(err) {
        
        return next(err);
    }
});


/** DELETE /:userId/unfollow/:userBeingFollowedId 
 * 
 * data in => params /:userId <int>/unfollow/:userBeingFollowedId <int>
 * 
 * returns => {Success}
 * 
 * authorization needed: logged in, correct user or admin
 */
router.delete("/:userId/unfollow/:userBeingFollowedId",ensureCorrectUserOrAdmin,
check('userId').isNumeric(),check('userBeingFollowedId').isNumeric(),
async function(req,res,next) {
    let userId;
    let userBeingFollowedId;
    if(req.params.userId !== undefined) userId = +req.params.userId;
    if(req.params.userBeingFollowedId !== undefined) userBeingFollowedId = +req.params.userBeingFollowedId;

    try {
        validationResult(req).throw();
        await SocialConnections.unfollow(userId,userBeingFollowedId);
        return res.json({Success:`User ${userId} unfollowed user ${userBeingFollowedId}`});
    } catch(err) {
         
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
         
        return next(err);
    }
});
 

module.exports = router;


"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");
const axios = require("axios");


class SocialConnections {

    /********************************************* */
            /** GENERAL DATABASE REQUESTS */
    /********************************************* */

    /**
     *  Get connections for given user
     * 
     *  Data should be {userId}
     * 
     * returns 
     *        { User_Data:{userId, username,bio,follow_count,follower_count,avatar_pic_url,member_status}
     *          Following:[{}]
     *          Followers:[{}]
     *        }
     */
    static async getConnections({userId}) {
        const userData = await db.query(
            `SELECT id AS "user_id",username,bio,follow_count,follower_count,avatar_pic_url,member_status
             FROM users
             WHERE id = $1`,[userId]
        );
        const user = userData.rows[0];
        if(!user) throw new NotFoundError(`No user Found with id of ${userId}`);

        const likedTrips = await this.getLikedTrips({userId});
        user.liked_trips = likedTrips;

        const followingData = await db.query(
            `SELECT id AS "user_id",username,bio,follow_count,follower_count,avatar_pic_url
             FROM users
             JOIN follows
             ON users.id = follows.user_being_followed_id
             WHERE follows.user_following_id = $1
            `,[userId]
        );
        const following = followingData.rows
    
        const followerData = await db.query(
            `SELECT id AS "user_id",username,bio,follow_count,follower_count,avatar_pic_url
             FROM users
             JOIN follows
             ON users.id = follows.user_following_id
             WHERE follows.user_being_followed_id = $1
             `,[userId]
        );
        const followers = followerData.rows;
    
        user.following = following;
        user.followers = followers;
        

        return user;
    }

     /**
     *  Get trips from people someone is following
     * 
     *  Data should be {userId}
     * 
     * returns Array of objects
     *        [{id,username,avatar_pic_url,waypoint_names,start_point,end_point,photo},etc]
     *   
     */
    static async getConnectionsTrips({userId}) {
        const tripData = await db.query(
            `SELECT users.id AS "user_id",users.username,users.avatar_pic_url,trips.id AS trip_id,
                    trips.waypoint_names,trips.start_point,trips.end_point,trips.photo::jsonb AS "photo",trips.like_count
             FROM users
             JOIN trips
             ON users.id = trips.user_id
             JOIN follows
             ON users.id = follows.user_being_followed_id
             WHERE follows.user_following_id = $1`,[userId]
        );
        
        const connectionsTrips = tripData.rows;
        return connectionsTrips;
    }

    /********************************************* */
          /** GETTING SPECIFIC USERS */
    /********************************************* */
    
    /**
     * Get a user based on a given username
     * 
     * data should be {username}
     * 
     * returns {id,username,bio,follow_count,follower_count,avatar_pic_url}
     */
    static async getUserByUsername({username}) {
        const queryResult = await db.query(
            `SELECT id AS "user_id",username,bio,follow_count,follower_count,avatar_pic_url 
             FROM users
             WHERE username = $1`,[username]
        );

        const foundUser = queryResult.rows[0];
        if(!foundUser) throw new NotFoundError(`Unable to find user ${username}`)

        return foundUser;
    }

    /********************************************* */
                /** EDIT USER INFO  */
    /********************************************* */

    /**
     *  Edit the bio of a given user
     *
     *  Data in should be {userId,bioTxt}
     * 
     *  Returns edited bio {bio}
     */
    static async editBio({userId,bioTxt}) {
        const queryResult = await db.query(
            `UPDATE users 
             SET bio = $1
             WHERE id = $2
             RETURNING bio`,[bioTxt,userId]
        );
        const newBio = queryResult.rows[0];
        if(!newBio) throw new NotFoundError(`Was not able to add bio for user ${userId}`);

        return newBio;
    }


    /********************************************* */
                /** FOLLOWS */
    /********************************************* */

    /**
     *  Create a social connection (follow people and get followers), remove connections, see date connection was created
     * 
     *  Data should be {id of person doing the following, id of person you want to follow}
     *     {userId,userBeingFollowedId}
     * 
     *  no returns
     */
    static async follow(userId,userBeingFollowedId) {
        const isAlreadyFollowing = await db.query(
            `SELECT user_being_followed_id 
            FROM follows
            WHERE user_being_followed_id = $1 AND user_following_id = $2`,
            [userBeingFollowedId,userId]);

        if(isAlreadyFollowing.rows[0]) throw new BadRequestError(`User Is Already Following User #${userBeingFollowedId}`);

        const queryResult = await db.query(
            `INSERT INTO follows (user_being_followed_id,user_following_id)
            VALUES ($1,$2) 
            RETURNING user_being_followed_id,user_following_id`,[userBeingFollowedId,userId]);
        
        let created = queryResult.rows[0];
        if(!created) throw new NotFoundError(`Was not able to add user #${userBeingFollowedId} and user #${userId} as a connection`)

        const addFollowForUser = await db.query(
            `UPDATE users 
             SET follow_count = follow_count + 1
             WHERE id = $1`,[userId]
        );
        const addFollowingForOtherUser = await db.query(
            `UPDATE users 
             SET follower_count = follower_count + 1
             WHERE id = $1`,[userBeingFollowedId]
        )

        
    }

    /**
     * Remove a connection (i.e. no longer follow specific user)
     * 
     * Data should be {id of person doing the following, id of person you want to follow}
     *              {userId,userBeingFollowedId}
     * 
     * no returns
     */
    static async unfollow(userId,userBeingFollowedId) {
        const queryResult = await db.query(
            `DELETE 
             FROM follows
             WHERE user_following_id = $1 AND user_being_followed_id = $2
             RETURNING user_following_id`,[userId,userBeingFollowedId]
        );
        const removed = queryResult.rows[0];
        if(!removed) throw new NotFoundError(`No connection between users ${userId} and ${userBeingFollowedId}`);

        const removeFollow = await db.query(
            `UPDATE users 
             SET follow_count = follow_count - 1
             WHERE id = $1`,[userId]
        );

    }

    
    /********************************************* */
                /** Likes */
    /********************************************* */
    
    /**
     * Simple select statement that handles getting all the liked trips of a user
     * 
     * Data in should be {user Id}
     * 
     * returns {trip_id,trip_id,etc...}
     */
    static async getLikedTrips({userId}) {
        const queryResult = await db.query(
            `SELECT trip_id
             FROM likes
             WHERE user_id = $1`,[userId]
        );

        const likedTrips = queryResult.rows
        return likedTrips;
    }


    /**
     * Like a trip from one of your connection's trips on the activtiy feed.
     * 
     *  Data should be {Id of user doing the liking, Id of the trip that is being liked}
     *                 {userId,tripId}
     * 
     * returns {userId,tripId}
     */
    static async addLike({userId,tripId}) {
        const isAlreadyLiked = await db.query(
            `SELECT id
            FROM likes
            WHERE user_id = $1 AND trip_id = $2`,
            [userId,tripId]);

        if(isAlreadyLiked.rows[0]) throw new BadRequestError(`User has already Liked trip ${tripId}`);

        const queryResult = await db.query(
            `INSERT INTO likes (user_id,trip_id)
             VALUES ($1,$2)
             RETURNING trip_id AS "trip_id"`,[userId,tripId]
        );
        const liked = queryResult.rows[0];
        if(!liked) throw new NotFoundError(`Couldn't add like for trip ${tripId} by user ${userId}`);

        const incrementLikeCount = await db.query(
            `UPDATE trips
             SET like_count = like_count + 1
             WHERE id = $1`,[tripId]
        );

        return liked;
    }

    /**
     * Remove a like by a user of a trip
     * 
     * Data should be {userId,tripId}
     * 
     * returns {userId,tripId}
     */
    static async unlike({userId,tripId}) {
        const queryResult = await db.query(
            `DELETE 
             FROM likes
             WHERE user_id = $1 AND trip_id = $2
             RETURNING trip_id AS "trip_id"`,[userId,tripId]
        );
        const unliked = queryResult.rows[0];
        if(!unliked) throw new NotFoundError(`Couldn't unliked the trip ${tripId}`)

        const decrementLikeCount = await db.query(
            `UPDATE trips
             SET like_count = like_count - 1
             WHERE id = $1`,[tripId]
        );

        
        return unliked;
    }

    /********************************************* */
            /** UPLOADING PROFILE PICTURES */
    /********************************************* */

    /**
     * Upload profile picture for given user
     * 
     * Data should be {userId,avatarPicUrl}
     * 
     * returns {Success: message string}
     */
    static async uploadPicture({userId,filename,token}) {
        if(filename) {
            const imagePath = `http://localhost:3001/users/${userId}/uploads/${filename}/${token}`
            const queryResult = await db.query(
                `UPDATE users
                 SET avatar_pic_url = $1
                 WHERE id = $2
                 RETURNING avatar_pic_url`,[imagePath,userId]
            );
            const avatar = queryResult.rows[0];
    
            if(!avatar) throw new NotFoundError(`Couldn't upload photo for user ${userId}`)

            return avatar;
        }
        else{
            throw new NotFoundError("No picture was submitted for upload")
        }
    }

    
}

module.exports = SocialConnections;
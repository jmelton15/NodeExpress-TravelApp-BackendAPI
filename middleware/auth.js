"use strict"; 

const jwt = require("jsonwebtoken");
const { SECRET_KEY } = require("../config");
const { UnauthorizedError } = require("../expressError");

function authenticateJWT(req,res,next) {
    try {
        const authHeader = req.headers.authorization;
        if(authHeader) {
          res.locals.user = jwt.verify(authHeader,SECRET_KEY);
        }
        return next(); 
    } catch(err) { 
        return next();
    }
}

/** Middleware to use when they must be logged in.
 *
 * If not, raises Unauthorized.
 */

 function ensureLoggedIn(req, res, next) {
    try {
      if (!res.locals.user) throw new UnauthorizedError();
      return next();
    } catch (err) {
      return next(err);
    }
  }
  
  
  /** Middleware to use when they be logged in as an admin user.
   *
   *  If not, raises Unauthorized.
   */
  
  function ensureAdmin(req, res, next) {
    try {
      if (!res.locals.user || !res.locals.user.is_admin) {
        throw new UnauthorizedError();
      }
      return next();
    } catch (err) {
      return next(err);
    }
  }
  
  /** Middleware to use when they must provide a valid token & be user matching
   *  username provided as route param.
   *
   *  If not, raises Unauthorized.
   */
  
  function ensureCorrectUserOrAdmin(req, res, next) {
    try {
      const user = res.locals.user;
      let userId = null;
      if(req.params) userId = req.params.userId ? +req.params.userId : +req.params.fromUserId;
      if(req.body && !userId) userId = req.body.fromUserId ? +req.body.fromUserId : +req.body.userId;
      console.log(userId);
      console.log(user);
      if (!(user && (user.is_admin || user.user_id === userId))) {
        throw new UnauthorizedError();
      }
      return next();
    } catch (err) {
      return next(err);
    }
  }

  /**
   *  Middleware that ensures a message can only be viewed by the user who sent it or the user it was sent to
   */
  function ensureToOrFromUser(req,res,next) {
    try {
      if (req.user.toUsername === req.params.toUsername || req.user.fromUsername === req.params.fromUsername ) {
        return next();
      } else {
        return next({ status: 401, message: "Unauthorized" });
      }
    } catch (err) {
      // errors would happen here if we made a request and req.user is undefined
      return next({ status: 401, message: "Unauthorized" });
    }
  }
  
  
  module.exports = {
    authenticateJWT,
    ensureLoggedIn,
    ensureAdmin,
    ensureCorrectUserOrAdmin,
  };
"use strict";

const express = require("express");
const cors = require("cors");

const {NotFoundError} = require("./expressError");
const morgan = require("morgan");

const { authenticateJWT } = require("./middleware/auth");
// const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/socialConnections");
const messagesRoutes = require("./routes/messages");


const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("tiny"));
app.use(authenticateJWT);

app.use("/users",usersRoutes);
app.use("/messages",messagesRoutes);
// app.disable('etag');

app.use(function(req,res,next) {
    return next(new NotFoundError());
})

app.use(function(err,req,res,next) {
    if(process.env.NODE_ENV !== "test") console.log(err.stack);
    const status = err.status || 500;
    const message = err.message;

    return res.status(status).json({
        error:{message,status},
    });
});

module.exports = app;
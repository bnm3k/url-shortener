"use strict";
const passport = require("passport");
const User = require("../../models/user");
const URL = require("../../models/URL");

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) next();
    else {
        req.flash("info", "You must be logged in to see this page.");
        res.redirect("/login");
    }
}

module.exports = app => {
    const redisClient = app.get("redisClient");
    if (!redisClient) throw "ErrorRedisClientNone";
    app.use((req, res, next) => {
        res.locals.currentUser = req.user;
        res.locals.errors = req.flash("error");
        res.locals.infos = req.flash("info");
        next();
    });

    app.get("/", (req, res, next) => {
        res.render("index", {
            isAuthenticated: req.isAuthenticated(),
            URLEntry: null
        });
    });

    app.get("/profile", ensureAuthenticated, async (req, res) => {
        try {
            const customURLs = await URL.find(
                { createdBy: req.user.id },
                "-createdBy -_id"
            )
                .sort({ createdAt: "descending" })
                .lean()
                .exec();
            const hits = await redisClient.mget(
                customURLs.map(e => "hits:" + e.shortURLCode)
            );
            customURLs.forEach((e, i) => {
                e.createdAt = e.createdAt.toDateString();
                e.hits += parseInt(hits[i]) || 0;
            });
            res.render("profile", { user: req.user, customURLs });
        } catch (error) {
            console.error(error);
            res.status(500).json({ error });
        }
    });

    app.get("/signup", (req, res, next) => {
        res.render("signup");
    });

    app.post(
        "/signup",
        async (req, res, next) => {
            const username = req.body.username;
            const password = req.body.password;
            User.findOne({ username: username }, async (err, user) => {
                if (err) return next(err);
                if (user) {
                    req.flash("error", "User already exists");
                    return res.redirect("/signup");
                }
                const newUser = new User({
                    username: username,
                    password: password
                });
                await newUser.save();
                next();
            });
        },
        passport.authenticate("login", {
            successRedirect: "/",
            failureRedirect: "/signup",
            failureFlash: true
        })
    );

    app.get("/login", function(req, res) {
        console.log("JERE");
        res.render("login");
    });

    app.post(
        "/login",
        passport.authenticate("login", {
            successRedirect: "/",
            failureRedirect: "/login",
            failureFlash: true
        })
    );

    app.get("/logout", (req, res) => {
        req.logout();
        res.redirect("/");
    });
};

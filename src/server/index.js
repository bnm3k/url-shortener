"use strict";
const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const nconf = require("nconf");
const path = require("path");
const cookieParser = require("cookie-parser");
const expressSession = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");

const connectToMongoDB = require("../lib/mongo/mongo");
const connectToRedis = require("../lib/redis/redis");
const getURLHandlers = require("../lib/url/URLHandlers");
const setupURLRoutes = require("../lib/url/setupURLRoutes");
const setupUserRoutes = require("../lib/user/setupUserRoutes");
const setUpPassport = require("../lib/setupPassport");

//
//

nconf.argv().env("__");
nconf.defaults({ conf: path.resolve(__dirname, "../config.json") });
nconf.file(nconf.get("conf"));

const NODE_ENV = nconf.get("NODE_ENV");
const isDev = NODE_ENV === "development";

const setupServer = app => {
    setUpPassport();

    app.set("port", nconf.get("port"));
    app.set("x-powered-by", false);

    app.set("views", path.resolve(__dirname, "../views/"));
    app.set("view engine", "ejs");
    app.use(express.static(path.resolve(__dirname, "../static")));

    app.use(morgan("dev"));

    //SETUP SESSIONS
    app.use(bodyParser.urlencoded({ extended: false }));
    app.use(bodyParser.json());
    app.use(cookieParser());
    if (!isDev) {
        const FileStore = require("session-file-store")(expressSession);
        app.use(
            expressSession({
                secret: "abc123efg456", //pull from nconf in production
                resave: false,
                saveUninitialized: false,
                store: new FileStore()
            })
        );
    } else {
        const redis = require("redis");
        const client = redis.createClient(nconf.get("redis"));
        const RedisStore = require("connect-redis")(expressSession);
        app.set("redisClientSessions", client);
        app.use(
            expressSession({
                resave: false,
                saveUninitialized: false,
                secret: "abc123efg456",
                store: new RedisStore({ client })
            })
        );
    }
    app.use(flash());
    app.use(passport.initialize());
    app.use(passport.session());

    app.use((err, req, res, next) => {
        res.status(500).send("Internal Server Error");
    });
};

const handleAppErr = app => {
    function cleanup() {
        const redisClient = app.get("redisClient");
        if (redisClient) redisClient.quit();

        const redisClientSessions = app.get("redisClientSessions");
        if (redisClientSessions) redisClientSessions.quit();
    }

    process.on("uncaughtException", err => {
        console.error(`process.on uncaughtException: ${err}\n`);
        process.exit();
    });

    process.on("SIGINT", () => {
        console.log(`process.on SIGINT`);
        process.exit();
    });

    process.on("exit", () => {
        console.log("exiting...");
        cleanup();
    });
};

const main = async () => {
    //APP
    const app = express();
    handleAppErr(app);

    //MONGODB
    const mongoClient = await connectToMongoDB(nconf.get("mongo"));
    console.log("Connected to MongoDB");

    //REDIS
    const redisClient = connectToRedis(nconf.get("redis"));
    app.set("redisClient", redisClient);
    redisClient.on("error", error => {
        if (error.code === "ECONNREFUSED") throw error;
        else console.error(error);
    });
    console.log("Connected to Redis");

    //APP URL, USER ROUTES & HANDLERS
    setupServer(app);
    setupUserRoutes(app);
    setupURLRoutes(app, getURLHandlers({ redisClient }));
    app.use((_, res) => res.status(404).send("Not found"));

    console.log("set up controllers & routes complete");

    //START APP
    const port = app.get("port");
    app.listen(port, () => {
        console.log(`Server started on port: ${port}`);
    });
};

main().catch(error => {
    console.error(error);
});

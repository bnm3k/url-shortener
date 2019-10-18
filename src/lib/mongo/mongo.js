"use strict";
const mongoose = require("mongoose");

mongoose.Promise = global.Promise;

const connect = ({ host, port, dbName }, handleConnectionError) => {
    const uri = `mongodb://${host}:${port}/${dbName}`;
    if (!handleConnectionError) handleConnectionError = err => {};
    mongoose.connection.on("error", handleConnectionError);
    return mongoose.connect(uri, {
        useNewUrlParser: true,
        useCreateIndex: true,
        keepAlive: true,
        reconnectTries: Number.MAX_VALUE
        // user: ...
        //pass: ...
    });
};
module.exports = connect;

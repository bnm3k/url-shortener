"use strict";

const redis = require("async-redis");

module.exports = ({ port, host }) => redis.createClient(port, host);

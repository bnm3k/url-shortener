"use strict";
const validUrl = require("valid-url");
const shortid = require("shortid");
const URL = require("../../models/URL");
const asyncRedis = require("async-redis");

const addURL = async (shortURLCode, originalURL, createdBy = null) => {
    try {
        const item = new URL({
            originalURL,
            shortURLCode,
            createdBy
        });
        await item.save();
        return item;
    } catch (error) {
        throw "InvalidShortURLCode";
    }
};

const getShortenURLFunc = redisClient => async (
    originalURL,
    createdBy = null
) => {
    if (validUrl.isUri(originalURL)) {
        let URLEntry = await URL.findOne({ originalURL, createdBy })
            .lean()
            .exec();

        if (!URLEntry) {
            const shortURLCode = shortid.generate();
            const results = await Promise.all([
                addURL(shortURLCode, originalURL, createdBy),
                redisClient.set(shortURLCode, originalURL)
            ]);
            return results[0].shortURLCode;
        } else {
            return URLEntry.shortURLCode;
        }
    } else {
        throw "InvalidOriginalURL";
    }
};

const getExpandURLFunc = redisClient => async shortURLCode => {
    //caller should handle error

    let originalURL = await redisClient.get(shortURLCode);
    if (originalURL) return originalURL;

    let URLEntry = await URL.findOne({ shortURLCode }, "originalURL")
        .lean()
        .exec();
    if (URLEntry) return URLEntry.originalURL;
    else throw "InvalidURLCode";
};

const getincrementHitsURL = redisClient => async shortURLCode => {
    try {
        await redisClient.incr("hits:" + shortURLCode);
        console.log(`Incremented counter for ${shortURLCode}`);
    } catch (err) {
        console.log(err);
    }
};

module.exports = ({ redisClient }) => {
    URL.find({}, "originalURL shortURLCode -_id")
        .lean()
        .exec((err, urls) => {
            if (err) throw err;
            urls.forEach(({ shortURLCode, originalURL }) => {
                redisClient.set(shortURLCode, originalURL);
            });
        });
    return {
        shortenURL: getShortenURLFunc(redisClient),
        expandURL: getExpandURLFunc(redisClient),
        incrementHitsURL: getincrementHitsURL(redisClient)
    };
};

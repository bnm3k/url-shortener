"use strict";
const mongoose = require("mongoose");

const { Schema } = mongoose;
const URLSchema = new Schema({
    originalURL: {
        type: String,
        required: true
    },
    shortURLCode: {
        type: String,
        required: true,
        unique: true
    },
    hits: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        default: null
    }
});

const URL = mongoose.model("URL", URLSchema);

module.exports = URL;

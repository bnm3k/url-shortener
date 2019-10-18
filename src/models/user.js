"use strict";
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const SALT_FACTOR = 10;
const { Schema } = mongoose;

const userSchemaOptions = {
    strict: "throw",
    strictQuery: true
};

const userSchema = Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true
        },
        password: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    },
    userSchemaOptions
);

userSchema.methods.name = function() {
    return this.username;
};

userSchema.pre("save", function(done) {
    const user = this;
    if (!user.isModified("password")) return done();

    bcrypt.genSalt(SALT_FACTOR, function(err, salt) {
        if (err) return done(err);
        bcrypt.hash(user.password, salt, function(err, hashedPassword) {
            if (err) return done(err);
            user.password = hashedPassword;
            done();
        });
    });
});

userSchema.methods.checkPassword = function(guess, done) {
    bcrypt.compare(guess, this.password, function(err, isMatch) {
        done(err, isMatch);
    });
};

// //cb function(err, results){...}
// userSchema.methods.getURLsCreated = function(cb) {
//     return this.model("User").find;
// };
// //Since virtuals are not stored in MongoDB, you can't query with them.
// userSchema.virtual("name").get(function() {
//     return this.displayName || this.username;
// });

const User = mongoose.model("User", userSchema);
module.exports = User;

//db.urls.find({ _id: { $in: user.urls}}).toArray()

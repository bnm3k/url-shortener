"use strict";

module.exports = (app, { shortenURL, expandURL, incrementHitsURL }) => {
    //GET FORM TO SUBMIT URL FOR SHORTENING
    app.get("/url", function(req, res) {
        res.render("url", { isAuthenticated: req.isAuthenticated() });
    });

    //POST API for creating short Url from original URL
    app.post("/url", async (req, res) => {
        const { originalURL, makeCustom } = req.body;
        try {
            const createdBy =
                req.isAuthenticated() && makeCustom ? req.user.id : null;
            const shortURLCode = await shortenURL(originalURL, createdBy);
            const URLEntry = { originalURL, shortURLCode };
            res.render("index", {
                isAuthenticated: req.isAuthenticated(),
                URLEntry
            });
        } catch (error) {
            console.error(error);
            req.flash("error", "Invalid URL");
            return res.status(404).redirect("/");
        }
    });
    //GET API for redirecting to Original URL
    app.get("/u/:shortURLCode", async (req, res) => {
        const { shortURLCode } = req.params;
        try {
            await incrementHitsURL(shortURLCode);
            const originalURL = await expandURL(shortURLCode);
            return res.status(200).json({ originalURL, shortURLCode });
        } catch (error) {
            console.error(error);
            return res.status(404).json({ error: "error" });
        }
    });

    //POST API for creating short Url from original URL
};

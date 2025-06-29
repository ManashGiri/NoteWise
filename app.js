const express = require("express");
const app = express();
const mongoose = require("mongoose");
const MongoStore = require("connect-mongo");
const flash = require("connect-flash");
const passport = require("passport");
const passportLocal = require("passport-local");
const User = require("./models/user.js");
const Conversation = require("./models/conversation");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const session = require("express-session");
const { isLoggedIn } = require("./middleware");
const { error } = require("console");

if (process.env.NODE_ENV != "production") {
    require('dotenv').config();
}

const MONGO_URL = process.env.DB_URL;

main()
    .then(() => {
        console.log("Connected to DB");
    })
    .catch((err) => {
        console.log(err);
    });

async function main() {
    await mongoose.connect(MONGO_URL);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

const store = MongoStore.create({
    mongoUrl: MONGO_URL,
    crypto: {
        secret: process.env.SECRET,
    },
    touchAfter: 24 * 60 * 60,
});

store.on("error", () => {
    console.log("ERROR in MONGO SESSION STORE", err);
});

const sessionOptions = {
    store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
}

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new passportLocal(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.curUser = req.user;
    next();
});


// const openai = new OpenAI({
//     base_url: "https://openrouter.ai/api/v1",
//     apiKey: "",
// });

// app.post("/chat", async (req, res) => {
//     const userMessage = req.body.message;
// });

app.post('/chat', isLoggedIn, async (req, res) => {
    const { message, action } = req.body;

    const prompt =
        action === 'summarize'
            ? `Summarize the following notes in short, precise, easy to understand points: \n${message}`
            : action === 'quiz' ?
                `Make a short MCQ quiz from these notes: (One question at a time with 4 options and don't tell me the answers) \n${message}` 
                : `${message}`;

    const count = await Conversation.countDocuments({ user: req.user._id});
    if (count >= 50) {
        await Conversation.find({ user: req.user._id }).sort({createdAt: 1}).limit(2)
        .then( async (docs) => {
            const ids = docs.map(d => d._id);
            await Conversation.deleteMany({ _id: { $in: ids}});
        });
    }

    const messages = await Conversation.create({
        user: req.user._id, role: "user", content: prompt
    });

    const previousMsgs = await Conversation.find({ user: req.user._id }).sort({ createdAt: 1 });
    console.log(previousMsgs);

    try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.AIKEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "mistralai/mistral-7b-instruct",
                messages: previousMsgs,
            }),
        });

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content;


        // res.json({ reply });
        await Conversation.create({
            user: req.user._id, role: "assistant", content: reply
        });

        res.send(`${reply}`);
    } catch (err) {
        console.error(err);
        res.status(500).json({ err: "AI request failed", details: error.message });
    }
});

app.get("/", (req, res) => {
    res.render("index.ejs");
});

app.get("/signup", (req, res) => {
    res.render("users/signup.ejs")
});

app.post("/signup", async (req, res) => {
    try {
        let { email, username, password } = req.body;
        let newUser = new User({ email, username });
        let registeredUser = await User.register(newUser, password);
        req.login(registeredUser, (err) => {
            if (err) {
                return next(err);
            }
            req.flash("success", `Your smart learning begins now!`);
            let redirectUrl = "/";
            res.redirect(redirectUrl);
        });
    } catch (e) {
        req.flash("error", e.message);
        res.redirect("/signup");
    }
});

app.get("/login", (req, res) => {
    res.render("users/login.ejs")
});

app.post("/login",
    passport.authenticate("local", { failureRedirect: "/login", failureFlash: true }),
    (req, res) => {
        let { username } = req.body;
        req.flash("success", `Hi ${username}, your smart learning continues!`);
        let redirectUrl = "/";
        res.redirect(redirectUrl);
    }
);

app.get("/logout", (req, res) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash("success", "Thank you for visiting us. Have a nice day!");
        res.redirect("/");
    });
});

app.listen(3000, () => {
    console.log("Server is listening to port 3000");
});
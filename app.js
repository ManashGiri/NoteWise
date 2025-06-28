const express = require("express");
const app = express();
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");

if(process.env.NODE_ENV != "production") {
    require('dotenv').config();
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));

// const openai = new OpenAI({
//     base_url: "https://openrouter.ai/api/v1",
//     apiKey: "",
// });

(async () => {
    try {

        const completion = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.AIKEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "mistralai/mistral-7b-instruct",
                messages: [
                    {
                        "role": "user",
                        "content": "Prepare me a mcq of 10 questions about astromony one by one with 4 options",
                    },
                ],
            }),
        });

        // const completion = await openai.chat.completions.create({
        //     // extra_headers: [{
        //     //     "HTTP-Referer": "localhost:3000",
        //     //     "X-Title": "NoteWise/1.0",
        //     // },
        //     // ],
        //     model: "mistralai/mistral-7b-instruct",
        //     messages: [
        //         {
        //             "role": "user",
        //             "content": "write a haiku about ai",
        //         },
        //     ],
        // });

        // completion.then((result) => console.log(result.choices[0].message));
        const data = await completion.json();
        console.log(data.choices?.[0]?.message?.content);

    } catch (err) {
        console.error("API Error", err);
    }
})();


app.get("/", (req, res) => {
    res.render("users/login.ejs");
});

app.get("/signup", (req, res) => {
    res.render("users/signup.ejs")
});

app.get("/login", (req, res) => {
    res.render("users/login.ejs")
});

app.listen(3000, () => {
    console.log("Server is listening to port 3000");
});
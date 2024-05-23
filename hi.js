require("dotenv").config();
const express = require("express");
const session = require("express-session");
// const fetch = require("node-fetch");
const querystring = require("querystring");
const crypto = require("crypto");

function base64URLEncode(str) {
  return str
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest();
}

const app = express();
const port = 3000;

// Set up session middleware
app.use(
  session({
    secret: "your_secret",
    resave: false,
    saveUninitialized: true,
  })
);

// Routes
app.get("/login", (req, res) => {
  const state = Math.random().toString(36).substring(2);
  req.session.state = state;
  const codeVerifier = base64URLEncode(crypto.randomBytes(32));
  const codeChallenge = base64URLEncode(sha256(codeVerifier));

  req.session.codeVerifier = codeVerifier;

  const params = querystring.stringify({
    response_type: "code",
    client_id: process.env.CLIENT_ID,
    redirect_uri: `http://localhost:3000/callback`,
    scope: "tweet.write tweet.read users.read offline.access",
    code_challenge: codeChallenge,
    state: state,
    code_challenge_method: "S256",
  });

  const authorizationUrl = `https://twitter.com/i/oauth2/authorize?${params}`;
  console.log("Authorization URL:", authorizationUrl); // Debug: Log the authorization URL
  res.redirect(authorizationUrl);
});

app.get("/callback", async (req, res) => {
  const { code, state } = req.query;

  if (state !== req.session.state) {
    console.log("State mismatch:", state, req.session.state);
    return res.status(403).send("State mismatch");
  }

  const codeVerifier = req.session.codeVerifier;
  if (!codeVerifier) {
    return res.status(500).send("Code verifier is missing from session.");
  }

  try {
    const tokenResponse = await fetch(
      "https://api.twitter.com/2/oauth2/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${Buffer.from(
            `${process.env.CLIENT_ID}:${process.env.CLIENT_SECRET}`
          ).toString("base64")}`,
        },
        body: querystring.stringify({
          code: code,
          grant_type: "authorization_code",
          redirect_uri: `http://localhost:3000/callback`,
          code_verifier: codeVerifier,
        }),
      }
    );

    const tokenData = await tokenResponse.json();
    console.log("Token response:", tokenData);

    if (tokenResponse.ok) {
      req.session.accessToken = tokenData.access_token;
      res.redirect("/tweet");
    } else {
      console.error("Error fetching access token:", tokenData);
      res.status(500).send("Error fetching access token");
    }
  } catch (error) {
    console.error("Error during callback:", error);
    res.status(500).send("Error during callback");
  }
});

app.get("/tweet", async (req, res) => {
  const accessToken = req.session.accessToken;

  if (!accessToken) {
    console.log("No access token, redirecting to login"); // Debug: Log no access token
    return res.redirect("/login");
  }

  try {
    const tweetResponse = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: "Hello, I am Bhasksar raddy1" }),
    });

    const tweetData = await tweetResponse.json();
    console.log("Tweet response:", tweetData); // Debug: Log tweet response

    if (tweetResponse.ok) {
      res.send(tweetData);
    } else {
      console.error("Error posting tweet:", tweetData);
      res.status(500).send("Error posting tweet");
    }
  } catch (error) {
    console.error("Error during tweeting:", error); // Debug: Log tweeting error
    res.status(500).send("Error during tweeting");
  }
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});

require("dotenv").config();
const { TwitterApi } = require("twitter-api-v2");

const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
});

function input(prompt) {
  return new Promise((resolve) => {
    readline.question(prompt, (answer) => {
      readline.close();
      resolve(answer);
    });
  });
}

(async () => {
  try {
    const client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY,
      appSecret: process.env.TWITTER_API_SECRET_KEY,
      accessToken: process.env.TWITTER_ACCESS_TOKEN,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
    });

    const tweetText = await input("Enter your tweet text: ");
    const response = await client.v2.tweet(tweetText);
    console.log("Tweet response:", response);
  } catch (error) {
    console.error("Error:", error);
  }
})();

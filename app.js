const express = require('express');
const axios = require('axios');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const dotenv = require('dotenv');

const app = express();

dotenv.config({path: '.env'})

// Set up GitHub OAuth config
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = process.env.REDIRECT_URI;

// Set up session and cookie middleware
app.use(session({
    secret: 'mysecretkey',
    resave: false,
    saveUninitialized: true
}));

app.use(cookieParser());

// Define functions to retrieve user data from GitHub
async function getUserData(accessToken) {
    const userUrl = 'https://api.github.com/user';
    const response = await axios.get(userUrl, {
      headers: {
        'accept': 'application/json',
        'authorization': `token ${accessToken}`
      }
    });
    return response.data;
}

//get user profile
async function getUserProfile(accessToken, username) {
    const profileUrl = `https://api.github.com/users/${username}`;
    const response = await axios.get(profileUrl, {
      headers: {
        'accept': 'application/json',
        'authorization': `token ${accessToken}`
      }
    });
    return response.data;
}

//get user follower
async function getUserFollowers(accessToken, username) {
    const followersUrl = `https://api.github.com/users/${username}/followers`;
    const response = await axios.get(followersUrl, {
      headers: {
        'accept': 'application/json',
        'authorization': `token ${accessToken}`
      }
    });
    return response.data;
}


// Define routes
app.get('/', async (req, res) => {
    if (req.cookies.githubAccessToken) {
      const userData = await getUserData(req.cookies.githubAccessToken);
      const userProfile = await getUserProfile(req.cookies.githubAccessToken, userData.login);
      const userFollowers = await getUserFollowers(req.cookies.githubAccessToken, userData.login);
      res.send(`
        <h1>Welcome ${userData.login}!</h1>
        <p>Your name is ${userProfile.name} and your bio is ${userProfile.bio}.</p>
        <p>You have ${userFollowers.length} followers.</p>
        <a href="/logout">Logout</a>
      `);
    } else {
      res.send('<a href="/auth/github">Login with GitHub</a>');
    }
});

app.get('/auth/github', (req, res) => {
    const url = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}`;
    res.redirect(url);
});

app.get('/auth/github/callback', async (req, res) => {
    const code = req.query.code;
    const tokenUrl = 'https://github.com/login/oauth/access_token';
    const params = {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code: code,
      redirect_uri: REDIRECT_URI
    };
    try {
      // Get access token from GitHub
      const response = await axios.post(tokenUrl, params, {
        headers: {'accept': 'application/json'}
      });
      const accessToken = response.data.access_token;
  
      // Save access token in a cookie
      res.cookie('githubAccessToken', accessToken, {httpOnly: true});
  
      // Redirect to home page
      res.redirect('/');
    } catch (error) {
      console.error(error);
      res.send('An error occurred while logging in with GitHub.');
    }
  });
  
  app.get('/logout', (req, res) => {
    res.clearCookie('githubAccessToken');
    res.redirect('/');
});

// Start server
app.listen(3000, () => {
    console.log('Server listening on port 3000');
});
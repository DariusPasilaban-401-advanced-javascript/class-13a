'use strict';

// 3rd Party Resources
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const superagent = require('superagent');


// Esoteric Resources
const oauth = require('./yahoo.js');

// Prepare the express app
const app = express();

// App Level MW
app.use(cors());

// Website Files
app.use(express.static('./public'));

// Routes
app.get('/oauth', async (req, res, next) => {
  console.log('get route');

  let code = req.query.code; // oauth gives us a code to make a request for the token

  // let tokenURL = 'https://github.com/login/oauth/access_token';
  let tokenURL = 'https://api.login.yahoo.com/oauth2/get_token';
  let remoteUserURL = 'https://api.github.com/user';

  try {

    // STEP#3 first exchange an access code for an access token
    const access_token = await exchangeCodeForToken(code);

    // STEP#4 Now that we have the toke, we can use this to get data about the user
    const userData = await getRemoteUserData(access_token);

    // STEP#5 Using our userData from the AUth Provider, we can create our own User to relate any resources this user creates
    //  the goal here is to send back a token from this user we created.
    const token = await createAPIUser(userData);

    res.send(token);
  } catch (e) {
    console.log(e);

    res.status(400).send("Something went wrong");
  }


  // confirm that a request was made and get a token for user data
  async function exchangeCodeForToken(code) {
    let tokenRequest = await superagent.post(tokenURL)
      .send({
        // code: code,
        // client_id: process.env.CLIENT_ID,
        // client_secret: process.env.CLIENT_SECRET,
        // redirect_uri: process.env.REDIRECT_URI,
        // grant_type: 'authorization_code'

        client_id: process.env.CLIENT_ID,
        redirect_uri: process.env.redirect_uri,
        response_type: code,
        scope:'openid%20mail-r',
        nonce:'2762b2550b993376c4b7c547fdedaebf3f3cd8ef'
      });

    let access_token = tokenRequest.body.access_token;

    return access_token;
  }

  // use the access_token to request information about the user
  async function getRemoteUserData(token) {
    console.log('token from code', token);
    let userRequest = await superagent.get(remoteUserURL)
      .set('User-Agent', 'express') // specific to githubs requirement for requesting data
      .set('Authorization', `token ${token}`);

    let user = userRequest.body;

    return user;
  }

  // This creates our own user and creates a token
  async function createAPIUser(userdata) {
    const newUser = new Users({ username: userdata.login });
    const savedUser = await newUser.save();

    const token = savedUser.generateToken();

    return token;
  }

  // res.status(200).send(req.token);
});

module.exports = {
  server: app,
  start: (port) => {
    app.listen(port, () => {
      console.log(`Server Up on ${port}`);
    });
  },
};
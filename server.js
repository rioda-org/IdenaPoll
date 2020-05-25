const express = require('express');
const app = express();
const NodeCache = require('node-cache');
const {v4: uuidv4} = require('uuid');
const {checkSignature} = require('./ether');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const request = require('request');
const fetch = require('node-fetch');
app.use(cors());
app.listen(8000, () => {
  console.log('Server started!')
});
const sessionCache = new NodeCache({
  stdTTL: 60 * 5,
  checkperiod: 60,
});
const SESSION_COOKIE_TIME = 5 * 60 * 1000;
const AUTH_COOKIE_TIME = 24 * 60 * 60 * 1000;
app.use(bodyParser.json());
app.use(bodyParser.text());
app.use(cookieParser());
const IDENA_SESSION_TOKEN_COOKIE = 'IDENA_SESSION_TOKEN';
const IDENA_AUTH_COOKIE = 'IDENA_AUTH';
app.route('/auth/v1/logout').post((req, res) => {
  const session = req.cookies[IDENA_AUTH_COOKIE];
  if (session) {
    res.clearCookie(IDENA_AUTH_COOKIE);
    return res.json()
  }
});

app.route('/auth/v1/new-token').get((_, res) => {
  const token = uuidv4();
  res.cookie(IDENA_SESSION_TOKEN_COOKIE, token, {
    maxAge: SESSION_COOKIE_TIME,
    httpOnly: true,
  });
  res.set('Access-Control-Allow-Origin', [_.header('origin')]);
  res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.append('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Credentials', 'true');
  return res.json({token})
});

app.route('/auth/v1/start-session').post((req, res) => {
  const {token, address} = req.body;
  const nonce = `signin-${uuidv4()}`;
  sessionCache.set(token, {address, nonce});
  return res.json({success: true, data: {nonce}})
});

app.route('/auth/v1/authenticate').post((req, res) => {
  const {token, signature} = req.body;

  const cacheValue = sessionCache.get(token);
  if (!cacheValue) {
    return res.json({
      success: false,
      data: {
        authenticated: false,
      },
    })
  }

  const address = checkSignature(cacheValue.nonce, signature);

  if (address.toLowerCase() !== cacheValue.address.toLowerCase()) {
    return res.json({
      success: false,
      data: {
        authenticated: false,
      },
    })
  }

  sessionCache.set(token, {...cacheValue, authenticated: true});

  return res.json({
    success: true,
    data: {
      authenticated: true,
    },
  })
});
app.route('/auth/v1/session').get((req, res) => {
  res.set('Access-Control-Allow-Origin', [req.header('origin')]);
  res.append('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.append('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Credentials', 'true');
  const session = req.cookies[IDENA_AUTH_COOKIE];
  if (session) {
    return res.json({authenticated: true, address: session.address})
  }

  if (req.query.onlyCheck) {
    return res.sendStatus(403)
  }

  const sessionToken = req.cookies[IDENA_SESSION_TOKEN_COOKIE];
  if (sessionToken) {
    const data = sessionCache.get(sessionToken);
    if (data) {
      const {address, authenticated} = data;
      if (authenticated) {
        res.clearCookie(IDENA_SESSION_TOKEN_COOKIE);
        res.cookie(
          IDENA_AUTH_COOKIE,
          {authenticated: true, address},
          {
            maxAge: AUTH_COOKIE_TIME,
            httpOnly: true,
          }
        );
        return res.status(200).json({authenticated: true, address})
      }
    }
  }

  return res.sendStatus(403)
});
app.route("/vote").post(async (req, res) => {
  res.set('Access-Control-Allow-Origin', [req.header('origin')]);
  res.append('Access-Control-Allow-Methods', 'POST');
  res.append('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Credentials', 'true');
  const body = JSON.parse(req.body);
  const {poll, option} = body;
  const voter = req.cookies[IDENA_AUTH_COOKIE].address;
  let headers = {
    'Origin': 'localhost:8000',
    'Content-Type': 'application/json'
  };
  let status= {status: "ok"};
  const fe= await fetch("http://localhost/polls/" + poll, {method: 'GET'});
  const polljs= await fe.json();
    let found;
    for (o of polljs.options) {
      let search = o.votes.find((v) => {
        return v.voter === voter
      });

      found = search !== undefined ? search : found;
    }
    if (found == null) {
      polljs.options[option].votes.push({
        voter: voter
      });
      let headers = {
        'Origin': 'localhost:8000',
        'Content-Type': 'application/json'
      };
      const fe= await fetch("http://localhost:80/polls/"+poll, {method: 'PATCH', body: JSON.stringify(polljs), headers: headers});
      const jsonres= await fe.json();
    }
    else {
      status={status: "dup"}
    }
   return res.status(200).json(status);
});

app.route("/create").post(async (req, res, next) => {
  res.set('Access-Control-Allow-Origin', [req.header('origin')]);
  res.append('Access-Control-Allow-Methods', 'POST');
  res.append('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Allow-Credentials', 'true');
  const poll = req.body;
  let headers = {
    'Origin': 'localhost:8000',
    'Content-Type': 'application/json'
  };
  const fe= await fetch("http://localhost:80/polls", {method: 'POST', body: JSON.stringify(poll), headers: headers})
  const json= await fe.json();
  return res.status(200).json(json);

});


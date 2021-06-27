import express from 'express'
import dotenv from 'dotenv'
import bodyParser from 'body-parser';

import Auth from './auth.js'

dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use((req, res, next) => {
  req.originalPath = req.baseUrl + req.path;
  req.remoteIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  next();
});

app.listen(process.env.httpPort, () =>  console.log(`[HTTPS][INFO] Server startup :${process.env.httpPort}`) );

app.post('/login', (req, res) => {
  const login_result = Auth.login(req.body.id, req.body.pw);
  if(login_result) res.status(201).send(login_result);
  else res.status(401).send();
});

app.post('/autologin', (req, res) => {
  const login_result = Auth.autologin(req.body.jwt);
  if(login_result) res.status(201).send(login_result);
  else res.status(401).send();
});

export default app

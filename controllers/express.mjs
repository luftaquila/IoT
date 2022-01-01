import express from 'express'
import wol from 'node-wol'
import dotenv from 'dotenv'
import bodyParser from 'body-parser'

import Auth from './auth.mjs'
import devices, { DeviceType } from '../devices/device.mjs'
import logger from './logger.mjs'

dotenv.config();

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use((req, res, next) => {
  req.originalPath = req.baseUrl + req.path;
  req.remoteIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  next();
});

app.listen(process.env.httpPort, () => logger('WEBAPI', 'INFO', `Server startup :${process.env.httpPort}`) );


app.post('/login', (req, res) => {
  const login_result = Auth.login(req.body.id, req.body.pw);
  if(login_result) {
    res.status(201).send(login_result);
    logger('WEBAPI', 'INFO', `Client login: ${req.body.id}(${req.remoteIP})`);
  }
  else {
    res.status(401).send(`authentication failed`);
    logger('WEBAPI', 'INFO', `Client login failure: ${req.remoteIP}`);
  }
});

app.post('/autologin', (req, res) => {
  const login_result = Auth.verify(req.header('jwt'));
  if(login_result) {
    res.status(201).send(login_result);
    logger('WEBAPI', 'INFO', `Client autologin: ${login_result.id}(${req.remoteIP})`);
  }
  else {
    res.status(401).send(`authentication failed`);
    logger('WEBAPI', 'INFO', `Client autologin failure: ${req.remoteIP}`);
  }
});


// device info lookup
app.get('/device/all', (req, res) => {
  if(!Auth.verify(req.header('jwt'))) res.status(401).send(`authentication failed`);
  else res.status(200).send(Array.from(devices.values()).map(x => x.info));
  logger('WEBAPI', 'INFO', `Device lookup: ALL from: ${req.remoteIP} {${res.statusCode}}`);
});

app.get('/device/:deviceId', (req, res) => {
  const device = devices.get(req.params.deviceId);
  if(device) res.status(200).send(device.info);
  else res.status(404).send(`device ${req.params.deviceId} not found.`);
  logger('WEBAPI', 'INFO', `Device lookup: ${req.params.deviceId} from: ${req.remoteIP} {${res.statusCode}}`);
});


// update device status
app.post('/device/:deviceId', (req, res) => {
  if(!Auth.verify(req.header('jwt'))) res.status(401).send(`authentication failed`);
  else {
    const device = devices.get(req.params.deviceId);
    if(device) {
      if(device.online) {
        switch (DeviceType[device.type]) {
          case 'passiveSwitch':
            if(req.body.toggle) device.toggle();
            else if(req.body.power === 'true' || req.body.power === 'false') device.power = req.body.power;
            else return res.status(400).send(`Invalid request parameters`);
            device.sync();
            break;

          case 'passiveTactSwitch':
            if(req.body.push) {
              if(device.id == 'wakeonlan0') wol.wake(process.env.MAC0, error => { if(error) return; });
              else device.push();
            }
            else return res.status(400).send(`Invalid request parameters`);
            break;
        }
        res.status(201).send({ status: device.status });
      }
      else res.status(503).send(`device ${req.params.deviceId} is offline.`);
    }
    else res.status(404).send(`device ${req.params.deviceId} not found.`);
  }
  logger('WEBAPI', 'INFO', `Device control: ${req.params.deviceId} from: ${req.remoteIP} {${res.statusCode}}`);
});


// Google Assistant webhook handler
app.post('/assistant', (req, res) => {
  if(!Auth.verify(req.header('jwt'))) res.status(401).send(`authentication failed`);
  else {
    const params = req.body.queryResult.parameters;
    
    let mod;
    switch(req.body.queryResult.intent.displayName) {
      case 'Turn On': mod = 'turn on'; break;
      case 'Turn Off': mod = 'turn off'; break;
    }
    
    if(mod) {
      if(params.target.includes('컴퓨터') && mod == 'turn on') {
        wol.wake(process.env.MAC0, error => { if(error) return; });
        logger('GOOGLE', 'INFO', `Device control: wakeonlan0`);
      }
        
      if(params.target.includes('전등')) {
        if(params.location.length) {
          for(const loc of params.location) {
            const deviceId = locationsForAssistant['전등'][loc];
            if(deviceId) {
              const device = devices.get(deviceId);
              device.power = mod == 'turn on' ? true : false;
              device.sync();
              logger('GOOGLE', 'INFO', `Device control: ${deviceId}`);
            }
          }
        }
        else {
          const targets = [devices.get('lightSwitch0'), devices.get('lightSwitch1')];
          targets.forEach(x => {
            x.power = mod == 'turn on' ? true : false;
            x.sync();
            logger('GOOGLE', 'INFO', `Device control: ${x.id}`);
          });
        }
      }
    }
    
    res.json({
      "fulfillmentMessages": [
        {
          "text": {
            "text": [""]
          }
        }
      ]
    });
    
  }
});

const locationsForAssistant = {
  '전등': {
    '내 방': 'lightSwitch0',
    '침대': 'lightSwitch1'
  }
}

export default app

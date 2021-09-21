import { Server } from 'socket.io'
import wol from 'node-wol'
import dotenv from 'dotenv'

import Auth from './auth.js'
import devices, { PassiveSwitch, DeviceType } from '../devices/device.js'
import logger from './logger.js'

dotenv.config();

const io = new Server(process.env.socketPort);
logger('SOCKET', 'INFO', `Server startup :${process.env.socketPort}`);

io.sockets.on('connection', socket => {
  if(socket.handshake.query.device) {
    socket.join('device');

    // register device
    let device = devices.get(socket.handshake.query.device);
    if(device) { // if deviceId is seen before
      io.to(device.socket).disconnectSockets(); // disconnect previous known socket
      device.socket = socket.id; // update socket id
      device.online = true; // set online

      // initialize status
      switch (DeviceType[device.type]) {
        case 'passiveSwitch':
          device.power = false;
          break;
      }
    }
    else { // if deviceId is new
      switch (socket.handshake.query.deviceType) {
        case 'passiveSwitch':
          device = new PassiveSwitch(socket.handshake.query.device, socket.id);
          break;
      }
      devices.set(socket.handshake.query.device, device);
    }
    logger('SOCKET', 'INFO', `Device connected: ${device.id}(${DeviceType[device.type]})`);

    socket.on('disconnect', reason => {
      device.online = false;
      logger('SOCKET', 'INFO', `Device disconnected: ${device.id}(${DeviceType[device.type]})`);
    });
  }

  else if(socket.handshake.query.client) {
    socket.join('client');
    socket.emit('client-init', Array.from(devices.values()).map(x => x.info) );
    logger('SOCKET', 'INFO', `Client connected: ${socket.handshake.headers['x-forwarded-for']}`);
  }

  //!--------------------------- socket events -------------------------------
  socket.on('device-control', data => {
    const auth = Auth.verify(data.jwt);
    const device = devices.get(data.target);
    if(auth && device) {
      switch (DeviceType[device.type]) {
        case 'passiveSwitch':
          device.power = data.power;
          device.sync();
          break;

        case 'PassiveTactSwitch':
          if(device.id == 'wakeonlan0') wol.wake(process.env.MAC0, error => { if(error) return; });
          break;
      }
      logger('SOCKET', 'INFO', `Device control: ${device.id} from: ${socket.handshake.headers['x-forwarded-for']}`);
    }
  });
});

export default io

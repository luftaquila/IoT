import { Server } from 'socket.io'
import dotenv from 'dotenv'

import Auth from './auth.js'
import devices, { PassiveSwitch } from '../devices/device.js'

dotenv.config();

const io = new Server(process.env.socketPort);
console.log(`[SOCKET][INFO] Server startup :${process.env.socketPort}`);

io.sockets.on('connection', socket => {
  if(socket.handshake.query.device) {
    socket.join('device');

    // register device
    let device = devices.find(x => x.id == socket.handshake.query.device);
    if(device) device.socket = socket.id;
    else {
      switch (socket.handshake.query.deviceType) {
        case 'passiveSwitch':
          device = new PassiveSwitch(socket.handshake.query.device, socket.id);
          break;
      }
      devices.push(device);
    }
    console.log(`[SOCKET][INFO] Device connected: ${device.id}`);
  }

  else if(socket.handshake.query.client) {
    socket.join('client');
    socket.emit('client-init', devices);
    console.log(`[SOCKET][INFO] Client connected: ${socket.handshake.headers['x-forwarded-for']}`);
  }

  //!--------------------------- socket events -------------------------------
  socket.on('control-device', data => {
    const auth = Auth.verify(data.jwt);
    const device = devices.find(device => device.id == data.target);
    if(auth && device) {
      device.power = data.power;
      device.sync();
      console.log(`[SOCKET][EVENT] Device control: ${device.id} from: ${socket.handshake.headers['x-forwarded-for']}`);
    }
  });
});

export default io

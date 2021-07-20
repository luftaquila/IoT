import { Server } from 'socket.io'
import wol from 'node-wol'
import dotenv from 'dotenv'

import Auth from './auth.js'
import devices, { PassiveSwitch, DeviceType } from '../devices/device.js'

dotenv.config();

const io = new Server(process.env.socketPort);
console.log(`[SOCKET][INFO] Server startup :${process.env.socketPort}`);

io.sockets.on('connection', socket => {
  if(socket.handshake.query.device) {
    socket.join('device');

    // register device
    let device = devices.find(x => x.id == socket.handshake.query.device);
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
      devices.push(device);
    }
    console.log(`[SOCKET][EVENT] Device connected: ${device.id}(${DeviceType[device.type]})`);

    socket.on('disconnect', () => {
      device.online = false;
      console.log(`[SOCKET][EVENT] Device disconnected: ${device.id}(${DeviceType[device.type]})`);
    });
  }

  else if(socket.handshake.query.client) {
    socket.join('client');
    socket.emit('client-init', devices.map(x => { return { id: x.id, status: x.status, online: x.online }}));
    console.log(`[SOCKET][EVENT] Client connected: ${socket.handshake.headers['x-forwarded-for']}`);
  }

  //!--------------------------- socket events -------------------------------
  socket.on('device-control', data => {
    const auth = Auth.verify(data.jwt);
    const device = devices.find(device => device.id == data.target);
    if(auth && device) {
      device.power = data.power;
      device.sync();
      console.log(`[SOCKET][EVENT] Device control: ${device.id} from: ${socket.handshake.headers['x-forwarded-for']}`);
    }
  });

  socket.on('wol', data => {
    const auth = Auth.verify(data.jwt);
    if(auth) {
      wol.wake(process.env.MAC0);
      console.log(`[SOCKET][EVENT] WOL Request from: ${socket.handshake.headers['x-forwarded-for']}`);
    }
  });
});

export default io

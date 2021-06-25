import { Server } from 'socket.io';

import devices from '../devices/device.js'
import { Device, PassiveSwitch, DeviceType } from '../devices/device.js'

const io = new Server(3150);

io.sockets.on('connection', socket => {
  if(socket.handshake.query.device) {
    socket.join('device');

    // register device
    let device = devices.find(o => o.id() == socket.handshake.query.device);
    if(device) device.socket = socket.id;
    else {
      switch (socket.handshake.query.deviceType) {
        case 'passiveSwitch':
          device = new PassiveSwitch(socket.handshake.query.device, socket.id);
          break;
      }
      devices.push(device);
    }
  }

  else if(socket.handshake.query.client) socket.join('client');
});


export default io

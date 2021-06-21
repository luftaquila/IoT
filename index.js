import { Server } from 'socket.io';
const io = new Server(3150);

let devices = [];

io.sockets.on('connection', socket => {
  if(socket.handshake.query.device) {
    socket.join('device');

    // register device
    const previouslyRegistered = devices.find(o => o.deviceId == socket.handshake.query.device);
    if(previouslyRegistered) previouslyRegistered.socketId = socket.id;
    else {
      devices.push({
        deviceId: socket.handshake.query.device,
        deviceType: socket.handshake.query.deviceType,
        socketId: socket.id,
        status: {}
      });
    }

    // initialization
    const device = devices.find(o => o.deviceId == socket.handshake.query.device);
    if(device.deviceType == 'passiveSwitch') {
      device.status = { power: 'off' };
      socket.emit('relay', { data: '0' });
    }
  }
  else if(socket.handshake.query.client) socket.join('client');
});

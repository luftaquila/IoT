import io from '../controllers/socket.js'

let devices = new Map();

class Device {
  constructor(id, socket) {
    this._id = id;
    this._socket = socket;
    this._status = {};
    this._online = true;
    if(socket) io.to('client').emit('device-network-sync', { id: id, online: true });
  }

  get id() { return this._id; }

  get socket() { return this._socket; }
  set socket(socket) { this._socket = socket; }

  get status() { return this._status; }
  get statusJSON() { return JSON.stringify(this._status); }

  get online() { return this._online; }
  set online(online) {
    this._online = online;
    io.to('client').emit('device-network-sync', { id: this.id, online: online, status: this.status });
  }

  get info() {
    return {
      id: this.id,
      status: this.status,
      online: this.online
    }
  }
}

class PassiveSwitch extends Device {
  constructor(id, socket) {
    super(id, socket);
    this._type = 0;

    // initialize power status
    this._status.power = false;
    this.sync();
  }

  get type() { return this._type; }
  get power() { return this._status.power; }
  set power(power) { this._status.power = power; }

  toggle() { this.power = !this.power; }
  sync() {
    io.to(this.socket).emit('relay', { data: this.power ? '1' : '0' });
    io.to('client').emit('device-control-sync', { target: this.id, data: this.power });
  }
}

class PassiveTactSwitch extends Device {
  constructor(id, socket) {
    super(id, socket);
    this._type = 1;
  }

  get type() { return this._type; }
  push() {
    io.to(this.socket).emit('push');
    io.to('client').emit('device-control-sync', { target: this.id, data: true });
  }
}

class LEDDisplay extends Device {
  constructor(id, socket) {
    super(id, socket);
    this._type = 2;

    this._status = {
      power: true,
      display: 'READY.',
      align: 'center'
    }
    this.sync();
  }

  get type() { return this._type; }

  set status(status) {  }
}

const DeviceType = {
  passiveSwitch: 0,
  PassiveTactSwitch: 1,
  ledDisplay: 2,

  0: 'passiveSwitch',
  1: 'PassiveTactSwitch',
  2: 'ledDisplay'
}

// set virtual devices
devices.set('wakeonlan0', new PassiveTactSwitch('wakeonlan0', null));

export default devices
export { PassiveSwitch, DeviceType }

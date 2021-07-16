import io from '../controllers/socket.js'

let devices = [];

class Device {
  constructor(id, socket) {
    this._id = id;
    this._socket = socket;
    this._status = {};
    this._online = true;
  }

  get id() { return this._id; }

  get socket() { return this._socket; }
  set socket(socket) { this._socket = socket; }

  get status() { return this._status; }
  get statusJSON() { return JSON.stringify(this._status); }

  get online() { return this._online; }
  set online(online) { this._online = online; }
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

  toggle() { this._status.power = !this._status.power; }
  sync() {
    io.to(this._socket).emit('relay', { data: this._status.power ? '1' : '0' });
    io.to('client').emit('control-device-sync', { target: this.id, data: this._status.power });
  }
}

class LEDDisplay extends Device {
  constructor(id, socket) {
    super(id, socket);
    this._type = 1;

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
  ledDisplay: 1,

  0: 'passiveSwitch',
  1: 'ledDisplay'
}

export default devices
export { PassiveSwitch, DeviceType }

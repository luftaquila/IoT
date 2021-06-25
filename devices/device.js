import io from '../controllers/socket.js'

let devices = [];

class Device {
  constructor(id, socket) {
    this._id = id;
    this._socket = socket;
  }

  get id() { return this._id; }
  get socket() { return this._socket; }
  set socket(socket) { this._socket = socket; }
}

class PassiveSwitch extends Device {
  constructor(id, socket) {
    super(id, socket);
    this._type = 0;

    // initialize power status
    this._power = false;
    io.to(this._socket).emit('relay', { data: '0' });
  }

  get type() { return this._type; }
  get power() { return this._power; }
  set power(power) { this._power = power; }

  toggle() { this._power = !this._power; }
  sync() {
    io.to(this._socket).emit('relay', { data: this._status.power ? '1' : '0' });
  }
}

const DeviceType = {
  passiveSwitch: 0,

  0: 'passiveSwitch'
}

export default devices
export { Device, PassiveSwitch, DeviceType }

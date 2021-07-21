const access = {
  _login: false,
  _socket: false,

  check() { return this._login && this._socket; },
  set login(status) {
    this._login = status;
    $('.control').attr('disabled', !this.check());
   },
  set socket(status) {
    this._socket = status;
    if(this._socket) $('#socket-indicator').addClass('indicator-on');
    else $('.indicator').removeClass('indicator-on');
    $('.control').attr('disabled', !this.check());
   }
}

$(loadDevices);
$(autoLoginProcess);

function autoLoginProcess() {
  const JWT = Cookies.get('JWT');
  if(!JWT) {
    $('#login').css('display', 'inline-block');
    $('#logout').css('display', 'none');
    $('#sidebar').addClass('active');
    access.login = false;
  }
  else {
    $.ajax({
      url: 'api/autologin',
      type: 'POST',
      beforeSend: xhr => xhr.setRequestHeader('jwt', Cookies.get('JWT')),
      success: res => {
        $('#login').css('display', 'none');
        $('#logout').css('display', 'inline-block');
        access.login = true;
      },
      error: () => {
        $('#login').css('display', 'inline-block');
        $('#logout').css('display', 'none');
        $('#sidebar').addClass('active');
        access.login = false;
      }
    });
  }
}

async function loadDevices() {
  const devices_list = await $.ajax('/devices.json');
  access.devices = new Map(devices_list.map(x => [x.id, {
    id: x.id,
    type: x.type,
    name: x.name,
    width: x.width,
    height: x.height,
    indicator: x.indicator,
    _online: false,
    _status: null,

    set online(status) {
      this._online = status;
      $(`#${this.id}-container input`).attr('disabled', !(this._online && access.check()));
      if(this._online) $(`#${this.id}-indicator`).addClass('indicator-on');
      else $(`#${this.id}-indicator`).removeClass('indicator-on');
    },
    set status(status) {
      this._status = status;
      switch (this.type) {
        case 'passiveSwitch':
          $(`#${this.id}`).prop('checked', this._status.power);
          break;
      }
    }
  }]));

  // render interfaces
  for(const device of access.devices.values()) {
    try {
      let html = await $.ajax(`devices/${device.type}.html`);
      html = html.replace(/##name##/g, device.name).replace(/##id##/g, device.id).replace(/##width##/g, device.width * 6).replace(/##width-large##/g, device.width * 4).replace(/##height##/g, device.height * 4.5).replace(/##indicator##/g, device.indicator * 1 ? 'inline-block' : 'none');
      $('#quick-control').append(html);
    }
    catch(e) { continue; }
  }

  socketListener();
}

function socketListener() {
  socket = io({ query: { client: true } });
  socket.on('client-init', devices => {
    access.socket = true;

    // sync device status
    devices.forEach(device => {
      access.devices.get(device.id).online = device.online;
      access.devices.get(device.id).status = device.status;
    });
  });

  // !! per device type control required
  socket.on('device-control-sync', data => $(`#${data.target}`).prop('checked', data.data) );

  socket.on('device-network-sync', data => { access.devices.get(data.id).online = data.online; });
  socket.on('disconnect', () => access.socket = false );

  eventListener();
}

function eventListener() {
  $('.control').click(function() {
    // !! per device type control required
    const deviceType = $(this).attr('class').split(' ').filter(x => x.includes('device-'))[0].replace('device-', '');

    let payload = {
      target: $(this).attr('id'),
      jwt: Cookies.get('JWT')
    };
    switch (deviceType) {
      case 'passiveSwitch':
        payload.power = $(this).prop('checked');
        break;

      case 'passiveTactSwitch':
        break;
    }
    socket.emit('device-control', payload);
  });

  $('.control-container > div').click(function() {
    if($(this).find('input').is(':disabled')) return Toastify({
        text: "권한이 없습니다.&ensp;",
        duration: 3000,
        close: true,
        gravity: "bottom",
        position: "right",
        backgroundColor: "#f3616d",
    }).showToast();
  });
}

$('#login-proceed').click(() => {
  const id = $('#id').val(), pw = $('#pw').val();

  if(!id || !pw) return Toastify({
        text: "아이디와 비밀번호를 입력하세요&ensp;",
        duration: 3000,
        close: true,
        gravity: "bottom",
        position: "right",
        backgroundColor: "#eaca4a",
    }).showToast();

  $.ajax({
    url: 'api/login',
    type: 'POST',
    data: { id: id, pw: pw },
    success: res => {
      $('#sidebar').removeClass('active');
      $('#login-form').modal('hide');
      $('#login').css('display', 'none');
      $('#logout').css('display', 'inline-block');
      Cookies.set('JWT', res, { expires: 365 });
      access.login = true;
    },
    error: () => Toastify({
      text: "아이디 또는 비밀번호를 확인하세요&ensp;",
      duration: 3000,
      close: true,
      gravity: "bottom",
      position: "right",
      backgroundColor: "#f3616d",
    }).showToast()
  });
});

$('#logout').click(() => {
  Cookies.remove('JWT');
  $('#login').css('display', 'inline-block');
  $('#logout').css('display', 'none');
  access.login = false;
});

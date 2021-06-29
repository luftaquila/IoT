const access = {
  _login: false,
  _socket: false,
  check() { return this._login && this._socket; },
  set login(status) {
    this._login = status;
    $('.control-passive-switch').attr('disabled', !this.check());
   },
  set socket(status) {
    this._socket = status;
    $('#socket').css('background-color', this._socket ? 'green' : '');
    $('.control-passive-switch').attr('disabled', !this.check());
   }
}

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
      data: { jwt: JWT },
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

function socketListener() {
  socket = io({ query: { client: true } });
  socket.on('client-init', devices => {
    devices.forEach(device => $(`#${device._id}`).prop('checked', device._power) );
    access.socket = true;
    eventListener();
  });

  socket.on('control-device-sync', data => $(`#${data.target}`).prop('checked', data.data) );
  socket.on('disconnect', () => access.socket = false );
}

function eventListener() {
  $('.control-passive-switch').change(function() {
    socket.emit('control-device', {
      target: $(this).attr('id'),
      power: $(this).prop('checked'),
      jwt: Cookies.get('JWT')
    });
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

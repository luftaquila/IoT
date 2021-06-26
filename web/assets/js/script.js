$(() => {
  socket = io({ query: { client: true } });
  socketListener();
});

function socketListener() {
  socket.on('client-init', devices => {
    devices.forEach(device => $(`#${device._id}`).prop('checked', device._power) );
    $('.control-passive-switch').attr('disabled', false);
    eventListener();
  });
  
  socket.on('control-device-sync', data => $(`#${data.target}`).prop('checked', data.data) );
  socket.on('disconnect', () => $('.control-passive-switch').attr('disabled', true) );
}

function eventListener() {
  $('.control-passive-switch').change(function() {
    socket.emit('control-device', {
      target: $(this).attr('id'),
      power: $(this).prop('checked')
    });
  });
}

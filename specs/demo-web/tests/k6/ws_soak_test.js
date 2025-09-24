import ws from 'k6/ws';
import { check } from 'k6';
import { Trend, Rate } from 'k6/metrics';

export const options = {
  vus: 10,
  duration: '10m',
  thresholds: {
    ws_disconnects: ['rate<0.05'],
    ws_connection_time: ['p(95)<1500'],
  },
};

const TARGET = __ENV.CUPBEAR_WS_TARGET || 'wss://echo.websocket.events';

export const ws_connection_time = new Trend('ws_connection_time', true);
export const ws_disconnects = new Rate('ws_disconnects');

export default function () {
  const start = Date.now();
  let hasOpened = false;

  const response = ws.connect(TARGET, {}, function (socket) {
    socket.on('open', function () {
      hasOpened = true;
      ws_connection_time.add(Date.now() - start);
      socket.send(Date.now().toString());
      socket.setInterval(function () {
        socket.ping();
      }, 2000);
    });

    socket.on('pong', function () {
      socket.send('keepalive');
    });

    socket.on('message', function (msg) {
      if (__ENV.K6_LOG_WEBSOCKET_MESSAGES === '1') {
        console.log(`ws message: ${msg}`);
      }
    });

    socket.on('error', function (err) {
      console.error(`ws error: ${err}`);
    });

    socket.setTimeout(function () {
      socket.close();
    }, 60000);
  });

  check(response, {
    'connected without transport error': (res) => res && res.status === 101,
  });

  if (!hasOpened || response.error) {
    ws_disconnects.add(1);
  } else {
    ws_disconnects.add(0);
  }
}

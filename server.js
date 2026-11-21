import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = 3001;

// Create the HTTP server and serve the chat interface.
const server = http.createServer(async (req, res) => {
  try {
    const html = await readFile('./public/index.html');

    res.writeHead(200, {
      'Content-Type': 'text/html'
    });

    res.end(html);
  } catch (error) {
    res.writeHead(500);
    res.end('Internal Server Error');
  }
});

// Attach the WebSocket server to the HTTP server.
const wss = new WebSocketServer({ server });

// Broadcast a JSON message to all connected clients.
function broadcast(message) {
  const data = JSON.stringify(message);

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// Handle new WebSocket connections.
wss.on('connection', (socket, req) => {
  const username = new URL(
    req.url,
    'http://localhost'
  ).searchParams.get('username');

  // Notify everyone when a user joins.
  broadcast({
    type: 'system',
    text: `${username} joined`
  });

  // Receive and broadcast chat messages.
  socket.on('message', (data) => {
    try {
      const { username, text } = JSON.parse(data.toString());

      broadcast({
        type: 'chat',
        username,
        text
      });
    } catch (error) {
      console.error('Invalid message:', error.message);
    }
  });

  // Notify remaining users when someone leaves.
  socket.on('close', () => {
    broadcast({
      type: 'system',
      text: `${username} left`
    });
  });
});

// Start the HTTP and WebSocket server.
server.listen(PORT, () => {
  console.log('Chat server running at http://localhost:3001');
});

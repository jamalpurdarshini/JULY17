

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: { origin: "*" }
});

io.on('connection', socket => {
    console.log('New client connected: ' + socket.id);

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-joined', socket.id);
    });

    socket.on('signal', ({ roomId, data }) => {
        socket.to(roomId).emit('signal', { sender: socket.id, data });
    });

    socket.on('disconnecting', () => {
        socket.rooms.forEach(room => {
            socket.to(room).emit('user-left', socket.id);
        });
    });
});

// ✅ Use process.env.PORT for Render
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Signaling server running on port ${PORT}`);
});

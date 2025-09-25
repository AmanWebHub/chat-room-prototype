// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let rooms = {};

app.use(express.static("public")); // serve frontend from /public

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Create a new room
  socket.on("createRoom", () => {
    const roomCode = Math.random().toString(36).substring(2, 8);
    rooms[roomCode] = { host: socket.id, users: [socket.id] };
    socket.join(roomCode);
    socket.emit("roomCreated", roomCode);
  });

  // Join a room
  socket.on("joinRoom", (roomCode) => {
    if (rooms[roomCode]) {
      rooms[roomCode].users.push(socket.id);
      socket.join(roomCode);
      io.to(roomCode).emit("userJoined", socket.id);
    } else {
      socket.emit("errorMsg", "Room not found");
    }
  });

  // Handle chat messages
  socket.on("chatMsg", ({ roomCode, msg }) => {
    io.to(roomCode).emit("chatMsg", { user: socket.id, msg });
  });

  // Disconnect cleanup
  socket.on("disconnect", () => {
    for (let code in rooms) {
      const room = rooms[code];
      if (room.host === socket.id) {
        io.to(code).emit("roomClosed");
        delete rooms[code];
      } else {
        room.users = room.users.filter((u) => u !== socket.id);
      }
    }
  });
});

server.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});

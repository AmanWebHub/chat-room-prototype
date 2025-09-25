const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = {}; // { roomCode: { hostId, users: {} } }

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("createRoom", () => {
    const code = generateRoomCode();
    rooms[code] = { hostId: socket.id, users: {} };
    socket.join(code);
    socket.emit("roomCreated", code);
  });

  socket.on("joinRoom", ({ room, name }) => {
    if (rooms[room]) {
      rooms[room].users[socket.id] = name;
      socket.join(room);
      socket.emit("roomJoined", room);
      io.to(room).emit("chatMessage", { name: "System", text: `${name} joined` });
    } else {
      socket.emit("chatMessage", { name: "System", text: "Room not found" });
    }
  });

  socket.on("chatMessage", ({ text, room }) => {
    const name = rooms[room]?.users[socket.id] || "Unknown";
    io.to(room).emit("chatMessage", { name, text });
  });

  socket.on("disconnect", () => {
    for (const [code, room] of Object.entries(rooms)) {
      if (socket.id === room.hostId) {
        io.to(code).emit("roomClosed");
        delete rooms[code];
      } else if (room.users[socket.id]) {
        const name = room.users[socket.id];
        delete room.users[socket.id];
        io.to(code).emit("chatMessage", { name: "System", text: `${name} left` });
      }
    }
  });
});

server.listen(3000, () => {
  console.log("🚀 Server running at http://localhost:3000");
});

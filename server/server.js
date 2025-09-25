const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Serve index.html for root route
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

const rooms = {}; // { roomCode: { hostId, users: { socketId: name } } }

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Ensure code is unique
    if (rooms[result]) {
        return generateRoomCode();
    }
    return result;
}

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("createRoom", ({ name }) => {
        try {
            const code = generateRoomCode();
            rooms[code] = { 
                hostId: socket.id, 
                users: { [socket.id]: name },
                createdAt: new Date()
            };
            socket.join(code);
            socket.emit("roomCreated", { code });
            console.log(`Room created: ${code} by ${name} (${socket.id})`);
        } catch (error) {
            console.error("Error creating room:", error);
            socket.emit("joinError", "Failed to create room");
        }
    });

    socket.on("joinRoom", ({ room, name }) => {
        try {
            const code = room.toUpperCase();
            
            if (!rooms[code]) {
                socket.emit("joinError", "Room not found");
                return;
            }
            
            if (Object.keys(rooms[code].users).length >= 10) {
                socket.emit("joinError", "Room is full (max 10 users)");
                return;
            }
            
            // Check if user is already in the room
            if (rooms[code].users[socket.id]) {
                socket.emit("joinError", "You are already in this room");
                return;
            }
            
            rooms[code].users[socket.id] = name;
            socket.join(code);
            socket.emit("roomJoined", { code });
            
            // Notify others in the room (ONLY ONCE)
            io.to(code).emit("chatMessage", { 
                name: "System", 
                text: `${name} joined the room`,
                type: "system"
            });
            
            console.log(`User ${name} joined room: ${code}`);
        } catch (error) {
            console.error("Error joining room:", error);
            socket.emit("joinError", "Failed to join room");
        }
    });

    socket.on("chatMessage", ({ text, room }) => {
        const roomData = rooms[room];
        if (roomData && roomData.users[socket.id]) {
            const name = roomData.users[socket.id];
            io.to(room).emit("chatMessage", { name, text });
            console.log(`Message in ${room} from ${name}: ${text}`);
        }
    });

    socket.on("leaveRoom", (room) => {
        const roomData = rooms[room];
        if (roomData) {
            const userName = roomData.users[socket.id];
            delete roomData.users[socket.id];
            socket.leave(room);
            
            // Notify others
            io.to(room).emit("chatMessage", { 
                name: "System", 
                text: `${userName} left the room`,
                type: "system"
            });
            
            // Clean up empty rooms
            if (Object.keys(roomData.users).length === 0) {
                delete rooms[room];
                console.log(`Room ${room} deleted (empty)`);
            }
        }
    });

    socket.on("closeRoom", (roomCode) => {
        const room = rooms[roomCode];
        
        // Check if the user is the host of this room
        if (room && room.hostId === socket.id) {
            console.log(`Host closing room: ${roomCode}`);
            
            // Notify all users in the room
            io.to(roomCode).emit("roomClosed", { 
                room: roomCode, 
                message: "Room closed by host" 
            });
            
            // Special message for the host
            socket.emit("roomClosedByHost");
            
            // Delete the room after a short delay
            setTimeout(() => {
                delete rooms[roomCode];
                console.log(`Room ${roomCode} deleted by host`);
            }, 1000);
        } else {
            socket.emit("joinError", "You are not the host of this room");
        }
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
        
        for (const [code, room] of Object.entries(rooms)) {
            if (socket.id === room.hostId) {
                // Host disconnected - close room
                io.to(code).emit("roomClosed", { 
                    room: code, 
                    message: "Host disconnected" 
                });
                
                // Delete the room after a short delay
                setTimeout(() => {
                    delete rooms[code];
                    console.log(`Room ${code} closed (host disconnected)`);
                }, 1000);
            } else if (room.users[socket.id]) {
                // User disconnected
                const userName = room.users[socket.id];
                delete room.users[socket.id];
                
                io.to(code).emit("chatMessage", { 
                    name: "System", 
                    text: `${userName} disconnected`,
                    type: "system"
                });
                
                // Clean up empty rooms
                if (Object.keys(room.users).length === 0) {
                    setTimeout(() => {
                        if (rooms[code] && Object.keys(rooms[code].users).length === 0) {
                            delete rooms[code];
                            console.log(`Room ${code} deleted (empty after disconnect)`);
                        }
                    }, 5000);
                }
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📁 Serving files from: ${path.join(__dirname, '../public')}`);
});
const socket = io();

// UI elements
const createBtn = document.getElementById("createRoom");
const joinBtn = document.getElementById("joinRoom");
const roomCodeInput = document.getElementById("roomCode");
const chatDiv = document.getElementById("chat");
const roomTitle = document.getElementById("roomTitle");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendMessage");

// Generate guest name
const guestName = "Guest" + Math.floor(Math.random() * 1000);

// Create Room
createBtn.onclick = () => {
  socket.emit("createRoom");
};

// Join Room
joinBtn.onclick = () => {
  const code = roomCodeInput.value.trim();
  if (code) socket.emit("joinRoom", { room: code, name: guestName });
};

// Send Message
sendBtn.onclick = () => {
  const text = messageInput.value.trim();
  if (text) {
    socket.emit("chatMessage", { text, room: currentRoom });
    messageInput.value = "";
  }
};

let currentRoom = null;

// Socket events
socket.on("roomCreated", (code) => {
  currentRoom = code;
  roomTitle.textContent = "Room: " + code;
  chatDiv.style.display = "block";
});

socket.on("roomJoined", (code) => {
  currentRoom = code;
  roomTitle.textContent = "Room: " + code;
  chatDiv.style.display = "block";
});

socket.on("chatMessage", (msg) => {
  const p = document.createElement("p");
  p.textContent = `${msg.name}: ${msg.text}`;
  messagesDiv.appendChild(p);
});

socket.on("roomClosed", () => {
  alert("Room closed by host.");
  window.location.reload();
});

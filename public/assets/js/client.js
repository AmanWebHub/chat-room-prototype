const socket = io();

// UI elements
const createBtn = document.getElementById("createRoom");
const joinBtn = document.getElementById("joinRoom");
const leaveBtn = document.getElementById("leaveRoom");
const closeRoomBtn = document.getElementById("closeRoom");
const roomCodeInput = document.getElementById("roomCode");
const chatDiv = document.getElementById("chat");
const roomTitle = document.getElementById("roomTitle");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendMessage");
const statusDiv = document.getElementById("status");

// Generate guest name
const guestName = "Guest" + Math.floor(Math.random() * 1000);
let currentRoom = null;
let isHost = false;

console.log("Client loaded. Guest name:", guestName);

// Show status message
function showStatus(message, type = 'info') {
    statusDiv.textContent = message;
    statusDiv.className = type === 'error' ? 'status-error' : 'status-success';
    setTimeout(() => {
        if (statusDiv.textContent === message) {
            statusDiv.textContent = '';
            statusDiv.className = '';
        }
    }, 3000);
}

// Create Room
createBtn.onclick = () => {
    console.log("Creating room...");
    socket.emit("createRoom", { name: guestName });
    showStatus('Creating room...', 'info');
};

// Join Room
joinBtn.onclick = joinRoom;
function joinRoom() {
    const code = roomCodeInput.value.trim().toUpperCase();
    if (!code) {
        showStatus('Please enter a room code', 'error');
        return;
    }
    if (code.length !== 6) {
        showStatus('Room code must be 6 characters', 'error');
        return;
    }
    console.log("Joining room:", code);
    socket.emit("joinRoom", { room: code, name: guestName });
    showStatus('Joining room...', 'info');
}

// Leave Room (for non-hosts)
leaveBtn.onclick = () => {
    if (currentRoom) {
        console.log("Leaving room:", currentRoom);
        socket.emit("leaveRoom", currentRoom);
        resetChat();
        showStatus('Left the room', 'info');
    }
};

// Close Room (for hosts)
closeRoomBtn.onclick = () => {
    if (currentRoom && isHost) {
        if (confirm("Are you sure you want to close this room? All users will be disconnected.")) {
            console.log("Closing room:", currentRoom);
            socket.emit("closeRoom", currentRoom);
        }
    }
};

// Send Message
sendBtn.onclick = sendMessage;
function sendMessage() {
    const text = messageInput.value.trim();
    if (text && currentRoom) {
        console.log("Sending message to room:", currentRoom);
        socket.emit("chatMessage", { text, room: currentRoom });
        messageInput.value = "";
    }
}

// Handle Enter key
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

roomCodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinRoom();
    }
});

// Reset chat UI
function resetChat() {
    currentRoom = null;
    isHost = false;
    chatDiv.style.display = "none";
    messagesDiv.innerHTML = "";
    roomCodeInput.value = "";
    closeRoomBtn.style.display = "none";
    leaveBtn.style.display = "block";
}

// Show host controls
function showHostControls() {
    isHost = true;
    closeRoomBtn.style.display = "block";
    leaveBtn.style.display = "none";
}

// Show participant controls
function showParticipantControls() {
    isHost = false;
    closeRoomBtn.style.display = "none";
    leaveBtn.style.display = "block";
}

// Socket events
socket.on("roomCreated", (data) => {
    console.log("Room created:", data.code);
    currentRoom = data.code;
    roomTitle.textContent = `Room: ${data.code} (Host)`;
    chatDiv.style.display = "block";
    showHostControls();
    showStatus(`Room created! Code: ${data.code}`, 'success');
    addSystemMessage('You created this room. You are the host.');
});

socket.on("roomJoined", (data) => {
    console.log("Room joined:", data.code);
    currentRoom = data.code;
    roomTitle.textContent = `Room: ${data.code}`;
    chatDiv.style.display = "block";
    showParticipantControls();
    showStatus(`Joined room: ${data.code}`, 'success');
});

socket.on("joinError", (message) => {
    console.error("Join error:", message);
    showStatus(message, 'error');
});

// Handle incoming messages
socket.on("chatMessage", (msg) => {
    console.log("Received message:", msg);
    addMessage(msg.name, msg.text, msg.type);
});

socket.on("roomClosed", (data) => {
    if (data.room === currentRoom) {
        addSystemMessage('Room has been closed by the host.');
        setTimeout(() => {
            alert("Room closed by host.");
            resetChat();
        }, 1000);
    }
});

socket.on("roomClosedByHost", () => {
    addSystemMessage('You closed the room.');
    setTimeout(() => {
        resetChat();
        showStatus('Room closed', 'info');
    }, 1000);
});

// Add message to chat
function addMessage(name, text, type = 'user') {
    const messageDiv = document.createElement("div");
    messageDiv.classList.add("message");
    
    if (type === 'system') {
        messageDiv.classList.add("system");
        messageDiv.textContent = text;
    } else if (name === guestName) {
        messageDiv.classList.add("self");
        messageDiv.textContent = text;
    } else {
        messageDiv.classList.add("other");
        messageDiv.textContent = `${name}: ${text}`;
    }
    
    messagesDiv.appendChild(messageDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addSystemMessage(text) {
    addMessage('System', text, 'system');
}

// Handle connection events
socket.on("connect", () => {
    console.log("Connected to server");
    showStatus('Connected to server', 'success');
});

socket.on("disconnect", () => {
    console.log("Disconnected from server");
    showStatus('Disconnected from server', 'error');
});

socket.on("connect_error", (error) => {
    console.error("Connection error:", error);
    showStatus('Connection error: ' + error.message, 'error');
});

console.log("Chat client initialized");
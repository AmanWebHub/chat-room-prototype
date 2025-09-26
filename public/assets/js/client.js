const socket = io();

// UI elements
const createBtn = document.getElementById("createRoom");
const joinBtn = document.getElementById("joinRoom");
const leaveBtn = document.getElementById("leaveRoom");
const closeRoomBtn = document.getElementById("closeRoom");
const copyRoomCodeBtn = document.getElementById("copyRoomCode");
const roomCodeInput = document.getElementById("roomCode");
const chatDiv = document.getElementById("chat");
const roomTitle = document.getElementById("roomTitle");
const roomBadge = document.getElementById("roomBadge");
const messagesDiv = document.getElementById("messages");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendMessage");
const statusDiv = document.getElementById("status");
const nicknameInput = document.getElementById("nickname");
const controlsDiv = document.getElementById("controls");
const connectionStatus = document.getElementById("connectionStatus");

// Modal elements
const modal = document.getElementById("customModal");
const modalIcon = document.getElementById("modalIcon");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalConfirm = document.getElementById("modalConfirm");
const modalCancel = document.getElementById("modalCancel");

// Toast element
const toast = document.getElementById("toast");
const toastMessage = toast.querySelector('.toast-message');
const toastIcon = toast.querySelector('.toast-icon');

let guestName = null;
let currentRoom = null;
let isHost = false;

console.log("Chat client initialized");

// Utility: generate nickname
function getNickname() {
  const input = nicknameInput.value.trim();
  return input || "Guest" + Math.floor(Math.random() * 1000);
}

// Show status message
function showStatus(message, type = "info") {
  statusDiv.textContent = message;
  statusDiv.className = type === "error" ? "status-error" : "status-success";
  setTimeout(() => {
    if (statusDiv.textContent === message) {
      statusDiv.textContent = "";
      statusDiv.className = "";
    }
  }, 3000);
}

// Show toast notification
function showToast(message, type = "success") {
  toastMessage.textContent = message;
  toast.className = `toast ${type}`;
  
  // Set icon based on type
  const icons = {
    success: "fas fa-check-circle",
    error: "fas fa-exclamation-circle",
    warning: "fas fa-exclamation-triangle",
    info: "fas fa-info-circle"
  };
  toastIcon.className = icons[type] || icons.info;
  
  toast.classList.add('show');
  
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Show modal
function showModal(title, message, type = "info", confirmText = "Confirm", cancelText = "Cancel") {
  return new Promise((resolve) => {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modalConfirm.textContent = confirmText;
    modalCancel.textContent = cancelText;
    
    // Set icon and styles based on type
    const icons = {
      warning: "fas fa-exclamation-triangle warning",
      info: "fas fa-info-circle info",
      success: "fas fa-check-circle success",
      error: "fas fa-times-circle error"
    };
    modalIcon.className = `modal-icon ${icons[type] || icons.info}`;
    
    modal.style.display = "block";
    
    const handleConfirm = () => {
      cleanup();
      resolve(true);
    };
    
    const handleCancel = () => {
      cleanup();
      resolve(false);
    };
    
    const handleKeydown = (e) => {
      if (e.key === "Escape") handleCancel();
      if (e.key === "Enter") handleConfirm();
    };
    
    function cleanup() {
      modal.style.display = "none";
      modalConfirm.removeEventListener("click", handleConfirm);
      modalCancel.removeEventListener("click", handleCancel);
      document.removeEventListener("keydown", handleKeydown);
    }
    
    modalConfirm.addEventListener("click", handleConfirm);
    modalCancel.addEventListener("click", handleCancel);
    document.addEventListener("keydown", handleKeydown);
    
    // Close modal when clicking outside
    modal.addEventListener("click", (e) => {
      if (e.target === modal) handleCancel();
    });
  });
}

// Copy room code to clipboard
async function copyRoomCode() {
  if (currentRoom) {
    try {
      await navigator.clipboard.writeText(currentRoom);
      copyRoomCodeBtn.classList.add('copied');
      showToast('Room code copied to clipboard!', 'success');
      
      setTimeout(() => {
        copyRoomCodeBtn.classList.remove('copied');
      }, 2000);
    } catch (err) {
      console.error('Failed to copy room code: ', err);
      showToast('Failed to copy room code', 'error');
    }
  }
}

// Hide room creation/join inputs
function hideRoomInputs() {
  controlsDiv.style.display = 'none';
  chatDiv.style.display = 'block';
  // Remove welcome message when first message arrives
  const welcomeMsg = messagesDiv.querySelector('.welcome-message');
  if (welcomeMsg) {
    welcomeMsg.style.display = 'none';
  }
}

// Show room creation/join inputs
function showRoomInputs() {
  controlsDiv.style.display = 'block';
  chatDiv.style.display = 'none';
}

// Update connection status
function updateConnectionStatus(connected) {
  if (connected) {
    connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Connected';
    connectionStatus.className = 'status-connected';
  } else {
    connectionStatus.innerHTML = '<i class="fas fa-circle"></i> Disconnected';
    connectionStatus.className = 'status-disconnected';
  }
}

// Create Room
createBtn.onclick = () => {
  guestName = getNickname();
  console.log("Creating room as:", guestName);
  socket.emit("createRoom", { name: guestName });
  showStatus("Creating room...", "info");
};

// Join Room
joinBtn.onclick = joinRoom;
function joinRoom() {
  const code = roomCodeInput.value.trim().toUpperCase();
  if (!code) {
    showToast("Please enter a room code", "warning");
    return;
  }
  if (code.length !== 6) {
    showToast("Room code must be 6 characters", "warning");
    return;
  }
  guestName = getNickname();
  console.log("Joining room:", code, "as", guestName);
  socket.emit("joinRoom", { room: code, name: guestName });
  showStatus("Joining room...", "info");
}

// Leave Room (for non-hosts)
leaveBtn.onclick = async () => {
  if (currentRoom) {
    const confirmed = await showModal(
      "Leave Room",
      "Are you sure you want to leave this room?",
      "warning",
      "Leave Room",
      "Stay"
    );
    
    if (confirmed) {
      console.log("Leaving room:", currentRoom);
      socket.emit("leaveRoom", currentRoom);
      resetChat();
      showToast("You left the room", "info");
    }
  }
};

// Close Room (for hosts)
closeRoomBtn.onclick = async () => {
  if (currentRoom && isHost) {
    const confirmed = await showModal(
      "Close Room",
      "Are you sure you want to close this room? All users will be disconnected.",
      "warning",
      "Close Room",
      "Cancel"
    );
    
    if (confirmed) {
      console.log("Closing room:", currentRoom);
      socket.emit("closeRoom", currentRoom);
    }
  }
};

// Copy Room Code
copyRoomCodeBtn.onclick = copyRoomCode;

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
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  }
});

roomCodeInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    joinRoom();
  }
});

nicknameInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    createBtn.focus();
  }
});

// Reset chat UI
function resetChat() {
  currentRoom = null;
  isHost = false;
  showRoomInputs();
  messagesDiv.innerHTML = `
    <div class="welcome-message">
      <i class="fas fa-comments"></i>
      <h3>Welcome to the room!</h3>
      <p>Start chatting with other participants.</p>
    </div>
  `;
  roomCodeInput.value = "";
  closeRoomBtn.style.display = "none";
  leaveBtn.style.display = "block";
  roomBadge.textContent = "Participant";
  roomBadge.className = "room-badge";
  copyRoomCodeBtn.classList.remove('copied');
}

// Show host controls
function showHostControls() {
  isHost = true;
  closeRoomBtn.style.display = "block";
  leaveBtn.style.display = "none";
  roomBadge.textContent = "Host";
  roomBadge.className = "room-badge host";
}

// Show participant controls
function showParticipantControls() {
  isHost = false;
  closeRoomBtn.style.display = "none";
  leaveBtn.style.display = "block";
  roomBadge.textContent = "Participant";
  roomBadge.className = "room-badge";
}

// Add message to chat
function addMessage(name, text, type = "user", timestamp = null) {
  // Hide welcome message when first real message arrives
  const welcomeMsg = messagesDiv.querySelector('.welcome-message');
  if (welcomeMsg && type !== "system") {
    welcomeMsg.style.display = 'none';
  }
  
  const messageDiv = document.createElement("div");
  messageDiv.classList.add("message");

  // Format timestamp (24h)
  let timeStr = "";
  if (timestamp) {
    const date = new Date(timestamp);
    timeStr = date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  if (type === "system") {
    messageDiv.classList.add("system");
    messageDiv.innerHTML = `${text}<div class="timestamp">${timeStr}</div>`;
  } else if (name === guestName) {
    messageDiv.classList.add("self");
    messageDiv.innerHTML = `${text} <span class="timestamp">${timeStr}</span>`;
  } else {
    messageDiv.classList.add("other");
    messageDiv.innerHTML = `${name}: ${text} <span class="timestamp">${timeStr}</span>`;
  }

  messagesDiv.appendChild(messageDiv);
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addSystemMessage(text) {
  addMessage("System", text, "system", new Date().toISOString());
}

// Socket events
socket.on("roomCreated", (data) => {
  console.log("Room created:", data.code);
  currentRoom = data.code;
  roomTitle.innerHTML = `<i class="fas fa-hashtag"></i> ${data.code}`;
  hideRoomInputs();
  showHostControls();
  showToast(`Room created! Code: ${data.code}`, "success");
  addSystemMessage("You created this room. You are the host.");
});

socket.on("roomJoined", (data) => {
  console.log("Room joined:", data.code);
  currentRoom = data.code;
  roomTitle.innerHTML = `<i class="fas fa-hashtag"></i> ${data.code}`;
  hideRoomInputs();
  showParticipantControls();
  showToast(`Joined room: ${data.code}`, "success");
});

socket.on("joinError", (message) => {
  console.error("Join error:", message);
  showToast(message, "error");
});

// Handle incoming messages
socket.on("chatMessage", (msg) => {
  console.log("Received message:", msg);
  addMessage(msg.name, msg.text, msg.type, msg.timestamp);
});

socket.on("roomClosed", (data) => {
  if (data.room === currentRoom) {
    addSystemMessage("Room has been closed by the host.");
    setTimeout(() => {
      showModal(
        "Room Closed",
        "The room has been closed by the host.",
        "info",
        "OK"
      ).then(() => {
        resetChat();
      });
    }, 1000);
  }
});

socket.on("roomClosedByHost", () => {
  addSystemMessage("You closed the room.");
  setTimeout(() => {
    showToast("Room closed successfully", "success");
    resetChat();
  }, 1000);
});

// Connection events
socket.on("connect", () => {
  console.log("Connected to server");
  updateConnectionStatus(true);
  showToast("Connected to server", "success");
});

socket.on("disconnect", () => {
  console.log("Disconnected from server");
  updateConnectionStatus(false);
  showToast("Disconnected from server", "error");
});

socket.on("connect_error", (error) => {
  console.error("Connection error:", error);
  updateConnectionStatus(false);
  showToast("Connection error: " + error.message, "error");
});

// Initialize
updateConnectionStatus(socket.connected);
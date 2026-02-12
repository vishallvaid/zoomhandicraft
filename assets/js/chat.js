const WEBHOOK_URL = "https://n8n.srv1319269.hstgr.cloud/webhook/bott";

// 1. Session ID Management (Har customer ki unique aur permanent ID)
function getSessionId() {
    const storageKey = "zishaan_customer_sid";
    let sid = localStorage.getItem(storageKey);

    if (!sid) {
        // New Customer: Unique ID - Example: sid-1712345678-abcde
        sid = "sid-" + Date.now() + "-" + Math.random().toString(36).substring(2, 10);
        localStorage.setItem(storageKey, sid);
        console.log("New Customer Session Created:", sid);
    } else {
        console.log("Existing Customer Session Found:", sid);
    }
    return sid;
}

// 2. Chat History Manager (Refresh ke baad messages dikhate rehne ke liye)
function saveChatHistory(className, text) {
    let history = JSON.parse(localStorage.getItem("zishaan_chat_history") || "[]");
    history.push({ className, text });
    // Sirf last 20 messages save karein
    if (history.length > 20) history.shift();
    localStorage.setItem("zishaan_chat_history", JSON.stringify(history));
}

function loadChatHistory() {
    const logsEl = document.getElementById("chat-logs");
    let history = JSON.parse(localStorage.getItem("zishaan_chat_history") || "[]");
    if (history.length > 0 && logsEl) {
        // Purana welcome message hata ke saved history dikhayen
        logsEl.innerHTML = "";
        history.forEach(item => {
            appendMessage(item.className, item.text, false); // false means don't save again
        });
    }
}

// 3. Toggle Chat Window
function toggleChat() {
    const chatBox = document.getElementById("chat-box");
    if (chatBox) {
        const isOpen = chatBox.style.display === "flex";
        chatBox.style.display = isOpen ? "none" : "flex";
        if (!isOpen) {
            // loadChatHistory(); // User requested not to show history in UI
            scrollToBottom();
        }
    }
}

// 4. Send Message to n8n
async function sendMessage() {
    const inputEl = document.getElementById("chat-input-field");
    const message = inputEl.value.trim();

    if (!message) return;

    // User message dikhayen aur save karein
    appendMessage("user-msg", message);
    inputEl.value = "";

    // Typing activity
    const typingDiv = appendMessage("bot-msg typing", "...");

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: message,
                sessionId: getSessionId()
            })
        });

        const data = await response.json();
        typingDiv.remove();

        // Response handle karein
        let resData = Array.isArray(data) ? data[0] : data;
        let botReply = resData.output || resData.message || resData.text || "माफ़ कीजिये, कुछ तकनीकी दिक्कत है।";

        // [DATA_COLLECTED] filter
        botReply = botReply.replace('[DATA_COLLECTED]', '').trim();

        appendMessage("bot-msg", botReply);

    } catch (error) {
        console.error("Error:", error);
        typingDiv.innerText = "Error: Connection lost.";
    }
}

function appendMessage(className, text, shouldSave = true) {
    const logsEl = document.getElementById("chat-logs");
    if (!logsEl) return null;

    const msgDiv = document.createElement("div");
    msgDiv.className = `msg ${className}`;
    msgDiv.innerText = text;
    logsEl.appendChild(msgDiv);

    if (shouldSave && text !== "...") {
        saveChatHistory(className, text);
    }

    scrollToBottom();
    return msgDiv;
}

function scrollToBottom() {
    const logsEl = document.getElementById("chat-logs");
    if (logsEl) logsEl.scrollTop = logsEl.scrollHeight;
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    const inputField = document.getElementById("chat-input-field");
    if (inputField) {
        inputField.addEventListener("keypress", (e) => {
            if (e.key === "Enter") sendMessage();
        });
    }

    // Auto load history on start if box is open or on toggle
    // loadChatHistory(); // User requested not to show history in UI

    // 5. Auto Open Chat after 3 seconds for new visitors
    setTimeout(() => {
        const chatBox = document.getElementById("chat-box");
        if (chatBox && chatBox.style.display !== "flex") {
            toggleChat();
        }
    }, 3000);
});

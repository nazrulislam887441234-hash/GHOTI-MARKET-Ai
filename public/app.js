const BACKEND_URL = "https://ai.ghotimarket.com/api/chat";

let previousInteractionId = null;

const heroState = document.getElementById("heroState");
const chatMessages = document.getElementById("chatMessages");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");
const researchIndicator = document.getElementById("researchIndicator");
const researchText = document.getElementById("researchText");
const offlineBanner = document.getElementById("offlineBanner");

// Auto-resize textarea
userInput.addEventListener("input", function() {
    this.style.height = "auto";
    this.style.height = (this.scrollHeight - 10) + "px";
    sendBtn.disabled = this.value.trim().length === 0;
});

// Enter key submission
userInput.addEventListener("keydown", function(e) {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (!sendBtn.disabled) {
            sendMessage();
        }
    }
});

// Send Button click
sendBtn.addEventListener("click", sendMessage);

// Suggestion cards click
document.querySelectorAll(".suggestion-card").forEach(card => {
    card.addEventListener("click", () => {
        const promptText = card.getAttribute("data-prompt");
        userInput.value = promptText;
        userInput.style.height = "auto";
        sendBtn.disabled = false;
        sendMessage();
    });
});

// New Chat button
newChatBtn.addEventListener("click", () => {
    previousInteractionId = null;
    chatMessages.innerHTML = "";
    chatMessages.classList.add("hidden");
    heroState.classList.remove("hidden");
    userInput.value = "";
    sendBtn.disabled = true;
});

// Online/Offline listener
window.addEventListener("online", () => offlineBanner.classList.add("hidden"));
window.addEventListener("offline", () => offlineBanner.classList.remove("hidden"));

async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    if (!navigator.onLine) {
        offlineBanner.classList.remove("hidden");
        return;
    }

    // Hide hero state, show chat container
    heroState.classList.add("hidden");
    chatMessages.classList.remove("hidden");

    // Append User Message
    appendMessage(text, "user");
    userInput.value = "";
    userInput.style.height = "auto";
    sendBtn.disabled = true;

    // Show research/thinking indicator
    researchText.textContent = "GHOTI MARKET-এর তথ্য যাচাই করা হচ্ছে…";
    researchIndicator.classList.remove("hidden");
    scrollToBottom();

    setTimeout(() => {
        researchText.textContent = "তথ্য প্রস্তুত করা হচ্ছে…";
    }, 1200);

    try {
        const response = await fetch(BACKEND_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: text,
                previousInteractionId: previousInteractionId
            })
        });

        const data = await response.json();
        researchIndicator.classList.add("hidden");

        if (data.success) {
            previousInteractionId = data.previousInteractionId;
            appendMessage(data.reply, "ai");
        } else {
            appendMessage(data.error || "দুঃখিত, এই মুহূর্তে GHOTI MARKET AI-এর সঙ্গে সংযোগ করা যাচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।", "ai");
        }
    } catch (err) {
        researchIndicator.classList.add("hidden");
        appendMessage("দুঃখিত, এই মুহূর্তে GHOTI MARKET AI-এর সঙ্গে সংযোগ করা যাচ্ছে না। কিছুক্ষণ পর আবার চেষ্টা করুন।", "ai");
    }

    scrollToBottom();
}

function appendMessage(text, sender) {
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", sender);
    
    if (sender === "ai") {
        msgDiv.innerHTML = formatMarkdown(text);
    } else {
        msgDiv.textContent = text;
    }

    chatMessages.appendChild(msgDiv);
    scrollToBottom();
}

function formatMarkdown(text) {
    // Basic safe markdown formatting for bold, lists, paragraphs
    let formatted = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^- (.*)$/gm, '<li>$1</li>');

    if (formatted.includes("<li>")) {
        formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    }

    return formatted.split('\n\n').map(p => `<p>${p}</p>`).join('');
}

function scrollToBottom() {
    const chatMain = document.querySelector(".chat-main");
    chatMain.scrollTop = chatMain.scrollHeight;
}

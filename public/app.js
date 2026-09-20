const BACKEND_URL =
    "https://ghoti-market-ai.nazrulislam887441234.workers.dev/api/chat";

let previousInteractionId = null;

const heroState = document.getElementById("heroState");
const chatMessages = document.getElementById("chatMessages");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const newChatBtn = document.getElementById("newChatBtn");
const researchIndicator = document.getElementById("researchIndicator");
const researchText = document.getElementById("researchText");
const offlineBanner = document.getElementById("offlineBanner");


// ============================================================
// CONFIG
// ============================================================

const REQUEST_TIMEOUT = 30000;


// ============================================================
// AUTO RESIZE TEXTAREA
// ============================================================

userInput.addEventListener("input", function () {

    this.style.height = "auto";

    this.style.height =
        (this.scrollHeight - 10) + "px";

    sendBtn.disabled =
        this.value.trim().length === 0;
});


// ============================================================
// ENTER KEY
// ============================================================

userInput.addEventListener("keydown", function (e) {

    if (e.key === "Enter" && !e.shiftKey) {

        e.preventDefault();

        if (!sendBtn.disabled) {
            sendMessage();
        }
    }
});


// ============================================================
// SEND BUTTON
// ============================================================

sendBtn.addEventListener(
    "click",
    sendMessage
);


// ============================================================
// SUGGESTION CARDS
// ============================================================

document.querySelectorAll(".suggestion-card")
    .forEach(card => {

        card.addEventListener("click", () => {

            const promptText =
                card.getAttribute("data-prompt");

            userInput.value = promptText;

            userInput.style.height = "auto";

            userInput.style.height =
                (userInput.scrollHeight - 10) + "px";

            sendBtn.disabled = false;

            sendMessage();
        });

    });


// ============================================================
// NEW CHAT
// ============================================================

newChatBtn.addEventListener("click", () => {

    previousInteractionId = null;

    chatMessages.innerHTML = "";

    chatMessages.classList.add("hidden");

    heroState.classList.remove("hidden");

    userInput.value = "";

    userInput.style.height = "auto";

    sendBtn.disabled = true;

    researchIndicator.classList.add("hidden");

    console.log(
        "[GHOTI AI] New chat started"
    );
});


// ============================================================
// ONLINE / OFFLINE
// ============================================================

window.addEventListener("online", () => {

    offlineBanner.classList.add("hidden");

    console.log(
        "[GHOTI AI] Internet connection restored"
    );
});


window.addEventListener("offline", () => {

    offlineBanner.classList.remove("hidden");

    console.error(
        "[GHOTI AI] Internet connection lost"
    );
});


// ============================================================
// MAIN SEND FUNCTION
// ============================================================

async function sendMessage() {

    const text =
        userInput.value.trim();

    if (!text) return;


    // ========================================================
    // INTERNET CHECK
    // ========================================================

    if (!navigator.onLine) {

        offlineBanner.classList.remove("hidden");

        appendErrorMessage(
            "ইন্টারনেট সংযোগ নেই।",
            "OFFLINE"
        );

        console.error(
            "[GHOTI AI ERROR] Browser is offline"
        );

        return;
    }


    // ========================================================
    // SHOW CHAT
    // ========================================================

    heroState.classList.add("hidden");

    chatMessages.classList.remove("hidden");


    // ========================================================
    // USER MESSAGE
    // ========================================================

    appendMessage(
        text,
        "user"
    );

    userInput.value = "";

    userInput.style.height = "auto";

    sendBtn.disabled = true;


    // ========================================================
    // LOADING
    // ========================================================

    researchText.textContent =
        "GHOTI MARKET-এর তথ্য যাচাই করা হচ্ছে…";

    researchIndicator.classList.remove("hidden");

    scrollToBottom();


    const researchTimer =
        setTimeout(() => {

            researchText.textContent =
                "তথ্য প্রস্তুত করা হচ্ছে…";

        }, 1200);


    // ========================================================
    // REQUEST BODY
    // ========================================================

    const requestBody = {

        message: text,

        previousInteractionId:
            previousInteractionId

    };


    // ========================================================
    // CONSOLE - REQUEST START
    // ========================================================

    console.group(
        "%c GHOTI MARKET AI — REQUEST ",
        "color:white;background:#ff6b35;font-weight:bold;padding:4px 8px;"
    );

    console.log(
        "Backend URL:",
        BACKEND_URL
    );

    console.log(
        "Method:",
        "POST"
    );

    console.log(
        "Request Body:",
        requestBody
    );

    console.log(
        "Message:",
        text
    );

    console.log(
        "Previous Interaction ID:",
        previousInteractionId
    );

    console.log(
        "Browser Online:",
        navigator.onLine
    );

    console.groupEnd();


    // ========================================================
    // ABORT CONTROLLER
    // ========================================================

    const controller =
        new AbortController();

    const timeoutId =
        setTimeout(() => {

            controller.abort();

        }, REQUEST_TIMEOUT);


    try {

        // ====================================================
        // FETCH
        // ====================================================

        const response =
            await fetch(
                BACKEND_URL,
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Accept":
                            "application/json"

                    },

                    body:
                        JSON.stringify(
                            requestBody
                        ),

                    signal:
                        controller.signal

                }
            );


        clearTimeout(timeoutId);


        // ====================================================
        // RESPONSE BASIC INFO
        // ====================================================

        console.group(
            "%c GHOTI MARKET AI — RESPONSE ",
            "color:white;background:#2563eb;font-weight:bold;padding:4px 8px;"
        );

        console.log(
            "HTTP Status:",
            response.status
        );

        console.log(
            "HTTP Status Text:",
            response.statusText
        );

        console.log(
            "OK:",
            response.ok
        );

        console.log(
            "URL:",
            response.url
        );

        console.log(
            "Content-Type:",
            response.headers.get(
                "content-type"
            )
        );


        // ====================================================
        // ALL RESPONSE HEADERS
        // ====================================================

        const responseHeaders = {};

        response.headers.forEach(
            (value, key) => {

                responseHeaders[key] =
                    value;

            }
        );

        console.log(
            "Response Headers:",
            responseHeaders
        );

        console.groupEnd();


        // ====================================================
        // READ RAW RESPONSE FIRST
        // ====================================================

        const rawResponse =
            await response.text();


        // ====================================================
        // MOST IMPORTANT DEBUG
        // ====================================================

        console.group(
            "%c GHOTI MARKET AI — RAW RESPONSE ",
            "color:white;background:#dc2626;font-weight:bold;padding:4px 8px;"
        );

        console.log(
            "RAW RESPONSE:"
        );

        console.log(
            rawResponse
        );

        console.log(
            "RAW RESPONSE LENGTH:",
            rawResponse.length
        );

        console.groupEnd();


        // ====================================================
        // EMPTY RESPONSE
        // ====================================================

        if (!rawResponse.trim()) {

            console.error(
                "[GHOTI AI ERROR] Backend returned EMPTY response."
            );

            appendErrorMessage(
                "Backend কোনো response দেয়নি।",
                "EMPTY_RESPONSE"
            );

            return;
        }


        // ====================================================
        // PARSE JSON
        // ====================================================

        let data;

        try {

            data =
                JSON.parse(
                    rawResponse
                );

        } catch (jsonError) {

            console.group(
                "%c JSON PARSE ERROR ",
                "color:white;background:#b91c1c;font-weight:bold;padding:4px 8px;"
            );

            console.error(
                "JSON Error:",
                jsonError
            );

            console.error(
                "Raw Backend Response:",
                rawResponse
            );

            console.groupEnd();


            appendErrorMessage(

                "Backend valid JSON পাঠায়নি।",

                "INVALID_JSON",

                {
                    httpStatus:
                        response.status,

                    rawResponse:
                        rawResponse
                }

            );

            return;
        }


        // ====================================================
        // PARSED RESPONSE
        // ====================================================

        console.group(
            "%c GHOTI MARKET AI — PARSED RESPONSE ",
            "color:white;background:#16a34a;font-weight:bold;padding:4px 8px;"
        );

        console.log(
            "Parsed JSON:",
            data
        );

        console.log(
            "success:",
            data?.success
        );

        console.log(
            "reply:",
            data?.reply
        );

        console.log(
            "error:",
            data?.error
        );

        console.log(
            "message:",
            data?.message
        );

        console.log(
            "details:",
            data?.details
        );

        console.log(
            "previousInteractionId:",
            data?.previousInteractionId
        );

        console.groupEnd();


        // ====================================================
        // HTTP ERROR
        // ====================================================

        if (!response.ok) {

            const backendError =
                data?.error ||
                data?.message ||
                data?.details ||
                data?.reason ||
                data?.status ||
                "Backend কোনো error message দেয়নি।";


            console.group(
                "%c HTTP ERROR ",
                "color:white;background:#dc2626;font-weight:bold;padding:4px 8px;"
            );

            console.error(
                "HTTP Status:",
                response.status
            );

            console.error(
                "Status Text:",
                response.statusText
            );

            console.error(
                "Backend Error:",
                backendError
            );

            console.error(
                "Full Backend JSON:",
                data
            );

            console.groupEnd();


            appendErrorMessage(

                backendError,

                `HTTP_${response.status}`,

                {
                    httpStatus:
                        response.status,

                    statusText:
                        response.statusText,

                    response:
                        data
                }

            );

            return;
        }


        // ====================================================
        // SUCCESS
        // ====================================================

        if (data?.success === true) {

            previousInteractionId =
                data.previousInteractionId ||
                null;


            console.log(
                "%c GHOTI MARKET AI SUCCESS ",
                "color:white;background:#16a34a;font-weight:bold;padding:4px 8px;"
            );


            appendMessage(

                data.reply ||
                "কোনো উত্তর পাওয়া যায়নি।",

                "ai"

            );

            return;
        }


        // ====================================================
        // SUCCESS = FALSE
        // ====================================================

        console.group(
            "%c BACKEND SUCCESS = FALSE ",
            "color:white;background:#ea580c;font-weight:bold;padding:4px 8px;"
        );

        console.error(
            "Backend returned success=false"
        );

        console.error(
            "Full Response:",
            data
        );

        console.error(
            "Error:",
            data?.error
        );

        console.error(
            "Message:",
            data?.message
        );

        console.error(
            "Details:",
            data?.details
        );

        console.error(
            "Reason:",
            data?.reason
        );

        console.error(
            "Status:",
            data?.status
        );

        console.groupEnd();


        // ====================================================
        // FIND ANY POSSIBLE ERROR FIELD
        // ====================================================

        const backendError =
            data?.error ||
            data?.message ||
            data?.details ||
            data?.reason ||
            data?.cause ||
            data?.status ||
            "Backend success=false দিয়েছে, কিন্তু কোনো error/message/details পাঠায়নি।";


        // ====================================================
        // SHOW FULL BACKEND RESPONSE
        // ====================================================

        appendErrorMessage(

            backendError,

            "BACKEND_ERROR",

            {

                httpStatus:
                    response.status,

                response:
                    data,

                rawResponse:
                    rawResponse

            }

        );


    } catch (error) {

        clearTimeout(timeoutId);


        // ====================================================
        // FULL JAVASCRIPT ERROR
        // ====================================================

        console.group(
            "%c GHOTI MARKET AI — JAVASCRIPT ERROR ",
            "color:white;background:#7f1d1d;font-weight:bold;padding:4px 8px;"
        );

        console.error(
            "Error Object:",
            error
        );

        console.error(
            "Error Name:",
            error?.name
        );

        console.error(
            "Error Message:",
            error?.message
        );

        console.error(
            "Error Stack:",
            error?.stack
        );

        console.error(
            "Backend URL:",
            BACKEND_URL
        );

        console.error(
            "Request Body:",
            requestBody
        );

        console.groupEnd();


        // ====================================================
        // TIMEOUT
        // ====================================================

        if (
            error?.name ===
            "AbortError"
        ) {

            appendErrorMessage(

                `Backend ${REQUEST_TIMEOUT / 1000} সেকেন্ডের মধ্যে response দেয়নি।`,

                "TIMEOUT",

                {

                    timeout:
                        REQUEST_TIMEOUT,

                    error:
                        error?.message

                }

            );

        }


        // ====================================================
        // NETWORK / CORS
        // ====================================================

        else if (

            error instanceof TypeError ||

            error?.message
                ?.toLowerCase()
                .includes(
                    "failed to fetch"
                )

        ) {

            appendErrorMessage(

                "Backend-এর সঙ্গে connection failed। CORS, Network, DNS অথবা Worker সমস্যা হতে পারে।",

                "NETWORK_OR_CORS_ERROR",

                {

                    error:
                        error?.message,

                    stack:
                        error?.stack

                }

            );

        }


        // ====================================================
        // OTHER JAVASCRIPT ERROR
        // ====================================================

        else {

            appendErrorMessage(

                error?.message ||
                "অজানা JavaScript error হয়েছে।",

                "JAVASCRIPT_ERROR",

                {

                    name:
                        error?.name,

                    message:
                        error?.message,

                    stack:
                        error?.stack

                }

            );
        }


    } finally {

        clearTimeout(
            timeoutId
        );

        clearTimeout(
            researchTimer
        );

        researchIndicator.classList.add(
            "hidden"
        );

        sendBtn.disabled =
            userInput.value.trim().length === 0;

        scrollToBottom();
    }
}


// ============================================================
// APPEND NORMAL MESSAGE
// ============================================================

function appendMessage(
    text,
    sender
) {

    const msgDiv =
        document.createElement(
            "div"
        );

    msgDiv.classList.add(
        "message",
        sender
    );


    if (sender === "ai") {

        msgDiv.innerHTML =
            formatMarkdown(
                String(text)
            );

    } else {

        msgDiv.textContent =
            String(text);
    }


    chatMessages.appendChild(
        msgDiv
    );

    scrollToBottom();
}


// ============================================================
// APPEND ERROR MESSAGE
// ============================================================

function appendErrorMessage(
    message,
    errorType = "ERROR",
    debugData = null
) {

    const msgDiv =
        document.createElement(
            "div"
        );

    msgDiv.classList.add(
        "message",
        "ai",
        "error-message"
    );


    let debugHTML = "";


    // ========================================================
    // DEBUG DATA
    // ========================================================

    if (debugData) {

        let debugString;

        try {

            debugString =
                JSON.stringify(
                    debugData,
                    null,
                    2
                );

        } catch (e) {

            debugString =
                String(
                    debugData
                );
        }


        debugHTML = `

            <details
                style="
                    margin-top:12px;
                    border-top:1px solid #ddd;
                    padding-top:10px;
                "
            >

                <summary
                    style="
                        cursor:pointer;
                        font-weight:600;
                    "
                >
                    Technical Details
                </summary>

                <pre
                    style="
                        margin-top:8px;
                        padding:10px;
                        white-space:pre-wrap;
                        word-break:break-word;
                        overflow:auto;
                        font-size:11px;
                        background:#f5f5f5;
                        border-radius:8px;
                    "
                >${escapeHtml(
                    debugString
                )}</pre>

            </details>

        `;
    }


    msgDiv.innerHTML = `

        <div>
            <strong>
                GHOTI MARKET AI Error
            </strong>
        </div>

        <div
            style="
                margin-top:8px;
                word-break:break-word;
            "
        >
            ${escapeHtml(
                message
            )}
        </div>

        <div
            style="
                margin-top:8px;
                font-size:12px;
                opacity:0.65;
                word-break:break-word;
            "
        >
            Error Type:
            ${escapeHtml(
                errorType
            )}
        </div>

        ${debugHTML}

    `;


    chatMessages.appendChild(
        msgDiv
    );

    scrollToBottom();
}


// ============================================================
// MARKDOWN
// ============================================================

function formatMarkdown(text) {

    let formatted =
        escapeHtml(text);


    formatted =
        formatted.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        );


    formatted =
        formatted.replace(
            /\*(.*?)\*/g,
            "<em>$1</em>"
        );


    formatted =
        formatted.replace(
            /^- (.*)$/gm,
            "<li>$1</li>"
        );


    if (
        formatted.includes(
            "<li>"
        )
    ) {

        formatted =
            formatted.replace(
                /(<li>.*<\/li>)/gs,
                "<ul>$1</ul>"
            );
    }


    return formatted
        .split(/\n\s*\n/)
        .map(
            p => `<p>${p}</p>`
        )
        .join("");
}


// ============================================================
// ESCAPE HTML
// ============================================================

function escapeHtml(value) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );
}


// ============================================================
// SCROLL
// ============================================================

function scrollToBottom() {

    const chatMain =
        document.querySelector(
            ".chat-main"
        );

    if (!chatMain) return;

    chatMain.scrollTop =
        chatMain.scrollHeight;
}


// ============================================================
// INITIAL NETWORK CHECK
// ============================================================

if (!navigator.onLine) {

    offlineBanner.classList.remove(
        "hidden"
    );
}


// ============================================================
// GLOBAL JAVASCRIPT ERROR LOGGER
// ============================================================

window.addEventListener(
    "error",
    function (event) {

        console.group(
            "%c GLOBAL JAVASCRIPT ERROR ",
            "color:white;background:#991b1b;font-weight:bold;padding:4px 8px;"
        );

        console.error(
            "Message:",
            event.message
        );

        console.error(
            "File:",
            event.filename
        );

        console.error(
            "Line:",
            event.lineno
        );

        console.error(
            "Column:",
            event.colno
        );

        console.error(
            "Error:",
            event.error
        );

        console.groupEnd();
    }
);


// ============================================================
// UNHANDLED PROMISE ERROR LOGGER
// ============================================================

window.addEventListener(
    "unhandledrejection",
    function (event) {

        console.group(
            "%c UNHANDLED PROMISE ERROR ",
            "color:white;background:#991b1b;font-weight:bold;padding:4px 8px;"
        );

        console.error(
            "Reason:",
            event.reason
        );

        console.error(
            "Promise:",
            event.promise
        );

        console.groupEnd();
    }
);


console.log(
    "%c GHOTI MARKET AI initialized successfully ",
    "color:white;background:#ff6b35;font-weight:bold;padding:6px 10px;"
);

console.log(
    "Backend:",
    BACKEND_URL
);

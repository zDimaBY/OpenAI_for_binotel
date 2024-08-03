let lastMessageId = null;
let responses = [];
let currentResponseIndex = 0;
let maxResponses = 5;

// Load settings and responses from storage
chrome.storage.sync.get(['messageCount'], (data) => {
  maxResponses = data.messageCount || maxResponses;
});

chrome.storage.local.get(['responses', 'currentResponseIndex'], (data) => {
  responses = data.responses || [];
  currentResponseIndex = data.currentResponseIndex || 0;
  ensureCarousel();
  updateCarousel();
});

function checkForNewMessages() {
  if (!window.location.href.includes('/my-chats/')) return;

  try {
    ensureCarousel();
    const messages = document.querySelectorAll(".message-content.incoming .message.incoming span.ng-star-inserted");
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const messageElement = lastMessage.closest('.message.incoming');
      const messageId = messageElement.getAttribute("id");
      const messageText = lastMessage.textContent.trim();

      if (messageId === "visitorDraftMessageId") {
        console.log("Ignoring draft message.");
        return;
      }

      if (messageId !== lastMessageId) {
        console.log("New message detected:", messageText);
        lastMessageId = messageId;
        chrome.runtime.sendMessage({ message: "newMessage", text: messageText }, (response) => {
          if (response.error) {
            console.error("OpenAI error:", response.error);
          } else {
            handleNewResponse(response.response);
          }
        });
      }
    }
  } catch (error) {
    console.error("Error in checkForNewMessages:", error);
  }
}

function handleNewResponse(response) {
  responses.push(response);
  if (responses.length > maxResponses) {
    responses.shift();
  }
  currentResponseIndex = responses.length - 1;
  updateCarousel();

  chrome.storage.local.set({ responses, currentResponseIndex });
}

function updateCarousel() {
  let carousel = document.querySelector('.openai-response-container');
  if (!carousel) {
    ensureCarousel();
    carousel = document.querySelector('.openai-response-container');
  }

  carousel.querySelector('.openai-response')?.remove();

  const responseDiv = document.createElement("div");
  responseDiv.className = "openai-response";
  responseDiv.textContent = responses[currentResponseIndex];

  carousel.appendChild(responseDiv);
}

function navigateCarousel(direction) {
  currentResponseIndex = (currentResponseIndex + direction + responses.length) % responses.length;
  updateCarousel();
  chrome.storage.local.set({ currentResponseIndex });
}

function ensureCarousel() {
  let carousel = document.querySelector('.openai-response-container');
  if (!carousel) {
    carousel = document.createElement("div");
    carousel.className = "openai-response-container";

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "button-container";

    const buttons = [
      { class: "carousel-arrow left-arrow", text: "←", handler: () => navigateCarousel(-1) },
      { class: "carousel-arrow right-arrow", text: "→", handler: () => navigateCarousel(1) },
      { class: "copy-button", text: "Copy", handler: copyResponseText },
      { class: "regenerate-button", text: "Regenerate", handler: regenerateResponse }
    ];

    buttons.forEach(({ class: className, text, handler }) => {
      const button = document.createElement("button");
      button.className = className;
      button.textContent = text;
      button.addEventListener("click", handler);
      buttonContainer.appendChild(button);
    });

    carousel.appendChild(buttonContainer);
    
    // Create and append the initial response container
    const initialResponseDiv = document.createElement("div");
    initialResponseDiv.className = "openai-response";
    initialResponseDiv.textContent = responses[currentResponseIndex];

    carousel.appendChild(initialResponseDiv);
    
    insertResponseContainer(carousel);
  }
}

function insertResponseContainer(responseContainer) {
  const chatEditor = document.querySelector('op-send-message-zone');
  if (chatEditor) {
    chatEditor.parentNode.insertBefore(responseContainer, chatEditor);
  } else {
    console.error("Chat editor not found.");
  }
}

function copyResponseText() {
  const responseDiv = document.querySelector('.openai-response');
  if (responseDiv) {
    navigator.clipboard.writeText(responseDiv.textContent)
      .then(() => console.log("Text copied to clipboard."))
      .catch(err => console.error("Failed to copy text:", err));
  } else {
    console.log("No response text available to copy.");
  }
}

function regenerateResponse() {
  const responseDiv = document.querySelector('.openai-response');
  if (responseDiv) {
    const currentText = responseDiv.textContent;
    chrome.runtime.sendMessage({ message: "newMessage", text: currentText }, (response) => {
      if (response.error) {
        console.error("OpenAI error:", response.error);
      } else {
        handleNewResponse(response.response);
      }
    });
  } else {
    console.log("No response available to regenerate.");
  }
}

function injectStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .button-container {
  
  }
  
  .button-container .carousel-arrow,
  .button-container .copy-button,
  .button-container .regenerate-button {
    margin: 0 1px; /* Horizontal margin between buttons */
  }
  
  .carousel-arrow {
    background-color: #444;
    border: none;
    color: #fff;
    padding: 3px 7px;
    border-radius: 5px;
    cursor: pointer;
  }
    
  .carousel-arrow, .copy-button, .regenerate-button {
    background-color: #444;
    color: #fff;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
  }

  .carousel-arrow:hover, .copy-button:hover, .regenerate-button:hover {
    background-color: #555;
  }
  
  .openai-response {
    color: #212529;
    padding: 5px;
    background-color: #f1f1f1;
    border-radius: 4px;
    width: 100%;
    text-align: left;
  }
  `;
  document.head.appendChild(style);
}

injectStyles();

setInterval(checkForNewMessages, 2000);

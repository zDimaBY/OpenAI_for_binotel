let lastMessageId = null;
let responses = [];
let currentResponseIndex = 0;
let maxResponses = 5;

// Load settings and responses from storage
chrome.storage.sync.get(['messageCount'], (data) => {
  if (data.messageCount) {
    maxResponses = data.messageCount;
  }
});

chrome.storage.local.get(['responses', 'currentResponseIndex'], (data) => {
  if (data.responses) {
    responses = data.responses;
    currentResponseIndex = data.currentResponseIndex || 0;
    ensureCarousel(); // Ensure carousel is present when loading
    updateCarousel();
  }
});

function checkForNewMessages() {
  try {
    ensureCarousel(); // Ensure carousel is present before checking for new messages

    const messages = document.querySelectorAll(".message-content.incoming .message.incoming span.ng-star-inserted");
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const messageElement = lastMessage.closest('.message.incoming');
      const messageId = messageElement.getAttribute("id");
      const messageText = lastMessage.textContent.trim();

      //console.log("Current message ID:", messageId);
      //console.log("Last recorded message ID:", lastMessageId);

      // Skip processing if the message ID is "visitorDraftMessageId"
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
      } else {
        //console.log("No new message detected.");
      }
    }
  } catch (error) {
    console.error("Error in checkForNewMessages:", error);
  }
}

function handleNewResponse(response) {
  // Add new response to the responses array
  responses.push(response);
  if (responses.length > maxResponses) {
    responses.shift(); // Ensure only the last maxResponses are stored
  }
  currentResponseIndex = responses.length - 1;
  updateCarousel();

  // Save responses and index to storage
  chrome.storage.local.set({
    responses: responses,
    currentResponseIndex: currentResponseIndex
  });
}

function updateCarousel() {
  let carousel = document.querySelector('.openai-response-container');
  
  // Ensure carousel container is present
  if (!carousel) {
    console.log("Carousel container not found, creating new one.");
    ensureCarousel();
    carousel = document.querySelector('.openai-response-container');
  }

  // Clear previous response and append new one
  carousel.querySelector('.openai-response')?.remove(); // Remove existing response

  const responseDiv = document.createElement("div");
  responseDiv.className = "openai-response";
  responseDiv.textContent = responses[currentResponseIndex];

  carousel.appendChild(responseDiv);
}

function displayResponse(response) {
  handleNewResponse(response);
}

function navigateCarousel(direction) {
  currentResponseIndex = (currentResponseIndex + direction + responses.length) % responses.length;
  updateCarousel();

  // Save current response index to storage
  chrome.storage.local.set({
    currentResponseIndex: currentResponseIndex
  });
}

function ensureCarousel() {
  let carousel = document.querySelector('.openai-response-container');
  
  // If carousel does not exist, create and insert it
  if (!carousel) {
    console.log("Creating carousel container.");
    carousel = document.createElement("div");
    carousel.className = "openai-response-container";

    const buttonContainer = document.createElement("div");
    buttonContainer.className = "button-container";

    const leftArrow = document.createElement("button");
    leftArrow.className = "carousel-arrow left-arrow";
    leftArrow.textContent = "←";
    leftArrow.addEventListener("click", () => navigateCarousel(-1));

    const rightArrow = document.createElement("button");
    rightArrow.className = "carousel-arrow right-arrow";
    rightArrow.textContent = "→";
    rightArrow.addEventListener("click", () => navigateCarousel(1));

    // Add copy button
    const copyButton = document.createElement("button");
    copyButton.className = "copy-button";
    copyButton.textContent = "Copy";
    copyButton.addEventListener("click", copyResponseText);

    // Add regenerate button
    const regenerateButton = document.createElement("button");
    regenerateButton.className = "regenerate-button";
    regenerateButton.textContent = "Regenerate";
    regenerateButton.addEventListener("click", regenerateResponse);

    buttonContainer.appendChild(leftArrow);
    buttonContainer.appendChild(rightArrow);
    buttonContainer.appendChild(copyButton);
    buttonContainer.appendChild(regenerateButton);

    carousel.appendChild(buttonContainer);

    insertResponseContainer(carousel);
  }
}

function insertResponseContainer(responseContainer) {
  // Try to insert container in multiple possible places
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
    const text = responseDiv.textContent;
    navigator.clipboard.writeText(text).then(() => {
      console.log("Text copied to clipboard.");
    }).catch(err => {
      console.error("Failed to copy text:", err);
    });
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

// Set interval to check for new messages and ensure carousel
setInterval(checkForNewMessages, 2000);

let lastMessageId = null;

function checkForNewMessages() {
  try {
    const messages = document.querySelectorAll(".message-content.incoming .message.incoming span.ng-star-inserted");
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      const messageElement = lastMessage.closest('.message.incoming');
      const messageId = messageElement.getAttribute("id");
      const messageText = lastMessage.textContent.trim();

      console.log("Current message ID:", messageId);
      console.log("Last recorded message ID:", lastMessageId);

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
            displayResponse(response.response);
          }
        });
      } else {
        console.log("No new message detected.");
      }
    }
  } catch (error) {
    console.error("Error in checkForNewMessages:", error);
  }
}

function displayResponse(response) {
  const responseContainer = document.createElement("div");
  responseContainer.className = "openai-response-container";

  const responseDiv = document.createElement("div");
  responseDiv.className = "openai-response";
  responseDiv.textContent = response;

  responseContainer.appendChild(responseDiv);
  document.body.appendChild(responseContainer);

  // Scroll to the bottom of the response container
  responseContainer.scrollTop = responseContainer.scrollHeight;
}

setInterval(checkForNewMessages, 2000);

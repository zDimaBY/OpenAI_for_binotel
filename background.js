let prompt = "";
let style = "";
let lastRequestId = null;
let isProcessing = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "newMessage") {
    chrome.storage.sync.get(['openaiApiKey', 'model'], (data) => {
      const apiKey = data.openaiApiKey;
      const model = data.model || "gpt-4o-mini"; // Модель за замовчуванням, якщо не вказано
      if (apiKey) {
        fetchPromptAndStyle().then(() => {
          fetchResponseFromOpenAI(apiKey, model, request.text, sendResponse);
        });
      } else {
        sendResponse({ error: "API key is not set." });
      }
    });
    return true;  // Keeps the message channel open for sendResponse
  }
});

function fetchPromptAndStyle() {
  return Promise.all([
    fetch(chrome.runtime.getURL('prompt_file.md')).then(response => response.text()).then(data => { prompt = data; }),
    fetch(chrome.runtime.getURL('styles_file.md')).then(response => response.text()).then(data => { style = data; })
  ]);
}

function fetchResponseFromOpenAI(apiKey, model, text, sendResponse, requestId) {
  if (isProcessing) return;  // Prevent multiple requests
  isProcessing = true;
  lastRequestId = requestId;

  fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "system", content: prompt },
        { role: "system", content: style },
        { role: "user", content: text }
      ]
    })
  })
  .then(response => response.json())
  .then(data => {
    if (data.error) {
      sendResponse({ error: `OpenAI error: ${data.error.message}` });
    } else {
      const responseText = data.choices[0].message.content;
      sendResponse({ response: responseText });
      saveQuestionToFile(text);
    }
  })
  .catch(error => {
    console.error("Error:", error);
    sendResponse({ error: `Request error: ${error.message}` });
  })
  .finally(() => {
    isProcessing = false;
  });
}

function saveQuestionToFile(question) {
  chrome.storage.local.get(["questions"], (result) => {
    let questions = result.questions || [];
    questions.push(question);
    chrome.storage.local.set({ questions: questions }, () => {
      console.log("Question saved:", question);
    });
  });
}

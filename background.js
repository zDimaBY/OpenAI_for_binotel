const OPENAI_API_KEY = "xxxx";

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message === "fetchPoeticExplanation") {
    fetchPoeticExplanation(request.prompt, request.question, sendResponse);
    return true;  // Keeps the message channel open for sendResponse
  }
});

function fetchPoeticExplanation(prompt, question, sendResponse) {
  fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: prompt
        },
        {
          role: "user",
          content: question
        }
      ]
    })
  })
  .then(response => {
    if (!response.ok) throw new Error(`API response error: ${response.statusText}`);
    return response.json();
  })
  .then(data => {
    if (data.error) {
      sendResponse({error: `OpenAI error: ${data.error.message}`});
    } else {
      sendResponse({poem: data.choices[0].message.content});
    }
  })
  .catch(error => {
    console.error("Error:", error);
    sendResponse({error: `Request error: ${error.message}`});
  });
}

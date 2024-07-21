document.getElementById('getPoemButton').addEventListener('click', () => {
  const question = document.getElementById('question').value;
  sendMessageToBackground(question);
});

function sendMessageToBackground(question) {
  // Зчитуємо вміст файлів за допомогою fetch
  Promise.all([
    fetch(chrome.runtime.getURL('prompt_file.md')).then(response => response.text()),
    fetch(chrome.runtime.getURL('styles_file.md')).then(response => response.text())
  ])
  .then(([prompt, style]) => {
    const completePrompt = `${prompt}\n\nHow I would like ChatGPT to respond:\n\n${style}`;
    chrome.runtime.sendMessage(
      {
        message: "fetchPoeticExplanation",
        prompt: completePrompt,
        question: question
      },
      (response) => {
        if (response.error) {
          document.getElementById('result').textContent = response.error;
        } else {
          document.getElementById('result').textContent = response.poem;
        }
      }
    );
  })
  .catch(error => {
    console.error("Error reading files:", error);
    document.getElementById('result').textContent = "Failed to read prompt or style files.";
  });
}

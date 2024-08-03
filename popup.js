document.getElementById('saveBtn').addEventListener('click', () => {
  const apiKey = document.getElementById('apiKey').value;
  const messageCount = parseInt(document.getElementById('messageCount').value, 10) || 5; // Default to 5 if invalid
  const model = document.getElementById('model').value;

  chrome.storage.sync.set({ openaiApiKey: apiKey, messageCount: messageCount, model: model }, () => {
    document.getElementById('status').textContent = 'Settings saved successfully!';
    setTimeout(() => {
      document.getElementById('status').textContent = '';
    }, 3000);
  });
});

// Load the saved settings when the popup is opened
document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.sync.get(['openaiApiKey', 'messageCount', 'model'], (data) => {
    if (data.openaiApiKey) {
      document.getElementById('apiKey').value = data.openaiApiKey;
    }
    if (data.messageCount) {
      document.getElementById('messageCount').value = data.messageCount;
    }
    if (data.model) {
      document.getElementById('model').value = data.model;
    }
  });
});

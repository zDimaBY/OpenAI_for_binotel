document.getElementById('saveBtn').addEventListener('click', () => {
    const apiKey = document.getElementById('apiKey').value;
    chrome.storage.sync.set({ openaiApiKey: apiKey }, () => {
      document.getElementById('status').textContent = 'API Key saved successfully!';
      setTimeout(() => {
        document.getElementById('status').textContent = '';
      }, 3000);
    });
  });
  
  // Load the saved API key when the popup is opened
  document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get('openaiApiKey', (data) => {
      if (data.openaiApiKey) {
        document.getElementById('apiKey').value = data.openaiApiKey;
      }
    });
  });
  
// Request a new OAuth token
function requestAuthToken(interactive, callback) {
  chrome.identity.getAuthToken({ interactive: interactive }, (token) => {
    if (chrome.runtime.lastError) {
      console.error("Error fetching token:", chrome.runtime.lastError.message);
      callback(null);
    } else {
      callback(token);
    }
  });
}

// Message listener for OAuth token requests
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getAuthToken") {
    const interactive = message.interactive || false;
    requestAuthToken(interactive, (token) => {
      sendResponse({ token });
    });
    return true; // Keep message channel open for async response
  }
});

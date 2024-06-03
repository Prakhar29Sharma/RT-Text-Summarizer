// background.js
import apiKey from "./secrets.api_key.js";

// Listen for messages from the content script
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'getAPIKey') {
        sendResponse(apiKey());
    }
});

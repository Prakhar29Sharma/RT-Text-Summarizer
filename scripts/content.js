// content.js
// query using Hugging Face inference API (for prototyping)
async function query(data, apiKey) {
    const response = await fetch(
        "https://api-inference.huggingface.co/models/Falconsai/text_summarization",
        {
            headers: { Authorization: `Bearer ${apiKey}` },
            method: "POST",
            body: JSON.stringify(data),
        }
    );
    const result = await response.json();
    return result;
}

// fetch the API key from background.js 
chrome.runtime.sendMessage({ action: 'getAPIKey' }, function(apiKey) {
    if (apiKey) {
        extractAndShowSummary(apiKey);
    } else {
        console.error('API key not available.');
    }
});

// create a pop up with summarized data
async function extractAndShowSummary(apiKey) {
    const extractedText = extractMainContent();
    createPopup(extractedText, apiKey);
}

// Function to check if an element should be excluded based on its content or attributes
function isExcluded(element) {
    // Exclude elements with certain classes or IDs
    var excludedClasses = [
        'header', 'footer', 'nav', 'sidebar', 'advertisement', 'related-posts',
        'login', 'register', 'create-account', 'search', 'menu'
    ];

    // Exclude elements with specific text content
    var excludedTextContent = [
        'log in', 'create account', 'sign in', 'sign up', 'search', 'menu'
    ];

    // Check if the element has any excluded classes
    for (var i = 0; i < excludedClasses.length; i++) {
        if (element.classList.contains(excludedClasses[i])) {
            return true;
        }
    }

    // Check if the element's text content matches any excluded text
    for (var j = 0; j < excludedTextContent.length; j++) {
        if (element.textContent.toLowerCase().includes(excludedTextContent[j])) {
            return true;
        }
    }

    return false;
}

function extractMainContent() {
    // Function to clean up and extract text from an element
    function cleanAndExtractText(element) {
        if (!element) {
            return ''; // Return an empty string if the element is undefined or null
        }

        // Remove any script and style elements
        Array.from(element.querySelectorAll('script, style')).forEach(function(node) {
            node.remove();
        });

        // Remove any hidden elements
        Array.from(element.querySelectorAll('[hidden]')).forEach(function(node) {
            node.remove();
        });

        // Extract text
        return (element.innerText || '').trim();
    }

    // Traverse the DOM to find the main content area
    var mainContent = document.body;
    var wordCount = 0;
    var extractedText = '';

    mainContent.querySelectorAll('p, h1, h2, h3').forEach(function(element) {
        if (!isExcluded(element)) {
            // Extract text from the current element
            var text = cleanAndExtractText(element);

            // Count words in the extracted text
            var words = text.split(/\s+/);
            wordCount += words.length;

            // Add the extracted text to the result if the word count limit is not exceeded
            if (wordCount <= 5000) {
                extractedText += text + ' ';
            }
        }
    });

    // Return the extracted text (first 1000 words)
    return extractedText.trim();
}

async function createPopup(text, apiKey) {
    // Call the query function to get the API response
    const response = await query({ "inputs": text }, apiKey);

    // Log the actual content to the console
    console.log(text);

    // Create a popup element
    var popup = document.createElement('div');
    popup.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 9999;
        background-color: black;
        color: white;
        padding: 50px;
        border: 2px solid #ccc;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        max-width: 90%;
        max-height: 90%;
        overflow: auto;
    `;

    // Create a close button
    var closeButton = document.createElement('button');
    closeButton.textContent = 'x';
    closeButton.style.cssText = `
        position: absolute;
        top: 5px;
        right: 5px;
        height: 30px;
        width: 30px;
        background-color: red;
        color: white;
        font-weight:bold;
        border: none;
        border-radius: 50%;
        padding: 5px;
        cursor: pointer;
    `;
    closeButton.addEventListener('click', function() {
        popup.remove();
    });

    // Create a div element for the API response
    var responseElement = document.createElement('div');
    responseElement.innerHTML = "<h2 style='color:white';font-weight:bold;>Summary</h2>" + "<p style='color:white;'>" + response[0]['summary_text'] + "</p>";

    // Create a read aloud button
    var readAloudButton = document.createElement('button');
    readAloudButton.textContent = '🔊 Read Aloud';
    readAloudButton.style.cssText = `
        display: block;
        margin: 10px auto;
        padding: 10px 20px;
        background-color: white;
        color: black;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 16px;
        text-decoration: none;
    `;
    readAloudButton.addEventListener('click', function() {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Cancel any ongoing speech

            const utterance = new SpeechSynthesisUtterance(response[0]['summary_text']);
            utterance.onend = function() {
                console.log('SpeechSynthesisUtterance.onend');
            }
            utterance.onerror = function(event) {
                console.error('SpeechSynthesisUtterance.onerror', event);
            }
            window.speechSynthesis.speak(utterance);
        } else {
            alert('Sorry, your browser does not support text-to-speech.');
        }
    });

    // Append elements to the popup
    popup.appendChild(closeButton);
    popup.appendChild(responseElement);
    popup.appendChild(readAloudButton);

    // Append the popup to the document body
    document.body.appendChild(popup);
}

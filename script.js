document.addEventListener("DOMContentLoaded", () => {
  const typingForm = document.querySelector(".typing-form");
  const chatContainer = document.querySelector(".chat-list");
  const suggestions = document.querySelectorAll(".suggestion");
  const toggleThemeButton = document.querySelector("#theme-toggle-button");
  const deleteChatButton = document.querySelector("#delete-chat-button");

  // State variables
  let userMessage = null;
  let isResponseGenerating = false;

  // API configuration for Groq
  const GROQ_API_KEY = "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"; // Replace with your actual Groq API key
  const API_URL = "https://api.groq.com/openai/v1/chat/completions";

  // Load theme and chat data from local storage on page load
  const loadDataFromLocalstorage = () => {
    const savedChats = localStorage.getItem("saved-chats");
    const isLightMode = (localStorage.getItem("themeColor") === "light_mode");

    // Apply the stored theme
    document.body.classList.toggle("light_mode", isLightMode);
    toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";

    // Restore saved chats or clear the chat container
    chatContainer.innerHTML = savedChats || '';
    document.body.classList.toggle("hide-header", savedChats);

    chatContainer.scrollTo(0, chatContainer.scrollHeight); // Scroll to the bottom
  }

  // Create a new message element and return it
  const createMessageElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
  }

  // Function to format and highlight code blocks
  const formatCodeBlocks = (text) => {
    return text.replace(/```([\s\S]*?)```/g, (match, p1) => {
      // Encode HTML entities to avoid issues
      const encoded = p1.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return '<pre><code class="language-python">' + encoded + '</code></pre>';
    });
  }

  // Show typing effect by displaying characters one by one
  const showTypingEffect = (text, textElement, incomingMessageDiv, callback) => {
    let index = 0;
    textElement.innerHTML = ""; // Clear the element before typing

    // Set a faster typing speed for regular text and slower for code
    const typingSpeed = text.includes('<pre><code') ? 50 : 40; // Faster speed for regular text

    const typingInterval = setInterval(() => {
      if (index < text.length) {
        textElement.innerHTML += text[index];
        index++;
      } else {
        clearInterval(typingInterval);
        isResponseGenerating = false;
        incomingMessageDiv.querySelector(".icon").classList.remove("hide");
        localStorage.setItem("saved-chats", chatContainer.innerHTML); // Save chats to local storage
        if (callback) callback(); // Run callback function if provided
      }
      chatContainer.scrollTo(0, chatContainer.scrollHeight); // Scroll to the bottom
    }, typingSpeed); // Adjust the speed (in milliseconds) as needed
  }

  // Show code effect immediately
  const showCodeEffect = (text, textElement) => {
    textElement.innerHTML = text;
    // Highlight code using PrismJS after text is fully rendered
    Prism.highlightAllUnder(textElement);
  }

  // Fetch response from the Groq API based on user message
  const generateAPIResponse = async (incomingMessageDiv) => {
    const textElement = incomingMessageDiv.querySelector(".text"); // Getting text element

    try {
      // Send a POST request to the Groq API with the user's message
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [{
            role: "user",
            content: userMessage,
          }],
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error.message);

      // Get the API response text
      const apiResponse = formatCodeBlocks(data.choices[0].message.content);

      // Check if the response is code or regular text
      if (apiResponse.includes('<pre><code')) {
        showCodeEffect(apiResponse, textElement);
      } else {
        showTypingEffect(apiResponse, textElement, incomingMessageDiv);
      }
    } catch (error) { // Handle error
      isResponseGenerating = false;
      textElement.innerText = error.message;
      textElement.parentElement.closest(".message").classList.add("error");
    } finally {
      incomingMessageDiv.classList.remove("loading");
    }
  }

  // Show a loading animation while waiting for the API response
  const showLoadingAnimation = () => {
    const html = `<div class="message-content">
                    <img class="avatar" src="images/bot.svg" alt="Groq avatar">
                    <p class="text"></p>
                    <div class="loading-indicator">
                      <div class="loading-bar"></div>
                      <div class="loading-bar"></div>
                      <div class="loading-bar"></div>
                    </div>
                  </div>
                  <span onClick="copyMessage(this)" class="icon material-symbols-rounded">content_copy</span>`;

    const incomingMessageDiv = createMessageElement(html, "incoming", "loading");
    chatContainer.appendChild(incomingMessageDiv);

    chatContainer.scrollTo(0, chatContainer.scrollHeight); // Scroll to the bottom
    generateAPIResponse(incomingMessageDiv);
  }

  // Copy message text to the clipboard
  const copyMessage = (copyButton) => {
    const messageText = copyButton.parentElement.querySelector(".text").innerText;

    navigator.clipboard.writeText(messageText);
    copyButton.innerText = "done"; // Show confirmation icon
    setTimeout(() => copyButton.innerText = "content_copy", 1000); // Revert icon after 1 second
  }

  // Handle sending outgoing chat messages
  const handleOutgoingChat = () => {
    userMessage = typingForm.querySelector(".typing-input").value.trim() || userMessage;
    if(!userMessage || isResponseGenerating) return; // Exit if there is no message or response is generating

    isResponseGenerating = false;

    const html = `<div class="message-content">
                    <img class="avatar" src="images/user.jpg" alt="User avatar">
                    <p class="text"></p>
                  </div>`;

    const outgoingMessageDiv = createMessageElement(html, "outgoing");
    outgoingMessageDiv.querySelector(".text").innerText = userMessage;
    chatContainer.appendChild(outgoingMessageDiv);
    
    typingForm.reset(); // Clear input field
    document.body.classList.add("hide-header");
    chatContainer.scrollTo(0, chatContainer.scrollHeight); // Scroll to the bottom
    setTimeout(showLoadingAnimation, 500); // Show loading animation after a delay
  }

  // Toggle between light and dark themes
  toggleThemeButton.addEventListener("click", () => {
    const isLightMode = document.body.classList.toggle("light_mode");
    localStorage.setItem("themeColor", isLightMode ? "light_mode" : "dark_mode");
    toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";
  });

  // Delete all chats from local storage when button is clicked
  deleteChatButton.addEventListener("click", () => {
    if (confirm("Are you sure you want to delete all the chats?")) {
      localStorage.removeItem("saved-chats");
      loadDataFromLocalstorage();
    }
  });

  // Set userMessage and handle outgoing chat when a suggestion is clicked
  suggestions.forEach(suggestion => {
    suggestion.addEventListener("click", () => {
      userMessage = suggestion.querySelector(".text").innerText;
      handleOutgoingChat();
    });
  });

  // Prevent default form submission and handle outgoing chat
  typingForm.addEventListener("submit", (e) => {
    e.preventDefault(); 
    handleOutgoingChat();
  });

  loadDataFromLocalstorage();
});

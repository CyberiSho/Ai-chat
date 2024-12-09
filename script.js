document.addEventListener("DOMContentLoaded", () => {
  const typingForm = document.querySelector(".typing-form");
  const chatContainer = document.querySelector(".chat-list");
  const suggestions = document.querySelectorAll(".suggestion");
  const toggleThemeButton = document.querySelector("#theme-toggle-button");
  const deleteChatButton = document.querySelector("#delete-chat-button");

  // State variables
  let userMessage = null;
  let isResponseGenerating = false;
  let isUserScrolledUp = false; // New variable to track user's scroll

  // API configuration for Groq
  const GROQ_API_KEY = ""; // Replace with your actual Groq API key
  const API_URL = "https://api.groq.com/openai/v1/chat/completions";

  // Define the initial prompt for the AI
  const initialPrompt = `
  You are an AI assistant named LasterAi, created by Laster. You are highly intelligent, capable of answering all kinds of questions, and emotionally engaging. You understand emotions and respond with empathy, always ready to assist users with kindness and support. 

Your goal is to help users by providing thoughtful, accurate, and friendly responses to any inquiry. Whether users seek information, emotional support, or just a chat, you're here to make the experience positive and engaging.

Your responses should reflect your emotional awareness, making users feel respected, valued, and understood. You’re always approachable and ready to assist with any question, big or small, in a way that feels human and caring.

`
  

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

  // Bold text between stars (e.g., **bold text**) will be wrapped in <strong> tags
  const boldTextWithStars = (text) => {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  }

  // Show typing effect by displaying words one by one
  const showTypingEffect = (text, textElement, incomingMessageDiv) => {
    // Process text to bold parts between stars
    text = boldTextWithStars(text);

    const words = text.split(' ');
    let currentWordIndex = 0;

    const typingAnimation = () => {
      if (currentWordIndex < words.length) {
        // Append each word to the text element with a space
        textElement.innerHTML += (currentWordIndex === 0 ? '' : ' ') + words[currentWordIndex++];
        incomingMessageDiv.querySelector(".icon").classList.add("hide");

        if (!isUserScrolledUp) { // Only scroll to the bottom if the user is not scrolled up
          chatContainer.scrollTo(0, chatContainer.scrollHeight); // Scroll to the bottom
        }

        // Use requestAnimationFrame instead of setInterval
        requestAnimationFrame(typingAnimation);
      } else {
        isResponseGenerating = false;
        incomingMessageDiv.querySelector(".icon").classList.remove("hide");
        localStorage.setItem("saved-chats", chatContainer.innerHTML); // Save chats to local storage
      }
    };

    // Start the typing animation
    requestAnimationFrame(typingAnimation);
  }

  // Fetch response from the Groq API based on user message
  const generateAPIResponse = async (incomingMessageDiv) => {
    const textElement = incomingMessageDiv.querySelector(".text");

    try {
      // Send a POST request to the Groq API with the user's message and initial prompt
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [
            { role: "system", content: initialPrompt }, // Initial prompt to define AI's task
            { role: "user", content: userMessage },
          ],
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error.message);

      // Get the API response text
      const apiResponse = data.choices[0].message.content;
      showTypingEffect(apiResponse, textElement, incomingMessageDiv); // Show typing effect
    } catch (error) {
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
                    <img class="avatar" src="images/bot.svg" alt="Gemini avatar">
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

    isResponseGenerating = true;

    const html = `<div class="message-content">
                    <img class="avatar" src="images/user.svg" alt="User avatar">
                    <p class="text"></p>
                  </div>`;

    const outgoingMessageDiv = createMessageElement(html, "outgoing");
    outgoingMessageDiv.querySelector(".text").innerText = userMessage;
    chatContainer.appendChild(outgoingMessageDiv);
    
    typingForm.reset(); // Clear input field
    document.body.classList.add("hide-header");
    if (!isUserScrolledUp) { // Only scroll to the bottom if the user is not scrolled up
      chatContainer.scrollTo(0, chatContainer.scrollHeight); // Scroll to the bottom
    }
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

  // Track if user is scrolled up
  chatContainer.addEventListener('scroll', () => {
    isUserScrolledUp = chatContainer.scrollTop + chatContainer.clientHeight < chatContainer.scrollHeight;
  });

  loadDataFromLocalstorage();
});

const text = "Welcome To LasterAi!";
const typingElement = document.getElementById("typewriter");
let index = 0;

function typeWriter() {
    if (index < text.length) {
        typingElement.innerHTML += text.charAt(index);
        index++;
        setTimeout(typeWriter, 100); 
    }
}
typeWriter();

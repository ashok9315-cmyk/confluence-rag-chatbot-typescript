const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const clearButton = document.getElementById('clearButton');
const statusText = document.getElementById('status-text');
const statusElement = document.getElementById('status');

let isReady = false;

// Check server health
async function checkHealth() {
    try {
        const response = await fetch('/api/health');
        const data = await response.json();
        
        if (data.status === 'ready') {
            isReady = true;
            statusText.textContent = 'Ready';
            statusElement.classList.add('ready');
            statusElement.classList.remove('error');
            sendButton.disabled = false;
        } else if (data.error) {
            statusText.textContent = 'Error: ' + data.error;
            statusElement.classList.add('error');
            statusElement.classList.remove('ready');
        } else {
            statusText.textContent = 'Initializing...';
            setTimeout(checkHealth, 2000);
        }
    } catch (error) {
        console.error('Health check failed:', error);
        statusText.textContent = 'Connection error';
        statusElement.classList.add('error');
        setTimeout(checkHealth, 5000);
    }
}

// Add message to chat
function addMessage(content, isUser = false, sources = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${isUser ? 'user' : 'assistant'}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    messageDiv.appendChild(contentDiv);
    
    if (sources && sources.length > 0) {
        const sourcesDiv = document.createElement('div');
        sourcesDiv.className = 'sources';
        
        const sourcesTitle = document.createElement('div');
        sourcesTitle.className = 'sources-title';
        sourcesTitle.textContent = '📚 Sources:';
        sourcesDiv.appendChild(sourcesTitle);
        
        sources.forEach(source => {
            const sourceItem = document.createElement('div');
            sourceItem.className = 'source-item';
            
            const link = document.createElement('a');
            link.href = source.url;
            link.target = '_blank';
            link.textContent = source.title;
            
            const excerpt = document.createElement('div');
            excerpt.className = 'source-excerpt';
            excerpt.textContent = source.excerpt;
            
            sourceItem.appendChild(link);
            sourceItem.appendChild(excerpt);
            sourcesDiv.appendChild(sourceItem);
        });
        
        contentDiv.appendChild(sourcesDiv);
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show typing indicator
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message message-assistant';
    typingDiv.id = 'typing-indicator';
    
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    
    typingDiv.appendChild(indicator);
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Remove typing indicator
function removeTypingIndicator() {
    const typing = document.getElementById('typing-indicator');
    if (typing) {
        typing.remove();
    }
}

// Send message
async function sendMessage() {
    const message = messageInput.value.trim();
    
    if (!message || !isReady) return;
    
    // Add user message
    addMessage(message, true);
    messageInput.value = '';
    messageInput.style.height = 'auto';
    
    // Show typing indicator
    showTypingIndicator();
    sendButton.disabled = true;
    
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        });
        
        const data = await response.json();
        
        removeTypingIndicator();
        
        if (response.ok) {
            addMessage(data.answer, false, data.sources);
        } else {
            addMessage(`Error: ${data.error}`, false);
        }
    } catch (error) {
        removeTypingIndicator();
        addMessage('Failed to send message. Please try again.', false);
        console.error('Send error:', error);
    } finally {
        sendButton.disabled = false;
        messageInput.focus();
    }
}

// Clear chat history
async function clearHistory() {
    if (!confirm('Are you sure you want to clear the chat history?')) return;
    
    try {
        await fetch('/api/clear', { method: 'POST' });
        
        // Clear messages except welcome
        const messages = chatMessages.querySelectorAll('.message');
        messages.forEach(msg => msg.remove());
        
        // Show welcome message again
        const welcome = document.querySelector('.welcome-message');
        if (welcome) {
            welcome.style.display = 'block';
        }
    } catch (error) {
        console.error('Clear error:', error);
        alert('Failed to clear history');
    }
}

// Auto-resize textarea
messageInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});

// Send on Enter (Shift+Enter for new line)
messageInput.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Event listeners
sendButton.addEventListener('click', sendMessage);
clearButton.addEventListener('click', clearHistory);

// Hide welcome message on first user message
const originalAddMessage = addMessage;
addMessage = function(content, isUser, sources) {
    if (isUser) {
        const welcome = document.querySelector('.welcome-message');
        if (welcome) {
            welcome.style.display = 'none';
        }
    }
    originalAddMessage(content, isUser, sources);
};

// Start health check
checkHealth();

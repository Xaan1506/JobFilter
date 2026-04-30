// SmartJobFilter Chatbot Module
// Uses the BACKEND_URL defined in content.js to make secure proxy requests
(function() {
  var chatHistory = [
    { role: "system", content: "You are Smarty, a career AI assistant for SmartJobFilter. You have access to the user's resume and the jobs currently visible on their screen. Be conversational and natural. If the user just says 'Hi' or greets you, reply with a short greeting and ask how you can help. ONLY provide detailed job analysis, recommendations, or resume tips if the user explicitly asks a question or requests advice. ALWAYS use bullet points for lists and bold important terms using **text** format." }
  ];

  function initChatbot() {
    if (document.getElementById('sjf-chatbot-container')) return;

    var container = document.createElement('div');
    container.id = 'sjf-chatbot-container';
    container.className = 'sjf-chat-widget';

    var html = `
      <div class="sjf-chat-window" id="sjf-chat-window">
        <div class="sjf-chat-header">
          <div class="status-dot"></div>
          <h3 style="flex: 1;">Smarty AI</h3>
          <div style="display: flex; gap: 10px; align-items: center;">
            <label for="sjf-chat-upload" style="cursor: pointer; display: flex; color: #94a3b8;" title="Upload Resume">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              <input type="file" id="sjf-chat-upload" style="display: none;" accept=".pdf,.docx">
            </label>
          </div>
        </div>
        <div class="sjf-chat-messages" id="sjf-chat-messages">
          <div class="sjf-msg bot">Hi! I'm Smarty. I can help you analyze your fit for the jobs on this page or answer career questions. <br><br><b>Tip:</b> Click the upload icon above to share your resume for personalized advice!</div>
        </div>
        <div class="sjf-chat-input-area">
          <input type="text" class="sjf-chat-input" id="sjf-chat-input" placeholder="Ask about these jobs...">
          <button class="sjf-chat-send" id="sjf-chat-send">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          </button>
        </div>
      </div>
      <div class="sjf-chat-trigger" id="sjf-chat-trigger">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
      </div>
    `;

    container.innerHTML = html;
    document.body.appendChild(container);

    var trigger = container.querySelector('#sjf-chat-trigger');
    var windowEl = container.querySelector('#sjf-chat-window');
    var input = container.querySelector('#sjf-chat-input');
    var sendBtn = container.querySelector('#sjf-chat-send');
    var messagesContainer = container.querySelector('#sjf-chat-messages');
    var fileInput = container.querySelector('#sjf-chat-upload');

    fileInput.addEventListener('change', async function() {
      if (!fileInput.files.length) return;
      var file = fileInput.files[0];
      addMessage("Uploading " + file.name + "...", 'user');
      
      try {
        var text = await ResumeParser.extractText(file);
        var skills = ResumeParser.extractKeywords(text);
        var userProfile = { rawText: text, skills: skills };
        await chrome.storage.local.set({ userProfile: userProfile });
        addMessage("Perfect! I've analyzed your new resume. Now you can ask me which jobs fit you best or for tips on your profile.", 'bot');
      } catch (err) {
        addMessage("Error parsing resume: " + err.message, 'bot');
      }
    });

    trigger.addEventListener('click', function() {
      windowEl.style.display = windowEl.style.display === 'flex' ? 'none' : 'flex';
      if (windowEl.style.display === 'flex') input.focus();
    });

    sendBtn.addEventListener('click', handleSend);
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') handleSend();
    });

    async function handleSend() {
      // Check if context is still valid
      if (!chrome.runtime || !chrome.runtime.id) {
        if (typeof cleanUpSJF === 'function') cleanUpSJF();
        else container.remove();
        return;
      }

      var text = input.value.trim();
      if (!text) return;

      addMessage(text, 'user');
      input.value = '';

      // Show typing
      var typingIndicator = document.createElement('div');
      typingIndicator.className = 'sjf-msg bot typing';
      typingIndicator.innerHTML = '<span></span><span></span><span></span>';
      messagesContainer.appendChild(typingIndicator);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      try {
        var data = await chrome.storage.local.get(['userProfile', 'preferences']);

        var resumeText = data.userProfile ? data.userProfile.rawText.substring(0, 2000) : 'No resume uploaded.';
        
        // Collect visible jobs
        var visibleJobs = [];
        document.querySelectorAll('a[href*="/jobs/view/"]').forEach(function(link) {
            var card = link.closest('li') || link.closest('div[class*="card"]');
            if (card && card.innerText) {
                var title = card.innerText.split('\n')[0].trim();
                if (title && !visibleJobs.includes(title)) visibleJobs.push(title);
            }
        });

        // Add only the user's actual text to the chat history so the AI treats it normally
        chatHistory.push({ role: "user", content: text });

        // Build dynamic context to send silently
        var dynamicContext = "CURRENT CONTEXT:\nUser's Resume: " + resumeText + "\n\nVisible Jobs on Page: " + visibleJobs.slice(0, 10).join(', ');
        
        // Combine system prompt, dynamic context, and chat history
        var payloadMessages = [
          chatHistory[0], // Base system prompt
          { role: "system", content: dynamicContext },
          ...chatHistory.slice(1) // User and assistant history
        ];

        var response = await fetch(BACKEND_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: payloadMessages,
            temperature: 0.7,
            max_tokens: 500
          })
        });

        var result = await response.json();
        typingIndicator.remove();

        if (result.error) throw new Error(result.error.message);

        var aiMsg = result.choices[0].message.content;
        chatHistory.push({ role: "assistant", content: aiMsg });
        addMessage(aiMsg, 'bot');

      } catch (error) {
        typingIndicator.remove();
        addMessage("Sorry, I'm having trouble connecting: " + error.message, 'bot');
      }
    }

    function addMessage(text, side) {
      var msg = document.createElement('div');
      msg.className = 'sjf-msg ' + side;
      
      if (side === 'bot') {
        // Format bold text
        var formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Format bullet points (handle both * and -)
        if (formatted.includes('\n*') || formatted.includes('\n-')) {
          var lines = formatted.split('\n');
          var inList = false;
          var newHtml = '';
          lines.forEach(line => {
            if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
              if (!inList) { newHtml += '<ul>'; inList = true; }
              newHtml += '<li>' + line.trim().substring(2) + '</li>';
            } else {
              if (inList) { newHtml += '</ul>'; inList = false; }
              newHtml += line + '<br>';
            }
          });
          if (inList) newHtml += '</ul>';
          formatted = newHtml;
        } else {
          formatted = formatted.replace(/\n/g, '<br>');
        }
        msg.innerHTML = formatted;
      } else {
        msg.innerText = text;
      }
      
      messagesContainer.appendChild(msg);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // Delay init to ensure DOM is ready
  setTimeout(initChatbot, 2000);
})();

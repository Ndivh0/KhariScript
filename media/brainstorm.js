const vscode = typeof acquireVsCodeApi !== "undefined" ? acquireVsCodeApi() : null;

document.addEventListener('DOMContentLoaded', () => {
  const inputElem = document.getElementById('brainstorm-input');
  const brainstormBtn = document.getElementById('btn-brainstorm');
  const rephraseBtn = document.getElementById('btn-rephrase');
  const attachBtn = document.getElementById('btn-attach-file');
  const turnPromptBtn = document.getElementById('btn-turn-prompt');
  const planBtn = document.getElementById('btn-generate-plan');
  const exportSelect = document.getElementById('export-format');
  const output = document.getElementById('brainstorm-output');
  const tagElems = document.querySelectorAll('.flex.gap-3.py-4 > div');
  const selectedTags = new Set();

  // Tag selection logic
  tagElems.forEach(tagDiv => {
    tagDiv.style.cursor = 'pointer';
    tagDiv.addEventListener('click', () => {
      const tag = tagDiv.textContent.trim();
      if (selectedTags.has(tag)) {
        selectedTags.delete(tag);
        tagDiv.classList.remove('bg-[#b2e5df]', 'text-[#141f1d]');
        tagDiv.classList.add('bg-[#2b403e]', 'text-white');
      } else {
        selectedTags.add(tag);
        tagDiv.classList.remove('bg-[#2b403e]', 'text-white');
        tagDiv.classList.add('bg-[#b2e5df]', 'text-[#141f1d]');
      }
    });
  });

  // Helper to add a chat message
  function addMessage(content, sender = 'user') {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-bubble ${sender === 'user' ? 'user-bubble' : 'ai-bubble'}`;
    msgDiv.innerHTML = `
      <div class="flex items-start gap-3">
        <div class="rounded-full bg-[#b2e5df] w-8 h-8 flex items-center justify-center font-bold text-[#141f1d]">
          ${sender === 'user' ? 'You' : 'AI'}
        </div>
        <div class="bg-[#232e2b] rounded-xl px-4 py-3 text-base max-w-[80%] whitespace-pre-line">${content}</div>
      </div>
    `;
    output.appendChild(msgDiv);
    output.scrollTop = output.scrollHeight;
  }

  // Send brainstorm prompt
  function sendPrompt() {
    const input = inputElem.value.trim();
    const tags = Array.from(selectedTags);

    if (!input) {
      inputElem.focus();
      return;
    }

    addMessage(input, 'user');
    inputElem.value = '';
    if (vscode) {
      vscode.postMessage({
        type: 'brainstorm',
        prompt: input,
        tags,
      });
    } else {
      // For browser testing: simulate AI response
      setTimeout(() => {
        addMessage('Simulated AI response for: ' + input, 'ai');
      }, 800);
    }
  }

  // Rephrase Idea
  function rephraseIdea() {
    const input = inputElem.value.trim();
    if (!input) {
      inputElem.focus();
      return;
    }
    addMessage(input, 'user');
    if (vscode) {
      vscode.postMessage({
        type: 'rephrase',
        prompt: input,
      });
    } else {
      setTimeout(() => {
        addMessage('Simulated rephrased idea for: ' + input, 'ai');
      }, 800);
    }
  }

  // Attach File / URL
  function attachFile() {
    // Prompt user to choose between file or URL
    const choice = prompt('Type "file" to attach a file or paste a URL to attach:');
    if (!choice) return;

    if (choice.toLowerCase() === 'file') {
      // File attachment
      const input = document.createElement('input');
      input.type = 'file';
      input.addEventListener('change', (e) => {
        const file = input.files[0];
        if (!file) return;
        addMessage(`Attached file: ${file.name}`, 'user');
        // Optionally, send file info to extension:
        if (vscode) {
          vscode.postMessage({ command: 'attachFile', fileName: file.name });
        }
      });
      input.click();
    } else if (/^https?:\/\//.test(choice)) {
      // URL attachment
      addMessage(`Attached URL: <a href="${choice}" target="_blank">${choice}</a>`, 'user');
      // Optionally, send URL to extension:
      if (vscode) {
        vscode.postMessage({ command: 'attachURL', url: choice });
      }
    } else {
      alert('Invalid input. Please type "file" or paste a valid URL.');
    }
  }

  // Turn Into Prompt
  function turnIntoPrompt() {
    const input = inputElem.value.trim();
    if (!input) {
      inputElem.focus();
      return;
    }
    addMessage(input, 'user');
    if (vscode) {
      vscode.postMessage({
        type: 'turnPrompt',
        prompt: input,
      });
    } else {
      setTimeout(() => {
        addMessage('Simulated prompt version of: ' + input, 'ai');
      }, 800);
    }
  }

  // Summarize & Plan
  function summarizePlan() {
    addMessage('Summarize & Plan requested.', 'user');
    if (vscode) {
      vscode.postMessage({
        type: 'summarizePlan',
        // Optionally send conversation history
      });
    } else {
      setTimeout(() => {
        addMessage('Simulated plan summary.', 'ai');
      }, 800);
    }
  }

  // Export format change
  function exportFormatChanged() {
    const format = exportSelect.value;
    addMessage(`Export as ${format} selected. (placeholder)`, 'ai');
    // Implement export logic as needed
  }

  // Export chat history
  function exportChat(format) {
    const bubbles = document.querySelectorAll('.chat-bubble');
    if (bubbles.length === 0) {
      alert('No brainstorm history to export.');
      return;
    }

    if (format === 'markdown') {
      let md = '';
      bubbles.forEach(bubble => {
        const sender = bubble.querySelector('.rounded-full').textContent.trim();
        const text = bubble.querySelector('.bg-[#232e2b]').textContent.trim();
        md += `**${sender}:**\n${text}\n\n`;
      });
      const blob = new Blob([md], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'brainstorm.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    if (format === 'pdf') {
      // Simple PDF export using jsPDF (must include jsPDF in your HTML)
      showLoading(true);
      import('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js').then(jsPDFModule => {
        const { jsPDF } = jsPDFModule;
        const doc = new jsPDF();
        let y = 10;
        bubbles.forEach(bubble => {
          const sender = bubble.querySelector('.rounded-full').textContent.trim();
          const text = bubble.querySelector('.bg-[#232e2b]').textContent.trim();
          doc.text(`${sender}: ${text}`, 10, y);
          y += 10;
        });
        doc.save('brainstorm.pdf');
        showLoading(false);
      }).catch(() => {
        alert('PDF export failed. jsPDF not loaded.');
        showLoading(false);
      });
    }

    if (format === 'vault' && vscode) {
      // Send chat history to extension for saving
      const history = Array.from(bubbles).map(bubble => ({
        sender: bubble.querySelector('.rounded-full').textContent.trim(),
        text: bubble.querySelector('.bg-[#232e2b]').textContent.trim()
      }));
      vscode.postMessage({ command: 'saveBrainstormToVault', data: history });
      alert('Sent to vault!');
    }
  }

  // Event listeners
  brainstormBtn.addEventListener('click', sendPrompt);
  inputElem.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendPrompt();
    }
  });
  rephraseBtn.addEventListener('click', rephraseIdea);
  attachBtn.addEventListener('click', attachFile);
  turnPromptBtn.addEventListener('click', turnIntoPrompt);
  planBtn.addEventListener('click', summarizePlan);
  exportSelect.addEventListener('change', exportFormatChanged);

  // Listen for response from extension
  window.addEventListener('message', (event) => {
    const { type, data } = event.data;
    if (type === 'response') {
      addMessage(data, 'ai');
    }
    // You can handle other message types here as well
  });
});

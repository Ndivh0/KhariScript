const vscode = acquireVsCodeApi();

document.addEventListener('DOMContentLoaded', () => {
  // Tag selection logic
  const tagButtons = document.querySelectorAll('.tag-button');
  const selectedTags = new Set();

  tagButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.tag;
      if (selectedTags.has(tag)) {
        selectedTags.delete(tag);
        btn.classList.remove('active');
      } else {
        selectedTags.add(tag);
        btn.classList.add('active');
      }
    });
  });

  // Send brainstorm prompt
  const saveBtn = document.getElementById('save-brainstorm');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const inputElem = document.getElementById('brainstorm-input');
      const input = inputElem ? inputElem.value.trim() : '';
      const tags = Array.from(selectedTags);

      if (!input) {
        alert('Please enter some brainstorming text first.');
        return;
      }

      vscode.postMessage({
        type: 'brainstorm',
        prompt: input,
        tags,
      });
    });
  }

  // Listen for response from extension
  window.addEventListener('message', (event) => {
    const { type, data } = event.data;
    if (type === 'response') {
      alert('💡 GPT Suggestion:\n\n' + data);
    }
  });
});

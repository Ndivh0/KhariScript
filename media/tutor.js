document.addEventListener('DOMContentLoaded', () => {
  const input = document.querySelector('.input-text');
  const tagBtns = document.querySelectorAll('.tag-btn');
  const answerContent = document.querySelector('.answer-content');

  function sendPrompt(prompt) {
    answerContent.textContent = 'Thinking...';
    // Replace with real AI call if needed
    setTimeout(() => {
      answerContent.textContent = `AI response for: "${prompt}"`;
    }, 800);
  }

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') sendPrompt(input.value);
  });
  tagBtns.forEach(btn => btn.addEventListener('click', () => sendPrompt(btn.textContent)));
});

import { getSelectedEntry } from '../scripts/storage.js';

document.addEventListener('DOMContentLoaded', () => {
  const entry = getSelectedEntry();
  if (!entry) {
    document.querySelector('.selected-entry').textContent = 'No entry selected.';
    return;
  }
  document.querySelector('.selected-entry strong').textContent = entry.title;
  // Populate other fields as needed

  // Hook up buttons
  document.querySelector('.action-btn:nth-child(1)').onclick = () => alert('Reflect clicked!');
  document.querySelector('.action-btn:nth-child(2)').onclick = () => alert('Send to Prompt Tutor clicked!');
  document.querySelector('.action-btn:nth-child(3)').onclick = () => alert('Delete clicked!');
  document.querySelector('.action-btn:nth-child(4)').onclick = () => alert('Edit Tags clicked!');
});

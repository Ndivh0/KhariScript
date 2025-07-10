import { saveSelectedEntry } from '../scripts/storage.js';

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const tagButtons = document.querySelectorAll('.tag-btn');
  const entries = Array.from(document.querySelectorAll('.entry-item'));

  function filterEntries() {
    const query = searchInput.value.toLowerCase();
    const activeTag = document.querySelector('.tag-btn.active')?.textContent;
    entries.forEach(entry => {
      const matchesQuery = entry.textContent.toLowerCase().includes(query);
      const matchesTag = !activeTag || entry.textContent.includes(activeTag);
      entry.style.display = matchesQuery && matchesTag ? '' : 'none';
    });
  }

  searchInput.addEventListener('input', filterEntries);
  tagButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tagButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterEntries();
    });
  });

  entries.forEach(entry => {
    entry.addEventListener('click', () => {
      const entryData = {
        title: entry.querySelector('.entry-title').textContent,
        subtitle: entry.querySelector('.entry-subtitle').textContent
      };
      saveSelectedEntry(entryData);
      window.location.href = 'context.html';
    });
  });
});

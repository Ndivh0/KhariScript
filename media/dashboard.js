import { saveSelectedEntry } from '../scripts/storage.js';

let editingIndex = null;

// Example data for entries
let entryData = [
  {
    title: "Data Cleaning Script",
    subtitle: "Python, Data Analysis",
    desc: "A script that automates cleaning and preprocessing of datasets.",
    project: "Personal"
  },
  {
    title: "Model Training",
    subtitle: "Machine Learning",
    desc: "Training ML models on prepared datasets with cross-validation and hyperparameter tuning."
  }
  // Add more entries as needed
];

function renderEntry(data) {
  const article = document.createElement('article');
  article.className = 'entry-item';
  article.innerHTML = `
    <div class="entry-item-row">
      <div>
        <p class="entry-title">${data.title}</p>
        <p class="entry-subtitle">${data.subtitle}</p>
      </div>
      <button class="action-btn entry-reflect-btn">Reflect</button>
      <button class="action-btn entry-edit-btn">Edit</button>
      <button class="action-btn entry-delete-btn">Delete</button>
    </div>
    <p class="entry-desc">${data.desc}</p>
  `;
  return article;
}

function bindEntryEvents() {
  // Reflect button for each entry
  document.querySelectorAll('.entry-reflect-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const entry = btn.closest('.entry-item');
      let note = entry.querySelector('.reflect-note');
      if (!note) {
        note = document.createElement('textarea');
        note.className = 'input-text reflect-note';
        note.placeholder = 'Type your reflection here...';
        entry.appendChild(note);
      } else {
        note.remove();
      }
    });
  });

  // Edit button for each entry
  document.querySelectorAll('.entry-edit-btn').forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      const entry = entryData[idx];
      document.getElementById('entry-title-input').value = entry.title;
      document.getElementById('entry-subtitle-input').value = entry.subtitle;
      document.getElementById('entry-desc-input').value = entry.desc;
      editingIndex = idx;
      document.getElementById('btn-add-entry').textContent = 'Save Changes';
    });
  });

  // Delete button for each entry
  document.querySelectorAll('.entry-delete-btn').forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      const vscode = acquireVsCodeApi();
      vscode.postMessage({ command: 'deleteEntry', index: idx });
    });
  });
}

function loadEntries() {
  const entriesList = document.querySelector('.entries-list');
  entriesList.innerHTML = '';
  entryData.forEach(data => {
    const article = renderEntry(data);
    entriesList.appendChild(article);
  });
  bindEntryEvents();
}

function saveEntryToVault(entry) {
  const vscode = acquireVsCodeApi();
  vscode.postMessage({ command: 'saveEntry', data: entry });
}

document.addEventListener('DOMContentLoaded', () => {
  const vscode = acquireVsCodeApi();
  vscode.postMessage({ command: 'loadVault' });

  loadEntries();

  // Tag filtering
  const tagButtons = document.querySelectorAll('.tag-btn');
  const entries = document.querySelectorAll('.entry-item');
  let activeTag = null;

  tagButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (activeTag === btn.textContent) {
        activeTag = null;
        tagButtons.forEach(b => b.classList.remove('active'));
        entries.forEach(e => e.style.display = '');
      } else {
        activeTag = btn.textContent;
        tagButtons.forEach(b => b.classList.toggle('active', b === btn));
        entries.forEach(e => {
          const subtitle = e.querySelector('.entry-subtitle').textContent;
          e.style.display = subtitle.includes(activeTag) ? '' : 'none';
        });
      }
    });
  });

  // Sort entries
  const sortSelect = document.getElementById('sortSelect');
  sortSelect.addEventListener('change', () => {
    const value = sortSelect.value;
    const list = document.querySelector('.entries-list');
    const items = Array.from(list.children);
    items.sort((a, b) => {
      if (value === 'last-edited') return 0; // Implement real logic
      if (value === 'confidence') return 0; // Implement real logic
      if (value === 'tags') {
        return a.querySelector('.entry-subtitle').textContent.localeCompare(
          b.querySelector('.entry-subtitle').textContent
        );
      }
      return 0;
    });
    items.forEach(item => list.appendChild(item));
  });

  // Import Entry
  document.getElementById('btn-import').addEventListener('click', () => {
    alert('Import Entry clicked. Implement import logic here.');
  });

  // Compare Entries
  document.getElementById('btn-compare').addEventListener('click', () => {
    alert('Compare Entries clicked. Implement compare logic here.');
  });

  // Reflect button for each entry (re-bind after loading)
  document.querySelectorAll('.entries-list').forEach(list => {
    list.addEventListener('click', (e) => {
      if (e.target.classList.contains('entry-reflect-btn')) {
        const entry = e.target.closest('.entry-item');
        let note = entry.querySelector('.reflect-note');
        if (!note) {
          note = document.createElement('textarea');
          note.className = 'input-text reflect-note';
          note.placeholder = 'Type your reflection here...';
          entry.appendChild(note);
        } else {
          note.remove();
        }
      }
    });
  });

  // Search entries
  document.getElementById('searchInput').addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase();
    document.querySelectorAll('.entry-item').forEach(entry => {
      const title = entry.querySelector('.entry-title').textContent.toLowerCase();
      const subtitle = entry.querySelector('.entry-subtitle').textContent.toLowerCase();
      entry.style.display = (title.includes(val) || subtitle.includes(val)) ? '' : 'none';
    });
  });

  // Listen for messages from the extension (vault data)
  window.addEventListener('message', (event) => {
    const { command, data } = event.data;
    if (command === 'vaultData') {
      entryData = data;
      loadEntries();
    }
  });

  // Example: Add Entry button handler (requires corresponding HTML)
  document.getElementById('btn-add-entry').addEventListener('click', () => {
    const entry = {
      title: document.getElementById('entry-title-input').value,
      subtitle: document.getElementById('entry-subtitle-input').value,
      desc: document.getElementById('entry-desc-input').value,
      project: document.getElementById('entry-project-input').value
    };

    if (editingIndex !== null) {
      // Edit mode: update existing entry
      entryData[editingIndex] = entry;
      const vscode = acquireVsCodeApi();
      vscode.postMessage({ command: 'updateEntry', index: editingIndex, data: entry });
      editingIndex = null;
      document.getElementById('btn-add-entry').textContent = 'Add Entry';
    } else {
      // Add mode: add new entry
      saveEntryToVault(entry);
    }

    // Clear form after adding/editing
    document.getElementById('entry-title-input').value = '';
    document.getElementById('entry-subtitle-input').value = '';
    document.getElementById('entry-desc-input').value = '';
  });

  let editingIndex = null;

  document.querySelectorAll('.sidebar-list-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedProject = btn.textContent;
      document.querySelectorAll('.entry-item').forEach(entry => {
        const project = entryData.find(e => e.title === entry.querySelector('.entry-title').textContent)?.project;
        entry.style.display = (project === selectedProject) ? '' : 'none';
      });
    });
  });
});

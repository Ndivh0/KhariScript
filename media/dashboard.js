import { saveSelectedEntry } from '../scripts/storage.js';

let editingIndex = null;

// Example data for entries
let entryData = [
  {
    title: "Data Cleaning Script",
    tags: ["Python", "Data Analysis"],
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

function renderEntry(data, idx) {
  const tagsHtml = (data.tags || []).map((tag, tagIdx) =>
    `<span class="entry-tag">
      ${tag}
      <button class="remove-tag-btn" data-entry="${idx}" data-tag="${tagIdx}" title="Remove tag">×</button>
    </span>`
  ).join(' ');
  const article = document.createElement('article');
  article.className = 'entry-item';
  article.innerHTML = `
    <div class="entry-item-row">
      <input type="checkbox" class="compare-checkbox" data-index="${idx}" />
      <div>
        <p class="entry-title">${data.title}</p>
        <div class="entry-tags">${tagsHtml}
          <button class="add-tag-btn" data-entry="${idx}" title="Add tag">+</button>
        </div>
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
            if (confirm('Are you sure you want to delete this entry?')) {
        const vscode = acquireVsCodeApi();
        vscode.postMessage({ command: 'deleteEntry', index: idx });
      }
    });
  });

  // Remove tag button
  document.querySelectorAll('.remove-tag-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const entryIdx = parseInt(btn.getAttribute('data-entry'));
      const tagIdx = parseInt(btn.getAttribute('data-tag'));
      entryData[entryIdx].tags.splice(tagIdx, 1);
      loadEntries();
      // Optionally, persist the change:
      const vscode = acquireVsCodeApi();
      vscode.postMessage({ command: 'updateEntry', index: entryIdx, data: entryData[entryIdx] });
    });
  });

  // Add tag button
  document.querySelectorAll('.add-tag-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const entryIdx = parseInt(btn.getAttribute('data-entry'));
      const newTag = prompt('Enter new tag:');
      if (newTag && !entryData[entryIdx].tags.includes(newTag)) {
        entryData[entryIdx].tags.push(newTag);
        loadEntries();
        // Optionally, persist the change:
        const vscode = acquireVsCodeApi();
        vscode.postMessage({ command: 'updateEntry', index: entryIdx, data: entryData[entryIdx] });
      }
    });
  });
}

function loadEntries() {
  const list = document.querySelector('.entries-list');
  list.innerHTML = '';
  entryData.forEach((entry, idx) => {
    list.appendChild(renderEntry(entry, idx));
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
  let activeTags = [];


  tagButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.textContent;
      if (activeTags.includes(tag)) {
        activeTags = activeTags.filter(t => t !== tag);
        btn.classList.remove('active');
      } else {
        activeTags.push(tag);
        btn.classList.add('active');
      }

      // Filter entries
      document.querySelectorAll('.entry-item').forEach(entry => {
        const idx = parseInt(entry.querySelector('.compare-checkbox').dataset.index);
        const tags = entryData[idx].tags || [];
        // Show entry if it includes ALL active tags
        const show = activeTags.every(t => tags.includes(t));
        entry.style.display = (activeTags.length === 0 || show) ? '' : 'none';
        });
      showEmptyStateIfNeeded();
    });
  });

  // Clear tags button
  document.getElementById('btn-clear-tags').addEventListener('click', () => {
    activeTags = [];
    tagButtons.forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.entry-item').forEach(entry => entry.style.display = '');
    showEmptyStateIfNeeded();
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
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', (e) => {
      const file = input.files[0];
      if (!file) return;
      showLoading(true); // Show loading
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          if (Array.isArray(imported)) {
            entryData = entryData.concat(imported);
            imported.forEach(entry => saveEntryToVault(entry));
            loadEntries();
          } else {
            alert('Invalid file format.');
          }
        } catch (err) {
          alert('Failed to import: ' + err.message);
        }
        showLoading(false); // Hide loading
      };
      reader.readAsText(file);
    });
    input.click();
  });

  // Compare Entries
  document.getElementById('btn-compare').addEventListener('click', () => {
    const checked = Array.from(document.querySelectorAll('.compare-checkbox'))
      .filter(cb => cb.checked)
      .map(cb => parseInt(cb.getAttribute('data-index')));
    if (checked.length < 2) {
      alert('Select at least two entries to compare.');
      return;
    }
    // For simplicity, show a side-by-side comparison in a modal or alert
    const compareHtml = checked.map(idx => {
      const entry = entryData[idx];
      return `
        <div style="flex:1;min-width:200px;padding:8px;border:1px solid #ccc;">
          <h4>${entry.title}</h4>
          <p><strong>Subtitle:</strong> ${entry.subtitle}</p>
          <p><strong>Description:</strong> ${entry.desc}</p>
          <p><strong>Project:</strong> ${entry.project || ''}</p>
        </div>
      `;
    }).join('');
    const win = window.open('', '', 'width=800,height=600');
    win.document.write(`
      <html><head><title>Compare Entries</title>
      <style>body{font-family:sans-serif;display:flex;gap:16px;}</style>
      </head><body>${compareHtml}</body></html>
    `);
    win.document.close();
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
    showEmptyStateIfNeeded();
  });

  // Listen for messages from the extension (vault data)
  window.addEventListener('message', (event) => {
    const { command, data } = event.data;
    if (command === 'vaultData') {
      showLoading(false);
      entryData = data;
      loadEntries();
    }
  });

  // Example: Add Entry button handler (requires corresponding HTML)
  document.getElementById('btn-add-entry').addEventListener('click', () => {
    const tagsInput = document.getElementById('entry-tags-input').value;
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);

    // When adding/editing an entry:
    const now = new Date().toISOString();
    const entry = {
      title: document.getElementById('entry-title-input').value,
      tags,
      desc: document.getElementById('entry-desc-input').value,
      project: document.getElementById('entry-project-input').value,
      lastEdited: now
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

  function bindSidebarEvents() {
    document.querySelectorAll('.sidebar-list-item').forEach((btn, idx) => {
      btn.addEventListener('click', (e) => {
        // Prevent project click if rename/delete button was clicked
        if (e.target.classList.contains('sidebar-rename-btn') || e.target.classList.contains('sidebar-delete-btn')) return;
        const selectedProject = btn.firstChild.textContent;
        document.querySelectorAll('.entry-item').forEach(entry => {
          const project = entryData.find(e => e.title === entry.querySelector('.entry-title').textContent)?.project;
          entry.style.display = (project === selectedProject) ? '' : 'none';
        });
      });

      // Rename
      btn.querySelector('.sidebar-rename-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const oldName = projects[idx];
        const newName = prompt('Rename project/folder:', oldName);
        if (newName && !projects.includes(newName)) {
          projects[idx] = newName;
          // Update entries with old project name
          entryData.forEach(entry => {
            if (entry.project === oldName) entry.project = newName;
          });
          renderProjectsSidebar();
          renderProjectDropdown();
          loadEntries();
          bindSidebarEvents();
          saveProjects();
        }
      });

      // Delete
      btn.querySelector('.sidebar-delete-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const projectName = projects[idx];
        if (confirm(`Delete project/folder "${projectName}"? Entries in this project will not be deleted.`)) {
          projects.splice(idx, 1);
          renderProjectsSidebar();
          renderProjectDropdown();
          bindSidebarEvents();
          saveProjects();
        }
      });
    });
  }

  function renderProjectsSidebar() {
    const sidebarList = document.querySelector('.sidebar-list');
    sidebarList.innerHTML = '';
    projects.forEach(project => {
      const li = document.createElement('li');
      li.className = 'sidebar-list-item';
      li.textContent = project;

      // Add Rename button
      const renameBtn = document.createElement('button');
      renameBtn.textContent = '✏️';
      renameBtn.className = 'sidebar-rename-btn';
      renameBtn.title = 'Rename Project';
      li.appendChild(renameBtn);

      // Add Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '🗑️';
      deleteBtn.className = 'sidebar-delete-btn';
      deleteBtn.title = 'Delete Project';
      li.appendChild(deleteBtn);

      sidebarList.appendChild(li);
    });
  }

  function renderProjectDropdown() {
    const dropdown = document.getElementById('entry-project-input');
    dropdown.innerHTML = '';
    projects.forEach(project => {
      const option = document.createElement('option');
      option.value = project;
      option.textContent = project;
      dropdown.appendChild(option);
    });
  }

  function addProject(name) {
    projects.push(name);
    renderProjectsSidebar();
    renderProjectDropdown();
    bindSidebarEvents();
    saveProjects();
  }

  document.getElementById('btn-new-project').addEventListener('click', () => {
    const name = prompt('Enter new project/folder name:');
    if (name && !projects.includes(name)) {
      addProject(name);
    }
  });

  document.getElementById('btn-export').addEventListener('click', () => {
    showLoading(true);
    setTimeout(() => { // Simulate async for UX
      const dataStr = JSON.stringify(entryData, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'entries-export.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showLoading(false);
    }, 300); // Remove setTimeout if not needed
  });

  function showEmptyStateIfNeeded() {
    const visible = Array.from(document.querySelectorAll('.entry-item')).some(e => e.style.display !== 'none');
    let emptyMsg = document.getElementById('empty-state-msg');
    if (!visible) {
      if (!emptyMsg) {
        emptyMsg = document.createElement('div');
        emptyMsg.id = 'empty-state-msg';
        emptyMsg.textContent = 'No entries found.';
        emptyMsg.style = 'padding:2rem;text-align:center;color:#888;';
        document.querySelector('.entries-list').appendChild(emptyMsg);
      }
    } else if (emptyMsg) {
      emptyMsg.remove();
    }
  }

  function showLoading(show) {
    document.getElementById('loading-indicator').style.display = show ? '' : 'none';
  }

  // Initial check for empty state
  showEmptyStateIfNeeded();
});

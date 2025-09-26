// app.js - Study Goal Tracker (Web) using ES6 classes & localStorage

// ---------- Goal class ----------
class Goal {
  constructor(title, priority) {
    this.id = Goal.generateId();
    this.title = title;
    this.priority = Number(priority);
    this.completed = false;
    this.createdAt = Date.now();
  }

  static generateId() {
    return 'g_' + Math.random().toString(36).slice(2, 9);
  }
}

// ---------- StudyGoalTracker class ----------
class StudyGoalTracker {
  constructor() {
    this.goals = [];         // pending + uncompleted goals
    this.completedGoals = []; // completed list
    this.loadFromStorage();
  }

  // Add goal
  addGoal(title, priority) {
    const g = new Goal(title, priority);
    this.goals.push(g);
    this._sortByPriority();
    this.saveToStorage();
    return g;
  }

  // mark a goal as completed by id (completes top or any)
  completeGoalById(id) {
    const idx = this.goals.findIndex(g => g.id === id);
    if (idx === -1) return false;
    const [g] = this.goals.splice(idx, 1);
    g.completed = true;
    this.completedGoals.push(g);
    this.saveToStorage();
    return true;
  }

  // Search by title (case-insensitive)
  searchByTitle(term) {
    const q = term.trim().toLowerCase();
    if (!q) return [];
    return this.goals.filter(g => g.title.toLowerCase().includes(q))
      .concat(this.completedGoals.filter(g => g.title.toLowerCase().includes(q)));
  }

  // Delete goal (from pending or completed)
  deleteGoalById(id) {
    let idx = this.goals.findIndex(g => g.id === id);
    if (idx !== -1) {
      this.goals.splice(idx, 1);
      this.saveToStorage();
      return true;
    }
    idx = this.completedGoals.findIndex(g => g.id === id);
    if (idx !== -1) {
      this.completedGoals.splice(idx, 1);
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Update priority (for pending)
  updatePriority(id, newPriority) {
    const g = this.goals.find(x => x.id === id);
    if (!g) return false;
    g.priority = Number(newPriority);
    this._sortByPriority();
    this.saveToStorage();
    return true;
  }

  // Clear completed goals
  clearCompleted() {
    this.completedGoals = [];
    this.saveToStorage();
  }

  // Totals
  totals() {
    return { pending: this.goals.length, completed: this.completedGoals.length };
  }

  // internal: maintain priority queue behavior (smaller number = higher priority)
  _sortByPriority() {
    this.goals.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.createdAt - b.createdAt; // older first if same priority
    });
  }

  // Persist to localStorage
  saveToStorage() {
    localStorage.setItem('sgt_goals', JSON.stringify(this.goals));
    localStorage.setItem('sgt_completed', JSON.stringify(this.completedGoals));
  }

  // Load from storage
  loadFromStorage() {
    const g = localStorage.getItem('sgt_goals');
    const c = localStorage.getItem('sgt_completed');
    try {
      this.goals = g ? JSON.parse(g) : [];
      this.completedGoals = c ? JSON.parse(c) : [];
      // Ensure methods/shape consistent (no functions need)
      this._sortByPriority();
    } catch (e) {
      this.goals = [];
      this.completedGoals = [];
    }
  }
}

// ---------- UI logic ----------
const tracker = new StudyGoalTracker();

// DOM references
const addForm = document.getElementById('addForm');
const titleInput = document.getElementById('titleInput');
const priorityInput = document.getElementById('priorityInput');
const pendingList = document.getElementById('pendingList');
const completedList = document.getElementById('completedList');
const totalsDiv = document.getElementById('totals');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const clearCompletedBtn = document.getElementById('clearCompleted');

// render function
function renderAll() {
  // totals
  const t = tracker.totals();
  totalsDiv.textContent = `Pending: ${t.pending} | Completed: ${t.completed}`;

  // pending
  pendingList.innerHTML = '';
  tracker.goals.forEach(g => {
    const li = document.createElement('li');

    const left = document.createElement('div');
    left.className = 'goal-left';

    const titleEl = document.createElement('div');
    titleEl.innerHTML = `<div class="goal-title">${escapeHtml(g.title)}</div>
                         <div class="goal-meta">Priority: ${g.priority}</div>`;

    left.appendChild(titleEl);

    const btns = document.createElement('div');
    btns.className = 'btns';

    const completeBtn = document.createElement('button');
    completeBtn.className = 'small-btn complete-btn';
    completeBtn.textContent = 'Complete';
    completeBtn.onclick = () => { tracker.completeGoalById(g.id); renderAll(); };

    const updateBtn = document.createElement('button');
    updateBtn.className = 'small-btn update-btn';
    updateBtn.textContent = 'Update';
    updateBtn.onclick = () => { promptUpdatePriority(g.id, g.priority); };

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'small-btn delete-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = () => { if(confirm('Delete this goal?')) { tracker.deleteGoalById(g.id); renderAll(); } };

    btns.append(completeBtn, updateBtn, deleteBtn);

    li.append(left, btns);
    pendingList.appendChild(li);
  });

  // completed
  completedList.innerHTML = '';
  tracker.completedGoals.forEach(g => {
    const li = document.createElement('li');
    const left = document.createElement('div');
    left.className = 'goal-left';
    left.innerHTML = `<div class="goal-title">${escapeHtml(g.title)}</div>
                      <div class="goal-meta">Completed | Priority: ${g.priority}</div>`;

    const btns = document.createElement('div');
    btns.className = 'btns';

    const del = document.createElement('button');
    del.className = 'small-btn delete-btn';
    del.textContent = 'Delete';
    del.onclick = () => { if(confirm('Delete this completed goal?')) { tracker.deleteGoalById(g.id); renderAll(); } };

    btns.appendChild(del);
    li.append(left, btns);
    completedList.appendChild(li);
  });
}

// escape HTML simple
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, function(m) { return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]); });
}

// prompt update priority
function promptUpdatePriority(id, oldPriority) {
  const np = prompt('Enter new priority (1 = highest):', oldPriority);
  if (np === null) return;
  const n = parseInt(np, 10);
  if (!n || n < 1) { alert('Invalid priority'); return; }
  tracker.updatePriority(id, n);
  renderAll();
}

// add form submit
addForm.onsubmit = function(e) {
  e.preventDefault();
  const title = titleInput.value.trim();
  const pr = Number(priorityInput.value);
  if (!title || !pr) return;
  tracker.addGoal(title, pr);
  titleInput.value = '';
  priorityInput.value = '';
  renderAll();
};

// search
searchBtn.onclick = () => {
  const q = searchInput.value.trim();
  if (!q) { renderAll(); return; }
  const res = tracker.searchByTitle(q);
  // show results by replacing lists with matches
  pendingList.innerHTML = '';
  completedList.innerHTML = '';
  res.forEach(g => {
    const li = document.createElement('li');
    li.innerHTML = `<div class="goal-left">
      <div class="goal-title">${escapeHtml(g.title)}</div>
      <div class="goal-meta">${g.completed ? 'Completed' : 'Pending'} | Priority: ${g.priority}</div>
    </div>
    <div class="btns">
      <button class="small-btn delete-btn" onclick="if(confirm('Delete this goal?')){tracker.deleteGoalById('${g.id}'); renderAll();}">Delete</button>
      ${g.completed ? '' : `<button class="small-btn complete-btn" onclick="tracker.completeGoalById('${g.id}'); renderAll();">Complete</button>`}
      ${g.completed ? '' : `<button class="small-btn update-btn" onclick="promptUpdatePriority('${g.id}', ${g.priority})">Update</button>`}
    </div>`;
    (g.completed ? completedList : pendingList).appendChild(li);
  });
};

// clear search
clearSearchBtn.onclick = () => { searchInput.value=''; renderAll(); };

// clear completed
clearCompletedBtn.onclick = () => {
  if(confirm('Clear all completed goals?')) {
    tracker.clearCompleted();
    renderAll();
  }
};

// Initial render
renderAll();

// Expose helpers to global for inline onclicks in generated HTML
window.tracker = tracker;
window.renderAll = renderAll;
window.promptUpdatePriority = promptUpdatePriority;

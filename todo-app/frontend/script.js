const API_URL = 'http://localhost:3000/todos';
const AUTH_URL = 'http://localhost:3000';

// State
let todos = [];
let currentFilter = 'all'; // all, active, completed
let currentCategory = 'all'; // all, Work, Personal, etc.
let searchQuery = '';
let currentToken = localStorage.getItem('token');
let currentUsername = localStorage.getItem('username');

// DOM Elements
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const logoutBtn = document.getElementById('logout-btn');
const authError = document.getElementById('auth-error');

const taskInput = document.getElementById('task-input');
const categorySelect = document.getElementById('category-select');
const prioritySelect = document.getElementById('priority-select');
const dateSelect = document.getElementById('date-select');
const addBtn = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');
const taskCount = document.getElementById('task-count');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const themeSwitch = document.getElementById('theme-switch');
const currentDateEl = document.getElementById('current-date');
const greetingEl = document.getElementById('greeting');

// Modals
const editModal = document.getElementById('edit-modal');
const deleteModal = document.getElementById('delete-modal');
const editForm = document.getElementById('edit-form');
let itemToDeleteId = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    setupTheme();
    updateDateAndGreeting();

    if (currentToken) {
        showApp();
    } else {
        showAuth();
    }

    // Initialize SortableJS for Drag and Drop
    new Sortable(todoList, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: function (evt) {
            handleReorder();
        }
    });
});

function setupEventListeners() {
    // Add Task
    addBtn.addEventListener('click', addTask);
    taskInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    // Filtering & Categories
    document.querySelectorAll('.nav-menu li[data-filter]').forEach(item => {
        item.addEventListener('click', (e) => {
            // Remove active class from all filters
            document.querySelectorAll('.nav-menu li[data-filter]').forEach(li => li.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentFilter = e.currentTarget.dataset.filter;
            // Reset category when clicking a main filter if desired, or keep both. 
            // For this UI, let's say clicking a filter resets category highlight visually but we might want to combine them.
            // Let's keep them separate logic: Main List vs Category List.
            // If I click 'Work', I want to see all Work tasks.
            // If I click 'Pending', I want pending tasks from ANY category.
            // Let's make them mutually exclusive in UI focus for simplicity or combined.
            // Complex app: Filter AND Category. 
            // Simple app input: Sidebar implies one active view.

            // Let's say: 
            // Top list reset Category to 'all'.
            currentCategory = 'all';
            document.querySelectorAll('.nav-menu li[data-category]').forEach(li => li.classList.remove('active'));

            renderTodos();
        });
    });

    document.querySelectorAll('.nav-menu li[data-category]').forEach(item => {
        item.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-menu li[data-category]').forEach(li => li.classList.remove('active'));
            e.currentTarget.classList.add('active');

            // Visual feedback: uncheck top filters? Or keep 'All Tasks' active?
            // Let's set main filter to 'all' so we see everything in this category
            currentFilter = 'all';
            document.querySelectorAll('.nav-menu li[data-filter]').forEach(li => li.classList.remove('active'));

            currentCategory = e.currentTarget.dataset.category;
            renderTodos();
        });
    });

    // Search
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase();
        renderTodos();
    });

    // Theme Toggle
    themeSwitch.addEventListener('change', () => {
        const theme = themeSwitch.checked ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    });

    // Modals
    document.querySelector('#edit-modal .close-modal').addEventListener('click', () => editModal.style.display = 'none');
    document.getElementById('cancel-edit').addEventListener('click', () => editModal.style.display = 'none');

    document.getElementById('cancel-delete').addEventListener('click', () => deleteModal.style.display = 'none');
    document.getElementById('confirm-delete').addEventListener('click', confirmDeleteTask);

    editForm.addEventListener('submit', handleEditSubmit);

    // Auth Event Listeners
    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        loginForm.style.display = 'flex';
        registerForm.style.display = 'none';
        authError.textContent = '';
    });

    tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        registerForm.style.display = 'flex';
        loginForm.style.display = 'none';
        authError.textContent = '';
    });

    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    logoutBtn.addEventListener('click', logout);
}

function setupTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeSwitch.checked = savedTheme === 'dark';
}

function updateDateAndGreeting() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateEl.textContent = now.toLocaleDateString('en-US', options);

    const hour = now.getHours();
    let greeting = 'Good Morning';
    if (hour >= 12 && hour < 18) greeting = 'Good Afternoon';
    else if (hour >= 18) greeting = 'Good Evening';

    greetingEl.textContent = `${greeting}, User!`;
}

// --- AUTH ACTIONS ---
function showAuth() {
    authContainer.style.display = 'flex';
    appContainer.style.display = 'none';
}

function showApp() {
    authContainer.style.display = 'none';
    appContainer.style.display = 'flex';
    greetingEl.textContent = `Hello, ${currentUsername || 'User'}!`;
    fetchTodos();
}

function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    currentToken = null;
    currentUsername = null;
    todos = [];
    showAuth();
}

async function handleLogin(e) {
    e.preventDefault();
    authError.textContent = '';
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    try {
        const res = await fetch(`${AUTH_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        currentToken = data.token;
        currentUsername = data.username;
        localStorage.setItem('token', currentToken);
        localStorage.setItem('username', currentUsername);
        showApp();
    } catch (err) {
        authError.textContent = err.message;
    }
}

async function handleRegister(e) {
    e.preventDefault();
    authError.textContent = '';
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    try {
        const res = await fetch(`${AUTH_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        // After register, auto login or ask to login
        tabLogin.click();
        document.getElementById('login-username').value = username;
        document.getElementById('login-password').value = password;
        authError.textContent = 'Registration successful, please login.';
        authError.style.color = 'var(--priority-low)';
    } catch (err) {
        authError.textContent = err.message;
        authError.style.color = 'var(--priority-high)';
    }
}

// API Helper
async function apiFetch(url, options = {}) {
    if (!currentToken) throw new Error('Unauthorized');
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`,
        ...options.headers
    };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401 || res.status === 403) {
        logout();
        throw new Error('Unauthorized');
    }
    return res.json();
}

// --- API ACTIONS ---

async function fetchTodos() {
    try {
        const data = await apiFetch(API_URL);
        todos = data.data; // Backend returns { data: [...] }
        renderTodos();
    } catch (err) {
        console.error('Error fetching todos:', err);
    }
}

async function addTask() {
    const text = taskInput.value.trim();
    if (!text) return;

    const newTask = {
        task: text,
        category: categorySelect.value,
        priority: prioritySelect.value,
        due_date: dateSelect.value || null
    };

    try {
        const data = await apiFetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(newTask)
        });

        // Add to local state (at the top or where backend says? Backend returns full object)
        // Adjust for sorting: newly added is usually top or bottom.
        todos.unshift(data.data);
        renderTodos();

        // Reset Inputs
        taskInput.value = '';
    } catch (err) {
        console.error('Error adding task:', err);
        alert('Failed to add task');
    }
}

async function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'completed' : 'active';
    try {
        await apiFetch(`${API_URL}/${id}`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });

        // Update local state
        const task = todos.find(t => t.id === id);
        if (task) task.status = newStatus;
        renderTodos();
    } catch (err) {
        console.error('Error updating status:', err);
    }
}

// Delete Flow
function openDeleteModal(id) {
    itemToDeleteId = id;
    deleteModal.style.display = 'flex';
}

async function confirmDeleteTask() {
    if (!itemToDeleteId) return;

    try {
        await apiFetch(`${API_URL}/${itemToDeleteId}`, { method: 'DELETE' });
        todos = todos.filter(t => t.id !== itemToDeleteId);
        renderTodos();
        deleteModal.style.display = 'none';
        itemToDeleteId = null;
    } catch (err) {
        console.error('Error deleting task:', err);
    }
}

// Edit Flow
function openEditModal(id) {
    const task = todos.find(t => t.id === id);
    if (!task) return;

    document.getElementById('edit-id').value = task.id;
    document.getElementById('edit-task').value = task.task;
    document.getElementById('edit-category').value = task.category || 'General';
    document.getElementById('edit-priority').value = task.priority || 'medium';
    document.getElementById('edit-status').value = task.status;

    // Date needs formatting for input type="date"
    if (task.due_date) {
        document.getElementById('edit-date').value = new Date(task.due_date).toISOString().split('T')[0];
    } else {
        document.getElementById('edit-date').value = '';
    }

    editModal.style.display = 'flex';
}

async function handleEditSubmit(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('edit-id').value);
    const updates = {
        task: document.getElementById('edit-task').value,
        category: document.getElementById('edit-category').value,
        priority: document.getElementById('edit-priority').value,
        due_date: document.getElementById('edit-date').value || null,
        status: document.getElementById('edit-status').value
    };

    try {
        await apiFetch(`${API_URL}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });

        // Update local state
        const idx = todos.findIndex(t => t.id === id);
        if (idx !== -1) {
            todos[idx] = { ...todos[idx], ...updates, id }; // update fields
        }
        renderTodos();
        editModal.style.display = 'none';
    } catch (err) {
        console.error('Error editing task:', err);
    }
}

async function handleReorder() {
    // Get new order from DOM
    const items = Array.from(todoList.children);
    if (items.length === 0) return;
    // exclude empty state if present

    const updates = items.map((item, index) => {
        const id = item.dataset.id;
        if (!id) return null; // skip empty state msg
        return { id: parseInt(id), position: index };
    }).filter(Boolean);

    if (updates.length === 0) return;

    // Optimistically update local state positions logic if needed, 
    // but typically we just wait for next fetch or assume success.

    // Send to backend
    try {
        await apiFetch(`${API_URL}/reorder/batch`, {
            method: 'PUT',
            body: JSON.stringify({ updates })
        });
        // Success silently
    } catch (err) {
        console.error('Error reordering:', err);
        // Revert? (Complex, maybe just alert)
    }
}

// --- RENDERING ---

function renderTodos() {
    todoList.innerHTML = '';

    // Filter
    let filtered = todos.filter(t => {
        const matchesSearch = t.task.toLowerCase().includes(searchQuery);
        const matchesFilter = currentFilter === 'all' || t.status === currentFilter;
        const matchesCategory = currentCategory === 'all' || t.category === currentCategory;

        return matchesSearch && matchesFilter && matchesCategory;
    });

    taskCount.textContent = filtered.length;

    if (filtered.length === 0) {
        emptyState.style.display = 'block';
        return;
    } else {
        emptyState.style.display = 'none';
    }

    filtered.forEach(todo => {
        const li = document.createElement('li');
        li.className = `task-item priority-${todo.priority} ${todo.status === 'completed' ? 'completed' : ''}`;
        li.dataset.id = todo.id;

        // Format Date
        let dateHtml = '';
        if (todo.due_date) {
            const d = new Date(todo.due_date);
            dateHtml = `<span><i class="fa-regular fa-calendar"></i> ${d.toLocaleDateString()}</span>`;
        }

        const category = todo.category || 'General';

        li.innerHTML = `
            <div class="checkbox" onclick="window.toggleStatus(${todo.id}, '${todo.status}')">
                <i class="fa-solid fa-check"></i>
            </div>
            <div class="task-content">
                <div class="task-text">${escapeHtml(todo.task)}</div>
                <div class="task-meta">
                    <span class="badge" data-category="${category}"><i class="fa-solid fa-tag"></i> ${category}</span>
                    ${dateHtml}
                </div>
            </div>
            <div class="task-actions">
                <button class="action-btn" onclick="window.openEditModal(${todo.id})">
                    <i class="fa-solid fa-pen"></i>
                </button>
                <button class="action-btn delete-btn" onclick="window.openDeleteModal(${todo.id})">
                    <i class="fa-solid fa-trash"></i>
                </button>
                <button class="action-btn handle">
                    <i class="fa-solid fa-grip-vertical"></i>
                </button>
            </div>
        `;
        todoList.appendChild(li);
    });
}

function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Expose functions to global scope for HTML onclick attributes
window.toggleStatus = toggleStatus;
window.openEditModal = openEditModal;
window.openDeleteModal = openDeleteModal;

/**
 * FRONTEND LOGIC (script.js)
 * --------------------------
 * This file handles all the user interactions and connects the HTML to the Backend.
 * It uses the 'fetch' API to send requests to our Node.js/Express server.
 */

// Define the API URL - where our backend server is listening
const API_URL = 'http://localhost:3000/todos';

// Select DOM elements so we can manipulate them
const todoList = document.getElementById('todo-list');     // The <ul> list where tasks go
const todoInput = document.getElementById('todo-input');   // The input box for new tasks
const addBtn = document.getElementById('add-btn');         // The "Add" button

// --- MODAL ELEMENTS ---
const deleteModal = document.getElementById('delete-modal');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const cancelDeleteBtn = document.getElementById('cancel-delete');
let todoIdToDelete = null; // Store the ID of the todo we want to delete temporarily

/**
 * fetchTodos()
 * Fetches the list of todos from the backend and updates the UI.
 * This is an async function because fetching data takes time.
 */
async function fetchTodos() {
    try {
        // Send a GET request to the backend
        const response = await fetch(API_URL);
        // Parse the JSON response
        const data = await response.json();
        // Call renderTodos with the list of tasks from the database
        renderTodos(data.data);
    } catch (error) {
        console.error('Error fetching todos:', error);
    }
}

/**
 * renderTodos(todos)
 * Takes an array of todo objects and builds the HTML for each one.
 * @param {Array} todos - List of tasks form database
 */
function renderTodos(todos) {
    todoList.innerHTML = ''; // Clear the current list before re-rendering

    todos.forEach(todo => {
        // Create a new list item <li>
        const li = document.createElement('li');
        li.dataset.id = todo.id; // Store the ID for easy access

        // Add 'completed' class if the task status is 'completed'
        if (todo.status === 'completed') {
            li.classList.add('completed');
        }

        // --- STATUS TOGGLE BUTTON ---
        const statusBtn = document.createElement('div');
        statusBtn.className = 'status-btn';
        // Add click listener to toggle status
        statusBtn.onclick = (e) => {
            e.stopPropagation(); // Prevent triggering the row click
            toggleStatus(todo.id, todo.status);
        };

        // --- TASK CONTENT CONTAINER ---
        const taskContent = document.createElement('div');
        taskContent.style.flex = '1';
        taskContent.style.display = 'flex';
        taskContent.style.alignItems = 'center';

        const taskText = document.createElement('span');
        taskText.className = 'task-text';
        taskText.textContent = todo.task;

        // --- DATE DISPLAY ---
        const dateObj = new Date(todo.created_at);
        const dateStr = dateObj.toLocaleDateString(); // Format date nicely
        const dateSpan = document.createElement('span');
        dateSpan.className = 'task-date';
        dateSpan.textContent = dateStr;

        taskContent.appendChild(taskText);

        // --- ACTION BUTTONS (Edit / Delete) ---
        const actions = document.createElement('div');
        actions.className = 'task-actions';
        actions.style.display = 'flex';
        actions.style.alignItems = 'center';

        // Edit Button
        const editBtn = document.createElement('button');
        editBtn.className = 'btn-icon edit-btn';
        editBtn.innerHTML = '✎';
        editBtn.title = 'Edit';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            enableEdit(li, todo.id, todo.task); // Enter edit mode
        };

        // Delete Button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-icon delete-btn';
        deleteBtn.innerHTML = '🗑';
        deleteBtn.title = 'Delete';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deleteTodo(todo.id); // Trigger delete modal
        };

        // Assemble the row
        actions.appendChild(dateSpan);
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);

        li.appendChild(statusBtn);
        li.appendChild(taskContent);
        li.appendChild(actions);
        todoList.appendChild(li); // Add to the <ul>

        // Also allow clicking the text to edit
        taskText.addEventListener('click', () => enableEdit(li, todo.id, todo.task));
    });
}

/**
 * toggleStatus(id, currentStatus)
 * Switches a task between 'active' and 'completed'.
 */
async function toggleStatus(id, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'completed' : 'active';
    try {
        await updateTodoStatus(id, newStatus);
    } catch (error) {
        console.error('Error toggling status:', error);
    }
}

/**
 * updateTodoStatus(id, status)
 * Helper to send the PUT request for status updates.
 */
async function updateTodoStatus(id, status) {
    try {
        await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        fetchTodos(); // Refresh list
    } catch (error) {
        console.error('Error updating status:', error);
    }
}

/**
 * showDeleteModal(id)
 * Utility to show the custom delete modal.
 */
function showDeleteModal(id) {
    todoIdToDelete = id;
    deleteModal.classList.remove('hidden'); // Remove 'hidden' class to show it
}

/**
 * hideDeleteModal()
 * Utility to hide the delete modal.
 */
function hideDeleteModal() {
    todoIdToDelete = null;
    deleteModal.classList.add('hidden'); // Add 'hidden' class to hide it
}

// --- DELETE MODAL EVENT LISTENERS ---

// When user confirms delete
confirmDeleteBtn.addEventListener('click', async () => {
    if (todoIdToDelete) {
        try {
            await fetch(`${API_URL}/${todoIdToDelete}`, { method: 'DELETE' });
            fetchTodos(); // Refresh list
        } catch (error) {
            console.error('Error deleting todo:', error);
        }
        hideDeleteModal();
    }
});

// When user cancels delete
cancelDeleteBtn.addEventListener('click', hideDeleteModal);

// Close modal if user clicks outside the modal box
deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) hideDeleteModal();
});

function deleteTodo(id) {
    showDeleteModal(id);
}

/**
 * enableEdit(li, id, currentTask)
 * Replace the task text with an input field for inline editing.
 */
function enableEdit(li, id, currentTask) {
    if (li.classList.contains('editing')) return; // Already editing

    li.classList.add('editing');

    // Create an input field
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentTask;
    input.className = 'edit-input';

    // Replace the <li> content with the input field temporarily
    // Ideally we might want to hide elements instead of clearing innerHTML to be cleaner, 
    // but for simplicity we replace content here.
    li.innerHTML = '';
    li.appendChild(input);
    input.focus();

    // Listen for keys: Enter -> Save, Escape -> Cancel
    input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            await updateTodo(id, input.value);
        } else if (e.key === 'Escape') {
            fetchTodos(); // Re-fetch to cancel and restore view
        }
    });

    // Save when the user clicks away (blur)
    input.addEventListener('blur', async () => {
        await updateTodo(id, input.value);
    });
}

/**
 * updateTodo(id, newTask)
 * Sends PUT request to update task text.
 */
async function updateTodo(id, newTask) {
    if (!newTask.trim()) {
        fetchTodos(); // Use fetchTodos to restore old task if input is empty
        return;
    }

    try {
        await fetch(`${API_URL}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task: newTask })
        });
        fetchTodos();
    } catch (error) {
        console.error('Error updating todo:', error);
    }
}

/**
 * addTodo()
 * Reads input and sends POST request to create new task.
 */
async function addTodo() {
    const task = todoInput.value.trim();
    if (!task) return;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task })
        });

        if (response.ok) {
            todoInput.value = ''; // Clear input
            fetchTodos();         // Refresh list
        }
    } catch (error) {
        console.error('Error adding todo:', error);
    }
}

// --- GLOBAL EVENT LISTENERS ---

// Add button click
addBtn.addEventListener('click', addTodo);

// Enter key in main input
todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTodo();
});

// Load todos when page loads
fetchTodos();

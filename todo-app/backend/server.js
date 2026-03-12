/**
 * BACKEND SERVER CONFIGURATION
 * ----------------------------
 * This file sets up the Express server and connects to the MySQL database.
 * It handles all the API requests (GET, POST, PUT, DELETE) from the frontend.
 */

const express = require('express'); // Import Express framework for building web servers
const mysql = require('mysql2');    // Import MySQL driver to communicate with the database
const cors = require('cors');       // Import CORS to allow frontend to communicate with backend
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express(); // Initialize the Express application
const PORT = 3000;     // Define the port number where the server will listen
const JWT_SECRET = 'your-super-secret-jwt-key-replace-in-production';

// --- MIDDLEWARE ---
// CORS allows requests from different origins (like our frontend running on a file or different port)
app.use(cors());
// express.json() parses incoming JSON requests so we can access req.body
app.use(express.json());

// Serve static files from the frontend directory
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend')));

// --- DATABASE CONNECTION ---
// Create a connection configuration for MySQL
const db = mysql.createConnection({
    host: 'localhost',      // The address of the database server
    user: 'root',           // Database username
    password: 'sunil123',   // Database password
    multipleStatements: true // Allow executing multiple SQL queries at once (used for initialization)
});

// Connect to the database
db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL server: ' + err.stack);
        return;
    }
    console.log('Connected to MySQL server.');

    // --- DATABASE INITIALIZATION & MIGRATION ---
    const initSql = `
        CREATE DATABASE IF NOT EXISTS todo_db;
        USE todo_db;
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS todos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT,
            task VARCHAR(255) NOT NULL,
            status ENUM('active', 'completed') DEFAULT 'active',
            priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
            due_date DATE,
            category VARCHAR(50) DEFAULT 'General',
            position INT DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
    `;

    // Execute the initialization query
    db.query(initSql, (err) => {
        if (err) {
            console.error('Error initializing database: ' + err.message);
        } else {
            console.log('Database and table initialized.');

            // --- ROBUST MIGRATION FOR EXISTING TABLES ---
            // "IF NOT EXISTS" for ADD COLUMN is not supported in all MySQL versions.
            // Strategy: Try to add the column, and ignore Error 1060 (Duplicate column name).

            const migrations = [
                "ALTER TABLE todos ADD COLUMN priority ENUM('low', 'medium', 'high') DEFAULT 'medium'",
                "ALTER TABLE todos ADD COLUMN due_date DATE",
                "ALTER TABLE todos ADD COLUMN category VARCHAR(50) DEFAULT 'General'",
                "ALTER TABLE todos ADD COLUMN position INT DEFAULT 0",
                "ALTER TABLE todos ADD COLUMN user_id INT"
            ];

            migrations.forEach(query => {
                db.query(query, (err) => {
                    if (err) {
                        // Error 1060: Duplicate column name (Column already exists)
                        if (err.errno === 1060) {
                            // Column exists, safe to ignore
                        } else {
                            console.error('Migration error:', err.message);
                        }
                    } else {
                        console.log('Migration successful: ' + query);
                    }
                });
            });
        }
    });
});

// --- AUTHENTICATION MIDDLEWARE ---
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
        req.user = user;
        next();
    });
}

// --- AUTH API ENDPOINTS ---

/**
 * POST /register
 * Register a new user
 */
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err, results) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'Username already exists' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'User registered successfully', userId: results.insertId });
        });
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /login
 * Authenticate user and return JWT
 */
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password are required' });

    db.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(400).json({ error: 'Invalid username or password' });

        const user = results[0];
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid username or password' });

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ message: 'Login successful', token, username: user.username });
    });
});

// --- TODO API ENDPOINTS ---

/**
 * GET /todos
 * Fetches all tasks from the database.
 * Ordered by position (for drag & drop) then created_at.
 */
app.get('/todos', authenticateToken, (req, res) => {
    // Only fetch tasks for the logged-in user
    const sql = 'SELECT * FROM todos WHERE user_id = ? ORDER BY position ASC, created_at DESC';
    db.query(sql, [req.user.id], (err, results) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": results
        });
    });
});

/**
 * POST /todos
 * Creates a new task with optional details.
 */
app.post('/todos', authenticateToken, (req, res) => {
    const { task, priority, due_date, category } = req.body;
    if (!task) {
        res.status(400).json({ "error": "Task content is required" });
        return;
    }

    const sql = 'INSERT INTO todos (user_id, task, priority, due_date, category, position) VALUES (?, ?, ?, ?, ?, ?)';
    const params = [
        req.user.id,
        task,
        priority || 'medium',
        due_date || null,
        category || 'General',
        0 // Default position
    ];

    db.query(sql, params, function (err, results) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": {
                id: results.insertId,
                user_id: req.user.id,
                task,
                priority: priority || 'medium',
                due_date: due_date || null,
                category: category || 'General',
                status: 'active',
                position: 0,
                created_at: new Date()
            }
        });
    });
});

/**
 * PUT /todos/:id
 * Updates an existing task (text, status, priority, etc).
 */
app.put('/todos/:id', authenticateToken, (req, res) => {
    const { task, status, priority, due_date, category } = req.body;
    const { id } = req.params;

    let fields = [];
    let values = [];

    if (task !== undefined) { fields.push('task = ?'); values.push(task); }
    if (status !== undefined) { fields.push('status = ?'); values.push(status); }
    if (priority !== undefined) { fields.push('priority = ?'); values.push(priority); }
    if (due_date !== undefined) { fields.push('due_date = ?'); values.push(due_date); }
    if (category !== undefined) { fields.push('category = ?'); values.push(category); }

    if (fields.length === 0) {
        res.status(400).json({ "error": "No fields to update" });
        return;
    }

    values.push(id);
    values.push(req.user.id);
    const sql = `UPDATE todos SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;

    db.query(sql, values, function (err, results) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        if (results.affectedRows === 0) {
            return res.status(404).json({ "error": "Task not found or unauthorized" });
        }
        res.json({
            "message": "success",
            "changes": results.changedRows
        });
    });
});

/**
 * PUT /todos/reorder
 * Updates the positions of multiple tasks.
 * Expects JSON body: { "updates": [{ "id": 1, "position": 0 }, { "id": 2, "position": 1 }] }
 */
app.put('/todos/reorder/batch', authenticateToken, (req, res) => {
    const { updates } = req.body;
    if (!updates || !Array.isArray(updates)) {
        return res.status(400).json({ error: "Invalid updates format" });
    }

    // Process updates in a transaction or individual queries. 
    // For simplicity with mysql2, we'll run them individually but respond once done.
    // A better approach for production is a CASE statement or Transaction.

    let completed = 0;
    let errors = [];

    updates.forEach(item => {
        db.query('UPDATE todos SET position = ? WHERE id = ? AND user_id = ?', [item.position, item.id, req.user.id], (err) => {
            if (err) errors.push(err.message);
            completed++;

            if (completed === updates.length) {
                if (errors.length > 0) {
                    res.status(500).json({ error: "Some updates failed", details: errors });
                } else {
                    res.json({ message: "Reorder success" });
                }
            }
        });
    });
});


/**
 * DELETE /todos/:id
 * Deletes a task.
 */
app.delete('/todos/:id', authenticateToken, (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM todos WHERE id = ? AND user_id = ?';
    db.query(sql, [id, req.user.id], function (err, results) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "deleted",
            "changes": results.affectedRows
        });
    });
});

// --- START SERVER ---
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

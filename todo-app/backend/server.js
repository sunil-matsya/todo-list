/**
 * BACKEND SERVER CONFIGURATION
 * ----------------------------
 * This file sets up the Express server and connects to the MySQL database.
 * It handles all the API requests (GET, POST, PUT, DELETE) from the frontend.
 */

const express = require('express'); // Import Express framework for building web servers
const mysql = require('mysql2');    // Import MySQL driver to communicate with the database
const cors = require('cors');       // Import CORS to allow frontend to communicate with backend

const app = express(); // Initialize the Express application
const PORT = 3000;     // Define the port number where the server will listen

// --- MIDDLEWARE ---
// CORS allows requests from different origins (like our frontend running on a file or different port)
app.use(cors());
// express.json() parses incoming JSON requests so we can access req.body
app.use(express.json());

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

    // --- DATABASE INITIALIZATION ---
    // SQL query to create the database and table if they don't exist
    const initSql = `
        CREATE DATABASE IF NOT EXISTS todo_db;
        USE todo_db;
        CREATE TABLE IF NOT EXISTS todos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            task VARCHAR(255) NOT NULL,
            status ENUM('active', 'completed') DEFAULT 'active',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `;

    // Execute the initialization query
    db.query(initSql, (err) => {
        if (err) {
            console.error('Error initializing database: ' + err.message);
        } else {
            console.log('Database and table initialized.');
        }
    });
});

// --- API ENDPOINTS ---

/**
 * GET /todos
 * Fetches all tasks from the database.
 * Ordered by creation date (newest first).
 */
app.get('/todos', (req, res) => {
    const sql = 'SELECT * FROM todos ORDER BY created_at DESC';
    db.query(sql, (err, results) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        // Send back the list of tasks as JSON
        res.json({
            "message": "success",
            "data": results
        });
    });
});

/**
 * POST /todos
 * Creates a new task.
 * Expects JSON body: { "task": "Task Name" }
 */
app.post('/todos', (req, res) => {
    const { task } = req.body; // Extract 'task' from request body
    if (!task) {
        res.status(400).json({ "error": "Task content is required" });
        return;
    }
    const sql = 'INSERT INTO todos (task) VALUES (?)';
    // Use prepared statements (?) to prevent SQL injection
    db.query(sql, [task], function (err, results) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        // Return the newly created task with its ID
        res.json({
            "message": "success",
            "data": {
                id: results.insertId,
                task,
                status: 'active',
                created_at: new Date()
            }
        });
    });
});

/**
 * PUT /todos/:id
 * Updates an existing task (text or status).
 * Accesses the ID from the URL parameters (req.params.id)
 */
app.put('/todos/:id', (req, res) => {
    const { task, status } = req.body;
    const { id } = req.params;

    // Dynamically build the SQL query depending on what fields are provided
    let fields = [];
    let values = [];

    if (task !== undefined) {
        fields.push('task = ?');
        values.push(task);
    }
    if (status !== undefined) {
        fields.push('status = ?');
        values.push(status);
    }

    if (fields.length === 0) {
        res.status(400).json({ "error": "No fields to update" });
        return;
    }

    values.push(id); // Add ID as the last parameter for WHERE clause
    const sql = `UPDATE todos SET ${fields.join(', ')} WHERE id = ?`;

    db.query(sql, values, function (err, results) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "changes": results.changedRows
        });
    });
});

/**
 * DELETE /todos/:id
 * Deletes a task from the database by its ID.
 */
app.delete('/todos/:id', (req, res) => {
    const { id } = req.params;
    const sql = 'DELETE FROM todos WHERE id = ?';
    db.query(sql, [id], function (err, results) {
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

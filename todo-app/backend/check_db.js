
const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'sunil123',
    database: 'todo_db'
});

db.connect((err) => {
    if (err) {
        console.error('Connection failed:', err);
        process.exit(1);
    }

    db.query('DESCRIBE todos', (err, results) => {
        if (err) {
            console.error('Query failed:', err);
        } else {
            console.log(JSON.stringify(results, null, 2));
        }
        db.end();
    });
});

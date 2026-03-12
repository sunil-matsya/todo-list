# Todo List Application

A full-stack Todo List application built with Node.js, Express, MySQL, and Vanilla JavaScript. This application allows users to simple task management with features like marking tasks as completed and viewing creation dates.

## ✨ Features

- **CRUD Operations**: Create, Read, Update, and Delete tasks.
- **Authentication**: JWT-based user authentication and registration.
- **Author Isolation**: Users can only manage their own tasks.
- **Task Status**: Mark tasks as "Active" or "Completed" with visual indicators.
- **Date Tracking**: Automatically records and displays the date each task was created.
- **Custom UI**:
    - Glassmorphism design aesthetics.
    - Custom styled checkboxes.
    - Custom modal for delete confirmation (no default browser alerts).
    - Integrated Login and Register UI.
- **Persistent Storage**: All data is stored securely in a local MySQL database.

## 🛠 Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js, Express.js
- **Database**: MySQL
- **Security**: jsonwebtoken (JWT), bcrypt
- **Dependencies**: `mysql2`, `cors`, `express`, `jsonwebtoken`, `bcrypt`

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) installed on your machine.
- [MySQL Server](https://dev.mysql.com/downloads/mysql/) running locally.

### Installation

1.  **Clone the Repository**
    ```bash
    git clone <your-repo-url>
    cd todo-app
    ```

2.  **Setup Database**
    - Ensure your local MySQL server is running.
    - The application expects a user `root` with password `sunil123`.
    - *Note: You can change these credentials in `backend/server.js`.*
    - The database `todo_db` and tables `users` & `todos` will be created automatically when you start the server.

3.  **Install Backend Dependencies**
    ```bash
    cd backend
    npm install
    ```

4.  **Start the Server**
    ```bash
    npm start
    ```
    The server will start on `http://localhost:3000`.

5.  **Run the Frontend**
    - Open `frontend/index.html` in your web browser.

## 📂 Project Structure

Here is a detailed explanation of the files and folders:

```
todo-app/
│
├── backend/                # Server-side code
│   ├── node_modules/       # Project dependencies (hidden)
│   ├── package.json        # Defines backend dependencies (express, mysql2, cors, jsonwebtoken, bcrypt)
│   └── server.js           # Main server file:
│                           # - Connects to MySQL
│                           # - Initializes database schema
│                           # - Handles Authentication (JWT, bcrypt)
│                           # - Defines API endpoints (GET, POST, PUT, DELETE)
│
├── frontend/               # Client-side code
│   ├── index.html          # Main HTML structure:
│                           # - Input field, task list container, and modal UI
│   ├── style.css           # Styling styles:
│                           # - Variables, glassmorphism card, animations, responsive design
│   └── script.js           # Frontend Logic:
│                           # - Fetches data from backend API
│                           # - Renders tasks dynamically
│                           # - Handles user interactions (Add, Edit, Delete, Toggle Status)
│
└── README.md               # Project documentation
```

## 🔗 API Endpoints

| Method | Endpoint      | Description                     | Auth Required | Body Parameters |
| :----- | :------------ | :------------------------------ | :------------ | :-------------- |
| POST   | `/register`   | Register a new user             | No            | `{ "username": "...", "password": "..." }` |
| POST   | `/login`      | Authenticate and get JWT        | No            | `{ "username": "...", "password": "..." }` |
| GET    | `/todos`      | Fetch all tasks for user        | Yes           | -               |
| POST   | `/todos`      | Create a new task               | Yes           | `{ "task": "..." }` |
| PUT    | `/todos/:id`  | Update task text or status      | Yes           | `{ "task": "...", "status": "..." }` |
| DELETE | `/todos/:id`  | Delete a specific task          | Yes           | -               |

> **Note**: For endpoints requiring authentication, you must pass the JWT in the `Authorization` header as `Bearer <token>`.

---



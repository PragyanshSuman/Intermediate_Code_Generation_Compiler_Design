# 🔧 ICG Studio — Intermediate Code Generation

A full-stack Compiler Design project demonstrating the **Intermediate Code Generation** phase of a compiler. Enter any arithmetic or logical expression and instantly generate all four standard intermediate representations — backed by a **MySQL** database.

![ICG Studio Preview](https://img.shields.io/badge/Phase-Intermediate%20Code%20Generation-8b5cf6?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?style=for-the-badge&logo=node.js)
![MySQL](https://img.shields.io/badge/Database-MySQL-blue?style=for-the-badge&logo=mysql)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔢 **Expression Parser** | Recursive-descent parser supporting `+`, `-`, `*`, `/`, `%`, `^`, `&&`, `\|\|`, `!`, `==`, `!=`, `<`, `>`, `<=`, `>=`, assignment `=`, unary minus, parentheses |
| 📄 **Three Address Code** | Monospace code view + structured table with temp variables (t1, t2…) |
| ⊞ **Quadruples** | `(operator, arg1, arg2, result)` four-field tuple table |
| ⊟ **Triples** | `(operator, arg1, arg2)` using TAC temp variable names |
| 📋 **Indirect Triples** | Pointer array (100, 101, 102…) referencing the triples table |
| 🗄️ **MySQL Storage** | Every compilation is fully persisted across 5 relational tables |
| 🕘 **History Panel** | Browse, reload, and delete past compilation sessions |
| 🎨 **Premium Dark UI** | Glassmorphism, animated tabs, row entrance animations, toast notifications |

---

## 🛠️ Tech Stack

- **Backend**: Node.js + Express.js
- **Database**: MySQL 8.x (`mysql2` driver)
- **Frontend**: Vanilla HTML5 / CSS3 / JavaScript (no frameworks)
- **Parser**: Custom recursive-descent parser → AST → IR

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- MySQL 8.x running locally

### 1. Clone the repo
```bash
git clone https://github.com/PragyanshSuman/Intermediate_Code_Generation_Compiler_Design.git
cd Intermediate_Code_Generation_Compiler_Design
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env with your MySQL credentials
```

### 4. Create the database & tables
```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS compiler_icg CHARACTER SET utf8mb4;"
mysql -u root -p compiler_icg < backend/schema.sql
```

### 5. Start the server
```bash
npm start
# or for development with auto-reload:
npm run dev
```

### 6. Open the app
Navigate to **http://localhost:3001**

---

## 📐 Database Schema

```
sessions            — stores each compilation session
three_address_code  — TAC instructions per session
quadruples          — quadruple tuples per session
triples             — triple tuples per session
indirect_triples    — pointer array entries per session
```
All child tables use `ON DELETE CASCADE` from `sessions`.

---

## 💡 Example

**Input:** `X = -(a+b) * (c+d) + (a+b+c)`

**Three Address Code:**
```
t1 = a + b
t2 = UMINUS t1
t3 = c + d
t4 = t2 * t3
t5 = a + b
t6 = t5 + c
t7 = t4 + t6
X  = t7
```

**Quadruples:**
```
(+,      a,  b,  t1)
(UMINUS, t1, -,  t2)
(+,      c,  d,  t3)
(*,      t2, t3, t4)
...
```

**Triples:**
```
(+,      a,  b )
(UMINUS, t1, - )
(+,      c,  d )
(*,      t2, t3)
...
```

**Indirect Triples:**
```
Pointer: 100 → step 0
Pointer: 101 → step 1
Pointer: 102 → step 2
...
```

---

## 📁 Project Structure

```
├── backend/
│   ├── server.js          # Express entry point
│   ├── db.js              # MySQL connection pool
│   ├── parser.js          # Recursive-descent parser → AST
│   ├── irGenerator.js     # AST → all 4 IR representations
│   ├── schema.sql         # Database schema
│   └── routes/
│       └── compile.js     # API routes
├── frontend/
│   ├── index.html         # Single-page UI
│   ├── style.css          # Dark glassmorphism theme
│   └── app.js             # Frontend logic
├── .env.example
├── package.json
└── README.md
```

---

## 🔗 API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/compile` | Compile expression → generate & store all 4 IRs |
| `GET` | `/api/history` | Last 15 compilation sessions |
| `GET` | `/api/session/:id` | Full IR data for a session |
| `DELETE` | `/api/session/:id` | Delete a session (cascades) |
| `POST` | `/api/init-db` | Initialize database tables |

---

## 📚 Subject

**Compiler Design** — Phase: Intermediate Code Generation  
Demonstrates TAC, Quadruples, Triples, and Indirect Triples as taught in standard compiler design curricula (Aho, Lam, Sethi, Ullman — *Compilers: Principles, Techniques, and Tools*).

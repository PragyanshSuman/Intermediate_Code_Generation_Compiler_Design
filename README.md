# 🔧 ICG Studio — Intermediate Code Generation

A full-stack Compiler Design project demonstrating the **Complete Pipeline** of a compiler. Enter any arithmetic or logical expression (or a C snippet!) and instantly generate Lexical Tokens, ASTs, all four standard intermediate representations, Optimized TAC, and Assembly Code — backed by a **MySQL** database.

![ICG Studio Preview](https://img.shields.io/badge/Phase-Intermediate%20Code%20Generation-8b5cf6?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-Express-green?style=for-the-badge&logo=node.js)
![MySQL](https://img.shields.io/badge/Database-MySQL-blue?style=for-the-badge&logo=mysql)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🏷️ **Lexical Analysis** | Tokenizer generating a stream of classified tokens. |
| 🌳 **Syntax Analysis** | Interactive SVG visualization of the Abstract Syntax Tree (AST). |
| 🔢 **Expression & C Snippet** | Recursive-descent parser supporting arithmetic expressions and full C-like control flow (`if/else`, `while`, `for`). |
| 📄 **Three Address Code** | Monospace code view with animated Step-Through playback. |
| ⊞ **IR Variations** | Quadruples, Triples, and Indirect Triples generation. |
| ✨ **Code Optimization** | Side-by-side diff view highlighting constant folding and dead code elimination. |
| ⚙️ **Code Generation** | Translates IR into x86-like assembly code. |
| 🗄️ **MySQL Storage** | Every compilation is fully persisted across 8 relational tables. |
| 📊 **Analytics & Export** | Dynamic compilation statistics panel and 1-click CSV/PDF exports. |
| 🎨 **Premium UI** | Dark/Light mode toggle, glassmorphism, animated tabs, and row entrance animations. |

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
tokens              — lexical tokens per session
three_address_code  — TAC instructions per session
quadruples          — quadruple tuples per session
triples             — triple tuples per session
indirect_triples    — pointer array entries per session
optimized_tac       — optimized TAC instructions per session
assembly_code       — target assembly instructions per session
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
| `POST` | `/api/compile` | Compile expression → generate & store all compiler phases |
| `POST` | `/api/compile-snippet` | Compile C snippet with control flow |
| `GET` | `/api/history` | Last 15 compilation sessions |
| `GET` | `/api/session/:id` | Full IR data for a session |
| `DELETE` | `/api/session/:id` | Delete a session (cascades) |
| `POST` | `/api/init-db` | Initialize database tables |

---

## 📚 Subject

**Compiler Design** — Phase: Intermediate Code Generation  
Demonstrates TAC, Quadruples, Triples, and Indirect Triples as taught in standard compiler design curricula (Aho, Lam, Sethi, Ullman — *Compilers: Principles, Techniques, and Tools*).

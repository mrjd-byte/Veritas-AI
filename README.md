# 🧠 Veritas AI

**Veritas AI** is a trauma-aware, AI-powered testimony analysis platform designed to help analysts and investigators extract structured, legally actionable insights from witness statements — with sensitivity to trauma-affected recall.

---

## ✨ Features

* 🔍 **Testimony Analyzer** — Paste a witness statement and instantly extract:

  * Summary
  * Timeline of events
  * People involved
  * Locations mentioned
  * Key events
  * Missing information
  * Uncertainty flags
  * Detail Density score (5–95%)

* 💬 **Compassionate Follow-up (Interrogation)** — Generates trauma-informed follow-up questions and compiles a final report.

* 📜 **History** — View and delete all saved analyses.

* 🔐 **Authentication** — Secure user registration and login using JWT.

---

## 🛠 Tech Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Backend  | Python, FastAPI, SQLAlchemy         |
| AI       | OpenAI GPT-4o-mini via OpenRouter   |
| Auth     | JWT (python-jose), bcrypt (passlib) |
| Database | SQLite                              |
| Frontend | Vanilla HTML, CSS, JavaScript       |

---

## 📁 Project Structure

```bash
Veritas-AI/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── auth_system.py       # User auth, DB models, JWT logic
│   ├── ai_utils.py          # Testimony analysis & question generation
│   └── interrogation.py     # Compassionate follow-up & final report
│
├── frontend/
│   ├── index.html           # Main analyzer UI
│   ├── interrogation.html   # Follow-up session UI
│   ├── history.html         # Analysis history UI
│   ├── report.html          # Final report view
│   ├── app.js
│   ├── interrogation.js
│   ├── history.js
│   ├── report.js
│   ├── styles.css
│   └── auth/                # Auth helpers
│
├── requirements.txt
└── .env
```

---

## 🚀 Getting Started

### 📌 Prerequisites

* Python 3.10+
* OpenRouter API key

---

### ⚙️ Installation

```bash
# 1. Clone the repository
git clone https://github.com/mrjd-byte/Veritas-AI.git
cd Veritas-AI

# 2. Create virtual environment
python -m venv env

# Activate environment
# Windows:
env\Scripts\activate

# Mac/Linux:
source env/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Setup environment variables
echo "OPENROUTER_API_KEY=your_key_here" > .env

# 5. Run the server
python -m backend.main
```

---

### 🌐 Usage

* API runs at: `http://localhost:8000`
* Open frontend: `frontend/index.html`

---

## 📡 API Endpoints

| Method | Endpoint                       | Description                                  |
| ------ | ------------------------------ | -------------------------------------------- |
| POST   | `/auth/register`               | Register a new user                          |
| POST   | `/auth/login`                  | Login and receive a JWT token                |
| GET    | `/auth/history`                | Retrieve all saved analyses                  |
| DELETE | `/auth/history/{id}`           | Delete a specific analysis                   |
| POST   | `/api/analyze/`                | Analyze a testimony                          |
| POST   | `/api/analyze/questions`       | Generate detective-style follow-up questions |
| POST   | `/api/interrogation/questions` | Generate trauma-informed follow-up questions |
| POST   | `/api/interrogation/report`    | Compile a final report from Q&A session      |

---

## 📊 How the Detail Density Score Works

The score (5–95%) is computed based on:

* ➕ Word count of the testimony
* ➕ Number of timeline events, people, and locations
* ➖ Missing information
* ➖ Uncertainty flags
* ⚠️ Penalty for short testimonies (< 40 words)

---

## 🧩 Future Improvements

* UI enhancements
* Export reports (PDF)
* Better ML scoring models
* Cloud deployment

---

## 🤝 Contributing

Pull requests are welcome! Feel free to open issues for suggestions or improvements.

---

## 📜 License

MIT License

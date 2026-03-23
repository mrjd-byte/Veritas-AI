// ------------------ DOM ELEMENTS ------------------
const inputText = document.getElementById('inputText');
const generateBtn = document.getElementById('generateBtn');
const questionsList = document.getElementById('questionsList');
const reportActionContainer = document.getElementById('reportActionContainer');
const generateReportBtn = document.getElementById('generateReportBtn');

// ------------------ SHARE STATE ------------------
const savedTestimony = sessionStorage.getItem('sharedTestimony');
if (savedTestimony) {
    inputText.value = savedTestimony;
}
inputText.addEventListener('input', (e) => {
    sessionStorage.setItem('sharedTestimony', e.target.value);
});

// ------------------ DATA CACHE ------------------
let currentQuestions = [];

// ------------------ API CALLS ------------------
async function generateQuestions(text) {
    const token = localStorage.getItem("token");

    const res = await fetch("http://127.0.0.1:8000/api/interrogation/questions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ text })
    });

    if (res.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "auth/login.html";
        throw new Error("Session expired.");
    }

    if (!res.ok) throw new Error("Backend error while generating questions");

    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("Invalid format received from server.");
    return data;
}

// ------------------ RENDER ------------------
function renderQuestions(questions) {
    currentQuestions = questions;
    questionsList.innerHTML = ""; // Clear current

    if (questions.length === 0) {
        questionsList.innerHTML = "<p>No questions generated.</p>";
        reportActionContainer.style.display = 'none';
        return;
    }

    questions.forEach((q, index) => {
        const div = document.createElement("div");
        div.className = "qa-item";
        div.style.marginBottom = "1.5rem";
        div.style.padding = "1rem";
        div.style.background = "rgba(255,255,255,0.02)";
        div.style.borderRadius = "var(--border-radius-sm)";
        div.style.border = "1px solid rgba(255,255,255,0.05)";
        
        const label = document.createElement("label");
        label.className = "section-label";
        label.style.fontSize = "1.05rem";
        label.style.marginBottom = "0.75rem";
        label.style.display = "block";
        label.innerHTML = `<strong style="color:var(--brand-primary); margin-right: 0.5rem;">Q${index + 1}:</strong> ${q}`;
        
        const input = document.createElement("textarea");
        input.className = "qa-input";
        input.placeholder = "Write your answer here, or safely leave it blank to skip...";
        input.style.width = "100%";
        input.style.minHeight = "80px";
        input.style.backgroundColor = "var(--bg-base)";
        input.style.border = "1px solid rgba(255,255,255,0.1)";
        input.style.borderRadius = "var(--border-radius-sm)";
        input.style.padding = "0.75rem";
        input.style.color = "var(--text-primary)";
        input.style.fontSize = "0.95rem";
        input.style.resize = "vertical";
        input.style.transition = "all var(--transition-fast)";

        div.appendChild(label);
        div.appendChild(input);
        questionsList.appendChild(div);
    });

    // Reveal report compiler
    reportActionContainer.style.display = 'block';
}

// ------------------ EVENT LISTENERS ------------------
function setLoading(btn, isLoading) {
    btn.disabled = isLoading;
    if (isLoading) {
        btn.classList.add("is-loading");
    } else {
        btn.classList.remove("is-loading");
    }
}

generateBtn.addEventListener('click', async () => {
    const text = inputText.value.trim();
    if (!text) return alert("Enter testimony first!");

    setLoading(generateBtn, true);
    reportActionContainer.style.display = 'none';

    try {
        const questions = await generateQuestions(text);
        renderQuestions(questions);
    } catch (err) {
        questionsList.innerHTML = `<p style="color: var(--status-error)">Error: ${err.message}</p>`;
    } finally {
        setLoading(generateBtn, false);
    }
});

generateReportBtn.addEventListener('click', async () => {
    const originalText = inputText.value.trim();
    
    // Gather all inputs
    const qaPairs = [];
    const qaItems = questionsList.querySelectorAll('.qa-item');
    
    qaItems.forEach((item, index) => {
        const questionText = currentQuestions[index];
        const answerText = item.querySelector('.qa-input').value.trim();
        qaPairs.push({ question: questionText, answer: answerText || "Skipped" }); // Tag empties as Skipped
    });
    
    setLoading(generateReportBtn, true);
    
    try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://127.0.0.1:8000/api/interrogation/report", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ original_text: originalText, qa_pairs: qaPairs })
        });
        
        if (!res.ok) throw new Error("Backend error compiling ultimate report");
        
        const data = await res.json();
        
        // Save dynamically to storage, redirect to final report page
        sessionStorage.setItem('finalReport', JSON.stringify(data));
        window.location.href = "report.html";
        
    } catch (err) {
        alert("Failed to synthesize report: " + err.message);
    } finally {
        setLoading(generateReportBtn, false);
    }
});

const API_BASE_URL = 'http://127.0.0.1:8000/auth';

// ------------------ ALERT ------------------
function showAlert(message, type = "error") {
    const box = document.getElementById('alert-box');
    const msg = document.getElementById('alert-message');

    if (!box || !msg) return;

    msg.textContent = message;
    box.className = `alert alert-${type}`;
    box.style.display = 'flex';
}

function hideAlert() {
    const box = document.getElementById('alert-box');
    if (box) box.style.display = 'none';
}

// ------------------ LOGIN ------------------
function initLoginForm() {
    const form = document.getElementById('login-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const res = await fetch(`${API_BASE_URL}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            if (!res.ok) throw new Error("Login failed");

            const data = await res.json();

            localStorage.setItem("token", data.access_token);

            window.location.href = '../index.html';

        } catch (err) {
            showAlert(err.message);
        }
    });
}

// ------------------ REGISTER ------------------
function initRegisterForm() {
    const form = document.getElementById('register-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideAlert();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const res = await fetch(`${API_BASE_URL}/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.detail || "Registration failed");
            }

            showAlert("Registered! Redirecting...", "success");

            setTimeout(() => {
                window.location.href = "login.html";
            }, 1500);

        } catch (err) {
            showAlert(err.message);
        }
    });
}
// ------------------ AUTH GUARD ------------------
function checkAuth() {
    const token = localStorage.getItem("token");

    if (!token) {
        window.location.href = "login.html";
        return false;
    }

    return true;
}

// ------------------ LOGOUT ------------------
function logout() {
    localStorage.removeItem("token");
    window.location.href = "./auth/login.html";
}


// ------------------ INIT ------------------
document.addEventListener("DOMContentLoaded", () => {
    initLoginForm();
    initRegisterForm();
});
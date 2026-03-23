// ------------------ AUTH CHECK ------------------
(function () {
    const token = localStorage.getItem("token");
    if (!token) {
        window.location.href = "auth/login.html";
    }
})();

// ------------------ DOM ELEMENTS ------------------
const inputText = document.getElementById('inputText');
const analyzeBtn = document.getElementById('analyzeBtn');
const downloadBtn = document.getElementById('downloadBtn');
const resultsGrid = document.querySelector('.results-grid');

// ------------------ SHARE STATE ------------------
const savedTestimony = sessionStorage.getItem('sharedTestimony');
if (savedTestimony) {
    inputText.value = savedTestimony;
}
inputText.addEventListener('input', (e) => {
    sessionStorage.setItem('sharedTestimony', e.target.value);
});

// ------------------ RESULT NODES ------------------
const nodes = {
    summary: document.getElementById('summary'),
    timeline: document.getElementById('timeline'),
    people: document.getElementById('people'),
    locations: document.getElementById('locations'),
    keyEvents: document.getElementById('keyEvents'),
    missing: document.getElementById('missing'),
    uncertainty: document.getElementById('uncertainty'),
    confidence: document.getElementById('confidence')
};

let analysisResult = null;




// ------------------ API CALL ------------------
async function performAnalysis(text) {
    const token = localStorage.getItem("token");


    const res = await fetch("http://127.0.0.1:8000/api/analyze", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ text })
    });

    if (res.status === 401) {
        localStorage.removeItem("token");
        throw new Error("Session expired. Login again.");
    }

    if (!res.ok) {
        throw new Error("Backend error");
    }

    const data = await res.json();
    console.log("RAW BACKEND:", data);
    console.log("PEOPLE:", data.people);
    console.log("LOCATIONS:", data.locations);

    return {
        confidence: data.confidence_score ?? 0,
        summary: data.summary ?? "No summary",
        timeline: (data.timeline || []).map(t => `${t.event} (${t.approx_time})`),
        people: (data.people_involved || []).map(p => `${p.description} (${p.role})`),
        locations: (data.locations || []).map(l => `${l.place} (${l.certainty})`),
        keyEvents: data.key_events || [],
        missing: data.missing_information || [],
        uncertainty: data.uncertainty_flags || []
    };
}

// ------------------ RENDER ------------------
function renderResults(data) {
    console.log("FINAL DATA:", data);
    console.log("CONFIDENCE VALUE:", data.confidence);

    resultsGrid.classList.add("active");

    // Summary
    nodes.summary.textContent = data.summary || "No summary";
    nodes.summary.classList.remove("placeholder-text");

    nodes.keyEvents.classList.remove("placeholder-list");
    nodes.timeline.classList.remove("placeholder-list");
    nodes.uncertainty.classList.remove("placeholder-list");
    nodes.missing.classList.remove("placeholder-list");

    // 🔥 ADD THESE
    nodes.people.classList.remove("placeholder-tags");
    nodes.locations.classList.remove("placeholder-tags");

    // ---------- LIST RENDER ----------
    const renderList = (el, items) => {
        el.innerHTML = "";

        if (!items || items.length === 0) {
            el.innerHTML = "<li>No data</li>";
            return;
        }

        items.forEach(item => {
            const li = document.createElement("li");
            li.textContent = item;
            el.appendChild(li);
        });
    };

    // ---------- TAG RENDER ----------
    const renderTags = (el, items) => {
        el.innerHTML = "";

        if (!items || items.length === 0) {
            el.innerHTML = "<span>None</span>";
            return;
        }

        items.forEach(item => {
            const span = document.createElement("span");
            span.textContent = item;
            span.className = "tag"; // ✅ USE CSS NOT INLINE

            el.appendChild(span);
        });
    };

    renderList(nodes.timeline, data.timeline);
    renderList(nodes.keyEvents, data.keyEvents);
    renderList(nodes.missing, data.missing);
    renderList(nodes.uncertainty, data.uncertainty);

    renderTags(nodes.people, data.people);
    renderTags(nodes.locations, data.locations);

    // ---------- CONFIDENCE ----------
    const confidence = data.confidence || 0;

    nodes.confidence.textContent = confidence + "%";

    const circle = document.getElementById("confidenceRing");

    if (circle) {
        const radius = 15.9155;
        const circumference = 2 * Math.PI * radius;

        const offset = circumference - (confidence / 100) * circumference;

        circle.style.strokeDasharray = `${circumference}`;
        circle.style.strokeDashoffset = offset;
    }
}

// ------------------ LOADING ------------------
function resetToLoading() {
    analyzeBtn.disabled = true;
    downloadBtn.disabled = true;

    nodes.summary.textContent = "Analyzing...";
    nodes.confidence.textContent = "--%";
}

// ------------------ CLICK ------------------
analyzeBtn.addEventListener('click', async () => {
    const text = inputText.value.trim();

    if (!text) {
        alert("Enter text first!");
        return;
    }

    resetToLoading();

    try {
        const data = await performAnalysis(text);
        console.log("FINAL DATA RECEIVED:", data);

        analysisResult = data;

        renderResults(data);


        downloadBtn.disabled = false;

    } catch (err) {
        alert(err.message);
    } finally {
        analyzeBtn.disabled = false;
    }
});

// ------------------ DOWNLOAD ------------------
downloadBtn.addEventListener('click', () => {
    if (!analysisResult) return;

    const blob = new Blob([JSON.stringify(analysisResult, null, 2)], {
        type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analysis.json';
    a.click();
});

// ------------------ LOGOUT ------------------
function logout() {
    localStorage.removeItem("token");
    window.location.href = "auth/login.html";
}

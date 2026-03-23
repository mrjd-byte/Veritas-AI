const rawData = sessionStorage.getItem('finalReport');
const reportGrid = document.getElementById('reportGrid');
const noDataMessage = document.getElementById('noDataMessage');

// RESULT NODES
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

// INITIALIZE
if (rawData) {
    try {
        const data = JSON.parse(rawData);
        noDataMessage.style.display = 'none';
        reportGrid.style.display = 'grid';
        renderReport(data);
    } catch (e) {
        console.error("Parse Error", e);
    }
}

// RENDER FUNCTION (Similar to app.js but localized)
function renderReport(data) {
    // Fallbacks
    const compTimeline = (data.timeline || []).map(t => `${t.event} (${t.approx_time})`);
    const compPeople = (data.people_involved || []).map(p => `${p.description} (${p.role})`);
    const compLoc = (data.locations || []).map(l => `${l.place} (${l.certainty})`);

    nodes.summary.textContent = data.summary || "No summary formulated.";

    // HELPER: LIST
    const renderList = (el, items) => {
        el.innerHTML = "";
        if (!items || items.length === 0) { el.innerHTML = "<li>None detected</li>"; return; }
        items.forEach(item => {
            const li = document.createElement("li");
            li.textContent = item;
            el.appendChild(li);
        });
    };

    // HELPER: TAGS
    const renderTags = (el, items) => {
        el.innerHTML = "";
        if (!items || items.length === 0) { el.innerHTML = "<span>None</span>"; return; }
        items.forEach(item => {
            const span = document.createElement("span");
            span.textContent = item;
            span.className = "tag";
            el.appendChild(span);
        });
    };

    renderList(nodes.timeline, compTimeline);
    renderList(nodes.keyEvents, data.key_events);
    renderList(nodes.missing, data.missing_information);
    renderList(nodes.uncertainty, data.uncertainty_flags);

    renderTags(nodes.people, compPeople);
    renderTags(nodes.locations, compLoc);

    // CONFIDENCE
    const conf = data.confidence_score || 0;
    nodes.confidence.textContent = conf + "%";
    
    const circle = document.getElementById("confidenceRing");
    if (circle) {
        // SVG circle radius matches previous implementations
        const radius = 15.9155;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (conf / 100) * circumference;
        circle.style.strokeDasharray = `${circumference}`;
        setTimeout(() => circle.style.strokeDashoffset = offset, 100);
    }
}

// EXPORT TO PDF ACTION
window.downloadReport = function() {
    if (!rawData) return;
    const element = document.getElementById('reportGrid');
    const dlBtn = document.getElementById('dlBtn');
    
    // Add loading state
    dlBtn.textContent = 'Generating PDF...';
    dlBtn.disabled = true;
    
    // Create a temporary wrapper with branding
    const printWrapper = document.createElement('div');
    printWrapper.style.padding = '30px';
    printWrapper.style.color = '#fff';
    printWrapper.style.backgroundColor = '#0f172a'; // Match dark theme
    
    // Add branding header
    printWrapper.innerHTML = `
        <div style="text-align:center; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 2px solid #6366f1;">
            <h1 style="color: #6366f1; margin:0; font-family: 'Outfit', sans-serif;">Veritas-AI - Structured Testimony</h1>
            <p style="color: #94a3b8; margin:0; font-family: 'Inter', sans-serif;">Trauma-Informed Legal Documentation</p>
        </div>
    `;
    
    // Clone the grid so we don't mess up the live UI
    const clone = element.cloneNode(true);
    clone.style.display = 'grid'; // Ensure it's not hidden
    printWrapper.appendChild(clone);
    
    // PDF options
    const opt = {
      margin:       0.5,
      filename:     'Structured_Testimony_Report.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#0f172a' },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    
    // Generate PDF and reset button
    html2pdf().set(opt).from(printWrapper).save().then(() => {
        dlBtn.textContent = 'Download Report';
        dlBtn.disabled = false;
    });
};

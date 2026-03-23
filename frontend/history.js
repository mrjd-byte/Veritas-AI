const historyGrid = document.getElementById('historyGrid');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');

async function fetchHistory() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const res = await fetch("http://127.0.0.1:8000/auth/history", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (res.status === 401) {
            localStorage.removeItem("token");
            window.location.href = "auth/login.html";
            return;
        }

        if (!res.ok) throw new Error("Failed to fetch history");

        const data = await res.json();
        
        loadingState.style.display = 'none';

        if (!data || data.length === 0) {
            emptyState.style.display = 'block';
            return;
        }

        historyGrid.style.display = 'grid';
        
        // Reverse so newest is first
        data.reverse().forEach((item, idx) => renderCard(item, idx));

    } catch (err) {
        loadingState.innerHTML = `<p style="color: var(--status-error)">Error: ${err.message}</p>`;
    }
}

function renderCard(item, idx) {
    const isSynthesis = item.input.startsWith("[Interrogation Synthesis]");
    const displayText = isSynthesis ? item.input.replace("[Interrogation Synthesis] ", "") : item.input;
    
    // Create element
    const card = document.createElement('div');
    card.className = "card glass-card history-card";
    
    const confidence = item.output.confidence_score || 0;
    let rankColor = confidence > 70 ? "var(--status-success)" : confidence > 40 ? "var(--status-warning)" : "var(--status-error)";

    card.innerHTML = `
        <div class="history-date">${isSynthesis ? "🧠 Compassionate Follow-up Report" : "📝 Standard Analysis"}</div>
        <div class="history-text">"${displayText}"</div>
        <div class="history-meta" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <span class="tag" style="background: rgba(255,255,255,0.05); color: ${rankColor}; border-color: ${rankColor};">
                ${confidence}% Density
            </span>
            <div style="display: flex; gap: 1rem; align-items: center;">
                <button class="delete-btn" style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); color: var(--status-error); cursor: pointer; font-size: 0.8rem; padding: 0.3rem 0.6rem; border-radius: 4px; transition: all 0.2s;">Scrub Data</button>
                <span style="font-size: 0.85rem; color: var(--brand-primary); font-weight: 500;">View Case &rarr;</span>
            </div>
        </div>
    `;

    // Reusing report.html to display ANY historic query perfectly
    card.addEventListener('click', () => {
        sessionStorage.setItem('finalReport', JSON.stringify(item.output));
        window.location.href = "report.html";
    });

    // Delete handler
    const deleteBtn = card.querySelector('.delete-btn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async (e) => {
            e.stopPropagation(); // Make sure the card itself doesn't trigger!
            
            if (!confirm("RESTRICTED ACTION: Are you sure you want to permanently erase this case from the database? This cannot be undone.")) return;
            
            const token = localStorage.getItem("token");
            try {
                const res = await fetch(`http://127.0.0.1:8000/auth/history/${item.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer ' + token }
                });
                
                if (res.status === 401) {
                    window.location.href = "auth/login.html";
                    return;
                }
                
                if (!res.ok) throw new Error("Failed to delete case.");
                
                // Immediately vanish from screen
                card.style.opacity = '0';
                card.style.transform = 'scale(0.9)';
                setTimeout(() => {
                    card.remove();
                    // If grid is now completely empty
                    if (historyGrid.children.length === 0) {
                        historyGrid.style.display = 'none';
                        document.getElementById('emptyState').style.display = 'block';
                    }
                }, 300);
                
            } catch (err) {
                alert("Error deleting case: " + err.message);
            }
        });
    }

    historyGrid.appendChild(card);
}

// Boot
fetchHistory();

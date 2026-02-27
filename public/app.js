let currentLeads = [];
let activeLead = null;

async function fetchLeads() {
    const res = await fetch('/api/leads');
    currentLeads = await res.json();
    renderLeads();
}

function renderLeads() {
    const container = document.getElementById('leadsContainer');
    if (currentLeads.length === 0) {
        container.innerHTML = '<p>No leads found. Add some above!</p>';
        return;
    }

    container.innerHTML = currentLeads.map(lead => `
        <div class="lead-card">
            <div class="lead-info">
                <h3>${lead.name}</h3>
                <p>${lead.platform} • ${lead.status}</p>
            </div>
            <div class="lead-actions">
                <button onclick="generateMessage(${lead.id})">Personalize</button>
                <button class="btn-outreach" onclick="generateMessage(${lead.id})">Outreach</button>
            </div>

        </div>
    `).join('');
}

async function addLead() {
    const name = document.getElementById('leadName').value;
    const platform = document.getElementById('leadPlatform').value;
    const url = document.getElementById('leadUrl').value;

    if (!name || !url) return alert('Name and URL required');

    await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, platform, url })
    });

    document.getElementById('leadName').value = '';
    document.getElementById('leadUrl').value = '';
    fetchLeads();
}

async function generateMessage(id) {
    const lead = currentLeads.find(l => l.id == id);
    activeLead = lead;

    document.getElementById('aiMessage').value = "Generating AI message...";
    document.getElementById('messageModal').style.display = 'block';

    // Disable the Copy & Open button while the message is loading
    const copyBtn = document.getElementById('copyOpenBtn');
    copyBtn.disabled = true;
    copyBtn.innerText = 'Generating...';

    const res = await fetch('/api/personalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: lead.name,
            platform: lead.platform,
            notes: lead.notes
        })
    });

    const data = await res.json();
    document.getElementById('aiMessage').value = data.message;

    // Re-enable once message is ready
    copyBtn.disabled = false;
    copyBtn.innerText = 'Copy & Open Profile';
}


function closeModal() {
    document.getElementById('messageModal').style.display = 'none';
}

async function simulateTyping() {
    const message = document.getElementById('aiMessage').value;
    const btn = document.querySelector('.btn-demo');
    btn.innerText = 'Simulating... (Check Terminal)';
    btn.disabled = true;

    await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
    });

    btn.innerText = 'Test Typing Logic';
    btn.disabled = false;
}

function copyToClipboard(text) {
    // Primary method: modern clipboard API (requires HTTPS)
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    }
    // Fallback: execCommand works on HTTP/localhost
    return new Promise((resolve, reject) => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try {
            const success = document.execCommand('copy');
            document.body.removeChild(textarea);
            if (success) resolve();
            else reject(new Error('execCommand copy failed'));
        } catch (err) {
            document.body.removeChild(textarea);
            reject(err);
        }
    });
}

async function copyAndOpen() {
    const msg = document.getElementById('aiMessage').value;

    if (!msg || msg === 'Generating AI message...') {
        alert('Please wait for the message to finish generating.');
        return;
    }

    const copyBtn = document.getElementById('copyOpenBtn');
    copyBtn.disabled = true;
    copyBtn.innerText = 'Copying...';

    try {
        await copyToClipboard(msg);
        console.log('[Dashboard] ✅ Message copied to clipboard.');
    } catch (err) {
        console.warn('[Dashboard] Clipboard copy failed, continuing anyway:', err);
    }

    try {
        copyBtn.innerText = 'Opening Profile...';

        // Open profile directly in a new tab from the browser
        window.open(activeLead.url, '_blank');

        // Mark as outreached regardless of clipboard result
        await fetch(`/api/leads/${activeLead.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Outreached', lastMessage: msg })
        });

        fetchLeads();
        closeModal();
    } catch (err) {
        console.error('[Dashboard] Failed to open profile:', err);
        alert('Could not open the profile URL. Is the server running?');
    } finally {
        copyBtn.disabled = false;
        copyBtn.innerText = 'Copy & Open Profile';
    }
}


// Live Telemetry (SSE)
const logContainer = document.getElementById('logFeed');

if (logContainer) {
    const eventSource = new EventSource('/api/logs/stream');

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const logEntry = document.createElement('div');
        logEntry.className = `log-line log-type-${data.type || 'info'}`;

        const timestamp = new Date(data.timestamp).toLocaleTimeString();
        logEntry.innerHTML = `
            <span class="log-time">[${timestamp}]</span>
            <span class="log-persona">${data.persona}:</span>
            <span class="log-msg">${data.message}</span>
        `;

        logContainer.appendChild(logEntry);

        // Auto-scroll to bottom
        logContainer.scrollTop = logContainer.scrollHeight;

        // Keep only last 50 lines for performance
        if (logContainer.children.length > 50) {
            logContainer.removeChild(logContainer.firstChild);
        }
    };

    eventSource.onerror = () => {
        console.warn('[Dashboard] SSE Connection lost. Reconnecting...');
    };
}

fetchLeads();
setInterval(fetchLeads, 15000); // Auto-refresh leads list every 15s

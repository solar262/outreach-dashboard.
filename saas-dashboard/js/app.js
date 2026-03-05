const API_BASE = '/api';
let currentTool = 'strategy';
let apiKey = sessionStorage.getItem('oas_api_key') || '';
let isGenerating = false;

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const apiInput = document.getElementById('apiKeyInput');
    if (apiInput && apiKey) {
        apiInput.value = apiKey;
        validateKey(apiKey);
    }
    switchTool('strategy');
});

// ─── API Key ──────────────────────────────────────────────────────────────────
function onKeyInput(e) {
    const val = e.target.value.trim();
    apiKey = val;
    sessionStorage.setItem('oas_api_key', val);
    if (val.length > 8) validateKey(val);
    else setKeyStatus('', '');
}

async function validateKey(key) {
    try {
        const res = await fetch(`${API_BASE}/usage`, {
            headers: { 'x-api-key': key }
        });
        if (res.ok) {
            const data = await res.json();
            setKeyStatus('valid', `✓ ${data.plan}`);
            updateUsageUI(data);
        } else {
            setKeyStatus('invalid', '✗ Invalid');
            clearUsageUI();
        }
    } catch { setKeyStatus('invalid', '✗ Offline'); }
}

function setKeyStatus(cls, text) {
    const el = document.getElementById('keyStatus');
    if (!el) return;
    el.textContent = text;
    el.className = 'key-status ' + cls;
}

function updateUsageUI(data) {
    const pct = data.limit === Infinity ? 5 : Math.min(100, (data.usage / data.limit) * 100);
    const el = {
        plan: document.getElementById('usagePlan'),
        fill: document.getElementById('usageFill'),
        nums: document.getElementById('usageNums'),
    };
    if (el.plan) el.plan.textContent = data.plan;
    if (el.fill) el.fill.style.width = pct + '%';
    if (el.nums) el.nums.textContent = data.remaining === 'Unlimited'
        ? 'Unlimited generations'
        : `${data.remaining} generations remaining today`;
}

function clearUsageUI() {
    const el = document.getElementById('usageFill');
    if (el) el.style.width = '0%';
}

// ─── Tool Switching ───────────────────────────────────────────────────────────
function switchTool(tool) {
    currentTool = tool;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.toggle('active', b.dataset.tool === tool));
    document.querySelectorAll('.tool-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + tool));

    const titles = {
        strategy: { title: '⚡ Strategy Generator', sub: 'Generate personalized outreach messages and follow-ups for any lead.' },
        closer: { title: '🎯 Closer Engine', sub: 'Paste a conversation thread and get the perfect closing reply.' },
        viral: { title: '🔥 Viral Comment Generator', sub: 'Create authority-building comments that drive visibility and traffic.' },
        validate: {
            title: '✦ Peer Network',
            sub: "Generate social proof by validating and expanding on a peer's comment."
        },
    };
    const t = titles[tool] || {};
    const pageTitle = document.getElementById('pageTitle');
    const pageSub = document.getElementById('pageSub');
    if (pageTitle) pageTitle.textContent = t.title || '';
    if (pageSub) pageSub.textContent = t.sub || '';
}

// ─── Generate ─────────────────────────────────────────────────────────────────
async function generate(tool) {
    if (isGenerating) return;
    if (!apiKey) { showToast('Enter your API key first.', 'error'); return; }

    const payload = buildPayload(tool);
    if (!payload) return;

    setGenerating(tool, true);
    clearOutput(tool);

    try {
        const res = await fetch(`${API_BASE}/generate/${tool}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
            body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
            if (res.status === 429) {
                showToast(`${data.error}`, 'warning');
                renderLimitError(tool, data);
            } else {
                showToast(data.error || 'Generation failed.', 'error');
            }
            return;
        }

        renderOutput(tool, data);
        if (data.usage) updateUsageUI(data.usage);
        showToast('Generated successfully!', 'success');
    } catch (err) {
        showToast('Server offline. Is the server running?', 'error');
    } finally {
        setGenerating(tool, false);
    }
}

function buildPayload(tool) {
    const g = id => document.getElementById(id)?.value?.trim();
    switch (tool) {
        case 'strategy': {
            const name = g('s_name'), notes = g('s_notes'), platform = g('s_platform');
            if (!name || !notes) { showToast('Lead name and notes are required.', 'error'); return null; }
            return { name, notes, platform };
        }
        case 'closer': {
            const thread = g('c_thread');
            if (!thread) { showToast('Paste a conversation thread.', 'error'); return null; }
            return { threadHistory: thread, leadName: g('c_name'), leadNotes: g('c_notes') };
        }
        case 'viral': {
            const post = g('v_post');
            if (!post) { showToast('Paste post content.', 'error'); return null; }
            return { postContent: post, personaName: g('v_persona') };
        }
        case 'validate': {
            const orig = g('val_post'), peer = g('val_peer');
            if (!orig || !peer) { showToast('Both fields are required.', 'error'); return null; }
            return { originalPost: orig, peerComment: peer, validatorPersona: g('val_persona') };
        }
    }
}

function renderOutput(tool, data) {
    const wrap = document.getElementById(`output-${tool}`);
    if (!wrap) return;

    wrap.innerHTML = '';

    const sections = getOutputSections(tool, data);
    sections.forEach(({ label, content }) => {
        const div = document.createElement('div');
        div.className = 'output-section';
        const lbl = document.createElement('div');
        lbl.className = 'output-section-label';
        lbl.textContent = label;
        const txt = document.createElement('div');
        txt.className = 'output-content';
        txt.textContent = content;
        div.appendChild(lbl);
        div.appendChild(txt);
        wrap.appendChild(div);
    });

    document.getElementById(`copy-${tool}`)?.classList.remove('hidden');
}

function getOutputSections(tool, data) {
    switch (tool) {
        case 'strategy':
            return [
                { label: '📐 Strategy', content: data.strategy },
                { label: '✉️ Opening Message', content: data.message },
                { label: '🔁 Follow-Up', content: data.followUp },
            ];
        case 'closer':
            return [{ label: '💬 Closer Reply', content: data.reply }];
        case 'viral':
            return [{ label: '🔥 Comment', content: data.comment }];
        case 'validate':
            return [{ label: '✅ Validation Reply', content: data.reply }];
        default: return [];
    }
}

function renderLimitError(tool, data) {
    const wrap = document.getElementById(`output-${tool}`);
    if (!wrap) return;
    wrap.innerHTML = `
        <div style="text-align:center;padding:1.5rem 0">
            <div style="font-size:2rem;margin-bottom:0.75rem">🚫</div>
            <div style="font-weight:700;margin-bottom:0.4rem">Daily limit reached</div>
            <div style="color:var(--text-muted);font-size:0.875rem;margin-bottom:1.25rem">${data.error}</div>
            <a href="/" class="btn btn-primary btn-sm" style="text-decoration:none">⬆️ Upgrade Plan</a>
        </div>`;
}

function clearOutput(tool) {
    const wrap = document.getElementById(`output-${tool}`);
    if (wrap) wrap.innerHTML = `<div class="output-content empty">Output will appear here...</div>`;
}

// ─── Copy ─────────────────────────────────────────────────────────────────────
function copyOutput(tool) {
    const wrap = document.getElementById(`output-${tool}`);
    if (!wrap) return;
    const text = Array.from(wrap.querySelectorAll('.output-content')).map(el => el.textContent).join('\n\n');
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById(`copy-${tool}`);
        if (btn) { btn.textContent = '✓ Copied!'; btn.classList.add('copied'); }
        setTimeout(() => { if (btn) { btn.textContent = '📋 Copy'; btn.classList.remove('copied'); } }, 2000);
    });
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────
function setGenerating(tool, state) {
    isGenerating = state;
    const btn = document.getElementById(`genBtn-${tool}`);
    const spinner = document.getElementById(`spinner-${tool}`);
    if (btn) { btn.disabled = state; btn.style.opacity = state ? '0.6' : '1'; }
    if (spinner) spinner.style.display = state ? 'flex' : 'none';
}

function showToast(msg, type = 'success') {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

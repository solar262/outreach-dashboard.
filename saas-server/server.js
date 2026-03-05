const express = require('express');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const cfg = require('./config');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
// NOTE: Stripe webhooks need raw body — mount BEFORE bodyParser.json()
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../saas-dashboard')));

// ─── Routes ───────────────────────────────────────────────────────────────────
const aiRoutes = require('./routes/ai');
const webhookRoutes = require('./routes/webhooks');
const searchRoutes = require('./api/lead_search');
const roastRoutes = require('./api/roast');

app.use('/api', aiRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/search-leads', searchRoutes);
app.use('/api/roast', roastRoutes);

// ─── Serve Dashboard Pages ────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../saas-dashboard/index.html'));
});

app.get('/app', (req, res) => {
    res.sendFile(path.join(__dirname, '../saas-dashboard/app.html'));
});

app.get('/success', (req, res) => {
    res.sendFile(path.join(__dirname, '../saas-dashboard/success.html'));
});

app.get('/roaster', (req, res) => {
    res.sendFile(path.join(__dirname, '../saas-dashboard/roast.html'));
});

// Admin: view all provisioned keys (protect this in production!)
app.get('/api/admin/keys', (req, res) => {
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== (process.env.ADMIN_KEY || 'admin-secret-change-me')) {
        return res.status(403).json({ error: 'Forbidden' });
    }
    const { getAllKeys } = require('./provisioner');
    res.json(getAllKeys());
});

// ─── Start Server ─────────────────────────────────────────────────────────────
app.listen(cfg.PORT, () => {
    console.log(`\n🚀 AI Outreach Studio`);
    console.log(`   Landing Page : http://localhost:${cfg.PORT}`);
    console.log(`   App Dashboard: http://localhost:${cfg.PORT}/app`);
    console.log(`   API Base     : http://localhost:${cfg.PORT}/api`);
    console.log(`   Groq API Key : ${cfg.GROQ_API_KEY ? '✅ Loaded' : '⚠️  Missing (fallback mode)'}\n`);
    console.log(`   Demo API Keys:`);
    console.log(`     Free   : free-demo-key-001`);
    console.log(`     Pro    : pro-demo-key-001`);
    console.log(`     Agency : agency-demo-key-001\n`);
});

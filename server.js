const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const open = require('open');
const { Typing, Jitter, Reasoning } = require('./humanistic-engine/index'); // Integration


const app = express();
const PORT = process.env.PORT || 3001;
const LEADS_FILE = path.join(__dirname, 'leads.json');

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Real-time Log Stream (SSE)
let logClients = [];

app.get('/api/logs/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    console.log(`[Server] SSE: Client connected.`);

    // Send initial welcome message
    res.write(`data: ${JSON.stringify({
        timestamp: new Date().toISOString(),
        message: "Live Telemetry Connected. Waiting for pulse...",
        type: "info",
        persona: "System"
    })}\n\n`);

    const clientId = Date.now();
    const newClient = { id: clientId, res };
    logClients.push(newClient);

    req.on('close', () => {
        console.log(`[Server] SSE: Client disconnected.`);
        logClients = logClients.filter(c => c.id !== clientId);
    });
});

app.post('/api/logs', (req, res) => {
    const logEntry = req.body;
    console.log(`[Server] Log Received: ${logEntry.message}`);
    logClients.forEach(c => c.res.write(`data: ${JSON.stringify(logEntry)}\n\n`));
    res.status(200).send('Logged');
});

// Utility to read leads
const getLeads = () => {
    try {
        const data = fs.readFileSync(LEADS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return [];
    }
};

// Utility to save leads
const saveLeads = (leads) => {
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
};

// API: Get all leads
app.get('/api/leads', (req, res) => {
    res.json(getLeads());
});

// API: Add a lead
app.post('/api/leads', (req, res) => {
    const leads = getLeads();
    const newLead = {
        id: Date.now(),
        name: req.body.name,
        platform: req.body.platform,
        url: req.body.url,
        notes: req.body.notes || '',
        status: 'New',
        lastMessage: ''
    };
    leads.push(newLead);
    saveLeads(leads);
    res.status(201).json(newLead);
});

// API: Update lead
app.put('/api/leads/:id', (req, res) => {
    let leads = getLeads();
    const index = leads.findIndex(l => l.id == req.params.id);
    if (index !== -1) {
        leads[index] = { ...leads[index], ...req.body };
        saveLeads(leads);
        res.json(leads[index]);
    } else {
        res.status(404).send('Lead not found');
    }
});

// API: Open URL
app.post('/api/open', async (req, res) => {
    const { url } = req.body;
    console.log(`\n[Server] Request received to open URL: ${url}`);

    if (url) {
        try {
            console.log(`[Server] Technical: Executing 'open' package on Windows...`);
            await open(url);
            console.log(`[Server] Success: URL open command sent.`);
            res.status(200).send('Opened');
        } catch (err) {
            console.error(`[Server] Error: Failed to open URL via server. Details: ${err}`);
            res.status(500).send(`Failed to open URL: ${err.message}`);
        }
    } else {
        console.warn(`[Server] Warning: /api/open hit but no URL provided.`);
        res.status(400).send('URL required');
    }
});


// API: AI Personalize (Enhanced with 200 IQ Reasoning)
app.post('/api/personalize', async (req, res) => {
    const lead = req.body;

    try {
        // 1. Analyze profile with high-level logic
        const analysis = await Reasoning.analyzeProfile(lead);

        // 2. Synthesize outreach strategy and message
        const { message, strategy } = await Reasoning.generateStrategy(lead, analysis);

        console.log(`[Server] 200 IQ Strategy: ${strategy}`);
        res.json({ message, strategy });
    } catch (err) {
        console.error(`[Server] Personalization Error: ${err.message}`);
        res.status(500).send('Failed to generate intelligent personalization');
    }
});

// API: Simulate Humanistic Typing (for Demo/Verification)

app.post('/api/simulate', async (req, res) => {
    const { message } = req.body;
    console.log(`\n[Dashboard] Starting Humanistic Simulation...`);

    try {
        await Reasoning.executeWithConsistency(async () => {
            await Jitter.thinkingPause();
            await Typing.type(message);
        });
        res.status(200).send('Simulation complete in terminal');
    } catch (err) {
        res.status(500).send(`Simulation failed: ${err.message}`);
    }
});

app.listen(PORT, () => {

    console.log(`Outreach Dashboard running at http://localhost:${PORT}`);
});

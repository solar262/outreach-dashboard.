const express = require('express');
const router = express.Router();
const { provisionKey, resolvePlan } = require('../provisioner');
const { sendKeyEmail } = require('../mailer');

// ─── Gumroad Webhook ──────────────────────────────────────────────────────────
// Gumroad sends a POST ping to this URL on every successful sale.
// Setup: Gumroad Dashboard → Settings → Advanced → Ping URL
// Set it to: https://yourdomain.com/api/webhooks/gumroad

router.post('/gumroad', express.urlencoded({ extended: true }), async (req, res) => {
    // Gumroad sends form-encoded data
    const {
        email,
        full_name,
        permalink,      // your product's permalink slug
        sale_id,
        product_name,
        price,          // in cents
        test,           // "true" if it's a test ping
    } = req.body;

    console.log(`[Gumroad Webhook] Sale received: ${product_name} → ${email} (test: ${test})`);

    // Determine plan from the product permalink
    const plan = resolvePlan(permalink);

    // Provision the key
    const record = provisionKey({
        customerEmail: email,
        customerName: full_name,
        plan,
        source: 'gumroad',
        orderId: sale_id,
    });

    // Send the key by email (non-blocking)
    sendKeyEmail(record).catch(err =>
        console.error('[Gumroad Webhook] Email failed:', err.message)
    );

    // Gumroad expects a 200 OK
    res.status(200).json({ success: true, plan, keyIssued: true });
});

// ─── Stripe Webhook ───────────────────────────────────────────────────────────
// Stripe sends signed JSON events to this endpoint.
// Setup: Stripe Dashboard → Developers → Webhooks → Add endpoint
// Events to listen for: checkout.session.completed

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    let event;

    // Verify Stripe signature (set STRIPE_WEBHOOK_SECRET env var from Stripe dashboard)
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (webhookSecret) {
        try {
            const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
            event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
        } catch (err) {
            console.error('[Stripe Webhook] Signature verification failed:', err.message);
            return res.status(400).json({ error: 'Invalid signature' });
        }
    } else {
        // Dev mode: skip signature check
        console.warn('[Stripe Webhook] ⚠️  STRIPE_WEBHOOK_SECRET not set — skipping signature check');
        event = JSON.parse(req.body.toString());
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const email = session.customer_details?.email || session.customer_email;
        const name = session.customer_details?.name || '';
        const priceId = session.metadata?.price_id || session.line_items?.[0]?.price?.id || '';
        const plan = resolvePlan(priceId);

        console.log(`[Stripe Webhook] Payment confirmed: ${plan} → ${email}`);

        const record = provisionKey({
            customerEmail: email,
            customerName: name,
            plan,
            source: 'stripe',
            orderId: session.id,
        });

        sendKeyEmail(record).catch(err =>
            console.error('[Stripe Webhook] Email failed:', err.message)
        );
    }

    res.status(200).json({ received: true });
});

// ─── Manual Key Lookup (for success page) ────────────────────────────────────
// Called by the success page to retrieve a just-issued key by order ID
router.get('/key-lookup', (req, res) => {
    const { orderId, email } = req.query;
    if (!orderId && !email) return res.status(400).json({ error: 'Provide orderId or email' });

    const { getAllKeys } = require('../provisioner');
    const keys = getAllKeys();
    const record = keys.find(k =>
        (orderId && k.orderId === orderId) ||
        (email && k.email === email.toLowerCase())
    );

    if (!record) return res.status(404).json({ error: 'Key not found yet. Try again in a moment.' });
    res.json({ apiKey: record.apiKey, plan: record.plan, email: record.email });
});

module.exports = router;

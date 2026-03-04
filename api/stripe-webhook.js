const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const VARIANT_IDS = {
    hoodie: {
        'S':   5220373455,
        'M':   5220373456,
        'L':   5220373457,
        'XL':  5220373458,
        '2XL': 5220373459,
        '3XL': 5220373460,
    },
    cap: 5220368922,
};

async function getRawBody(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).end();

    // Must use raw body for Stripe signature verification
    const rawBody = await getRawBody(req);
    const sig = req.headers['stripe-signature'];

    let event;
    try {
        event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const { product, size, shipping_name, address1, city, state, zip, country } = session.metadata;

        const variantId = product === 'hoodie' ? VARIANT_IDS.hoodie[size] : VARIANT_IDS.cap;
        if (!variantId) {
            console.error('Unknown product/size in metadata:', product, size);
            return res.status(200).json({ received: true });
        }

        try {
            const orderRes = await fetch('https://api.printful.com/orders?confirm=1', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    recipient: {
                        name: shipping_name,
                        address1,
                        city,
                        ...(state && { state_code: state }),
                        country_code: country,
                        zip,
                    },
                    items: [{
                        sync_variant_id: variantId,
                        quantity: 1,
                    }],
                }),
            });

            const orderData = await orderRes.json();

            if (orderData.code !== 200) {
                console.error('Printful order creation failed:', JSON.stringify(orderData));
            } else {
                console.log(`Printful order #${orderData.result.id} created for ${shipping_name}`);
            }
        } catch (e) {
            console.error('Failed to create Printful order:', e);
        }
    }

    res.status(200).json({ received: true });
};

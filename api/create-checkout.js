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

const PRICES = { hoodie: 5000, cap: 2000 }; // cents

async function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => (data += chunk));
        req.on('end', () => resolve(data));
        req.on('error', reject);
    });
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).end();

    // Parse body — handle both pre-parsed (object) and raw string
    let body;
    try {
        if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
            body = req.body;
        } else {
            const raw = await readBody(req);
            body = JSON.parse(raw);
        }
    } catch {
        return res.status(400).json({ error: 'Invalid request body' });
    }

    const { product, size, name, email, address1, city, state, zip, country } = body;

    if (!product || !name || !email || !address1 || !city || !zip || !country) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const variantId = product === 'hoodie' ? VARIANT_IDS.hoodie[size] : VARIANT_IDS.cap;
    if (!variantId) {
        return res.status(400).json({ error: 'Invalid product or size' });
    }

    // Fetch real shipping rates from Printful
    let shippingOptions = [];
    try {
        const pRes = await fetch('https://api.printful.com/shipping/rates', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.PRINTFUL_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                recipient: {
                    address1,
                    city,
                    ...(state && { state_code: state }),
                    country_code: country.toUpperCase(),
                    zip,
                },
                items: [{ sync_variant_id: variantId, quantity: 1 }],
            }),
        });

        const pData = await pRes.json();

        if (pData.code === 200 && Array.isArray(pData.result)) {
            shippingOptions = pData.result.slice(0, 3).map(rate => ({
                shipping_rate_data: {
                    type: 'fixed_amount',
                    fixed_amount: {
                        amount: Math.round(parseFloat(rate.rate) * 100),
                        currency: 'usd',
                    },
                    display_name: rate.name,
                    ...(rate.minDeliveryDays != null && {
                        delivery_estimate: {
                            minimum: { unit: 'business_day', value: rate.minDeliveryDays },
                            maximum: { unit: 'business_day', value: rate.maxDeliveryDays },
                        },
                    }),
                },
            }));
        }
    } catch (e) {
        console.error('Printful shipping rates error:', e);
    }

    // Fallback if Printful unreachable
    if (shippingOptions.length === 0) {
        shippingOptions = [{
            shipping_rate_data: {
                type: 'fixed_amount',
                fixed_amount: { amount: 799, currency: 'usd' },
                display_name: 'Standard Shipping',
            },
        }];
    }

    const productLabel = product === 'hoodie'
        ? `Play By Ear Hoodie${size ? ` / ${size}` : ''}`
        : 'Play By Ear Corduroy Cap';

    try {
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            customer_email: email,
            line_items: [{
                price_data: {
                    currency: 'usd',
                    product_data: { name: productLabel },
                    unit_amount: PRICES[product],
                },
                quantity: 1,
            }],
            shipping_options: shippingOptions,
            metadata: {
                product,
                size: size || '',
                shipping_name: name,
                address1,
                city,
                state: state || '',
                zip,
                country: country.toUpperCase(),
            },
            success_url: 'https://playbyear.com/success.html',
            cancel_url: 'https://playbyear.com/shop.html',
        });

        res.status(200).json({ url: session.url });
    } catch (e) {
        console.error('Stripe error:', e);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
};

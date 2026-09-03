const footerMarkup = `
    <footer class="footer">
        <div class="footer-newsletter-row">
            <div class="newsletter-text">
                <h3>Notes from Play By Ear</h3>
                <p>Notes on fractional GTM, emerging-tech launches, and the rooms worth hosting.</p>
            </div>
            <form class="newsletter-form">
                <div class="newsletter-fields">
                    <input type="email" name="email" placeholder="your@email.com" required autocomplete="email" aria-label="Email address">
                    <button type="submit" class="btn btn-primary">
                        <span>Subscribe</span>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                    </button>
                </div>
                <p class="newsletter-success" role="status" aria-live="polite" style="display:none;">Thanks for subscribing.</p>
            </form>
        </div>
        <div class="footer-content">
            <span class="footer-logo">Play By Ear</span>
            <nav class="footer-links" aria-label="Footer">
                <a href="/gtm">GTM</a>
                <a href="/hosting">Hosting</a>
                <a href="/projects">Projects</a>
                <a href="/workshops">Workshops</a>
                <a href="/contact">Contact</a>
                <a href="https://www.linkedin.com/company/playbyear/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
                <a href="/privacy-policy">Privacy</a>
                <button type="button" class="footer-link-button" data-analytics-settings>Privacy Choices</button>
            </nav>
        </div>
        <p class="footer-copyright">&copy; 2026 Play By Ear. All rights reserved.</p>
    </footer>
`;

document.querySelectorAll('[data-site-footer]').forEach((mount) => {
    mount.outerHTML = footerMarkup;
});

document.querySelectorAll('.newsletter-form').forEach((form) => {
    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const fields = form.querySelector('.newsletter-fields');
        const success = form.querySelector('.newsletter-success');
        const submitButton = form.querySelector('button[type="submit"]');

        if (submitButton) submitButton.disabled = true;

        try {
            const response = await fetch('https://formspree.io/f/mqeyzoov', {
                method: 'POST',
                body: new FormData(form),
                headers: { 'Accept': 'application/json' }
            });

            if (!response.ok) throw new Error('Newsletter signup failed');

            if (fields) fields.style.display = 'none';
            if (success) {
                success.textContent = 'Thanks for subscribing.';
                success.style.display = 'block';
            }
            if (window.pbeTrack) {
                window.pbeTrack('generate_lead', { form_name: 'newsletter_signup' });
            }
        } catch (error) {
            if (success) {
                success.textContent = 'Something went wrong. Please try again.';
                success.style.display = 'block';
            }
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    });
});

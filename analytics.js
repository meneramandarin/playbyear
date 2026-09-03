(function () {
    'use strict';

    const MEASUREMENT_ID = 'G-X2GNJB46F3';
    const CONSENT_KEY = 'pbe-analytics-consent';
    const CONSENT_GRANTED = 'granted';
    const CONSENT_DENIED = 'denied';
    let analyticsLoaded = false;
    let currentConsent = null;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
        window.dataLayer.push(arguments);
    };

    window.gtag('consent', 'default', {
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        analytics_storage: 'denied',
        functionality_storage: 'granted',
        security_storage: 'granted'
    });

    function getConsent() {
        try {
            return window.localStorage.getItem(CONSENT_KEY);
        } catch (error) {
            return null;
        }
    }

    function saveConsent(value) {
        currentConsent = value;
        try {
            window.localStorage.setItem(CONSENT_KEY, value);
        } catch (error) {
            // The choice still applies to the current page when storage is unavailable.
        }
    }

    function loadAnalytics() {
        if (analyticsLoaded) return;
        analyticsLoaded = true;

        window.gtag('js', new Date());
        window.gtag('config', MEASUREMENT_ID, {
            anonymize_ip: true,
            allow_google_signals: false,
            allow_ad_personalization_signals: false
        });

        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
        document.head.appendChild(script);
    }

    function applyConsent(value) {
        const granted = value === CONSENT_GRANTED;

        window.gtag('consent', 'update', {
            analytics_storage: granted ? 'granted' : 'denied',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied'
        });

        if (granted) loadAnalytics();
    }

    function trackingAllowed() {
        return currentConsent === CONSENT_GRANTED && analyticsLoaded;
    }

    window.pbeTrack = function (eventName, parameters) {
        if (!trackingAllowed()) return;
        window.gtag('event', eventName, parameters || {});
    };

    function cleanText(value) {
        return (value || '').replace(/\s+/g, ' ').trim().slice(0, 100);
    }

    function clickArea(element) {
        if (element.closest('.menu-bar')) return 'header_nav';
        if (element.closest('.footer')) return 'footer';
        if (element.closest('form')) return 'form';

        const section = element.closest('section, main, header, article');
        if (!section) return 'page';
        if (section.id) return section.id.slice(0, 100);

        const usefulClass = Array.from(section.classList).find((name) => (
            !name.startsWith('fade-') && !name.endsWith('-delay')
        ));
        return (usefulClass || section.tagName.toLowerCase()).slice(0, 100);
    }

    function safeDestination(anchor) {
        const rawHref = anchor.getAttribute('href') || '';

        if (rawHref.startsWith('mailto:')) return { destination: 'email', linkType: 'email' };
        if (rawHref.startsWith('tel:')) return { destination: 'phone', linkType: 'phone' };
        if (rawHref.startsWith('#')) return { destination: rawHref.slice(0, 100), linkType: 'anchor' };

        try {
            const url = new URL(anchor.href, window.location.href);
            const internal = url.origin === window.location.origin;
            return {
                destination: internal ? url.pathname : `${url.hostname}${url.pathname}`,
                linkType: internal ? 'internal' : 'outbound'
            };
        } catch (error) {
            return { destination: 'unknown', linkType: 'other' };
        }
    }

    function trackClick(event) {
        const target = event.target instanceof Element
            ? event.target.closest('a, button')
            : null;

        if (!target || target.hasAttribute('data-analytics-consent')) return;

        const label = cleanText(
            target.getAttribute('data-analytics-label') ||
            target.getAttribute('aria-label') ||
            target.textContent
        );

        if (target.matches('a')) {
            const details = safeDestination(target);
            window.pbeTrack('link_click', {
                click_text: label || 'unlabelled_link',
                click_area: clickArea(target),
                link_destination: details.destination,
                link_type: details.linkType
            });
            return;
        }

        window.pbeTrack('button_click', {
            click_text: label || 'unlabelled_button',
            click_area: clickArea(target),
            button_type: target.getAttribute('type') || 'button'
        });
    }

    function trackFormSubmit(event) {
        const form = event.target;
        if (!(form instanceof HTMLFormElement) || form.hasAttribute('data-no-analytics')) return;

        let destination = 'same_page';
        if (form.action) {
            try {
                destination = new URL(form.action, window.location.href).hostname || 'same_page';
            } catch (error) {
                destination = 'unknown';
            }
        }

        window.pbeTrack('form_submit', {
            form_name: form.id || cleanText(form.getAttribute('aria-label')) || 'contact_form',
            form_destination: destination,
            form_area: clickArea(form)
        });
    }

    function renderConsentBanner() {
        if (document.getElementById('analytics-consent')) return;

        const banner = document.createElement('section');
        banner.id = 'analytics-consent';
        banner.className = 'analytics-consent';
        banner.setAttribute('role', 'dialog');
        banner.setAttribute('aria-labelledby', 'analytics-consent-title');
        banner.setAttribute('aria-describedby', 'analytics-consent-description');
        banner.innerHTML = `
            <div class="analytics-consent__copy">
                <h2 id="analytics-consent-title">A little listening?</h2>
                <p id="analytics-consent-description">We use optional Google Analytics to understand which pages and links people use. We never send the contents of forms. <a href="/privacy-policy">Privacy details</a></p>
            </div>
            <div class="analytics-consent__actions">
                <button type="button" class="analytics-consent__decline" data-analytics-consent="denied">No thanks</button>
                <button type="button" class="analytics-consent__accept" data-analytics-consent="granted">Allow analytics</button>
            </div>
        `;

        banner.addEventListener('click', (event) => {
            const button = event.target.closest('[data-analytics-consent]');
            if (!button) return;

            const choice = button.getAttribute('data-analytics-consent');
            saveConsent(choice);
            applyConsent(choice);
            banner.remove();
        });

        document.body.appendChild(banner);
    }

    function showPrivacyChoices() {
        const existingBanner = document.getElementById('analytics-consent');
        if (existingBanner) {
            existingBanner.querySelector('button')?.focus();
            return;
        }

        renderConsentBanner();
        document.getElementById('analytics-consent')?.querySelector('button')?.focus();
    }

    const savedConsent = getConsent();
    currentConsent = savedConsent;
    if (savedConsent === CONSENT_GRANTED || savedConsent === CONSENT_DENIED) {
        applyConsent(savedConsent);
    }

    document.addEventListener('DOMContentLoaded', () => {
        if (!savedConsent) renderConsentBanner();

        document.addEventListener('click', trackClick, true);
        document.addEventListener('submit', trackFormSubmit, true);

        document.addEventListener('click', (event) => {
            if (event.target.closest('[data-analytics-settings]')) showPrivacyChoices();
        });

        const params = new URLSearchParams(window.location.search);
        if (params.get('submitted') === '1') {
            window.pbeTrack('generate_lead', {
                form_name: `${window.location.pathname.replace(/^\//, '') || 'home'}_inquiry`
            });
        }
    });
})();

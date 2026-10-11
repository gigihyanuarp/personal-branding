/**
 * @file public/assets/js/app.js
 * @description Main client-side JavaScript for Personal Branding Website.
 * Runs in browser, no build step. Progressive enhancement: works without JS,
 * enhanced with JS (AJAX forms, toast, theme sync, mobile menu).
 * @author Gigih Yanuar Prabawa
 * @version 1.0.0
 */

// ========================================
// IIFE WRAPPER — avoid global pollution
// ========================================
(function() {
    'use strict';

    /**
     * Smooth scroll for anchor links (href="#section").
     * Only applies to same-page anchors, ignores bare "#".
     */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });

    /**
     * Highlight active nav item based on current pathname.
     * Adds `.active` class for CSS styling (underline).
     */
    const currentPath = window.location.pathname;
    document.querySelectorAll('.nav-links a').forEach(link => {
        if (link.getAttribute('href') === currentPath) {
            link.classList.add('active');
        }
    });

    /**
     * Form validation enhancement (HTML5 constraint API).
     * - Prevents submit if invalid
     * - Focuses first invalid field
     * - Adds `.was-validated` for CSS :invalid/:valid styling
     * - Real-time feedback on blur/input (adds .valid/.error classes)
     */
    const forms = document.querySelectorAll('form[novalidate]');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            if (!form.checkValidity()) {
                e.preventDefault();
                e.stopPropagation();

                const firstInvalid = form.querySelector(':invalid');
                if (firstInvalid) {
                    firstInvalid.focus();
                    firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
            form.classList.add('was-validated');
        });

        // Real-time validation feedback
        form.querySelectorAll('input, textarea, select').forEach(input => {
            input.addEventListener('blur', function() {
                if (this.checkValidity()) {
                    this.classList.remove('error');
                    this.classList.add('valid');
                } else {
                    this.classList.remove('valid');
                    this.classList.add('error');
                }
            });

            input.addEventListener('input', function() {
                if (this.classList.contains('error') && this.checkValidity()) {
                    this.classList.remove('error');
                    this.classList.add('valid');
                }
            });
        });
    });

    /**
     * Lazy loading images with IntersectionObserver.
     * Usage: `<img data-src="/path.jpg" alt="...">` (no src attribute)
     * Observer loads image when within 50px of viewport.
     */
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                    }
                    observer.unobserve(img);
                }
            });
        }, { rootMargin: '50px' });

        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
    }

    /**
     * Copy text to clipboard (email, etc).
     * Usage: `<span data-copy="email@example.com">Copy</span>`
     * Shows "Disalin!" for 2 seconds then restores original text.
     */
    document.querySelectorAll('[data-copy]').forEach(el => {
        el.addEventListener('click', function(e) {
            e.preventDefault();
            const text = this.dataset.copy;
            navigator.clipboard.writeText(text).then(() => {
                const originalText = this.textContent;
                this.textContent = 'Disalin!';
                setTimeout(() => { this.textContent = originalText; }, 2000);
            });
        });
    });

    /**
     * Fade-in animation on scroll (IntersectionObserver).
     * Usage: add class `fade-in` to element, CSS handles `.visible` transition.
     */
    const fadeElements = document.querySelectorAll('.fade-in');
    if (fadeElements.length && 'IntersectionObserver' in window) {
        const fadeObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    fadeObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        fadeElements.forEach(el => fadeObserver.observe(el));
    }

    /**
     * Toast notification system (global `window.showToast`).
     * Auto-injects CSS on first load. Auto-removes after 3s.
     * @param {string} message - Text to show
     * @param {'success'|'error'|'warning'|'info'} type - Color variant
     */
    window.showToast = function(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

})();

// ========================================
// TOAST CSS (injected via JS)
// ========================================
const toastStyles = `
.toast {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    padding: 1rem 1.5rem;
    border-radius: var(--radius-md);
    color: white;
    font-weight: 500;
    z-index: 1000;
    transform: translateY(100px);
    opacity: 0;
    transition: all var(--transition-normal);
    box-shadow: var(--shadow-lg);
}

.toast.show {
    transform: translateY(0);
    opacity: 1;
}

.toast-success { background: var(--color-success); }
.toast-error { background: var(--color-danger); }
.toast-warning { background: var(--color-warning); }
.toast-info { background: var(--color-info); }

@media (max-width: 480px) {
    .toast {
        left: 1rem;
        right: 1rem;
        bottom: 1rem;
    }
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = toastStyles;
document.head.appendChild(styleSheet);

// ========================================
// THEME — Auto prefers-color-scheme (no manual toggle)
// ========================================
/**
 * Theme handler: follows OS/browser preference via `prefers-color-scheme`.
 * - No toggle button, no localStorage persistence
 * - Live updates when user changes system theme (matchMedia change event)
 * - Anti-flash: inline script in <head> sets data-theme before paint
 */
(function() {
    'use strict';

    const html = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    function applyTheme() {
        html.setAttribute('data-theme', mq.matches ? 'dark' : 'light');
    }

    applyTheme();

    // Listen for system theme changes (live, no reload)
    if (typeof mq.addEventListener === 'function') {
        mq.addEventListener('change', applyTheme);
    } else if (typeof mq.addListener === 'function') {
        mq.addListener(applyTheme); // Safari <14 fallback
    }
})();

// ========================================
// MOBILE MENU — Hamburger + slide panel + overlay
// ========================================
document.addEventListener('DOMContentLoaded', function() {
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    const overlay = document.createElement('div');
    overlay.className = 'mobile-menu-overlay';
    document.body.appendChild(overlay);

    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', function(e) {
            e.preventDefault();
            menuBtn.classList.toggle('active');
            navLinks.classList.toggle('active');
            overlay.classList.toggle('active');
            document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
        });

        // Close menu when clicking overlay
        overlay.addEventListener('click', function() {
            menuBtn.classList.remove('active');
            navLinks.classList.remove('active');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        });

        // Close menu when clicking a nav link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', function() {
                menuBtn.classList.remove('active');
                navLinks.classList.remove('active');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            });
        });

        // Close menu on Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && navLinks.classList.contains('active')) {
                menuBtn.classList.remove('active');
                navLinks.classList.remove('active');
                overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
});

// ========================================
// REDUCED MOTION — Respect prefers-reduced-motion
// ========================================
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (prefersReducedMotion.matches) {
    // Remove transition styles if user prefers reduced motion
    const styleSheet = document.querySelector('style[data-theme-transitions]');
    if (styleSheet) styleSheet.remove();
    const existingStyles = document.querySelector('style');
    if (existingStyles && existingStyles.dataset.themeTransitions) {
        existingStyles.remove();
    }
}
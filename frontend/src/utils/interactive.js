// Interactive Elements Utility Functions

// ============================================
// SCROLL ANIMATIONS
// ============================================
export function initScrollAnimations() {
    const elements = document.querySelectorAll('.fade-in-element');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    elements.forEach(el => observer.observe(el));
}

// ============================================
// RIPPLE EFFECT
// ============================================
export function addRippleEffect(button) {
    button.addEventListener('click', function (e) {
        const ripple = document.createElement('span');
        ripple.classList.add('ripple');

        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = x + 'px';
        ripple.style.top = y + 'px';

        this.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
    });
}

export function initRippleButtons() {
    const buttons = document.querySelectorAll('.ripple-button, button, .btn');
    buttons.forEach(btn => {
        if (!btn.classList.contains('ripple-initialized')) {
            btn.classList.add('ripple-button', 'ripple-initialized');
            addRippleEffect(btn);
        }
    });
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
let toastContainer = null;

function getToastContainer() {
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    return toastContainer;
}

export function showToast(message, type = 'info', duration = 3000) {
    const container = getToastContainer();

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
    };

    toast.innerHTML = `
    <div class="toast-icon">${icons[type] || icons.info}</div>
    <div class="toast-content">${message}</div>
    <div class="toast-close">✕</div>
  `;

    container.appendChild(toast);

    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        toast.style.animation = 'toast-slide-out 0.3s ease-out forwards';
        setTimeout(() => toast.remove(), 300);
    });

    if (duration > 0) {
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'toast-slide-out 0.3s ease-out forwards';
                setTimeout(() => toast.remove(), 300);
            }
        }, duration);
    }

    return toast;
}

// Add slide-out animation to CSS dynamically
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
    @keyframes toast-slide-out {
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
    document.head.appendChild(style);
}

// ============================================
// TOOLTIP INITIALIZATION
// ============================================
export function initTooltips() {
    const elements = document.querySelectorAll('[data-tooltip]');

    elements.forEach(el => {
        if (!el.classList.contains('tooltip-wrapper')) {
            const wrapper = document.createElement('div');
            wrapper.className = 'tooltip-wrapper';
            el.parentNode.insertBefore(wrapper, el);
            wrapper.appendChild(el);

            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = el.getAttribute('data-tooltip');
            wrapper.appendChild(tooltip);
        }
    });
}

// ============================================
// PARTICLE EFFECTS
// ============================================
export function createParticles(container, count = 20) {
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 8 + 's';
        particle.style.animationDuration = (8 + Math.random() * 4) + 's';
        container.appendChild(particle);
    }
}

// ============================================
// PROGRESS BAR
// ============================================
export function updateProgress(element, percentage) {
    const fill = element.querySelector('.progress-fill');
    if (fill) {
        fill.style.width = percentage + '%';
    }
}

export function updateCircularProgress(element, percentage) {
    element.style.setProperty('--progress', percentage + '%');
    const span = element.querySelector('span');
    if (span) {
        span.textContent = Math.round(percentage) + '%';
    }
}

// ======================================
// INTERACTIVE CARD SETUP
// ============================================
export function initInteractiveCards() {
    const cards = document.querySelectorAll('.config-panel, .agent-form-container, .preview-panel, .platform-card');

    cards.forEach(card => {
        if (!card.classList.contains('interactive-card')) {
            card.classList.add('interactive-card');
        }
    });
}

// ============================================
// SKELETON LOADER
// ============================================
export function showSkeleton(container) {
    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton-container';
    skeleton.innerHTML = `
    <div class="skeleton skeleton-title"></div>
    <div class="skeleton skeleton-text"></div>
    <div class="skeleton skeleton-text"></div>
    <div class="skeleton skeleton-text" style="width: 80%"></div>
  `;
    container.appendChild(skeleton);
    return skeleton;
}

export function hideSkeleton(skeleton) {
    if (skeleton && skeleton.parentElement) {
        skeleton.style.opacity = '0';
        setTimeout(() => skeleton.remove(), 300);
    }
}

// ============================================
// SUCCESS ANIMATION
// ============================================
export function showSuccessAnimation(container) {
    const success = document.createElement('div');
    success.className = 'success-checkmark';
    success.innerHTML = '<div class="check-icon"></div>';
    container.appendChild(success);

    setTimeout(() => {
        success.style.opacity = '0';
        setTimeout(() => success.remove(), 300);
    }, 2000);
}

// ============================================
// INITIALIZE ALL INTERACTIVE ELEMENTS
// ============================================
export function initAllInteractiveElements() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        initScrollAnimations();
        initRippleButtons();
        initTooltips();
        initInteractiveCards();

        // Re-initialize on dynamic content changes
        const observer = new MutationObserver(() => {
            initRippleButtons();
            initTooltips();
            initInteractiveCards();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
}

// Auto-initialize if this module is loaded
if (typeof window !== 'undefined') {
    initAllInteractiveElements();
}

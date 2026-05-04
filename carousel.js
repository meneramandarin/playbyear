// ========================================
// Play By Ear — Interactive JavaScript
// ========================================

// Carousel functionality
const carouselDelay = 9000;

function initializeCarousel(carousel) {
    const carouselContent = carousel.querySelectorAll(".carousel-item");
    const carouselNav = carousel.parentElement.querySelector(".carousel-nav");
    const carouselDots = carouselNav ? carouselNav.querySelectorAll(".carousel-dot") : [];

    if (!carouselContent.length) return;

    let activeIndex = Array.from(carouselContent).findIndex(item => item.classList.contains("active"));
    if (activeIndex < 0) activeIndex = 0;

    let carouselInterval;

    function updateCarousel() {
        carouselContent.forEach((item, index) => {
            item.classList.toggle("active", index === activeIndex);
        });

        carouselDots.forEach((dot, index) => {
            dot.classList.toggle("active", index === activeIndex);
        });
    }

    function cycleCarousel() {
        activeIndex = (activeIndex + 1) % carouselContent.length;
        updateCarousel();
    }

    function resetCarouselInterval() {
        clearInterval(carouselInterval);
        if (carouselContent.length > 1) {
            carouselInterval = setInterval(cycleCarousel, carouselDelay);
        }
    }

    function goToSlide(index) {
        activeIndex = index;
        updateCarousel();
        resetCarouselInterval();
    }

    updateCarousel();
    resetCarouselInterval();

    carouselDots.forEach((dot, index) => {
        dot.addEventListener("click", () => goToSlide(index));
    });

    carousel.addEventListener("mouseenter", () => {
        clearInterval(carouselInterval);
    });

    carousel.addEventListener("mouseleave", () => {
        resetCarouselInterval();
    });
}

document.querySelectorAll(".carousel").forEach(initializeCarousel);

// ========================================
// Menu bar scroll effect
// ========================================
document.addEventListener("DOMContentLoaded", function() {
    const menuBar = document.querySelector(".menu-bar");

    function handleScroll() {
        if (window.scrollY > 50) {
            menuBar.classList.add("scrolled");
        } else {
            menuBar.classList.remove("scrolled");
        }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Check initial state
});

// ========================================
// Scroll-triggered animations
// ========================================
document.addEventListener("DOMContentLoaded", function() {
    const fadeUpElements = document.querySelectorAll(".fade-up");

    const observerOptions = {
        root: null,
        rootMargin: "0px 0px -100px 0px",
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Stagger the animations
                setTimeout(() => {
                    entry.target.classList.add("visible");
                }, index * 100);
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    fadeUpElements.forEach(el => observer.observe(el));
});

// ========================================
// Smooth scroll for anchor links
// ========================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function(e) {
        const targetId = this.getAttribute("href");
        if (targetId === "#") return;

        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            e.preventDefault();
            const offsetTop = targetElement.offsetTop - 80; // Account for fixed nav
            window.scrollTo({
                top: offsetTop,
                behavior: "smooth"
            });
        }
    });
});

// ========================================
// Button hover effects (subtle parallax on icons)
// ========================================
document.querySelectorAll(".service-card").forEach(card => {
    const icon = card.querySelector(".service-icon img");

    card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;

        const moveX = x * 0.02;
        const moveY = y * 0.02;

        if (icon) {
            icon.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.05)`;
        }
    });

    card.addEventListener("mouseleave", () => {
        if (icon) {
            icon.style.transform = "translate(0, 0) scale(1)";
        }
    });
});

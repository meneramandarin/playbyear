const carouselContent = document.querySelectorAll(".carousel-item");
let activeIndex = 0;

function updateCarousel() {
  for (let i = 0; i < carouselContent.length; i++) {
    carouselContent[i].classList.remove("active");
  }
  carouselContent[activeIndex].classList.add("active");
}

function cycleCarousel() {
  activeIndex++;
  if (activeIndex >= carouselContent.length) {
    activeIndex = 0;
  }
  updateCarousel();
}

updateCarousel();
setInterval(cycleCarousel, 6000);

// toggle menu bar

document.addEventListener("DOMContentLoaded", function() {
    let menuBar = document.querySelector(".menu-bar");
    window.addEventListener("scroll", function() {
        if (window.scrollY > 0) {
            menuBar.classList.add("scrolled");
        } else {
            menuBar.classList.remove("scrolled");
        }
    });
});


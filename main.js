import "./assets/scss/all.scss";
import "bootstrap/dist/js/bootstrap.min.js";
import "./assets/js/ai-triage.js";

console.log("Hello world");

const swiper = new Swiper(".swiper", {
  // Optional parameters
  loop: true,
  slidesPerView: "auto",
  spaceBetween: 16,
  initialSlide: 1,
  centeredSlides: true,

  // Navigation arrows
  navigation: {
    nextEl: ".profile-swiper-button-next",
    prevEl: ".profile-swiper-button-prev",
  },
});

// 這裡加監聽事件
swiper.on("slideNextTransitionStart", () => {
  console.log("右鍵被觸發了");
});

swiper.on("slidePrevTransitionStart", () => {
  console.log("左鍵被觸發了");
});

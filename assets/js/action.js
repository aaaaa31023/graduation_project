// 1. 抓取所有主題按鈕
const buttons = document.querySelectorAll(".theme-btn");
// 2. 抓取下方顯示圖片的 <img>
const themeImage = document.getElementById("theme-image");

// 3. 綁定點擊事件
buttons.forEach((btn) => {
  btn.addEventListener("click", () => {
    // (a) 移除所有 active 樣式
    buttons.forEach((b) => b.classList.remove("active"));

    // (b) 把目前點擊的加上 active
    btn.classList.add("active");

    // (c) 從 data-image 取圖片路徑並更新下方圖片
    const imgPath = btn.dataset.image;
    if (imgPath) {
      themeImage.src = imgPath;
    }
  });
});

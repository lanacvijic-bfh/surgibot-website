import "./style.css";

document.addEventListener("DOMContentLoaded", () => {
  const learnBtn = document.getElementById("learn-button");
  const vignetteBtn = document.getElementById("vignette-library-button");
  const practiceBtn = document.getElementById("practice-button");
  const feedbackBtn = document.getElementById("feedback-button");

  if (learnBtn) {
    learnBtn.addEventListener("click", () => {
      window.location.href = "index.html"; // main / learning module
    });
  }

  if (vignetteBtn) {
    vignetteBtn.addEventListener("click", () => {
      window.location.href = "vignette-library.html";
    });
  }

  if (practiceBtn) {
    practiceBtn.addEventListener("click", () => {
      window.location.href = "practice-module.html";
    });
  }

  if (feedbackBtn) {
    feedbackBtn.addEventListener("click", () => {
      window.location.href = "feedback-module.html";
    });
  }
});

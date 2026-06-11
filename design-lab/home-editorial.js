/* =================================================================
   FLOAA — Editorial Hero Concept
   design-lab/home-editorial.js

   ISOLATED PROTOTYPE — does not affect production scripts
   ================================================================= */

(function () {
  "use strict";

  /* ─── Hero image load ─── */

  var heroImg = document.getElementById("fl-hero-img");

  function markImageLoaded() {
    if (heroImg) {
      heroImg.classList.add("is-loaded");
    }
  }

  if (heroImg) {
    if (heroImg.complete && heroImg.naturalWidth > 0) {
      markImageLoaded();
    } else {
      heroImg.addEventListener("load", markImageLoaded, { once: true });
      heroImg.addEventListener("error", function () {
        /* Fallback: fade in even if image fails so text doesn't disappear */
        markImageLoaded();
      }, { once: true });
    }
  }


  /* ─── Nav frost-on-scroll ─── */

  var nav = document.getElementById("fl-nav");

  function handleNavScroll() {
    if (!nav) return;
    if (window.scrollY > 24) {
      nav.classList.add("is-scrolled");
    } else {
      nav.classList.remove("is-scrolled");
    }
  }

  if (nav) {
    window.addEventListener("scroll", handleNavScroll, { passive: true });
    handleNavScroll();
  }


  /* ─── Design Lab mood switcher ─── */
  /*
     Lets the art director evaluate all three hero images
     without page reload. Not a carousel — manual only.
  */

  var swatches = Array.from(document.querySelectorAll(".lab-swatch"));

  swatches.forEach(function (swatch) {
    swatch.addEventListener("click", function () {
      var mood = swatch.getAttribute("data-mood");
      if (!mood || !heroImg) return;

      var nextSrc = heroImg.getAttribute("data-hero-" + mood);
      if (!nextSrc || nextSrc === heroImg.src) return;

      /* Mark all inactive */
      swatches.forEach(function (s) {
        s.classList.remove("is-active");
        s.setAttribute("aria-pressed", "false");
      });
      swatch.classList.add("is-active");
      swatch.setAttribute("aria-pressed", "true");

      /* Cross-fade to new image */
      heroImg.classList.add("is-transitioning");

      setTimeout(function () {
        heroImg.src = nextSrc;
        heroImg.addEventListener("load", function () {
          heroImg.classList.remove("is-transitioning");
          heroImg.classList.add("is-loaded");
        }, { once: true });
        heroImg.addEventListener("error", function () {
          heroImg.classList.remove("is-transitioning");
        }, { once: true });
      }, 500);
    });
  });


  /* ─── Prefers-reduced-motion ─── */
  /*
     The CSS animation is already gated on prefers-reduced-motion.
     This listener handles runtime changes (e.g. OS setting toggled).
  */

  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  function applyMotionPreference() {
    if (!heroImg) return;
    if (motionQuery.matches) {
      heroImg.style.animation = "none";
    } else {
      heroImg.style.animation = "";
    }
  }

  if (motionQuery.addEventListener) {
    motionQuery.addEventListener("change", applyMotionPreference);
  } else if (motionQuery.addListener) {
    motionQuery.addListener(applyMotionPreference);
  }

  applyMotionPreference();

})();

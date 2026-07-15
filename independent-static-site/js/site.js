/*
 * Custom vanilla-JS replacement for Webflow's runtime (webflow.js).
 * Reproduces, using plain DOM APIs and no dependencies:
 *   - mobile nav open/close
 *   - page-load fade-in
 *   - scroll-reveal of ".divider" elements (width 0% -> 100%)
 *   - scroll-reveal (fade + unblur) of project cards and case-study content blocks
 *   - the image lightbox galleries on the case-study pages
 *
 * Timing/easing values below were taken from this project's own IX2
 * interaction data (extracted from js/webflow.js) rather than guessed:
 *   PageStart:               body opacity 0 -> 1, 800ms
 *   "Divider into view":     width 0% -> 100%, 750ms, ease-in, on scroll into view
 *   "Project(/Data) Scrolls
 *    into view":              opacity 0 -> 1 + blur 15px -> 0, ~500ms, ease-in-out-ish
 *   ProjectHoverIn/Out:       .project__mainpic scale 1 -> 1.05, 200ms (pure CSS, see site.css)
 *   PicHoverIn/Out:           .project__secondarypic scale 1 -> 1.03, 200ms (pure CSS, see site.css)
 */
(function () {
  "use strict";

  var docEl = document.documentElement;
  docEl.classList.add("js");

  /* ---------- Mobile navigation ---------- */
  function initNav() {
    var nav = document.querySelector(".main__navbar");
    var button = nav && nav.querySelector(".menu-button");
    var menu = nav && nav.querySelector(".navbar__menu");
    if (!nav || !button || !menu) return;

    function closeMenu() {
      button.classList.remove("w--open");
      menu.classList.remove("w--open");
      button.setAttribute("aria-expanded", "false");
    }

    function openMenu() {
      button.classList.add("w--open");
      menu.classList.add("w--open");
      button.setAttribute("aria-expanded", "true");
    }

    button.setAttribute("aria-expanded", "false");
    button.setAttribute("role", "button");
    button.setAttribute("tabindex", "0");

    button.addEventListener("click", function () {
      if (menu.classList.contains("w--open")) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    button.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        button.click();
      }
    });

    // Close the menu after a link inside it is used, and on Escape.
    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeMenu();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeMenu();
    });

    // Reset to the closed state when resizing back up to desktop.
    window.addEventListener("resize", function () {
      if (window.innerWidth > 991) closeMenu();
    });
  }

  /* ---------- Page-load fade-in ---------- */
  function initPageFade() {
    // body starts at opacity 0 via CSS (html.js .body rule); flip it on
    // load so no-JS visitors (who never get html.js) simply see the
    // page at full opacity with no fade.
    window.addEventListener("load", function () {
      requestAnimationFrame(function () {
        document.body.classList.add("is-loaded");
      });
    });
  }

  /* ---------- Divider scroll-reveal ---------- */
  function initDividers() {
    var dividers = document.querySelectorAll(".divider");
    if (!dividers.length) return;

    if (!("IntersectionObserver" in window)) {
      dividers.forEach(function (d) { d.classList.add("is-visible"); });
      return;
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px -5% 0px" }
    );

    dividers.forEach(function (d) {
      d.classList.add("divider--reveal");
      observer.observe(d);
    });
  }

  /* ---------- Project card / case-study block scroll-reveal ---------- */
  function initBlockReveal() {
    var containers = document.querySelectorAll(
      ".portfolio__container.project__inportfolio, .main__container.project__data"
    );
    if (!containers.length) return;

    if (!("IntersectionObserver" in window)) {
      return; // default CSS state is already fully visible without JS
    }

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px -10% 0px" }
    );

    containers.forEach(function (c) {
      c.classList.add("reveal-children");
      observer.observe(c);
    });
  }

  /* ---------- Lightbox ---------- */
  function initLightbox() {
    var links = document.querySelectorAll("a.w-lightbox");
    if (!links.length) return;

    var groups = {};
    var linkData = [];

    links.forEach(function (link, index) {
      var script = link.querySelector('script[type="application/json"]');
      if (!script) return;
      var data;
      try {
        data = JSON.parse(script.textContent);
      } catch (e) {
        return;
      }
      var item = data.items && data.items[0];
      if (!item) return;
      var group = data.group || "default-" + index;
      var record = { url: item.url, width: item.width, height: item.height, fileName: item.fileName };
      groups[group] = groups[group] || [];
      groups[group].push(record);
      linkData.push({ link: link, group: group, indexInGroup: groups[group].length - 1 });
    });

    if (!linkData.length) return;

    var backdrop = document.createElement("div");
    backdrop.className = "w-lightbox-backdrop";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-hidden", "true");
    backdrop.tabIndex = -1;
    backdrop.innerHTML =
      '<div class="w-lightbox-container">' +
      '<div class="w-lightbox-content">' +
      '<div class="w-lightbox-view">' +
      '<div class="w-lightbox-frame">' +
      '<figure class="w-lightbox-figure">' +
      '<img class="w-lightbox-img w-lightbox-image" src="" alt="">' +
      "</figure>" +
      "</div>" +
      "</div>" +
      "</div>" +
      '<div class="w-lightbox-control w-lightbox-left" role="button" aria-label="Previous" tabindex="0"></div>' +
      '<div class="w-lightbox-control w-lightbox-right" role="button" aria-label="Next" tabindex="0"></div>' +
      '<div class="w-lightbox-control w-lightbox-close" role="button" aria-label="Close" tabindex="0"></div>' +
      "</div>";
    document.body.appendChild(backdrop);

    var imgEl = backdrop.querySelector(".w-lightbox-img");
    var leftEl = backdrop.querySelector(".w-lightbox-left");
    var rightEl = backdrop.querySelector(".w-lightbox-right");
    var closeEl = backdrop.querySelector(".w-lightbox-close");
    var containerEl = backdrop.querySelector(".w-lightbox-container");

    var currentGroup = null;
    var currentIndex = 0;
    var lastFocused = null;

    function render() {
      var items = groups[currentGroup];
      var item = items[currentIndex];
      imgEl.src = item.url;
      imgEl.alt = item.fileName ? item.fileName.replace(/\.[a-z0-9]+$/i, "") : "";
      var multi = items.length > 1;
      leftEl.style.display = multi ? "block" : "none";
      rightEl.style.display = multi ? "block" : "none";
    }

    function open(group, index) {
      currentGroup = group;
      currentIndex = index;
      lastFocused = document.activeElement;
      render();
      backdrop.classList.add("is-open");
      backdrop.setAttribute("aria-hidden", "false");
      document.body.classList.add("lightbox-open");
      closeEl.focus();
    }

    function close() {
      backdrop.classList.remove("is-open");
      backdrop.setAttribute("aria-hidden", "true");
      document.body.classList.remove("lightbox-open");
      if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
    }

    function next() {
      var items = groups[currentGroup];
      currentIndex = (currentIndex + 1) % items.length;
      render();
    }

    function prev() {
      var items = groups[currentGroup];
      currentIndex = (currentIndex - 1 + items.length) % items.length;
      render();
    }

    linkData.forEach(function (entry) {
      entry.link.addEventListener("click", function (e) {
        e.preventDefault();
        open(entry.group, entry.indexInGroup);
      });
    });

    function onControlKey(handler) {
      return function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handler();
        }
      };
    }

    closeEl.addEventListener("click", close);
    rightEl.addEventListener("click", next);
    leftEl.addEventListener("click", prev);
    closeEl.addEventListener("keydown", onControlKey(close));
    rightEl.addEventListener("keydown", onControlKey(next));
    leftEl.addEventListener("keydown", onControlKey(prev));
    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop || e.target === containerEl) close();
    });
    document.addEventListener("keydown", function (e) {
      if (!backdrop.classList.contains("is-open")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    });
  }

  function init() {
    initNav();
    initPageFade();
    initDividers();
    initBlockReveal();
    initLightbox();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

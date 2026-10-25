/**
 * BMI-CAL: Main Application Coordinator
 * 
 * Handles opening screen animation, WebAssembly engine initialization,
 * and guide page interactive tab switching & marker enhancements.
 */

(function () {
  'use strict';

  const INTRO_STORAGE_KEY = 'bmical_intro_seen';
  const CALC_STORAGE_KEY = 'bmical_saved_calc';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /**
   * Opening Screen Zoom-forward Animation
   */
  function handleIntroAnimation() {
    const overlay = document.getElementById('intro-overlay');
    if (!overlay) return;

    const alreadySeen = sessionStorage.getItem(INTRO_STORAGE_KEY);

    if (alreadySeen === 'true' || prefersReducedMotion) {
      overlay.style.display = 'none';
      overlay.classList.add('hidden');
      return;
    }

    sessionStorage.setItem(INTRO_STORAGE_KEY, 'true');

    setTimeout(() => {
      overlay.classList.add('hidden');
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 500);
    }, 1800);
  }

  /**
   * Initializes the calculation engine and updates UI badges
   */
  async function initializeEngine() {
    const engineTag = document.getElementById('engine-status-tag');
    if (window.BmiEngine) {
      await window.BmiEngine.init();
      if (engineTag) {
        const isWasm = window.BmiEngine.isWasmReady();
        engineTag.innerHTML = `
          <span class="engine-dot" aria-hidden="true" style="${isWasm ? '' : 'background:#F59E0B;box-shadow:0 0 6px rgba(245,158,11,0.6);'}"></span>
          <span>${isWasm ? 'C / WASM Engine' : 'C Calculation Bridge'}</span>
        `;
        engineTag.setAttribute('title', isWasm ? 'Compiled C module executing in WebAssembly' : 'Direct calculation engine bridge');
      }
    }
  }

  /**
   * Enhances the BMI Guide page with tab switching and user result markers
   */
  function setupGuidePage() {
    const tabBtnAdult = document.getElementById('tab-btn-adult');
    const tabBtnChild = document.getElementById('tab-btn-child');
    const adultContent = document.getElementById('guide-adult-content');
    const childContent = document.getElementById('guide-child-content');

    if (!tabBtnAdult || !tabBtnChild) return;

    function switchGuideTab(target) {
      if (target === 'child') {
        tabBtnChild.classList.add('active');
        tabBtnChild.setAttribute('aria-selected', 'true');
        tabBtnAdult.classList.remove('active');
        tabBtnAdult.setAttribute('aria-selected', 'false');

        if (childContent) childContent.style.display = 'block';
        if (adultContent) adultContent.style.display = 'none';
      } else {
        tabBtnAdult.classList.add('active');
        tabBtnAdult.setAttribute('aria-selected', 'true');
        tabBtnChild.classList.remove('active');
        tabBtnChild.setAttribute('aria-selected', 'false');

        if (adultContent) adultContent.style.display = 'block';
        if (childContent) childContent.style.display = 'none';
      }
    }

    tabBtnAdult.addEventListener('click', () => switchGuideTab('adult'));
    tabBtnChild.addEventListener('click', () => switchGuideTab('child'));

    // Auto-detect tab from URL query params (e.g. guide.html?tab=child) or saved state
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');

    let savedData = null;
    try {
      const raw = sessionStorage.getItem(CALC_STORAGE_KEY);
      if (raw) savedData = JSON.parse(raw);
    } catch (e) {
      console.warn('Could not parse saved calc state:', e);
    }

    if (tabParam === 'child' || (savedData && savedData.mode === 'child' && tabParam !== 'adult')) {
      switchGuideTab('child');
    } else {
      switchGuideTab('adult');
    }

    // Place marker on Adult or Child chart if result exists
    if (savedData && savedData.result && savedData.result.success) {
      const res = savedData.result;
      if (savedData.mode === 'child') {
        const markerChild = document.getElementById('guide-user-marker-child');
        if (markerChild) {
          markerChild.style.display = 'flex';
          markerChild.style.left = `${res.scalePercent}%`;
          const tag = markerChild.querySelector('.marker-tag');
          if (tag) {
            tag.textContent = `Child: ${res.percentileOrdinal} %ile`;
          }
        }
      } else {
        const markerAdult = document.getElementById('guide-user-marker-adult');
        if (markerAdult) {
          markerAdult.style.display = 'flex';
          markerAdult.style.left = `${res.scalePercent}%`;
          const tag = markerAdult.querySelector('.marker-tag');
          if (tag) {
            tag.textContent = `You: ${res.bmiFormatted}`;
          }
        }
      }
    }
  }

  // Initialize once DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    handleIntroAnimation();
    initializeEngine();
    setupGuidePage();
  });
})();

/**
 * BMI-CAL: Main Application Coordinator
 * 
 * Handles opening screen animation, WebAssembly engine initialization,
 * and guide page interactive enhancements.
 */

(function () {
  'use strict';

  const INTRO_STORAGE_KEY = 'bmical_intro_seen';
  const CALC_STORAGE_KEY = 'bmical_saved_calc';

  // Check prefers-reduced-motion
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /**
   * Opening Screen Zoom-forward Animation
   */
  function handleIntroAnimation() {
    const overlay = document.getElementById('intro-overlay');
    if (!overlay) return;

    // Check if user already saw the intro during this session or prefers reduced motion
    const alreadySeen = sessionStorage.getItem(INTRO_STORAGE_KEY);

    if (alreadySeen === 'true' || prefersReducedMotion) {
      overlay.style.display = 'none';
      overlay.classList.add('hidden');
      return;
    }

    // Mark as seen for subsequent page loads and navigation
    sessionStorage.setItem(INTRO_STORAGE_KEY, 'true');

    // Allow the CSS introZoom animation (1.8s) to complete, then fade out and unmount overlay
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
   * Enhances the BMI Guide page if user already has a calculated result
   */
  function setupGuidePageMarkers() {
    const guideMarker = document.getElementById('guide-user-marker');
    if (!guideMarker) return;

    try {
      const savedData = sessionStorage.getItem(CALC_STORAGE_KEY);
      if (!savedData) {
        guideMarker.style.display = 'none';
        return;
      }

      const parsed = JSON.parse(savedData);
      if (parsed && parsed.result && parsed.result.success) {
        const res = parsed.result;
        guideMarker.style.display = 'flex';
        guideMarker.style.left = `${res.scalePercent}%`;
        const tag = guideMarker.querySelector('.marker-tag');
        if (tag) {
          tag.textContent = `Your Result: ${res.bmiFormatted}`;
        }
      } else {
        guideMarker.style.display = 'none';
      }
    } catch (e) {
      console.warn('Could not read saved BMI for guide marker:', e);
    }
  }

  // Initialize once DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    handleIntroAnimation();
    initializeEngine();
    setupGuidePageMarkers();
  });
})();

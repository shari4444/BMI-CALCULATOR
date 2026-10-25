/**
 * BMI-CAL: Calculator Controller
 * 
 * Handles interactive input validation, unit conversions, C/WebAssembly execution,
 * result rendering, and cross-page state persistence.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'bmical_saved_calc';

  // DOM Elements
  let heightInput = null;
  let weightInput = null;
  let heightUnitButtons = [];
  let weightUnitButtons = [];
  let heightErrorEl = null;
  let weightErrorEl = null;
  let heightRowEl = null;
  let weightRowEl = null;
  let calculateBtn = null;
  let resultSection = null;

  // Active units
  let currentHeightUnit = 'cm';
  let currentWeightUnit = 'kg';

  function initCalculator() {
    heightInput = document.getElementById('height-input');
    weightInput = document.getElementById('weight-input');
    heightErrorEl = document.getElementById('height-error');
    weightErrorEl = document.getElementById('weight-error');
    heightRowEl = document.getElementById('height-control-row');
    weightRowEl = document.getElementById('weight-control-row');
    calculateBtn = document.getElementById('btn-calculate');
    resultSection = document.getElementById('result-section');

    if (!heightInput || !weightInput || !calculateBtn) {
      return; // Not on calculator page
    }

    heightUnitButtons = Array.from(document.querySelectorAll('[data-unit-group="height"]'));
    weightUnitButtons = Array.from(document.querySelectorAll('[data-unit-group="weight"]'));

    setupUnitSwitchers();
    setupInputEvents();
    setupCalculateAction();
    restoreSavedState();
  }

  function setupUnitSwitchers() {
    // Height unit switching
    heightUnitButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetUnit = btn.getAttribute('data-unit');
        if (targetUnit === currentHeightUnit) return;

        const currentVal = heightInput.value.trim();
        if (currentVal && window.BmiEngine) {
          const converted = window.BmiEngine.convertHeightBetweenUnits(currentVal, currentHeightUnit, targetUnit);
          if (converted) {
            heightInput.value = converted;
          }
        }

        currentHeightUnit = targetUnit;
        heightUnitButtons.forEach(b => {
          const isActive = b === btn;
          b.classList.toggle('active', isActive);
          b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
        clearError('height');
      });
    });

    // Weight unit switching
    weightUnitButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetUnit = btn.getAttribute('data-unit');
        if (targetUnit === currentWeightUnit) return;

        const currentVal = weightInput.value.trim();
        if (currentVal && window.BmiEngine) {
          const converted = window.BmiEngine.convertWeightBetweenUnits(currentVal, currentWeightUnit, targetUnit);
          if (converted) {
            weightInput.value = converted;
          }
        }

        currentWeightUnit = targetUnit;
        weightUnitButtons.forEach(b => {
          const isActive = b === btn;
          b.classList.toggle('active', isActive);
          b.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
        clearError('weight');
      });
    });
  }

  function setupInputEvents() {
    // Clear errors on typing
    heightInput.addEventListener('input', () => clearError('height'));
    weightInput.addEventListener('input', () => clearError('weight'));

    // Enter key submission
    [heightInput, weightInput].forEach(input => {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleCalculate();
        }
      });
    });
  }

  function setupCalculateAction() {
    calculateBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleCalculate();
    });
  }

  function showError(field, message) {
    if (field === 'height') {
      if (heightErrorEl) {
        heightErrorEl.innerHTML = `
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <span>${message}</span>`;
      }
      if (heightRowEl) heightRowEl.classList.add('has-error');
      if (heightInput) heightInput.setAttribute('aria-invalid', 'true');
    } else if (field === 'weight') {
      if (weightErrorEl) {
        weightErrorEl.innerHTML = `
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <span>${message}</span>`;
      }
      if (weightRowEl) weightRowEl.classList.add('has-error');
      if (weightInput) weightInput.setAttribute('aria-invalid', 'true');
    }
  }

  function clearError(field) {
    if (field === 'height' || field === 'all') {
      if (heightErrorEl) heightErrorEl.innerHTML = '';
      if (heightRowEl) heightRowEl.classList.remove('has-error');
      if (heightInput) heightInput.removeAttribute('aria-invalid');
    }
    if (field === 'weight' || field === 'all') {
      if (weightErrorEl) weightErrorEl.innerHTML = '';
      if (weightRowEl) weightRowEl.classList.remove('has-error');
      if (weightInput) weightInput.removeAttribute('aria-invalid');
    }
  }

  function handleCalculate() {
    clearError('all');

    const rawHeight = heightInput.value.trim();
    const rawWeight = weightInput.value.trim();

    if (!rawHeight) {
      showError('height', 'Please enter your height.');
      heightInput.focus();
      return;
    }

    if (!rawWeight) {
      showError('weight', 'Please enter your weight.');
      weightInput.focus();
      return;
    }

    if (!window.BmiEngine) {
      showError('height', 'Calculation engine is still initializing. Please wait a moment.');
      return;
    }

    const result = window.BmiEngine.calculate(rawHeight, currentHeightUnit, rawWeight, currentWeightUnit);

    if (!result.success) {
      showError(result.field || 'height', result.error);
      if (result.field === 'weight') {
        weightInput.focus();
      } else {
        heightInput.focus();
      }
      return;
    }

    // Save state for persistence across views
    saveState({
      height: rawHeight,
      heightUnit: currentHeightUnit,
      weight: rawWeight,
      weightUnit: currentWeightUnit,
      result: result
    });

    renderResult(result);

    // Smooth scroll to result
    if (resultSection) {
      resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function renderResult(result) {
    if (!resultSection) return;

    const cat = result.category;

    resultSection.innerHTML = `
      <div class="result-container" role="region" aria-live="polite" aria-label="BMI Result">
        <div class="card-glass result-card">
          <div class="result-top-bar">
            <span class="result-eyebrow">YOUR BMI</span>
            <span class="category-pill ${cat.badgeClass}">
              <span class="category-bullet" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${cat.color};"></span>
              ${cat.name}
            </span>
          </div>

          <div class="bmi-number-display" aria-label="BMI score ${result.bmiFormatted}">
            ${result.bmiFormatted}
          </div>

          <h3 class="bmi-category-heading">${cat.name}</h3>
          <p class="result-explanation">${cat.explanation}</p>

          <!-- 4-Segment Horizontal BMI Scale -->
          <div class="bmi-scale-wrapper" aria-hidden="true">
            <div class="bmi-scale-bar">
              <div class="scale-segment seg-underweight" title="Underweight: < 18.5"></div>
              <div class="scale-segment seg-healthy" title="Healthy weight: 18.5 – 24.9"></div>
              <div class="scale-segment seg-overweight" title="Overweight: 25.0 – 29.9"></div>
              <div class="scale-segment seg-obesity" title="Obesity: ≥ 30.0"></div>
            </div>

            <!-- Position Marker Indicator -->
            <div class="scale-marker-container">
              <div class="scale-marker" style="left: ${result.scalePercent}%;">
                <div class="marker-arrow"></div>
                <div class="marker-tag">You (${result.bmiFormatted})</div>
              </div>
            </div>

            <div class="scale-labels">
              <span class="scale-label-item">10</span>
              <span class="scale-label-item">18.5</span>
              <span class="scale-label-item">25</span>
              <span class="scale-label-item">30</span>
              <span class="scale-label-item">40+</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="result-actions">
            <button type="button" class="btn-secondary" id="btn-recalculate">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
              Edit Measurements
            </button>
            <a href="guide.html" class="btn-link-guide">
              Explore BMI Guide
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </div>

          <!-- Screening Disclaimer -->
          <div class="disclaimer-card">
            <svg class="disclaimer-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
            <p>
              <strong>Disclaimer:</strong> BMI is a screening measure, not a diagnosis. Adult BMI categories may not be appropriate for children, teenagers, pregnant people, or everyone with different body compositions.
            </p>
          </div>
        </div>
      </div>
    `;

    // Recalculate button handler
    const recalcBtn = document.getElementById('btn-recalculate');
    if (recalcBtn) {
      recalcBtn.addEventListener('click', () => {
        heightInput.focus();
        heightInput.select();
        window.scrollTo({ top: heightInput.getBoundingClientRect().top + window.scrollY - 100, behavior: 'smooth' });
      });
    }
  }

  function saveState(data) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Could not save calculation state:', e);
    }
  }

  function restoreSavedState() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);

      if (data.height) {
        heightInput.value = data.height;
      }
      if (data.heightUnit && data.heightUnit !== currentHeightUnit) {
        currentHeightUnit = data.heightUnit;
        heightUnitButtons.forEach(b => {
          const match = b.getAttribute('data-unit') === currentHeightUnit;
          b.classList.toggle('active', match);
          b.setAttribute('aria-pressed', match ? 'true' : 'false');
        });
      }

      if (data.weight) {
        weightInput.value = data.weight;
      }
      if (data.weightUnit && data.weightUnit !== currentWeightUnit) {
        currentWeightUnit = data.weightUnit;
        weightUnitButtons.forEach(b => {
          const match = b.getAttribute('data-unit') === currentWeightUnit;
          b.classList.toggle('active', match);
          b.setAttribute('aria-pressed', match ? 'true' : 'false');
        });
      }

      if (data.result && data.result.success) {
        renderResult(data.result);
      }
    } catch (e) {
      console.warn('Could not restore saved calculation state:', e);
    }
  }

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCalculator);
  } else {
    initCalculator();
  }
})();

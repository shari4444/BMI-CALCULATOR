/**
 * BMI-CAL: Calculator Controller (Adult & Child/Teen Modes)
 * 
 * Handles mode switching (Adult vs Child), interactive input validation, unit conversions (including feet & inches),
 * C/WebAssembly execution, child percentile calculations, and cross-page state persistence.
 */

(function () {
  'use strict';

  const STORAGE_KEY = 'bmical_saved_calc';

  // State
  let currentMode = 'adult'; // 'adult' | 'child'
  let currentHeightUnit = 'cm';
  let currentWeightUnit = 'kg';
  let currentChildSex = 'boy'; // 'boy' | 'girl'

  // DOM Elements
  let modeBtnAdult = null;
  let modeBtnChild = null;
  let childFieldsRow = null;
  let ageInput = null;
  let ageErrorEl = null;
  let ageRowEl = null;
  let sexButtons = [];

  let heightInput = null;
  let weightInput = null;
  let heightUnitButtons = [];
  let weightUnitButtons = [];
  let heightErrorEl = null;
  let weightErrorEl = null;
  let heightRowEl = null;
  let weightRowEl = null;
  let calculateBtn = null;
  let calcBtnText = null;
  let resultSection = null;

  function initCalculator() {
    modeBtnAdult = document.getElementById('mode-btn-adult');
    modeBtnChild = document.getElementById('mode-btn-child');
    childFieldsRow = document.getElementById('child-fields-row');
    ageInput = document.getElementById('age-input');
    ageErrorEl = document.getElementById('age-error');
    ageRowEl = document.getElementById('age-control-row');
    sexButtons = Array.from(document.querySelectorAll('[data-sex]'));

    heightInput = document.getElementById('height-input');
    weightInput = document.getElementById('weight-input');
    heightErrorEl = document.getElementById('height-error');
    weightErrorEl = document.getElementById('weight-error');
    heightRowEl = document.getElementById('height-control-row');
    weightRowEl = document.getElementById('weight-control-row');
    calculateBtn = document.getElementById('btn-calculate');
    calcBtnText = document.getElementById('calc-btn-text');
    resultSection = document.getElementById('result-section');

    if (!heightInput || !weightInput || !calculateBtn) {
      return;
    }

    heightUnitButtons = Array.from(document.querySelectorAll('[data-unit-group="height"]'));
    weightUnitButtons = Array.from(document.querySelectorAll('[data-unit-group="weight"]'));

    setupModeSwitcher();
    setupSexSelector();
    setupUnitSwitchers();
    setupInputEvents();
    setupCalculateAction();
    restoreSavedState();
  }

  function setupModeSwitcher() {
    if (!modeBtnAdult || !modeBtnChild) return;

    modeBtnAdult.addEventListener('click', () => setMode('adult'));
    modeBtnChild.addEventListener('click', () => setMode('child'));
  }

  function setMode(mode) {
    currentMode = mode;
    clearError('all');

    if (mode === 'adult') {
      modeBtnAdult.classList.add('active');
      modeBtnAdult.setAttribute('aria-selected', 'true');
      modeBtnChild.classList.remove('active');
      modeBtnChild.setAttribute('aria-selected', 'false');

      if (childFieldsRow) childFieldsRow.classList.add('hidden');
      if (calcBtnText) calcBtnText.textContent = 'Calculate BMI';
    } else {
      modeBtnChild.classList.add('active');
      modeBtnChild.setAttribute('aria-selected', 'true');
      modeBtnAdult.classList.remove('active');
      modeBtnAdult.setAttribute('aria-selected', 'false');

      if (childFieldsRow) childFieldsRow.classList.remove('hidden');
      if (calcBtnText) calcBtnText.textContent = 'Calculate Child Percentile';

      if (ageInput && !ageInput.value) {
        setTimeout(() => ageInput.focus(), 100);
      }
    }
  }

  function setupSexSelector() {
    sexButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const sex = btn.getAttribute('data-sex');
        currentChildSex = sex;
        sexButtons.forEach(b => {
          const match = b === btn;
          b.classList.toggle('active', match);
          b.setAttribute('aria-checked', match ? 'true' : 'false');
        });
      });
    });
  }

  function updateHeightPlaceholderAndMode(unit) {
    if (!heightInput) return;
    if (unit === 'ft') {
      heightInput.placeholder = "e.g. 5'7\"";
      heightInput.setAttribute('inputmode', 'text');
    } else if (unit === 'm') {
      heightInput.placeholder = "e.g. 1.70";
      heightInput.setAttribute('inputmode', 'decimal');
    } else if (unit === 'in') {
      heightInput.placeholder = "e.g. 67";
      heightInput.setAttribute('inputmode', 'decimal');
    } else {
      heightInput.placeholder = "e.g. 170";
      heightInput.setAttribute('inputmode', 'decimal');
    }
  }

  function setupUnitSwitchers() {
    // Height unit switching
    heightUnitButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetUnit = btn.getAttribute('data-unit');
        if (targetUnit === currentHeightUnit) return;

        const currentVal = heightInput.value.trim();

        if (targetUnit === 'ft') {
          if (currentVal && currentVal !== "'" && window.BmiEngine) {
            const converted = window.BmiEngine.convertHeightBetweenUnits(currentVal, currentHeightUnit, targetUnit);
            heightInput.value = converted || "'";
          } else {
            heightInput.value = "'";
          }

          setTimeout(() => {
            heightInput.focus();
            if (heightInput.value === "'") {
              heightInput.setSelectionRange(0, 0);
            }
          }, 50);

        } else {
          if (currentVal === "'") {
            heightInput.value = '';
          } else if (currentVal && window.BmiEngine) {
            const converted = window.BmiEngine.convertHeightBetweenUnits(currentVal, currentHeightUnit, targetUnit);
            if (converted) {
              heightInput.value = converted;
            }
          }
        }

        currentHeightUnit = targetUnit;
        updateHeightPlaceholderAndMode(currentHeightUnit);

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
    if (ageInput) {
      ageInput.addEventListener('input', () => clearError('age'));
    }

    heightInput.addEventListener('input', () => {
      clearError('height');

      if (currentHeightUnit === 'ft') {
        const val = heightInput.value;
        if (/^\d+$/.test(val)) {
          heightInput.value = val + "'";
        }
      }
    });

    heightInput.addEventListener('focus', () => {
      if (currentHeightUnit === 'ft' && (!heightInput.value || heightInput.value.trim() === '')) {
        heightInput.value = "'";
        heightInput.setSelectionRange(0, 0);
      }
    });

    weightInput.addEventListener('input', () => clearError('weight'));

    // Enter key submission
    [ageInput, heightInput, weightInput].filter(Boolean).forEach(input => {
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
    if (field === 'age') {
      if (ageErrorEl) {
        ageErrorEl.innerHTML = `
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
          <span>${message}</span>`;
      }
      if (ageRowEl) ageRowEl.classList.add('has-error');
      if (ageInput) ageInput.setAttribute('aria-invalid', 'true');
    } else if (field === 'height') {
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
    if (field === 'age' || field === 'all') {
      if (ageErrorEl) ageErrorEl.innerHTML = '';
      if (ageRowEl) ageRowEl.classList.remove('has-error');
      if (ageInput) ageInput.removeAttribute('aria-invalid');
    }
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

    if (!window.BmiEngine) {
      showError('height', 'Calculation engine is still initializing. Please wait a moment.');
      return;
    }

    const rawHeight = heightInput.value.trim();
    const rawWeight = weightInput.value.trim();

    if (currentMode === 'child') {
      const rawAge = ageInput ? ageInput.value.trim() : '';
      if (!rawAge) {
        showError('age', 'Please enter your child’s age (2 to 19 years).');
        if (ageInput) ageInput.focus();
        return;
      }

      const ageNum = parseFloat(rawAge);
      if (isNaN(ageNum) || ageNum < 2 || ageNum > 19) {
        showError('age', 'Age must be between 2 and 19 years.');
        if (ageInput) ageInput.focus();
        return;
      }

      if (!rawHeight || rawHeight === "'") {
        showError('height', currentHeightUnit === 'ft' 
          ? "Please enter height in feet and inches (e.g. 4'6\")." 
          : "Please enter height.");
        heightInput.focus();
        return;
      }

      if (!rawWeight) {
        showError('weight', 'Please enter weight.');
        weightInput.focus();
        return;
      }

      const result = window.BmiEngine.calculateChild(rawHeight, currentHeightUnit, rawWeight, currentWeightUnit, ageNum, currentChildSex);

      if (!result.success) {
        showError(result.field || 'height', result.error);
        return;
      }

      saveState({
        mode: 'child',
        age: rawAge,
        sex: currentChildSex,
        height: rawHeight,
        heightUnit: currentHeightUnit,
        weight: rawWeight,
        weightUnit: currentWeightUnit,
        result: result
      });

      renderChildResult(result);

    } else {
      // Adult Mode
      if (!rawHeight || rawHeight === "'") {
        showError('height', currentHeightUnit === 'ft' 
          ? "Please enter your height in feet and inches (e.g. 5'7\")." 
          : "Please enter your height.");
        heightInput.focus();
        return;
      }

      if (!rawWeight) {
        showError('weight', 'Please enter your weight.');
        weightInput.focus();
        return;
      }

      const result = window.BmiEngine.calculate(rawHeight, currentHeightUnit, rawWeight, currentWeightUnit);

      if (!result.success) {
        showError(result.field || 'height', result.error);
        return;
      }

      saveState({
        mode: 'adult',
        height: rawHeight,
        heightUnit: currentHeightUnit,
        weight: rawWeight,
        weightUnit: currentWeightUnit,
        result: result
      });

      renderAdultResult(result);
    }

    if (resultSection) {
      resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function renderAdultResult(result) {
    if (!resultSection) return;
    const cat = result.category;

    resultSection.innerHTML = `
      <div class="result-container" role="region" aria-live="polite" aria-label="Adult BMI Result">
        <div class="card-glass result-card">
          <div class="result-top-bar">
            <span class="result-eyebrow">YOUR BMI (ADULT)</span>
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

          <!-- 4-Segment Horizontal Adult BMI Scale -->
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
              Explore Adult BMI Guide
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

    const recalcBtn = document.getElementById('btn-recalculate');
    if (recalcBtn) {
      recalcBtn.addEventListener('click', () => {
        heightInput.focus();
        heightInput.select();
      });
    }
  }

  function renderChildResult(result) {
    if (!resultSection) return;
    const cat = result.category;
    const sexDisplay = result.sex === 'girl' ? 'girl' : 'boy';

    resultSection.innerHTML = `
      <div class="result-container" role="region" aria-live="polite" aria-label="Child BMI Percentile Result">
        <div class="card-glass result-card">
          <div class="result-top-bar">
            <span class="result-eyebrow">CHILD &amp; TEEN RESULT (CDC)</span>
            <span class="category-pill ${cat.badgeClass}">
              <span class="category-bullet" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${cat.color};"></span>
              ${cat.name}
            </span>
          </div>

          <div class="bmi-number-display" aria-label="BMI score ${result.bmiFormatted}">
            ${result.bmiFormatted}
          </div>

          <div class="child-percentile-highlight">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
            <span><strong>${result.percentileOrdinal} Percentile</strong> &bull; ${result.age}-year-old ${sexDisplay}</span>
          </div>

          <h3 class="bmi-category-heading">${cat.name}</h3>
          <p class="result-explanation">
            A BMI of <strong>${result.bmiFormatted}</strong> places this child in the <strong>${result.percentileOrdinal} percentile</strong> for ${result.age}-year-old ${sexDisplay}s based on CDC pediatric growth curves.
          </p>

          <!-- 4-Segment Child Percentile Scale (0 to 100%) -->
          <div class="bmi-scale-wrapper" aria-hidden="true">
            <div class="bmi-scale-bar">
              <div class="scale-segment child-seg-underweight" title="Underweight: < 5th percentile"></div>
              <div class="scale-segment child-seg-healthy" title="Healthy weight: 5th to < 85th percentile"></div>
              <div class="scale-segment child-seg-overweight" title="Overweight: 85th to < 95th percentile"></div>
              <div class="scale-segment child-seg-obesity" title="Obesity: ≥ 95th percentile"></div>
            </div>

            <!-- Position Marker Indicator -->
            <div class="scale-marker-container">
              <div class="scale-marker" style="left: ${result.scalePercent}%;">
                <div class="marker-arrow"></div>
                <div class="marker-tag">${result.percentileOrdinal} %ile</div>
              </div>
            </div>

            <div class="scale-labels">
              <span class="scale-label-item">0%</span>
              <span class="scale-label-item">5th %ile</span>
              <span class="scale-label-item">50th</span>
              <span class="scale-label-item">85th</span>
              <span class="scale-label-item">95th</span>
              <span class="scale-label-item">100%</span>
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
            <a href="guide.html?tab=child" class="btn-link-guide">
              Explore Children’s BMI Guide
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </div>

          <!-- Pediatric Screening Disclaimer -->
          <div class="disclaimer-card">
            <svg class="disclaimer-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
            </svg>
            <p>
              <strong>Pediatric Notice:</strong> For children and teens, BMI is evaluated as an age- and sex-specific percentile against CDC growth charts. Percentiles screen for weight patterns during growth and development, but do not provide medical diagnoses. Consult a pediatrician for comprehensive assessments.
            </p>
          </div>
        </div>
      </div>
    `;

    const recalcBtn = document.getElementById('btn-recalculate');
    if (recalcBtn) {
      recalcBtn.addEventListener('click', () => {
        if (ageInput) ageInput.focus();
        else heightInput.focus();
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

      if (data.mode) {
        setMode(data.mode);
      }
      if (data.age && ageInput) {
        ageInput.value = data.age;
      }
      if (data.sex) {
        currentChildSex = data.sex;
        sexButtons.forEach(b => {
          const match = b.getAttribute('data-sex') === currentChildSex;
          b.classList.toggle('active', match);
          b.setAttribute('aria-checked', match ? 'true' : 'false');
        });
      }

      if (data.height) {
        heightInput.value = data.height;
      }
      if (data.heightUnit && data.heightUnit !== currentHeightUnit) {
        currentHeightUnit = data.heightUnit;
        updateHeightPlaceholderAndMode(currentHeightUnit);
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
        if (data.mode === 'child') {
          renderChildResult(data.result);
        } else {
          renderAdultResult(data.result);
        }
      }
    } catch (e) {
      console.warn('Could not restore saved calculation state:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCalculator);
  } else {
    initCalculator();
  }
})();

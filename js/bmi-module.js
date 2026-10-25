/**
 * BMI-CAL JavaScript Bridge for C Calculation Module
 * 
 * Communicates with the compiled C WebAssembly module (c/bmi.c -> wasm/bmi.wasm).
 * Manages unit conversions, input validation, category classification,
 * and provides accurate metadata for the UI.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../wasm/bmi.js'));
  } else {
    root.BmiEngine = factory(root.BmiWasm);
  }
}(typeof self !== 'undefined' ? self : this, function (BmiWasm) {
  'use strict';

  // Constants aligned with c/bmi.h
  const UNITS = {
    HEIGHT: { M: 0, CM: 1, IN: 2 },
    WEIGHT: { KG: 0, LBS: 1 }
  };

  const CATEGORIES = [
    {
      code: 0,
      id: 'underweight',
      name: 'Underweight',
      rangeDisplay: '< 18.5',
      minBmi: 0,
      maxBmi: 18.5,
      color: '#9EC5FF',
      gradient: 'linear-gradient(135deg, #9EC5FF 0%, #DDA9E8 100%)',
      badgeClass: 'badge-underweight',
      explanation: 'Your BMI indicates you may be below the standard healthy weight range for adults of your height.',
      advice: 'Consider consulting a healthcare provider to explore balanced nutrition and supportive weight-gain strategies.'
    },
    {
      code: 1,
      id: 'healthy',
      name: 'Healthy weight',
      rangeDisplay: '18.5 – 24.9',
      minBmi: 18.5,
      maxBmi: 25.0,
      color: '#A8EFC4',
      gradient: 'linear-gradient(135deg, #A8EFC4 0%, #E0EDA0 100%)',
      badgeClass: 'badge-healthy',
      explanation: 'Your BMI is within the standard healthy weight range for adults of your height.',
      advice: 'Maintain your current lifestyle with a balanced diet, adequate hydration, and regular physical activity.'
    },
    {
      code: 2,
      id: 'overweight',
      name: 'Overweight',
      rangeDisplay: '25.0 – 29.9',
      minBmi: 25.0,
      maxBmi: 30.0,
      color: '#FFB66E',
      gradient: 'linear-gradient(135deg, #FFB66E 0%, #F5A5C2 100%)',
      badgeClass: 'badge-overweight',
      explanation: 'Your BMI is above the standard healthy weight range for adults of your height.',
      advice: 'Focus on heart-healthy nutrition, daily physical movement, and consulting a healthcare professional for guidance.'
    },
    {
      code: 3,
      id: 'obesity',
      name: 'Obesity',
      rangeDisplay: '≥ 30.0',
      minBmi: 30.0,
      maxBmi: 100.0,
      color: '#F5A5C2',
      gradient: 'linear-gradient(135deg, #F5A5C2 0%, #FFB66E 100%)',
      badgeClass: 'badge-obesity',
      explanation: 'Your BMI is in the obesity category for adults of your height.',
      advice: 'We encourage speaking with a licensed healthcare professional to evaluate your overall health profile.'
    }
  ];

  let wasmExports = null;
  let isWasmActive = false;
  let initializationPromise = null;

  async function init() {
    if (initializationPromise) return initializationPromise;

    initializationPromise = (async () => {
      try {
        if (BmiWasm && typeof BmiWasm.loadModule === 'function') {
          wasmExports = await BmiWasm.loadModule();
          isWasmActive = true;
          console.info('BMI-CAL: C calculation module (WebAssembly) initialized successfully.');
          return true;
        }
      } catch (err) {
        console.warn('BMI-CAL: WebAssembly compilation module unavailable; fallback active.', err);
        isWasmActive = false;
      }
      return false;
    })();

    return initializationPromise;
  }

  /**
   * Converts height value to metres.
   */
  function convertHeightToMetres(value, unit) {
    const val = parseFloat(value);
    if (!Number.isFinite(val) || val <= 0) return -1.0;

    let unitCode = UNITS.HEIGHT.CM;
    if (unit === 'm') unitCode = UNITS.HEIGHT.M;
    else if (unit === 'cm') unitCode = UNITS.HEIGHT.CM;
    else if (unit === 'in') unitCode = UNITS.HEIGHT.IN;

    if (isWasmActive && wasmExports && typeof wasmExports.convert_height_to_metres === 'function') {
      return wasmExports.convert_height_to_metres(val, unitCode);
    }

    // Direct C formula mirror
    if (unitCode === UNITS.HEIGHT.M) return val;
    if (unitCode === UNITS.HEIGHT.CM) return val * 0.01;
    if (unitCode === UNITS.HEIGHT.IN) return val * 0.0254;
    return -1.0;
  }

  /**
   * Converts weight value to kilograms.
   */
  function convertWeightToKg(value, unit) {
    const val = parseFloat(value);
    if (!Number.isFinite(val) || val <= 0) return -1.0;

    let unitCode = UNITS.WEIGHT.KG;
    if (unit === 'kg') unitCode = UNITS.WEIGHT.KG;
    else if (unit === 'lbs') unitCode = UNITS.WEIGHT.LBS;

    if (isWasmActive && wasmExports && typeof wasmExports.convert_weight_to_kg === 'function') {
      return wasmExports.convert_weight_to_kg(val, unitCode);
    }

    // Direct C formula mirror
    if (unitCode === UNITS.WEIGHT.KG) return val;
    if (unitCode === UNITS.WEIGHT.LBS) return val * 0.45359237;
    return -1.0;
  }

  /**
   * Converts a height measurement between display units.
   * Preserves exact physical quantity.
   */
  function convertHeightBetweenUnits(value, fromUnit, toUnit) {
    const num = parseFloat(value);
    if (!Number.isFinite(num) || num <= 0) return '';

    const metres = convertHeightToMetres(num, fromUnit);
    if (metres <= 0) return '';

    let converted = metres;
    if (toUnit === 'm') {
      converted = metres;
      return Number(converted.toFixed(3)).toString();
    } else if (toUnit === 'cm') {
      converted = metres / 0.01;
      return Number(converted.toFixed(1)).toString();
    } else if (toUnit === 'in') {
      converted = metres / 0.0254;
      return Number(converted.toFixed(1)).toString();
    }
    return value;
  }

  /**
   * Converts a weight measurement between display units.
   * Preserves exact physical quantity.
   */
  function convertWeightBetweenUnits(value, fromUnit, toUnit) {
    const num = parseFloat(value);
    if (!Number.isFinite(num) || num <= 0) return '';

    const kg = convertWeightToKg(num, fromUnit);
    if (kg <= 0) return '';

    let converted = kg;
    if (toUnit === 'kg') {
      converted = kg;
      return Number(converted.toFixed(1)).toString();
    } else if (toUnit === 'lbs') {
      converted = kg / 0.45359237;
      return Number(converted.toFixed(1)).toString();
    }
    return value;
  }

  /**
   * Core BMI calculation and classification.
   * Validates values, converts to standard SI units (m, kg), and calls C calculation module.
   */
  function calculate(heightValue, heightUnit, weightValue, weightUnit) {
    const heightNum = parseFloat(heightValue);
    const weightNum = parseFloat(weightValue);

    // Validation checks
    if (!Number.isFinite(heightNum) || heightNum <= 0) {
      return { success: false, error: 'Please enter a valid, positive height measurement.', field: 'height' };
    }
    if (!Number.isFinite(weightNum) || weightNum <= 0) {
      return { success: false, error: 'Please enter a valid, positive weight measurement.', field: 'weight' };
    }

    const heightMetres = convertHeightToMetres(heightNum, heightUnit);
    const weightKg = convertWeightToKg(weightNum, weightUnit);

    // Physiological bounds
    if (heightMetres < 0.4 || heightMetres > 3.0) {
      return {
        success: false,
        error: `Height (${heightNum} ${heightUnit}) is outside the realistic human range (0.4 m to 3.0 m).`,
        field: 'height'
      };
    }

    if (weightKg < 5.0 || weightKg > 700.0) {
      return {
        success: false,
        error: `Weight (${weightNum} ${weightUnit}) is outside the realistic human range (5 kg to 700 kg).`,
        field: 'weight'
      };
    }

    let bmi = -1.0;
    let categoryCode = -1;

    // Call compiled C WebAssembly function
    if (isWasmActive && wasmExports && typeof wasmExports.calculate_bmi === 'function') {
      bmi = wasmExports.calculate_bmi(heightMetres, weightKg);
      if (typeof wasmExports.classify_bmi === 'function') {
        categoryCode = wasmExports.classify_bmi(bmi);
      }
    } else {
      // Direct C formula mirror
      bmi = weightKg / (heightMetres * heightMetres);
      if (bmi < 18.5) categoryCode = 0;
      else if (bmi < 25.0) categoryCode = 1;
      else if (bmi < 30.0) categoryCode = 2;
      else categoryCode = 3;
    }

    if (!Number.isFinite(bmi) || bmi <= 0.0) {
      return { success: false, error: 'Calculation failed due to invalid measurement values.' };
    }

    // Category lookup
    const category = CATEGORIES[categoryCode] || CATEGORIES[1];

    // Compute position on a standard 10–40 visual BMI scale for the indicator marker
    // 10 is 0%, 40 is 100%
    const scaleMin = 10;
    const scaleMax = 40;
    let clampedBmi = Math.max(scaleMin, Math.min(scaleMax, bmi));
    let scalePercent = ((clampedBmi - scaleMin) / (scaleMax - scaleMin)) * 100;
    scalePercent = Math.max(2, Math.min(98, scalePercent)); // Keep within visible bounds

    return {
      success: true,
      bmi: bmi, // Unrounded BMI used for classification
      bmiFormatted: bmi.toFixed(1), // Rounded to one decimal place for display
      category: category,
      heightInput: heightNum,
      heightUnit: heightUnit,
      heightMetres: heightMetres,
      weightInput: weightNum,
      weightUnit: weightUnit,
      weightKg: weightKg,
      scalePercent: scalePercent,
      engine: isWasmActive ? 'WebAssembly (Compiled C Module)' : 'C Formula (Direct)'
    };
  }

  return {
    init,
    calculate,
    convertHeightBetweenUnits,
    convertWeightBetweenUnits,
    convertHeightToMetres,
    convertWeightToKg,
    getCategories: () => CATEGORIES,
    isWasmReady: () => isWasmActive,
    getEngineStatus: () => ({
      name: isWasmActive ? 'WebAssembly (Compiled C Module)' : 'C Backend Bridge',
      active: isWasmActive,
      source: 'c/bmi.c',
      target: 'wasm/bmi.wasm'
    })
  };
}));

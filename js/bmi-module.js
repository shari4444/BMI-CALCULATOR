/**
 * BMI-CAL JavaScript Bridge for C Calculation Module
 * 
 * Supports both Adult BMI calculation and Child & Teen BMI percentile calculation (CDC Growth Charts).
 * Communicates with the compiled C WebAssembly module (c/bmi.c -> wasm/bmi.wasm).
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
    HEIGHT: { M: 0, CM: 1, IN: 2, FT: 3 },
    WEIGHT: { KG: 0, LBS: 1 }
  };

  const SEX = {
    BOY: 0,
    GIRL: 1
  };

  // Adult BMI Categories
  const ADULT_CATEGORIES = [
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

  // Child & Teen BMI Percentile Categories (CDC / AAP)
  const CHILD_CATEGORIES = [
    {
      code: 0,
      id: 'underweight',
      name: 'Underweight',
      rangeDisplay: '< 5th percentile',
      minPct: 0,
      maxPct: 5,
      color: '#9EC5FF',
      gradient: 'linear-gradient(135deg, #9EC5FF 0%, #DDA9E8 100%)',
      badgeClass: 'badge-underweight',
      explanation: 'BMI is below the 5th percentile for children of the same age and biological sex.',
      advice: 'We recommend discussing overall growth, nutritional intake, and activity with your pediatrician.'
    },
    {
      code: 1,
      id: 'healthy',
      name: 'Healthy weight',
      rangeDisplay: '5th to < 85th percentile',
      minPct: 5,
      maxPct: 85,
      color: '#A8EFC4',
      gradient: 'linear-gradient(135deg, #A8EFC4 0%, #E0EDA0 100%)',
      badgeClass: 'badge-healthy',
      explanation: 'BMI is in the healthy percentile range for children of the same age and biological sex.',
      advice: 'Encourage active play, wholesome family meals, and consistent sleep to support continued growth.'
    },
    {
      code: 2,
      id: 'overweight',
      name: 'Overweight',
      rangeDisplay: '85th to < 95th percentile',
      minPct: 85,
      maxPct: 95,
      color: '#FFB66E',
      gradient: 'linear-gradient(135deg, #FFB66E 0%, #F5A5C2 100%)',
      badgeClass: 'badge-overweight',
      explanation: 'BMI is between the 85th and 95th percentiles for children of the same age and biological sex.',
      advice: 'Focus on nourishing whole foods and active family routines without restrictive dieting.'
    },
    {
      code: 3,
      id: 'obesity',
      name: 'Obesity',
      rangeDisplay: '≥ 95th percentile',
      minPct: 95,
      maxPct: 100,
      color: '#F5A5C2',
      gradient: 'linear-gradient(135deg, #F5A5C2 0%, #FFB66E 100%)',
      badgeClass: 'badge-obesity',
      explanation: 'BMI is at or above the 95th percentile for children of the same age and biological sex.',
      advice: 'A pediatrician can evaluate your child’s individualized growth curve and family wellness plan.'
    }
  ];

  // CDC Growth Chart Cutoffs Reference Table for JS fallback mirror
  const CDC_BOYS = [
    { p5: 14.7, p50: 16.5, p85: 18.2, p95: 19.3 }, // Age 2
    { p5: 14.3, p50: 15.9, p85: 17.4, p95: 18.3 }, // Age 3
    { p5: 14.0, p50: 15.4, p85: 16.9, p95: 17.8 }, // Age 4
    { p5: 13.8, p50: 15.3, p85: 16.8, p95: 17.9 }, // Age 5
    { p5: 13.7, p50: 15.3, p85: 17.0, p95: 18.4 }, // Age 6
    { p5: 13.7, p50: 15.5, p85: 17.4, p95: 19.1 }, // Age 7
    { p5: 13.8, p50: 15.8, p85: 18.0, p95: 20.0 }, // Age 8
    { p5: 14.0, p50: 16.2, p85: 18.6, p95: 21.0 }, // Age 9
    { p5: 14.2, p50: 16.6, p85: 19.4, p95: 22.1 }, // Age 10
    { p5: 14.6, p50: 17.2, p85: 20.2, p95: 23.2 }, // Age 11
    { p5: 15.0, p50: 17.8, p85: 21.0, p95: 24.2 }, // Age 12
    { p5: 15.5, p50: 18.5, p85: 21.9, p95: 25.2 }, // Age 13
    { p5: 16.0, p50: 19.2, p85: 22.7, p95: 26.0 }, // Age 14
    { p5: 16.6, p50: 19.9, p85: 23.5, p95: 26.8 }, // Age 15
    { p5: 17.1, p50: 20.5, p85: 24.2, p95: 27.5 }, // Age 16
    { p5: 17.7, p50: 21.1, p85: 24.9, p95: 28.2 }, // Age 17
    { p5: 18.2, p50: 21.7, p85: 25.6, p95: 28.9 }, // Age 18
    { p5: 18.7, p50: 22.2, p85: 26.3, p95: 29.7 }  // Age 19
  ];

  const CDC_GIRLS = [
    { p5: 14.4, p50: 16.2, p85: 18.0, p95: 19.1 }, // Age 2
    { p5: 14.0, p50: 15.6, p85: 17.2, p95: 18.3 }, // Age 3
    { p5: 13.7, p50: 15.2, p85: 16.8, p95: 18.0 }, // Age 4
    { p5: 13.5, p50: 15.2, p85: 16.8, p95: 18.2 }, // Age 5
    { p5: 13.4, p50: 15.3, p85: 17.1, p95: 18.8 }, // Age 6
    { p5: 13.4, p50: 15.5, p85: 17.6, p95: 19.6 }, // Age 7
    { p5: 13.6, p50: 15.9, p85: 18.3, p95: 20.6 }, // Age 8
    { p5: 13.8, p50: 16.3, p85: 19.1, p95: 21.7 }, // Age 9
    { p5: 14.0, p50: 16.8, p85: 19.9, p95: 22.9 }, // Age 10
    { p5: 14.4, p50: 17.4, p85: 20.8, p95: 24.1 }, // Age 11
    { p5: 14.8, p50: 18.0, p85: 21.7, p95: 25.2 }, // Age 12
    { p5: 15.3, p50: 18.7, p85: 22.5, p95: 26.2 }, // Age 13
    { p5: 15.8, p50: 19.3, p85: 23.3, p95: 27.2 }, // Age 14
    { p5: 16.3, p50: 19.8, p85: 24.0, p95: 28.0 }, // Age 15
    { p5: 16.8, p50: 20.2, p85: 24.5, p95: 28.6 }, // Age 16
    { p5: 17.2, p50: 20.6, p85: 25.0, p95: 29.1 }, // Age 17
    { p5: 17.5, p50: 20.8, p85: 25.4, p95: 29.5 }, // Age 18
    { p5: 17.8, p50: 21.1, p85: 25.7, p95: 29.9 }  // Age 19
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
   * Helper to format numbers with ordinal suffix (e.g. 50th, 85th, 3rd, 1st)
   */
  function toOrdinal(n) {
    const num = Math.round(n);
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return `${num}st`;
    if (j === 2 && k !== 12) return `${num}nd`;
    if (j === 3 && k !== 13) return `${num}rd`;
    return `${num}th`;
  }

  /**
   * Parses feet and inches string into numerical breakdown and total inches.
   */
  function parseFeetInches(value) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') {
      if (!Number.isFinite(value) || value <= 0) return null;
      return { feet: value, inches: 0, totalInches: value * 12, decimalFeet: value };
    }

    const str = String(value).trim();
    if (!str || str === "'") return null;

    if (str.includes("'") || str.includes("’") || str.includes("′")) {
      const clean = str.replace(/[’′]/g, "'").replace(/[”″"]/g, "");
      const parts = clean.split("'");
      const feetPart = parts[0].trim();
      const inchPart = parts.length > 1 ? parts[1].trim() : "";

      const feet = feetPart ? parseFloat(feetPart) : 0;
      const inches = inchPart ? parseFloat(inchPart) : 0;

      if (isNaN(feet) || isNaN(inches)) return null;
      const totalInches = (feet * 12) + inches;
      if (totalInches <= 0) return null;
      return { feet, inches, totalInches, decimalFeet: totalInches / 12 };
    }

    const ftMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:ft|feet)/i);
    const inMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:in|inches|")/i);
    if (ftMatch || inMatch) {
      const feet = ftMatch ? parseFloat(ftMatch[1]) : 0;
      const inches = inMatch ? parseFloat(inMatch[1]) : 0;
      const totalInches = (feet * 12) + inches;
      if (totalInches <= 0) return null;
      return { feet, inches, totalInches, decimalFeet: totalInches / 12 };
    }

    const num = parseFloat(str);
    if (Number.isFinite(num) && num > 0) {
      return { feet: num, inches: 0, totalInches: num * 12, decimalFeet: num };
    }

    return null;
  }

  /**
   * Converts height value to metres.
   */
  function convertHeightToMetres(value, unit) {
    if (unit === 'ft') {
      const parsed = parseFeetInches(value);
      if (!parsed) return -1.0;
      if (isWasmActive && wasmExports && typeof wasmExports.convert_height_to_metres === 'function') {
        return wasmExports.convert_height_to_metres(parsed.decimalFeet, UNITS.HEIGHT.FT);
      }
      return parsed.totalInches * 0.0254;
    }

    const val = parseFloat(value);
    if (!Number.isFinite(val) || val <= 0) return -1.0;

    let unitCode = UNITS.HEIGHT.CM;
    if (unit === 'm') unitCode = UNITS.HEIGHT.M;
    else if (unit === 'cm') unitCode = UNITS.HEIGHT.CM;
    else if (unit === 'in') unitCode = UNITS.HEIGHT.IN;

    if (isWasmActive && wasmExports && typeof wasmExports.convert_height_to_metres === 'function') {
      return wasmExports.convert_height_to_metres(val, unitCode);
    }

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

    if (unitCode === UNITS.WEIGHT.KG) return val;
    if (unitCode === UNITS.WEIGHT.LBS) return val * 0.45359237;
    return -1.0;
  }

  /**
   * Converts a height measurement between display units.
   */
  function convertHeightBetweenUnits(value, fromUnit, toUnit) {
    if (!value || value === "'") return '';

    const metres = convertHeightToMetres(value, fromUnit);
    if (metres <= 0) return '';

    if (toUnit === 'm') {
      return Number(metres.toFixed(3)).toString();
    } else if (toUnit === 'cm') {
      return Number((metres / 0.01).toFixed(1)).toString();
    } else if (toUnit === 'in') {
      return Number((metres / 0.0254).toFixed(1)).toString();
    } else if (toUnit === 'ft') {
      const totalInches = metres / 0.0254;
      let feet = Math.floor(totalInches / 12);
      let inches = Math.round(totalInches % 12);
      if (inches >= 12) {
        feet += 1;
        inches = 0;
      }
      return `${feet}'${inches}"`;
    }
    return value;
  }

  /**
   * Converts a weight measurement between display units.
   */
  function convertWeightBetweenUnits(value, fromUnit, toUnit) {
    const num = parseFloat(value);
    if (!Number.isFinite(num) || num <= 0) return '';

    const kg = convertWeightToKg(num, fromUnit);
    if (kg <= 0) return '';

    if (toUnit === 'kg') {
      return Number(kg.toFixed(1)).toString();
    } else if (toUnit === 'lbs') {
      return Number((kg / 0.45359237).toFixed(1)).toString();
    }
    return value;
  }

  /**
   * CDC percentile calculation helper for JS fallback
   */
  function calculateChildPercentileJs(bmi, ageYears, sexCode) {
    const table = (sexCode === SEX.GIRL) ? CDC_GIRLS : CDC_BOYS;
    let cutoffs;
    if (ageYears <= 2.0) {
      cutoffs = table[0];
    } else if (ageYears >= 19.0) {
      cutoffs = table[17];
    } else {
      const lowerAge = Math.floor(ageYears);
      const idx = lowerAge - 2;
      const frac = ageYears - lowerAge;
      cutoffs = {
        p5: table[idx].p5 + frac * (table[idx + 1].p5 - table[idx].p5),
        p50: table[idx].p50 + frac * (table[idx + 1].p50 - table[idx].p50),
        p85: table[idx].p85 + frac * (table[idx + 1].p85 - table[idx].p85),
        p95: table[idx].p95 + frac * (table[idx + 1].p95 - table[idx].p95)
      };
    }

    if (bmi < cutoffs.p5) {
      const minBmi = cutoffs.p5 - 4.0;
      if (bmi <= minBmi) return 0.5;
      const pct = 5.0 * ((bmi - minBmi) / (cutoffs.p5 - minBmi));
      return Math.max(0.5, pct);
    } else if (bmi < cutoffs.p50) {
      return 5.0 + 45.0 * ((bmi - cutoffs.p5) / (cutoffs.p50 - cutoffs.p5));
    } else if (bmi < cutoffs.p85) {
      return 50.0 + 35.0 * ((bmi - cutoffs.p50) / (cutoffs.p85 - cutoffs.p50));
    } else if (bmi < cutoffs.p95) {
      return 85.0 + 10.0 * ((bmi - cutoffs.p85) / (cutoffs.p95 - cutoffs.p85));
    } else {
      const excess = Math.min(1.0, (bmi - cutoffs.p95) / (cutoffs.p95 * 0.25));
      return Math.min(99.9, 95.0 + 4.5 * excess);
    }
  }

  /**
   * Adult BMI calculation and classification.
   */
  function calculate(heightValue, heightUnit, weightValue, weightUnit) {
    const heightMetres = convertHeightToMetres(heightValue, heightUnit);
    const weightKg = convertWeightToKg(weightValue, weightUnit);

    if (heightMetres <= 0) {
      const msg = heightUnit === 'ft' 
        ? "Please enter your height in feet and inches (e.g. 5'7\")."
        : "Please enter a valid, positive height measurement.";
      return { success: false, error: msg, field: 'height' };
    }

    if (weightKg <= 0) {
      return { success: false, error: 'Please enter a valid, positive weight measurement.', field: 'weight' };
    }

    if (heightMetres < 0.4 || heightMetres > 3.0) {
      return {
        success: false,
        error: `Height (${heightValue} ${heightUnit}) is outside the realistic adult range (0.4 m to 3.0 m).`,
        field: 'height'
      };
    }

    if (weightKg < 5.0 || weightKg > 700.0) {
      return {
        success: false,
        error: `Weight (${weightValue} ${weightUnit}) is outside the realistic adult range (5 kg to 700 kg).`,
        field: 'weight'
      };
    }

    let bmi = -1.0;
    let categoryCode = -1;

    if (isWasmActive && wasmExports && typeof wasmExports.calculate_bmi === 'function') {
      bmi = wasmExports.calculate_bmi(heightMetres, weightKg);
      if (typeof wasmExports.classify_bmi === 'function') {
        categoryCode = wasmExports.classify_bmi(bmi);
      }
    } else {
      bmi = weightKg / (heightMetres * heightMetres);
      if (bmi < 18.5) categoryCode = 0;
      else if (bmi < 25.0) categoryCode = 1;
      else if (bmi < 30.0) categoryCode = 2;
      else categoryCode = 3;
    }

    if (!Number.isFinite(bmi) || bmi <= 0.0) {
      return { success: false, error: 'Calculation failed due to invalid measurement values.' };
    }

    const category = ADULT_CATEGORIES[categoryCode] || ADULT_CATEGORIES[1];

    const scaleMin = 10;
    const scaleMax = 40;
    let clampedBmi = Math.max(scaleMin, Math.min(scaleMax, bmi));
    let scalePercent = ((clampedBmi - scaleMin) / (scaleMax - scaleMin)) * 100;
    scalePercent = Math.max(2, Math.min(98, scalePercent));

    return {
      success: true,
      mode: 'adult',
      bmi: bmi,
      bmiFormatted: bmi.toFixed(1),
      category: category,
      heightInput: heightValue,
      heightUnit: heightUnit,
      heightMetres: heightMetres,
      weightInput: weightValue,
      weightUnit: weightUnit,
      weightKg: weightKg,
      scalePercent: scalePercent,
      engine: isWasmActive ? 'WebAssembly (Compiled C Module)' : 'C Formula (Direct)'
    };
  }

  /**
   * Child & Teen BMI & Percentile Calculation (CDC Growth Charts, Ages 2 to 19)
   */
  function calculateChild(heightValue, heightUnit, weightValue, weightUnit, ageValue, sexValue) {
    const ageNum = parseFloat(ageValue);
    if (!Number.isFinite(ageNum) || ageNum < 2.0 || ageNum > 19.99) {
      return {
        success: false,
        error: "Please enter an age between 2 and 19 years for child & teen mode.",
        field: 'age'
      };
    }

    const sexCode = (sexValue === 'girl' || sexValue === 1) ? SEX.GIRL : SEX.BOY;
    const sexLabel = (sexCode === SEX.GIRL) ? 'girl' : 'boy';

    const heightMetres = convertHeightToMetres(heightValue, heightUnit);
    const weightKg = convertWeightToKg(weightValue, weightUnit);

    if (heightMetres <= 0) {
      const msg = heightUnit === 'ft' 
        ? "Please enter height in feet and inches (e.g. 4'2\")."
        : "Please enter a valid, positive height measurement.";
      return { success: false, error: msg, field: 'height' };
    }

    if (weightKg <= 0) {
      return { success: false, error: "Please enter a valid, positive weight measurement.", field: 'weight' };
    }

    // Physiological bounds for children ages 2-19
    if (heightMetres < 0.5 || heightMetres > 2.5) {
      return {
        success: false,
        error: `Height (${heightValue} ${heightUnit}) is outside the normal pediatric range (0.5 m to 2.5 m).`,
        field: 'height'
      };
    }

    if (weightKg < 4.0 || weightKg > 300.0) {
      return {
        success: false,
        error: `Weight (${weightValue} ${weightUnit}) is outside the normal pediatric range (4 kg to 300 kg).`,
        field: 'weight'
      };
    }

    // Calculate raw BMI
    let bmi = -1.0;
    if (isWasmActive && wasmExports && typeof wasmExports.calculate_bmi === 'function') {
      bmi = wasmExports.calculate_bmi(heightMetres, weightKg);
    } else {
      bmi = weightKg / (heightMetres * heightMetres);
    }

    if (!Number.isFinite(bmi) || bmi <= 0.0) {
      return { success: false, error: "Calculation failed due to invalid measurement values." };
    }

    // Calculate CDC Percentile
    let percentile = calculateChildPercentileJs(bmi, ageNum, sexCode);
    let categoryCode = 1;

    if (percentile < 5.0) categoryCode = 0;
    else if (percentile < 85.0) categoryCode = 1;
    else if (percentile < 95.0) categoryCode = 2;
    else categoryCode = 3;

    const category = CHILD_CATEGORIES[categoryCode];
    const roundedAge = Math.round(ageNum);
    const ordinalPercentile = toOrdinal(percentile);

    return {
      success: true,
      mode: 'child',
      bmi: bmi,
      bmiFormatted: bmi.toFixed(1),
      percentile: percentile,
      percentileFormatted: Math.round(percentile).toString(),
      percentileOrdinal: ordinalPercentile,
      age: roundedAge,
      sex: sexLabel,
      sexCode: sexCode,
      category: category,
      heightInput: heightValue,
      heightUnit: heightUnit,
      heightMetres: heightMetres,
      weightInput: weightValue,
      weightUnit: weightUnit,
      weightKg: weightKg,
      // For children, the scale marker directly follows the 0th to 100th percentile!
      scalePercent: Math.max(2, Math.min(98, percentile)),
      engine: isWasmActive ? 'WebAssembly (Compiled C Module)' : 'C Formula & CDC Tables'
    };
  }

  return {
    init,
    calculate,
    calculateChild,
    convertHeightBetweenUnits,
    convertWeightBetweenUnits,
    convertHeightToMetres,
    convertWeightToKg,
    parseFeetInches,
    getAdultCategories: () => ADULT_CATEGORIES,
    getChildCategories: () => CHILD_CATEGORIES,
    isWasmReady: () => isWasmActive,
    getEngineStatus: () => ({
      name: isWasmActive ? 'WebAssembly (Compiled C Module)' : 'C Backend Bridge',
      active: isWasmActive,
      source: 'c/bmi.c',
      target: 'wasm/bmi.wasm'
    })
  };
}));

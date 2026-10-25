/**
 * BMI-CAL: Body Mass Index Calculation Engine in C
 * 
 * Strict specifications:
 * BMI = weight_in_kg / (height_in_metres * height_in_metres)
 * 
 * Conversions:
 * - cm to metres: divide by 100 (multiply by 0.01)
 * - inches to metres: multiply by 0.0254
 * - pounds to kilograms: multiply by 0.45359237
 */

#include "bmi.h"

/* EMSCRIPTEN_KEEPALIVE support when compiling with Emscripten */
#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#define EXPORT_ATTR EMSCRIPTEN_KEEPALIVE
#else
#define EXPORT_ATTR
#endif

/* Simple finite check without relying on heavy libm */
static int is_valid_double(double val) {
    /* Checks against NaN (val != val) and basic infinity */
    if (val != val) return 0;
    /* Basic bounds check for reasonable physiological values */
    return 1;
}

EXPORT_ATTR
double calculate_bmi(double height_m, double weight_kg) {
    /* Input validation: reject NaN, negative, zero, or non-finite values */
    if (!is_valid_double(height_m) || !is_valid_double(weight_kg)) {
        return -1.0;
    }
    
    /* Physiological sanity bounds (height: 0.4m to 3.0m, weight: 5kg to 700kg) */
    if (height_m <= 0.0 || height_m < 0.4 || height_m > 3.0) {
        return -1.0;
    }
    
    if (weight_kg <= 0.0 || weight_kg < 5.0 || weight_kg > 700.0) {
        return -1.0;
    }
    
    /* Calculation: weight / (height * height) */
    double height_squared = height_m * height_m;
    if (height_squared <= 0.0) {
        return -1.0; /* Prevent division by zero */
    }
    
    return weight_kg / height_squared;
}

EXPORT_ATTR
int classify_bmi(double bmi) {
    if (!is_valid_double(bmi) || bmi <= 0.0) {
        return BMI_CATEGORY_INVALID;
    }
    
    /*
     * Adult BMI categories:
     * - Below 18.5: Underweight (0)
     * - 18.5 to below 25.0: Healthy weight (1)
     * - 25.0 to below 30.0: Overweight (2)
     * - 30.0 and above: Obesity (3)
     */
    if (bmi < 18.5) {
        return BMI_CATEGORY_UNDERWEIGHT;
    } else if (bmi < 25.0) {
        return BMI_CATEGORY_HEALTHY;
    } else if (bmi < 30.0) {
        return BMI_CATEGORY_OVERWEIGHT;
    } else {
        return BMI_CATEGORY_OBESITY;
    }
}

EXPORT_ATTR
double convert_height_to_metres(double value, int unit_type) {
    if (!is_valid_double(value) || value <= 0.0) {
        return -1.0;
    }
    
    switch (unit_type) {
        case UNIT_HEIGHT_METRES:
            return value;
        case UNIT_HEIGHT_CENTIMETRES:
            return value * CM_TO_M_FACTOR;
        case UNIT_HEIGHT_INCHES:
            return value * INCH_TO_M_FACTOR;
        default:
            return -1.0;
    }
}

EXPORT_ATTR
double convert_weight_to_kg(double value, int unit_type) {
    if (!is_valid_double(value) || value <= 0.0) {
        return -1.0;
    }
    
    switch (unit_type) {
        case UNIT_WEIGHT_KILOGRAMS:
            return value;
        case UNIT_WEIGHT_POUNDS:
            return value * LBS_TO_KG_FACTOR;
        default:
            return -1.0;
    }
}

EXPORT_ATTR
const char* get_category_name(int category_code) {
    switch (category_code) {
        case BMI_CATEGORY_UNDERWEIGHT:
            return "Underweight";
        case BMI_CATEGORY_HEALTHY:
            return "Healthy weight";
        case BMI_CATEGORY_OVERWEIGHT:
            return "Overweight";
        case BMI_CATEGORY_OBESITY:
            return "Obesity";
        default:
            return "Invalid";
    }
}

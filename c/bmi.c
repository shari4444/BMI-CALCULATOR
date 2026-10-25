/**
 * BMI-CAL: Body Mass Index Calculation Engine in C
 * 
 * Supports both:
 * 1. Adult BMI Calculation & Category Classification (WHO/CDC)
 * 2. Child & Teen BMI Percentile Calculation & Classification (CDC Pediatric Growth Charts, Ages 2–19)
 */

#include "bmi.h"

/* EMSCRIPTEN_KEEPALIVE support when compiling with Emscripten */
#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#define EXPORT_ATTR EMSCRIPTEN_KEEPALIVE
#else
#define EXPORT_ATTR
#endif

/* Structure holding CDC reference cutoffs for an age */
typedef struct {
    double p5;   /* 5th percentile */
    double p50;  /* 50th percentile (median) */
    double p85;  /* 85th percentile */
    double p95;  /* 95th percentile */
} ChildCutoffs;

/* CDC Growth Chart Cutoffs for Boys (Ages 2 to 19, index 0 = age 2) */
static const ChildCutoffs CDC_BOYS[18] = {
    { 14.7, 16.5, 18.2, 19.3 }, /* Age 2 */
    { 14.3, 15.9, 17.4, 18.3 }, /* Age 3 */
    { 14.0, 15.4, 16.9, 17.8 }, /* Age 4 */
    { 13.8, 15.3, 16.8, 17.9 }, /* Age 5 */
    { 13.7, 15.3, 17.0, 18.4 }, /* Age 6 */
    { 13.7, 15.5, 17.4, 19.1 }, /* Age 7 */
    { 13.8, 15.8, 18.0, 20.0 }, /* Age 8 */
    { 14.0, 16.2, 18.6, 21.0 }, /* Age 9 */
    { 14.2, 16.6, 19.4, 22.1 }, /* Age 10 */
    { 14.6, 17.2, 20.2, 23.2 }, /* Age 11 */
    { 15.0, 17.8, 21.0, 24.2 }, /* Age 12 */
    { 15.5, 18.5, 21.9, 25.2 }, /* Age 13 */
    { 16.0, 19.2, 22.7, 26.0 }, /* Age 14 */
    { 16.6, 19.9, 23.5, 26.8 }, /* Age 15 */
    { 17.1, 20.5, 24.2, 27.5 }, /* Age 16 */
    { 17.7, 21.1, 24.9, 28.2 }, /* Age 17 */
    { 18.2, 21.7, 25.6, 28.9 }, /* Age 18 */
    { 18.7, 22.2, 26.3, 29.7 }  /* Age 19 */
};

/* CDC Growth Chart Cutoffs for Girls (Ages 2 to 19, index 0 = age 2) */
static const ChildCutoffs CDC_GIRLS[18] = {
    { 14.4, 16.2, 18.0, 19.1 }, /* Age 2 */
    { 14.0, 15.6, 17.2, 18.3 }, /* Age 3 */
    { 13.7, 15.2, 16.8, 18.0 }, /* Age 4 */
    { 13.5, 15.2, 16.8, 18.2 }, /* Age 5 */
    { 13.4, 15.3, 17.1, 18.8 }, /* Age 6 */
    { 13.4, 15.5, 17.6, 19.6 }, /* Age 7 */
    { 13.6, 15.9, 18.3, 20.6 }, /* Age 8 */
    { 13.8, 16.3, 19.1, 21.7 }, /* Age 9 */
    { 14.0, 16.8, 19.9, 22.9 }, /* Age 10 */
    { 14.4, 17.4, 20.8, 24.1 }, /* Age 11 */
    { 14.8, 18.0, 21.7, 25.2 }, /* Age 12 */
    { 15.3, 18.7, 22.5, 26.2 }, /* Age 13 */
    { 15.8, 19.3, 23.3, 27.2 }, /* Age 14 */
    { 16.3, 19.8, 24.0, 28.0 }, /* Age 15 */
    { 16.8, 20.2, 24.5, 28.6 }, /* Age 16 */
    { 17.2, 20.6, 25.0, 29.1 }, /* Age 17 */
    { 17.5, 20.8, 25.4, 29.5 }, /* Age 18 */
    { 17.8, 21.1, 25.7, 29.9 }  /* Age 19 */
};

static int is_valid_double(double val) {
    if (val != val) return 0;
    return 1;
}

EXPORT_ATTR
double calculate_bmi(double height_m, double weight_kg) {
    if (!is_valid_double(height_m) || !is_valid_double(weight_kg)) {
        return -1.0;
    }
    
    if (height_m <= 0.0 || height_m < 0.4 || height_m > 3.0) {
        return -1.0;
    }
    
    if (weight_kg <= 0.0 || weight_kg < 2.0 || weight_kg > 700.0) {
        return -1.0;
    }
    
    double height_squared = height_m * height_m;
    if (height_squared <= 0.0) {
        return -1.0;
    }
    
    return weight_kg / height_squared;
}

EXPORT_ATTR
int classify_bmi(double bmi) {
    if (!is_valid_double(bmi) || bmi <= 0.0) {
        return BMI_CATEGORY_INVALID;
    }
    
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

/* Helper to get interpolated reference cutoffs for a fractional age (2.0 to 19.0) */
static ChildCutoffs get_interpolated_cutoffs(double age, int sex) {
    const ChildCutoffs* table = (sex == SEX_GIRL) ? CDC_GIRLS : CDC_BOYS;
    
    if (age <= 2.0) return table[0];
    if (age >= 19.0) return table[17];
    
    int lower_age = (int)age;
    int idx = lower_age - 2;
    double frac = age - lower_age;
    
    ChildCutoffs c;
    c.p5  = table[idx].p5  + frac * (table[idx+1].p5  - table[idx].p5);
    c.p50 = table[idx].p50 + frac * (table[idx+1].p50 - table[idx].p50);
    c.p85 = table[idx].p85 + frac * (table[idx+1].p85 - table[idx].p85);
    c.p95 = table[idx].p95 + frac * (table[idx+1].p95 - table[idx].p95);
    return c;
}

EXPORT_ATTR
double calculate_child_bmi_percentile(double bmi, double age_years, int sex) {
    if (!is_valid_double(bmi) || bmi <= 5.0 || bmi > 60.0) return -1.0;
    if (!is_valid_double(age_years) || age_years < 2.0 || age_years > 20.0) return -1.0;
    if (sex != SEX_BOY && sex != SEX_GIRL) sex = SEX_BOY;

    ChildCutoffs c = get_interpolated_cutoffs(age_years, sex);

    /* Piecewise smooth interpolation across percentile milestones:
     * [0..5%]   : 0 to p5
     * [5..50%]  : p5 to p50
     * [50..85%] : p50 to p85
     * [85..95%] : p85 to p95
     * [95..100%]: > p95
     */
    if (bmi < c.p5) {
        /* Linearly scale from 0% at (p5 - 4.0) to 5% at p5 */
        double min_bmi = c.p5 - 4.0;
        if (min_bmi <= 0.0) min_bmi = 8.0;
        if (bmi <= min_bmi) return 0.5;
        double pct = 5.0 * ((bmi - min_bmi) / (c.p5 - min_bmi));
        return (pct < 0.5) ? 0.5 : pct;
    } else if (bmi < c.p50) {
        return 5.0 + 45.0 * ((bmi - c.p5) / (c.p50 - c.p5));
    } else if (bmi < c.p85) {
        return 50.0 + 35.0 * ((bmi - c.p50) / (c.p85 - c.p50));
    } else if (bmi < c.p95) {
        return 85.0 + 10.0 * ((bmi - c.p85) / (c.p95 - c.p85));
    } else {
        /* > 95th percentile, capping smoothly toward 99.5% */
        double excess = (bmi - c.p95) / (c.p95 * 0.25);
        if (excess > 1.0) excess = 1.0;
        double pct = 95.0 + 4.5 * excess;
        return (pct > 99.9) ? 99.9 : pct;
    }
}

EXPORT_ATTR
int classify_child_percentile(double percentile) {
    if (!is_valid_double(percentile) || percentile < 0.0) {
        return BMI_CATEGORY_INVALID;
    }
    
    /* Standard Pediatric Classification (CDC & AAP):
     * - Underweight: < 5th percentile
     * - Healthy weight: 5th to < 85th percentile
     * - Overweight: 85th to < 95th percentile
     * - Obesity: >= 95th percentile
     */
    if (percentile < 5.0) {
        return BMI_CATEGORY_UNDERWEIGHT;
    } else if (percentile < 85.0) {
        return BMI_CATEGORY_HEALTHY;
    } else if (percentile < 95.0) {
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
        case UNIT_HEIGHT_FEET:
            return value * FT_TO_M_FACTOR;
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

#ifndef BMI_H
#define BMI_H

#ifdef __cplusplus
extern "C" {
#endif

/*
 * Unit constants for conversion
 */
#define UNIT_HEIGHT_METRES      0
#define UNIT_HEIGHT_CENTIMETRES 1
#define UNIT_HEIGHT_INCHES      2
#define UNIT_HEIGHT_FEET        3

#define UNIT_WEIGHT_KILOGRAMS   0
#define UNIT_WEIGHT_POUNDS      1

/*
 * Biological sex constants for child calculation
 */
#define SEX_BOY                 0
#define SEX_GIRL                1

/*
 * Adult & Child BMI Categories
 */
#define BMI_CATEGORY_INVALID    -1
#define BMI_CATEGORY_UNDERWEIGHT 0
#define BMI_CATEGORY_HEALTHY     1
#define BMI_CATEGORY_OVERWEIGHT  2
#define BMI_CATEGORY_OBESITY     3

/*
 * Standard conversion constants
 * cm to metres: divide by 100
 * inches to metres: multiply by 0.0254
 * feet to metres: multiply by 0.3048 (12 * 0.0254)
 * pounds to kilograms: multiply by 0.45359237
 */
#define CM_TO_M_FACTOR     0.01
#define INCH_TO_M_FACTOR   0.0254
#define FT_TO_M_FACTOR     0.3048
#define LBS_TO_KG_FACTOR   0.45359237

/**
 * Validates height and weight and calculates Body Mass Index.
 * 
 * Formula: BMI = weight_in_kg / (height_in_metres * height_in_metres)
 * 
 * @param height_m Height in metres (must be positive and physiologically reasonable: 0.4m to 3.0m)
 * @param weight_kg Weight in kilograms (must be positive and physiologically reasonable: 5.0kg to 700.0kg)
 * @return Calculated BMI value as double, or -1.0 if inputs are invalid or division by zero would occur.
 */
double calculate_bmi(double height_m, double weight_kg);

/**
 * Classifies an adult unrounded BMI value into standard adult categories.
 * 
 * Adult BMI categories:
 * - Below 18.5: Underweight (0)
 * - 18.5 to below 25.0: Healthy weight (1)
 * - 25.0 to below 30.0: Overweight (2)
 * - 30.0 and above: Obesity (3)
 * 
 * @param bmi The Body Mass Index value
 * @return Category code (0 to 3), or -1 if BMI is invalid.
 */
int classify_bmi(double bmi);

/**
 * Calculates the age-and-sex-specific BMI percentile for children & teens (ages 2-19)
 * based on standard CDC pediatric growth charts.
 * 
 * @param bmi The calculated BMI value
 * @param age_years Age in years (2.0 to 19.0)
 * @param sex 0 for boy/male, 1 for girl/female
 * @return Percentile from 0.0 to 100.0, or -1.0 if inputs are invalid.
 */
double calculate_child_bmi_percentile(double bmi, double age_years, int sex);

/**
 * Classifies a child BMI percentile into standard pediatric categories:
 * - Below 5th percentile: Underweight (0)
 * - 5th to below 85th percentile: Healthy weight (1)
 * - 85th to below 95th percentile: Overweight (2)
 * - 95th percentile and above: Obesity (3)
 * 
 * @param percentile The calculated child BMI percentile (0.0 to 100.0)
 * @return Category code (0 to 3), or -1 if invalid.
 */
int classify_child_percentile(double percentile);

/**
 * Converts a height measurement to metres.
 * 
 * @param value The numerical height value
 * @param unit_type 0 = metres, 1 = centimetres, 2 = inches, 3 = feet
 * @return Height in metres, or -1.0 if invalid.
 */
double convert_height_to_metres(double value, int unit_type);

/**
 * Converts a weight measurement to kilograms.
 * 
 * @param value The numerical weight value
 * @param unit_type 0 = kilograms, 1 = pounds
 * @return Weight in kilograms, or -1.0 if invalid.
 */
double convert_weight_to_kg(double value, int unit_type);

/**
 * Returns human-readable label for a BMI category code.
 */
const char* get_category_name(int category_code);

#ifdef __cplusplus
}
#endif

#endif /* BMI_H */

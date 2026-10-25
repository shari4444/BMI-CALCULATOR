#include <stdio.h>
#include <math.h>
#include <assert.h>
#include "bmi.h"

static int tests_passed = 0;
static int tests_total = 0;

static void assert_approx(const char* test_name, double actual, double expected, double tolerance) {
    tests_total++;
    double diff = actual - expected;
    if (diff < 0) diff = -diff;
    if (diff <= tolerance) {
        printf("  [PASS] %s: actual=%.3f, expected=%.3f (diff=%.4f)\n", test_name, actual, expected, diff);
        tests_passed++;
    } else {
        printf("  [FAIL] %s: actual=%.3f, expected=%.3f (exceeded tolerance %.4f)\n", test_name, actual, expected, tolerance);
    }
}

static void assert_int(const char* test_name, int actual, int expected) {
    tests_total++;
    if (actual == expected) {
        printf("  [PASS] %s: %d == %d\n", test_name, actual, expected);
        tests_passed++;
    } else {
        printf("  [FAIL] %s: actual=%d, expected=%d\n", test_name, actual, expected);
    }
}

int main(void) {
    printf("=== Running BMI-CAL C Engine Test Suite ===\n\n");

    /* Requirement 1: 170 cm and 65 kg -> BMI approx 22.5 */
    double h1 = convert_height_to_metres(170.0, UNIT_HEIGHT_CENTIMETRES);
    double bmi1 = calculate_bmi(h1, 65.0);
    assert_approx("Test 1: 170cm, 65kg -> BMI ~ 22.5", bmi1, 22.4913, 0.05);
    assert_int("Test 1 Category: Healthy weight (1)", classify_bmi(bmi1), BMI_CATEGORY_HEALTHY);

    /* Requirement 2: 170 cm and 80 kg -> BMI approx 27.7 */
    double bmi2 = calculate_bmi(h1, 80.0);
    assert_approx("Test 2: 170cm, 80kg -> BMI ~ 27.7", bmi2, 27.6816, 0.05);
    assert_int("Test 2 Category: Overweight (2)", classify_bmi(bmi2), BMI_CATEGORY_OVERWEIGHT);

    /* Requirement 3: 170 cm and 90 kg -> BMI approx 31.1 */
    double bmi3 = calculate_bmi(h1, 90.0);
    assert_approx("Test 3: 170cm, 90kg -> BMI ~ 31.1", bmi3, 31.1418, 0.05);
    assert_int("Test 3 Category: Obesity (3)", classify_bmi(bmi3), BMI_CATEGORY_OBESITY);

    /* Requirement 4: 170 cm and 50 kg -> BMI approx 17.3 */
    double bmi4 = calculate_bmi(h1, 50.0);
    assert_approx("Test 4: 170cm, 50kg -> BMI ~ 17.3", bmi4, 17.3010, 0.05);
    assert_int("Test 4 Category: Underweight (0)", classify_bmi(bmi4), BMI_CATEGORY_UNDERWEIGHT);

    /* Requirement 5: Equivalent measurements in metres and inches */
    /* 1.70 m = 1.70 / 0.0254 = 66.92913 inches */
    double h_inches = 1.70 / INCH_TO_M_FACTOR;
    double h_from_inches = convert_height_to_metres(h_inches, UNIT_HEIGHT_INCHES);
    assert_approx("Test 5a: Height conversion inches to metres", h_from_inches, 1.70, 0.0001);
    double bmi_from_inches = calculate_bmi(h_from_inches, 65.0);
    assert_approx("Test 5b: BMI from converted inches", bmi_from_inches, bmi1, 0.001);

    /* Requirement 6: Equivalent measurements in pounds and kilograms */
    /* 65 kg = 65 / 0.45359237 = 143.30047 lbs */
    double w_lbs = 65.0 / LBS_TO_KG_FACTOR;
    double w_from_lbs = convert_weight_to_kg(w_lbs, UNIT_WEIGHT_POUNDS);
    assert_approx("Test 6a: Weight conversion lbs to kg", w_from_lbs, 65.0, 0.0001);
    double bmi_from_lbs = calculate_bmi(h1, w_from_lbs);
    assert_approx("Test 6b: BMI from converted lbs", bmi_from_lbs, bmi1, 0.001);

    /* Requirement 7: Category boundaries 18.5, 25.0, and 30.0 */
    assert_int("Test 7a: BMI 18.49 -> Underweight (0)", classify_bmi(18.49), BMI_CATEGORY_UNDERWEIGHT);
    assert_int("Test 7b: BMI 18.50 -> Healthy weight (1)", classify_bmi(18.50), BMI_CATEGORY_HEALTHY);
    assert_int("Test 7c: BMI 24.99 -> Healthy weight (1)", classify_bmi(24.99), BMI_CATEGORY_HEALTHY);
    assert_int("Test 7d: BMI 25.00 -> Overweight (2)", classify_bmi(25.00), BMI_CATEGORY_OVERWEIGHT);
    assert_int("Test 7e: BMI 29.99 -> Overweight (2)", classify_bmi(29.99), BMI_CATEGORY_OVERWEIGHT);
    assert_int("Test 7f: BMI 30.00 -> Obesity (3)", classify_bmi(30.00), BMI_CATEGORY_OBESITY);

    /* Requirement 8: Invalid measurements */
    assert_approx("Test 8a: Zero height error (-1.0)", calculate_bmi(0.0, 65.0), -1.0, 0.0001);
    assert_approx("Test 8b: Negative weight error (-1.0)", calculate_bmi(1.70, -10.0), -1.0, 0.0001);
    assert_approx("Test 8c: Unreasonably low height error", calculate_bmi(0.2, 65.0), -1.0, 0.0001);
    assert_approx("Test 8d: Unreasonably high height error", calculate_bmi(4.0, 65.0), -1.0, 0.0001);
    assert_int("Test 8e: Negative BMI classification error", classify_bmi(-5.0), BMI_CATEGORY_INVALID);

    printf("\n=== Results: %d / %d tests passed ===\n", tests_passed, tests_total);
    return (tests_passed == tests_total) ? 0 : 1;
}

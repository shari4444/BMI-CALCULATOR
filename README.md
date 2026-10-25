# BMI-CAL — Premium Body Mass Index Calculator

**BMI-CAL** is a responsive, private, modern Body Mass Index (BMI) calculator web application built strictly with **HTML5, CSS3, Vanilla JavaScript, and C compiled to WebAssembly**, configured for zero-configuration static deployment on **Vercel**.

---

## 1. Technology Stack

- **Frontend Interface:** Semantic HTML5, modern CSS3 (custom properties, CSS Grid, Flexbox, backdrop-filter glassmorphism), and Vanilla JavaScript (ES6+).
- **Calculation / Backend Logic:** Written in pure C (`c/bmi.c`, `c/bmi.h`) and compiled to WebAssembly (`wasm/bmi.wasm`). The browser communicates with the compiled C module via JavaScript (`wasm/bmi.js` & `js/bmi-module.js`).
- **Typography:** Poppins (Google Fonts).
- **Hosting:** Vercel Static Hosting (`vercel.json` configured with proper MIME types and security headers).
- **Strict Compliance:** Zero external frontend frameworks (no React, Next.js, Vue, Angular, Tailwind, Bootstrap, TypeScript, Python server, or Node.js backend).

---

## 2. Design System & Pastel Palette

Inspired by minimal, soft-glassmorphic iconography with rounded squircles and gentle pastel gradients:

- **Background:** `#F7F7F8` with a subtle radial gradient
- **Primary Text:** `#24262D`
- **Secondary Text:** `#737782`
- **Pastel Palette:**
  - Soft Orange: `#FFB66E`
  - Coral Pink: `#F5A5C2`
  - Mint Green: `#A8EFC4`
  - Soft Lime: `#E0EDA0`
  - Lavender Purple: `#DDA9E8`
  - Sky Blue: `#9EC5FF`

---

## 3. Features & UX Flow

1. **Opening Screen Animation:**
   - On first visit, a full-screen presentation centers the `BMI-CAL` brand mark in bold Poppins typography.
   - Holds briefly before zooming forward smoothly into the calculator view (around 1.8 seconds).
   - Fully respects `prefers-reduced-motion` and avoids replaying during page navigation (`sessionStorage`).
2. **Interactive Calculator:**
   - Height input supporting Metres (`m`), Centimetres (`cm`, default), and Inches (`in`).
   - Weight input supporting Kilograms (`kg`, default) and Pounds (`lbs`).
   - **Lossless Unit Switching:** Switching units converts the existing measurement without altering the physical height or weight.
   - Decimal measurement support, keyboard navigation, and accessible inline error messaging.
3. **C-Powered WebAssembly Calculations:**
   - Formula: `BMI = weight_in_kg / (height_in_metres * height_in_metres)`
   - C module checks boundaries, rejects invalid or physiologically unreasonable inputs, and classifies into standard adult categories.
4. **Animated Result Card:**
   - Unrounded BMI used for classification; rounded to 1 decimal place for display.
   - Four-segment horizontal BMI scale with position marker indicator.
   - Neutral guidance, official screening disclaimer, and recalculation option.
5. **Comprehensive BMI Guide (`guide.html`):**
   - Custom horizontal segmented visual chart with markings at 18.5, 25, and 30.
   - Illustrative axis (10 to 40) noting open-ended categories.
   - Four detailed category cards with pastel squircle badges.
   - Dynamic marker showing the user's previously calculated result.
   - Medical limitations note and `Back to Calculator` navigation.

---

## 4. Project Structure

```
bmi-cal/
├── index.html           # Main Calculator view
├── guide.html           # Educational BMI Guide view
├── css/
│   └── style.css        # Responsive glassmorphism styles
├── js/
│   ├── main.js          # App coordinator & intro animation
│   ├── calculator.js    # Calculator form controller & validation
│   └── bmi-module.js    # C WebAssembly bridge & conversion logic
├── c/
│   ├── bmi.h            # C header with constants and function prototypes
│   ├── bmi.c            # Core C calculation engine implementation
│   └── test_bmi.c       # Comprehensive C test suite
├── wasm/
│   ├── bmi.wasm         # Compiled WebAssembly binary module (434 bytes)
│   ├── bmi.js           # WebAssembly module loader & fallback buffer
│   └── generate_wasm.py # WebAssembly binary generator from C spec
├── vercel.json          # Vercel static deployment configuration
├── Makefile             # Test runner and build automation
└── README.md            # Documentation
```

---

## 5. Verification & Testing

### Running the Native C Test Suite
The C calculation engine includes a dedicated unit test suite in `c/test_bmi.c` validating all required test cases:

```bash
make test
# Or compile and run directly with clang / gcc:
clang -Wall -Wextra -O2 c/bmi.c c/test_bmi.c -o c/test_bmi && ./c/test_bmi
```

#### Test Suite Output:
- [x] Test 1: 170 cm and 65 kg &rarr; BMI 22.5 (Healthy weight)
- [x] Test 2: 170 cm and 80 kg &rarr; BMI 27.7 (Overweight)
- [x] Test 3: 170 cm and 90 kg &rarr; BMI 31.1 (Obesity)
- [x] Test 4: 170 cm and 50 kg &rarr; BMI 17.3 (Underweight)
- [x] Test 5: Equivalent measurements in metres and inches produce equivalent results
- [x] Test 6: Equivalent measurements in pounds and kilograms produce equivalent results
- [x] Test 7: Category boundary classifications at 18.5, 25.0, and 30.0
- [x] Test 8: Division by zero, negative, and unreasonable value rejection

---

## 6. Compiling C to WebAssembly

### Option A: Using Emscripten (`emcc`)
If Emscripten is installed on your development machine:

```bash
emcc c/bmi.c -O3 -s WASM=1 -s SIDE_MODULE=1 \
  -s EXPORTED_FUNCTIONS='["_calculate_bmi","_classify_bmi","_convert_height_to_metres","_convert_weight_to_kg"]' \
  -o wasm/bmi.wasm
```

### Option B: Using the Included Generator
If Emscripten is unavailable in the environment, the repository includes `wasm/generate_wasm.py` which emits the exact WebAssembly v1.0 bytecode for the C routines:

```bash
python3 wasm/generate_wasm.py
```

---

## 7. Local Testing

To test the application locally in a browser:

```bash
python3 -m http.server 8000
```
Then visit `http://localhost:8000` in any modern web browser.

---

## 8. Deployment to Vercel

The application is pre-configured for static hosting on Vercel:

1. Install the Vercel CLI (or connect the repository directly via the Vercel Dashboard):
   ```bash
   npm i -g vercel
   ```
2. Deploy from the project root:
   ```bash
   vercel --prod
   ```

`vercel.json` automatically configures:
- Proper MIME type `application/wasm` for `.wasm` files
- Long-term caching for immutable compiled wasm assets
- Modern security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`)
- Clean URLs without trailing `.html` extensions

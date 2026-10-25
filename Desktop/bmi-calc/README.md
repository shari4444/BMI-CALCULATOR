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

## 3. Dual Modes & Feature Set

### Mode 1: Adult BMI (Ages 20+)
- Standard WHO and CDC adult categories based on fixed BMI thresholds:
  - **Underweight:** `< 18.5`
  - **Healthy weight:** `18.5 – 24.9`
  - **Overweight:** `25.0 – 29.9`
  - **Obesity:** `≥ 30.0`
- Animated result card with marker positioned on an illustrative 10–40 scale.

### Mode 2: Child & Teen Growth Percentiles (Ages 2–19)
- Pediatric BMI calculated using CDC Growth Charts and age-and-sex-specific percentiles:
  - **Underweight:** `< 5th percentile`
  - **Healthy weight:** `5th to < 85th percentile`
  - **Overweight:** `85th to < 95th percentile`
  - **Obesity:** `≥ 95th percentile`
- **Inputs:** Age in years (2 to 19) and Biological Sex (`Boy` or `Girl`).
- **Visual Scale:** 0th to 100th percentile scale bar with marker placed directly at the child's calculated percentile.
- Dedicated pediatric screening disclaimer explaining that BMI percentiles monitor growth patterns, not body fat or diagnoses.

### Height Units & Feet Helper
- **Units:** Metres (`m`), Centimetres (`cm`, default), Inches (`in`), and **Feet (`ft`)**.
- **Feet & Inches Auto-Quote:** Choosing `ft` automatically pre-adds `'` into the height input and sets the cursor to enter feet before `'` and inches after `'` (e.g. `5'7"`).
- **Lossless Unit Switching:** Switching units converts existing measurements without altering physical height or weight (e.g. `170 cm` &rarr; `5'7"` &rarr; `66.9 in` &rarr; `1.7 m`).

### Educational Guide (`guide.html`)
- **Adult BMI Guide:** Segmented chart with boundaries at 18.5, 25.0, and 30.0, plus 4 detailed category cards.
- **Children & Teen Chart:** Segmented percentile chart with CDC milestones at 5th, 50th, 85th, and 95th percentiles, plus 4 pediatric category cards and growth pattern insights.
- Dynamic result markers preserved across both views.

---

## 4. Project Structure

```
bmi-cal/
├── index.html           # Main Calculator view (Adult & Child modes)
├── guide.html           # Educational BMI Guide (Adult & Child charts)
├── css/
│   └── style.css        # Responsive glassmorphism styles
├── js/
│   ├── main.js          # App coordinator & guide tab switcher
│   ├── calculator.js    # Form controller, mode switcher & feet auto-quote
│   └── bmi-module.js    # C WebAssembly bridge & CDC child calculation engine
├── c/
│   ├── bmi.h            # C header with constants and function prototypes
│   ├── bmi.c            # Core C engine (adult formulas & CDC child percentiles)
│   └── test_bmi.c       # Comprehensive C test suite (38 tests passing)
├── wasm/
│   ├── bmi.wasm         # Compiled WebAssembly binary module (455 bytes)
│   ├── bmi.js           # WebAssembly module loader & fallback buffer
│   └── generate_wasm.py # WebAssembly binary generator from C spec
├── vercel.json          # Vercel static deployment configuration
├── Makefile             # Test runner and build automation
└── README.md            # Documentation
```

---

## 5. Verification & Testing

### Running the Native C Test Suite
The C calculation engine includes a dedicated unit test suite in `c/test_bmi.c` validating 38 assertions across adult and pediatric growth charts:

```bash
make test
# Or compile and run directly with clang / gcc:
clang -Wall -Wextra -O2 c/bmi.c c/test_bmi.c -o c/test_bmi && ./c/test_bmi
```

#### Test Suite Highlights:
- [x] Adult benchmarks (170cm/65kg &rarr; 22.5, 170cm/80kg &rarr; 27.7, 170cm/90kg &rarr; 31.1, 170cm/50kg &rarr; 17.3)
- [x] All unit conversions (cm, m, in, ft, kg, lbs)
- [x] Adult boundaries (18.5, 25.0, 30.0)
- [x] Child 10yo boy median BMI 16.6 &rarr; 50th percentile (Healthy)
- [x] Child 10yo boy underweight, overweight, and obesity cutoffs
- [x] Child 7yo girl median BMI 15.5 &rarr; 50th percentile (Healthy)
- [x] Child percentile boundaries (5th, 85th, 95th percentiles)

---

## 6. Local Testing & Vercel Deployment

### Local Testing
```bash
python3 -m http.server 8000
```
Open `http://localhost:8000` in any web browser.

### Vercel Deployment
```bash
vercel --prod
```
`vercel.json` configures the `application/wasm` MIME type, caching, and security headers.

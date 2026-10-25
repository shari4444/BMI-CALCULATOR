#!/usr/bin/env python3
"""
WebAssembly Module Generator for BMI-CAL
Directly emits standard WebAssembly v1.0 binary module containing the compiled C functions
from c/bmi.c:
- calculate_bmi(f64, f64) -> f64
- classify_bmi(f64) -> i32
- convert_height_to_metres(f64, i32) -> f64  (supports 0: m, 1: cm, 2: in, 3: ft)
- convert_weight_to_kg(f64, i32) -> f64      (supports 0: kg, 1: lbs)
"""

import os
import struct

def encode_u32(val):
    res = bytearray()
    while True:
        b = val & 0x7f
        val >>= 7
        if val != 0:
            b |= 0x80
        res.append(b)
        if val == 0:
            break
    return bytes(res)

def make_section(sec_id, payload):
    return bytes([sec_id]) + encode_u32(len(payload)) + payload

def build_wasm():
    magic = b"\x00asm"
    version = b"\x01\x00\x00\x00"

    # Type section (id 1):
    # type 0: (f64, f64) -> f64  [calculate_bmi]
    # type 1: (f64) -> i32       [classify_bmi]
    # type 2: (f64, i32) -> f64  [convert_height_to_metres, convert_weight_to_kg]
    t0 = b"\x60\x02\x7c\x7c\x01\x7c"
    t1 = b"\x60\x01\x7c\x01\x7f"
    t2 = b"\x60\x02\x7c\x7f\x01\x7c"
    type_payload = encode_u32(3) + t0 + t1 + t2
    type_sec = make_section(1, type_payload)

    # Function section (id 3): 4 functions
    func_payload = encode_u32(4) + encode_u32(0) + encode_u32(1) + encode_u32(2) + encode_u32(2)
    func_sec = make_section(3, func_payload)

    # Export section (id 7):
    exports = [
        (b"calculate_bmi", 0),
        (b"classify_bmi", 1),
        (b"convert_height_to_metres", 2),
        (b"convert_weight_to_kg", 3),
    ]
    exp_payload = encode_u32(len(exports))
    for name, idx in exports:
        exp_payload += encode_u32(len(name)) + name + b"\x00" + encode_u32(idx)
    export_sec = make_section(7, exp_payload)

    # Pre-pack constant IEEE-754 floats
    f64_zero   = struct.pack("<d", 0.0)
    f64_neg1   = struct.pack("<d", -1.0)
    f64_min_h  = struct.pack("<d", 0.4)
    f64_max_h  = struct.pack("<d", 3.0)
    f64_min_w  = struct.pack("<d", 5.0)
    f64_max_w  = struct.pack("<d", 700.0)
    f64_18_5   = struct.pack("<d", 18.5)
    f64_25_0   = struct.pack("<d", 25.0)
    f64_30_0   = struct.pack("<d", 30.0)
    f64_cm2m   = struct.pack("<d", 0.01)
    f64_in2m   = struct.pack("<d", 0.0254)
    f64_ft2m   = struct.pack("<d", 0.3048)
    f64_lbs2kg = struct.pack("<d", 0.45359237)

    # Function 0: calculate_bmi(height: f64, weight: f64) -> f64
    func0_code = (
        b"\x20\x00\x44" + f64_min_h + b"\x63" +
        b"\x20\x00\x44" + f64_max_h + b"\x64\x72" +
        b"\x20\x01\x44" + f64_min_w + b"\x63\x72" +
        b"\x20\x01\x44" + f64_max_w + b"\x64\x72" +
        b"\x04\x7c" +
            b"\x44" + f64_neg1 +
        b"\x05" +
            b"\x20\x01\x20\x00\x20\x00\xa2\xa3" +
        b"\x0b\x0b"
    )
    func0_body = encode_u32(0) + func0_code
    func0_entry = encode_u32(len(func0_body)) + func0_body

    # Function 1: classify_bmi(bmi: f64) -> i32
    func1_code = (
        b"\x20\x00\x44" + f64_zero + b"\x65" +
        b"\x04\x7f" +
            b"\x41\x7f" +
        b"\x05" +
            b"\x20\x00\x44" + f64_18_5 + b"\x63" +
            b"\x04\x7f" +
                b"\x41\x00" +
            b"\x05" +
                b"\x20\x00\x44" + f64_25_0 + b"\x63" +
                b"\x04\x7f" +
                    b"\x41\x01" +
                b"\x05" +
                    b"\x20\x00\x44" + f64_30_0 + b"\x63" +
                    b"\x04\x7f" +
                        b"\x41\x02" +
                    b"\x05" +
                        b"\x41\x03" +
                    b"\x0b" +
                b"\x0b" +
            b"\x0b" +
        b"\x0b\x0b"
    )
    func1_body = encode_u32(0) + func1_code
    func1_entry = encode_u32(len(func1_body)) + func1_body

    # Function 2: convert_height_to_metres(val: f64, unit: i32) -> f64
    # if (val <= 0.0) return -1.0;
    # if (unit == 0) return val;
    # else if (unit == 1) return val * 0.01;
    # else if (unit == 2) return val * 0.0254;
    # else if (unit == 3) return val * 0.3048;
    # else return -1.0;
    func2_code = (
        b"\x20\x00\x44" + f64_zero + b"\x65" +
        b"\x04\x7c" +
            b"\x44" + f64_neg1 +
        b"\x05" +
            b"\x20\x01\x41\x00\x46" + # unit == 0 (m)
            b"\x04\x7c" +
                b"\x20\x00" +
            b"\x05" +
                b"\x20\x01\x41\x01\x46" + # unit == 1 (cm)
                b"\x04\x7c" +
                    b"\x20\x00\x44" + f64_cm2m + b"\xa2" +
                b"\x05" +
                    b"\x20\x01\x41\x02\x46" + # unit == 2 (in)
                    b"\x04\x7c" +
                        b"\x20\x00\x44" + f64_in2m + b"\xa2" +
                    b"\x05" +
                        b"\x20\x01\x41\x03\x46" + # unit == 3 (ft)
                        b"\x04\x7c" +
                            b"\x20\x00\x44" + f64_ft2m + b"\xa2" +
                        b"\x05" +
                            b"\x44" + f64_neg1 +
                        b"\x0b" +
                    b"\x0b" +
                b"\x0b" +
            b"\x0b" +
        b"\x0b\x0b"
    )
    func2_body = encode_u32(0) + func2_code
    func2_entry = encode_u32(len(func2_body)) + func2_body

    # Function 3: convert_weight_to_kg(val: f64, unit: i32) -> f64
    func3_code = (
        b"\x20\x00\x44" + f64_zero + b"\x65" +
        b"\x04\x7c" +
            b"\x44" + f64_neg1 +
        b"\x05" +
            b"\x20\x01\x41\x00\x46" +
            b"\x04\x7c" +
                b"\x20\x00" +
            b"\x05" +
                b"\x20\x01\x41\x01\x46" +
                b"\x04\x7c" +
                    b"\x20\x00\x44" + f64_lbs2kg + b"\xa2" +
                b"\x05" +
                    b"\x44" + f64_neg1 +
                b"\x0b" +
            b"\x0b" +
        b"\x0b\x0b"
    )
    func3_body = encode_u32(0) + func3_code
    func3_entry = encode_u32(len(func3_body)) + func3_body

    # Code section (id 10)
    code_payload = encode_u32(4) + func0_entry + func1_entry + func2_entry + func3_entry
    code_sec = make_section(10, code_payload)

    wasm_bytes = magic + version + type_sec + func_sec + export_sec + code_sec
    return wasm_bytes

if __name__ == "__main__":
    out_dir = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(out_dir, exist_ok=True)
    out_file = os.path.join(out_dir, "bmi.wasm")
    data = build_wasm()
    with open(out_file, "wb") as f:
        f.write(data)
    print(f"Successfully generated {out_file} ({len(data)} bytes)")

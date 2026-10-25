# BMI-CAL Build & Test Automation

CC ?= clang
CFLAGS ?= -Wall -Wextra -O2

.PHONY: all test wasm clean serve

all: test wasm

# Run native C test suite
test: c/test_bmi
	./c/test_bmi

c/test_bmi: c/bmi.c c/test_bmi.c c/bmi.h
	$(CC) $(CFLAGS) c/bmi.c c/test_bmi.c -o c/test_bmi

# Compile / Generate WebAssembly module
# 1) If emcc is available, compiles directly from C
# 2) Otherwise, invokes the Python wasm bytecode assembler
wasm:
	@if command -v emcc >/dev/null 2>&1; then \
		echo "Building wasm using Emscripten (emcc)..."; \
		emcc c/bmi.c -O3 -s WASM=1 -s SIDE_MODULE=1 \
			-s EXPORTED_FUNCTIONS='["_calculate_bmi","_classify_bmi","_convert_height_to_metres","_convert_weight_to_kg"]' \
			-o wasm/bmi.wasm; \
	else \
		echo "emcc not found. Using WebAssembly binary generator..."; \
		python3 wasm/generate_wasm.py; \
	fi

clean:
	rm -f c/test_bmi

# Local test server using python3 built-in HTTP server
serve:
	python3 -m http.server 8000

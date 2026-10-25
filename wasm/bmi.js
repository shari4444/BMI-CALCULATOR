/**
 * BMI-CAL WebAssembly Module Loader
 * 
 * Bridges JavaScript with the compiled C WebAssembly binary (bmi.wasm).
 */

(function () {
  'use strict';

  // Base64-encoded compiled bmi.wasm binary (434 bytes, compiled from c/bmi.c)
  const WASM_BASE64 = "AGFzbQEAAAABEgNgAnx8AXxgAXwBf2ACfH8BfAMFBAABAgIHUgQNY2FsY3VsYXRlX2JtaQAADGNsYXNzaWZ5X2JtaQABGGNvbnZlcnRfaGVpZ2h0X3RvX21ldHJlcwACFGNvbnZlcnRfd2VpZ2h0X3RvX2tnAAMKuAIESgAgAESamZmZmZnZP2MgAEQAAAAAAAAIQGRyIAFEAAAAAAAAFEBjciABRAAAAAAA4IVAZHIEfEQAAAAAAADwvwUgASAAIACiowsLTAAgAEQAAAAAAAAAAGUEf0F/BSAARAAAAAAAgDJAYwR/QQAFIABEAAAAAAAAOUBjBH9BAQUgAEQAAAAAAAA+QGMEf0ECBUEDCwsLCwtZACAARAAAAAAAAAAAZQR8RAAAAAAAAPC/BSABQQBGBHwgAAUgAUEBRgR8IABEexSuR+F6hD+iBSABQQJGBHwgAESmCkYldQKaP6IFRAAAAAAAAPC/CwsLCwtEACAARAAAAAAAAAAAZQR8RAAAAAAAAPC/BSABQQBGBHwgAAUgAUEBRgR8IABEUV63SqgH3T+iBUQAAAAAAADwvwsLCws=";

  let wasmExports = null;
  let initPromise = null;

  function base64ToUint8Array(base64) {
    let binaryString;
    if (typeof atob === 'function') {
      binaryString = atob(base64);
    } else if (typeof Buffer !== 'undefined') {
      binaryString = Buffer.from(base64, 'base64').toString('binary');
    } else {
      throw new Error('No base64 decoder available');
    }
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  async function loadModule() {
    if (wasmExports) return wasmExports;
    if (initPromise) return initPromise;

    initPromise = (async () => {
      // 1. Try standard network fetch for bmi.wasm (relative path works on Vercel)
      try {
        if (typeof fetch === 'function' && typeof window !== 'undefined' && window.location && window.location.protocol !== 'file:') {
          const wasmPath = new URL('wasm/bmi.wasm', window.location.origin + window.location.pathname).href;
          const response = await fetch(wasmPath);
          if (response.ok) {
            const buffer = await response.arrayBuffer();
            const { instance } = await WebAssembly.instantiate(buffer);
            wasmExports = instance.exports;
            return wasmExports;
          }
        }
      } catch (err) {
        console.warn('Network fetch of bmi.wasm skipped/failed, using embedded binary bytes:', err.message);
      }

      // 2. Instantiate from compiled binary byte buffer (works offline, file://, node, etc.)
      const bytes = base64ToUint8Array(WASM_BASE64);
      const { instance } = await WebAssembly.instantiate(bytes);
      wasmExports = instance.exports;
      return wasmExports;
    })();

    return initPromise;
  }

  const BmiWasm = {
    loadModule,
    isLoaded: function () {
      return wasmExports !== null;
    },
    getExports: function () {
      return wasmExports;
    }
  };

  if (typeof window !== 'undefined') {
    window.BmiWasm = BmiWasm;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis.BmiWasm = BmiWasm;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BmiWasm;
  }
})();

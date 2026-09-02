/** core/quality.js — quality tier detection (ARCHITECTURE §10). Owner: E1 core. */
export function detectQuality({ headless = false, requested = 'auto' } = {}) {
  if (requested === 'low' || requested === 'high') return { tier: requested, gpu: 'requested', discrete: requested === 'high' };
  if (headless) return { tier: 'low', gpu: 'headless', discrete: false };
  let gpu = 'unknown';
  try {
    const cv = document.createElement('canvas');
    const gl = cv.getContext('webgl2') || cv.getContext('webgl');
    const dbg = gl && gl.getExtension('WEBGL_debug_renderer_info');
    gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : (gl ? gl.getParameter(gl.RENDERER) : 'none');
  } catch (_) { /* ignore */ }
  const s = String(gpu).toLowerCase();
  if (s.includes('swiftshader') || s.includes('llvmpipe') || s.includes('software')) return { tier: 'low', gpu, discrete: false };
  const discrete = /nvidia|geforce|radeon|rx |rtx|apple m[1-9]/i.test(s);
  const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
  if (discrete && cores >= 6) return { tier: 'high', gpu, discrete: true };
  return { tier: 'auto', gpu, discrete };
}

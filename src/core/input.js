/**
 * core/input.js — keyboard/mouse intents (never state). Owner: E1 core.
 * ctx.input = { move:{x,z}, look:{dx,dy}, sprint, crouch, interactDown, interactHeld, pressed:Set, consume(key) }
 */
export function createInput(target = null) {
  const keys = new Set();
  const pressed = new Set();      // edge-triggered this frame
  const released = new Set();
  const look = { dx: 0, dy: 0 };
  let mouseDown = false;
  const input = {
    move: { x: 0, z: 0 }, look, sprint: false, crouch: false, interactHeld: false, interactDown: false,
    pressed, released, keys, mouseDown: false, locked: false, enabled: true,
    isDown: (code) => keys.has(code),
    consume(code) { const had = pressed.has(code); pressed.delete(code); return had; },
    poll() {
      const m = input.move; m.x = 0; m.z = 0;
      if (!input.enabled) { pressed.clear(); released.clear(); look.dx = look.dy = 0; return; }
      if (keys.has('KeyW') || keys.has('ArrowUp')) m.z -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) m.z += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) m.x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) m.x += 1;
      input.sprint = keys.has('ShiftLeft') || keys.has('ShiftRight');
      input.crouch = keys.has('KeyC') || keys.has('ControlLeft');
      input.interactHeld = keys.has('KeyE') || mouseDown;
      input.interactDown = pressed.has('KeyE') || pressed.has('Mouse0');
      input.mouseDown = mouseDown;
    },
    /** Clear per-frame edges — call at the END of the frame (ui/player consume during it). */
    endFrame() { pressed.clear(); released.clear(); look.dx = 0; look.dy = 0; },
    attach(el = window) {
      if (typeof window === 'undefined') return;
      el.addEventListener('keydown', (e) => {
        if (e.repeat) return;
        keys.add(e.code); pressed.add(e.code);
        if (['Tab', 'Space', 'KeyF', 'KeyZ', 'KeyN', 'KeyQ', 'KeyT', 'F3', 'BracketLeft', 'BracketRight'].includes(e.code)) e.preventDefault();
      });
      el.addEventListener('keyup', (e) => { keys.delete(e.code); released.add(e.code); });
      window.addEventListener('blur', () => { keys.clear(); mouseDown = false; });
      document.addEventListener('mousemove', (e) => { if (input.locked) { look.dx += e.movementX || 0; look.dy += e.movementY || 0; } });
      document.addEventListener('mousedown', (e) => { if (e.button === 0) { mouseDown = true; pressed.add('Mouse0'); } });
      document.addEventListener('mouseup', (e) => { if (e.button === 0) { mouseDown = false; released.add('Mouse0'); } });
      document.addEventListener('pointerlockchange', () => { input.locked = document.pointerLockElement != null; });
    },
  };
  if (target) input.attach(target);
  return input;
}

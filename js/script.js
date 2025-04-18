// js/script.js

document.addEventListener('DOMContentLoaded', () => {
    const CANVAS_SIZE  = 192;
    const FINAL_WIDTH  = 512;
    const FINAL_HEIGHT = 256;
    const MAX_HISTORY  = 50;
  
    // Main canvas & context
    const canvas = document.getElementById('editor-canvas');
    const ctx    = canvas.getContext('2d');
  
    // Preview canvas & context
    const previewCanvas = document.getElementById('preview-canvas');
    const previewCtx    = previewCanvas.getContext('2d');
  
    // State
    let currentTool   = 'pen';
    let brushSize     = 16;
    let brushColor    = '#ff0000';
    let currentLayer  = 'body';
    let showTemplate  = false;
    let showBounds    = false;
    let isDrawing     = false;
  
    // History stack for undo
    const history = [];
  
    // Bounds for each layer (x, y, w, h)
    const boundsMap = {
      'body':        [  0,   0, 192, 192],
      'body-shadow': [  0,   0, 192, 192],
      'hand':        [126,  63,  64,  64],
      'hand-shadow': [126,  63,  64,  64],
      'foot':        [ 52, 108, 128,  64],
      'foot-shadow': [ 52, 108, 128,  64]
    };
  
    // Layer names & off‑screen canvases
    const layerNames = [
      'body','body-shadow',
      'hand','hand-shadow',
      'foot','foot-shadow',
      'eye-1','eye-2','eye-3','eye-4','eye-5','eye-6'
    ];
    const layers = {};
    layerNames.forEach(name => {
      const off = document.createElement('canvas');
      off.width = off.height = CANVAS_SIZE;
      layers[name] = off.getContext('2d');
    });
  
    // Load template overlay
    const templateImage = new Image();
    templateImage.src = '/assets/template.png';
    templateImage.onload = () => {
      redrawCanvas();
    };
  
    // UI elements
    const penBtn      = document.getElementById('pen-btn');
    const eraserBtn   = document.getElementById('eraser-btn');
    const bucketBtn   = document.getElementById('bucket-btn');
    const brushInput  = document.getElementById('brush-size');
    const brushValueDisplay = document.getElementById('brush-size-value');
    const colorInput  = document.getElementById('color-picker');
    const layerSelect = document.getElementById('layer-select');
    const templateBtn = document.getElementById('template-btn');
    const boundsBtn   = document.getElementById('toggle-bounds');
    const undoBtn     = document.getElementById('undo-btn');
    const downloadBtn = document.getElementById('download-btn');

  
    // --- History ---
    function snapshot() {
      const snap = {};
      layerNames.forEach(name => {
        snap[name] = layers[name].getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      });
      history.push(snap);
      if (history.length > MAX_HISTORY) history.shift();
    }
  
    function undo() {
      if (!history.length) return;
      const snap = history.pop();
      layerNames.forEach(name => {
        layers[name].putImageData(snap[name], 0, 0);
      });
      redrawCanvas();
    }
  
    undoBtn.addEventListener('click', undo);
    window.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      }
    });
  
    // --- Tool bindings ---
    penBtn.addEventListener('click',    () => { currentTool = 'pen';    redrawCanvas(); });
    eraserBtn.addEventListener('click', () => { currentTool = 'eraser'; redrawCanvas(); });
    bucketBtn.addEventListener('click', () => { currentTool = 'bucket'; redrawCanvas(); });
    brushInput.addEventListener('input', e => {
        brushSize = +e.target.value;
        brushValueDisplay.textContent = brushSize;
      });
    colorInput.addEventListener('input', e => brushColor = e.target.value);
    layerSelect.addEventListener('change', e => {
      currentLayer = e.target.value;
      redrawCanvas();
    });
    templateBtn.addEventListener('click', () => {
      showTemplate = !showTemplate;
      redrawCanvas();
    });
    boundsBtn.addEventListener('click', () => {
      showBounds = !showBounds;
      redrawCanvas();
    });
    downloadBtn.addEventListener('click', exportTexture);
  
    // Pointer events
    canvas.addEventListener('mousedown', e => {
      if (currentTool === 'bucket') {
        snapshot();
        handleBucket(e);
      } else {
        snapshot();
        isDrawing = true;
      }
    });
    window.addEventListener('mouseup',   () => { isDrawing = false; });
    canvas.addEventListener('mousemove', handleDraw);
  
    // --- Bounds helper ---
    function getBounds(layerName) {
      if (layerName.startsWith('eye-')) {
        return { x: 72, y: 52, w: 64, h: 64 };
      }
      const def = boundsMap[layerName];
      if (def) {
        const [x, y, w, h] = def;
        return { x, y, w, h };
      }
      return { x: 0, y: 0, w: CANVAS_SIZE, h: CANVAS_SIZE };
    }
  
    // --- Drawing (pen/eraser) ---
    function handleDraw(evt) {
      if (!isDrawing || currentTool === 'bucket') return;
  
      const rect = canvas.getBoundingClientRect();
      const x = (evt.clientX - rect.left) * (canvas.width / rect.width);
      const y = (evt.clientY - rect.top)  * (canvas.height / rect.height);
      const { x: bx, y: by, w: bw, h: bh } = getBounds(currentLayer);
      if (x < bx || x > bx + bw || y < by || y > by + bh) return;
  
      const ctxLayer = layers[currentLayer];
      const r = brushSize / 2;
  
      ctxLayer.beginPath();
      ctxLayer.arc(x, y, r, 0, 2 * Math.PI);
      if (currentTool === 'eraser') {
        ctxLayer.save();
        ctxLayer.globalCompositeOperation = 'destination-out';
        ctxLayer.fill();
        ctxLayer.restore();
      } else {
        ctxLayer.fillStyle = brushColor;
        ctxLayer.fill();
      }
  
      redrawCanvas();
    }
  
    // --- Bucket fill ---
    function handleBucket(evt) {
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((evt.clientX - rect.left) * (canvas.width / rect.width));
      const y = Math.floor((evt.clientY - rect.top)  * (canvas.height / rect.height));
      const { x: bx, y: by, w: bw, h: bh } = getBounds(currentLayer);
      if (x < bx || x > bx + bw || y < by || y > by + bh) return;
  
      const ctxLayer = layers[currentLayer];
      floodFill(ctxLayer, x, y, brushColor, bx, by, bw, bh);
      redrawCanvas();
    }
  
    function floodFill(ctxLayer, startX, startY, fillHex, bx, by, bw, bh) {
      const img = ctxLayer.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      const data = img.data;
      const w = img.width, h = img.height;
      const idx = (startY * w + startX) * 4;
      const target = data.slice(idx, idx + 4);
      const fill = hexToRgba(fillHex);
  
      // no-op if same
      if (target[0] === fill[0] && target[1] === fill[1] &&
          target[2] === fill[2] && target[3] === fill[3]) {
        return;
      }
  
      const visited = new Uint8Array(w * h);
      const stack = [[startX, startY]];
  
      while (stack.length) {
        const [cx, cy] = stack.pop();
        if (cx < bx || cx >= bx + bw || cy < by || cy >= by + bh) continue;
        const i = cy * w + cx;
        if (visited[i]) continue;
        const off = i * 4;
        if (data[off]   === target[0] &&
            data[off+1] === target[1] &&
            data[off+2] === target[2] &&
            data[off+3] === target[3]) {
          // fill
          data[off]   = fill[0];
          data[off+1] = fill[1];
          data[off+2] = fill[2];
          data[off+3] = fill[3];
          visited[i] = 1;

        stack.push(
            [cx+1, cy],
            [cx-1, cy],
            [cx, cy+1],
            [cx, cy-1],
            [cx+1, cy+1],
            [cx-1, cy+1],
            [cx+1, cy-1],
            [cx-1, cy-1]
          );
  
        }
      }
  
      ctxLayer.putImageData(img, 0, 0);
    }
  
    function hexToRgba(hex) {
      const v = hex.replace('#', '');
      return [
        parseInt(v.slice(0,2),16),
        parseInt(v.slice(2,4),16),
        parseInt(v.slice(4,6),16),
        255
      ];
    }
  
    // --- Redraw editor & preview ---
    function redrawCanvas() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
  
      if (showTemplate && templateImage.complete) {
        ctx.globalAlpha = 0.3;
        ctx.drawImage(templateImage, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;
      }
  
      layerNames.forEach(name => {
        ctx.globalAlpha = (name === currentLayer ? 1.0 : 0.2);
        ctx.drawImage(layers[name].canvas, 0, 0, canvas.width, canvas.height);
      });
      ctx.globalAlpha = 1.0;
  
      if (showBounds) {
        const b = getBounds(currentLayer);
        ctx.save();
        ctx.strokeStyle = 'red';
        ctx.lineWidth   = 2;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(
          (b.x / CANVAS_SIZE) * canvas.width,
          (b.y / CANVAS_SIZE) * canvas.height,
          (b.w / CANVAS_SIZE) * canvas.width,
          (b.h / CANVAS_SIZE) * canvas.height
        );
        ctx.restore();
      }
  
      redrawPreview();
    }
  
    function redrawPreview() {
        previewCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      
        // 1) All shadows behind
        previewCtx.drawImage(layers['body-shadow'].canvas, 0, 0);
        previewCtx.drawImage(layers['hand-shadow'].canvas, 0, 0);
        previewCtx.drawImage(layers['foot-shadow'].canvas, 0, 0);
      
        // 2) Hand behind body
        previewCtx.drawImage(layers['hand'].canvas, 0, 0);
      
        // 3) Back foot (left half of foot region), behind body
        const fb = getBounds('foot');       // { x:52, y:108, w:128, h:64 }
        const halfW = fb.w / 2;            // 64
        previewCtx.drawImage(
          layers['foot'].canvas,
          fb.x, fb.y,        halfW, fb.h,  // source: left half
          fb.x, fb.y,        halfW, fb.h   // dest: same position
        );
      
        // 4) Body
        previewCtx.drawImage(layers['body'].canvas, 0, 0);
      
        // 5) Front foot (right half), in front of body
        previewCtx.drawImage(
          layers['foot'].canvas,
          fb.x + halfW, fb.y, halfW, fb.h,  // source: right half
          fb.x + halfW, fb.y, halfW, fb.h   // dest
        );
    
        // 6) Eyes on top
        for (let i = 1; i <= 6; i++) {
          previewCtx.drawImage(layers[`eye-${i}`].canvas, 0, 0);
        }
      }
      
  
    // --- Export ---
    function exportLayer(finalCtx, layerName, dx, dy) {
      const b = getBounds(layerName);
      finalCtx.drawImage(
        layers[layerName].canvas,
        b.x, b.y, b.w, b.h,
        dx,  dy,  b.w, b.h
      );
    }
  
    function exportTexture() {
      const finalCanvas = document.createElement('canvas');
      finalCanvas.width  = FINAL_WIDTH;
      finalCanvas.height = FINAL_HEIGHT;
      const finalCtx = finalCanvas.getContext('2d');
  
      // Shadows
      exportLayer(finalCtx, 'body-shadow', 192,   0);
      exportLayer(finalCtx, 'hand-shadow', 448,   0);
      exportLayer(finalCtx, 'foot-shadow', 384, 128);
  
      // Body
      exportLayer(finalCtx, 'body',        0,     0);
  
      // Foreground
      exportLayer(finalCtx, 'hand',        384,   0);
      exportLayer(finalCtx, 'foot',        384,  64);
  
      // Eyes (right-to-left)
      for (let i = 0; i < 6; i++) {
        exportLayer(finalCtx, `eye-${i+1}`, 448 - i*64, 192);
      }
  
      finalCanvas.toBlob(blob => {
        if (!blob) return;
        const link = document.createElement('a');
        link.download = 'ddnet_skin.png';
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
      });
    }
  
    // Initial render
    redrawCanvas();
  });
  
// js/script.js

document.addEventListener('DOMContentLoaded', () => {
    const CANVAS_SIZE  = 192;
    const FINAL_WIDTH  = 512;
    const FINAL_HEIGHT = 256;
    const MAX_HISTORY  = 50;
    const previewCanvas = document.getElementById('preview-canvas');
    const previewCtx    = previewCanvas.getContext('2d');

  
    // Main canvas & context
    const canvas = document.getElementById('editor-canvas');
    const ctx    = canvas.getContext('2d');
  
    // State
    let currentTool   = 'pen';
    let brushSize     = 16;
    let brushColor    = '#ff0000';
    let currentLayer  = 'body';
    let showTemplate  = false;
    let showBounds    = false;
    let isDrawing     = false;
  
    // History stack
    const history = [];
  
    // Pre‑define bounds for each layer
    const boundsMap = {
      'body':        [  0,   0, 192, 192],
      'body-shadow': [  0,   0, 192, 192],
      'hand':        [128,  64,  64,  64],
      'hand-shadow': [128,  64,  64,  64],
      'foot':        [ 32, 128, 128,  64],
      'foot-shadow': [ 32, 128, 128,  64]
    };
  
    // Create off‑screen canvases for each layer
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
    templateImage.onload = redrawCanvas;
  
    // UI elements
    const penBtn      = document.getElementById('pen-btn');
    const eraserBtn   = document.getElementById('eraser-btn');
    const brushInput  = document.getElementById('brush-size');
    const colorInput  = document.getElementById('color-picker');
    const layerSelect = document.getElementById('layer-select');
    const templateBtn = document.getElementById('template-btn');
    const boundsBtn   = document.getElementById('toggle-bounds');
    const undoBtn     = document.getElementById('undo-btn');
    const downloadBtn = document.getElementById('download-btn');
  
    // --- History management ---
    function snapshot() {
      // Capture current state of all layers
      const snap = {};
      layerNames.forEach(name => {
        snap[name] = layers[name].getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      });
      history.push(snap);
      if (history.length > MAX_HISTORY) history.shift();
    }
  
    function undo() {
      if (history.length === 0) return;
      const snap = history.pop();
      layerNames.forEach(name => {
        layers[name].putImageData(snap[name], 0, 0);
      });
      redrawCanvas();
    }
  
    // Bind Undo button and Ctrl+Z
    undoBtn.addEventListener('click', undo);
    window.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }
    });
  
    // --- Tool & UI bindings ---
    penBtn.addEventListener('click',    () => { currentTool = 'pen';    redrawCanvas(); });
    eraserBtn.addEventListener('click', () => { currentTool = 'eraser'; redrawCanvas(); });
    brushInput.addEventListener('input', e => brushSize = +e.target.value);
    colorInput.addEventListener('input', e => brushColor = e.target.value);
    layerSelect.addEventListener('change', e => { currentLayer = e.target.value; redrawCanvas(); });
    templateBtn.addEventListener('click', () => { showTemplate = !showTemplate; redrawCanvas(); });
    boundsBtn.addEventListener('click',   () => { showBounds = !showBounds;   redrawCanvas(); });
    downloadBtn.addEventListener('click', exportTexture);
  
    // Capture snapshot at stroke start
    canvas.addEventListener('mousedown', () => { snapshot(); isDrawing = true; });
    window.addEventListener('mouseup',   () => { isDrawing = false; });
  
    // Draw on mousemove
    canvas.addEventListener('mousemove', handleDraw);
  
    // --- Drawing logic ---
    function getBounds(layerName) {
      if (layerName.startsWith('eye-')) {
        return { x: 64, y: 64, w: 64, h: 64 };
      }
      const [x, y, w, h] = boundsMap[layerName] || [0, 0, CANVAS_SIZE, CANVAS_SIZE];
      return { x, y, w, h };
    }
  
    function handleDraw(evt) {
      if (!isDrawing) return;
  
      const rect = canvas.getBoundingClientRect();
      const x = (evt.clientX - rect.left) * (canvas.width / rect.width);
      const y = (evt.clientY - rect.top)  * (canvas.height / rect.height);
      const { x: bx, y: by, w: bw, h: bh } = getBounds(currentLayer);
  
      // Only draw inside bounds
      if (x < bx || x > bx + bw || y < by || y > by + bh) return;
  
      const ctxLayer = layers[currentLayer];
      const radius   = brushSize / 2;
  
      ctxLayer.beginPath();
      ctxLayer.arc(x, y, radius, 0, 2 * Math.PI);
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
  
    function redrawCanvas() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
  
      // Template underlay
      if (showTemplate && templateImage.complete) {
        ctx.globalAlpha = 0.3;
        ctx.drawImage(templateImage, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1.0;
      }
  
      // Draw layers (highlight active)
      layerNames.forEach(name => {
        ctx.globalAlpha = (name === currentLayer ? 1.0 : 0.2);
        ctx.drawImage(layers[name].canvas, 0, 0, canvas.width, canvas.height);
      });
      ctx.globalAlpha = 1.0;
  
      // Draw bounds if active
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
        // clear preview
        previewCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      
        // draw in-game layer order:
        // shadows behind…
        previewCtx.drawImage(layers['body-shadow'].canvas, 0, 0);
        previewCtx.drawImage(layers['hand-shadow'].canvas, 0, 0);
        previewCtx.drawImage(layers['foot-shadow'].canvas, 0, 0);
      
        // then body…
        previewCtx.drawImage(layers['body'].canvas, 0, 0);
      
        // then foreground parts…
        previewCtx.drawImage(layers['hand'].canvas, 0, 0);
        previewCtx.drawImage(layers['foot'].canvas, 0, 0);
      
        // finally all eyes (1…6) overlaid
        for (let i = 1; i <= 6; i++) {
          previewCtx.drawImage(layers[`eye-${i}`].canvas, 0, 0);
        }
      }
  
    // --- Export ---
    function exportLayer(finalCtx, layerName, dx, dy) {
      const { x, y, w, h } = getBounds(layerName);
      finalCtx.drawImage(
        layers[layerName].canvas,
        x, y, w, h,
        dx, dy, w, h
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
  
      // Eyes (6 variants, right‐to‐left)
      for (let i = 0; i < 6; i++) {
        exportLayer(finalCtx, `eye-${i + 1}`, 448 - i * 64, 192);
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
  
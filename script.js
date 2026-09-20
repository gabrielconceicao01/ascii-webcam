// ===== Elementos =====
const video       = document.getElementById('video');
const asciiCanvas = document.getElementById('ascii-canvas');
const hiddenCanvas= document.getElementById('hidden-canvas');

const ctx       = asciiCanvas.getContext('2d');
const hiddenCtx = hiddenCanvas.getContext('2d', { willReadFrequently: true });

// ===== Config =====
// do mais escuro ao mais claro (ou inverta pra efeito negativo)
const CHAR_RAMP = '@%#*+=-:. ';

const CHAR_WIDTH  = 8;   // largura de cada célula em px no canvas final
const CHAR_HEIGHT = 14;  // altura de cada célula
const FONT_SIZE   = 14;

let colorMode   = false;
let resolution  = 100;
let videoReady  = false;

// pra medir FPS
let lastTime = performance.now();
let frames   = 0;

// ===== Inicialização =====
async function init() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false
    });
    video.srcObject = stream;

    video.onloadedmetadata = () => {
      video.play();
      videoReady = true;
      requestAnimationFrame(render);
    };
  } catch (err) {
    console.error(err);
    document.body.innerHTML =
      '<p style="color:#f55;padding:40px;font-family:monospace">' +
      '❌ Não consegui acessar a câmera. Permita o acesso e recarregue.</p>';
  }
}

// ===== Loop principal =====
function render() {
  if (!videoReady) return;

  // --- Calcula dimensões mantendo o aspect ratio ---
  const videoAspect = video.videoWidth / video.videoHeight;
  const charAspect  = CHAR_WIDTH / CHAR_HEIGHT;

  const cols = resolution;
  const rows = Math.floor(cols * charAspect / videoAspect);

  // --- Desenha o vídeo reduzido no canvas oculto ---
  hiddenCanvas.width  = cols;
  hiddenCanvas.height = rows;
  hiddenCtx.drawImage(video, 0, 0, cols, rows);

  // --- Lê os pixels ---
  const imageData = hiddenCtx.getImageData(0, 0, cols, rows);
  const pixels    = imageData.data;

  // --- Prepara o canvas visível ---
  const outW = cols * CHAR_WIDTH;
  const outH = rows * CHAR_HEIGHT;

  if (asciiCanvas.width !== outW || asciiCanvas.height !== outH) {
    asciiCanvas.width  = outW;
    asciiCanvas.height = outH;
  }

  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, outW, outH);

  ctx.font = `${FONT_SIZE}px 'Courier New', monospace`;
  ctx.textBaseline = 'top';

  // --- Converte pixel → caractere ---
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];

      // luminância (padrão ITU-R BT.601)
      const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      const charIndex = Math.min(
        CHAR_RAMP.length - 1,
        Math.floor(brightness * CHAR_RAMP.length)
      );
      const char = CHAR_RAMP[charIndex];

      if (colorMode) {
        ctx.fillStyle = `rgb(${r},${g},${b})`;
      } else {
        const intensity = Math.floor(brightness * 255);
        ctx.fillStyle = `rgb(0, ${intensity}, 0)`;
      }

      ctx.fillText(char, x * CHAR_WIDTH, y * CHAR_HEIGHT);
    }
  }

  updateFPS();
  requestAnimationFrame(render);
}

// ===== FPS =====
function updateFPS() {
  frames++;
  const now = performance.now();
  if (now - lastTime >= 1000) {
    document.getElementById('fps').textContent = frames + ' fps';
    frames = 0;
    lastTime = now;
  }
}

// ===== Controles =====
document.getElementById('resolution').addEventListener('input', (e) => {
  resolution = parseInt(e.target.value, 10);
  document.getElementById('resolution-value').textContent = resolution;
});

document.getElementById('toggle-color').addEventListener('click', (e) => {
  colorMode = !colorMode;
  e.target.textContent = colorMode ? '🟢 Modo Verde' : '🎨 Modo Cor';
});

document.getElementById('snapshot').addEventListener('click', () => {
  const link = document.createElement('a');
  link.download = `ascii-webcam-${Date.now()}.png`;
  link.href = asciiCanvas.toDataURL('image/png');
  link.click();
});

// ===== Vai! =====
init();
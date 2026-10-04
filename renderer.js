const recordButton = document.getElementById("recordButton");
const stopButton = document.getElementById("stopButton");
const saveButton = document.getElementById("saveButton");

const screenPreview = document.getElementById("screenPreview");
const gifPreview = document.getElementById("gifPreview");
const emptyPreview = document.getElementById("emptyPreview");

const recordBadge = document.getElementById("recordBadge");

const timeValue = document.getElementById("timeValue");
const frameValue = document.getElementById("frameValue");
const mouseValue = document.getElementById("mouseValue");
const sizeValue = document.getElementById("sizeValue");

const fpsSelect = document.getElementById("fpsSelect");

const biteSelect = document.getElementById("biteSelect");
const widthSelect = document.getElementById("widthSelect");

const statusPill = document.getElementById("statusPill");
const statusText = document.getElementById("statusText");

const message = document.getElementById("message");

const captureCanvas = document.getElementById("captureCanvas");
const captureCtx = captureCanvas.getContext("2d", {
  willReadFrequently: true
});

// ----------------------------------------------------------
// PB&J FACTORY
// ----------------------------------------------------------

const factoryOverlay =
  document.getElementById("factoryOverlay");

const factoryStage =
  document.getElementById("factoryStage");

const factoryDetail =
  document.getElementById("factoryDetail");

const factoryProgress =
  document.getElementById("factoryProgress");

const factoryPercent =
  document.getElementById("factoryPercent");

const factoryEta =
  document.getElementById("factoryEta");

const peanutSpread =
  document.getElementById("peanutSpread");

const jellySpread =
  document.getElementById("jellySpread");

const breadTop =
  document.getElementById("breadTop");

const sparkles =
  document.getElementById("sparkles");

const sandwichScene =
  document.querySelector(".sandwich-scene");

let factoryStartedAt = 0;
let factoryLastProgress = 0;

function getBitePreset() {
  switch (biteSelect.value) {

    case "light":
      return {
        name: "LIGHT BITE",
        quality: 18,
        workers: 2
      };

    case "chunky":
      return {
        name: "EXTRA CHUNKY",
        quality: 5,
        workers: Math.max(
          2,
          Math.min(
            4,
            navigator.hardwareConcurrency || 2
          )
        )
      };

    case "smooth":
    default:
      return {
        name: "SMOOTH BITE",
        quality: 10,
        workers: Math.max(
          2,
          Math.min(
            4,
            navigator.hardwareConcurrency || 2
          )
        )
      };
  }
}
function formatEta(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "calculating…";
  }

  if (seconds < 1) {
    return "almost done…";
  }

  if (seconds < 60) {
    return `about ${Math.ceil(seconds)} sec left`;
  }

  const minutes = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);

  return `about ${minutes}m ${secs}s left`;
}

function openFactory() {
  factoryStartedAt = performance.now();
  factoryLastProgress = 0;

  factoryOverlay.classList.add("active");

  factoryProgress.style.width = "0%";
  factoryPercent.textContent = "0%";
  factoryEta.textContent = "warming up…";

  peanutSpread.style.transform = "scaleX(0)";
  jellySpread.style.transform = "scaleX(0)";

  breadTop.classList.remove("drop");
  sparkles.classList.remove("show");
  sandwichScene.classList.remove("done");
}

function closeFactory() {
  factoryOverlay.classList.remove("active");
}

function updateFactory(
  overall,
  stage,
  detail,
  options = {}
) {
  const safe = Math.max(
    0,
    Math.min(1, overall)
  );

  factoryLastProgress = Math.max(
    factoryLastProgress,
    safe
  );

  const pct = Math.round(
    factoryLastProgress * 100
  );

  factoryProgress.style.width = `${pct}%`;
  factoryPercent.textContent = `${pct}%`;

  factoryStage.textContent = stage;
  factoryDetail.textContent = detail;

  /*
    ETA is based on observed throughput rather than a
    predetermined animation duration.
  */
  const elapsed =
    (performance.now() - factoryStartedAt) / 1000;

  if (
    factoryLastProgress > 0.04 &&
    factoryLastProgress < 0.995
  ) {
    const totalEstimate =
      elapsed / factoryLastProgress;

    const remaining =
      totalEstimate - elapsed;

    factoryEta.textContent =
      formatEta(remaining);
  } else if (factoryLastProgress >= 0.995) {
    factoryEta.textContent = "finishing touches…";
  } else {
    factoryEta.textContent = "calculating…";
  }

  if (options.peanut !== undefined) {
    peanutSpread.style.transform =
      `scaleX(${Math.max(0, Math.min(1, options.peanut))})`;
  }

  if (options.jelly !== undefined) {
    jellySpread.style.transform =
      `scaleX(${Math.max(0, Math.min(1, options.jelly))})`;
  }

  if (options.topBread) {
    breadTop.classList.add("drop");
  }

  if (options.sparkles) {
    sparkles.classList.add("show");
  }
}

function finishFactory() {
  updateFactory(
    1,
    "FRESHLY BAKED",
    "Your GIF is freshly baked.",
    {
      peanut: 1,
      jelly: 1,
      topBread: true,
      sparkles: true
    }
  );

  factoryEta.textContent = "done ✨";
  sandwichScene.classList.add("done");
}

let stream = null;
let recorder = null;

let chunks = [];
let recording = false;

let startedAt = 0;

// Authoritative duration owned by Peanut Butter.
// Do NOT depend on MediaRecorder/WebM metadata for this.
let recordedDurationMs = 0;

let timerHandle = null;
let cursorHandle = null;

let approximateFrames = 0;
let currentGifBytes = null;
let currentGifUrl = null;

let screenInfo = null;

function setStatus(mode, text) {
  statusPill.className = `status-pill ${mode}`;
  statusText.textContent = text;
}

function formatTime(ms) {
  const total = ms / 1000;
  const minutes = Math.floor(total / 60);
  const seconds = Math.floor(total % 60);
  const tenths = Math.floor((total % 1) * 10);

  return (
    String(minutes).padStart(2, "0") +
    ":" +
    String(seconds).padStart(2, "0") +
    "." +
    tenths
  );
}

function formatBytes(bytes) {
  if (!bytes) return "—";

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function resetPreview() {
  if (currentGifUrl) {
    URL.revokeObjectURL(currentGifUrl);
    currentGifUrl = null;
  }

  currentGifBytes = null;

  gifPreview.removeAttribute("src");
  gifPreview.style.display = "none";

  screenPreview.style.display = "none";
  emptyPreview.style.display = "flex";

  sizeValue.textContent = "—";
  frameValue.textContent = "0";
  timeValue.textContent = "00:00.0";
  mouseValue.textContent = "—";
}

async function createScreenStream() {
  screenInfo = await window.peanut.getScreenSource();

  const constraints = {
    audio: false,

    video: {
      mandatory: {
        chromeMediaSource: "desktop",
        chromeMediaSourceId: screenInfo.id,

        maxWidth: screenInfo.width,
        maxHeight: screenInfo.height,

        maxFrameRate: 30
      }
    }
  };

  return navigator.mediaDevices.getUserMedia(constraints);
}

async function updateCursor() {
  try {
    const p = await window.peanut.getCursor();

    mouseValue.textContent = `${p.x}, ${p.y}`;
  } catch {
    mouseValue.textContent = "—";
  }
}

function beginCounters() {
  timerHandle = setInterval(() => {
    if (!recording) return;

    const elapsed = Date.now() - startedAt;
    const fps = Number(fpsSelect.value);

    approximateFrames = Math.floor(
      elapsed / (1000 / fps)
    );

    timeValue.textContent = formatTime(elapsed);
    frameValue.textContent = approximateFrames;
  }, 50);

  cursorHandle = setInterval(updateCursor, 60);
}

function stopCounters() {
  clearInterval(timerHandle);
  clearInterval(cursorHandle);

  timerHandle = null;
  cursorHandle = null;
}

async function startRecording() {
  try {
    resetPreview();

    recordButton.disabled = true;
    stopButton.disabled = true;
    saveButton.disabled = true;

    fpsSelect.disabled = true;
    widthSelect.disabled = true;
    biteSelect.disabled = true;

    message.textContent = "Warming up the peanut press…";
    setStatus("baking", "GETTING STICKY");

    stream = await createScreenStream();

    screenPreview.srcObject = stream;
    screenPreview.style.display = "block";
    emptyPreview.style.display = "none";

    await screenPreview.play();

    const fps = Number(fpsSelect.value);

    let mimeType = "";

    const candidates = [
      "video/webm;codecs=vp9",
      "video/webm;codecs=vp8",
      "video/webm"
    ];

    for (const candidate of candidates) {
      if (MediaRecorder.isTypeSupported(candidate)) {
        mimeType = candidate;
        break;
      }
    }

    chunks = [];

    recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined
    );

    recorder.ondataavailable = event => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    recorder.onstop = bakeGif;

    recorder.start(250);

    recording = true;
    startedAt = Date.now();
    recordedDurationMs = 0;
    approximateFrames = 0;

    beginCounters();

    recordBadge.style.display = "flex";

    recordButton.disabled = true;
    stopButton.disabled = false;

    setStatus("recording", "RECORDING");
    message.textContent =
      "Go wiggle that mouse. Peanut Butter is watching the screen.";
  } catch (error) {
    console.error(error);

    cleanupStream();

    recording = false;

    recordButton.disabled = false;
    stopButton.disabled = true;

    fpsSelect.disabled = false;
    widthSelect.disabled = false;
    biteSelect.disabled = false;

    setStatus("idle", "CAPTURE ERROR");

    message.textContent =
      `Could not start screen capture: ${error.message}`;
  }
}

function stopRecording() {
  if (!recording) return;

  // Freeze our own clock BEFORE changing recorder state.
  // This is the duration source of truth.
  recordedDurationMs = Math.max(
    1,
    Date.now() - startedAt
  );

  recording = false;

  stopButton.disabled = true;

  stopCounters();

  timeValue.textContent = formatTime(recordedDurationMs);

  recordBadge.style.display = "none";

  setStatus("baking", "BAKING GIF");
  message.textContent =
    "Peanut Butter is making you a sandwich…";

  openFactory();

  updateFactory(
    0.02,
    "GETTING THE BREAD",
    "Opening the recording…"
  );

  if (recorder && recorder.state !== "inactive") {
    recorder.stop();
  }
}

function cleanupStream() {
  if (stream) {
    for (const track of stream.getTracks()) {
      track.stop();
    }
  }

  stream = null;
  screenPreview.srcObject = null;
}

async function blobToVideo(blob) {
  const url = URL.createObjectURL(blob);

  const video = document.createElement("video");

  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;

  await new Promise((resolve, reject) => {
    video.onloadedmetadata = resolve;
    video.onerror = () =>
      reject(new Error("Recorded video could not be decoded."));
  });

  return {
    video,
    url
  };
}

function seekVideo(video, time) {
  return new Promise((resolve, reject) => {
    const done = () => {
      video.removeEventListener("seeked", done);
      resolve();
    };

    video.addEventListener("seeked", done, { once: true });

    try {
      video.currentTime = time;
    } catch (error) {
      reject(error);
    }
  });
}

function quantize(pixels, sample) {
  const palette = [];

  const buckets = new Map();

  const step = Math.max(1, sample || 10);

  for (let i = 0; i < pixels.length; i += 4 * step) {
    const r = pixels[i] >> 3;
    const g = pixels[i + 1] >> 3;
    const b = pixels[i + 2] >> 3;

    const key = (r << 10) | (g << 5) | b;

    buckets.set(
      key,
      (buckets.get(key) || 0) + 1
    );
  }

  const colors = [...buckets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 256);

  for (const [key] of colors) {
    const r = ((key >> 10) & 31) << 3;
    const g = ((key >> 5) & 31) << 3;
    const b = (key & 31) << 3;

    palette.push([r, g, b]);
  }

  while (palette.length < 256) {
    palette.push([0, 0, 0]);
  }

  return palette;
}

function nearestColorIndex(r, g, b, palette) {
  let best = 0;
  let bestDistance = Infinity;

  for (let i = 0; i < palette.length; i++) {
    const color = palette[i];

    const dr = r - color[0];
    const dg = g - color[1];
    const db = b - color[2];

    const distance =
      dr * dr +
      dg * dg +
      db * db;

    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;

      if (distance === 0) break;
    }
  }

  return best;
}

/*
  Tiny GIF writer.

  We deliberately use a global palette derived from the first frame.
  That keeps this first bake dependency-light and predictable.
*/

class ByteWriter {
  constructor() {
    this.bytes = [];
  }

  byte(value) {
    this.bytes.push(value & 255);
  }

  word(value) {
    this.byte(value);
    this.byte(value >> 8);
  }

  text(value) {
    for (let i = 0; i < value.length; i++) {
      this.byte(value.charCodeAt(i));
    }
  }

  array(values) {
    for (const value of values) {
      this.byte(value);
    }
  }

  result() {
    return new Uint8Array(this.bytes);
  }
}

function lzwEncode(indexes, minCodeSize) {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;

  let codeSize = minCodeSize + 1;
  let nextCode = endCode + 1;

  const dictionary = new Map();

  const resetDictionary = () => {
    dictionary.clear();

    for (let i = 0; i < clearCode; i++) {
      dictionary.set(String(i), i);
    }

    codeSize = minCodeSize + 1;
    nextCode = endCode + 1;
  };

  resetDictionary();

  const output = [];

  let currentByte = 0;
  let bitCount = 0;

  const writeCode = code => {
    currentByte |= code << bitCount;
    bitCount += codeSize;

    while (bitCount >= 8) {
      output.push(currentByte & 255);
      currentByte >>= 8;
      bitCount -= 8;
    }
  };

  writeCode(clearCode);

  let prefix = String(indexes[0]);

  for (let i = 1; i < indexes.length; i++) {
    const symbol = indexes[i];
    const combined = `${prefix},${symbol}`;

    if (dictionary.has(combined)) {
      prefix = combined;
      continue;
    }

    writeCode(dictionary.get(prefix));

    if (nextCode < 4096) {
      dictionary.set(combined, nextCode++);
      
      if (
        nextCode === (1 << codeSize) &&
        codeSize < 12
      ) {
        codeSize++;
      }
    } else {
      writeCode(clearCode);
      resetDictionary();
    }

    prefix = String(symbol);
  }

  writeCode(dictionary.get(prefix));
  writeCode(endCode);

  if (bitCount > 0) {
    output.push(currentByte & 255);
  }

  return new Uint8Array(output);
}

function makeGif(frames, width, height, fps) {
  if (!frames.length) {
    throw new Error("No GIF frames were captured.");
  }

  const writer = new ByteWriter();

  const firstPixels = frames[0].data;

  const palette = quantize(firstPixels, 5);

  writer.text("GIF89a");

  writer.word(width);
  writer.word(height);

  // Global color table, 256 colors.
  writer.byte(0xF7);
  writer.byte(0);
  writer.byte(0);

  for (const color of palette) {
    writer.byte(color[0]);
    writer.byte(color[1]);
    writer.byte(color[2]);
  }

  // Netscape infinite loop extension.
  writer.byte(0x21);
  writer.byte(0xFF);
  writer.byte(0x0B);
  writer.text("NETSCAPE2.0");
  writer.byte(0x03);
  writer.byte(0x01);
  writer.word(0);
  writer.byte(0);

  const delay = Math.max(
    1,
    Math.round(100 / fps)
  );

  for (let frameNumber = 0;
       frameNumber < frames.length;
       frameNumber++) {

    const pixels = frames[frameNumber].data;

    const indexes = new Uint8Array(width * height);

    let pixelIndex = 0;

    for (let i = 0; i < pixels.length; i += 4) {
      indexes[pixelIndex++] =
        nearestColorIndex(
          pixels[i],
          pixels[i + 1],
          pixels[i + 2],
          palette
        );
    }

    // Graphic Control Extension
    writer.byte(0x21);
    writer.byte(0xF9);
    writer.byte(0x04);
    writer.byte(0x00);
    writer.word(delay);
    writer.byte(0);
    writer.byte(0);

    // Image descriptor
    writer.byte(0x2C);
    writer.word(0);
    writer.word(0);
    writer.word(width);
    writer.word(height);
    writer.byte(0);

    const minimumCodeSize = 8;

    writer.byte(minimumCodeSize);

    const compressed =
      lzwEncode(indexes, minimumCodeSize);

    for (let offset = 0;
         offset < compressed.length;
         offset += 255) {

      const block =
        compressed.slice(offset, offset + 255);

      writer.byte(block.length);
      writer.array(block);
    }

    writer.byte(0);

    message.textContent =
      `Baking frame ${frameNumber + 1} / ${frames.length}…`;
  }

  writer.byte(0x3B);

  return writer.result();
}

async function bakeGif() {
  let recordingUrl = null;

  try {
    cleanupStream();

    const blob = new Blob(chunks, {
      type: recorder?.mimeType || "video/webm"
    });

    if (!blob.size) {
      throw new Error("The recording contained no video data.");
    }

    const loaded = await blobToVideo(blob);

    const video = loaded.video;
    recordingUrl = loaded.url;

    /*
      MediaRecorder WebM blobs may report Infinity/NaN duration
      because their final metadata/index is not guaranteed to
      contain a conventional duration.

      Peanut Butter already measured the recording itself, so
      THAT clock is authoritative.
    */
    const metadataDuration = video.duration;

    const duration =
      recordedDurationMs > 0
        ? recordedDurationMs / 1000
        : (
            Number.isFinite(metadataDuration) &&
            metadataDuration > 0
              ? metadataDuration
              : 0
          );

    if (duration <= 0) {
      throw new Error(
        "Peanut Butter lost its recording clock."
      );
    }

    const fps = Number(fpsSelect.value);
    const targetWidth = Number(widthSelect.value);

    const sourceWidth = video.videoWidth;
    const sourceHeight = video.videoHeight;

    const targetHeight = Math.max(
      2,
      Math.round(
        targetWidth * sourceHeight / sourceWidth
      )
    );

    captureCanvas.width = targetWidth;
    captureCanvas.height = targetHeight;

    const frameCount = Math.max(
      1,
      Math.floor(duration * fps)
    );

    const frames = [];

    for (let i = 0; i < frameCount; i++) {
      const t = Math.min(
        i / fps,
        Math.max(0, duration - 0.001)
      );

      await seekVideo(video, t);

      captureCtx.drawImage(
        video,
        0,
        0,
        targetWidth,
        targetHeight
      );

      frames.push(
        captureCtx.getImageData(
          0,
          0,
          targetWidth,
          targetHeight
        )
      );

      frameValue.textContent = `${i + 1}/${frameCount}`;

      /*
        Extraction owns 5% -> 45% of total factory progress.

        The peanut butter spread literally advances according
        to frames successfully extracted.
      */
      const extractProgress =
        (i + 1) / frameCount;

      updateFactory(
        0.05 + (extractProgress * 0.40),
        "SPREADING THE PEANUT BUTTER",
        `Preparing frame ${i + 1} / ${frameCount}`,
        {
          peanut: extractProgress
        }
      );

      message.textContent =
        `Preparing frame ${i + 1} / ${frameCount}…`;

      // Let Electron repaint the UI.
      await new Promise(resolve =>
        setTimeout(resolve, 0)
      );
    }

    // ------------------------------------------------------
    // PROFESSIONAL GIF ENCODER
    // ------------------------------------------------------

    updateFactory(
      0.46,
      "ADDING THE JELLY",
      "Handing the frames to the GIF worker…",
      {
        peanut: 1,
        jelly: 0.02
      }
    );

    message.textContent =
      "Encoding GIF in the sandwich factory…";

    /*
      gif.js performs the expensive encoding in Web Workers.

      That means:
        - the Peanut Butter UI stays alive
        - progress events continue to arrive
        - ETA can update
        - no homemade LZW goblin
    */

    const bite = getBitePreset();

    const gif = new GIF({
      workers: bite.workers,
      quality: bite.quality,

      width: targetWidth,
      height: targetHeight,

      workerScript:
        "node_modules/gif.js/dist/gif.worker.js"
    });

    const frameDelay =
      Math.max(1, Math.round(1000 / fps));

    /*
      Reuse our capture canvas as the handoff surface.

      Frames are already extracted and scaled.
      gif.js copies each frame before the canvas changes.
    */
    for (let i = 0; i < frames.length; i++) {
      captureCtx.putImageData(
        frames[i],
        0,
        0
      );

      gif.addFrame(
        captureCanvas,
        {
          copy: true,
          delay: frameDelay
        }
      );
    }

    const gifBlob = await new Promise(
      (resolve, reject) => {

        gif.on("progress", progress => {
          /*
            Encoding owns 45% -> 94%.

            This is REAL worker progress.
          */
          const overall =
            0.45 + (progress * 0.49);

          updateFactory(
            overall,
            "ADDING THE JELLY",
            `${bite.name} • encoding GIF • ${Math.round(progress * 100)}%`,
            {
              peanut: 1,
              jelly: progress
            }
          );

          message.textContent =
            `${bite.name} • encoding GIF • ${Math.round(progress * 100)}%`;
        });

        gif.on("finished", blob => {
          resolve(blob);
        });

        gif.on("abort", () => {
          reject(
            new Error("GIF encoding was aborted.")
          );
        });

        try {
          gif.render();
        } catch (error) {
          reject(error);
        }
      }
    );

    updateFactory(
      0.96,
      "PUTTING IT TOGETHER",
      "Closing up the sandwich…",
      {
        peanut: 1,
        jelly: 1,
        topBread: true
      }
    );

    const gifArrayBuffer =
      await gifBlob.arrayBuffer();

    currentGifBytes =
      new Uint8Array(gifArrayBuffer);

    currentGifUrl =
      URL.createObjectURL(gifBlob);

    updateFactory(
      0.99,
      "CUTTING THE CRUSTS",
      "Preparing your preview…",
      {
        peanut: 1,
        jelly: 1,
        topBread: true
      }
    );

    gifPreview.src = currentGifUrl;
    gifPreview.style.display = "block";

    screenPreview.style.display = "none";
    emptyPreview.style.display = "none";

    frameValue.textContent = frameCount;
    sizeValue.textContent =
      formatBytes(currentGifBytes.byteLength);

    timeValue.textContent =
      formatTime(duration * 1000);

    saveButton.disabled = false;

    finishFactory();

    /*
      Let the completed sandwich exist for a moment before
      revealing the actual GIF.
    */
    await new Promise(resolve =>
      setTimeout(resolve, 850)
    );

    closeFactory();

    setStatus("idle", "FRESHLY BAKED");

    message.textContent =
      `Nice moves. ${frameCount} frames became ${formatBytes(currentGifBytes.byteLength)} of GIF.`;
  } catch (error) {
    console.error(error);

    closeFactory();

    setStatus("idle", "BAKE FAILED");

    message.textContent =
      `GIF bake failed: ${error.message}`;
  } finally {
    if (recordingUrl) {
      URL.revokeObjectURL(recordingUrl);
    }

    chunks = [];
    recorder = null;

    recordButton.disabled = false;
    stopButton.disabled = true;

    fpsSelect.disabled = false;
    widthSelect.disabled = false;
    biteSelect.disabled = false;
  }
}

async function saveGif() {
  if (!currentGifBytes) return;

  try {
    saveButton.disabled = true;

    const result = await window.peanut.saveGif(
      Array.from(currentGifBytes)
    );

    if (result.saved) {
      setStatus("idle", "SAVED");
      message.textContent =
        `GIF saved: ${result.path}`;
    } else {
      message.textContent =
        "Save canceled. Your GIF is still here.";
    }
  } catch (error) {
    console.error(error);

    message.textContent =
      `Could not save GIF: ${error.message}`;
  } finally {
    saveButton.disabled = !currentGifBytes;
  }
}

recordButton.addEventListener(
  "click",
  startRecording
);

stopButton.addEventListener(
  "click",
  stopRecording
);

saveButton.addEventListener(
  "click",
  saveGif
);

setStatus("idle", "READY TO SPREAD");






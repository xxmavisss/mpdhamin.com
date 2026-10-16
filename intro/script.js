const canvas = document.querySelector("#binary-field");
const context = canvas.getContext("2d", { alpha: true });
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const cat = document.querySelector(".pixel-cat");
const catDivider = document.querySelector(".cat-divider");
const typedLines = [...document.querySelectorAll(".typed")];
const secondsOutput = document.querySelector("#entry-seconds");
const waitingLabel = document.querySelector(".waiting");
const progressFill = document.querySelector("#entry-progress-fill");
const skipButton = document.querySelector("#skip-intro");
const explanation = document.querySelector(".explanation");
const explanationLineOne = document.querySelector("#explanation-line-one");
const explanationLineTwo = document.querySelector("#explanation-line-two");
const connectionStatus = document.querySelector("#connection-status");

const INTRO_DURATION = 8000;
const EXIT_START = 7800;
const BOOT_MESSAGES = [
  { text: "INITIALIZING SYSTEM...", start: 250, interval: 36 },
  { text: "ERROR 404: SIGNAL LOST.", start: 1350, interval: 36 },
  { text: "SEARCHING FOR SIGNAL 1101...", start: 2450, interval: 36 },
  { text: "CONNECTION RESTORED.", start: 3850, interval: 36 },
  { text: "WELCOME TO THE LAST DANCE.", start: 5600, interval: 36 },
];
const CONNECTION_RESTORED = BOOT_MESSAGES.find((message) => message.text === "CONNECTION RESTORED.");
const CONNECTION_RESTORED_AT = CONNECTION_RESTORED.start + CONNECTION_RESTORED.text.length * CONNECTION_RESTORED.interval;

let columns = [];
let frameId;
let lastTime = 0;
let catFrameId;
let catLastTime = 0;
let catPosition = 0;
let catDirection = 1;
let catState = "idle";
let catIdleUntil = 0;
let catMinimum = 15;
let catMaximum = 0;
let catTurnPending = false;
let introFrameId = 0;
let introStarted = false;
let introStopped = false;
let introStartTime = 0;
let introExitSent = false;
let lastCountdownSecond = -1;
let connectionRestored = false;
let copyTransitionFrameId = 0;

const catSpeed = 56;

function makeColumn(x, width, height) {
  const rowHeight = 20;
  const length = Math.ceil(height / rowHeight) + 8;
  return {
    x,
    rowHeight,
    speed: 12 + Math.random() * 18,
    offset: Math.random() * rowHeight,
    brightness: 0.16 + Math.random() * 0.2,
    digits: Array.from({ length }, () => (Math.random() > 0.5 ? "1" : "0")),
    width,
  };
}

function resizeBinaryField() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const { innerWidth: width, innerHeight: height } = window;
  canvas.width = Math.floor(width * ratio);
  canvas.height = Math.floor(height * ratio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);

  const columnWidth = width < 620 ? 25 : 31;
  columns = Array.from(
    { length: Math.ceil(width / columnWidth) + 1 },
    (_, index) => makeColumn(index * columnWidth, columnWidth, height),
  );
}

function renderBinary(time = 0) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const delta = Math.min((time - lastTime) / 1000, 0.05) || 0;
  lastTime = time;

  context.clearRect(0, 0, width, height);
  context.font = "700 13px Menlo, Monaco, monospace";
  context.textAlign = "center";

  for (const column of columns) {
    column.offset += column.speed * delta;
    if (column.offset >= column.rowHeight) {
      column.offset -= column.rowHeight;
      column.digits.unshift(Math.random() > 0.5 ? "1" : "0");
      column.digits.pop();
    }

    column.digits.forEach((digit, row) => {
      const y = row * column.rowHeight + column.offset - column.rowHeight * 2;
      const spark = (row + Math.round(column.x)) % 23 === 0 ? 0.2 : 0;
      context.fillStyle = `rgba(83, 145, 88, ${column.brightness + spark})`;
      context.fillText(digit, column.x + column.width / 2, y);
    });
  }

  if (!reducedMotion.matches) frameId = requestAnimationFrame(renderBinary);
}

function resetAnimation() {
  cancelAnimationFrame(frameId);
  lastTime = 0;
  renderBinary();
}

function updateTerminal(elapsed) {
  const terminalElapsed = reducedMotion.matches ? INTRO_DURATION : elapsed;
  typedLines.forEach((line, slot) => {
    const entry = BOOT_MESSAGES[slot];
    const text = terminalElapsed >= entry.start
      ? entry.text.slice(0, reducedMotion.matches
        ? entry.text.length
        : Math.max(0, Math.min(entry.text.length, Math.floor((terminalElapsed - entry.start) / entry.interval))))
      : "";
    if (line.textContent !== text) line.textContent = text;
  });

  const restored = terminalElapsed >= CONNECTION_RESTORED_AT;
  if (restored !== connectionRestored) updateConnectionCopy(restored);
}

function updateConnectionCopy(restored) {
  connectionRestored = restored;
  cancelAnimationFrame(copyTransitionFrameId);
  [explanation, connectionStatus].forEach((element) => element.classList.add("is-changing"));

  explanationLineOne.textContent = restored ? "SIGNAL RESTORED." : "CONNECTION LOST.";
  explanationLineTwo.textContent = restored ? "THE LAST DANCE AWAITS." : "RECONNECTING TO THE LAST DANCE.";
  connectionStatus.textContent = restored ? "SIGNAL RESTORED" : "RECONNECTING...";

  copyTransitionFrameId = requestAnimationFrame(() => {
    [explanation, connectionStatus].forEach((element) => element.classList.remove("is-changing"));
    copyTransitionFrameId = 0;
  });
}

function updateEntryControls(elapsed) {
  const seconds = Math.max(1, Math.ceil((INTRO_DURATION - elapsed) / 1000));
  if (seconds !== lastCountdownSecond) {
    secondsOutput.textContent = String(seconds).padStart(2, "0");
    waitingLabel.setAttribute("aria-label", `Entering the Last Dance in ${seconds} seconds`);
    lastCountdownSecond = seconds;
    if (reducedMotion.matches) progressFill.style.transform = `scaleX(${Math.min(1, elapsed / INTRO_DURATION)})`;
  }
  if (!reducedMotion.matches) progressFill.style.transform = `scaleX(${Math.min(1, elapsed / INTRO_DURATION)})`;
}

function postToParent(message) {
  if (window.parent !== window) window.parent.postMessage(message, window.location.origin);
}

function runIntroTimeline(now) {
  if (!introStarted || introStopped) return;
  const elapsed = Math.min(INTRO_DURATION, now - introStartTime);
  updateTerminal(elapsed);
  updateEntryControls(elapsed);

  const exitAt = reducedMotion.matches ? 7820 : EXIT_START;
  if (!introExitSent && elapsed >= exitAt) {
    introExitSent = true;
    postToParent({ type: "system1101:exit-start" });
  }
  if (elapsed < INTRO_DURATION) introFrameId = requestAnimationFrame(runIntroTimeline);
}

function startIntro() {
  if (introStarted || introStopped) return;
  introStarted = true;
  introStartTime = performance.now();
  lastCountdownSecond = -1;
  connectionRestored = false;
  updateTerminal(reducedMotion.matches ? INTRO_DURATION : 0);
  updateEntryControls(0);
  skipButton.focus({ preventScroll: true });
  introFrameId = requestAnimationFrame(runIntroTimeline);
}

function stopIntro() {
  introStopped = true;
  cancelAnimationFrame(introFrameId);
  cancelAnimationFrame(frameId);
  cancelAnimationFrame(catFrameId);
  cancelAnimationFrame(copyTransitionFrameId);
}

function clampCatPosition(position) {
  return Math.min(Math.max(position, catMinimum), catMaximum);
}

function placeCat() {
  catPosition = clampCatPosition(catPosition);
  cat.style.left = `${catPosition}px`;
}

function updateCatBounds() {
  const dividerWidth = catDivider.clientWidth;
  const catWidth = cat.getBoundingClientRect().width;
  const availableSpace = Math.max(0, dividerWidth - catWidth);
  catMinimum = Math.min(15, availableSpace / 2);
  catMaximum = Math.max(catMinimum, availableSpace - catMinimum);
  placeCat();
}

function showCatState() {
  cat.dataset.direction = catDirection > 0 ? "right" : "left";
  cat.className = `pixel-cat is-${catState}`;
}

function idleCat(time) {
  catState = "idle";
  catTurnPending = true;
  catIdleUntil = time + 2000 + Math.random() * 1000;
  showCatState();
}

function moveCat(time = 0) {
  if (reducedMotion.matches) return;

  const delta = Math.min((time - catLastTime) / 1000, 0.05) || 0;
  catLastTime = time;

  if (catState === "idle") {
    if (time >= catIdleUntil) {
      if (catTurnPending) {
        catDirection *= -1;
        catTurnPending = false;
      }
      catState = "walking";
      showCatState();
    }
  } else {
    catPosition += catDirection * catSpeed * delta;

    if (catPosition <= catMinimum || catPosition >= catMaximum) {
      catPosition = clampCatPosition(catPosition);
      idleCat(time);
    }

    placeCat();
  }

  catFrameId = requestAnimationFrame(moveCat);
}

function resetCatPatrol() {
  cancelAnimationFrame(catFrameId);
  updateCatBounds();
  catLastTime = 0;

  if (reducedMotion.matches) {
    catPosition = (catMinimum + catMaximum) / 2;
    catDirection = 1;
    catState = "idle";
    catTurnPending = false;
    showCatState();
    placeCat();
    return;
  }

  catPosition = clampCatPosition(catPosition);
  catState = "idle";
  catTurnPending = false;
  catIdleUntil = performance.now() + 2000 + Math.random() * 1000;
  showCatState();
  placeCat();
  catFrameId = requestAnimationFrame(moveCat);
}

resizeBinaryField();
resetAnimation();
resetCatPatrol();

const catResizeObserver = new ResizeObserver(updateCatBounds);
catResizeObserver.observe(catDivider);

window.addEventListener("resize", () => {
  resizeBinaryField();
  if (reducedMotion.matches) renderBinary();
  updateCatBounds();
});

reducedMotion.addEventListener("change", resetAnimation);
reducedMotion.addEventListener("change", resetCatPatrol);

skipButton.addEventListener("click", () => {
  postToParent({ type: "system1101:skip" });
});

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin || event.source !== window.parent) return;
  if (event.data?.type === "system1101:start") startIntro();
  if (event.data?.type === "system1101:stop") stopIntro();
});

window.addEventListener("load", () => {
  postToParent({ type: "system1101:ready" });
}, { once: true });

if (window.parent === window) startIntro();

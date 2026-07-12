let gameSeq = [];
let userSeq = [];

let btns = ['red', 'yellow', 'green', 'purple'];
let tones = { red: 220.0, yellow: 277.18, green: 329.63, purple: 415.30 };
let keyMap = { "1": "red", "2": "yellow", "3": "green", "4": "purple" };

const DIFFICULTY = {
    easy:   { flashBase: 800, flashStep: 12, minFlash: 400, timePerStep: 1500 },
    medium: { flashBase: 650, flashStep: 22, minFlash: 260, timePerStep: 1050 },
    hard:   { flashBase: 480, flashStep: 30, minFlash: 170, timePerStep: 720 },
};
let currentDifficulty = "medium";

let started = false;
let acceptingInput = false;
let isPaused = false;
let level = 0;
let timerId = null;
let timerDuration = 0;
let timerStart = 0;

const subtitle = document.getElementById("subtitle");
const levelDisplay = document.getElementById("levelDisplay");
const bestDisplay = document.getElementById("bestDisplay");
const soundToggle = document.getElementById("soundToggle");
const restartBtn = document.getElementById("restartBtn");
const ring = document.getElementById("ring");
const timerFill = document.getElementById("timerFill");
const themeToggle = document.getElementById("themeToggle");
const diffButtons = document.querySelectorAll(".diff-btn");
const pauseBtn = document.getElementById("pauseBtn");
const pauseOverlay = document.getElementById("pauseOverlay");

const HIGH_SCORE_KEY = "simonHighScore";
const THEME_KEY = "simonTheme";

let bestScore = Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
bestDisplay.innerText = String(bestScore).padStart(2, "0");

// ---------- Theme ----------
function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    themeToggle.innerHTML = theme === "light" ? "&#9788;" : "&#9789;";
    localStorage.setItem(THEME_KEY, theme);
}
applyTheme(localStorage.getItem(THEME_KEY) || "dark");
themeToggle.addEventListener("click", () => {
    const current = document.documentElement.getAttribute("data-theme");
    applyTheme(current === "light" ? "dark" : "light");
});

// ---------- Difficulty ----------
diffButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
        if (started) return;
        currentDifficulty = btn.dataset.diff;
        diffButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
    });
});

function settings() {
    return DIFFICULTY[currentDifficulty];
}

function speedForLevel(lvl) {
    const s = settings();
    return Math.max(s.minFlash, s.flashBase - lvl * s.flashStep);
}

// ---------- Sound ----------
let audioCtx = null;
function playTone(freq, duration = 200) {
    if (!soundToggle.checked) return;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration / 1000);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration / 1000);
}

function playError() {
    if (!soundToggle.checked) return;
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = 110;
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
}

// ---------- Flash animations ----------
function gameFlash(btn, color) {
    return new Promise((resolve) => {
        btn.classList.add("gameFlash");
        playTone(tones[color]);
        setTimeout(() => {
            btn.classList.remove("gameFlash");
            resolve();
        }, speedForLevel(level) * 0.55);
    });
}

function userFlash(btn, color) {
    btn.classList.add("userFlash");
    playTone(tones[color], 120);
    setTimeout(() => {
        btn.classList.remove("userFlash");
    }, 200);
}

async function playSequence() {
    acceptingInput = false;
    pauseBtn.disabled = true;
    stopTimer();
    subtitle.classList.remove("alert");
    subtitle.innerText = "Watch closely...";
    await new Promise((r) => setTimeout(r, 400));
    for (const color of gameSeq) {
        const btn = document.querySelector(`.${color}`);
        await gameFlash(btn, color);
        await new Promise((r) => setTimeout(r, speedForLevel(level) * 0.25));
    }
    subtitle.innerText = "Your turn";
    acceptingInput = true;
    pauseBtn.disabled = false;
    startTimer();
}

// ---------- Timer ----------
function startTimer() {
    timerDuration = settings().timePerStep * gameSeq.length + 500;
    runTimer(timerDuration);
}

function runTimer(duration) {
    timerFill.style.transition = "none";
    timerFill.style.width = "100%";
    void timerFill.offsetWidth; // force reflow so the transition animates
    timerFill.style.transition = `width ${duration}ms linear`;
    timerFill.style.width = "0%";
    timerStart = Date.now();

    timerId = setTimeout(() => {
        if (acceptingInput) {
            subtitle.classList.add("alert");
            subtitle.innerText = "Time's up!";
            gameOver();
        }
    }, duration);
}

function stopTimer() {
    if (timerId) clearTimeout(timerId);
    timerId = null;
    timerFill.style.transition = "none";
    timerFill.style.width = "0%";
}

function pauseTimer() {
    if (!timerId) return;
    const elapsed = Date.now() - timerStart;
    timerDuration = Math.max(0, timerDuration - elapsed);
    clearTimeout(timerId);
    timerId = null;
    // freeze the bar exactly where it is
    const currentWidth = getComputedStyle(timerFill).width;
    timerFill.style.transition = "none";
    timerFill.style.width = currentWidth;
}

function resumeTimer() {
    if (!acceptingInput) return;
    runTimer(timerDuration);
}

// ---------- Core game logic ----------
function levelUp() {
    userSeq = [];
    level++;
    levelDisplay.innerText = String(level).padStart(2, "0");

    let ranIdx = Math.floor(Math.random() * 4);
    let ranColor = btns[ranIdx];
    gameSeq.push(ranColor);

    playSequence();
}

function checkAns(idx) {
    if (userSeq[idx] === gameSeq[idx]) {
        if (userSeq.length === gameSeq.length) {
            stopTimer();
            setTimeout(levelUp, 700);
        }
    } else {
        gameOver();
    }
}

function spawnConfetti() {
    const colors = ["#ff3860", "#ffd23f", "#00e5a0", "#7b5cff"];
    const pieceCount = 60;
    for (let i = 0; i < pieceCount; i++) {
        const piece = document.createElement("div");
        piece.className = "confetti-piece";
        piece.style.left = Math.random() * 100 + "vw";
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDuration = 1.8 + Math.random() * 1.4 + "s";
        piece.style.transform = `rotate(${Math.random() * 360}deg)`;
        document.body.appendChild(piece);
        setTimeout(() => piece.remove(), 3400);
    }
}

function gameOver() {
    acceptingInput = false;
    isPaused = false;
    pauseOverlay.classList.remove("visible");
    pauseBtn.innerText = "Pause";
    pauseBtn.disabled = true;
    stopTimer();
    playError();
    subtitle.classList.add("alert");
    if (subtitle.innerText !== "Time's up!") {
        subtitle.innerText = `Game over — score ${level}. Press any key to retry.`;
    } else {
        subtitle.innerText = `Time's up! Score ${level}. Press any key to retry.`;
    }

    if (level > bestScore) {
        bestScore = level;
        localStorage.setItem(HIGH_SCORE_KEY, String(bestScore));
        bestDisplay.innerText = String(bestScore).padStart(2, "0");
        subtitle.innerText += " New high score!";
        spawnConfetti();
    }

    ring.style.filter = "brightness(1.4)";
    setTimeout(() => {
        ring.style.filter = "none";
    }, 200);

    reset();
}

function pressColor(color) {
    if (!acceptingInput || isPaused) return;
    const btn = document.getElementById(color);
    if (!btn) return;
    userFlash(btn, color);
    userSeq.push(color);
    checkAns(userSeq.length - 1);
}

function btnPress() {
    pressColor(this.getAttribute("id"));
}

let allBtns = document.querySelectorAll(".btn");
for (const btn of allBtns) {
    btn.addEventListener("click", btnPress);
}

function startGame() {
    if (started) return;
    started = true;
    diffButtons.forEach((b) => (b.disabled = true));
    levelUp();
}

document.addEventListener("keydown", (e) => {
    if (!started) {
        startGame();
        return;
    }
    if (isPaused) return;
    const color = keyMap[e.key];
    if (color) pressColor(color);
});

pauseBtn.addEventListener("click", () => {
    if (pauseBtn.disabled) return;
    isPaused = !isPaused;
    if (isPaused) {
        pauseTimer();
        pauseOverlay.classList.add("visible");
        pauseBtn.innerText = "Resume";
    } else {
        resumeTimer();
        pauseOverlay.classList.remove("visible");
        pauseBtn.innerText = "Pause";
    }
});

ring.addEventListener("click", (e) => {
    if (!started && e.target === ring) startGame();
});

restartBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    reset();
    subtitle.classList.remove("alert");
    subtitle.innerText = "Press any key or tap the ring to begin";
    levelDisplay.innerText = "00";
});

function reset() {
    started = false;
    acceptingInput = false;
    isPaused = false;
    gameSeq = [];
    userSeq = [];
    level = 0;
    levelDisplay.innerText = "00";
    stopTimer();
    diffButtons.forEach((b) => (b.disabled = false));
    pauseBtn.disabled = true;
    pauseBtn.innerText = "Pause";
    pauseOverlay.classList.remove("visible");
}

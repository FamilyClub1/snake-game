let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;

    const AudioContextClass =
        window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return null;

    if (!audioCtx) {
        audioCtx = new AudioContextClass();
    }

    if (audioCtx.state === "suspended") {
        audioCtx.resume().catch(() => { });
    }

    return audioCtx;
}

function playTone(
    frequency: number,
    duration = 0.08,
    type: OscillatorType = "sine",
    volume = 0.03,
    startDelay = 0
) {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime + startDelay;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + duration);
}

export function unlockSound() {
    getAudioContext();
}

export function playEatSound() {
    playTone(660, 0.07, "square", 0.03);
}

export function playGoldSound() {
    playTone(880, 0.08, "triangle", 0.04, 0);
    playTone(1175, 0.1, "triangle", 0.035, 0.06);
}

export function playGameOverSound() {
    playTone(240, 0.14, "sawtooth", 0.04, 0);
    playTone(180, 0.18, "sawtooth", 0.035, 0.1);
}

export function playPauseSound() {
    playTone(520, 0.05, "square", 0.025);
}

export function playResumeSound() {
    playTone(720, 0.05, "square", 0.025);
}
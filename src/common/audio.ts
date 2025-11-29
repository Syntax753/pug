/**
 * Simple audio synthesizer for game effects
 */

// Singleton AudioContext
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtx;
}

/**
 * Plays a synthesized "splat" sound effect
 * @param variation - Index (1-3) to slightly vary the pitch/tone
 */
export function playSplatSound(variation: number = 1) {
    try {
        const ctx = getAudioContext();

        // Resume context if suspended (browser policy)
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const t = ctx.currentTime;

        // Base pitch variation (higher = cuter/smaller dog)
        // Variation 1: 400Hz, Variation 2: 450Hz, Variation 3: 350Hz
        const pitches = [400, 450, 350];
        const startFreq = pitches[(variation - 1) % 3] || 400;
        const endFreq = startFreq * 0.5; // Drop an octave

        // 1. The "Woo" (Tonal body)
        const osc = ctx.createOscillator();
        osc.type = 'triangle'; // Triangle is softer than square/saw, good for "woof"

        // Pitch envelope: "Woo" drops in pitch
        osc.frequency.setValueAtTime(startFreq, t);
        osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.15);

        const oscGain = ctx.createGain();
        // Amplitude envelope: Quick attack, short decay
        oscGain.gain.setValueAtTime(0, t);
        oscGain.gain.linearRampToValueAtTime(0.5, t + 0.02);
        oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

        osc.connect(oscGain);
        oscGain.connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.25);

        // 2. The "f" (Breath/Noise at the end)
        const bufferSize = ctx.sampleRate * 0.1; // 0.1 seconds
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        // Highpass filter for the "f" sound
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 2000;

        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0, t);
        // Start the "f" slightly after the "woo" starts
        noiseGain.gain.setValueAtTime(0, t + 0.05);
        noiseGain.gain.linearRampToValueAtTime(0.2, t + 0.1);
        noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);

        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noise.start(t);

    } catch (e) {
        console.error('Failed to play woof sound:', e);
    }
}

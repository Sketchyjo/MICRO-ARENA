class AudioService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    // Initialize voices immediately if available, or wait for event
    if ('speechSynthesis' in window) {
        this.voices = window.speechSynthesis.getVoices();
        window.speechSynthesis.onvoiceschanged = () => {
            this.voices = window.speechSynthesis.getVoices();
        };
    }
  }

  private getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // --- SYNTHESIZER FUNCTIONS ---

  private playTone(freq: number, type: OscillatorType, duration: number, startTime: number = 0, volume: number = 0.1) {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
      
      gain.gain.setValueAtTime(volume, ctx.currentTime + startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + startTime);
      osc.stop(ctx.currentTime + startTime + duration);
    } catch (e) {
      console.error("Audio Play Error", e);
    }
  }

  private playNoise(duration: number) {
    if (this.isMuted) return;
    const ctx = this.getContext();
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    noise.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  }

  // --- GAME SPECIFIC SOUNDS ---

  playClick() { this.playTone(600, 'sine', 0.1); }
  playError() { this.playTone(150, 'sawtooth', 0.3); }

  playCardFlip() { this.playTone(800, 'sine', 0.05, 0, 0.05); }
  playShuffle() { this.playNoise(0.4); }

  playSpecialCard() {
    this.playTone(400, 'sine', 0.1, 0);
    this.playTone(600, 'sine', 0.1, 0.1);
    this.playTone(800, 'sine', 0.2, 0.2);
  }

  playChessMove() { this.playTone(200, 'triangle', 0.1, 0, 0.1); }
  
  playCapture() {
    this.playTone(1200, 'square', 0.05, 0, 0.05);
    this.playTone(100, 'sawtooth', 0.2, 0.02, 0.1);
  }

  playCheck() {
    this.playTone(800, 'sawtooth', 0.2);
    this.playTone(600, 'sawtooth', 0.4, 0.2);
  }

  playBuzzCorrect() {
    this.playTone(1000, 'sine', 0.2, 0);
    this.playTone(1500, 'sine', 0.4, 0.1);
  }

  playBuzzWrong() {
    this.playTone(150, 'sawtooth', 0.4);
    this.playTone(140, 'sawtooth', 0.4, 0.05);
  }

  playWin() {
    const now = 0;
    this.playTone(523.25, 'triangle', 0.2, now);
    this.playTone(659.25, 'triangle', 0.2, now + 0.2);
    this.playTone(783.99, 'triangle', 0.2, now + 0.4);
    this.playTone(1046.50, 'triangle', 0.6, now + 0.6);
  }

  playLoss() {
    const now = 0;
    this.playTone(300, 'sawtooth', 0.4, now);
    this.playTone(250, 'sawtooth', 0.4, now + 0.3);
    this.playTone(200, 'sawtooth', 0.8, now + 0.6);
  }

  playTransactionSuccess() {
     this.playTone(1200, 'sine', 0.1, 0);
     this.playTone(1800, 'sine', 0.3, 0.1);
  }

  // --- TEXT TO SPEECH (HOST VOICE) ---
  speak(text: string) {
    if (this.isMuted || !('speechSynthesis' in window)) return;
    
    // Ensure voices are loaded (Chrome sometimes loads async)
    if (this.voices.length === 0) {
        this.voices = window.speechSynthesis.getVoices();
    }

    // Cancel current speech to avoid overlap
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Voice Strategy: Look for "Deep" "Male" US English voices
    // Order of preference for that "Steve Harvey" game show host vibe:
    // 1. "Google US English Male" (Android/Chrome)
    // 2. "Microsoft David" (Windows)
    // 3. "Alex" (macOS - has good gravitas)
    // 4. Any "Male" US English
    
    let preferredVoice = this.voices.find(v => v.name === "Google US English Male");
    if (!preferredVoice) preferredVoice = this.voices.find(v => v.name.includes("Microsoft David"));
    if (!preferredVoice) preferredVoice = this.voices.find(v => v.name === "Alex");
    if (!preferredVoice) preferredVoice = this.voices.find(v => v.lang === 'en-US' && v.name.toLowerCase().includes('male'));
    if (!preferredVoice) preferredVoice = this.voices.find(v => v.lang === 'en-US'); // Fallback

    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }

    // Tweak properties to sound more like a host
    // Lower pitch = more masculine/authoritative
    // Rate > 1 = Energetic
    utterance.pitch = 0.8; 
    utterance.rate = 1.15; 
    utterance.volume = 1.0;

    window.speechSynthesis.speak(utterance);
  }
}

export const audioService = new AudioService();
/**
 * Gemini Live API Client & Web Audio Streamer
 * Captures 16kHz PCM microphone audio, streams via WebSocket to Gemini Live,
 * and plays back 24kHz audio stream with seamless interruption handling.
 */

export interface GeminiLiveCallbacks {
  onStatusChange?: (status: 'disconnected' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'interrupted' | 'mic_permission_needed' | 'error') => void;
  onAudioData?: (rms: number) => void;
  onTranscript?: (text: string, isUser: boolean) => void;
  onError?: (error: string) => void;
  onTurnComplete?: () => void;
  onFrequencyData?: (freqData: Uint8Array, timeData: Uint8Array) => void;
}

export class GeminiLiveSession {
  private ws: WebSocket | null = null;
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  private isMuted: boolean = false;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying: boolean = false;
  private nextPlayTime: number = 0;
  private activeAudioSources: AudioBufferSourceNode[] = [];
  private callbacks: GeminiLiveCallbacks = {};
  private currentVoice: string = 'Zephyr';
  private speechRate: number = 1.0;
  private currentStatus: 'disconnected' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'interrupted' | 'mic_permission_needed' | 'error' = 'disconnected';

  constructor(callbacks: GeminiLiveCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public getStatus() {
    return this.currentStatus;
  }

  public getInputAnalyser(): AnalyserNode | null {
    return this.inputAnalyser;
  }

  public getOutputAnalyser(): AnalyserNode | null {
    return this.outputAnalyser;
  }

  public getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }

  public getInputAudioContext(): AudioContext | null {
    return this.inputAudioCtx;
  }

  public setCallbacks(callbacks: GeminiLiveCallbacks) {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  private updateStatus(newStatus: 'disconnected' | 'connecting' | 'connected' | 'listening' | 'speaking' | 'interrupted' | 'mic_permission_needed' | 'error') {
    this.currentStatus = newStatus;
    this.callbacks.onStatusChange?.(newStatus);
  }

  public setVoice(voice: string) {
    this.currentVoice = voice;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'voiceChange', voiceName: voice }));
    }
  }

  public setSpeechRate(rate: number) {
    this.speechRate = Math.max(0.5, Math.min(2.5, rate));
    this.activeAudioSources.forEach(s => {
      try {
        s.playbackRate.value = this.speechRate;
      } catch {}
    });
  }

  public async start(voiceName: string = 'Zephyr') {
    this.currentVoice = voiceName;
    this.updateStatus('connecting');

    try {
      // 1. Output Audio Context (24kHz playback for Gemini Live audio responses)
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        try {
          this.outputAudioCtx = new AudioCtxClass({ sampleRate: 24000 });
        } catch {
          this.outputAudioCtx = new AudioCtxClass();
        }
      }

      // 2. Establish WebSocket connection to backend Gemini Live endpoint
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/gemini-live`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.updateStatus('connected');
        this.ws?.send(JSON.stringify({ type: 'init', voiceName: this.currentVoice }));
        // Try acquiring microphone after socket connection
        this.requestMicrophone();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'audio' && msg.audio) {
            this.updateStatus('speaking');
            if (msg.text) {
              this.callbacks.onTranscript?.(msg.text, false);
            }
            this.enqueueAudioChunk(msg.audio);
          } else if (msg.type === 'interrupted') {
            this.handleInterruption();
          } else if (msg.type === 'turnComplete') {
            this.callbacks.onTurnComplete?.();
            this.updateStatus('listening');
          } else if (msg.type === 'error') {
            this.callbacks.onError?.(msg.error || 'Live session error');
          }
        } catch (e) {
          console.warn('Error processing live message:', e);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('Gemini Live WS connection info:', err);
        this.updateStatus('connected');
      };

      this.ws.onclose = () => {
        this.updateStatus('disconnected');
      };

    } catch (err: any) {
      console.warn('Gemini Live init notice:', err);
      this.updateStatus('connected');
    }
  }

  public async requestMicrophone(): Promise<boolean> {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!this.inputAudioCtx && AudioCtxClass) {
        try {
          this.inputAudioCtx = new AudioCtxClass({ sampleRate: 16000 });
        } catch {
          this.inputAudioCtx = new AudioCtxClass();
        }
      }

      if (this.inputAudioCtx && this.inputAudioCtx.state === 'suspended') {
        await this.inputAudioCtx.resume().catch(() => {});
      }

      if (this.outputAudioCtx && this.outputAudioCtx.state === 'suspended') {
        await this.outputAudioCtx.resume().catch(() => {});
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        this.updateStatus('mic_permission_needed');
        return false;
      }

      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      this.startMicCapture();
      return true;
    } catch (err: any) {
      console.warn('Microphone permission request result:', err?.message || err);
      this.updateStatus('mic_permission_needed');
      return false;
    }
  }

  private startMicCapture() {
    if (!this.inputAudioCtx || !this.mediaStream) return;

    try {
      const source = this.inputAudioCtx.createMediaStreamSource(this.mediaStream);

      // Create AnalyserNode for high-resolution waveform visualization
      const analyser = this.inputAudioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      source.connect(analyser);
      this.inputAnalyser = analyser;

      // ScriptProcessor with 2048 buffer size gives ~128ms packets at 16kHz
      this.processor = this.inputAudioCtx.createScriptProcessor(2048, 1, 1);

      source.connect(this.processor);
      this.processor.connect(this.inputAudioCtx.destination);

      const freqBuffer = new Uint8Array(analyser.frequencyBinCount);
      const timeBuffer = new Uint8Array(analyser.fftSize);

      this.processor.onaudioprocess = (e) => {
        if (this.isMuted) return;

        const inputChannelData = e.inputBuffer.getChannelData(0);

        // Calculate RMS for visualizer
        let sum = 0;
        for (let i = 0; i < inputChannelData.length; i++) {
          sum += inputChannelData[i] * inputChannelData[i];
        }
        const rms = Math.sqrt(sum / inputChannelData.length);
        this.callbacks.onAudioData?.(rms);

        // Emit frequency and time domain buffer if listener attached
        if (this.callbacks.onFrequencyData && this.inputAnalyser) {
          this.inputAnalyser.getByteFrequencyData(freqBuffer);
          this.inputAnalyser.getByteTimeDomainData(timeBuffer);
          this.callbacks.onFrequencyData(freqBuffer, timeBuffer);
        }

        // Convert Float32Array to 16-bit Linear PCM Base64
        const base64PCM = this.floatTo16BitPCMBase64(inputChannelData);

        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'audio', audio: base64PCM }));
        }
      };

      this.updateStatus('listening');
    } catch (e) {
      console.warn('Failed to start mic capture:', e);
    }
  }

  public sendTextMessage(text: string) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.callbacks.onTranscript?.(text, true);
      this.ws.send(JSON.stringify({ type: 'text', text }));
    }
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  private floatTo16BitPCMBase64(input: Float32Array): string {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private enqueueAudioChunk(base64Audio: string) {
    if (!this.outputAudioCtx) return;

    try {
      const arrayBuffer = this.base64ToArrayBuffer(base64Audio);
      const dataView = new DataView(arrayBuffer);
      const numSamples = Math.floor(arrayBuffer.byteLength / 2);
      const audioBuffer = this.outputAudioCtx.createBuffer(1, numSamples, 24000);
      const channelData = audioBuffer.getChannelData(0);

      for (let i = 0; i < numSamples; i++) {
        const int16 = dataView.getInt16(i * 2, true);
        channelData[i] = int16 < 0 ? int16 / 0x8000 : int16 / 0x7fff;
      }

      const source = this.outputAudioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.playbackRate.value = this.speechRate;
      source.connect(this.outputAudioCtx.destination);

      const currentTime = this.outputAudioCtx.currentTime;
      const startTime = Math.max(currentTime, this.nextPlayTime);
      source.start(startTime);
      this.nextPlayTime = startTime + audioBuffer.duration;

      this.activeAudioSources.push(source);
      source.onended = () => {
        const idx = this.activeAudioSources.indexOf(source);
        if (idx > -1) this.activeAudioSources.splice(idx, 1);
        if (this.activeAudioSources.length === 0) {
          this.updateStatus('listening');
        }
      };
    } catch (e) {
      console.warn('Error playing audio chunk:', e);
    }
  }

  public handleInterruption() {
    this.updateStatus('interrupted');
    // Halt all currently playing audio sources immediately
    this.activeAudioSources.forEach(s => {
      try {
        s.stop();
        s.disconnect();
      } catch {}
    });
    this.activeAudioSources = [];
    if (this.outputAudioCtx) {
      this.nextPlayTime = this.outputAudioCtx.currentTime;
    }
  }

  public stop() {
    this.handleInterruption();

    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.inputAnalyser) {
      this.inputAnalyser.disconnect();
      this.inputAnalyser = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.inputAudioCtx) {
      this.inputAudioCtx.close();
      this.inputAudioCtx = null;
    }

    if (this.outputAudioCtx) {
      this.outputAudioCtx.close();
      this.outputAudioCtx = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.updateStatus('disconnected');
  }
}

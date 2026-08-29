import { NetworkQuality } from '@/types/comm';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private statsInterval: any = null;
  private onSignalCallback?: (signal: any) => void;
  private onRemoteStreamCallback?: (stream: MediaStream) => void;
  private onNetworkQualityCallback?: (quality: NetworkQuality) => void;
  private onConnectionStateChangeCallback?: (state: RTCPeerConnectionState) => void;

  public async getLocalMedia(options: {
    audio?: boolean | MediaTrackConstraints;
    video?: boolean | MediaTrackConstraints;
    cameraFacing?: 'user' | 'environment';
  }): Promise<MediaStream> {
    this.stopLocalMedia();

    const videoConstraint = options.video
      ? typeof options.video === 'object'
        ? options.video
        : {
            facingMode: options.cameraFacing || 'user',
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }
      : false;

    const audioConstraint = options.audio ?? true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraint,
        video: videoConstraint,
      });
      this.localStream = stream;
      return stream;
    } catch (err: any) {
      console.warn('getUserMedia error, falling back to audio only if possible:', err);
      if (options.video && options.audio) {
        // Fallback to audio only if camera unavailable
        const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        this.localStream = audioOnlyStream;
        return audioOnlyStream;
      }
      throw err;
    }
  }

  public initPeerConnection(callbacks: {
    onSignal: (signal: any) => void;
    onRemoteStream: (stream: MediaStream) => void;
    onNetworkQuality?: (quality: NetworkQuality) => void;
    onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
  }) {
    this.cleanup();

    this.onSignalCallback = callbacks.onSignal;
    this.onRemoteStreamCallback = callbacks.onRemoteStream;
    this.onNetworkQualityCallback = callbacks.onNetworkQuality;
    this.onConnectionStateChangeCallback = callbacks.onConnectionStateChange;

    this.peerConnection = new RTCPeerConnection(RTC_CONFIG);

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });
    }

    // Handle remote tracks
    this.remoteStream = new MediaStream();
    this.peerConnection.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        this.remoteStream?.addTrack(track);
      });
      if (this.remoteStream) {
        this.onRemoteStreamCallback?.(this.remoteStream);
      }
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.onSignalCallback?.({
          type: 'candidate',
          candidate: event.candidate,
        });
      }
    };

    // Connection state
    this.peerConnection.onconnectionstatechange = () => {
      if (this.peerConnection) {
        const state = this.peerConnection.connectionState;
        this.onConnectionStateChangeCallback?.(state);
        if (state === 'failed' || state === 'disconnected') {
          this.onNetworkQualityCallback?.('reconnecting');
        } else if (state === 'connected') {
          this.onNetworkQualityCallback?.('excellent');
        }
      }
    };

    // Monitor network quality stats
    this.startStatsMonitoring();
  }

  public async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });
    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  public async handleOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    return answer;
  }

  public async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
    if (!this.peerConnection) throw new Error('Peer connection not initialized');
    if (this.peerConnection.signalingState !== 'stable') {
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  public async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (!this.peerConnection) return;
    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      console.warn('Error adding ICE candidate:', e);
    }
  }

  public restartIce() {
    if (this.peerConnection) {
      this.peerConnection.restartIce?.();
    }
  }

  public setAudioMuted(isMuted: boolean) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach((track) => {
        track.enabled = !isMuted;
      });
    }
  }

  public setVideoEnabled(isEnabled: boolean) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach((track) => {
        track.enabled = isEnabled;
      });
    }
  }

  public async switchCamera(facing: 'user' | 'environment'): Promise<MediaStream | null> {
    if (!this.localStream) return null;

    try {
      const currentVideoTrack = this.localStream.getVideoTracks()[0];
      if (currentVideoTrack) {
        currentVideoTrack.stop();
        this.localStream.removeTrack(currentVideoTrack);
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      const newVideoTrack = newStream.getVideoTracks()[0];
      if (newVideoTrack) {
        this.localStream.addTrack(newVideoTrack);

        // Replace track in peer connection
        const sender = this.peerConnection
          ?.getSenders()
          .find((s) => s.track && s.track.kind === 'video');

        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }

      return this.localStream;
    } catch (e) {
      console.warn('Failed to switch camera:', e);
      return this.localStream;
    }
  }

  public async setAudioOutputDevice(element: HTMLAudioElement | HTMLVideoElement, deviceId: string) {
    if ('setSinkId' in element) {
      try {
        await (element as any).setSinkId(deviceId);
      } catch (e) {
        console.warn('Failed to set audio output device:', e);
      }
    }
  }

  private startStatsMonitoring() {
    this.stopStatsMonitoring();
    this.statsInterval = setInterval(async () => {
      if (!this.peerConnection || this.peerConnection.connectionState !== 'connected') return;

      try {
        const stats = await this.peerConnection.getStats();
        let packetsLost = 0;
        let packetsReceived = 0;
        let rtt = 0;

        stats.forEach((report) => {
          if (report.type === 'inbound-rtp') {
            packetsLost += report.packetsLost || 0;
            packetsReceived += report.packetsReceived || 0;
          }
          if (report.type === 'candidate-pair' && report.state === 'succeeded') {
            rtt = report.currentRoundTripTime || 0;
          }
        });

        const lossRatio = packetsReceived > 0 ? packetsLost / (packetsLost + packetsReceived) : 0;

        let quality: NetworkQuality = 'excellent';
        if (lossRatio > 0.08 || rtt > 0.3) {
          quality = 'poor';
        } else if (lossRatio > 0.02 || rtt > 0.15) {
          quality = 'good';
        }

        this.onNetworkQualityCallback?.(quality);
      } catch (e) {
        // ignore stat retrieval errors
      }
    }, 3000);
  }

  private stopStatsMonitoring() {
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }
  }

  public stopLocalMedia() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((t) => t.stop());
      this.localStream = null;
    }
  }

  public cleanup() {
    this.stopStatsMonitoring();
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    this.stopLocalMedia();
    this.remoteStream = null;
  }
}

export const webrtcManager = new WebRTCManager();

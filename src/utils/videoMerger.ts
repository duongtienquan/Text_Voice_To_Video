// Video and Audio Merging Engine using Canvas, Web Audio API, and MediaRecorder
import { MergeSettings } from '../types';

export interface MergeProgressCallback {
  (progress: number, message: string): void;
}

export class VideoAudioMerger {
  private isCancelled = false;

  public cancel() {
    this.isCancelled = true;
  }

  /**
   * Merge video with Vietnamese TTS audio and optional subtitle overlay
   */
  public async merge(
    videoSrc: string,
    audioBlob: Blob,
    settings: MergeSettings,
    onProgress?: MergeProgressCallback
  ): Promise<{ blob: Blob; url: string; duration: number }> {
    this.isCancelled = false;
    onProgress?.(5, 'Đang chuẩn bị video và tệp âm thanh tiếng Việt...');

    // 1. Load hidden video element
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = videoSrc;
    video.muted = false; // we capture audio via element or web audio
    video.playsInline = true;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Không thể tải video nguồn.'));
    });

    const duration = video.duration || 5;
    const width = video.videoWidth || 720;
    const height = video.videoHeight || 1280;

    onProgress?.(15, 'Đang phân tích và xử lý âm thanh...');

    // 2. Decode audio buffer for the voiceover
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 44100,
    });

    const audioArrayBuffer = await audioBlob.arrayBuffer();
    const voiceAudioBuffer = await audioCtx.decodeAudioData(audioArrayBuffer);

    // 3. Setup canvas & destination
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const destination = audioCtx.createMediaStreamDestination();

    // Setup voiceover source node
    const voiceSource = audioCtx.createBufferSource();
    voiceSource.buffer = voiceAudioBuffer;

    const voiceGain = audioCtx.createGain();
    voiceGain.gain.setValueAtTime(settings.voiceVolume, audioCtx.currentTime);
    voiceSource.connect(voiceGain);
    voiceGain.connect(destination);

    // Setup video audio if original video audio should be mixed
    let videoSourceNode: MediaElementAudioSourceNode | null = null;
    let videoGain: GainNode | null = null;
    if (!settings.muteOriginalVideo && settings.videoVolume > 0) {
      try {
        videoSourceNode = audioCtx.createMediaElementSource(video);
        videoGain = audioCtx.createGain();
        videoGain.gain.setValueAtTime(settings.videoVolume, audioCtx.currentTime);
        videoSourceNode.connect(videoGain);
        videoGain.connect(destination);
      } catch {
        // Fallback if media element source has CORS or single-element restriction
      }
    }

    onProgress?.(25, 'Đang khởi tạo bộ mã hóa video...');

    // 4. Setup MediaStream & MediaRecorder
    const canvasStream = canvas.captureStream(30);
    const audioTracks = destination.stream.getAudioTracks();
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioTracks,
    ]);

    let mimeType = 'video/webm;codecs=vp8,opus';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      if (MediaRecorder.isTypeSupported('video/mp4')) {
        mimeType = 'video/mp4';
      } else {
        mimeType = 'video/webm';
      }
    }

    const recordedChunks: Blob[] = [];
    const mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 3500000,
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    return new Promise((resolve, reject) => {
      mediaRecorder.onerror = (e) => {
        cleanup();
        reject(new Error(`Lỗi quay video: ${e}`));
      };

      mediaRecorder.onstop = () => {
        cleanup();
        if (this.isCancelled) {
          reject(new Error('Đã hủy quá trình xuất video.'));
          return;
        }

        const finalBlob = new Blob(recordedChunks, { type: mimeType });
        const finalUrl = URL.createObjectURL(finalBlob);
        onProgress?.(100, 'Ghép video và giọng nói hoàn tất!');
        resolve({ blob: finalBlob, url: finalUrl, duration });
      };

      const cleanup = () => {
        try {
          voiceSource.stop();
        } catch {}
        try {
          video.pause();
        } catch {}
        audioCtx.close();
      };

      // 5. Start recording and playback
      mediaRecorder.start(100);
      video.currentTime = 0;

      let hasVoiceStarted = false;
      const startTime = performance.now();

      const renderLoop = () => {
        if (this.isCancelled) {
          mediaRecorder.stop();
          return;
        }

        const elapsed = (performance.now() - startTime) / 1000;

        // Check if voice should start playing based on offset
        if (!hasVoiceStarted && elapsed >= settings.audioOffset) {
          try {
            voiceSource.start(0);
          } catch {}
          hasVoiceStarted = true;
        }

        // Draw current video frame to canvas
        if (video.readyState >= 2) {
          ctx.drawImage(video, 0, 0, width, height);

          // Draw subtitle if enabled
          if (settings.subtitles.enabled && settings.subtitles.text.trim()) {
            drawSubtitles(ctx, width, height, settings.subtitles);
          }
        }

        // Calculate progress
        const currentProgress = Math.min(98, Math.round((video.currentTime / duration) * 100));
        onProgress?.(currentProgress, `Đang ghép khung hình (${Math.round(video.currentTime)}s / ${Math.round(duration)}s)...`);

        if (video.ended || video.currentTime >= duration || elapsed >= duration + 0.3) {
          onProgress?.(99, 'Đang đóng gói tệp video...');
          setTimeout(() => {
            if (mediaRecorder.state !== 'inactive') {
              mediaRecorder.stop();
            }
          }, 300);
        } else {
          requestAnimationFrame(renderLoop);
        }
      };

      video.play().then(() => {
        requestAnimationFrame(renderLoop);
      }).catch((err) => {
        cleanup();
        reject(err);
      });
    });
  }
}

/**
 * Render subtitle text on video canvas with wrapped lines and crisp shadow
 */
function drawSubtitles(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  subtitle: MergeSettings['subtitles']
) {
  const text = subtitle.text.trim();
  if (!text) return;

  ctx.save();

  const fontSize = subtitle.fontSize || Math.max(18, Math.round(w * 0.038));
  ctx.font = `600 ${fontSize}px 'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Word wrap lines
  const maxWidth = w * 0.86;
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = ctx.measureText(testLine).width;
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  const lineHeight = fontSize * 1.35;
  const totalTextHeight = lines.length * lineHeight;

  // Determine Y position
  let startY = h - totalTextHeight - 50; // bottom default
  if (subtitle.position === 'top') {
    startY = 80;
  } else if (subtitle.position === 'center') {
    startY = (h - totalTextHeight) / 2;
  }

  // Draw background box if enabled
  if (subtitle.showBackground) {
    const boxPaddingX = 24;
    const boxPaddingY = 14;
    let maxLineWidth = 0;
    for (const line of lines) {
      const lw = ctx.measureText(line).width;
      if (lw > maxLineWidth) maxLineWidth = lw;
    }

    const boxWidth = Math.min(w * 0.94, maxLineWidth + boxPaddingX * 2);
    const boxHeight = totalTextHeight + boxPaddingY * 2;
    const boxX = (w - boxWidth) / 2;
    const boxY = startY - boxPaddingY + (lineHeight / 2) - (fontSize / 2);

    ctx.fillStyle = subtitle.backgroundColor || 'rgba(15, 23, 42, 0.85)';
    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 14);
    ctx.fill();
  }

  // Draw text lines with text shadow for readability
  ctx.fillStyle = subtitle.color || '#ffffff';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 2;

  lines.forEach((line, index) => {
    const y = startY + index * lineHeight + (lineHeight / 2);
    ctx.fillText(line, w / 2, y);
  });

  ctx.restore();
}

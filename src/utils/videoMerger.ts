// Video and Audio Merging Engine using Canvas, Web Audio API, and MediaRecorder
import { MergeSettings } from '../types';
import { blobToBase64, base64ToBlob } from './audioUtils';

export interface MergeProgressCallback {
  (progress: number, message: string): void;
}

export interface MergeResult {
  blob: Blob;
  url: string;
  duration: number;
  format: 'MP4' | 'WebM';
  mp4Blob?: Blob;
  mp4Url?: string;
  webmBlob?: Blob;
  webmUrl?: string;
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
  ): Promise<MergeResult> {
    this.isCancelled = false;

    // 1. PRIMARY FAST & ROCK-SOLID PATH: Server-Side FFmpeg Direct Merge (0% dropped frames, no browser throttle)
    try {
      onProgress?.(10, 'Đang chuẩn bị tệp video và âm thanh thuyết minh...');
      const videoRes = await fetch(videoSrc);
      const videoBlob = await videoRes.blob();

      onProgress?.(30, 'Đang nạp dữ liệu vào bộ xử lý video tốc độ cao...');
      const [videoBase64, audioBase64] = await Promise.all([
        blobToBase64(videoBlob),
        blobToBase64(audioBlob),
      ]);

      if (this.isCancelled) {
        throw new Error('Đã hủy quá trình xuất video.');
      }

      onProgress?.(60, 'Đang ghép âm thanh và đóng gói định dạng chuẩn MP4...');
      const response = await fetch('/api/video/merge-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoBase64,
          audioBase64,
          audioOffset: settings.audioOffset,
          voiceVolume: settings.voiceVolume,
          videoVolume: settings.videoVolume,
          muteOriginalVideo: settings.muteOriginalVideo,
          subtitles: settings.subtitles,
          exportFormat: settings.exportFormat,
        }),
      });

      const data = await response.json();
      if (data.success && data.videoBase64) {
        onProgress?.(95, 'Đang hoàn tất tệp video thành phẩm...');
        const mergedBlob = base64ToBlob(data.videoBase64, data.mimeType || 'video/mp4');
        const mergedUrl = URL.createObjectURL(mergedBlob);
        onProgress?.(100, `Ghép video và xuất định dạng ${data.format || 'MP4'} hoàn tất!`);

        return {
          blob: mergedBlob,
          url: mergedUrl,
          duration: 0,
          format: (data.format as 'MP4' | 'WebM') || 'MP4',
          mp4Blob: mergedBlob,
          mp4Url: mergedUrl,
          webmBlob: undefined,
          webmUrl: undefined,
        };
      } else {
        console.warn('Direct merge server response not success:', data.error);
      }
    } catch (serverErr) {
      console.warn('Server direct merge failed, falling back to browser canvas recorder:', serverErr);
    }

    if (this.isCancelled) {
      throw new Error('Đã hủy quá trình xuất video.');
    }

    // 2. FALLBACK PATH: Client-side Canvas Recording
    onProgress?.(20, 'Đang chuẩn bị bộ thu khung hình dự phòng...');

    // Attach video element to DOM with visible layout presence so Chrome does NOT throttle/pause rendering
    const fallbackContainer = document.createElement('div');
    fallbackContainer.style.cssText =
      'position:fixed;right:0;bottom:0;width:320px;height:180px;opacity:0.001;pointer-events:none;overflow:hidden;z-index:-999;';
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.src = videoSrc;
    video.muted = true;
    video.playsInline = true;
    fallbackContainer.appendChild(video);
    document.body.appendChild(fallbackContainer);

    await new Promise<void>((resolve, reject) => {
      if (video.readyState >= 1) {
        resolve();
      } else {
        video.onloadedmetadata = () => resolve();
        video.onerror = () => reject(new Error('Không thể tải video nguồn.'));
      }
    });

    const duration = video.duration && isFinite(video.duration) && video.duration > 0 ? video.duration : 6;
    const width = video.videoWidth || 720;
    const height = video.videoHeight || 1280;

    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 44100,
    });
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    const audioArrayBuffer = await audioBlob.arrayBuffer();
    const voiceAudioBuffer = await audioCtx.decodeAudioData(audioArrayBuffer);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const destination = audioCtx.createMediaStreamDestination();
    const voiceSource = audioCtx.createBufferSource();
    voiceSource.buffer = voiceAudioBuffer;
    const voiceGain = audioCtx.createGain();
    voiceGain.gain.setValueAtTime(settings.voiceVolume, audioCtx.currentTime);
    voiceSource.connect(voiceGain);
    voiceGain.connect(destination);

    const canvasStream = canvas.captureStream(30);
    const audioTracks = destination.stream.getAudioTracks();
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...audioTracks,
    ]);

    let mimeType = 'video/webm;codecs=vp8,opus';
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
      mimeType = 'video/webm;codecs=vp9,opus';
    } else if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }

    const recordedChunks: Blob[] = [];
    const mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 3000000,
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    return new Promise((resolve, reject) => {
      let isFinished = false;

      const cleanup = () => {
        try { voiceSource.stop(); } catch {}
        try { video.pause(); } catch {}
        if (fallbackContainer.parentNode) {
          fallbackContainer.parentNode.removeChild(fallbackContainer);
        }
        try { audioCtx.close(); } catch {}
      };

      mediaRecorder.onerror = (e) => {
        cleanup();
        reject(new Error(`Lỗi quay video: ${e}`));
      };

      mediaRecorder.onstop = async () => {
        cleanup();
        if (this.isCancelled) {
          reject(new Error('Đã hủy quá trình xuất video.'));
          return;
        }

        const totalBytes = recordedChunks.reduce((acc, c) => acc + c.size, 0);
        if (totalBytes === 0) {
          reject(new Error('Lỗi quay video: Không nhận được dữ liệu khung hình. Vui lòng thử lại.'));
          return;
        }

        const webmBlob = new Blob(recordedChunks, { type: mimeType });
        const webmUrl = URL.createObjectURL(webmBlob);

        let finalBlob: Blob = webmBlob;
        let finalUrl: string = webmUrl;
        let finalFormat: 'MP4' | 'WebM' = 'WebM';
        let mp4Blob: Blob | undefined;
        let mp4Url: string | undefined;

        if (settings.exportFormat === 'mp4') {
          try {
            onProgress?.(94, 'Đang đóng gói định dạng chuẩn MP4 (H.264 + AAC)...');
            const base64 = await blobToBase64(webmBlob);
            const response = await fetch('/api/video/convert-to-mp4', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ videoBase64: base64 }),
            });
            const data = await response.json();
            if (data.success && data.mp4Base64) {
              mp4Blob = base64ToBlob(data.mp4Base64, 'video/mp4');
              mp4Url = URL.createObjectURL(mp4Blob);
              finalBlob = mp4Blob;
              finalUrl = mp4Url;
              finalFormat = 'MP4';
            }
          } catch (convErr) {
            console.warn('Lỗi chuyển đổi sang MP4, sử dụng WebM:', convErr);
          }
        }

        onProgress?.(100, `Ghép video và xuất định dạng ${finalFormat} hoàn tất!`);
        resolve({
          blob: finalBlob,
          url: finalUrl,
          duration,
          format: finalFormat,
          mp4Blob,
          mp4Url,
          webmBlob,
          webmUrl,
        });
      };

      video.currentTime = 0;

      const drawFrame = () => {
        if (video.videoWidth > 0) {
          ctx.drawImage(video, 0, 0, width, height);
          if (settings.subtitles.enabled && settings.subtitles.text.trim()) {
            drawSubtitles(ctx, width, height, settings.subtitles);
          }
        }
      };

      video.play().then(() => {
        mediaRecorder.start(100);
        let hasVoiceStarted = false;
        const startTime = performance.now();

        const renderLoop = () => {
          if (this.isCancelled || isFinished) return;

          const elapsed = (performance.now() - startTime) / 1000;

          if (!hasVoiceStarted && elapsed >= Math.max(0, settings.audioOffset)) {
            try {
              voiceSource.start(0);
            } catch {}
            hasVoiceStarted = true;
          }

          drawFrame();

          const progressPercent = Math.min(
            92,
            Math.max(25, Math.round((video.currentTime / duration) * 100))
          );
          onProgress?.(
            progressPercent,
            `Đang ghép khung hình (${Math.round(video.currentTime)}s / ${Math.round(duration)}s)...`
          );

          const isVideoEnded = video.ended || video.currentTime >= duration - 0.1;
          const isTimeElapsed = elapsed >= duration + 0.2;

          if (elapsed > 0.8 && (isVideoEnded || isTimeElapsed)) {
            isFinished = true;
            onProgress?.(95, 'Đang hoàn tất đóng gói tệp video...');
            setTimeout(() => {
              if (mediaRecorder.state !== 'inactive') {
                try {
                  mediaRecorder.requestData();
                } catch {}
                mediaRecorder.stop();
              }
            }, 300);
          } else {
            requestAnimationFrame(renderLoop);
          }
        };

        requestAnimationFrame(renderLoop);
      }).catch((playErr) => {
        cleanup();
        reject(new Error(`Không thể phát video để quay: ${playErr?.message || playErr}`));
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

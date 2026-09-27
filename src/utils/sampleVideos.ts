// Procedural sample videos generated client-side for immediate testing
import { VideoSource } from '../types';

export const PRESET_SAMPLE_INFO = [
  {
    id: 'sample-shorts-city',
    name: 'Khung cảnh Hoàng hôn & Dạo phố (9:16 Shorts/TikTok)',
    aspectRatio: '9:16' as const,
    duration: 8,
    width: 720,
    height: 1280,
    description: 'Video dọc chuẩn Samsung Galaxy / TikTok với hiệu ứng ánh sáng hoàng hôn và chuyển động mượt mà.',
  },
  {
    id: 'sample-tech-review',
    name: 'Giới thiệu Công nghệ & Điện thoại Samsung (16:9)',
    aspectRatio: '16:9' as const,
    duration: 8,
    width: 1280,
    height: 720,
    description: 'Video ngang phong cách review công nghệ hiện đại với lưới tương tác và đồ họa chuyển động.',
  },
  {
    id: 'sample-coffee-vlog',
    name: 'Góc Cà phê & Cuộc sống Thường nhật (9:16)',
    aspectRatio: '9:16' as const,
    duration: 6,
    width: 720,
    height: 1280,
    description: 'Video ấm áp, thích hợp cho kịch bản tâm sự, chia sẻ cuộc sống, thơ và lời chúc.',
  },
];

/**
 * Generate a procedural video clip with real canvas animation and audio track
 */
export async function generateProceduralVideoBlob(
  typeId: string,
  onProgress?: (p: number) => void
): Promise<Blob> {
  const info = PRESET_SAMPLE_INFO.find((s) => s.id === typeId) || PRESET_SAMPLE_INFO[0];
  const width = info.width;
  const height = info.height;
  const fps = 30;
  const totalFrames = Math.floor(info.duration * fps);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Setup Web Audio for gentle ambient background sound in sample
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const dest = audioCtx.createMediaStreamDestination();
  
  // Ambient soft drone synthesizer for the video's original sound
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(typeId === 'sample-tech-review' ? 120 : 180, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
  osc.connect(gain);
  gain.connect(dest);
  osc.start();

  const canvasStream = canvas.captureStream(fps);
  // Add audio track to the stream
  const combinedStream = new MediaStream([
    ...canvasStream.getVideoTracks(),
    ...dest.stream.getAudioTracks(),
  ]);

  let mimeType = 'video/webm;codecs=vp8,opus';
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm';
  }

  const mediaRecorder = new MediaRecorder(combinedStream, {
    mimeType,
    videoBitsPerSecond: 2500000,
  });

  const chunks: Blob[] = [];
  mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve, reject) => {
    mediaRecorder.onstop = () => {
      osc.stop();
      audioCtx.close();
      const finalBlob = new Blob(chunks, { type: mimeType });
      resolve(finalBlob);
    };

    mediaRecorder.onerror = (err) => {
      osc.stop();
      audioCtx.close();
      reject(err);
    };

    mediaRecorder.start(100);

    let frame = 0;
    const interval = setInterval(() => {
      if (frame >= totalFrames) {
        clearInterval(interval);
        mediaRecorder.stop();
        return;
      }

      const progress = frame / totalFrames;
      const t = frame / fps;

      renderSampleFrame(ctx, width, height, typeId, t, progress);

      if (onProgress) {
        onProgress(Math.round((frame / totalFrames) * 100));
      }

      frame++;
    }, 1000 / fps);
  });
}

function renderSampleFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  typeId: string,
  t: number,
  progress: number
) {
  ctx.save();

  if (typeId === 'sample-shorts-city') {
    // Sunset gradient sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
    skyGrad.addColorStop(0, '#0f172a');
    skyGrad.addColorStop(0.35, '#3b0764');
    skyGrad.addColorStop(0.7, '#be185d');
    skyGrad.addColorStop(1, '#f97316');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);

    // Glowing sun
    const sunY = h * 0.65 + Math.sin(t * 0.5) * 20;
    const sunGrad = ctx.createRadialGradient(w * 0.5, sunY, 10, w * 0.5, sunY, 160);
    sunGrad.addColorStop(0, 'rgba(254, 240, 138, 0.9)');
    sunGrad.addColorStop(0.4, 'rgba(251, 146, 60, 0.6)');
    sunGrad.addColorStop(1, 'rgba(251, 146, 60, 0)');
    ctx.fillStyle = sunGrad;
    ctx.beginPath();
    ctx.arc(w * 0.5, sunY, 160, 0, Math.PI * 2);
    ctx.fill();

    // Floating bokeh particles
    for (let i = 0; i < 20; i++) {
      const bx = ((i * 97 + t * 40) % w);
      const by = ((i * 123 + Math.sin(t + i) * 60 + h * 0.3) % (h * 0.7));
      const r = (i % 5) * 4 + 4;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.15 + (i % 3) * 0.1})`;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // City skyline silhouette
    ctx.fillStyle = '#090d16';
    const buildingCount = 14;
    const bWidth = w / (buildingCount - 1);
    for (let i = 0; i < buildingCount; i++) {
      const bh = 140 + Math.sin(i * 1.7) * 80 + (i % 3) * 60;
      ctx.fillRect(i * bWidth - 10, h - bh, bWidth + 12, bh);
      // Windows
      ctx.fillStyle = (i % 2 === 0 && Math.sin(t * 2 + i) > 0) ? '#fde047' : '#94a3b8';
      for (let wy = h - bh + 20; wy < h - 20; wy += 25) {
        ctx.fillRect(i * bWidth + 6, wy, 8, 12);
      }
      ctx.fillStyle = '#090d16';
    }

    // Modern title tag
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    ctx.roundRect(w * 0.1, h * 0.12, w * 0.8, 80, 20);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HÀ NỘI · HOÀNG HÔN PHỐ PHƯỜNG', w * 0.5, h * 0.12 + 48);

  } else if (typeId === 'sample-tech-review') {
    // Tech Dark Indigo / Cyan Grid
    ctx.fillStyle = '#050814';
    ctx.fillRect(0, 0, w, h);

    // Cyan glowing grid
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.15)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    const offset = (t * 20) % gridSize;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = offset; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Glowing core
    const cx = w * 0.5;
    const cy = h * 0.45;
    const coreGrad = ctx.createRadialGradient(cx, cy, 20, cx, cy, 220);
    coreGrad.addColorStop(0, 'rgba(59, 130, 246, 0.4)');
    coreGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.2)');
    coreGrad.addColorStop(1, 'rgba(5, 8, 20, 0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 220, 0, Math.PI * 2);
    ctx.fill();

    // Rotating tech ring
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.8);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, 110, 0, Math.PI * 1.5);
    ctx.stroke();

    ctx.rotate(-t * 1.4);
    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 140, 0, Math.PI);
    ctx.stroke();
    ctx.restore();

    // Smartphone silhouette in the center
    ctx.fillStyle = '#1e293b';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 3;
    const pw = 120;
    const ph = 210;
    ctx.roundRect(cx - pw * 0.5, cy - ph * 0.5, pw, ph, 18);
    ctx.fill();
    ctx.stroke();

    // Screen dynamic wave
    ctx.fillStyle = '#0284c7';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SAMSUNG', cx, cy - 50);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    ctx.fillText('AI VOICE SYNC', cx, cy - 25);

    // Dynamic wave inside phone screen
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = -40; x <= 40; x += 4) {
      const y = Math.sin((x + t * 40) * 0.15) * 16;
      if (x === -40) ctx.moveTo(cx + x, cy + 20 + y);
      else ctx.lineTo(cx + x, cy + 20 + y);
    }
    ctx.stroke();

    // Title banner
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CÔNG NGHỆ & ĐIỆN THOẠI THÔNG MINH', cx, h - 80);

  } else {
    // sample-coffee-vlog (Warm Aesthetic)
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#292524');
    bgGrad.addColorStop(0.5, '#44403c');
    bgGrad.addColorStop(1, '#1c1917');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Warm table circle
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.ellipse(w * 0.5, h * 0.75, w * 0.6, 260, 0, 0, Math.PI * 2);
    ctx.fill();

    // Coffee cup
    const cupX = w * 0.5;
    const cupY = h * 0.68;
    ctx.fillStyle = '#fafaf9';
    ctx.beginPath();
    ctx.arc(cupX, cupY, 90, 0, Math.PI * 2);
    ctx.fill();

    // Coffee surface
    ctx.fillStyle = '#451a03';
    ctx.beginPath();
    ctx.arc(cupX, cupY, 74, 0, Math.PI * 2);
    ctx.fill();

    // Latte art leaf
    ctx.strokeStyle = '#fef3c7';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cupX, cupY - 45);
    ctx.lineTo(cupX, cupY + 45);
    ctx.stroke();

    // Rising steam
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 3;
    for (let s = -30; s <= 30; s += 30) {
      ctx.beginPath();
      const steamStart = cupY - 100;
      for (let sy = 0; sy < 120; sy += 10) {
        const sx = cupX + s + Math.sin((sy - t * 60) * 0.08) * 12;
        if (sy === 0) ctx.moveTo(sx, steamStart - sy);
        else ctx.lineTo(sx, steamStart - sy);
      }
      ctx.stroke();
    }

    // Elegant text
    ctx.fillStyle = '#fef08a';
    ctx.font = '600 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('MỘT TÁCH CÀ PHÊ BUỔI SÁNG', w * 0.5, h * 0.22);
    ctx.fillStyle = '#d6d3d1';
    ctx.font = '16px sans-serif';
    ctx.fillText('Hương vị thơm ngon và những câu chuyện', w * 0.5, h * 0.26);
  }

  // Audio waveform indicator at bottom
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  const bars = 24;
  const barW = (w * 0.6) / bars;
  const startX = w * 0.2;
  const baseY = h - 35;
  for (let b = 0; b < bars; b++) {
    const wave = Math.abs(Math.sin(t * 5 + b * 0.4)) * 26 + 4;
    ctx.fillRect(startX + b * barW + 2, baseY - wave * 0.5, barW - 4, wave);
  }

  ctx.restore();
}

import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Initialize GoogleGenAI server-side with User-Agent header
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Convert 24kHz 16-bit mono PCM into standard 44-byte header WAV buffer
function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const header = Buffer.alloc(44);
  const dataLength = pcmBuffer.length;
  const fileSize = 36 + dataLength;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);

  // RIFF identifier
  header.write('RIFF', 0);
  header.writeUInt32LE(fileSize, 4);
  header.write('WAVE', 8);

  // fmt subchunk
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // data subchunk
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// API: TTS endpoint using gemini-3.8-flash-lite-tts
app.post('/api/tts/gemini', async (req, res) => {
  try {
    const { text, voice = 'Kore', style = 'Giọng đọc chuẩn tiếng Việt, truyền cảm và rõ ràng' } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      res.status(400).json({ error: 'Nội dung văn bản không được để trống.' });
      return;
    }

    if (!ai) {
      res.status(503).json({
        error: 'Chưa cấu hình GEMINI_API_KEY trên server.',
        fallback: true,
      });
      return;
    }

    // Supported voices: Puck, Charon, Kore, Fenrir, Zephyr
    const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    const chosenVoice = validVoices.includes(voice) ? voice : 'Kore';

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.trim(),
              speechMetadata: {
                style: style || 'Giọng đọc tiếng Việt truyền cảm, tự nhiên',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: chosenVoice },
          },
        },
      },
    });

    const candidate = response.candidates?.[0];
    const audioPart = candidate?.content?.parts?.find((p) => p.inlineData && p.inlineData.data);

    if (!audioPart || !audioPart.inlineData?.data) {
      res.status(500).json({ error: 'Không nhận được dữ liệu âm thanh từ Gemini TTS.' });
      return;
    }

    const rawPcmBase64 = audioPart.inlineData.data;
    const rawPcmBuffer = Buffer.from(rawPcmBase64, 'base64');

    // Add WAV header so client can directly use standard audio/wav
    const wavBuffer = pcmToWav(rawPcmBuffer, 24000, 1, 16);
    const wavBase64 = wavBuffer.toString('base64');
    const durationSeconds = rawPcmBuffer.length / (24000 * 2);

    res.json({
      success: true,
      audioBase64: wavBase64,
      mimeType: 'audio/wav',
      sampleRate: 24000,
      duration: durationSeconds,
      voice: chosenVoice,
    });
  } catch (error: any) {
    console.error('Lỗi Gemini TTS:', error);
    res.status(500).json({
      error: error?.message || 'Lỗi xử lý chuyển văn bản thành giọng nói.',
      fallback: true,
    });
  }
});

// API: Enhance or write Vietnamese script with gemini-3.8-flash
app.post('/api/script/enhance', async (req, res) => {
  try {
    const { prompt, tone = 'engaging' } = req.body;
    if (!prompt) {
      res.status(400).json({ error: 'Thiếu nội dung yêu cầu.' });
      return;
    }

    if (!ai) {
      res.status(503).json({ error: 'Chưa cấu hình GEMINI_API_KEY.' });
      return;
    }

    let instruction = 'Bạn là chuyên gia biên kịch video ngắn TikTok, Reels, Shorts và video thuyết minh bằng tiếng Việt.';
    if (tone === 'engaging') {
      instruction += ' Hãy viết lại văn bản sau sao cho lôi cuốn, ngắt nghỉ câu tự nhiên, giàu năng lượng để đọc lồng tiếng video. Chỉ trả về nội dung kịch bản để đọc, không thêm giải thích hay ngoặc kép.';
    } else if (tone === 'news') {
      instruction += ' Hãy viết lại đoạn văn theo phong cách bản tin thời sự, khách quan, cô đọng, rõ ràng, phát âm dễ nghe. Chỉ trả về kịch bản.';
    } else if (tone === 'story') {
      instruction += ' Hãy kể lại đoạn văn bằng giọng kể ấm áp, gợi hình ảnh, giàu cảm xúc, ngắt nhịp nhẹ nhàng. Chỉ trả về kịch bản.';
    } else if (tone === 'shorten') {
      instruction += ' Hãy tóm tắt và rút gọn văn bản thành 2-3 câu súc tích nhất, dễ đọc dưới 15 giây. Chỉ trả về kịch bản.';
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction: instruction,
        temperature: 0.7,
      },
    });

    res.json({
      success: true,
      text: response.text ? response.text.trim() : prompt,
    });
  } catch (error: any) {
    console.error('Lỗi viết kịch bản:', error);
    res.status(500).json({ error: error?.message || 'Lỗi máy chủ khi tạo kịch bản.' });
  }
});

// Helper to detect if video has audio stream using ffprobe
function checkHasAudioStream(filePath: string): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(
      'ffprobe',
      ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=codec_type', '-of', 'csv=p=0', filePath],
      (err, stdout) => {
        resolve(!err && stdout.trim().length > 0);
      }
    );
  });
}

// API: Direct high-speed server-side FFmpeg merge (100% reliable, zero browser canvas dropping)
app.post('/api/video/merge-direct', async (req, res) => {
  const tempFiles: string[] = [];
  try {
    const {
      videoBase64,
      audioBase64,
      audioOffset = 0,
      voiceVolume = 1.0,
      videoVolume = 1.0,
      muteOriginalVideo = false,
      subtitles,
      exportFormat = 'mp4',
    } = req.body;

    if (!videoBase64 || !audioBase64) {
      res.status(400).json({ error: 'Thiếu dữ liệu video hoặc âm thanh để ghép.' });
      return;
    }

    const tempDir = os.tmpdir();
    const id = Date.now() + '-' + Math.random().toString(36).substring(2, 8);

    const videoBuffer = Buffer.from(videoBase64, 'base64');
    const audioBuffer = Buffer.from(audioBase64, 'base64');

    const inputVideoPath = path.join(tempDir, `vietvoice-v-${id}.mp4`);
    const inputAudioPath = path.join(tempDir, `vietvoice-a-${id}.wav`);
    const outputVideoPath = path.join(tempDir, `vietvoice-merged-${id}.${exportFormat === 'webm' ? 'webm' : 'mp4'}`);

    tempFiles.push(inputVideoPath, inputAudioPath, outputVideoPath);

    await fs.promises.writeFile(inputVideoPath, videoBuffer);
    await fs.promises.writeFile(inputAudioPath, audioBuffer);

    // Check if original video has an audio stream
    const hasOrigAudio = await checkHasAudioStream(inputVideoPath);

    // Prepare video filter
    let videoFilter = 'scale=trunc(iw/2)*2:trunc(ih/2)*2';
    if (subtitles?.enabled && subtitles?.text && subtitles.text.trim()) {
      const srtPath = path.join(tempDir, `vietvoice-sub-${id}.srt`);
      tempFiles.push(srtPath);
      const cleanText = subtitles.text.replace(/\r\n/g, '\n').trim();
      const srtContent = `1\n00:00:00,000 --> 00:02:00,000\n${cleanText}\n`;
      await fs.promises.writeFile(srtPath, srtContent, 'utf8');
      videoFilter += `,subtitles=${srtPath}`;
    }

    const offsetMs = Math.max(0, Math.round(audioOffset * 1000));
    const vVol = Math.max(0, voiceVolume);
    const oVol = Math.max(0, videoVolume);

    let filterComplex = '';
    let mapArgs: string[] = [];

    if (!muteOriginalVideo && oVol > 0 && hasOrigAudio) {
      filterComplex = `[0:v]${videoFilter}[vout];[0:a]volume=${oVol}[a0];[1:a]adelay=${offsetMs}|${offsetMs},volume=${vVol}[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]`;
      mapArgs = ['-map', '[vout]', '-map', '[aout]'];
    } else {
      filterComplex = `[0:v]${videoFilter}[vout];[1:a]adelay=${offsetMs}|${offsetMs},volume=${vVol}[aout]`;
      mapArgs = ['-map', '[vout]', '-map', '[aout]'];
    }

    const ffmpegArgs = [
      '-y',
      '-i', inputVideoPath,
      '-i', inputAudioPath,
      '-filter_complex', filterComplex,
      ...mapArgs,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-shortest',
      '-movflags', '+faststart',
      outputVideoPath,
    ];

    await execFileAsync('ffmpeg', ffmpegArgs);

    const outputBuffer = await fs.promises.readFile(outputVideoPath);
    const resultBase64 = outputBuffer.toString('base64');

    res.json({
      success: true,
      videoBase64: resultBase64,
      mimeType: exportFormat === 'webm' ? 'video/webm' : 'video/mp4',
      size: outputBuffer.length,
      format: exportFormat.toUpperCase(),
    });
  } catch (error: any) {
    console.error('Lỗi ghép video trực tiếp bằng FFmpeg:', error);
    res.status(500).json({
      error: error?.message || 'Có lỗi xảy ra khi xử lý ghép video trên máy chủ.',
    });
  } finally {
    // Cleanup files asynchronously
    for (const f of tempFiles) {
      fs.promises.unlink(f).catch(() => {});
    }
  }
});

// API: Convert video to genuine MP4 format (H.264 + AAC + faststart)
app.post('/api/video/convert-to-mp4', async (req, res) => {
  try {
    const { videoBase64 } = req.body;
    if (!videoBase64) {
      res.status(400).json({ error: 'Thiếu dữ liệu video để chuyển đổi sang MP4.' });
      return;
    }

    const inputBuffer = Buffer.from(videoBase64, 'base64');
    if (inputBuffer.length < 2000) {
      res.status(400).json({
        error: `Dữ liệu video chưa ghi hình hoàn tất hoặc bị gián đoạn (chỉ có ${inputBuffer.length} bytes). Vui lòng thử lại.`,
      });
      return;
    }

    const tempDir = os.tmpdir();
    const id = Date.now() + '-' + Math.random().toString(36).substring(2, 8);
    const inputPath = path.join(tempDir, `vietvoice-in-${id}.webm`);
    const outputPath = path.join(tempDir, `vietvoice-out-${id}.mp4`);

    await fs.promises.writeFile(inputPath, inputBuffer);

    // Run FFmpeg to create universally compatible MP4
    await execFileAsync('ffmpeg', [
      '-y',
      '-i', inputPath,
      '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-movflags', '+faststart',
      outputPath,
    ]);

    const outputBuffer = await fs.promises.readFile(outputPath);
    const mp4Base64 = outputBuffer.toString('base64');

    // Clean up temporary files asynchronously
    fs.promises.unlink(inputPath).catch(() => {});
    fs.promises.unlink(outputPath).catch(() => {});

    res.json({
      success: true,
      mp4Base64,
      mimeType: 'video/mp4',
      size: outputBuffer.length,
    });
  } catch (error: any) {
    console.error('Lỗi chuyển đổi video sang MP4:', error);
    res.status(500).json({
      error: error?.message || 'Có lỗi xảy ra khi chuyển đổi video sang MP4.',
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`🚀 VietVoice Studio server đang chạy tại port ${port}`);
  });
}

startServer().catch((err) => {
  console.error('Không thể khởi động server:', err);
  process.exit(1);
});

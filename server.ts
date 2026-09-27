import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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

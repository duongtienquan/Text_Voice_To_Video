import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Play,
  Pause,
  Sparkles,
  Volume2,
  RotateCcw,
  CheckCircle2,
  Wand2,
  Download,
  ArrowRight,
  AlertCircle,
  Sliders,
} from 'lucide-react';
import { AudioTrackData, VoiceOption } from '../types';
import {
  base64ToBlob,
  getDeviceVoices,
  synthesizeDeviceSpeechToBlob,
  getAudioDuration,
} from '../utils/audioUtils';

interface StepTextToSpeechProps {
  currentAudio: AudioTrackData | null;
  onAudioGenerated: (audioData: AudioTrackData) => void;
  onNext: () => void;
}

const PRESET_SCRIPTS = [
  {
    title: '📱 Review Samsung Galaxy',
    text: 'Chào mừng các bạn đã quay trở lại. Hôm nay mình sẽ chia sẻ nhanh 3 tính năng ẩn cực kỳ hữu ích trên điện thoại Samsung mà có thể bạn chưa từng biết đến!',
  },
  {
    title: '🌆 Hoàng hôn thành phố',
    text: 'Một buổi chiều hoàng hôn rực rỡ buông xuống thành phố. Từng dòng người tấp nập trở về sau một ngày dài làm việc, để lại những khoảnh khắc thật bình yên.',
  },
  {
    title: '☕ Vlog Cà phê sáng',
    text: 'Bắt đầu ngày mới cùng một tách cà phê thơm nồng. Chúc bạn có một ngày làm việc tràn đầy năng lượng, nhiều may mắn và luôn giữ nụ cười trên môi.',
  },
  {
    title: '⚡ Tin tức nhanh 15s',
    text: 'Bản tin công nghệ nóng nhất hôm nay: Trí tuệ nhân tạo ngày càng phát triển mạnh mẽ, giúp người dùng sáng tạo nội dung video và âm thanh chỉ trong vài giây.',
  },
];

const GEMINI_VOICES: VoiceOption[] = [
  {
    id: 'Kore',
    name: 'Kore (Nữ - Truyền cảm, ngọt ngào)',
    gender: 'female',
    styleDescription: 'Giọng đọc chuẩn tiếng Việt, êm dịu, ấm áp, thích hợp review và kể chuyện',
    engine: 'gemini',
    voiceName: 'Kore',
    badge: 'Phổ biến nhất',
  },
  {
    id: 'Puck',
    name: 'Puck (Nam - Trầm ấm, tự nhiên)',
    gender: 'male',
    styleDescription: 'Giọng đọc nam tự nhiên, rõ ràng, phong cách thuyết minh và chia sẻ kinh nghiệm',
    engine: 'gemini',
    voiceName: 'Puck',
    badge: 'Khuyên dùng',
  },
  {
    id: 'Zephyr',
    name: 'Zephyr (Nữ - Năng động, tươi trẻ)',
    gender: 'female',
    styleDescription: 'Giọng đọc nữ trẻ trung, sôi động, rất hợp video TikTok, Shorts và Reels ngắn',
    engine: 'gemini',
    voiceName: 'Zephyr',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir (Nam - Mạnh mẽ, dứt khoát)',
    gender: 'male',
    styleDescription: 'Giọng đọc nam vang, tự tin, chuyên nghiệp cho giới thiệu sản phẩm và quảng cáo',
    engine: 'gemini',
    voiceName: 'Fenrir',
  },
  {
    id: 'Charon',
    name: 'Charon (Nam - Điềm đạm, sâu lắng)',
    gender: 'male',
    styleDescription: 'Giọng đọc nam trầm lắng, diễn cảm sâu sắc cho thơ ca, triết lý và podcast',
    engine: 'gemini',
    voiceName: 'Charon',
  },
];

export const StepTextToSpeech: React.FC<StepTextToSpeechProps> = ({
  currentAudio,
  onAudioGenerated,
  onNext,
}) => {
  const [text, setText] = useState<string>(
    currentAudio?.text ||
      'Chào mừng các bạn đã đến với video hôm nay. Mình sẽ hướng dẫn các bạn cách lồng tiếng tự động vào video cực kỳ nhanh chóng trên điện thoại Samsung!'
  );
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('Kore');
  const [useDeviceVoice, setUseDeviceVoice] = useState<boolean>(false);
  const [deviceVoices, setDeviceVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedDeviceVoiceName, setSelectedDeviceVoiceName] = useState<string>('');
  const [speechSpeed, setSpeechSpeed] = useState<number>(1.0);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Audio player state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(currentAudio?.duration || 0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load device speech voices
  useEffect(() => {
    getDeviceVoices().then((voices) => {
      setDeviceVoices(voices);
      const viVoice = voices.find(
        (v) => v.lang.startsWith('vi') || v.name.toLowerCase().includes('vietnam')
      );
      if (viVoice) {
        setSelectedDeviceVoiceName(viVoice.name);
      } else if (voices.length > 0) {
        setSelectedDeviceVoiceName(voices[0].name);
      }
    });
  }, []);

  // Update audio ref when audio changes
  useEffect(() => {
    if (currentAudio?.url) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      const audio = new Audio(currentAudio.url);
      audio.onloadedmetadata = () => {
        setAudioDuration(audio.duration || currentAudio.duration);
      };
      audio.ontimeupdate = () => {
        setAudioCurrentTime(audio.currentTime);
      };
      audio.onended = () => {
        setIsPlaying(false);
        setAudioCurrentTime(0);
      };
      audioRef.current = audio;
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [currentAudio]);

  const handleTogglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setAudioCurrentTime(val);
    }
  };

  // Enhance script with AI
  const handleEnhanceScript = async (tone: 'engaging' | 'news' | 'story' | 'shorten') => {
    if (!text.trim()) return;
    setIsEnhancing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/script/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, tone }),
      });
      const data = await res.json();
      if (data.text) {
        setText(data.text);
      } else if (data.error) {
        setErrorMsg(`Không thể tinh chỉnh kịch bản: ${data.error}`);
      }
    } catch (err: any) {
      setErrorMsg('Không thể kết nối máy chủ AI biên kịch.');
    } finally {
      setIsEnhancing(false);
    }
  };

  // Generate Voice
  const handleGenerateVoice = async () => {
    if (!text.trim()) {
      setErrorMsg('Vui lòng nhập văn bản tiếng Việt để tạo giọng đọc.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      if (useDeviceVoice) {
        // Use Samsung / Device SpeechSynthesis
        const chosenDevVoice = deviceVoices.find((v) => v.name === selectedDeviceVoiceName);
        const { blob, duration } = await synthesizeDeviceSpeechToBlob(
          text,
          chosenDevVoice,
          speechSpeed
        );

        const url = URL.createObjectURL(blob);
        const track: AudioTrackData = {
          blob,
          url,
          duration,
          text,
          voiceName: chosenDevVoice?.name || 'Giọng máy Samsung',
          engine: 'browser',
          createdAt: Date.now(),
        };

        onAudioGenerated(track);
      } else {
        // Use Gemini Cloud AI TTS
        const voiceOption = GEMINI_VOICES.find((v) => v.id === selectedVoiceId) || GEMINI_VOICES[0];

        const response = await fetch('/api/tts/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: text.trim(),
            voice: voiceOption.voiceName,
            style: voiceOption.styleDescription,
          }),
        });

        const data = await response.json();

        if (data.success && data.audioBase64) {
          const blob = base64ToBlob(data.audioBase64, data.mimeType || 'audio/wav');
          const url = URL.createObjectURL(blob);
          const duration = data.duration || (await getAudioDuration(blob));

          const track: AudioTrackData = {
            blob,
            url,
            duration,
            text: text.trim(),
            voiceName: voiceOption.name,
            engine: 'gemini',
            createdAt: Date.now(),
          };

          onAudioGenerated(track);
        } else {
          // Fallback to device speech if Gemini is unavailable
          console.warn('Gemini TTS failed, falling back to device speech:', data.error);
          const fallbackDevVoice = deviceVoices.find((v) => v.lang.startsWith('vi'));
          const { blob, duration } = await synthesizeDeviceSpeechToBlob(
            text,
            fallbackDevVoice,
            speechSpeed
          );

          const url = URL.createObjectURL(blob);
          const track: AudioTrackData = {
            blob,
            url,
            duration,
            text,
            voiceName: fallbackDevVoice?.name || 'Giọng máy thiết bị (Fallback)',
            engine: 'browser',
            createdAt: Date.now(),
          };

          onAudioGenerated(track);
          setErrorMsg('Đã chuyển sang giọng đọc thiết bị dự phòng do lỗi kết nối đám mây.');
        }
      }
    } catch (err: any) {
      console.error('Error generating audio:', err);
      // Try local device speech synthesis as ultimate safeguard
      try {
        const fallbackVoice = deviceVoices.find((v) => v.lang.startsWith('vi'));
        const { blob, duration } = await synthesizeDeviceSpeechToBlob(
          text,
          fallbackVoice,
          speechSpeed
        );
        const url = URL.createObjectURL(blob);
        onAudioGenerated({
          blob,
          url,
          duration,
          text,
          voiceName: fallbackVoice?.name || 'Giọng máy thiết bị',
          engine: 'browser',
          createdAt: Date.now(),
        });
      } catch (innerErr: any) {
        setErrorMsg(`Lỗi tạo giọng nói: ${err?.message || 'Không thể tạo âm thanh'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Mic className="w-5 h-5 text-indigo-400" />
          Bước 1: Soạn văn bản & Tạo giọng nói tiếng Việt
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Nhập văn bản cần thuyết minh, chọn giọng đọc AI chuẩn và nhấn tạo âm thanh.
        </p>
      </div>

      {/* Preset script suggestions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-slate-300">Kịch bản mẫu gợi ý:</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {PRESET_SCRIPTS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setText(preset.text)}
              className="text-left p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/80 transition-all text-xs group"
            >
              <div className="font-semibold text-slate-200 group-hover:text-indigo-300 truncate">
                {preset.title}
              </div>
              <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                {preset.text}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Textarea */}
      <div className="space-y-2">
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Nhập nội dung tiếng Việt bạn muốn chuyển thành giọng đọc lồng tiếng video tại đây..."
            rows={4}
            className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all resize-none"
          />
          <div className="absolute right-3 bottom-3 text-[11px] text-slate-500 select-none">
            {text.length} ký tự · ~{Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / 2.5))}s
          </div>
        </div>

        {/* AI Quick Polish tools */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 flex items-center gap-1 mr-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            AI Biên kịch:
          </span>
          <button
            type="button"
            disabled={isEnhancing || !text.trim()}
            onClick={() => handleEnhanceScript('engaging')}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600/30 text-slate-300 hover:text-indigo-200 border border-slate-700/60 transition-all disabled:opacity-50"
          >
            Lôi cuốn hơn
          </button>
          <button
            type="button"
            disabled={isEnhancing || !text.trim()}
            onClick={() => handleEnhanceScript('news')}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-sky-600/30 text-slate-300 hover:text-sky-200 border border-slate-700/60 transition-all disabled:opacity-50"
          >
            Đọc tin tức
          </button>
          <button
            type="button"
            disabled={isEnhancing || !text.trim()}
            onClick={() => handleEnhanceScript('story')}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-violet-600/30 text-slate-300 hover:text-violet-200 border border-slate-700/60 transition-all disabled:opacity-50"
          >
            Kể chuyện
          </button>
          <button
            type="button"
            disabled={isEnhancing || !text.trim()}
            onClick={() => handleEnhanceScript('shorten')}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-amber-600/30 text-slate-300 hover:text-amber-200 border border-slate-700/60 transition-all disabled:opacity-50"
          >
            Rút gọn
          </button>
        </div>
      </div>

      {/* Voice Selection */}
      <div className="space-y-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <Volume2 className="w-4 h-4 text-indigo-400" />
            Chọn giọng đọc tiếng Việt:
          </label>

          {/* Toggle Device vs Cloud Voice */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setUseDeviceVoice(false)}
              className={`text-[11px] px-2.5 py-1 rounded-md transition-all ${
                !useDeviceVoice
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Gemini AI
            </button>
            <button
              type="button"
              onClick={() => setUseDeviceVoice(true)}
              className={`text-[11px] px-2.5 py-1 rounded-md transition-all ${
                useDeviceVoice
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Giọng Samsung
            </button>
          </div>
        </div>

        {!useDeviceVoice ? (
          /* Gemini Voices */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {GEMINI_VOICES.map((v) => {
              const isSelected = selectedVoiceId === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setSelectedVoiceId(v.id)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm shadow-indigo-500/10'
                      : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-white">{v.name}</span>
                    {v.badge && (
                      <span className="text-[10px] text-sky-400 font-medium">{v.badge}</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                    {v.styleDescription}
                  </p>
                </button>
              );
            })}
          </div>
        ) : (
          /* Device Native SpeechSynthesis */
          <div className="space-y-3">
            <div>
              <select
                value={selectedDeviceVoiceName}
                onChange={(e) => setSelectedDeviceVoiceName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                {deviceVoices.map((v, i) => (
                  <option key={i} value={v.name}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>

            {/* Speed slider */}
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="w-20 shrink-0">Tốc độ: {speechSpeed}x</span>
              <input
                type="range"
                min="0.7"
                max="1.5"
                step="0.1"
                value={speechSpeed}
                onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Error message */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Generate Voice Button */}
      <button
        type="button"
        disabled={isLoading || !text.trim()}
        onClick={handleGenerateVoice}
        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99]"
      >
        {isLoading ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Đang tạo giọng đọc tiếng Việt...</span>
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4" />
            <span>Tạo âm thanh giọng đọc</span>
          </>
        )}
      </button>

      {/* Audio Track Player if generated */}
      {currentAudio && (
        <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-indigo-500/40 space-y-3 shadow-md shadow-indigo-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-white">
                Âm thanh đã sẵn sàng ({currentAudio.voiceName})
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {Math.round(currentAudio.duration * 10) / 10}s
            </span>
          </div>

          {/* Timeline scrub bar */}
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTogglePlay}
                className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-md shadow-indigo-600/30"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>

              <div className="flex-1">
                <input
                  type="range"
                  min="0"
                  max={audioDuration || 1}
                  step="0.05"
                  value={audioCurrentTime}
                  onChange={handleSeek}
                  className="w-full accent-indigo-400 cursor-pointer h-1.5 rounded-lg bg-slate-800"
                />
              </div>

              <span className="text-[11px] font-mono text-slate-400 w-12 text-right">
                {audioCurrentTime.toFixed(1)}s
              </span>
            </div>
          </div>

          {/* Actions: Download Audio & Next */}
          <div className="flex items-center justify-between pt-1">
            <a
              href={currentAudio.url}
              download="giong-doc-tieng-viet.wav"
              className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Tải file âm thanh (.wav)
            </a>

            <button
              type="button"
              onClick={onNext}
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 shadow-sm shadow-indigo-500/20 transition-all"
            >
              <span>Tiếp tục: Chọn video ghép</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

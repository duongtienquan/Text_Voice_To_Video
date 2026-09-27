import React, { useState, useRef, useEffect } from 'react';
import {
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Type,
  ArrowRight,
  Sparkles,
  Layers,
  Palette,
} from 'lucide-react';
import { AudioTrackData, VideoSource, MergeSettings } from '../types';

interface StepSyncPreviewProps {
  audioTrack: AudioTrackData;
  videoSource: VideoSource;
  settings: MergeSettings;
  onUpdateSettings: (settings: MergeSettings) => void;
  onNext: () => void;
}

export const StepSyncPreview: React.FC<StepSyncPreviewProps> = ({
  audioTrack,
  videoSource,
  settings,
  onUpdateSettings,
  onNext,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'audio' | 'subtitles'>('audio');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const maxOffset = Math.max(0, Math.floor(videoSource.duration - 1));

  // Initialize audio and video sync
  useEffect(() => {
    const audio = new Audio(audioTrack.url);
    audioRef.current = audio;

    return () => {
      audio.pause();
    };
  }, [audioTrack]);

  // Handle Play/Pause
  const togglePlay = () => {
    if (!videoRef.current || !audioRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Start video
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        syncAudioWithVideo();
      }).catch(console.error);
    }
  };

  // Sync audio with video time
  const syncAudioWithVideo = () => {
    if (!videoRef.current || !audioRef.current) return;
    const vTime = videoRef.current.currentTime;
    const voiceOffset = settings.audioOffset;

    if (vTime >= voiceOffset && vTime < voiceOffset + audioTrack.duration) {
      const targetAudioTime = vTime - voiceOffset;
      if (Math.abs(audioRef.current.currentTime - targetAudioTime) > 0.15) {
        audioRef.current.currentTime = targetAudioTime;
      }
      audioRef.current.volume = settings.voiceVolume > 1 ? 1 : settings.voiceVolume;
      if (audioRef.current.paused && isPlaying) {
        audioRef.current.play().catch(() => {});
      }
    } else {
      if (!audioRef.current.paused) {
        audioRef.current.pause();
      }
    }
  };

  // Video time update
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    syncAudioWithVideo();
  };

  // Scrubbing timeline
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
    }
    if (audioRef.current) {
      if (val >= settings.audioOffset && val < settings.audioOffset + audioTrack.duration) {
        audioRef.current.currentTime = val - settings.audioOffset;
      } else {
        audioRef.current.pause();
      }
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
    }
    setCurrentTime(0);
  };

  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-indigo-400" />
          Bước 3: Ghép âm thanh & Căn chỉnh video
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Xem trước video và giọng đọc tiếng Việt theo thời gian thực, điều chỉnh âm lượng và phụ đề.
        </p>
      </div>

      {/* Synchronized Live Player with Subtitle Overlay */}
      <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-2xl flex flex-col items-center justify-center">
        <div className="relative w-full aspect-video sm:aspect-[16/10] max-h-[360px] flex items-center justify-center bg-slate-950">
          <video
            ref={videoRef}
            src={videoSource.url}
            playsInline
            muted={settings.muteOriginalVideo}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleVideoEnded}
            className="w-full h-full object-contain"
          />

          {/* Subtitle Overlay Live Simulation */}
          {settings.subtitles.enabled && settings.subtitles.text && (
            <div
              className={`absolute inset-x-4 pointer-events-none flex justify-center transition-all ${
                settings.subtitles.position === 'top'
                  ? 'top-4'
                  : settings.subtitles.position === 'center'
                  ? 'top-1/2 -translate-y-1/2'
                  : 'bottom-6'
              }`}
            >
              <div
                style={{
                  color: settings.subtitles.color,
                  backgroundColor: settings.subtitles.showBackground
                    ? settings.subtitles.backgroundColor
                    : 'transparent',
                  fontSize: `${settings.subtitles.fontSize}px`,
                }}
                className={`max-w-[92%] px-3.5 py-1.5 rounded-xl font-semibold text-center leading-relaxed transition-all shadow-md ${
                  !settings.subtitles.showBackground
                    ? 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]'
                    : ''
                }`}
              >
                {settings.subtitles.text}
              </div>
            </div>
          )}

          {/* Center Play/Pause button */}
          <button
            type="button"
            onClick={togglePlay}
            className="absolute w-12 h-12 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur shadow-xl transition-transform active:scale-95 z-20"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>
        </div>

        {/* Video Scrubber & Play Bar */}
        <div className="w-full bg-slate-950 border-t border-slate-800 px-4 py-2.5 flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            className="text-white hover:text-indigo-400 transition-colors shrink-0"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          <div className="flex-1 flex flex-col justify-center">
            <input
              type="range"
              min="0"
              max={videoSource.duration || 1}
              step="0.05"
              value={currentTime}
              onChange={handleSeek}
              className="w-full accent-indigo-500 cursor-pointer h-1.5 rounded-lg bg-slate-800"
            />
          </div>

          <div className="text-[11px] font-mono text-slate-400 shrink-0">
            {currentTime.toFixed(1)}s / {(videoSource.duration || 0).toFixed(1)}s
          </div>
        </div>
      </div>

      {/* Settings Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('audio')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'audio'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Volume2 className="w-3.5 h-3.5" />
          Âm lượng & Timeline
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('subtitles')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'subtitles'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Type className="w-3.5 h-3.5" />
          Phụ đề hiển thị
        </button>
      </div>

      {/* Tab: Audio & Timeline Sync */}
      {activeTab === 'audio' && (
        <div className="space-y-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          {/* Start Offset Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-200">
                Thời điểm bắt đầu nói:
              </span>
              <span className="font-mono text-indigo-400 font-bold">
                {settings.audioOffset}s
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={maxOffset || 1}
              step="0.2"
              value={settings.audioOffset}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  audioOffset: parseFloat(e.target.value),
                })
              }
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>0.0s (Ngay đầu video)</span>
              <span>{(maxOffset || 0).toFixed(1)}s</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
            {/* Voice Volume */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300">Âm lượng giọng đọc:</span>
                <span className="font-mono text-sky-400">
                  {Math.round(settings.voiceVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2.0"
                step="0.05"
                value={settings.voiceVolume}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    voiceVolume: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-sky-400"
              />
            </div>

            {/* Video Background Volume */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-300">Nhạc/tiếng gốc video:</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      ...settings,
                      muteOriginalVideo: !settings.muteOriginalVideo,
                    })
                  }
                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                    settings.muteOriginalVideo
                      ? 'bg-rose-950/60 border-rose-800 text-rose-300'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  {settings.muteOriginalVideo ? 'Đã tắt tiếng' : 'Tắt tiếng video'}
                </button>
              </div>
              <input
                type="range"
                min="0"
                max="1.0"
                step="0.05"
                disabled={settings.muteOriginalVideo}
                value={settings.muteOriginalVideo ? 0 : settings.videoVolume}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    videoVolume: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-slate-400 disabled:opacity-30"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab: Subtitles */}
      {activeTab === 'subtitles' && (
        <div className="space-y-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.subtitles.enabled}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    subtitles: {
                      ...settings.subtitles,
                      enabled: e.target.checked,
                    },
                  })
                }
                className="w-4 h-4 accent-indigo-600 rounded"
              />
              Bật phụ đề chữ chạy trên video
            </label>

            {settings.subtitles.enabled && (
              <button
                type="button"
                onClick={() =>
                  onUpdateSettings({
                    ...settings,
                    subtitles: {
                      ...settings.subtitles,
                      text: audioTrack.text,
                    },
                  })
                }
                className="text-[11px] text-indigo-400 hover:text-indigo-300"
              >
                Khôi phục theo giọng đọc
              </button>
            )}
          </div>

          {settings.subtitles.enabled && (
            <div className="space-y-3 pt-2">
              {/* Subtitle text edit */}
              <div>
                <textarea
                  value={settings.subtitles.text}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      subtitles: {
                        ...settings.subtitles,
                        text: e.target.value,
                      },
                    })
                  }
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  placeholder="Nhập nội dung phụ đề hiển thị..."
                />
              </div>

              {/* Subtitle Position & Size */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Vị trí:</span>
                  <div className="flex gap-1">
                    {(['bottom', 'center', 'top'] as const).map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() =>
                          onUpdateSettings({
                            ...settings,
                            subtitles: {
                              ...settings.subtitles,
                              position: pos,
                            },
                          })
                        }
                        className={`flex-1 py-1 text-[11px] rounded border transition-colors ${
                          settings.subtitles.position === pos
                            ? 'bg-indigo-600 border-indigo-500 text-white font-medium'
                            : 'bg-slate-950 border-slate-800 text-slate-400'
                        }`}
                      >
                        {pos === 'bottom' ? 'Dưới' : pos === 'center' ? 'Giữa' : 'Trên'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Cỡ chữ:</span>
                  <input
                    type="range"
                    min="14"
                    max="36"
                    step="2"
                    value={settings.subtitles.fontSize}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        subtitles: {
                          ...settings.subtitles,
                          fontSize: parseInt(e.target.value, 10),
                        },
                      })
                    }
                    className="w-full accent-indigo-500"
                  />
                </div>
              </div>

              {/* Colors */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Màu chữ:</span>
                  {[
                    { color: '#ffffff', name: 'Trắng' },
                    { color: '#fde047', name: 'Vàng' },
                    { color: '#38bdf8', name: 'Xanh' },
                    { color: '#f472b6', name: 'Hồng' },
                  ].map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      onClick={() =>
                        onUpdateSettings({
                          ...settings,
                          subtitles: {
                            ...settings.subtitles,
                            color: c.color,
                          },
                        })
                      }
                      style={{ backgroundColor: c.color }}
                      className={`w-5 h-5 rounded-full border-2 transition-transform ${
                        settings.subtitles.color === c.color
                          ? 'border-indigo-500 scale-110 shadow-sm'
                          : 'border-slate-800 hover:scale-105'
                      }`}
                      title={c.name}
                    />
                  ))}
                </div>

                <label className="flex items-center gap-1.5 text-[11px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={settings.subtitles.showBackground}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        subtitles: {
                          ...settings.subtitles,
                          showBackground: e.target.checked,
                        },
                      })
                    }
                    className="w-3.5 h-3.5 accent-indigo-600 rounded"
                  />
                  Hộp nền mờ
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Move to Step 4 button */}
      <button
        type="button"
        onClick={onNext}
        className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
      >
        <span>Hoàn tất căn chỉnh · Xuất video thành phẩm</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};

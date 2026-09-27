import React, { useState, useRef } from 'react';
import {
  Video,
  Upload,
  Film,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Smartphone,
  Play,
  Pause,
  AlertCircle,
} from 'lucide-react';
import { VideoSource } from '../types';
import { PRESET_SAMPLE_INFO, generateProceduralVideoBlob } from '../utils/sampleVideos';

interface StepVideoSelectorProps {
  currentVideo: VideoSource | null;
  onVideoSelected: (video: VideoSource) => void;
  onNext: () => void;
}

export const StepVideoSelector: React.FC<StepVideoSelectorProps> = ({
  currentVideo,
  onVideoSelected,
  onNext,
}) => {
  const [isGeneratingSample, setIsGeneratingSample] = useState<string | null>(null);
  const [sampleProgress, setSampleProgress] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [previewPlaying, setPreviewPlaying] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle local video file upload from Samsung device
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    const videoUrl = URL.createObjectURL(file);
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = videoUrl;

    tempVideo.onloadedmetadata = () => {
      const width = tempVideo.videoWidth || 720;
      const height = tempVideo.videoHeight || 1280;
      const duration = tempVideo.duration || 5;

      let ratio: '9:16' | '16:9' | '1:1' = '9:16';
      if (width > height) {
        ratio = '16:9';
      } else if (Math.abs(width - height) < 50) {
        ratio = '1:1';
      }

      const videoSource: VideoSource = {
        id: `upload-${Date.now()}`,
        name: file.name,
        url: videoUrl,
        file: file,
        duration: duration,
        width,
        height,
        aspectRatio: ratio,
        isSample: false,
      };

      onVideoSelected(videoSource);
    };

    tempVideo.onerror = () => {
      setErrorMsg('Không thể đọc tệp video này. Vui lòng thử tệp MP4 hoặc WebM khác.');
    };
  };

  // Generate and pick sample procedural video
  const handleSelectSample = async (sampleId: string) => {
    setIsGeneratingSample(sampleId);
    setSampleProgress(10);
    setErrorMsg(null);

    try {
      const blob = await generateProceduralVideoBlob(sampleId, (p) => {
        setSampleProgress(p);
      });

      const url = URL.createObjectURL(blob);
      const info = PRESET_SAMPLE_INFO.find((s) => s.id === sampleId)!;

      const videoSource: VideoSource = {
        id: sampleId,
        name: info.name,
        url: url,
        duration: info.duration,
        width: info.width,
        height: info.height,
        aspectRatio: info.aspectRatio,
        isSample: true,
      };

      onVideoSelected(videoSource);
    } catch (err: any) {
      setErrorMsg(`Lỗi tạo video mẫu: ${err?.message || 'Không thể tạo'}`);
    } finally {
      setIsGeneratingSample(null);
      setSampleProgress(0);
    }
  };

  const togglePreviewPlay = () => {
    if (!videoRef.current) return;
    if (previewPlaying) {
      videoRef.current.pause();
      setPreviewPlaying(false);
    } else {
      videoRef.current.play().then(() => setPreviewPlaying(true)).catch(console.error);
    }
  };

  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Film className="w-5 h-5 text-sky-400" />
          Bước 2: Chọn video có sẵn trên điện thoại
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Tải video từ bộ sưu tập điện thoại Samsung của bạn hoặc chọn các video mẫu có sẵn.
        </p>
      </div>

      {/* Upload button area */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,video/mp4,video/webm,video/quicktime,video/x-matroska"
        className="hidden"
        onChange={handleFileUpload}
      />

      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-slate-800 hover:border-indigo-500/80 rounded-2xl p-6 bg-slate-900/60 hover:bg-slate-900/90 transition-all cursor-pointer text-center group space-y-2"
      >
        <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto group-hover:scale-105 transition-transform">
          <Upload className="w-6 h-6" />
        </div>
        <div>
          <div className="text-sm font-semibold text-white group-hover:text-indigo-300">
            Tải video từ Bộ sưu tập Samsung / Tệp tin
          </div>
          <div className="text-xs text-slate-400 mt-1">
            Hỗ trợ MP4, WebM, MOV, quay từ camera điện thoại
          </div>
        </div>
      </div>

      {/* Preset sample videos */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Hoặc chọn video mẫu thử nghiệm ngay:
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {PRESET_SAMPLE_INFO.map((sample) => {
            const isSelected = currentVideo?.id === sample.id;
            const isThisLoading = isGeneratingSample === sample.id;

            return (
              <div
                key={sample.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-sky-950/40 border-sky-500/60 shadow-sm shadow-sky-500/10'
                    : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-slate-200 truncate">
                      {sample.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-sky-400 font-mono">
                      {sample.aspectRatio}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">
                    {sample.description}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={isThisLoading || isGeneratingSample !== null}
                  onClick={() => handleSelectSample(sample.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium shrink-0 transition-all ${
                    isSelected
                      ? 'bg-sky-600 text-white font-semibold'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white'
                  }`}
                >
                  {isThisLoading ? (
                    <span className="flex items-center gap-1">
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{sampleProgress}%</span>
                    </span>
                  ) : isSelected ? (
                    'Đang chọn'
                  ) : (
                    'Chọn video này'
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Selected Video Preview Card */}
      {currentVideo && (
        <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-sky-500/40 space-y-3 shadow-md shadow-sky-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-white truncate max-w-[220px]">
                {currentVideo.name}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
              <span>{Math.round(currentVideo.duration * 10) / 10}s</span>
              <span>·</span>
              <span>{currentVideo.width}x{currentVideo.height}</span>
            </div>
          </div>

          {/* Video preview player */}
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center group">
            <video
              ref={videoRef}
              src={currentVideo.url}
              playsInline
              loop
              className="w-full h-full object-contain"
              onEnded={() => setPreviewPlaying(false)}
            />
            <button
              type="button"
              onClick={togglePreviewPlay}
              className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center backdrop-blur shadow-lg transition-transform active:scale-95 group-hover:opacity-100 opacity-90"
            >
              {previewPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={onNext}
              className="text-xs font-semibold px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5 shadow-sm shadow-sky-500/20 transition-all"
            >
              <span>Tiếp tục: Căn chỉnh & Ghép âm thanh</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

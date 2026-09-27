import React, { useState, useRef, useEffect } from 'react';
import {
  Download,
  CheckCircle2,
  Share2,
  RotateCcw,
  Sparkles,
  Film,
  Play,
  Pause,
  AlertCircle,
  Smartphone,
  ExternalLink,
} from 'lucide-react';
import { AudioTrackData, VideoSource, MergeSettings, RenderProgress } from '../types';
import { VideoAudioMerger } from '../utils/videoMerger';

interface StepExportProps {
  audioTrack: AudioTrackData;
  videoSource: VideoSource;
  settings: MergeSettings;
  onBackToEdit: () => void;
  onStartNew: () => void;
}

export const StepExport: React.FC<StepExportProps> = ({
  audioTrack,
  videoSource,
  settings,
  onBackToEdit,
  onStartNew,
}) => {
  const [renderProgress, setRenderProgress] = useState<RenderProgress>({
    status: 'idle',
    progress: 0,
    message: 'Sẵn sàng xuất video đã ghép',
  });

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const mergerRef = useRef<VideoAudioMerger | null>(null);
  const finalVideoRef = useRef<HTMLVideoElement | null>(null);

  // Auto trigger export or allow manual trigger
  const handleStartMerge = async () => {
    setRenderProgress({
      status: 'rendering',
      progress: 5,
      message: 'Khởi động bộ mã hóa video...',
    });

    const merger = new VideoAudioMerger();
    mergerRef.current = merger;

    try {
      const result = await merger.merge(
        videoSource.url,
        audioTrack.blob,
        settings,
        (progress, message) => {
          setRenderProgress({
            status: 'rendering',
            progress,
            message,
          });
        }
      );

      setRenderProgress({
        status: 'completed',
        progress: 100,
        message: 'Đã hoàn tất ghép video thành công!',
        exportedBlob: result.blob,
        exportedUrl: result.url,
        exportedDuration: result.duration,
        exportFormat: result.blob.type.includes('mp4') ? 'MP4' : 'WebM (Video chất lượng cao)',
      });
    } catch (err: any) {
      console.error('Merge error:', err);
      setRenderProgress({
        status: 'error',
        progress: 0,
        message: err?.message || 'Có lỗi xảy ra khi xuất video.',
      });
    }
  };

  const handleCancelMerge = () => {
    mergerRef.current?.cancel();
    setRenderProgress({
      status: 'idle',
      progress: 0,
      message: 'Đã hủy xuất video.',
    });
  };

  const toggleFinalPlay = () => {
    if (!finalVideoRef.current) return;
    if (isPlaying) {
      finalVideoRef.current.pause();
      setIsPlaying(false);
    } else {
      finalVideoRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="space-y-5">
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Film className="w-5 h-5 text-emerald-400" />
          Bước 4: Xuất & Tải video thành phẩm
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Hợp nhất hình ảnh, giọng đọc tiếng Việt và phụ đề thành 1 tệp video hoàn chỉnh cho máy Samsung.
        </p>
      </div>

      {/* State: Idle - Ready to render */}
      {renderProgress.status === 'idle' && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">
              Tất cả tài nguyên đã sẵn sàng để xuất video
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Video gốc ({videoSource.name}) và giọng đọc ({audioTrack.voiceName}) sẽ được ghép lại với độ trễ {settings.audioOffset}s.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <button
              type="button"
              onClick={handleStartMerge}
              className="py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/20 transition-all active:scale-98 flex items-center justify-center gap-2"
            >
              <Film className="w-4 h-4" />
              Bắt đầu xuất video ngay
            </button>
            <button
              type="button"
              onClick={onBackToEdit}
              className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
            >
              Quay lại chỉnh sửa thêm
            </button>
          </div>
        </div>
      )}

      {/* State: Rendering */}
      {renderProgress.status === 'rendering' && (
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-indigo-500/30 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto animate-pulse">
            <div className="w-6 h-6 border-3 border-indigo-500 border-t-white rounded-full animate-spin" />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white">Đang xử lý xuất video...</h3>
            <p className="text-xs text-indigo-300 mt-1 font-medium">{renderProgress.message}</p>
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5 max-w-sm mx-auto">
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-200"
                style={{ width: `${renderProgress.progress}%` }}
              />
            </div>
            <div className="text-[11px] font-mono text-slate-400 flex justify-between">
              <span>Tiến độ</span>
              <span>{renderProgress.progress}%</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCancelMerge}
            className="text-xs text-slate-400 hover:text-rose-400 pt-1"
          >
            Hủy quá trình
          </button>
        </div>
      )}

      {/* State: Error */}
      {renderProgress.status === 'error' && (
        <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-900/40 text-rose-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-rose-200">Không thể xuất video</h3>
          <p className="text-xs text-rose-300/80">{renderProgress.message}</p>
          <div className="flex justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleStartMerge}
              className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-500"
            >
              Thử lại
            </button>
            <button
              type="button"
              onClick={onBackToEdit}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
            >
              Chỉnh sửa kịch bản
            </button>
          </div>
        </div>
      )}

      {/* State: Completed - Final Video Player & Download */}
      {renderProgress.status === 'completed' && renderProgress.exportedUrl && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-emerald-500/40 space-y-4 shadow-xl shadow-emerald-950/20">
            {/* Header Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-xs font-bold text-white">
                    Video đã ghép giọng tiếng Việt hoàn tất!
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Sẵn sàng lưu vào điện thoại Samsung hoặc chia sẻ lên mạng xã hội.
                  </p>
                </div>
              </div>
            </div>

            {/* Final Video Player */}
            <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center group shadow-inner">
              <video
                ref={finalVideoRef}
                src={renderProgress.exportedUrl}
                controls
                playsInline
                className="w-full h-full object-contain"
                onEnded={() => setIsPlaying(false)}
              />
            </div>

            {/* Video File Specs */}
            <div className="grid grid-cols-3 gap-2 p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-center">
              <div>
                <span className="text-[10px] text-slate-500 block">Dung lượng</span>
                <span className="text-xs font-semibold text-slate-200">
                  {formatFileSize(renderProgress.exportedBlob?.size)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Thời lượng</span>
                <span className="text-xs font-semibold text-slate-200">
                  {Math.round((renderProgress.exportedDuration || videoSource.duration) * 10) / 10}s
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Định dạng</span>
                <span className="text-xs font-semibold text-sky-400">
                  {renderProgress.exportFormat}
                </span>
              </div>
            </div>

            {/* Main Action: Download video to Samsung Device */}
            <div className="space-y-2 pt-1">
              <a
                href={renderProgress.exportedUrl}
                download={`vietvoice-samsung-${Date.now()}.webm`}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <Download className="w-4 h-4" />
                <span>Tải video về điện thoại Samsung</span>
              </a>

              {/* Samsung Gallery & Social Sharing Instructions */}
              <div className="p-3 bg-sky-950/30 border border-sky-800/40 rounded-xl text-xs text-sky-200/90 space-y-1">
                <div className="font-semibold flex items-center gap-1 text-sky-300">
                  <Smartphone className="w-3.5 h-3.5" />
                  Mẹo cho điện thoại Samsung:
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Sau khi tải về, video sẽ nằm trong ứng dụng <span className="font-semibold text-white">File của bạn (My Files) &gt; Tải về (Downloads)</span> hoặc hiển thị ngay trong <span className="font-semibold text-white">Bộ sưu tập (Samsung Gallery)</span>. Bạn có thể đăng trực tiếp lên TikTok, YouTube Shorts, Facebook Reels hoặc gửi qua Zalo!
                </p>
              </div>
            </div>

            {/* Bottom Nav: Edit or New */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={onBackToEdit}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Căn chỉnh lại âm lượng / phụ đề
              </button>
              <button
                type="button"
                onClick={onStartNew}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Tạo video lồng tiếng mới
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

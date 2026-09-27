import React from 'react';
import { Smartphone, Mic, Video, Sparkles, Monitor } from 'lucide-react';

interface HeaderProps {
  isPhoneFrame: boolean;
  setIsPhoneFrame: (v: boolean) => void;
  activeStep: number;
  setActiveStep: (step: number) => void;
  hasAudio: boolean;
  hasVideo: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isPhoneFrame,
  setIsPhoneFrame,
  activeStep,
  setActiveStep,
  hasAudio,
  hasVideo,
}) => {
  const steps = [
    { num: 1, label: 'Giọng nói', ready: true },
    { num: 2, label: 'Chọn video', ready: true },
    { num: 3, label: 'Ghép & Chỉnh', ready: hasAudio && hasVideo },
    { num: 4, label: 'Xuất video', ready: hasAudio && hasVideo },
  ];

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-sky-400 p-0.5 shadow-md shadow-indigo-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <div className="flex items-center -space-x-1 text-sky-400">
                <Mic className="w-4 h-4 text-indigo-400" />
                <Video className="w-4 h-4 text-sky-400" />
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base md:text-lg tracking-tight text-white flex items-center gap-1.5">
                VietVoice Studio
              </h1>
              <span className="text-[11px] font-semibold text-sky-400 border border-sky-500/30 px-1.5 py-0.5 rounded-md bg-sky-950/40">
                Samsung & Mobile
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Chuyển văn bản thành giọng đọc tiếng Việt và ghép vào video
            </p>
          </div>
        </div>

        {/* Device View Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPhoneFrame(!isPhoneFrame)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
              isPhoneFrame
                ? 'bg-indigo-600/20 border-indigo-500/60 text-indigo-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Bật/tắt chế độ khung nhìn điện thoại Samsung"
          >
            {isPhoneFrame ? (
              <>
                <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Khung Samsung Galaxy</span>
                <span className="sm:hidden">Samsung</span>
              </>
            ) : (
              <>
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Toàn màn hình</span>
                <span className="sm:hidden">Rộng</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Step Navigation Bar */}
      <div className="border-t border-slate-900 bg-slate-950/60 px-4 py-2">
        <div className="max-w-5xl mx-auto flex items-center justify-between sm:justify-center gap-1 sm:gap-6 overflow-x-auto">
          {steps.map((s) => {
            const isActive = activeStep === s.num;
            const isClickable = s.ready;

            return (
              <button
                key={s.num}
                disabled={!isClickable}
                onClick={() => isClickable && setActiveStep(s.num)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30 font-semibold'
                    : isClickable
                    ? 'text-slate-300 hover:text-white hover:bg-slate-900'
                    : 'text-slate-600 cursor-not-allowed opacity-60'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] ${
                    isActive
                      ? 'bg-white text-indigo-700 font-bold'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {s.num}
                </span>
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

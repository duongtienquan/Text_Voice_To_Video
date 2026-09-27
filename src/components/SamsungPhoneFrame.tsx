import React from 'react';
import { Wifi, Battery, Signal } from 'lucide-react';

interface SamsungPhoneFrameProps {
  isPhoneFrame: boolean;
  children: React.ReactNode;
}

export const SamsungPhoneFrame: React.FC<SamsungPhoneFrameProps> = ({
  isPhoneFrame,
  children,
}) => {
  if (!isPhoneFrame) {
    return <div className="max-w-4xl mx-auto px-4 py-6">{children}</div>;
  }

  return (
    <div className="py-6 px-2 flex justify-center items-start min-h-[calc(100vh-120px)] bg-slate-950">
      {/* Samsung Galaxy Titanium Outer Shell */}
      <div className="relative w-full max-w-[430px] rounded-[48px] p-3 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 shadow-2xl shadow-indigo-950/40 border border-slate-700/60 ring-1 ring-white/10">
        {/* Inner Phone Screen Border */}
        <div className="relative bg-slate-950 rounded-[40px] overflow-hidden border border-slate-800 flex flex-col h-[820px]">
          {/* Samsung One UI Status Bar */}
          <div className="h-9 px-6 flex items-center justify-between text-[12px] font-semibold text-slate-300 select-none bg-slate-950 z-30 shrink-0">
            {/* Clock */}
            <span>09:41</span>

            {/* Front Camera Punch Hole */}
            <div className="w-3.5 h-3.5 rounded-full bg-black ring-2 ring-slate-800/80 mx-auto flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
            </div>

            {/* Status Icons */}
            <div className="flex items-center gap-1.5 text-slate-300">
              <Signal className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold text-sky-400">5G</span>
              <Wifi className="w-3.5 h-3.5" />
              <div className="flex items-center gap-0.5">
                <span className="text-[10px]">98%</span>
                <Battery className="w-4 h-4 fill-slate-200" />
              </div>
            </div>
          </div>

          {/* Samsung App Viewport */}
          <div className="flex-1 overflow-y-auto px-3.5 py-3 relative scrollbar-thin scrollbar-thumb-slate-800">
            {children}
          </div>

          {/* Samsung One UI Bottom Gesture Pill */}
          <div className="h-5 bg-slate-950 flex items-center justify-center shrink-0 z-30">
            <div className="w-32 h-1 bg-slate-700 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};

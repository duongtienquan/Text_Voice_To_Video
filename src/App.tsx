/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SamsungPhoneFrame } from './components/SamsungPhoneFrame';
import { StepTextToSpeech } from './components/StepTextToSpeech';
import { StepVideoSelector } from './components/StepVideoSelector';
import { StepSyncPreview } from './components/StepSyncPreview';
import { StepExport } from './components/StepExport';
import { AudioTrackData, VideoSource, MergeSettings } from './types';
import { Mic, Film, Sliders, Download, CheckCircle2 } from 'lucide-react';

export default function App() {
  // Mobile Samsung Galaxy preview toggle
  // Default to phone frame on desktop screens (>= 1024px) for authentic Samsung experience
  const [isPhoneFrame, setIsPhoneFrame] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return false;
  });

  const [activeStep, setActiveStep] = useState<number>(1);
  const [currentAudio, setCurrentAudio] = useState<AudioTrackData | null>(null);
  const [currentVideo, setCurrentVideo] = useState<VideoSource | null>(null);

  const [mergeSettings, setMergeSettings] = useState<MergeSettings>({
    audioOffset: 0.0,
    videoVolume: 0.5,
    voiceVolume: 1.2,
    muteOriginalVideo: false,
    exportFormat: 'mp4',
    subtitles: {
      enabled: true,
      text: '',
      fontSize: 20,
      color: '#ffffff',
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      position: 'bottom',
      showBackground: true,
    },
  });

  // When audio is generated, auto-populate subtitle text if blank
  const handleAudioGenerated = (track: AudioTrackData) => {
    setCurrentAudio(track);
    setMergeSettings((prev) => ({
      ...prev,
      subtitles: {
        ...prev.subtitles,
        text: prev.subtitles.text ? prev.subtitles.text : track.text,
      },
    }));
  };

  const handleVideoSelected = (video: VideoSource) => {
    setCurrentVideo(video);
  };

  const handleStartNew = () => {
    setCurrentAudio(null);
    setCurrentVideo(null);
    setMergeSettings({
      audioOffset: 0.0,
      videoVolume: 0.5,
      voiceVolume: 1.2,
      muteOriginalVideo: false,
      exportFormat: 'mp4',
      subtitles: {
        enabled: true,
        text: '',
        fontSize: 20,
        color: '#ffffff',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        position: 'bottom',
        showBackground: true,
      },
    });
    setActiveStep(1);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        isPhoneFrame={isPhoneFrame}
        setIsPhoneFrame={setIsPhoneFrame}
        activeStep={activeStep}
        setActiveStep={setActiveStep}
        hasAudio={!!currentAudio}
        hasVideo={!!currentVideo}
      />

      {/* Main Content inside Samsung Galaxy Frame or Full Responsive layout */}
      <main className="flex-1">
        <SamsungPhoneFrame isPhoneFrame={isPhoneFrame}>
          <div className="pb-16 pt-1">
            {activeStep === 1 && (
              <StepTextToSpeech
                currentAudio={currentAudio}
                subtitlesEnabled={mergeSettings.subtitles.enabled}
                onToggleSubtitles={(enabled) =>
                  setMergeSettings((prev) => ({
                    ...prev,
                    subtitles: {
                      ...prev.subtitles,
                      enabled,
                    },
                  }))
                }
                onAudioGenerated={handleAudioGenerated}
                onNext={() => setActiveStep(2)}
              />
            )}

            {activeStep === 2 && (
              <StepVideoSelector
                currentVideo={currentVideo}
                onVideoSelected={handleVideoSelected}
                onNext={() => {
                  if (currentAudio) {
                    setActiveStep(3);
                  } else {
                    setActiveStep(1);
                  }
                }}
              />
            )}

            {activeStep === 3 && currentAudio && currentVideo && (
              <StepSyncPreview
                audioTrack={currentAudio}
                videoSource={currentVideo}
                settings={mergeSettings}
                onUpdateSettings={setMergeSettings}
                onNext={() => setActiveStep(4)}
              />
            )}

            {activeStep === 4 && currentAudio && currentVideo && (
              <StepExport
                audioTrack={currentAudio}
                videoSource={currentVideo}
                settings={mergeSettings}
                onUpdateSettings={setMergeSettings}
                onBackToEdit={() => setActiveStep(3)}
                onStartNew={handleStartNew}
              />
            )}
          </div>
        </SamsungPhoneFrame>
      </main>

      {/* Mobile One UI Bottom Action Bar (Thumb-friendly on Samsung Galaxy) */}
      <nav className="fixed bottom-0 inset-x-0 bg-slate-950/95 backdrop-blur border-t border-slate-800/80 px-4 py-2 z-40">
        <div className="max-w-md mx-auto flex items-center justify-around">
          <button
            type="button"
            onClick={() => setActiveStep(1)}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
              activeStep === 1 ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeStep === 1 ? 'bg-indigo-600/20' : ''}`}>
              <Mic className="w-4 h-4" />
            </div>
            <span>Giọng nói</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveStep(2)}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
              activeStep === 2 ? 'text-indigo-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeStep === 2 ? 'bg-indigo-600/20' : ''}`}>
              <Film className="w-4 h-4" />
            </div>
            <span>Chọn video</span>
          </button>

          <button
            type="button"
            disabled={!currentAudio || !currentVideo}
            onClick={() => currentAudio && currentVideo && setActiveStep(3)}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
              activeStep === 3
                ? 'text-indigo-400 font-semibold'
                : currentAudio && currentVideo
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 cursor-not-allowed opacity-50'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeStep === 3 ? 'bg-indigo-600/20' : ''}`}>
              <Sliders className="w-4 h-4" />
            </div>
            <span>Ghép & Căn</span>
          </button>

          <button
            type="button"
            disabled={!currentAudio || !currentVideo}
            onClick={() => currentAudio && currentVideo && setActiveStep(4)}
            className={`flex flex-col items-center gap-1 text-[11px] font-medium transition-colors ${
              activeStep === 4
                ? 'text-emerald-400 font-semibold'
                : currentAudio && currentVideo
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 cursor-not-allowed opacity-50'
            }`}
          >
            <div className={`p-1 rounded-lg ${activeStep === 4 ? 'bg-emerald-600/20' : ''}`}>
              <Download className="w-4 h-4" />
            </div>
            <span>Xuất video</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

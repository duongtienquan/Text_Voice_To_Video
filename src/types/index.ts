export interface VoiceOption {
  id: string;
  name: string;
  gender: 'female' | 'male';
  styleDescription: string;
  engine: 'gemini' | 'browser';
  voiceName?: string;
  lang?: string;
  badge?: string;
}

export interface AudioTrackData {
  blob: Blob;
  url: string;
  duration: number;
  text: string;
  voiceName: string;
  engine: 'gemini' | 'browser';
  createdAt: number;
}

export interface VideoSource {
  id: string;
  name: string;
  url: string;
  file?: File;
  duration: number;
  width: number;
  height: number;
  aspectRatio: '9:16' | '16:9' | '1:1';
  thumbnailUrl?: string;
  isSample?: boolean;
}

export interface SubtitleConfig {
  enabled: boolean;
  text: string;
  fontSize: number; // in px
  color: string;
  backgroundColor: string;
  position: 'bottom' | 'center' | 'top';
  showBackground: boolean;
}

export interface MergeSettings {
  audioOffset: number; // in seconds
  videoVolume: number; // 0.0 to 1.0
  voiceVolume: number; // 0.0 to 2.0
  muteOriginalVideo: boolean;
  subtitles: SubtitleConfig;
  exportFormat: 'mp4' | 'webm';
}

export interface RenderProgress {
  status: 'idle' | 'rendering' | 'completed' | 'error';
  progress: number; // 0 to 100
  message: string;
  exportedBlob?: Blob;
  exportedUrl?: string;
  exportedDuration?: number;
  exportFormat?: 'MP4' | 'WebM';
  mp4Blob?: Blob;
  mp4Url?: string;
  webmBlob?: Blob;
  webmUrl?: string;
}

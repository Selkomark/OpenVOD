import React from 'react';
import type { VideoData } from '../api';
import { Play, Copy, Loader2, CheckCircle2 } from 'lucide-react';

interface Props {
  video: VideoData;
}

const statusColors = {
  UPLOADED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  ANALYZING: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  TRANSCODING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  TRANSCODED: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
  PACKAGING: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  PACKAGED: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  READY_TO_PUBLISH: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  PUBLISHED: 'bg-green-500/20 text-green-400 border-green-500/30',
  ERROR: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const statusLabels = {
  UPLOADED: 'Uploaded to Vault',
  ANALYZING: 'Analyzing Media...',
  TRANSCODING: 'Reticulating Splines...',
  TRANSCODED: 'Transcoding Complete',
  PACKAGING: 'Packaging Stream...',
  PACKAGED: 'Packaging Complete',
  READY_TO_PUBLISH: 'Ready to Publish',
  PUBLISHED: 'Live!',
  ERROR: 'Failed',
};

export function VideoStatusCard({ video }: Props) {
  const isDone = ['READY_TO_PUBLISH', 'PUBLISHED'].includes(video.status);
  const isError = video.status === 'ERROR';
  
  const levels: Record<string, number> = {
    'UPLOADED': 1,
    'ANALYZING': 2,
    'TRANSCODING': 3,
    'TRANSCODED': 4,
    'PACKAGING': 5,
    'PACKAGED': 6,
    'THUMBNAILING': 7,
    'READY_TO_PUBLISH': 8,
    'PUBLISHED': 9,
    'ERROR': -1
  };
  
  const currentLevel = levels[video.status] || 0;
  
  const steps = [
    { label: 'Upload to Vault', completed: currentLevel >= 1, processing: false, level: 1 },
    { label: 'Analyze Media', completed: currentLevel >= 3, processing: currentLevel === 2, level: 2 },
    { label: 'Transcode Media', completed: currentLevel >= 4, processing: currentLevel === 3, level: 3 },
    { label: 'Package Stream', completed: currentLevel >= 6, processing: currentLevel === 5, level: 5 },
    { label: 'Generate Thumbnails', completed: currentLevel >= 8, processing: currentLevel === 7, level: 7 },
    { label: 'Publish', completed: currentLevel >= 9, processing: currentLevel === 8, level: 8 },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto glass-panel p-6 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
        
        {/* Thumbnail Placeholder */}
        <div className="w-48 h-32 bg-surface/80 rounded-xl border border-white/5 flex items-center justify-center relative overflow-hidden group shadow-inner shrink-0">
          {isDone ? (
            <div className="absolute inset-0 bg-gradient-to-tr from-accent/20 to-transparent"></div>
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-tr from-secondary/10 to-transparent ${!isError && !isDone ? 'animate-pulse' : ''}`}></div>
          )}
          {isDone ? <Play className="w-10 h-10 text-white/80 group-hover:text-white transition-colors" /> : <FileVideoIcon className="w-8 h-8 text-gray-500" />}
        </div>
        
        {/* Info */}
        <div className="flex-1 w-full text-left space-y-4">
          <div>
            <h3 className="text-xl font-bold text-white truncate">{video.filename}</h3>
            <p className="text-sm tracking-wide text-gray-500 font-mono mt-1">ID: {video.id.split('-')[0]}</p>
          </div>
          
          <div className="space-y-3 mt-4">
            {steps.map((step, idx) => {
               // Determine current state
               let icon;
               let textClass = "text-gray-500";
               
               if (step.completed) {
                 icon = <CheckCircle2 className="w-5 h-5 text-green-400" />;
                 textClass = "text-green-400 font-medium";
               } else if (step.processing) {
                 icon = <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
                 textClass = "text-blue-400 font-semibold";
               } else if (isError) {
                 // Try to highlight the first incomplete step as error
                 const previousStepCompleted = idx === 0 || steps[idx - 1].completed;
                 if (previousStepCompleted) {
                   icon = <div className="w-5 h-5 rounded-full bg-red-500/20 flex items-center justify-center"><div className="w-2 h-2 rounded-full bg-red-500" /></div>;
                   textClass = "text-red-400 font-medium";
                 } else {
                   icon = <div className="w-5 h-5 rounded-full border-2 border-gray-700" />;
                 }
               } else {
                 icon = <div className="w-5 h-5 rounded-full border-2 border-gray-700" />;
               }
               
               return (
                 <div key={step.label} className="flex items-center gap-3">
                   {icon}
                   <span className={`text-sm ${textClass}`}>{step.label}</span>
                 </div>
               );
            })}
          </div>
          
          {video.details && <p className="text-sm text-gray-400 bg-black/20 p-2 rounded border border-white/5 font-mono mt-4">{video.details}</p>}
          
          {video.status === 'PUBLISHED' && (
            <button className="text-xs flex items-center gap-2 text-primary hover:text-white transition-colors mt-2">
              <Copy className="w-4 h-4" /> Copy HLS URL
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Inline subset of FileVideo because we imported from lucide-react above
function FileVideoIcon(props: React.ComponentProps<'svg'>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="m10 11 5 3-5 3v-6Z" />
    </svg>
  )
}

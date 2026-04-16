import React, { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import type { VideoData } from '../api';
import { fetchAllVideos } from '../api';

interface Props {
  onSelectVideo: (video: VideoData) => void;
}

function VideoCard({ video, onSelect }: { video: VideoData, onSelect: () => void }) {
  const [hovered, setHovered] = useState(false);
  const [frameIndex, setFrameIndex] = useState(1);

  useEffect(() => {
    let interval: Timer | null = null;
    if (hovered) {
      interval = setInterval(() => {
        setFrameIndex(prev => prev >= 20 ? 1 : prev + 1);
      }, 500); // 2 frames per second interpolation roughly representing a timeline scan
    } else {
      setFrameIndex(1);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [hovered]);

  const paddedFrame = frameIndex.toString().padStart(2, '0');
  const targetResolutions = video.metadata?.target_resolutions || [1080];
  const lowestRes = Math.min(...targetResolutions);

  const duration = video.metadata?.duration || 0;
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);
  const durationStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  const resLabel = video.metadata?.resolution_label || '';
  
  return (
    <div 
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="glass-panel group cursor-pointer hover:border-primary/50 transition-all duration-300 rounded-xl overflow-hidden"
    >
      <div className="w-full aspect-video bg-surface relative flex items-center justify-center overflow-hidden">
        <img src={`/storage/thumbnails/${video.id}/${lowestRes}p/${paddedFrame}.jpeg`} alt={video.filename} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <Play className="w-12 h-12 text-white/90 drop-shadow-lg" />
        </div>
        {duration > 0 && (
          <span className="absolute bottom-2 right-2 bg-black/80 text-white text-xs font-medium px-1.5 py-0.5 rounded">{durationStr}</span>
        )}
        {resLabel && (
          <span className="absolute top-2 right-2 bg-black/70 text-white/90 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide">{resLabel}</span>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-sm font-semibold text-white truncate" title={video.filename}>{video.filename}</h3>
        <p className="text-xs text-gray-500 mt-1">{resLabel ? `${video.metadata?.width}×${video.metadata?.height}` : video.id.substring(0, 8)}</p>
      </div>
    </div>
  );
}

export function VideoGallery({ onSelectVideo }: Props) {
  const [videos, setVideos] = useState<VideoData[]>([]);

  useEffect(() => {
    fetchAllVideos().then(setVideos).catch(console.error);
  }, []);

  const publishedVideos = videos.filter(v => v.status === 'PUBLISHED');

  if (publishedVideos.length === 0) return null;

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 mt-12 animate-in fade-in duration-700">
      <h2 className="text-xl font-bold text-white mb-6 text-left">Your Library</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {publishedVideos.map(video => (
          <VideoCard key={video.id} video={video} onSelect={() => onSelectVideo(video)} />
        ))}
      </div>
    </div>
  );
}

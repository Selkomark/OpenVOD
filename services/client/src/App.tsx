import { useState, useEffect } from 'react';
import { UploadDropzone } from './components/UploadDropzone';
import { VideoStatusCard } from './components/VideoStatusCard';
import { VideoPlayer } from './components/VideoPlayer';
import { VideoGallery } from './components/VideoGallery';
import { uploadDirectly, pollVideoStatus, type VideoData } from './api';
import { Plus, X, Upload } from 'lucide-react';

function App() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [activeVideoId, setActiveVideoId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('v');
    }
    return null;
  });

  const [video, setVideo] = useState<VideoData | null>(null);

  // Initial fetch for the active video if accessed directly via URL
  useEffect(() => {
    if (activeVideoId && !video) {
      pollVideoStatus(activeVideoId)
        .then(data => setVideo(data))
        .catch(err => console.error("Failed to fetch initial video", err));
    }
  }, [activeVideoId]);

  // Polling hook
  useEffect(() => {
    if (!activeVideoId) return;

    const interval = setInterval(async () => {
      try {
        const data = await pollVideoStatus(activeVideoId);
        setVideo(data);
        if (data.status === 'PUBLISHED' || data.status === 'ERROR') {
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Polling error', err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [activeVideoId]);

  const handleUpload = async (file: File) => {
    try {
      setError('');
      setIsUploading(true);
      setProgress(0);

      const newVideo = await uploadDirectly(file, (pct) => setProgress(pct));
      setVideo(newVideo);
      setActiveVideoId(newVideo.id);
      // We don't close the modal here anymore so the status stays inside it.

    } catch (err: any) {
      setError(err.message || 'An unknown error occurred');
      setProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const isReady = video?.status === 'PUBLISHED';

  // Auto-close modal when ready & do full refresh redirect
  useEffect(() => {
    if (isReady && isModalOpen) {
      const currentUrl = new URL(window.location.href);
      if (currentUrl.searchParams.get('v') !== video.id) {
        window.location.href = `/?v=${video.id}`;
      } else {
        setIsModalOpen(false);
      }
    }
  }, [isReady, isModalOpen, video?.id]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center pb-20">

      <nav className="w-full bg-surface border-b border-white/10 shadow-sm sticky top-0 z-40">
        <div className="w-full max-w-[1400px] mx-auto px-6 sm:px-10 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => { window.location.href = '/'; }}>
            <div className="w-8 h-8 bg-gradient-to-tr from-primary to-secondary rounded-lg flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" /></svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-white drop-shadow-sm">
              Selkomark - OpenVOD
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setVideo(null);
                setActiveVideoId(null);
                setError(null);
                setProgress(0);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full font-medium transition-all"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Create</span>
            </button>
          </div>
        </div>
      </nav>

      <main className="w-full flex-grow flex flex-col items-center">
        {!activeVideoId ? (
          <div className="w-full">
            <VideoGallery onSelectVideo={(selected) => {
              window.location.href = `/?v=${selected.id}`;
            }} />
          </div>
        ) : (
          <div className="w-full flex flex-col items-center animate-in fade-in duration-500 ease-out">
            {!isReady && !isModalOpen && video && (
              <div className="max-w-5xl w-full mt-8 px-4">
                <VideoStatusCard video={video} />
              </div>
            )}

            {isReady && video && (
              <>
                <div className="w-full bg-black flex justify-center border-b border-white/5">
                  <div className="w-full max-w-screen-2xl aspect-video max-h-[80vh] flex items-center justify-center">
                    <VideoPlayer src={`/storage/packaged/${video.id}/manifest.mpd`} videoId={video.id} />
                  </div>
                </div>

                <div className="w-full max-w-[1400px] px-6 sm:px-10 mt-6 text-left">
                  <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{video.filename}</h1>
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-400 flex-wrap">
                    {video.metadata?.resolution_label && (
                      <span className="bg-white/10 text-white/80 px-2 py-0.5 rounded text-xs font-semibold uppercase">{video.metadata.resolution_label}</span>
                    )}
                    {video.metadata?.width && video.metadata?.height && (
                      <span>{video.metadata.width}×{video.metadata.height}</span>
                    )}
                    {video.metadata?.duration && video.metadata.duration > 0 && (
                      <span>{Math.floor(video.metadata.duration / 60)}:{Math.floor(video.metadata.duration % 60).toString().padStart(2, '0')}</span>
                    )}
                    <span>{(parseInt(video.size_bytes || '0') / (1024 * 1024)).toFixed(1)} MB</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-surface border border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden relative">
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-surface/50">
              <h2 className="text-lg font-semibold text-white">Upload video</h2>
              <button
                onClick={() => !isUploading && setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isUploading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 bg-background/50">
              {activeVideoId && video ? (
                <div className="-mt-8">
                  <VideoStatusCard video={video} />
                </div>
              ) : (
                <UploadDropzone
                  onFileSelect={handleUpload}
                  isUploading={isUploading}
                  progress={progress}
                />
              )}
              {error && (
                <div className="mt-6 p-4 text-red-200 bg-red-900/40 border border-red-500/20 rounded-lg text-center font-mono text-sm shadow-inner">
                  {error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;

import React, { useCallback, useState } from 'react';
import { UploadCloud, FileVideo, X, CheckCircle2, ArrowUpCircle } from 'lucide-react';

interface Props {
  onFileSelect: (file: File) => void;
  isUploading: boolean;
  progress: number;
}

export function UploadDropzone({ onFileSelect, isUploading, progress }: Props) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        setSelectedFile(file);
        onFileSelect(file);
      }
    }
  }, [onFileSelect]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  return (
    <div className="w-full">
      {!selectedFile ? (
        <div 
          className={`relative border-2 border-dashed rounded-[32px] p-16 text-center transition-all duration-300 overflow-hidden ${
            isDragActive ? 'border-primary bg-primary/10 scale-[0.98]' : 'border-white/10 hover:border-white/20 hover:bg-white/5'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {/* Subtle glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/20 rounded-full blur-[80px] pointer-events-none"></div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-24 h-24 bg-background/80 backdrop-blur-sm rounded-full flex items-center justify-center mb-6 shadow-2xl border border-white/5 relative group">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-md group-hover:blur-lg transition-all"></div>
              <UploadCloud className={`w-12 h-12 relative z-10 transition-colors duration-300 ${isDragActive ? 'text-primary' : 'text-gray-300'}`} />
            </div>
            
            <h3 className="text-2xl font-semibold text-white mb-3">Drag and drop your video</h3>
            <p className="text-gray-400 mb-8 max-w-sm mx-auto text-sm">Upload MP4 or QuickTime files up to 2GB. Transcoding will begin immediately.</p>
            
            <label className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-medium py-3.5 px-8 rounded-full cursor-pointer shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] backdrop-blur-md transition-all active:scale-95 inline-flex items-center gap-2">
              Browse Files
              <input type="file" className="hidden" accept="video/mp4,video/quicktime" onChange={handleChange} />
            </label>
          </div>
        </div>
      ) : (
        <div className="bg-background/80 backdrop-blur-2xl border border-white/10 rounded-[32px] p-8 overflow-hidden relative shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px] pointer-events-none"></div>
          
          <div className="flex items-center justify-between mb-10 relative z-10">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-surface to-background border border-white/10 flex items-center justify-center text-primary shadow-xl relative">
                <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-sm"></div>
                <FileVideo className="w-8 h-8 relative z-10" />
              </div>
              <div className="text-left">
                <p className="text-xl text-white font-medium truncate max-w-[200px] sm:max-w-sm">{selectedFile.name}</p>
                <p className="text-gray-400 mt-1">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            </div>
            {!isUploading && progress === 0 && (
              <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-white p-3 rounded-full hover:bg-white/10 transition-colors bg-surface/50 border border-white/5 shadow-sm">
                <X className="w-5 h-5" />
              </button>
            )}
            {progress === 100 && (
              <div className="text-green-500 bg-green-500/10 p-2 rounded-full border border-green-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            )}
          </div>

          {isUploading && (
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between text-sm font-semibold tracking-wide">
                <span className="text-white">Uploading to Vault...</span>
                <span className="text-primary">{progress}%</span>
              </div>
              <div className="w-full bg-surface/80 rounded-full h-3 overflow-hidden border border-white/5 shadow-inner">
                <div 
                  className="bg-gradient-to-r from-primary to-accent h-full rounded-full transition-all duration-300 ease-out shadow-[0_0_15px_rgba(59,130,246,0.5)] relative overflow-hidden"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute top-0 bottom-0 right-0 w-20 bg-gradient-to-l from-white/30 to-transparent"></div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';
import { MediaPlayer, MediaProvider, isDASHProvider } from '@vidstack/react';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';

interface VideoPlayerProps {
  src: string;
  videoId: string;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, videoId }) => {
  const [drmKeys, setDrmKeys] = useState<{ keyId: string; key: string } | null>(null);

  useEffect(() => {
    fetch(`/api/videos/${videoId}/drm-keys`)
      .then(res => res.json())
      .then(data => {
        if (data.keyId && data.key) {
          setDrmKeys(data);
        }
      })
      .catch(err => console.warn('No DRM keys found, playing unprotected:', err));
  }, [videoId]);

  const onProviderSetup = (provider: any) => {
    if (isDASHProvider(provider) && drmKeys) {
      provider.instance?.setProtectionData({
        'org.w3.clearkey': {
          clearkeys: {
            [drmKeys.keyId]: drmKeys.key
          }
        }
      });
    }
  };

  // Wait for DRM keys before rendering the player
  if (!drmKeys) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-white/20 border-t-white rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <MediaPlayer 
        className="w-full h-full border-none rounded-none ring-0 outline-none" 
        style={{ borderRadius: 0, border: 'none', maxWidth: '100%' } as React.CSSProperties}
        src={src} 
        autoPlay 
        crossOrigin
        onProviderSetup={onProviderSetup}
      >
        <MediaProvider className="border-none rounded-none" />
        <DefaultVideoLayout icons={defaultLayoutIcons} />
      </MediaPlayer>
    </div>
  );
};

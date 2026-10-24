import React, { useEffect, useRef } from 'react';
import { Smartphone, VideoOff } from 'lucide-react';
import { Badge } from '../common';

export const SecondaryCameraStream = ({ stream, isConnected = false, studentName = 'Student' }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-md">
      {isConnected && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-36 sm:h-44 object-cover"
        />
      ) : (
        <div className="w-full h-36 sm:h-44 flex flex-col items-center justify-center p-4 text-center bg-slate-950/80">
          <Smartphone className="w-6 h-6 text-slate-600 mb-1.5" />
          <span className="text-xs font-semibold text-slate-400">Mobile Stream Inactive</span>
          <span className="text-[10px] text-slate-500 mt-0.5">Desk & Hands view not connected</span>
        </div>
      )}

      <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
        <Badge variant={isConnected && stream ? 'success' : 'default'} size="sm">
          {isConnected && stream ? 'Secondary Camera' : 'Mobile Offline'}
        </Badge>
      </div>
    </div>
  );
};

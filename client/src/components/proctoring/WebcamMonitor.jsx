import React from 'react';
import { Video, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Badge } from '../common';

export const WebcamMonitor = ({
  videoRef,
  cameraActive,
  faceCount,
  headPose = 'center',
  modelLoaded,
  permissionError,
  showBadge = true
}) => {
  const isLookingAway = headPose !== 'center';

  return (
    <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 shadow-md">
      {/* Live Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-36 sm:h-44 object-cover transform scale-x-[-1] transition-all ${
          !cameraActive ? 'opacity-20' : isLookingAway ? 'brightness-95 contrast-105' : 'opacity-100'
        }`}
      />

      {/* Overlay Status */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
        {cameraActive ? (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold backdrop-blur-sm border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AI Face Track
          </span>
        ) : (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 text-[10px] font-semibold backdrop-blur-sm border border-rose-500/30">
            <AlertCircle className="w-3 h-3" />
            Camera Inactive
          </span>
        )}

        {isLookingAway && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/25 text-amber-300 text-[10px] font-bold backdrop-blur-sm border border-amber-500/40 animate-pulse">
            <EyeOff className="w-3 h-3" />
            Looking Away!
          </span>
        )}
      </div>

      {showBadge && cameraActive && (
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between z-10 text-[10px] font-mono">
          <Badge
            variant={faceCount === 1 ? 'success' : faceCount === 0 ? 'danger' : 'warning'}
            size="sm"
          >
            {faceCount === 1 ? '1 Face Visible' : faceCount === 0 ? 'No Face' : `${faceCount} Faces Detected`}
          </Badge>

          <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border transition-all ${
            headPose === 'center'
              ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
              : 'bg-rose-500/30 text-rose-200 border-rose-500/50 animate-pulse'
          }`}>
            {headPose === 'center' ? 'Pose: Center' : `Pose: ${headPose.toUpperCase()} ⚠️`}
          </span>
        </div>
      )}

      {permissionError && (
        <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-3 text-center">
          <AlertCircle className="w-6 h-6 text-rose-400 mb-1" />
          <p className="text-xs text-rose-300 font-medium">Camera Error</p>
          <p className="text-[10px] text-slate-400 mt-1">{permissionError}</p>
        </div>
      )}
    </div>
  );
};

"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

type CapturePayload = {
  dataUrl: string;
  blob: Blob | null;
};

type CameraCaptureProps = {
  onCapture?: (payload: CapturePayload) => void;
  onError?: (message: string) => void;
  initialFacingMode?: "environment" | "user";
};

export default function CameraCapture({
  onCapture,
  onError,
  initialFacingMode = "environment",
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    initialFacingMode,
  );
  const [lastCapture, setLastCapture] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const stopStream = () => {
      if (!streamRef.current) return;
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };

    const startCamera = async () => {
      setError(null);
      setIsReady(false);

      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        const message = "Camera access is not supported on this device.";
        if (isMounted) {
          setError(message);
          onError?.(message);
        }
        return;
      }

      stopStream();

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false,
        });

        if (!isMounted) return;
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          if (isMounted) setIsReady(true);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to access the camera.";
        if (isMounted) {
          setError(message);
          onError?.(message);
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      stopStream();
    };
  }, [facingMode, onError]);

  const handleCapture = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setLastCapture(dataUrl);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/jpeg", 0.92);
    });

    onCapture?.({ dataUrl, blob });
  };

  const handleSwitchCamera = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  return (
    <div className="fixed inset-0 z-50 flex h-dvh w-screen flex-col bg-black text-white">
      <div className="relative flex-1">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          playsInline
        />
        <canvas ref={canvasRef} className="hidden" />

        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 px-6 text-center">
            <div className="text-lg font-semibold">Camera unavailable</div>
            <div className="text-sm text-white/70">{error}</div>
          </div>
        ) : null}

        {lastCapture ? (
          <div className="absolute top-4 left-4 overflow-hidden rounded-xl border border-white/20 bg-black/40">
            <Image
              src={lastCapture}
              alt="Last capture"
              width={80}
              height={80}
              className="h-20 w-20 object-cover"
              unoptimized
            />
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-4 px-6 py-6">
        <button
          type="button"
          onClick={handleSwitchCamera}
          className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold tracking-widest text-white/80 uppercase"
          disabled={!isReady || Boolean(error)}
        >
          Switch Camera
        </button>

        <button
          type="button"
          onClick={handleCapture}
          className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/80 bg-white/10"
          disabled={!isReady || Boolean(error)}
          aria-label="Capture"
        >
          <span className="h-10 w-10 rounded-full bg-white/90" />
        </button>

        <button
          type="button"
          className="rounded-full border border-white/30 px-4 py-2 text-xs font-semibold tracking-widest text-white/80 uppercase"
          disabled
        >
          Toggle Flash
        </button>
      </div>
    </div>
  );
}

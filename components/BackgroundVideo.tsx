"use client";

import { useEffect, useRef } from "react";

const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_115001_bcdaa3b4-03de-47e7-ad63-ae3e392c32d4.mp4";

const FADE_MS = 500;
const FADE_OUT_LEAD_SECONDS = 0.55;

interface Props {
  maxOpacity?: number;
  className?: string;
}

export default function BackgroundVideo({
  maxOpacity = 1,
  className = "",
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fadingOutRef = useRef(false);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.style.opacity = "0";

    const cancelFrame = () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };

    const fade = (target: number, duration: number) => {
      cancelFrame();
      const start = performance.now();
      const startOpacity = parseFloat(video.style.opacity || "0");
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        video.style.opacity = String(
          startOpacity + (target - startOpacity) * t
        );
        if (t < 1) {
          frameRef.current = requestAnimationFrame(step);
        } else {
          frameRef.current = null;
        }
      };
      frameRef.current = requestAnimationFrame(step);
    };

    const onLoadedData = () => {
      fadingOutRef.current = false;
      fade(maxOpacity, FADE_MS);
    };

    const onTimeUpdate = () => {
      if (!video.duration || Number.isNaN(video.duration)) return;
      const timeLeft = video.duration - video.currentTime;
      if (timeLeft <= FADE_OUT_LEAD_SECONDS && !fadingOutRef.current) {
        fadingOutRef.current = true;
        fade(0, FADE_MS);
      }
    };

    const onEnded = () => {
      cancelFrame();
      video.style.opacity = "0";
      setTimeout(() => {
        video.currentTime = 0;
        const p = video.play();
        if (p) p.catch(() => {});
        fadingOutRef.current = false;
        fade(maxOpacity, FADE_MS);
      }, 100);
    };

    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);

    return () => {
      cancelFrame();
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
    };
  }, [maxOpacity]);

  return (
    <video
      ref={videoRef}
      src={VIDEO_SRC}
      autoPlay
      muted
      playsInline
      preload="auto"
      className={`absolute inset-0 w-full h-full object-cover translate-y-[17%] pointer-events-none ${className}`}
      style={{ opacity: 0 }}
    />
  );
}

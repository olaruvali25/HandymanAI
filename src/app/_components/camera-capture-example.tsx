"use client";

import CameraCapture from "@/components/CameraCapture";

const SHOW_CAMERA_EXAMPLE = false;

export default function CameraCaptureExample() {
  if (!SHOW_CAMERA_EXAMPLE) return null;
  return <CameraCapture />;
}

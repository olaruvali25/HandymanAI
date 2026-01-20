import type { Metadata } from "next";
import HomePageClient from "./_components/home-page-client";
import CameraCaptureExample from "./_components/camera-capture-example";

export const metadata: Metadata = {
  title: "Home Repair Help, Fast",
  description:
    "Fixly gives precise, step-by-step repair guidance so you can fix it yourself with confidence.",
};

export default function HomePage() {
  return (
    <>
      <HomePageClient />
      <CameraCaptureExample />
    </>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import HomePageClient from "./_components/home-page-client";
import CameraCaptureExample from "./_components/camera-capture-example";

export const metadata: Metadata = {
  title: "Home Repair Help, Fast",
  description:
    "Fixly gives precise, step-by-step repair guidance so you can fix it yourself with confidence.",
};

export default async function HomePage({
  searchParams,
}: {
  searchParams?: Promise<{ thread?: string }>;
}) {
  const resolved = searchParams ? await searchParams : undefined;
  if (resolved?.thread) {
    redirect(`/c/${resolved.thread}`);
  }

  return (
    <>
      <HomePageClient />
      <CameraCaptureExample />
    </>
  );
}

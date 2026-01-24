import HomePageClient from "@/app/_components/home-page-client";

export default async function ThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  return <HomePageClient initialThreadId={threadId} />;
}

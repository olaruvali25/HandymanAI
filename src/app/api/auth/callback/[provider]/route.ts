import { NextResponse } from "next/server";

const CANONICAL_HOST = "fixlyapp.dev";

export async function GET(request: Request) {
  const search = new URL(request.url).search;

  const host = CANONICAL_HOST;
  const target = new URL(`https://${host}/`);
  if (search) {
    target.search = search;
  }

  return NextResponse.redirect(target.toString(), {
    status: 302,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

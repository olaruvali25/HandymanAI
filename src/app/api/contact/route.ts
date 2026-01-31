import { NextResponse } from "next/server";
import { Resend } from "resend";

import { env } from "@/env";

const MAX_MESSAGE_LENGTH = 2000;
const MAX_NAME_LENGTH = 120;

type ContactPayload = {
  name: string;
  email: string;
  message: string;
};

const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export async function POST(req: Request) {
  if (!env.RESEND_API_KEY) {
    return NextResponse.json(
      { error: "Missing RESEND_API_KEY." },
      { status: 500 },
    );
  }

  let body: ContactPayload;
  try {
    body = (await req.json()) as ContactPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const name = body?.name?.trim() ?? "";
  const email = body?.email?.trim().toLowerCase() ?? "";
  const message = body?.message?.trim() ?? "";

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Name, email, and message are required." },
      { status: 400 },
    );
  }
  if (!isEmail(email)) {
    return NextResponse.json({ error: "Invalid email." }, { status: 400 });
  }
  if (name.length > MAX_NAME_LENGTH) {
    return NextResponse.json({ error: "Name is too long." }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: "Message is too long." },
      { status: 400 },
    );
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const from = env.CONTACT_FROM?.trim() ?? "Fixly <contact@fixlyapp.dev>";
  const to = env.CONTACT_TO?.trim() ?? "contact@fixlyapp.dev";

  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: email,
    subject: `Fixly support: ${name}`,
    text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to send message." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

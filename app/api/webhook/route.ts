import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const chatId = body.message?.chat?.id;

    if (chatId) {
      const token = "8509212353:AAGV2SrquugQXKK5T8rQ3kAWdZAj7veb2OQ";
      
      // Отправляем ответ на ЛЮБОЕ сообщение
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: "✅ Привет! Я получил твой запрос. Бот работает!",
        }),
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false });
  }
}

export async function GET() {
  return NextResponse.json({ status: "Webhook is alive!" });
}
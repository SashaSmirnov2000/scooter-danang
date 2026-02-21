import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Логируем в консоль Vercel всё, что приходит, для отладки
    console.log("Incoming Telegram body:", JSON.stringify(body));

    const chatId = body.message?.chat?.id;
    const text = body.message?.text || "";

    // Реагируем на любую команду, содержащую start
    if (text.includes('/start') && chatId) {
      const token = "8509212353:AAGV2SrquugQXKK5T8rQ3kAWdZAj7veb2OQ";
      const photoId = "AgACAgIAAxkBAAIRiGmZiSTaUiKBUaabhXY8HVMDnC06AAJOFWsbOWfISP8aGxItMFEOAQADAgADcwADOgQ";

      const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: photoId,
          caption: "👋 Привет! Нажми на кнопку 'Открыть приложение' в нижнем углу, чтобы выбрать байк! 👇",
          parse_mode: "Markdown"
        }),
      });
      
      const resData = await res.json();
      console.log("Telegram response:", resData);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error in webhook:", error);
    return NextResponse.json({ ok: false, error: String(error) });
  }
}

// Чтобы браузер не выдавал 405, а писал что-то понятное
export async function GET() {
  return NextResponse.json({ message: "Webhook is alive. Send POST request from Telegram." });
}
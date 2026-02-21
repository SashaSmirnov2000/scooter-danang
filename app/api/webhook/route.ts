import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Это ОБЯЗАТЕЛЬНО появится в логах, если запрос дойдет
    console.log("=== TELEGRAM WEBHOOK HIT ===");
    console.log("User says:", body.message?.text);

    const chatId = body.message?.chat?.id;
    const text = body.message?.text || "";
    const userLang = body.message?.from?.language_code;

    if (text.includes('/start') && chatId) {
      const token = "8509212353:AAGV2SrquugQXKK5T8rQ3kAWdZAj7veb2OQ";
      const photoId = "AgACAgIAAxkBAAIRiGmZiSTaUiKBUaabhXY8HVMDnC06AAJOFWsbOWfISP8aGxItMFEOAQADAgADcwADOgQ";

      const captionRu = "👋 **Привет! Это DragonBike.**\n\nЧтобы выбрать байк, нажмите кнопку **'Открыть приложение'** внизу! 👇";
      const captionEn = "👋 **Hi! This is DragonBike.**\n\nTo pick a bike, click the **'Open App'** button below! 👇";

      const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: photoId,
          caption: userLang === 'ru' ? captionRu : captionEn,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🛵 Open App / Открыть", web_app: { url: "https://scooter-danang.vercel.app" } }]
            ]
          }
        }),
      });
      
      const data = await res.json();
      console.log("Telegram API Response:", data);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("WEBHOOK ERROR:", error);
    return NextResponse.json({ ok: false });
  }
}

// Чтобы проверить файл в браузере без ошибки
export async function GET() {
  return NextResponse.json({ message: "Webhook is online and waiting for POST" });
}
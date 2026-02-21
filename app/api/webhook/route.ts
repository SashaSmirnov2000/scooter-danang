import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const chatId = body.message?.chat?.id;
    const text = body.message?.text || "";
    const userLang = body.message?.from?.language_code;

    if (chatId) {
      const token = "8509212353:AAGV2SrquugQXKK5T8rQ3kAWdZAj7veb2OQ";
      const photoId = "AgACAgIAAxkBAAIRiGmZiSTaUiKBUaabhXY8HVMDnC06AAJOFWsbOWfISP8aGxItMFEOAQADAgADcwADOgQ";

      // Если это команда /start
      if (text.includes('/start')) {
        const captionRu = "👋 **Привет! Это DragonBike.**\n\nЧтобы выбрать байк и посмотреть каталог, нажмите на кнопку **'Открыть приложение'** ниже! 👇";
        const captionEn = "👋 **Hi! This is DragonBike.**\n\nTo choose a bike and view the catalog, click the **'Open App'** button below! 👇";

        await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            photo: photoId,
            caption: userLang === 'ru' ? captionRu : captionEn,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🛵 Open Catalog / Открыть каталог", web_app: { url: "https://scooter-danang.vercel.app" } }]
              ]
            }
          }),
        });
      } 
      // Если это просто любое другое сообщение (как твое "привет")
      else {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: "Чтобы заказать байк, нажми на кнопку меню 'Аренда байков' или введи /start",
          }),
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false });
  }
}

export async function GET() {
  return NextResponse.json({ status: "alive" });
}
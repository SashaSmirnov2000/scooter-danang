import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const chatId = body.message?.chat?.id;
    const text = body.message?.text || "";

    if (chatId) {
      const token = "8509212353:AAGV2SrquugQXKK5T8rQ3kAWdZAj7veb2OQ";

      // 1. Сначала отправим просто текст (это точно сработает)
      if (text.includes('/start')) {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: "👋 Привет! Это DragonBike. Сейчас загружу каталог...",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🛵 Открыть каталог", web_app: { url: "https://scooter-danang.vercel.app" } }]
              ]
            }
          }),
        });

        // 2. Сразу следом пробуем отправить фото
        const photoId = "AgACAgIAAxkBAAIRiGmZiSTaUiKBUaabhXY8HVMDnC06AAJOFWsbOWfISP8aGxItMFEOAQADAgADcwADOgQ";
        
        await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            photo: photoId,
            caption: "Нажми на кнопку выше или на 'Аренда байков' в меню!"
          }),
        });
      } 
      else {
        // Ответ на любое другое сообщение
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: "Я тебя понял! Чтобы запустить меню, нажми /start",
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
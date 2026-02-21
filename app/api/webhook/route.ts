import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const chatId = body.message?.chat?.id;
    const text = body.message?.text;

    console.log("Получен chatId:", chatId, "Текст:", text);

    if (text === '/start' && chatId) {
      // Прямо сюда вставим токен для теста, если через env не идет
      const token = "8509212353:AAGV2SrquugQXKK5T8rQ3kAWdZAj7veb2OQ";
      const photo = "AgACAgIAAxkBAAIRiGmZiSTaUiKBUaabhXY8HVMDnC06AAJOFWsbOWfISP8aGxItMFEOAQADAgADcwADOgQ";

      const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: photo,
          caption: "✅ Бот работает! Нажми на кнопку приложения внизу.",
        }),
      });
      
      const data = await res.json();
      console.log("Ответ от Telegram:", data);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Ошибка в вебхуке:", error);
    return NextResponse.json({ ok: false });
  }
}
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const chatId = body.message?.chat?.id;
    const text = body.message?.text;
    const userLang = body.message?.from?.language_code; // Получаем язык пользователя

    if (text === '/start') {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const photoId = "AgACAgIAAxkBAAIRiGmZiSTaUiKBUaabhXY8HVMDnC06AAJOFWsbOWfISP8aGxItMFEOAQADAgADcwADOgQ";

      // Тексты на двух языках
      const messages = {
        ru: "👋 **Привет! Это DragonBike.**\n\nЧтобы открыть каталог, нажмите на кнопку **'Открыть приложение'** (или иконку квадрата) в левом нижнем углу! 👇",
        en: "👋 **Hi! This is DragonBike.**\n\nTo open the catalog, click the **'Open App'** button (or the square icon) in the bottom left corner! 👇"
      };

      // Выбираем язык (по умолчанию английский, если не ru)
      const caption = userLang === 'ru' ? messages.ru : messages.en;

      await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: photoId,
          caption: caption,
          parse_mode: "Markdown"
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ ok: false });
  }
}
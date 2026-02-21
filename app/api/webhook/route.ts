import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // ВАЖНО: Достаем данные из структуры Telegram
    const chatId = body.message?.chat?.id;
    const text = body.message?.text;
    const userLang = body.message?.from?.language_code;

    if (text === '/start' && chatId) {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      // Твой проверенный ID фото
      const photoId = "AgACAgIAAxkBAAIRiGmZiSTaUiKBUaabhXY8HVMDnC06AAJOFWsbOWfISP8aGxItMFEOAQADAgADcwADOgQ";

      const messages = {
        ru: "👋 **Привет! Это DragonBike.**\n\nЧтобы выбрать байк, нажми на кнопку **'Открыть приложение'** в левом нижнем углу! 👇",
        en: "👋 **Hi! This is DragonBike.**\n\nTo pick a bike, click the **'Open App'** button in the bottom left corner! 👇"
      };

      const caption = userLang === 'ru' ? messages.ru : messages.en;

      // Отправляем фото
      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: photoId,
          caption: caption,
          parse_mode: "Markdown"
        }),
      });

      const result = await res.json();
      if (!result.ok) {
        console.error('Telegram API error:', result);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ ok: false });
  }
}
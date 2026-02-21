import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. Логируем входящий запрос, чтобы ты видел его в Vercel Logs
    console.log("=== Telegram Update Received ===");
    console.log(JSON.stringify(body, null, 2));

    // Проверяем, что это именно текстовое сообщение
    if (!body.message) {
      return NextResponse.json({ ok: true }); // Игнорируем не-сообщения
    }

    const chatId = body.message.chat?.id;
    const text = body.message.text || "";
    const userLang = body.message.from?.language_code; // Код языка пользователя

    // 2. Реагируем на команду /start
    if (text.includes('/start') && chatId) {
      const token = "8509212353:AAGV2SrquugQXKK5T8rQ3kAWdZAj7veb2OQ";
      const photoId = "AgACAgIAAxkBAAIRiGmZiSTaUiKBUaabhXY8HVMDnC06AAJOFWsbOWfISP8aGxItMFEOAQADAgADcwADOgQ";

      // Двуязычный текст
      const captionRu = "👋 **Привет! Это DragonBike.**\n\nЧтобы выбрать байк и посмотреть каталог, нажмите на кнопку **'Открыть приложение'** в левом нижнем углу! 👇";
      const captionEn = "👋 **Hi! This is DragonBike.**\n\nTo choose a bike and view the catalog, click the **'Open App'** button in the bottom left corner! 👇";

      const finalCaption = userLang === 'ru' ? captionRu : captionEn;

      const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          photo: photoId,
          caption: finalCaption,
          parse_mode: "Markdown",
          // Добавляем инлайн-кнопку прямо в сообщении для подстраховки
          reply_markup: {
            inline_keyboard: [
              [{ text: "🛵 Open Catalog / Открыть каталог", web_app: { url: "https://scooter-danang.vercel.app" } }]
            ]
          }
        }),
      });
      
      const resData = await res.json();
      console.log("Telegram API Response:", resData);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    // Если произошла ошибка, логируем её подробно
    console.error("CRITICAL ERROR IN WEBHOOK:", error);
    return NextResponse.json({ ok: false, error: String(error) });
  }
}

export async function GET() {
  return NextResponse.json({ 
    status: "active", 
    message: "Webhook endpoint is ready to receive POST requests from Telegram." 
  });
}
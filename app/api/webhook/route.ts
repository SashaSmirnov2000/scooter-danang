import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const chatId = body.message?.chat?.id;
    const text = body.message?.text || "";

    if (chatId) {
      const token = "8509212353:AAGV2SrquugQXKK5T8rQ3kAWdZAj7veb2OQ";

      if (text.includes('/start')) {
        // Объединенный текст на двух языках с контактами поддержки
        const welcomeMessage = 
          "🇷🇺 **Добро пожаловать в каталог байков Дананга!**\n" +
          "Мы предоставляем качественный сервис без лишних заморочек. Выбирайте и бронируйте в один клик!\n\n" +
          "🆘 По возникшим вопросам пишите менеджеру: @dragonbikesupport\n\n" +
          "--- \n\n" +
          "🇬🇧 **Welcome to the Danang bike catalog!**\n" +
          "We provide high-quality service without any hassle. Choose and book in one click!\n\n" +
          "🆘 For any questions, please contact our manager: @dragonbikesupport";

        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: welcomeMessage,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  { 
                    text: "🛵 Open Catalog / Открыть каталог", 
                    web_app: { url: "https://scooter-danang.vercel.app" } 
                  }
                ]
              ]
            }
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
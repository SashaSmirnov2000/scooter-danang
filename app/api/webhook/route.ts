import { NextResponse } from 'next/server';
import { supabase } from '@/app/supabase'; 

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message;
    const chatId = message?.chat?.id;
    const text = message?.text || "";
    const username = message?.from?.username || "";

    if (chatId) {
      const token = "8509212353:AAGV2SrquugQXKK5T8rQ3kAWdZAj7veb2OQ";

      // 1. ЛОГИКА ПРИ КОМАНДЕ /START
      if (text.startsWith('/start')) {
        const parts = text.split(' ');
        const startParam = parts.length > 1 ? parts[1] : null;

        // Сохраняем пользователя в таблицу 'users'
        // Мы используем upsert, чтобы обновить данные, если юзер зашел повторно по другой ссылке
        const { error: upsertError } = await supabase
          .from('users') 
          .upsert({ 
            telegram_id: chatId, 
            referrer: startParam || 'direct', // если нет параметра, помечаем как "прямой заход"
            username: username 
          }, { onConflict: 'telegram_id' });

        if (upsertError) {
          console.error("Supabase Error (upsert):", upsertError.message);
        }

        // 2. ТЕКСТ ПРИВЕТСТВИЯ
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
    console.error("Webhook error:", error);
    return NextResponse.json({ ok: false });
  }
}

export async function GET() {
  return NextResponse.json({ status: "alive" });
}
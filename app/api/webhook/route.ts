import { NextResponse } from 'next/server';
import { supabase } from '@/app/supabase'; // Проверь, что путь к файлу supabase верный

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message;
    const chatId = message?.chat?.id;
    const text = message?.text || "";
    const username = message?.from?.username || "";

    if (chatId) {
      const token = "8509212353:AAGV2SrquugQXKK5T8rQ3kAWdZAj7veb2OQ";

      // 1. ЛОГИКА ЗАХВАТА РЕФЕРАЛА
      if (text.startsWith('/start')) {
        const parts = text.split(' ');
        const startParam = parts.length > 1 ? parts[1] : null;

        if (startParam) {
          // Сохраняем или обновляем пользователя в базе данных Supabase
          // Замени 'bookings' на 'profiles' или 'users_table', если создал отдельную таблицу
          // Если хочешь писать прямо в таблицу броней (не рекомендуется, но можно), оставь так
          try {
            await supabase
              .from('users_table') // Рекомендую создать таблицу users_table
              .upsert({ 
                telegram_id: chatId, 
                referrer: startParam, 
                username: username 
              }, { onConflict: 'telegram_id' });
            
            console.log(`User ${chatId} referred by ${startParam} saved.`);
          } catch (dbError) {
            console.error("Database error:", dbError);
          }
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

        // Ссылка на приложение. 
        // ВАЖНО: Если мы сохранили реферала в базу, Mini App может потом просто подтянуть его по telegram_id
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
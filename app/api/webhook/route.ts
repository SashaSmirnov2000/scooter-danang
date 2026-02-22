import { NextResponse } from 'next/server';
import { supabase } from '@/app/supabase'; 

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message;
    
    // Если это не обычное сообщение, просто выходим
    if (!message || !message.chat) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const text = message.text || "";
    const username = message.from?.username || "anonymous";

    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const startParam = parts.length > 1 ? parts[1] : 'direct';

      console.log(`Processing /start for ${chatId} with ref: ${startParam}`);

      // Пытаемся сохранить пользователя
      // Важно: в Supabase у telegram_id должен быть тип int8
      const { error: upsertError } = await supabase
        .from('users') 
        .upsert({ 
          telegram_id: chatId, 
          referrer: startParam, 
          username: username 
        }, { onConflict: 'telegram_id' });

      if (upsertError) {
        // Если здесь ошибка "column telegram_id does not exist" или "violates unique constraint"
        // ты увидишь это в логах Vercel
        console.error("Supabase Save Error:", upsertError.message);
      } else {
        console.log("User successfully tracked in Supabase");
      }

      // ТЕКСТ ПРИВЕТСТВИЯ (оставляем твой оригинал)
      const welcomeMessage = 
        "🇷🇺 **Добро пожаловать в каталог байков Дананга!**\n" +
        "Мы предоставляем качественный сервис без лишних заморочек. Выбирайте и бронируйте в один клик!\n\n" +
        "🆘 По возникшим вопросам пишите менеджеру: @dragonbikesupport\n\n" +
        "--- \n\n" +
        "🇬🇧 **Welcome to the Danang bike catalog!**\n" +
        "We provide high-quality service without any hassle. Choose and book in one click!\n\n" +
        "🆘 For any questions, please contact our manager: @dragonbikesupport";

      const token = process.env.TELEGRAM_BOT_TOKEN; 
// (Убедись, что имя после process.env совпадает с тем, как ты назвал его в Vercel)

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: welcomeMessage,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[
              { 
                text: "🛵 Open Catalog / Открыть каталог", 
                web_app: { url: "https://scooter-danang.vercel.app" } 
              }
            ]]
          }
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Critical Webhook error:", error);
    return NextResponse.json({ ok: false });
  }
}

export async function GET() {
  return NextResponse.json({ status: "alive" });
}
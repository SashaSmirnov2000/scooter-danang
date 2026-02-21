import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. БЕЗОПАСНОСТЬ: Берем всё из Environment Variables на Vercel
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Если токен не найден в Vercel, уведомление не уйдет
    if (!botToken) {
      console.error("ОШИБКА: TELEGRAM_BOT_TOKEN не настроен в Vercel");
      return NextResponse.json({ error: "Token missing" }, { status: 500 });
    }

    // --- ЛОГИКА 1: ОБРАБОТКА КОМАНДЫ /START ---
    if (body.message?.text?.includes('/start')) {
      const chatId = body.message.chat.id;
      const welcomeMessage = "🇷🇺 **Добро пожаловать в каталог байков Дананга!**\n\n🆘 Менеджер: @dragonbikesupport";

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: welcomeMessage,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ 
              text: "🛵 Open Catalog / Открыть каталог", 
              web_app: { url: "https://scooter-danang.vercel.app" } 
            }]]
          }
        }),
      });
      return NextResponse.json({ ok: true });
    }

    // --- ЛОГИКА 2: УВЕДОМЛЕНИЕ О БРОНИРОВАНИИ ---
    const { bike_model, start_date, end_date, client_username, telegram_id, referrer } = body;

    if (bike_model && adminChatId) {
      let finalReferrer = referrer || 'нет';

      // БЕЗОПАСНЫЙ ПОИСК В БАЗЕ (Создаем клиент внутри, чтобы не зависеть от других файлов)
      if (telegram_id && supabaseUrl && supabaseKey) {
        try {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { data, error } = await supabase
            .from('users')
            .select('referrer')
            .eq('telegram_id', telegram_id)
            .maybeSingle();

          if (!error && data?.referrer) {
            finalReferrer = data.referrer;
          }
        } catch (dbError) {
          console.error("Supabase check skipped:", dbError);
        }
      }

      // Текст для админа
      const adminText = `🔥 *Новый заказ!*\n\n` +
                        `Байк: ${bike_model}\n` +
                        `Даты: ${start_date} — ${end_date}\n` +
                        `Клиент: @${client_username}\n` +
                        `Реф: ${finalReferrer}`;
      
      // Отправка админу
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          text: adminText,
          parse_mode: 'Markdown',
        }),
      });

      // Уведомление клиенту
      if (telegram_id) {
        const clientText = `🇷🇺 *Заявка принята!* Скоро свяжемся.`;
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: telegram_id,
            text: clientText,
            parse_mode: 'Markdown'
          }),
        });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Critical Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "alive" });
}
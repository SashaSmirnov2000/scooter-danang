import { NextResponse } from 'next/server';
import { supabase } from '@/app/supabase'; 

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Берем настройки из Vercel
    const botToken = process.env.TELEGRAM_BOT_TOKEN || "8509212353:AAGV2SrquugQXKK5T8rQ3kAWdZAj7veb2OQ";
    // Используем твою переменную TELEGRAM_CHAT_ID
    const adminChatId = process.env.TELEGRAM_CHAT_ID;

    // --- ЛОГИКА 1: ОБРАБОТКА /START ---
    if (body.message?.text?.includes('/start')) {
      const chatId = body.message.chat.id;
      const welcomeMessage = 
        "🇷🇺 **Добро пожаловать в каталог байков Дананга!**\n" +
        "Выбирайте и бронируйте в один клик!\n\n" +
        "🆘 Поддержка: @dragonbikesupport";

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
    const { bike_model, start_date, end_date, client_username, telegram_id } = body;

    if (bike_model && adminChatId) {
      
      // Ищем реферала в базе данных Supabase
      let finalReferrer = "Прямой заход";
      
      if (telegram_id) {
        try {
          const { data: userData, error } = await supabase
            .from('users')
            .select('referrer')
            .eq('telegram_id', telegram_id)
            .maybeSingle(); // Используем maybeSingle, чтобы не было ошибки, если юзер не найден

          if (!error && userData?.referrer && userData.referrer !== 'direct') {
            finalReferrer = userData.referrer;
          }
        } catch (e) {
          console.error("Database fetch error:", e);
        }
      }

      // Текст для тебя (админа)
      const adminText = `🔥 *НОВЫЙ ЗАКАЗ!*\n\n` +
                        `🛵 *Байк:* ${bike_model}\n` +
                        `📅 *Даты:* ${start_date} — ${end_date}\n` +
                        `👤 *Клиент:* @${client_username}\n` +
                        `🆔 *ID:* \`${telegram_id}\`\n\n` +
                        `🔗 *РЕФЕРАЛ:* #${finalReferrer}`;
      
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          text: adminText,
          parse_mode: 'Markdown',
        }),
      });

      // Уведомление Клиенту
      if (telegram_id) {
        const clientText = `🇷🇺 *Заявка принята!*\nМенеджер скоро свяжется с вами.\n\n🇺🇸 *Request received!* Manager will contact you soon.`;
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: telegram_id, text: clientText, parse_mode: 'Markdown' }),
        });
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "alive" });
}
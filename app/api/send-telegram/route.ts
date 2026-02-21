import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const MY_ADMIN_ID = 1920798985;

    if (!botToken) return NextResponse.json({ error: "No Token" }, { status: 500 });

    // 1. ЛОГИКА ДЛЯ WEBHOOK
    if (body.message) {
      const chatId = body.message.chat.id;
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: "🇷🇺 **Добро пожаловать в каталог байков Дананга!**\n\n🆘 Менеджер: @dragonbikesupport",
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ text: "🛵 Открыть каталог", web_app: { url: "https://scooter-danang.vercel.app" } }]]
          }
        }),
      });
      return NextResponse.json({ ok: true });
    }

    // 2. ЛОГИКА ДЛЯ ЗАКАЗА
    const { bike_model, start_date, end_date, client_username, telegram_id } = body;

    if (bike_model) {
      // ПОИСК РЕФЕРАЛА В ТАБЛИЦЕ users
      let referrer = 'нет';

      if (telegram_id) {
        const { data, error } = await supabase
          .from('users')
          .select('referrer')
          .eq('telegram_id', Number(telegram_id))
          .single();

        if (!error && data?.referrer) {
          referrer = data.referrer;
        }
      }

      // СООБЩЕНИЕ АДМИНУ
      const adminText = `🔥 *НОВЫЙ ЗАКАЗ*\nБайк: ${bike_model || 'не указан'}\nДаты: ${start_date || '?'} - ${end_date || '?'}\nКлиент: @${client_username || 'unknown'}\nРеф: ${referrer}`;
      
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: MY_ADMIN_ID, 
          text: adminText, 
          parse_mode: 'Markdown' 
        }),
      });

      // СООБЩЕНИЕ КЛИЕНТУ
      if (telegram_id) {
        const clientText = `🇷🇺 *Заявка принята!*\nМы уточняем наличие *${bike_model}*. Скоро свяжемся!\nМенеджер: @dragonbikesupport\n\n---\n🇺🇸 *Request received!*\nChecking availability for *${bike_model}*. Wait for update!\nManager: @dragonbikesupport`;

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            chat_id: Number(telegram_id), 
            text: clientText, 
            parse_mode: 'Markdown' 
          }),
        });
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('Route handler error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Используем Service Role Key для надежного обхода RLS
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
      let referrer = 'нет (прямой заход)';

      // УЛУЧШЕННЫЙ ПОИСК РЕФЕРАЛА
      if (telegram_id) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('referrer')
            .eq('telegram_id', Number(telegram_id))
            .maybeSingle(); // Используем maybeSingle вместо single, чтобы не вылетало в ошибку

          if (error) {
            console.error('SUPABASE ERROR:', error);
          } else if (data?.referrer) {
            referrer = data.referrer;
          }
          
          console.log('REFERRER LOOKUP SUCCESS:', { telegram_id, referrer });
        } catch (e) {
          console.error('REFERRER LOOKUP EXCEPTION:', e);
        }
      }

      // СООБЩЕНИЕ АДМИНУ
      const adminText = `🔥 *НОВЫЙ ЗАКАЗ*\n\n🛵 Байк: *${bike_model}*\n📅 Даты: ${start_date} - ${end_date}\n👤 Клиент: @${client_username}\n🆔 ID: \`${telegram_id}\`\n🔗 *Реф из БД:* ${referrer}`;
      
      try {
        const adminRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            chat_id: MY_ADMIN_ID, 
            text: adminText, 
            parse_mode: 'Markdown' 
          }),
        });
        const adminJson = await adminRes.json();
        console.log('ADMIN SEND RESULT:', adminJson);
      } catch (e) {
        console.error('ADMIN SEND ERROR:', e);
      }

      // СООБЩЕНИЕ КЛИЕНТУ
      if (telegram_id && Number(telegram_id) !== MY_ADMIN_ID) {
        try {
          const clientText = `🇷🇺 *Заявка принята!*\nМы уточняем наличие *${bike_model}*. Скоро свяжемся!`;
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              chat_id: Number(telegram_id), 
              text: clientText, 
              parse_mode: 'Markdown' 
            }),
          });
        } catch (e) {
          console.error('CLIENT SEND ERROR:', e);
        }
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.error('Critical Route Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
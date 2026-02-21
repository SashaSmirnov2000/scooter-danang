import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const MY_ADMIN_ID = 1920798985;

    if (!botToken) return NextResponse.json({ error: "No Token" }, { status: 500 });

    const { bike_model, start_date, end_date, client_username, telegram_id } = body;

    if (bike_model) {
      let referrer = 'нет в базе';

      // --- ИЗОЛИРОВАННЫЙ БЛОК БАЗЫ ДАННЫХ ---
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        if (telegram_id) {
          // Преобразуем ID строго в число, так как в базе int8
          const targetId = Number(telegram_id);
          
          const { data, error } = await supabase
            .from('users')
            .select('referrer')
            .eq('telegram_id', targetId)
            .maybeSingle();

          if (error) {
            console.error('Supabase Error:', error);
            referrer = `ошибка запроса: ${error.message}`;
          } else if (data && data.referrer) {
            referrer = String(data.referrer);
          }
        }
      } catch (dbException: any) {
        console.error('Database Exception:', dbException);
        referrer = `ошибка подключения: ${dbException.message}`;
      }
      // ---------------------------------------

      // ТЕКСТ ДЛЯ АДМИНА
      const adminText = `🔥 *НОВЫЙ ЗАКАЗ*\n\n🛵 Байк: *${bike_model}*\n📅 Даты: ${start_date} - ${end_date}\n👤 Клиент: @${client_username}\n🆔 ID: \`${telegram_id}\`\n🔗 *Реферал:* ${referrer}`;
      
      // ОТПРАВКА АДМИНУ (сработает даже если база упала)
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: MY_ADMIN_ID, 
          text: adminText, 
          parse_mode: 'Markdown' 
        }),
      });

      // ОТПРАВКА КЛИЕНТУ
      if (telegram_id && Number(telegram_id) !== MY_ADMIN_ID) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            chat_id: Number(telegram_id), 
            text: `🇷🇺 *Заявка принята!*\nБайк: ${bike_model}\nМенеджер свяжется с вами.`, 
            parse_mode: 'Markdown' 
          }),
        });
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Global Route Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
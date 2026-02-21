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
      let referrer = 'не найден';

      // Блок работы с Supabase полностью изолирован
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        if (telegram_id) {
          // Превращаем ID в число и ищем
          const tId = Number(telegram_id);
          const { data, error } = await supabase
            .from('users')
            .select('referrer')
            .eq('telegram_id', tId)
            .maybeSingle(); // maybeSingle не выдает ошибку, если запись одна или ноль

          if (!error && data?.referrer) {
            referrer = data.referrer;
          }
        }
      } catch (dbErr) {
        // Если база выдаст любую ошибку, мы просто запишем это в переменную и пойдем дальше
        console.error("Supabase error:", dbErr);
        referrer = "ошибка БД";
      }

      // СООБЩЕНИЕ АДМИНУ (Придет в любом случае!)
      const adminText = `🔥 *НОВЫЙ ЗАКАЗ*\n\n🛵 Байк: *${bike_model}*\n📅 Даты: ${start_date} - ${end_date}\n👤 Клиент: @${client_username}\n🔗 *Реферал:* ${referrer}`;
      
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
      if (telegram_id && Number(telegram_id) !== MY_ADMIN_ID) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            chat_id: Number(telegram_id), 
            text: `🇷🇺 *Заявка принята!*\nБайк: ${bike_model}\nСкоро свяжемся!`, 
            parse_mode: 'Markdown' 
          }),
        });
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('API Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
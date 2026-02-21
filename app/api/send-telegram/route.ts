import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const MY_ADMIN_ID = 1920798985;

    // Инициализируем клиент ВНУТРИ функции, чтобы избежать ошибки билда
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (!botToken) return NextResponse.json({ error: "No Token" }, { status: 500 });

    // 1. WEBHOOK (ответ на сообщения)
    if (body.message) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: body.message.chat.id,
          text: "🇷🇺 **Каталог байков обновлен!**",
          parse_mode: "Markdown",
        }),
      });
      return NextResponse.json({ ok: true });
    }

    // 2. ЛОГИКА ЗАКАЗА
    const { bike_model, start_date, end_date, client_username, telegram_id } = body;

    if (bike_model) {
      let referrer = 'не найден';

      // Поиск реферера в таблице users
      if (telegram_id) {
        const { data } = await supabase
          .from('users')
          .select('referrer')
          .eq('telegram_id', Number(telegram_id))
          .maybeSingle();
        
        if (data?.referrer) referrer = data.referrer;
      }

      const adminText = `🔥 *НОВЫЙ ЗАКАЗ*\n\n🛵 Байк: *${bike_model}*\n📅 Даты: ${start_date} - ${end_date}\n👤 Клиент: @${client_username}\n🔗 *Реф из БД:* ${referrer}`;
      
      // Отправка тебе
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: MY_ADMIN_ID, text: adminText, parse_mode: 'Markdown' }),
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Critical Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // 1. ПРОВЕРКА НАСТРОЕК (Берем из твоего Vercel)
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const adminChatId = process.env.TELEGRAM_CHAT_ID;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Если нет токена или ID админа, сразу выходим с ошибкой в консоль
    if (!botToken || !adminChatId) {
      console.error("Missing TG config in Vercel env");
      return NextResponse.json({ error: "Config missing" }, { status: 500 });
    }

    const { bike_model, start_date, end_date, client_username, telegram_id } = body;

    // --- ЛОГИКА 1: ПОИСК РЕФЕРАЛА В БАЗЕ ---
    let finalReferrer = "Прямой заход";
    
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
      } catch (e) {
        console.error("Database skip:", e);
      }
    }

    // --- ЛОГИКА 2: ОТПРАВКА АДМИНУ ---
    const adminText = `🔥 *НОВЫЙ ЗАКАЗ!*\n\n` +
                      `🛵 *Байк:* ${bike_model || 'не указан'}\n` +
                      `📅 *Даты:* ${start_date} — ${end_date}\n` +
                      `👤 *Клиент:* @${client_username}\n` +
                      `🆔 *ID:* \`${telegram_id}\`\n\n` +
                      `🔗 *РЕФЕРАЛ:* #${finalReferrer}`;

    const adminRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text: adminText,
        parse_mode: 'Markdown',
      }),
    });

    // --- ЛОГИКА 3: ОТПРАВКА КЛИЕНТУ ---
    if (telegram_id) {
      const clientText = `🇷🇺 *Заявка принята!*\nМенеджер скоро свяжется с вами для подтверждения бронирования *${bike_model}*.`;
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegram_id,
          text: clientText,
          parse_mode: 'Markdown',
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Final catch error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "alive" });
}
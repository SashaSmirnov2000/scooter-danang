import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("📦 Данные от приложения:", body);

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const adminChatId = process.env.TELEGRAM_CHAT_ID;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!botToken || !adminChatId) {
      console.error("❌ Ошибка: Переменные TG не найдены в Vercel");
      return NextResponse.json({ error: "Config missing" }, { status: 500 });
    }

    const { bike_model, start_date, end_date, client_username, telegram_id } = body;

    if (bike_model) {
      let finalReferrer = "Прямой заход";

      // Ищем реферала в базе по ID
      if (telegram_id && supabaseUrl && supabaseKey) {
        try {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { data, error } = await supabase
            .from('users')
            .select('referrer')
            .eq('telegram_id', telegram_id)
            .maybeSingle();

          if (error) console.error("Ошибка поиска юзера:", error.message);
          if (data?.referrer) finalReferrer = data.referrer;
        } catch (e) {
          console.error("Ошибка Supabase:", e);
        }
      }

      console.log(`🚀 Отправляю уведомление админу (${adminChatId}) для реферала: ${finalReferrer}`);

      const adminText = `🔥 *Новый заказ!*\n\n` +
                        `🛵 *Байк:* ${bike_model}\n` +
                        `📅 *Даты:* ${start_date} — ${end_date}\n` +
                        `👤 *Клиент:* @${client_username}\n` +
                        `🆔 *ID:* \`${telegram_id}\`\n\n` +
                        `🔗 *Реферал:* #${finalReferrer}`;
      
      const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          text: adminText,
          parse_mode: 'Markdown',
        }),
      });

      const tgResult = await tgResponse.json();
      if (!tgResult.ok) {
        console.error("❌ Ошибка Telegram API:", tgResult.description);
      } else {
        console.log("✅ Уведомление успешно отправлено!");
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("💥 Критическая ошибка:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
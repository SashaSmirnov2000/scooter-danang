import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const MY_ADMIN_ID = 1920798985; // Твой ID из таблицы users

    // Настройки Supabase из твоего Vercel
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!botToken || !supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: "Missing environment variables" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // --- ЛОГИКА ЗАКАЗА ---
    const { bike_model, start_date, end_date, client_username, telegram_id } = body;

    if (bike_model) {
      let foundReferrer = 'не найден';

      // ШАГ 1: Ищем реферала в таблице users по telegram_id клиента
      if (telegram_id) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('referrer')
          .eq('telegram_id', telegram_id)
          .maybeSingle();

        if (userData?.referrer) {
          foundReferrer = userData.referrer;
        }
      }

      // ШАГ 2: Формируем текст для тебя (админа)
      const adminText = 
        `🔥 *Новый заказ!*\n\n` +
        `🛵 Байк: ${bike_model}\n` +
        `📅 Даты: ${start_date} — ${end_date}\n` +
        `👤 Клиент: @${client_username}\n` +
        `🆔 ID: ${telegram_id}\n` +
        `🔗 *Реферал из БД:* ${foundReferrer}`;

      // Отправка админу
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: MY_ADMIN_ID,
          text: adminText,
          parse_mode: 'Markdown',
        }),
      });

      // ШАГ 3: Отправка подтверждения клиенту
      if (telegram_id && Number(telegram_id) !== MY_ADMIN_ID) {
        const clientText = `🇷🇺 *Заявка принята!* Скоро свяжемся.\n\n🇺🇸 *Request received!* Wait for update.`;
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
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
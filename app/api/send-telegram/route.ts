import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Берем данные из Vercel
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const adminChatId = process.env.TELEGRAM_CHAT_ID;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // ВАЖНО: Если бот шлет пустоту, мы пропишем это в тексте
    let debugInfo = "";

    if (!botToken) debugInfo += "❌ Токен бота не найден в Vercel\n";
    if (!adminChatId) debugInfo += "❌ ID админа не найден в Vercel\n";

    const { bike_model, client_username, telegram_id } = body;

    let finalReferrer = "Не определен (база не ответила)";

    // Пробуем достать реферала
    if (telegram_id && supabaseUrl && supabaseKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseKey);
        const { data, error } = await supabase
          .from('users')
          .select('referrer')
          .eq('telegram_id', telegram_id)
          .maybeSingle();

        if (data?.referrer) {
          finalReferrer = data.referrer;
        } else if (error) {
          finalReferrer = `Ошибка базы: ${error.message}`;
        } else {
          finalReferrer = "Пользователь не найден в таблице users";
        }
      } catch (e) {
        finalReferrer = "Критическая ошибка подключения к базе";
      }
    }

    const adminText = `🔔 **ТЕСТ УВЕДОМЛЕНИЯ**\n\n` +
                      `🛵 Байк: ${bike_model || "не передан"}\n` +
                      `👤 Клиент: @${client_username || "неизвестно"}\n` +
                      `🔗 Реферал: ${finalReferrer}\n\n` +
                      `${debugInfo}`;

    // Пытаемся отправить
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text: adminText,
        parse_mode: 'Markdown',
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
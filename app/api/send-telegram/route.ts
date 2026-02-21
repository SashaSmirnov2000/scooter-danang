import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Функция для маленькой паузы (иногда помогает избежать спам-фильтра Telegram)
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    // Используем ваш ID как число. 
    const adminId = 1920798985; 
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!botToken) {
      return NextResponse.json({ error: "Token missing" }, { status: 500 });
    }

    // --- ЛОГИКА 1: /START ---
    if (body.message?.text?.includes('/start')) {
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

    // --- ЛОГИКА 2: БРОНИРОВАНИЕ ---
    const { bike_model, start_date, end_date, client_username, telegram_id, referrer } = body;

    if (bike_model) {
      let finalReferrer = referrer || 'нет';
      
      // Поиск реферала
      if ((!referrer || referrer === 'нет') && telegram_id && supabaseUrl && supabaseKey) {
        try {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { data } = await supabase.from('users').select('referrer').eq('telegram_id', telegram_id).maybeSingle();
          if (data?.referrer) finalReferrer = data.referrer;
        } catch (e) { console.log("DB skip"); }
      }

      const adminText = `🔥 *Новый заказ!*\n\nБайк: ${bike_model}\nДаты: ${start_date} — ${end_date}\nКлиент: @${client_username}\nРеф: ${finalReferrer}`;

      // 1. ОТПРАВЛЯЕМ АДМИНУ ПЕРВЫМ
      const adminRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminId, // Используем чистое число
          text: adminText,
          parse_mode: 'Markdown',
        }),
      });

      // Ждем 1 секунду перед отправкой клиенту
      await delay(1000);

      // 2. ОТПРАВЛЯЕМ КЛИЕНТУ (если это не сам админ)
      if (telegram_id && Number(telegram_id) !== adminId) {
        const clientText = `🇷🇺 *Заявка принята!*\nМы уточняем наличие *${bike_model}*. Скоро свяжемся!\nМенеджер: @dragonbikesupport\n\n---\n🇺🇸 *Request received!*\nChecking availability for *${bike_model}*. Wait for update!\nManager: @dragonbikesupport`;
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
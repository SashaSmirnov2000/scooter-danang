import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    // Используем твой ID 1920798985 напрямую, если переменная в Vercel не подхватилась
    const adminChatId = process.env.TELEGRAM_CHAT_ID || "1920798985"; 
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!botToken) {
      return NextResponse.json({ error: "Bot token missing in Vercel" }, { status: 500 });
    }

    // --- ЛОГИКА 1: /START ---
    if (body.message?.text?.includes('/start')) {
      const chatId = body.message.chat.id;
      const welcomeMessage = "🇷🇺 **Добро пожаловать в каталог байков Дананга!**\n\n🆘 Менеджер: @dragonbikesupport";
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: welcomeMessage,
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

      const adminText = `🔥 *Новый заказ!*\nБайк: ${bike_model}\nДаты: ${start_date} — ${end_date}\nКлиент: @${client_username}\nРеф: ${finalReferrer}`;

      // 1. СНАЧАЛА ОТПРАВЛЯЕМ АДМИНУ (тебе)
      const adminRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: Number(adminChatId), // Убеждаемся, что это число
          text: adminText,
          parse_mode: 'Markdown',
        }),
      });
      
      const adminResult = await adminRes.json();

      // 2. ПОТОМ КЛИЕНТУ
      if (telegram_id && String(telegram_id) !== String(adminChatId)) {
        const clientText = `🇷🇺 *Заявка принята!*\nМы уточняем наличие *${bike_model}*. Скоро свяжемся!`;
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

      // Если админу не ушло, мы вернем ошибку в ответе (увидишь в консоли браузера)
      if (!adminResult.ok) {
        return NextResponse.json({ 
          success: false, 
          error: "Telegram rejected admin message", 
          details: adminResult.description 
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
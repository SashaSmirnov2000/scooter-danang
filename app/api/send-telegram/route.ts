import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Токен берем из Vercel (проверь, чтобы TELEGRAM_BOT_TOKEN там был прописан!)
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    // ЖЕСТКО ПРОПИСАННЫЙ ID АДМИНА (Чтобы Vercel его не потерял)
    const MY_ADMIN_ID = 1920798985; 

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!botToken) {
      return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN missing in Vercel" }, { status: 500 });
    }

    // --- ЛОГИКА 1: WEBHOOK (Ответ на /start и сообщения) ---
    if (body.message) {
      const chatId = body.message.chat.id;
      const welcomeMessage = 
        "🇷🇺 **Добро пожаловать в каталог байков Дананга!**\n" +
        "Мы предоставляем качественный сервис без лишних заморочек.\n\n" +
        "🆘 По всем вопросам пишите менеджеру: @dragonbikesupport\n\n" +
        "--- \n\n" +
        "🇬🇧 **Welcome to the Danang bike catalog!**\n" +
        "We provide high-quality service without any hassle.\n\n" +
        "🆘 For any questions, please contact our manager: @dragonbikesupport";

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: welcomeMessage,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ 
              text: "🛵 Open Catalog / Открыть каталог", 
              web_app: { url: "https://scooter-danang.vercel.app" } 
            }]]
          }
        }),
      });
      return NextResponse.json({ ok: true });
    }

    // --- ЛОГИКА 2: УВЕДОМЛЕНИЕ О БРОНИРОВАНИИ ---
    const { bike_model, start_date, end_date, client_username, telegram_id, referrer } = body;

    if (bike_model) {
      let finalReferrer = referrer || 'нет';
      
      // Поиск реферала в базе Supabase
      if (telegram_id && supabaseUrl && supabaseKey) {
        try {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { data } = await supabase.from('users').select('referrer').eq('telegram_id', telegram_id).maybeSingle();
          if (data?.referrer) finalReferrer = data.referrer;
        } catch (e) { console.log("DB skip"); }
      }

      const adminText = `🔥 *Новый заказ!*\n\nБайк: ${bike_model}\nДаты: ${start_date} — ${end_date}\nКлиент: @${client_username}\nРеф: ${finalReferrer}`;

      // 1. ОТПРАВКА АДМИНУ (Всегда на 1920798985)
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: MY_ADMIN_ID, 
          text: adminText,
          parse_mode: 'Markdown',
        }),
      });

      await delay(500);

      // 2. ОТПРАВКА КЛИЕНТУ (Только если заказывает НЕ админ)
      if (telegram_id && Number(telegram_id) !== MY_ADMIN_ID) {
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
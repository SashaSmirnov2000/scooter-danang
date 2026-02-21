import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // БЕЗОПАСНО: Все секреты берутся только из переменных окружения Vercel
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const adminChatId = process.env.TELEGRAM_CHAT_ID || "1920798985"; 
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    // Защита: если токен не подтянулся из Vercel, код выдаст ошибку в логи, но не упадет
    if (!botToken) {
      console.error("ОШИБКА: TELEGRAM_BOT_TOKEN не найден в настройках Vercel!");
      return NextResponse.json({ error: "Bot token is missing in server environment" }, { status: 500 });
    }

    // --- ЛОГИКА 1: ОБРАБОТКА КОМАНДЫ /START ---
    if (body.message?.text?.includes('/start')) {
      const chatId = body.message.chat.id;
      const welcomeMessage = 
        "🇷🇺 **Добро пожаловать в каталог байков Дананга!**\n" +
        "Мы предоставляем качественный сервис без лишних заморочек.\n\n" +
        "🆘 По всем вопросам пишите менеджеру: @dragonbikesupport\n\n" +
        "--- \n\n" +
        "🇬🇧 **Welcome to the Danang bike catalog!**\n" +
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
      
      // Поиск реферала в базе
      if ((!referrer || referrer === 'нет') && telegram_id && supabaseUrl && supabaseKey) {
        try {
          const supabase = createClient(supabaseUrl, supabaseKey);
          const { data } = await supabase
            .from('users')
            .select('referrer')
            .eq('telegram_id', telegram_id)
            .maybeSingle();
            
          if (data?.referrer) {
            finalReferrer = data.referrer;
          }
        } catch (e) {
          console.log("Supabase connection skipped or failed");
        }
      }

      // Текст для админа
      const adminText = `🔥 *Новый заказ!*\nБайк: ${bike_model}\nДаты: ${start_date} — ${end_date}\nКлиент: @${client_username}\nРеф: ${finalReferrer}`;
      
      // 1. Отправка Админу
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          text: adminText,
          parse_mode: 'Markdown',
        }),
      });

      // 2. Отправка Клиенту (если это не сам админ)
      if (telegram_id && String(telegram_id) !== String(adminChatId)) {
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
    console.error("Critical error in route:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "alive" });
}
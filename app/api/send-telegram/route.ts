import { NextResponse } from 'next/server';
import { supabase } from '@/app/supabase'; // Проверь, что путь верный

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Подтягиваем настройки
    const botToken = process.env.TELEGRAM_BOT_TOKEN || "8509212353:AAGV2SrquugQXKK5T8rQ3kAWdZAj7veb2OQ";
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID;

    // --- ЛОГИКА 1: ОБРАБОТКА КОМАНДЫ /START ---
    if (body.message?.text?.includes('/start')) {
      const chatId = body.message.chat.id;
      const welcomeMessage = 
        "🇷🇺 **Добро пожаловать в каталог байков Дананга!**\n" +
        "Мы предоставляем качественный сервис без лишних заморочек.\n\n" +
        "🆘 По всем вопросам пишите менеджеру: @dragonbikesupport";

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

    if (bike_model && adminChatId) {
      
      // БЕЗОПАСНЫЙ ПОИСК РЕФЕРАЛА В SUPABASE
      let finalReferrer = referrer || 'нет';

      // Если в данных от приложения реферала нет, ищем в нашей таблице 'users'
      if ((!referrer || referrer === 'нет') && telegram_id) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('referrer')
            .eq('telegram_id', telegram_id)
            .maybeSingle();

          if (!error && data?.referrer) {
            finalReferrer = data.referrer;
          }
        } catch (dbError) {
          console.error("Supabase error:", dbError);
          // Не прерываем код, идем дальше к отправке сообщения
        }
      }

      // Уведомление Админу
      const adminText = `🔥 *Новый заказ!*\n\n` +
                        `Байк: ${bike_model}\n` +
                        `Даты: ${start_date} — ${end_date}\n` +
                        `Клиент: @${client_username}\n` +
                        `Реф: ${finalReferrer}`;
      
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          text: adminText,
          parse_mode: 'Markdown',
        }),
      });

      // Уведомление Клиенту
      if (telegram_id) {
        const clientText = `🇷🇺 *Заявка принята!*\nМы уточняем наличие *${bike_model}*. Скоро свяжемся!\nМенеджер: @dragonbikesupport`;

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
    console.error("Critical Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "alive" });
}
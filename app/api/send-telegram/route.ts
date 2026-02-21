import { NextResponse } from 'next/server';
import { supabase } from '@/app/supabase'; // Импортируем клиент Supabase

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Подтягиваем токен и ID из настроек Vercel или используем значения по умолчанию
    const botToken = process.env.TELEGRAM_BOT_TOKEN || "8509212353:AAGV2SrquugQXKK5T8rQ3kAWdZAj7veb2OQ";
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID || "6022301140"; // Замените на ваш ID, если он отличается

    // --- ЛОГИКА 1: ОБРАБОТКА КОМАНДЫ /START (ОТ БОТА) ---
    if (body.message?.text?.includes('/start')) {
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

    // --- ЛОГИКА 2: УВЕДОМЛЕНИЕ О БРОНИРОВАНИИ (ИЗ ПРИЛОЖЕНИЯ) ---
    const { bike_model, start_date, end_date, client_username, telegram_id } = body;

    if (bike_model && adminChatId) {
      
      // Ищем реферала в базе данных Supabase по telegram_id
      let finalReferrer = "Прямой заход";
      
      if (telegram_id) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('referrer')
          .eq('telegram_id', telegram_id)
          .single();

        if (!error && userData?.referrer) {
          finalReferrer = userData.referrer;
        }
      }

      // Уведомление Админу (теперь с подтянутым рефералом)
      const adminText = `🔥 *Новый заказ!*\n\n🛵 *Байк:* ${bike_model}\n📅 *Даты:* ${start_date} — ${end_date}\n👤 *Клиент:* @${client_username}\n🆔 *ID:* \`${telegram_id}\`\n\n🔗 *Реферал:* #${finalReferrer}`;
      
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
    console.error("Error in send-telegram route:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "alive" });
}
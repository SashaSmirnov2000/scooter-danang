import { NextResponse } from 'next/server';
import { supabase } from '@/app/supabase'; 

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    const botToken = process.env.TELEGRAM_BOT_TOKEN || "8509212353:AAGV2SrquugQXKK5T8rQ3kAWdZAj7veb2OQ";
    
    // ПРОВЕРКА ID: берем из Vercel, если пусто — впиши свой ID вручную вместо "ТВОЙ_АЙДИ"
    const adminChatId = process.env.TELEGRAM_CHAT_ID || "6022301140"; 

    // --- ЛОГИКА 1: ОБРАБОТКА /START ---
    if (body.message?.text?.includes('/start')) {
      // (Этот блок работает, мы его не трогаем)
      const chatId = body.message.chat.id;
      const welcomeMessage = "🇷🇺 Добро пожаловать!";
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: welcomeMessage,
          reply_markup: {
            inline_keyboard: [[{ text: "Открыт каталог", web_app: { url: "https://scooter-danang.vercel.app" } }]]
          }
        }),
      });
      return NextResponse.json({ ok: true });
    }

    // --- ЛОГИКА 2: УВЕДОМЛЕНИЕ О БРОНИРОВАНИИ ---
    const { bike_model, start_date, end_date, client_username, telegram_id } = body;

    // Если это данные из приложения
    if (bike_model) {
      console.log("Новая заявка получена. Отправляю админу:", adminChatId);

      let finalReferrer = "Прямой заход";
      
      if (telegram_id) {
        const { data: userData } = await supabase
          .from('users')
          .select('referrer')
          .eq('telegram_id', telegram_id)
          .maybeSingle();

        if (userData?.referrer && userData.referrer !== 'direct') {
          finalReferrer = userData.referrer;
        }
      }

      const adminText = `🔥 *НОВЫЙ ЗАКАЗ!*\n\n` +
                        `🛵 *Байк:* ${bike_model}\n` +
                        `📅 *Даты:* ${start_date} — ${end_date}\n` +
                        `👤 *Клиент:* @${client_username}\n` +
                        `🆔 *ID:* \`${telegram_id}\`\n\n` +
                        `🔗 *РЕФЕРАЛ:* #${finalReferrer}`;
      
      // Сама отправка
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: adminChatId,
          text: adminText,
          parse_mode: 'Markdown',
        }),
      });

      const result = await response.json();
      if (!result.ok) {
        console.error("Ошибка отправки в Telegram:", result.description);
      }

      // Ответ клиенту
      if (telegram_id) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            chat_id: telegram_id, 
            text: "🇷🇺 Заявка принята! Менеджер скоро свяжется с вами.", 
            parse_mode: 'Markdown' 
          }),
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Критическая ошибка:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "alive" });
}
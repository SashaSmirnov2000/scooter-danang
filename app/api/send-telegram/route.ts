import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Токен берем из Vercel
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    // Твой ID прописан жестко
    const MY_ADMIN_ID = 1920798985; 

    if (!botToken) return NextResponse.json({ error: "No Token" }, { status: 500 });

    // 1. ЛОГИКА ДЛЯ WEBHOOK (ответ на сообщения в ТГ)
    if (body.message) {
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

    // 2. ЛОГИКА ДЛЯ ЗАКАЗА
    // ВНИМАНИЕ: Если здесь какая-то переменная пустая, админ все равно получит сообщение
    const { bike_model, start_date, end_date, client_username, telegram_id, referrer } = body;

    if (bike_model) {
      // СООБЩЕНИЕ АДМИНУ (Отправляется ВСЕГДА первым)
      const adminText = `🔥 *НОВЫЙ ЗАКАЗ*\nБайк: ${bike_model || 'не указан'}\nДаты: ${start_date || '?'} - ${end_date || '?'}\nКлиент: @${client_username || 'unknown'}\nРеф: ${referrer || 'нет'}`;
      
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: MY_ADMIN_ID, 
          text: adminText, 
          parse_mode: 'Markdown' 
        }),
      });

      // СООБЩЕНИЕ КЛИЕНТУ (Отправляется вторым)
      if (telegram_id) {
        const clientText = `🇷🇺 *Заявка принята!*\nМы уточняем наличие *${bike_model}*. Скоро свяжемся!\nМенеджер: @dragonbikesupport\n\n---\n🇺🇸 *Request received!*\nChecking availability for *${bike_model}*. Wait for update!\nManager: @dragonbikesupport`;
        
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            chat_id: telegram_id, 
            text: clientText, 
            parse_mode: 'Markdown' 
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
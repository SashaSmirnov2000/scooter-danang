import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const MY_ADMIN_ID = 1920798985;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (!botToken) return NextResponse.json({ error: "No Token" }, { status: 500 });

    // 1. ЛОГИКА ОБРАБОТКИ СООБЩЕНИЙ (Webhook от Telegram)
    if (body.message) {
      const chatId = body.message.chat.id;
      const username = body.message.from?.username || 'unknown';
      const text = body.message.text || '';

      // Проверяем наличие пользователя в базе при любом сообщении
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', chatId)
        .maybeSingle();

      if (!existingUser) {
        // Если это /start с параметром, вытягиваем реферала, иначе 'direct'
        const startParam = text.startsWith('/start') ? text.split(' ')[1] : null;
        
        await supabase.from('users').insert([{
          telegram_id: chatId,
          username: username,
          referrer: startParam || 'direct'
        }]);
      }

      // Отправляем приветственное сообщение на ЛЮБОЕ входящее сообщение
      const welcomeMessage = 
`✨ **Добро пожаловать в каталог байков Дананга!**

Наш сервис помогает вам полностью сфокусироваться на путешествии и арендовать транспорт за несколько кликов без лишних заморочек. 🛵

---
✨ **Welcome to the Da Nang Bike Catalog!**

Our service helps you focus entirely on your journey and rent a vehicle in a few clicks without any hassle.

🤝 **Менеджер / Support:** @dragonbikesupport`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: welcomeMessage,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [[{ 
              text: "🛵 Открыть каталог / Open Catalog", 
              web_app: { url: "https://scooter-danang.vercel.app" } 
            }]]
          }
        }),
      });
      
      return NextResponse.json({ ok: true });
    }

    // 2. ЛОГИКА ДЛЯ ЗАКАЗА (Из Mini App)
    const { bike_model, start_date, end_date, client_username, telegram_id, bike_id } = body;

    if (bike_model) {
      let referrer = 'direct';

      if (telegram_id) {
        const { data: userData } = await supabase
          .from('users')
          .select('referrer')
          .eq('telegram_id', Number(telegram_id))
          .maybeSingle();

        if (userData?.referrer) {
          referrer = userData.referrer;
        }
      }

      // Сохраняем бронирование
      await supabase.from('bookings').insert([{
        bike_id: bike_id,
        bike_model: bike_model,
        start_date: start_date,
        end_date: end_date,
        client_username: client_username,
        telegram_id: telegram_id,
        referrer: referrer
      }]);

      const safeBike = String(bike_model).replace(/_/g, '\\_');
      const safeUser = String(client_username).replace(/_/g, '\\_');
      const safeRef = String(referrer).replace(/_/g, '\\_');

      // Уведомление админу
      const adminText = `🔔 **НОВЫЙ ЗАКАЗ**\n\n**Байк:** ${safeBike}\n**Даты:** ${start_date} — ${end_date}\n**Клиент:** @${safeUser}\n**Реф:** ${safeRef}`;
      
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: MY_ADMIN_ID, 
          text: adminText, 
          parse_mode: 'Markdown' 
        }),
      });

      // Уведомление клиенту
      if (telegram_id) {
        const bookingMessage = 
`✅ **Заявка принята! / Order received!**

Мы уже уточняем наличие **${safeBike}**. Вы можете расслабиться и заниматься своими делами, мы сами пришлем вам уведомление. 

Если этот байк будет занят, мы подберем для вас похожие варианты и пришлем их сюда. 📩

---
We are checking the availability of **${safeBike}**. You can relax and go about your business, we will send you a notification. If this bike is unavailable, we will find similar options for you.

🕒 **Время обработки:** 10:00 — 22:00 (Local time)

🤝 **Менеджер / Support:** @dragonbikesupport`;

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            chat_id: Number(telegram_id), 
            text: bookingMessage, 
            parse_mode: 'Markdown' 
          }),
        });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });

  } catch (error: any) {
    console.error('Route error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
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

    // 1. ЛОГИКА ДЛЯ WEBHOOK (Приветствие)
    if (body.message) {
      const chatId = body.message.chat.id;
      const username = body.message.from?.username || 'unknown';
      const text = body.message.text || '';

      if (text.startsWith('/start')) {
        const startParam = text.split(' ')[1];
        
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('telegram_id', chatId)
          .maybeSingle();

        if (!existingUser) {
          await supabase.from('users').insert([{
            telegram_id: chatId,
            username: username,
            referrer: startParam || 'direct'
          }]);
        }

        const welcomeMessage = 
`**Добро пожаловать в каталог байков Дананга!**
Наш сервис помогает вам полностью сфокусироваться на путешествии и арендовать транспорт за несколько кликов без заморочек.

**Welcome to the Da Nang Bike Catalog!**
Our service helps you focus entirely on your journey and rent a vehicle in a few clicks without any hassle.

Менеджер / Support: @dragonbikesupport`;

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: welcomeMessage,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [[{ text: "Open Catalog", web_app: { url: "https://scooter-danang.vercel.app" } }]]
            }
          }),
        });
        return NextResponse.json({ ok: true });
      }
    }

    // 2. ЛОГИКА ДЛЯ ЗАКАЗА (Из Mini App)
    const { bike_model, start_date, end_date, client_username, telegram_id } = body;

    if (bike_model) {
      let referrer = 'нет';

      if (telegram_id) {
        const { data, error } = await supabase
          .from('users')
          .select('referrer')
          .eq('telegram_id', Number(telegram_id))
          .maybeSingle();

        if (!error && data?.referrer) {
          referrer = String(data.referrer).replace(/_/g, '\\_');
        }
      }

      const safeBike = String(bike_model).replace(/_/g, '\\_');
      const safeUser = String(client_username).replace(/_/g, '\\_');

      // Текст для админа
      const adminText = `НОВЫЙ ЗАКАЗ\nБайк: ${safeBike}\nДаты: ${start_date} - ${end_date}\nКлиент: @${safeUser}\nРеф: ${referrer}`;
      
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: MY_ADMIN_ID, 
          text: adminText, 
          parse_mode: 'Markdown' 
        }),
      });

      // Текст для клиента
      if (telegram_id) {
        const bookingMessage = 
`**Заявка принята! / Order received!**

Мы уже уточняем наличие **${safeBike}**. Вы можете расслабиться и заниматься своими делами, мы пришлем уведомление. Если этот байк будет занят, мы сами подберем для вас похожие варианты.

We are checking the availability of **${safeBike}**. You can relax and go about your business, we will send you a notification. If this bike is unavailable, we will select and send you similar options.

**Рабочее время / Working hours:** 10:00 - 22:00 (GMT+7)
Менеджер / Support: @dragonbikesupport`;

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
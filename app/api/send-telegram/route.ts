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

    // 1. ЛОГИКА ДЛЯ WEBHOOK (Когда юзер пишет боту)
    if (body.message) {
      const chatId = body.message.chat.id;
      const username = body.message.from?.username || 'unknown';
      const text = body.message.text || '';

      // ПРОВЕРЯЕМ/СОЗДАЕМ ЮЗЕРА, ЧТОБЫ ОН ПОПАЛ В ТАБЛИЦУ
      if (text.startsWith('/start')) {
        const startParam = text.split(' ')[1]; // Если зашел по ссылке ?start=alex
        
        // Проверяем, есть ли уже такой юзер
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('telegram_id', chatId)
          .maybeSingle();

        if (!existingUser) {
          // Если юзера нет — создаем его!
          await supabase.from('users').insert([{
            telegram_id: chatId,
            username: username,
            referrer: startParam || 'direct'
          }]);
        }
      }

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

    // 2. ЛОГИКА ДЛЯ ЗАКАЗА (Из Mini App)
    const { bike_model, start_date, end_date, client_username, telegram_id } = body;

    if (bike_model) {
      let referrer = 'нет';

      if (telegram_id) {
        const { data, error } = await supabase
          .from('users')
          .select('referrer')
          .eq('telegram_id', Number(telegram_id))
          .maybeSingle(); // Безопасный метод

        if (!error && data?.referrer) {
          // Экранируем подчеркивания для реферала
          referrer = String(data.referrer).replace(/_/g, '\\_');
        }
      }

      // Экранируем данные клиента для безопасности Markdown
      const safeBike = String(bike_model).replace(/_/g, '\\_');
      const safeUser = String(client_username).replace(/_/g, '\\_');

      const adminText = `🔥 *НОВЫЙ ЗАКАЗ*\nБайк: *${safeBike}*\nДаты: ${start_date} - ${end_date}\nКлиент: @${safeUser}\nРеф: ${referrer}`;
      
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: MY_ADMIN_ID, 
          text: adminText, 
          parse_mode: 'Markdown' 
        }),
      });

      if (telegram_id) {
        const clientText = `🇷🇺 *Заявка принята!*\nМы уточняем наличие *${safeBike}*. Скоро свяжемся!\nМенеджер: @dragonbikesupport`;

        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            chat_id: Number(telegram_id), 
            text: clientText, 
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
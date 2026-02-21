import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bike_model, start_date, end_date, client_username, telegram_id, referrer } = body;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

    if (!botToken || !adminChatId) {
      return NextResponse.json({ error: 'Bot settings missing' }, { status: 500 });
    }

    // 1. СООБЩЕНИЕ ДЛЯ АДМИНА (всегда можно оставить на русском)
    const adminText = `
🔥 *Новое бронирование!*
Байк: ${bike_model}
Даты: ${start_date} — ${end_date}
Клиент: @${client_username}
Реферал: ${referrer || 'нет'}
    `;

    // Отправка админу
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text: adminText,
        parse_mode: 'Markdown',
      }),
    });

    // 2. СООБЩЕНИЕ ДЛЯ КЛИЕНТА (на двух языках)
    if (telegram_id) {
      const clientText = `
🇷🇺 *Заявка принята!*
Мы уже уточняем наличие байка *${bike_model}* на ваши даты. 
Наше рабочее время: 10:00 — 22:00. Мы скоро свяжемся с вами!

---
🇺🇸 *Request received!*
We are checking availability for *${bike_model}* for your dates.
Our working hours: 10:00 AM — 10:00 PM. We will contact you soon!
      `;

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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
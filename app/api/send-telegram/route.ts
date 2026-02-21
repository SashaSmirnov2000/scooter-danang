import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // Извлекаем данные, включая telegram_id клиента (его нужно передать с фронтенда)
    const { bike_model, start_date, end_date, client_username, referrer, telegram_id } = body;

    const token = process.env.TELEGRAM_BOT_TOKEN;
    const adminChatId = process.env.TELEGRAM_CHAT_ID;

    // 1. Сообщение для ТЕБЯ (Админа)
    const adminMessage = `
🚲 *НОВАЯ ЗАЯВКА*
────────────────
🛵 *Байк:* ${bike_model}
📅 *Даты:* ${start_date} — ${end_date}
👤 *Клиент:* @${client_username}
🔗 *Реф:* ${referrer || 'прямой'}
    `;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text: adminMessage,
        parse_mode: 'Markdown',
      }),
    });

    // 2. Сообщение для КЛИЕНТА (Подтверждение)
    // Мы отправляем его, только если telegram_id пришел из приложения
    if (telegram_id) {
      const clientMessage = `
✅ *Заявка принята!*

Мы уже уточняем наличие байка *${bike_model}* на ваши даты.

🕒 *Время работы в Дананге:* Ежедневно с **10:00** до **22:00**.

Пожалуйста, ожидайте уведомления. Мы свяжемся с вами в ближайшее время! 🙏
      `;

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegram_id,
          text: clientMessage,
          parse_mode: 'Markdown',
        }),
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending TG message:', error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
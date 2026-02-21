import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { bike_model, start_date, end_date, client_username, referrer } = body;

    // Эти данные мы добавим в настройки Vercel чуть позже
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    const message = `
🚲 *НОВАЯ ЗАЯВКА*
────────────────
🛵 *Байк:* ${bike_model}
📅 *Даты:* ${start_date} — ${end_date}
👤 *Клиент:* @${client_username}
🔗 *Реф:* ${referrer || 'прямой'}
    `;

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) throw new Error('TG Error');

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
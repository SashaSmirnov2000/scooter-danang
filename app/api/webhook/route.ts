import { NextResponse } from 'next/server';
import { supabase } from '@/app/supabase'; 

async function checkSubscription(botToken: string, userId: number) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getChatMember?chat_id=@dragonindanang&user_id=${userId}`);
    const data = await response.json();
    return data.ok && ['member', 'administrator', 'creator'].includes(data.result?.status);
  } catch (e) {
    return true; // В случае ошибки API пропускаем, чтобы не блокировать бота
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message;
    const token = process.env.TELEGRAM_BOT_TOKEN!;

    if (!message || !message.chat) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const text = message.text || "";
    const username = message.from?.username || "anonymous";

    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const startParam = parts.length > 1 ? parts[1] : 'direct';

      await supabase.from('users').upsert({ 
        telegram_id: chatId, 
        referrer: startParam, 
        username: username 
      }, { onConflict: 'telegram_id' });

      const isSubscribed = await checkSubscription(token, chatId);

      let welcomeMessage = 
        "🇷🇺 **Добро пожаловать в каталог байков Дананга!**\n" +
        "Мы предоставляем качественный сервис без лишних заморочек. Выбирайте и бронируйте в один клик!\n\n" +
        "🆘 По возникшим вопросам пишите менеджеру: @dragonservicesupport\n\n" +
        "--- \n\n" +
        "🇬🇧 **Welcome to the Danang bike catalog!**\n" +
        "We provide high-quality service without any hassle. Choose and book in one click!\n\n" +
        "🆘 For any questions, please contact our manager: @dragonservicesupport";

      if (!isSubscribed) {
        welcomeMessage += "\n\n---\n" +
          "📢 **Пожалуйста, подпишитесь на наш канал, чтобы не потерять связь и быть в курсе новостей:**\n" +
          "📢 **Please subscribe to our channel to stay in touch and keep up with news:**\n" +
          "https://t.me/dragonindanang";
      }

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: welcomeMessage,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "📢 Subscribe / Подписаться", url: "https://t.me/dragonindanang" }],
              [{ text: "🛵 Open Catalog / Открыть каталог", web_app: { url: "https://scooter-danang.vercel.app" } }]
            ]
          }
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Critical Webhook error:", error);
    return NextResponse.json({ ok: false });
  }
}

export async function GET() {
  return NextResponse.json({ status: "alive" });
}
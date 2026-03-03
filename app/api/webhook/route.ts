import { NextResponse } from 'next/server';
import { supabase } from '@/app/supabase'; 

const CHANNEL_ID = "@dragonindanang"; // ID вашего канала
const SUPPORT_CONTACT = "@dragonservicesupport";

async function checkSubscription(chatId: number, token: string) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getChatMember?chat_id=${CHANNEL_ID}&user_id=${chatId}`);
    const data = await response.json();
    if (!data.ok) return true; // Если ошибка (бот не админ), пропускаем
    const status = data.result.status;
    return ['member', 'administrator', 'creator'].includes(status);
  } catch (e) {
    return true; 
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = body.message;
    if (!message || !message.chat) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const text = message.text || "";
    const username = message.from?.username || "anonymous";
    const token = process.env.TELEGRAM_BOT_TOKEN!;

    // 1. ПРОВЕРКА ПОДПИСКИ
    const isSubscribed = await checkSubscription(chatId, token);
    if (!isSubscribed) {
      const subMessage = 
        "👋 **Привет! / Hello!**\n\n" +
        "Чтобы не потерять связь и пользоваться каталогом, пожалуйста, подпишись на наше сообщество в Дананге:\n\n" +
        "Please subscribe to our community in Da Nang to stay in touch and use the catalog:\n\n" +
        "👉 https://t.me/dragonindanang";

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: subMessage,
          reply_markup: {
            inline_keyboard: [[{ text: "✅ Я подписался / I subscribed", callback_data: "check_sub" }]]
          }
        }),
      });
      return NextResponse.json({ ok: true });
    }

    // 2. ЛОГИКА /START
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const startParam = parts.length > 1 ? parts[1] : 'direct';

      await supabase.from('users').upsert({ 
          telegram_id: chatId, referrer: startParam, username: username 
      }, { onConflict: 'telegram_id' });

      const welcomeMessage = 
        "✨ **Добро пожаловать в каталог байков! / Welcome to the bike catalog!**\n\n" +
        "Мы предоставляем качественный сервис без лишних заморочек. Выбирайте и бронируйте в один клик!\n" +
        "We provide high-quality service without any hassle. Choose and book in one click!\n\n" +
        `🆘 **Support:** ${SUPPORT_CONTACT}`;

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
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
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: false });
  }
}
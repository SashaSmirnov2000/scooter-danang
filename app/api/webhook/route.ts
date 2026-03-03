import { NextResponse } from 'next/server';
import { supabase } from '@/app/supabase'; 

async function checkSubscription(botToken: string, userId: number) {
  try {
    // Используем POST запрос к getChatMember для надежности
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: "@dragonindanang",
        user_id: userId
      })
    });
    
    const data = await response.json();
    
    // Если бот не админ или ошибка канала — возвращаем false (просим подписаться)
    if (!data.ok) {
      console.error("Ошибка проверки подписки:", data.description);
      return false;
    }
    
    const status = data.result?.status;
    
    // Четкий список статусов, которые считаются ПОДПИСКОЙ
    const isMember = ['member', 'administrator', 'creator'].includes(status);
    
    // Статусы 'left' (вышел) или 'kicked' (забанен) возвращают false
    return isMember;
  } catch (e) {
    console.error("Ошибка сети при проверке:", e);
    return false; 
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

      // 1. Сохраняем пользователя
      await supabase.from('users').upsert({ 
        telegram_id: chatId, 
        referrer: startParam, 
        username: username 
      }, { onConflict: 'telegram_id' });

      // 2. СРАЗУ проверяем подписку
      const isSubscribed = await checkSubscription(token, chatId);

      // 3. Формируем текст
      let welcomeMessage = 
        "🇷🇺 **Добро пожаловать в каталог байков Дананга!**\n" +
        "Мы предоставляем качественный сервис без лишних заморочек. Выбирайте и бронируйте в один клик!\n\n" +
        "🆘 По возникшим вопросам пишите менеджеру: @dragonservicesupport\n\n" +
        "--- \n\n" +
        "🇬🇧 **Welcome to the Danang bike catalog!**\n" +
        "We provide high-quality service without any hassle. Choose and book in one click!\n\n" +
        "🆘 For any questions, please contact our manager: @dragonservicesupport";

      if (!isSubscribed) {
        welcomeMessage += "\n\n" +
          "⚠️ **Внимание / Attention**\n" +
          "🇷🇺 Пожалуйста, подпишитесь на наш канал, чтобы получить доступ к каталогу и новостям:\n" +
          "🇬🇧 Please subscribe to our channel to get access to the catalog and news:\n" +
          "👉 https://t.me/dragonindanang";
      }

      // 4. Формируем клавиатуру
      const keyboard = [];
      if (!isSubscribed) {
        keyboard.push([{ text: "📢 Subscribe / Подписаться", url: "https://t.me/dragonindanang" }]);
      }
      keyboard.push([{ 
        text: "🛵 Open Catalog / Открыть каталог", 
        web_app: { url: "https://scooter-danang.vercel.app" } 
      }]);

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: welcomeMessage,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: keyboard
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
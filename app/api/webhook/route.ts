import { NextResponse } from 'next/server';
import { supabase } from '@/app/supabase'; 

async function checkSubscription(botToken: string, userId: number) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: "@dragonindanang", 
        user_id: userId
      })
    });
    
    const data = await response.json();
    if (!data.ok) return false;
    
    const status = data.result?.status;
    // Статусы 'member', 'administrator', 'creator' — это подписка есть
    return ['member', 'administrator', 'creator'].includes(status);
  } catch (e) {
    return false; 
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = process.env.TELEGRAM_BOT_TOKEN!;
    const MY_ADMIN_ID = 1920798985;
    
    // Определяем userId и chatId максимально надежно
    const userId = body.message?.from?.id || body.callback_query?.from?.id;
    const chatId = body.message?.chat?.id || body.callback_query?.message?.chat?.id;

    if (!userId || !chatId) return NextResponse.json({ ok: true });

    // 1. Игнорируем админа
    if (userId === MY_ADMIN_ID) return NextResponse.json({ ok: true });

    // 2. Игнорируем технические колбэки управления
    const callbackData = body.callback_query?.data || "";
    const adminCommands = ['manage_', 'confirm_', 'decline_', 'ask_msg_'];
    if (adminCommands.some(cmd => callbackData.startsWith(cmd))) {
      return NextResponse.json({ ok: true });
    }

    const text = body.message?.text || "";
    const username = (body.message?.from?.username || body.callback_query?.from?.username) || "anonymous";

    // Логика записи реферала (только при /start)
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const startParam = parts.length > 1 ? parts[1] : 'direct';

      await supabase.from('users').upsert({ 
        telegram_id: chatId, 
        referrer: startParam, 
        username: username 
      }, { onConflict: 'telegram_id' });
    }

    // Проверка подписки
    const isSubscribed = await checkSubscription(token, userId);

    // Если это клик по кнопке — сразу отвечаем в ТГ, чтобы убрать "часики"
    if (body.callback_query) {
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          callback_query_id: body.callback_query.id,
          text: isSubscribed ? "Подписка подтверждена!" : "Вы всё еще не подписаны" 
        })
      });
    }

    if (!isSubscribed) {
      const subscribeNotice = 
        "**Для доступа к каталогу необходимо подписаться на наш канал @dragonindanang**\n\n" +
        "После подписки нажмите кнопку проверки ниже.";

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: subscribeNotice,
          parse_mode: "Markdown",
          reply_markup: { 
            inline_keyboard: [
              [{ text: "📢 Подписаться", url: "https://t.me/dragonindanang" }],
              [{ text: "🔄 Проверить подписку", callback_data: "check_sub" }]
            ] 
          }
        }),
      });
      return NextResponse.json({ ok: true });
    }

    // Если подписан и пришел /start или нажата кнопка проверки
    if (text.startsWith('/start') || callbackData === "check_sub") {
      const welcomeMessage = "**Добро пожаловать в каталог байков!** 🛵\n\nВыбирайте и бронируйте в один клик.";
      
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: welcomeMessage,
          parse_mode: "Markdown",
          reply_markup: { 
            inline_keyboard: [[{ 
              text: "🛵 Открыть каталог", 
              web_app: { url: "https://scooter-danang.vercel.app" } 
            }]] 
          }
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: true }); // Возвращаем ok, чтобы ТГ не слал повторы при ошибках кода
  }
}
import { NextResponse } from 'next/server';
import { supabase } from '@/app/supabase';

async function checkSubscription(botToken: string, userId: number) {
  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/getChatMember`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: "@dragonindanang", user_id: userId })
    });
    const data = await response.json();
    if (!data.ok) return false;
    const status = data.result?.status;
    if (status === 'left' || status === 'kicked') return false;
    return ['member', 'administrator', 'creator'].includes(status);
  } catch (e) {
    return false;
  }
}

// Все callback_data, которые обрабатывает ПЕРВЫЙ файл (route с заказами)
const ORDER_CALLBACKS = ['manage_', 'confirm_', 'decline_', 'ask_msg_', 'cancel_order_'];

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = process.env.TELEGRAM_BOT_TOKEN!;

    const callbackData = body.callback_query?.data as string | undefined;

    // ── Если это callback от заказов — этот файл его НЕ трогает ──────────────
    if (callbackData && ORDER_CALLBACKS.some(prefix => callbackData.startsWith(prefix))) {
      return NextResponse.json({ ok: true });
    }

    const message = body.message || body.callback_query?.message;
    const chatId = message?.chat?.id;
    const userId = body.callback_query?.from?.id || body.message?.from?.id;
    const text = body.message?.text || "";
    const username = body.message?.from?.username || body.callback_query?.from?.username || "anonymous";

    if (!chatId) return NextResponse.json({ ok: true });

    // ── /start: запись реферала ───────────────────────────────────────────────
    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const startParam = parts.length > 1 ? parts[1] : 'direct';
      await supabase.from('users').upsert(
        { telegram_id: chatId, referrer: startParam, username },
        { onConflict: 'telegram_id' }
      );
    }

    // ── Если это НЕ /start и НЕ check_sub — ничего не делаем ─────────────────
    // (Чтобы случайные сообщения не триггерили приветствие)
    const isCheckSub = callbackData === 'check_sub';
    const isStart = text.startsWith('/start');

    if (!isStart && !isCheckSub) {
      // Если это callback — просто закрываем уведомление в ТГ и выходим
      if (body.callback_query) {
        await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: body.callback_query.id })
        });
      }
      return NextResponse.json({ ok: true });
    }

    // ── Проверка подписки ─────────────────────────────────────────────────────
    const isSubscribed = await checkSubscription(token, userId);

    if (!isSubscribed) {
      const subscribeNotice =
        "**Для доступа к каталогу необходимо подписаться на наш канал**\n\n" +
        "Пожалуйста, подпишитесь на канал и нажмите кнопку проверки ниже.\n\n" +
        "---\n\n" +
        "**To use our catalog, please subscribe to our channel**\n\n" +
        "Please subscribe to the channel and click the verification button below.";

      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: subscribeNotice,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "📢 Subscribe / Подписаться", url: "https://t.me/dragonindanang" }],
              [{ text: "🔄 Проверить подписку / Check subscription", callback_data: "check_sub" }]
            ]
          }
        }),
      });

      if (body.callback_query) {
        await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: body.callback_query.id })
        });
      }

      return NextResponse.json({ ok: true });
    }

    // ── Подписан → приветствие с каталогом ────────────────────────────────────
    const welcomeMessage =
      "**Добро пожаловать в каталог байков Дананга!**\n" +
      "Мы предоставляем качественный сервис без лишних заморочек. Выбирайте и бронируйте в один клик!\n\n" +
      "🆘 По возникшим вопросам пишите менеджеру: @dragonservicesupport\n\n" +
      "---\n\n" +
      "**Welcome to the Danang bike catalog!**\n" +
      "We provide high-quality service without any hassle. Choose and book in one click!\n\n" +
      "🆘 For any questions, please contact our manager: @dragonservicesupport";

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: welcomeMessage,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [[{ text: "🛵 Open Catalog / Открыть каталог", web_app: { url: "https://scooter-danang.vercel.app" } }]]
        }
      }),
    });

    if (body.callback_query) {
      await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: body.callback_query.id })
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}

export async function GET() {
  return NextResponse.json({ status: "alive" });
}
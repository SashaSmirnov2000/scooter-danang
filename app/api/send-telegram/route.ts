import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const MY_ADMIN_ID = 1920798985;
const SUPPORT_LINK = "https://t.me/dragonservicesupport";

async function tgPost(botToken: string, method: string, body: object) {
  return fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (!botToken) return NextResponse.json({ error: "No Token" }, { status: 500 });

    // ─── 0. CALLBACK QUERIES ───────────────────────────────────────────────────
    if (body.callback_query) {
      const callbackId = body.callback_query.id;
      const callbackData = body.callback_query.data as string;
      const chatId = body.callback_query.message.chat.id;
      const messageId = body.callback_query.message.message_id;
      const oldText = body.callback_query.message.text || "";

      const answerCallback = () =>
        tgPost(botToken, 'answerCallbackQuery', { callback_query_id: callbackId });

      // ── Клиент отменяет заказ ──────────────────────────────────────────────
      if (callbackData.startsWith('cancel_order_')) {
        const bikeId = callbackData.replace('cancel_order_', '');

        // Находим последний pending-заказ этого пользователя на этот байк
        const { data: booking } = await supabase
          .from('bookings')
          .select('id, bike_model')
          .eq('telegram_id', chatId)
          .eq('bike_id', bikeId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (booking) {
          await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id);

          // Уведомляем админа
          await tgPost(botToken, 'sendMessage', {
            chat_id: MY_ADMIN_ID,
            text: `❌ **Заказ №${booking.id} отменён клиентом.**\nБайк: ${booking.bike_model}`,
            parse_mode: 'Markdown',
          });
        }

        await tgPost(botToken, 'editMessageText', {
          chat_id: chatId,
          message_id: messageId,
          text:
            "❌ **Ваше бронирование отменено.**\nРешили выбрать другой байк? Заходите в каталог.\n\n---\n❌ **Your booking has been cancelled.**\nDecided to choose another bike? Visit the catalog.",
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: "🛵 Открыть каталог / Open Catalog", web_app: { url: "https://scooter-danang.vercel.app" } }]],
          },
        });

        await answerCallback();
        return NextResponse.json({ ok: true });
      }

      // ── Только для админа ──────────────────────────────────────────────────
      if (chatId !== MY_ADMIN_ID) {
        await answerCallback();
        return NextResponse.json({ ok: true });
      }

      // ── manage_{id}: показать кнопки управления ───────────────────────────
      if (callbackData.startsWith('manage_')) {
        const orderId = callbackData.replace('manage_', '');
        await tgPost(botToken, 'editMessageReplyMarkup', {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [
              [{ text: "✅ Подтвердить наличие", callback_data: `confirm_${orderId}` }],
              [{ text: "❌ Нет в наличии",       callback_data: `decline_${orderId}` }],
              [{ text: "✉️ Написать клиенту",    callback_data: `ask_msg_${orderId}` }],
            ],
          },
        });
        await answerCallback();
        return NextResponse.json({ ok: true });
      }

      // ── confirm_{id} ───────────────────────────────────────────────────────
      if (callbackData.startsWith('confirm_')) {
        const id = callbackData.replace('confirm_', '');
        const { data: order } = await supabase.from('bookings').select('*').eq('id', id).single();

        if (order && order.status !== 'confirmed') {
          await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', id);

          await tgPost(botToken, 'sendMessage', {
            chat_id: Number(order.telegram_id),
            text:
              "✅ **Наличие байка подтверждено!**\nОтправьте менеджеру любое сообщение, чтобы получить информацию.\n\n---\n✅ **Bike availability confirmed!**\nSend any message to the manager to get info.",
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: "✉️ Написать менеджеру / Message manager", url: SUPPORT_LINK }]] },
          });

          await tgPost(botToken, 'editMessageText', {
            chat_id: MY_ADMIN_ID,
            message_id: messageId,
            text: oldText + "\n\n✅ **СТАТУС: ПОДТВЕРЖДЕНО**",
            parse_mode: 'Markdown',
          });
        }

        await answerCallback();
        return NextResponse.json({ ok: true });
      }

      // ── decline_{id} ───────────────────────────────────────────────────────
      if (callbackData.startsWith('decline_')) {
        const id = callbackData.replace('decline_', '');
        const { data: order } = await supabase.from('bookings').select('*').eq('id', id).single();

        if (order && order.status !== 'unavailable') {
          await supabase.from('bookings').update({ status: 'unavailable' }).eq('id', id);

          await tgPost(botToken, 'sendMessage', {
            chat_id: Number(order.telegram_id),
            text:
              "❌ **К сожалению, этот байк занят, но мы подобрали похожие варианты.**\nНапишите менеджеру для выбора.\n\n---\n❌ **Sorry, this bike is busy, but we have similar options.**\nWrite to the manager.",
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: "🤝 Написать менеджеру / Message manager", url: SUPPORT_LINK }]] },
          });

          await tgPost(botToken, 'editMessageText', {
            chat_id: MY_ADMIN_ID,
            message_id: messageId,
            text: oldText + "\n\n❌ **СТАТУС: НЕТ В НАЛИЧИИ**",
            parse_mode: 'Markdown',
          });
        }

        await answerCallback();
        return NextResponse.json({ ok: true });
      }

      // ── ask_msg_{id} ───────────────────────────────────────────────────────
      if (callbackData.startsWith('ask_msg_')) {
        const id = callbackData.replace('ask_msg_', '');
        await tgPost(botToken, 'sendMessage', {
          chat_id: MY_ADMIN_ID,
          text: `📝 Напишите сообщение для заказа №${id}:\n(Обязательно используйте ОТВЕТ/REPLY на это сообщение)`,
          reply_markup: { force_reply: true, selective: true },
        });
        await answerCallback();
        return NextResponse.json({ ok: true });
      }

      // Неизвестный callback — просто закрываем
      await answerCallback();
      return NextResponse.json({ ok: true });
    }

    // ─── 1. СООБЩЕНИЯ ─────────────────────────────────────────────────────────
    if (body.message) {
      const chatId = body.message.chat.id;
      const text = body.message.text || '';

      // ── Ответ админа на reply (переадресация клиенту) ──────────────────────
      if (chatId === MY_ADMIN_ID && body.message.reply_to_message) {
        const replyText = body.message.reply_to_message.text || "";
        const idMatch = replyText.match(/(?:№|заказа\s+)(\d+)/i);

        if (idMatch && text.trim().length > 0) {
          const orderId = idMatch[1];
          const { data: order } = await supabase
            .from('bookings')
            .select('telegram_id')
            .eq('id', orderId)
            .single();

          if (order?.telegram_id) {
            await tgPost(botToken, 'sendMessage', {
              chat_id: Number(order.telegram_id),
              text: `💬 **Сообщение от менеджера / Message from manager:**\n\n${text}`,
              parse_mode: 'Markdown',
            });
            await tgPost(botToken, 'sendMessage', {
              chat_id: MY_ADMIN_ID,
              text: `✅ Доставлено клиенту (заказ №${orderId})`,
            });
            return NextResponse.json({ ok: true });
          }
        }
      }

      // ── /admin (только для админа) ─────────────────────────────────────────
      if (text === '/admin' && chatId === MY_ADMIN_ID) {
        const { data: orders } = await supabase
          .from('bookings')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);

        if (!orders || orders.length === 0) {
          await tgPost(botToken, 'sendMessage', { chat_id: MY_ADMIN_ID, text: "Заявок пока нет." });
          return NextResponse.json({ ok: true });
        }

        for (const o of orders) {
          const icon =
            o.status === 'confirmed'   ? '✅' :
            o.status === 'cancelled'   ? '❌' :
            o.status === 'unavailable' ? '🚫' : '⏳';

          await tgPost(botToken, 'sendMessage', {
            chat_id: MY_ADMIN_ID,
            text: `${icon} **Заказ №${o.id}**\nБайк: ${o.bike_model}\nДаты: ${o.start_date} – ${o.end_date}\nСумма: ${o.total_price || '—'}\nКлиент: @${o.client_username}\nРеферал: ${o.referrer || 'Прямой заход'}`,
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [[{ text: "⚙️ Управлять", callback_data: `manage_${o.id}` }]] },
          });
        }

        return NextResponse.json({ ok: true }); // ← явный return, не проваливаемся в /start
      }

      // ── /start (для всех обычных пользователей) ────────────────────────────
      if (text.startsWith('/start')) {
        await tgPost(botToken, 'sendMessage', {
          chat_id: chatId,
          text: `✨ **Добро пожаловать в каталог байков Дананга!**\n\nНаш сервис помогает вам арендовать транспорт за несколько кликов без лишних заморочек. 🛵\n\n---\n✨ **Welcome to the Da Nang Bike Catalog!**\n\nOur service helps you rent transport in a few clicks without any hassle. 🛵\n\n🤝 **Менеджер / Support:** @dragonservicesupport`,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: "🛵 Открыть каталог / Open Catalog", web_app: { url: "https://scooter-danang.vercel.app" } }]] },
        });
        return NextResponse.json({ ok: true });
      }

      return NextResponse.json({ ok: true }); // любое другое сообщение
    }

    // ─── 2. НОВЫЙ ЗАКАЗ (из веб-приложения) ──────────────────────────────────
    const { bike_model, start_date, end_date, client_username, telegram_id, bike_id, total_price } = body;
    if (bike_model && telegram_id) {
      let finalReferrer = body.referrer;
      const { data: userData } = await supabase
        .from('users')
        .select('referrer')
        .eq('telegram_id', telegram_id)
        .single();
      if (userData?.referrer) finalReferrer = userData.referrer;

      const { data: newOrder } = await supabase
        .from('bookings')
        .insert([{ bike_id, bike_model, start_date, end_date, client_username, telegram_id, status: 'pending', total_price, referrer: finalReferrer }])
        .select()
        .single();

      await tgPost(botToken, 'sendMessage', {
        chat_id: MY_ADMIN_ID,
        text: `🔔 **НОВЫЙ ЗАКАЗ №${newOrder?.id}**\n\n**Байк:** ${bike_model}\n**Даты:** ${start_date} — ${end_date}\n**Сумма:** ${total_price || 'Не указана'}\n**Клиент:** @${client_username}\n**Реферал:** ${finalReferrer || 'Прямой заход'}`,
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: [[{ text: "⚙️ Управлять заказом", callback_data: `manage_${newOrder?.id}` }]] },
      });

      await tgPost(botToken, 'sendMessage', {
        chat_id: Number(telegram_id),
        text: `✅ **Заявка принята! / Order received!**\n\nМы уже уточняем наличие **${bike_model}**. Мы сами пришлем вам уведомление.\n\n---\n🕒 **Время обработки / Processing hours:** 10:00 — 22:00 (Local time)\n\n🤝 **Менеджер / Support:** @dragonservicesupport`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: "🤝 Связаться с менеджером / Support", url: SUPPORT_LINK }],
            [{ text: "❌ Отменить бронирование / Cancel", callback_data: `cancel_order_${bike_id}` }],
          ],
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
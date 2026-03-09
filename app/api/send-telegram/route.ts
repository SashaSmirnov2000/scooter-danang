import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    // ЖЕСТКО ПРОПИСАННЫЙ ID (без Vercel)
    const MY_ADMIN_ID = "1920798985";
    
    const SUPPORT_LINK = "https://t.me/dragonservicesupport";

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (!botToken) return NextResponse.json({ error: "No Token" }, { status: 500 });

    // --- 0. ЛОГИКА CALLBACK (Кнопки) ---
    if (body.callback_query) {
      const callbackData = body.callback_query.data;
      const callbackUserId = String(body.callback_query.from.id);
      const chatId = body.callback_query.message.chat.id;
      const messageId = body.callback_query.message.message_id;

      const answerCallback = async () => {
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: body.callback_query.id })
        });
      };

      // Проверка на админа для кнопок управления
      if (callbackData.includes('confirm_') || callbackData.includes('decline_') || callbackData.includes('manage_')) {
        if (callbackUserId !== MY_ADMIN_ID) {
          // Если нажал не админ, просто закрываем уведомление
          await answerCallback();
          return NextResponse.json({ ok: true });
        }
      }

      if (callbackData.startsWith('manage_')) {
        const orderId = callbackData.split('_')[1];
        await fetch(`https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
              inline_keyboard: [
                [{ text: "✅ В наличии", callback_data: `confirm_${orderId}` }],
                [{ text: "❌ Нет в наличии", callback_data: `decline_${orderId}` }],
                [{ text: "✉️ Сообщение", callback_data: `ask_msg_${orderId}` }]
              ]
            }
          })
        });
        await answerCallback();
        return NextResponse.json({ ok: true });
      }

      // ... (логика confirm/decline остается такой же, главное что выше прошла проверка на MY_ADMIN_ID)
      if (callbackData.startsWith('confirm_')) {
        const id = callbackData.split('_')[1];
        const { data: order } = await supabase.from('bookings').select('*').eq('id', id).single();
        if (order) {
          await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', id);
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { 
            method: 'POST', headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({
              chat_id: Number(order.telegram_id),
              text: `✅ **Наличие подтверждено!** Напишите менеджеру.`,
              parse_mode: "Markdown",
              reply_markup: { inline_keyboard: [[{ text: "✉️ Менеджер", url: SUPPORT_LINK }]] }
            })
          });
          await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, { 
            method: 'POST', headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ chat_id: chatId, message_id: messageId, text: "✅ **ПОДТВЕРЖДЕНО**" })
          });
        }
        await answerCallback();
        return NextResponse.json({ ok: true });
      }
    }

    // --- 1. ЛОГИКА СООБЩЕНИЙ ---
    if (body.message) {
      const chatID = String(body.message.chat.id);
      const text = body.message.text || '';

      // ДИАГНОСТИКА: Напиши /me боту, чтобы узнать свой ID
      if (text === '/me') {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatID, text: `Ваш ID: ${chatID}\nAdmin ID в коде: ${MY_ADMIN_ID}` })
        });
        return NextResponse.json({ ok: true });
      }

      // ЕСЛИ ЭТО АДМИН
      if (chatID === MY_ADMIN_ID) {
        // Команда /admin
        if (text === '/admin') {
          const { data: orders } = await supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(5);
          if (!orders || orders.length === 0) {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatID, text: "Заявок нет." })
            });
          } else {
            for (const o of orders) {
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatID,
                  text: `📦 **Заказ №${o.id}**\n${o.bike_model}`,
                  reply_markup: { inline_keyboard: [[{ text: "Управлять", callback_data: `manage_${o.id}` }]] }
                })
              });
            }
          }
          return NextResponse.json({ ok: true });
        }

        // Ответ на сообщение (Reply)
        if (body.message.reply_to_message) {
          const replyText = body.message.reply_to_message.text || "";
          const idMatch = replyText.match(/№(\d+)/);
          if (idMatch) {
            const orderId = idMatch[1];
            const { data: order } = await supabase.from('bookings').select('telegram_id').eq('id', orderId).single();
            if (order) {
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { 
                method: 'POST', headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ chat_id: Number(order.telegram_id), text: `💬 Менеджер: ${text}` })
              });
              return NextResponse.json({ ok: true });
            }
          }
        }
      }

      // ДЛЯ КЛИЕНТОВ
      if (text.startsWith('/start')) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { 
          method: 'POST', headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({
            chat_id: chatID, 
            text: `✨ Привет!`, 
            reply_markup: { inline_keyboard: [[{ text: "🛵 Каталог", web_app: { url: "https://scooter-danang.vercel.app" } }]] }
          })
        });
        return NextResponse.json({ ok: true });
      }
    }

    // --- 2. ЛОГИКА НОВОГО ЗАКАЗА ---
    if (body.bike_model && body.telegram_id) {
      const { data: newOrder } = await supabase.from('bookings').insert([{ ...body, status: 'pending' }]).select().single();
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: Number(MY_ADMIN_ID), 
          text: `🔔 **НОВЫЙ ЗАКАЗ №${newOrder?.id}**\nБайк: ${body.bike_model}`,
          reply_markup: { inline_keyboard: [[{ text: "⚙️ Управлять", callback_data: `manage_${newOrder?.id}` }]] }
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: true });
  }
}
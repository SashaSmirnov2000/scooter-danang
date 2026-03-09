import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    
    // Жестко прописанный ID админа
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
      const callbackUserId = String(body.callback_query.from.id).trim();
      const chatId = body.callback_query.message.chat.id;
      const messageId = body.callback_query.message.message_id;
      const oldText = body.callback_query.message.text || "";

      const answerCallback = async () => {
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: body.callback_query.id })
        });
      };

      // Проверка управления (только для админа)
      if (callbackData.startsWith('manage_') || callbackData.startsWith('confirm_') || callbackData.startsWith('decline_') || callbackData.startsWith('ask_msg_')) {
        if (callbackUserId === MY_ADMIN_ID) {
          if (callbackData.startsWith('manage_')) {
            const orderId = callbackData.split('_')[1];
            await fetch(`https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`, { 
              method: 'POST', headers: { 'Content-Type': 'application/json' }, 
              body: JSON.stringify({
                chat_id: chatId, message_id: messageId,
                reply_markup: {
                  inline_keyboard: [
                    [{ text: "✅ Подтвердить наличие", callback_data: `confirm_${orderId}` }],
                    [{ text: "❌ Нет в наличии", callback_data: `decline_${orderId}` }],
                    [{ text: "✉️ Написать клиенту", callback_data: `ask_msg_${orderId}` }]
                  ]
                }
              })
            });
          }

          if (callbackData.startsWith('confirm_')) {
            const id = callbackData.split('_')[1];
            const { data: order } = await supabase.from('bookings').select('*').eq('id', id).single();
            if (order) {
              await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', id);
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { 
                method: 'POST', headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({
                  chat_id: Number(order.telegram_id),
                  text: `✅ **Наличие байка подтверждено!**\nОтправьте любое сообщение менеджеру.\n\n---\n✅ **Bike availability confirmed!**`,
                  parse_mode: "Markdown",
                  reply_markup: { inline_keyboard: [[{ text: "✉️ Написать менеджеру", url: SUPPORT_LINK }]] }
                })
              });
              await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, { 
                method: 'POST', headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({
                  chat_id: chatId, message_id: messageId,
                  text: oldText + "\n\n✅ **СТАТУС: ПОДТВЕРЖДЕНО**",
                  parse_mode: "Markdown"
                })
              });
            }
          }

          if (callbackData.startsWith('decline_')) {
            const id = callbackData.split('_')[1];
            const { data: order } = await supabase.from('bookings').select('*').eq('id', id).single();
            if (order) {
              await supabase.from('bookings').update({ status: 'unavailable' }).eq('id', id);
              await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, { 
                method: 'POST', headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({
                  chat_id: chatId, message_id: messageId,
                  text: oldText + "\n\n❌ **СТАТУС: НЕТ В НАЛИЧИИ**",
                  parse_mode: "Markdown"
                })
              });
            }
          }

          if (callbackData.startsWith('ask_msg_')) {
            const id = callbackData.split('_')[1];
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { 
              method: 'POST', headers: { 'Content-Type': 'application/json' }, 
              body: JSON.stringify({
                chat_id: chatId,
                text: `📝 Напишите сообщение для заказа №${id}:\n(Используйте ОТВЕТ на это сообщение)`,
                reply_markup: { force_reply: true, selective: true }
              })
            });
          }
          await answerCallback();
          return NextResponse.json({ ok: true });
        }
      }
    }

    // --- 1. ЛОГИКА СООБЩЕНИЙ ---
    if (body.message) {
      const chatID = String(body.message.chat.id).trim();
      const text = body.message.text || '';

      // ПРОВЕРКА АДМИНА
      if (chatID === MY_ADMIN_ID) {
        // Команда /admin
        if (text === '/admin') {
          const { data: orders } = await supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(5);
          if (!orders || orders.length === 0) {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatID, text: "Заявок пока нет." })
            });
          } else {
            for (const o of orders) {
              const statusIcon = o.status === 'confirmed' ? '✅' : o.status === 'cancelled' ? '❌' : o.status === 'unavailable' ? '🚫' : '⏳';
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chatID,
                  text: `${statusIcon} **Заказ №${o.id}**\nБайк: ${o.bike_model}\nКлиент: @${o.client_username}`,
                  parse_mode: "Markdown",
                  reply_markup: { inline_keyboard: [[{ text: "⚙️ Управлять", callback_data: `manage_${o.id}` }]] }
                })
              });
            }
          }
          return NextResponse.json({ ok: true });
        }

        // Ответ клиенту через Reply
        if (body.message.reply_to_message) {
          const replySourceText = body.message.reply_to_message.text || "";
          const idMatch = replySourceText.match(/(?:№|заказа\s+)(\d+)/i);
          if (idMatch && text.trim().length > 0) {
            const orderId = idMatch[1];
            const { data: order } = await supabase.from('bookings').select('telegram_id').eq('id', orderId).single();
            if (order?.telegram_id) {
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { 
                method: 'POST', headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({
                  chat_id: Number(order.telegram_id),
                  text: `💬 **Сообщение от менеджера:**\n\n${text}`,
                  parse_mode: "Markdown"
                })
              });
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { 
                method: 'POST', headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ chat_id: chatID, text: `✅ Доставлено клиенту (№${orderId})` })
              });
              return NextResponse.json({ ok: true });
            }
          }
        }
      }

      // ЛОГИКА ДЛЯ КЛИЕНТА
      if (text.startsWith('/start')) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { 
          method: 'POST', headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({
            chat_id: chatID, 
            text: `✨ **Добро пожаловать!**`, 
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: [[{ text: "🛵 Открыть каталог", web_app: { url: "https://scooter-danang.vercel.app" } }]] }
          })
        });
        return NextResponse.json({ ok: true });
      }
    }

    // --- 2. НОВЫЙ ЗАКАЗ (Уведомление админу) ---
    if (body.bike_model && body.telegram_id) {
      const { data: newOrder } = await supabase.from('bookings').insert([{ ...body, status: 'pending' }]).select().single();
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: Number(MY_ADMIN_ID), 
          text: `🔔 **НОВЫЙ ЗАКАЗ №${newOrder?.id}**\nБайк: ${body.bike_model}`, 
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: "⚙️ Управлять заказом", callback_data: `manage_${newOrder?.id}` }]] }
        }),
      });
    }
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: true }); 
  }
}
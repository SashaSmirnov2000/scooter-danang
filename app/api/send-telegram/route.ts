import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const MY_ADMIN_ID = 1920798985;
const SUPPORT_CONTACT = "@dragonservicesupport";
const GOOGLE_MAPS_LINK = "https://maps.google.com/your-location"; // Замените на реальную

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const botToken = process.env.TELEGRAM_BOT_TOKEN!;
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // --- 0. CALLBACK LOGIC ---
    if (body.callback_query) {
      const { id: callbackId, data: callbackData, message } = body.callback_query;
      const chatId = message.chat.id;
      const messageId = message.message_id;
      const oldText = message.text || "";

      const answer = (text?: string) => fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackId, text })
      });

      if (callbackData === "check_sub") {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            chat_id: chatId, text: "🔄 Нажмите /start еще раз / Press /start again"
        } as any);
        return answer();
      }

      if (callbackData.startsWith('cancel_order_')) {
        const bikeId = callbackData.replace('cancel_order_', '');
        await supabase.from('bookings').update({ status: 'cancelled' }).eq('telegram_id', chatId).eq('bike_id', bikeId).order('created_at', { ascending: false }).limit(1);
        
        await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, { 
          method: 'POST', headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: "❌ **Бронирование отменено / Booking cancelled**\n\nРешили выбрать другой байк? / Decide to pick another bike?",
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: [[{ text: "🛵 Open Catalog / Открыть каталог", web_app: { url: "https://scooter-danang.vercel.app" } }]] }
          })
        });
        return answer();
      }

      if (callbackData.startsWith('confirm_')) {
        const id = callbackData.split('_')[1];
        const { data: order } = await supabase.from('bookings').select('*').eq('id', id).single();
        if (order && order.status !== 'confirmed') {
          await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', id);
          const confirmMsg = `🎉 **Бронирование подтверждено! / Booking confirmed!**\n\n🛵: ${order.bike_model}\n📍: ${GOOGLE_MAPS_LINK}`;
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { 
            method: 'POST', headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ chat_id: Number(order.telegram_id), text: confirmMsg, parse_mode: "Markdown" })
          });
          await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, { 
            method: 'POST', headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ chat_id: MY_ADMIN_ID, message_id: messageId, text: oldText + "\n\n✅ **CONFIRMED**", parse_mode: "Markdown" })
          });
        }
        return answer();
      }

      if (callbackData.startsWith('decline_')) {
        const id = callbackData.split('_')[1];
        const { data: order } = await supabase.from('bookings').select('*').eq('id', id).single();
        if (order && order.status !== 'unavailable') {
          await supabase.from('bookings').update({ status: 'unavailable' }).eq('id', id);
          const declineMsg = `😔 **Бронирование не подтверждено / Booking not confirmed**\n\nК сожалению, этот байк уже занят. Мы подберем другие варианты!\nUnfortunately, this bike is busy. We will find other options!`;
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { 
            method: 'POST', headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({
              chat_id: Number(order.telegram_id), text: declineMsg, parse_mode: "Markdown",
              reply_markup: { inline_keyboard: [[{ text: "🤝 Support", url: `https://t.me/${SUPPORT_CONTACT.replace('@','')}` }]] }
            })
          });
          await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, { 
            method: 'POST', headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ chat_id: MY_ADMIN_ID, message_id: messageId, text: oldText + "\n\n❌ **OUT OF STOCK**", parse_mode: "Markdown" })
          });
        }
        return answer();
      }

      if (callbackData.startsWith('manage_')) {
        const orderId = callbackData.split('_')[1];
        await fetch(`https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`, { 
          method: 'POST', headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            reply_markup: {
              inline_keyboard: [
                [{ text: "✅ Подтвердить", callback_data: `confirm_${orderId}` }],
                [{ text: "❌ Нет мест", callback_data: `decline_${orderId}` }],
                [{ text: "✉️ Написать клиенту", callback_data: `ask_msg_${orderId}` }]
              ]
            }
          })
        });
        return answer();
      }

      if (callbackData.startsWith('ask_msg_')) {
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { 
          method: 'POST', headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({
            chat_id: MY_ADMIN_ID,
            text: `📝 Напишите сообщение для заказа №${callbackData.split('_')[2]}:\n(Используйте REPLY)`,
            reply_markup: { force_reply: true, selective: true }
          })
        });
        return answer();
      }
    }

    // --- 1. MESSAGE LOGIC ---
    if (body.message) {
      const chatId = body.message.chat.id;
      const text = body.message.text || '';

      if (chatId === MY_ADMIN_ID && body.message.reply_to_message) {
        const idMatch = body.message.reply_to_message.text.match(/(?:№|заказа\s+)(\d+)/i);
        if (idMatch) {
          const { data: order } = await supabase.from('bookings').select('telegram_id').eq('id', idMatch[1]).single();
          if (order?.telegram_id) {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { 
              method: 'POST', headers: { 'Content-Type': 'application/json' }, 
              body: JSON.stringify({ chat_id: Number(order.telegram_id), text: `💬 **Manager:**\n\n${text}`, parse_mode: "Markdown" })
            });
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { 
              method: 'POST', headers: { 'Content-Type': 'application/json' }, 
              body: JSON.stringify({ chat_id: MY_ADMIN_ID, text: `✅ OK (№${idMatch[1]})` })
            });
            return NextResponse.json({ ok: true });
          }
        }
      }

      const welcomeMessage = `✨ **Welcome to the Da Nang Bike Catalog!**\n\nНаш сервис помогает арендовать транспорт за несколько кликов.\nOur service helps you rent a bike in just a few clicks.\n\n---\n🤝 **Support:** ${SUPPORT_CONTACT}`;
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({
          chat_id: chatId, text: welcomeMessage, parse_mode: "Markdown",
          reply_markup: { inline_keyboard: [[{ text: "🛵 Open Catalog / Открыть каталог", web_app: { url: "https://scooter-danang.vercel.app" } }]] }
        })
      });
    }

    // --- 2. NEW ORDER LOGIC ---
    const { bike_model, start_date, end_date, client_username, telegram_id, bike_id, total_price } = body;
    if (bike_model && telegram_id) {
      const { data: newOrder } = await supabase.from('bookings').insert([{
        bike_id, bike_model, start_date, end_date, client_username, telegram_id, status: 'pending', total_price
      }]).select().single();

      // Уведомление админу (с суммой)
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: MY_ADMIN_ID, 
          text: `🔔 **НОВЫЙ ЗАКАЗ №${newOrder?.id}**\n\n**Байк:** ${bike_model}\n**Даты:** ${start_date} — ${end_date}\n**Сумма:** ${total_price}\n**Клиент:** @${client_username}`, 
          reply_markup: { inline_keyboard: [[{ text: "⚙️ Manage", callback_data: `manage_${newOrder?.id}` }]] }
        }),
      });

      // Уведомление клиенту
      const bookingMessage = 
        `✅ **Заявка принята! / Order received!**\n\n` +
        `Мы уже уточняем наличие **${bike_model}**. Ожидайте уведомления.\n` +
        `We are checking the availability of **${bike_model}**. Wait for notification.\n\n` +
        `💰 **Total:** ${total_price}\n` +
        `🕒 **Hours:** 10:00 — 22:00\n` +
        `🤝 **Support:** ${SUPPORT_CONTACT}`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: Number(telegram_id), text: bookingMessage, parse_mode: 'Markdown',
          reply_markup: { 
            inline_keyboard: [
              [{ text: "🤝 Support", url: `https://t.me/${SUPPORT_CONTACT.replace('@','')}` }], 
              [{ text: "❌ Cancel", callback_data: `cancel_order_${bike_id}` }]
            ] 
          }
        }),
      });
    }
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ ok: true }); 
  }
}
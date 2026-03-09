import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const MY_ADMIN_ID = 1920798985;
    const GOOGLE_MAPS_LINK = "https://maps.google.com/?q=Your+Location"; 
    const SUPPORT_LINK = "https://t.me/dragonservicesupport";

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (!botToken) return NextResponse.json({ error: "No Token" }, { status: 500 });

    // --- 0. ЛОГИКА CALLBACK (Кнопки) ---
    if (body.callback_query) {
      const callbackId = body.callback_query.id;
      const callbackData = body.callback_query.data;
      const chatId = body.callback_query.message.chat.id;
      const messageId = body.callback_query.message.message_id;
      const oldText = body.callback_query.message.text || "";

      const answerCallback = async () => {
        await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ callback_query_id: callbackId })
        });
      };

      if (callbackData.startsWith('cancel_order_')) {
        const bikeId = callbackData.replace('cancel_order_', '');
        await supabase.from('bookings').update({ status: 'cancelled' }).eq('telegram_id', chatId).eq('bike_id', bikeId).order('created_at', { ascending: false }).limit(1);
        
        await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({
            chat_id: chatId, message_id: messageId,
            text: "❌ **Ваше бронирование отменено.**\nРешили выбрать другой байк? Заходите в каталог.\n\n---\n❌ **Your booking has been cancelled.**\nDecided to choose another bike? Visit the catalog.",
            parse_mode: "Markdown",
            reply_markup: { inline_keyboard: [[{ text: "🛵 Открыть каталог / Open Catalog", web_app: { url: "https://scooter-danang.vercel.app" } }]] }
          })
        });
        await answerCallback();
        return NextResponse.json({ ok: true });
      }

      if (callbackData.startsWith('manage_')) {
        const orderId = callbackData.split('_')[1];
        await fetch(`https://api.telegram.org/bot${botToken}/editMessageReplyMarkup`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
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
        await answerCallback();
      }

      if (callbackData.startsWith('confirm_')) {
        const id = callbackData.split('_')[1];
        const { data: order } = await supabase.from('bookings').select('*').eq('id', id).single();
        if (order && order.status !== 'confirmed') {
          await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', id);
          
          const confirmText = `✅ **Наличие байка подтверждено!**\nОтправьте пожалуйста любое сообщение менеджеру, он отправит детали.\n\n---\n✅ **Bike availability confirmed!**\nPlease send any message to the manager, they will send the details.`;
          
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({
              chat_id: Number(order.telegram_id),
              text: confirmText,
              parse_mode: "Markdown",
              reply_markup: { inline_keyboard: [[{ text: "✉️ Написать менеджеру / Message manager", url: SUPPORT_LINK }]] }
            })
          });
          await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({
              chat_id: MY_ADMIN_ID,
              message_id: messageId,
              text: oldText + "\n\n✅ **СТАТУС: ПОДТВЕРЖДЕНО**",
              parse_mode: "Markdown"
            })
          });
        }
        await answerCallback();
      }

      if (callbackData.startsWith('decline_')) {
        const id = callbackData.split('_')[1];
        const { data: order } = await supabase.from('bookings').select('*').eq('id', id).single();
        if (order && order.status !== 'unavailable') {
          await supabase.from('bookings').update({ status: 'unavailable' }).eq('id', id);
          
          const declineText = `❌ **К сожалению, владелец не подтвердил ваш цвет либо модель байка.**\nМы уже подобрали для вас схожие варианты, напишите менеджеру любое сообщение, он отправит варианты.\n\n---\n❌ **Unfortunately, the owner did not confirm your color or bike model.**\nWe have already selected similar options for you, send any message to the manager and they will send the options.`;
          
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({
              chat_id: Number(order.telegram_id),
              text: declineText,
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [[{ text: "🤝 Написать менеджеру / Message manager", url: SUPPORT_LINK }]]
              }
            })
          });
          await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({
              chat_id: MY_ADMIN_ID,
              message_id: messageId,
              text: oldText + "\n\n❌ **СТАТУС: НЕТ В НАЛИЧИИ**",
              parse_mode: "Markdown"
            })
          });
        }
        await answerCallback();
      }

      if (callbackData.startsWith('ask_msg_')) {
        const id = callbackData.split('_')[1];
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({
            chat_id: MY_ADMIN_ID,
            text: `📝 Напишите сообщение для заказа №${id}:\n(Обязательно используйте ОТВЕТ/REPLY на это сообщение)`,
            reply_markup: { force_reply: true, selective: true }
          })
        });
        await answerCallback();
      }
      return NextResponse.json({ ok: true });
    }

    // --- 1. ЛОГИКА СООБЩЕНИЙ ---
    if (body.message) {
      const chatId = body.message.chat.id;
      const text = body.message.text || '';

      if (chatId === MY_ADMIN_ID && body.message.reply_to_message) {
        const replySourceText = body.message.reply_to_message.text || "";
        const idMatch = replySourceText.match(/(?:№|заказа\s+)(\d+)/i);
        
        if (idMatch && text.trim().length > 0) {
          const orderId = idMatch[1];
          const { data: order } = await supabase.from('bookings').select('telegram_id').eq('id', orderId).single();
          
          if (order?.telegram_id) {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { 
              method: 'POST', 
              headers: { 'Content-Type': 'application/json' }, 
              body: JSON.stringify({
                chat_id: Number(order.telegram_id),
                text: `💬 **Сообщение от менеджера / Message from manager:**\n\n${text}`,
                parse_mode: "Markdown"
              })
            });
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { 
              method: 'POST', 
              headers: { 'Content-Type': 'application/json' }, 
              body: JSON.stringify({ chat_id: MY_ADMIN_ID, text: `✅ Доставлено клиенту (заказ №${orderId})` })
            });
            return NextResponse.json({ ok: true });
          }
        }
      }

      if (text === '/admin' && chatId === MY_ADMIN_ID) {
        const { data: orders } = await supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(5);
        if (!orders || orders.length === 0) {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: MY_ADMIN_ID, text: "Заявок пока нет." })
            });
        }
        for (const o of orders || []) {
          const statusIcon = o.status === 'confirmed' ? '✅' : o.status === 'cancelled' ? '❌' : o.status === 'unavailable' ? '🚫' : '⏳';
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: MY_ADMIN_ID,
              text: `${statusIcon} **Заказ №${o.id}**\nБайк: ${o.bike_model}\nДаты: ${o.start_date} - ${o.end_date}\nСумма: ${o.total_price || '—'}\nКлиент: @${o.client_username}\nРеферал: ${o.referrer || 'Прямой заход'}`,
              parse_mode: "Markdown",
              reply_markup: { inline_keyboard: [[{ text: "⚙️ Управлять", callback_data: `manage_${o.id}` }]] }
            })
          });
        }
        return NextResponse.json({ ok: true });
      }

      if (text.startsWith('/start')) {
          const welcomeMessage = `✨ **Добро пожаловать в каталог байков Дананга!**\n\nНаш сервис помогает вам арендовать транспорт за несколько кликов без лишних заморочек. 🛵\n\n---\n✨ **Welcome to the Da Nang Bike Catalog!**\n\nOur service helps you rent transport in a few clicks without any hassle. 🛵\n\n🤝 **Менеджер / Support:** @dragonservicesupport`;
          
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({
              chat_id: chatId, 
              text: welcomeMessage, 
              parse_mode: "Markdown",
              reply_markup: { inline_keyboard: [[{ text: "🛵 Открыть каталог / Open Catalog", web_app: { url: "https://scooter-danang.vercel.app" } }]] }
            })
          });
          return NextResponse.json({ ok: true });
      }
    }

    // --- 2. ЛОГИКА НОВОГО ЗАКАЗА ---
    const { bike_model, start_date, end_date, client_username, telegram_id, bike_id, total_price, referrer } = body;
    if (bike_model && telegram_id) {
      const { data: newOrder } = await supabase.from('bookings').insert([{
        bike_id, bike_model, start_date, end_date, client_username, telegram_id, status: 'pending', total_price, referrer
      }]).select().single();

      // Уведомление админу
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: MY_ADMIN_ID, 
          text: `🔔 **НОВЫЙ ЗАКАЗ №${newOrder?.id}**\n\n**Байк:** ${bike_model}\n**Даты:** ${start_date} — ${end_date}\n**Сумма:** ${total_price || 'Не указана'}\n**Клиент:** @${client_username}\n**Реферал:** ${referrer || 'Прямой заход'}`, 
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [[{ text: "⚙️ Управлять заказом", callback_data: `manage_${newOrder?.id}` }]] }
        }),
      });

      // Уведомление клиенту (RU/EN)
      const bookingMessage = `✅ **Заявка принята! / Order received!**\n\nМы уже уточняем наличие **${bike_model}**. Мы сами пришлем вам уведомление.\n\n---\n🕒 **Время обработки / Processing hours:** 10:00 — 22:00 (Local time)\n\n🤝 **Менеджер / Support:** @dragonservicesupport`;
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: Number(telegram_id), 
          text: bookingMessage, 
          parse_mode: 'Markdown',
          reply_markup: { 
            inline_keyboard: [
              [{ text: "🤝 Связаться с менеджером / Support", url: SUPPORT_LINK }], 
              [{ text: "❌ Отменить бронирование / Cancel", callback_data: `cancel_order_${bike_id}` }]
            ] 
          }
        }),
      });
    }
    
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ ok: true }); 
  }
}
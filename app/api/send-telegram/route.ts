import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const MY_ADMIN_ID = 1920798985;
    const GOOGLE_MAPS_LINK = "https://maps.google.com/?q=Your+Location"; 

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
            text: "❌ Ваше бронирование отменено.\n\nРешили выбрать другой байк? Заходите в каталог",
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
                [{ text: "❌ Нет мест", callback_data: `decline_${orderId}` }],
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
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({
              chat_id: Number(order.telegram_id),
              text: `🎉 **Ваше бронирование подтверждено!**\n\nБайк: ${order.bike_model}\n📍 Мы на карте: ${GOOGLE_MAPS_LINK}`,
              parse_mode: "Markdown"
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
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({
              chat_id: Number(order.telegram_id),
              text: `😔 **Ваше бронирование не подтверждено.**\n\nК сожалению, этот байк уже занят. Мы подберем для вас похожие варианты и скоро пришлем!`,
              parse_mode: "Markdown",
              reply_markup: {
                inline_keyboard: [[{ text: "🤝 Написать менеджеру", url: "https://t.me/dragonbikesupport" }]]
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

      // ОТПРАВКА СООБЩЕНИЯ КЛИЕНТУ ОТ АДМИНА
      if (chatId === MY_ADMIN_ID && body.message.reply_to_message) {
        const replySourceText = body.message.reply_to_message.text || "";
        const idMatch = replySourceText.match(/(?:№|заказа\s+)(\d+)/i);
        
        if (idMatch && text.trim().length > 0) {
          const orderId = idMatch[1];
          const { data: order } = await supabase.from('bookings').select('telegram_id').eq('id', orderId).single();
          
          if (order?.telegram_id) {
            const sendRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { 
              method: 'POST', 
              headers: { 'Content-Type': 'application/json' }, 
              body: JSON.stringify({
                chat_id: Number(order.telegram_id),
                text: `💬 **Сообщение от менеджера:**\n\n${text}`,
                parse_mode: "Markdown"
              })
            });

            if (sendRes.ok) {
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ chat_id: MY_ADMIN_ID, text: `✅ Доставлено клиенту (заказ №${orderId})` })
              });
              return NextResponse.json({ ok: true });
            }
          }
        }
      }

      // АДМИН ПАНЕЛЬ
      if (text === '/admin' && chatId === MY_ADMIN_ID) {
        const { data: orders } = await supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(5);
        for (const o of orders || []) {
          const statusIcon = o.status === 'confirmed' ? '✅' : o.status === 'cancelled' ? '❌' : '⏳';
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: MY_ADMIN_ID,
              text: `${statusIcon} **Заказ №${o.id}**\nБайк: ${o.bike_model}\nДаты: ${o.start_date} - ${o.end_date}\nКлиент: @${o.client_username}`,
              parse_mode: "Markdown",
              reply_markup: { inline_keyboard: [[{ text: "⚙️ Управлять", callback_data: `manage_${o.id}` }]] }
            })
          });
        }
        return NextResponse.json({ ok: true });
      }

      // ПРИВЕТСТВИЕ НА ЛЮБОЙ ТЕКСТ / СИМВОЛ (если это не админ-команды выше)
      const username = body.message.from?.username || 'unknown';
      const { data: existingUser } = await supabase.from('users').select('id').eq('telegram_id', chatId).maybeSingle();
      
      if (!existingUser) {
        const startParam = text.startsWith('/start') ? text.split(' ')[1] : null;
        await supabase.from('users').insert([{ telegram_id: chatId, username: username, referrer: startParam || 'direct' }]);
      }

      const welcomeMessage = `✨ **Добро пожаловать в каталог байков Дананга!**\n\nНаш сервис помогает вам полностью сфокусироваться на путешествии и арендовать транспорт за несколько кликов без лишних заморочек. 🛵\n\n---\n✨ **Welcome to the Da Nang Bike Catalog!**\n\n🤝 **Менеджер / Support:** @dragonbikesupport`;
      
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

    // --- 2. ЛОГИКА НОВОГО ЗАКАЗА ---
    const { bike_model, start_date, end_date, client_username, telegram_id, bike_id } = body;
    if (bike_model && telegram_id) {
      const { data: newOrder } = await supabase.from('bookings').insert([{
        bike_id, bike_model, start_date, end_date, client_username, telegram_id, status: 'pending'
      }]).select().single();

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: MY_ADMIN_ID, 
          text: `🔔 **НОВЫЙ ЗАКАЗ №${newOrder?.id}**\n\n**Байк:** ${bike_model}\n**Даты:** ${start_date} — ${end_date}\n**Клиент:** @${client_username}`, 
          reply_markup: { inline_keyboard: [[{ text: "⚙️ Управлять заказом", callback_data: `manage_${newOrder?.id}` }]] }
        }),
      });

      const bookingMessage = `✅ **Заявка принята! / Order received!**\n\nМы уже уточняем наличие **${bike_model}**. Вы можете расслабиться и заниматься своими делами, мы сами пришлем вам уведомление.\n\n---\n🕒 **Время обработки:** 10:00 — 22:00 (Local time)\n\n🤝 **Менеджер / Support:** @dragonbikesupport`;
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chat_id: Number(telegram_id), 
          text: bookingMessage, 
          parse_mode: 'Markdown',
          reply_markup: { 
            inline_keyboard: [
              [{ text: "🤝 Связаться с менеджером", url: "https://t.me/dragonbikesupport" }], 
              [{ text: "❌ Отменить бронирование", callback_data: `cancel_order_${bike_id}` }]
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
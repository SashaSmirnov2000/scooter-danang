"use client";
import { useState, useEffect } from 'react';
import { useParams } from "next/navigation";
import { supabase } from "../../supabase"; 
import Link from "next/link";

export default function BikePage() {
  const params = useParams();
  const [lang, setLang] = useState<'ru' | 'en'>('ru'); // Значение по умолчанию
  const [bike, setBike] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState('');
  const [ref, setRef] = useState<string>('');

  // Состояния для бронирования
  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    // 1. Сначала проверяем язык
    const savedLang = localStorage.getItem('userLang') as 'ru' | 'en';
    if (savedLang && (savedLang === 'ru' || savedLang === 'en')) {
      setLang(savedLang);
    }

    // 2. Проверяем реферала
    const savedRef = localStorage.getItem('referrer');
    if (savedRef) setRef(savedRef);

    // 3. Загружаем данные байка
    async function loadBikeData() {
      const { data, error } = await supabase
        .from('scooters')
        .select('*')
        .eq('id', params.id)
        .single();

      if (!error && data) {
        setBike(data);
        setActivePhoto(data.image);
      }
      setLoading(false);
    }
    if (params.id) loadBikeData();
  }, [params.id]);

  // Функция отправки в Telegram
  const sendTelegramMessage = async (booking: any) => {
    const token = "ТВОЙ_ТОКЕН_БОТА"; 
    const chatId = "ТВОЙ_CHAT_ID";   
    const message = `🚀 *НОВАЯ ЗАЯВКА*\n\n🚲 Байк: ${booking.bike_model}\n📅 С: ${booking.start_date}\n📅 По: ${booking.end_date}\n👤 Клиент: @${booking.client_username}\n🔗 Реферал: ${ref || 'прямой заказ'}`;

    try {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "Markdown" })
      });
    } catch (e) {
      console.error("TG Error", e);
    }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const tg = (window as any).Telegram?.WebApp;
    const username = tg?.initDataUnsafe?.user?.username || 'web_user';

    const bookingData = {
      bike_id: bike.id,
      bike_model: bike.model,
      start_date: startDate,
      end_date: endDate,
      client_username: username,
      referrer: ref
    };

    const { error } = await supabase.from('bookings').insert([bookingData]);

    if (!error) {
      await sendTelegramMessage(bookingData);
      setIsSubmitted(true);
    } else {
      alert("Error: " + error.message);
    }
    setIsSubmitting(false);
  };

  const t = {
    ru: { 
      back: "← Назад", engine: "Объем", year: "Год", day: "В сутки", month: "В месяц", 
      btn: "Забронировать", included: "Включено:",
      modalSub: "Укажите даты аренды", submitBtn: "Отправить запрос",
      successTitle: "Заявка принята!", successText: "Мы свяжемся с вами в ближайшее время.",
      close: "Закрыть", features: ["2 шлема", "Поддержка 24/7", "Чистый байк"],
      labelStart: "Дата начала", labelEnd: "Дата окончания"
    },
    en: { 
      back: "← Back", engine: "Engine", year: "Year", day: "Per day", month: "Per month", 
      btn: "Book Now", included: "Included:",
      modalSub: "Select rental dates", submitBtn: "Send Request",
      successTitle: "Success!", successText: "We will contact you shortly.",
      close: "Close", features: ["2 Helmets", "24/7 Support", "Clean condition"],
      labelStart: "Start Date", labelEnd: "End Date"
    }
  };

  if (loading) return <div className="min-h-screen bg-[#05070a] flex items-center justify-center text-white italic">Loading...</div>;
  if (!bike) return <div className="p-10 text-white text-center bg-[#05070a] min-h-screen">Bike not found</div>;

  const gallery = [bike.image];
  if (bike.images_gallery) {
    const extra = bike.images_gallery.split(',').map((s: string) => s.trim());
    gallery.push(...extra);
  }

  return (
    <main className="min-h-screen bg-[#05070a] text-white font-sans pb-20">
      <nav className="fixed top-0 w-full z-[100] bg-[#05070a]/80 backdrop-blur-xl border-b border-white/5 h-16 flex items-center px-6">
        <Link href="/" className="text-gray-500 uppercase text-[10px] font-black tracking-widest">{t[lang].back}</Link>
      </nav>

      <div className="max-w-6xl mx-auto px-6 pt-24 text-left">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div className="space-y-6">
            <div className="aspect-[4/3] rounded-[2.5rem] overflow-hidden bg-[#11141b] border border-white/5">
              <img src={activePhoto} className="w-full h-full object-contain p-6" alt={bike.model} />
            </div>
            {gallery.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                {gallery.map((img, idx) => (
                  <button key={idx} onClick={() => setActivePhoto(img)} className={`w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border-2 transition-all ${activePhoto === img ? 'border-green-500' : 'border-transparent opacity-40'}`}>
                    <img src={img} className="w-full h-full object-cover" alt="preview" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <h1 className="text-4xl md:text-6xl font-black uppercase italic mb-4 leading-tight tracking-tighter">{bike.model}</h1>
            <div className="flex gap-3 mb-8 text-[10px] font-black uppercase tracking-widest text-green-500">
              <span className="bg-green-500/10 px-4 py-2 rounded-xl">{bike.engine}CC</span>
              <span className="bg-white/5 px-4 py-2 rounded-xl text-white">{bike.year}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="bg-[#11141b] p-6 rounded-[2rem] border border-white/5">
                <p className="text-[9px] text-gray-500 uppercase font-black mb-1">{t[lang].day}</p>
                <p className="text-2xl font-bold italic tracking-tighter">{bike.price_day}</p>
              </div>
              <div className="bg-[#11141b] p-6 rounded-[2rem] border border-green-500/20">
                <p className="text-[9px] text-green-500 uppercase font-black mb-1">{t[lang].month}</p>
                <p className="text-2xl font-bold text-green-400 italic tracking-tighter">{bike.price_month}</p>
              </div>
            </div>

            <button onClick={() => {setShowModal(true); setIsSubmitted(false);}} className="w-full bg-green-600 py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl text-white active:scale-95 transition-transform">
              {t[lang].btn}
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md bg-[#11141b] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            {!isSubmitted ? (
              <form onSubmit={handleBooking} className="text-left">
                <h2 className="text-2xl font-black mb-1 uppercase italic text-white tracking-tighter">{bike.model}</h2>
                <p className="text-gray-500 text-[9px] uppercase font-black tracking-widest mb-8">{t[lang].modalSub}</p>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase font-black ml-4 block mb-2 tracking-widest">{t[lang].labelStart}</label>
                    <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} 
                    className="w-full bg-[#1c1f26] border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-green-500 transition-all font-bold appearance-none min-h-[60px]" 
                    style={{ colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase font-black ml-4 block mb-2 tracking-widest">{t[lang].labelEnd}</label>
                    <input required type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} 
                    className="w-full bg-[#1c1f26] border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-green-500 transition-all font-bold appearance-none min-h-[60px]" 
                    style={{ colorScheme: 'dark' }} />
                  </div>
                </div>

                <div className="flex gap-3 mt-10">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-white/5 py-5 rounded-2xl text-[10px] font-black uppercase text-gray-400 tracking-widest">
                    {t[lang].close}
                  </button>
                  <button type="submit" disabled={isSubmitting} className="flex-[2] bg-green-600 py-5 rounded-2xl text-[10px] font-black uppercase text-white tracking-widest shadow-lg shadow-green-900/40">
                    {isSubmitting ? '...' : t[lang].submitBtn}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-10">
                <div className="w-20 h-20 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-3xl text-green-500">✓</span>
                </div>
                <h2 className="text-2xl font-black mb-3 uppercase italic text-white tracking-tight">{t[lang].successTitle}</h2>
                <p className="text-gray-400 text-xs px-6 mb-10 leading-relaxed italic font-medium">{t[lang].successText}</p>
                <button onClick={() => setShowModal(false)} className="w-full bg-white/5 border border-white/10 py-5 rounded-2xl text-[10px] font-black uppercase text-white tracking-widest">
                  {t[lang].close}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
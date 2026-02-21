"use client";
import { useState, useEffect } from 'react';
import { useParams } from "next/navigation";
import { supabase } from "../../supabase"; 
import Link from "next/link";

export default function BikePage() {
  const params = useParams();
  
  // Состояния
  const [lang, setLang] = useState<'ru' | 'en'>('ru'); 
  const [isReady, setIsReady] = useState(false); 
  const [bike, setBike] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePhoto, setActivePhoto] = useState('');
  const [ref, setRef] = useState<string>('');

  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    // 1. ЧИТАЕМ ЯЗЫК
    const savedLang = localStorage.getItem('userLang');
    if (savedLang === 'en' || savedLang === 'ru') {
      setLang(savedLang as 'ru' | 'en');
    }
    setIsReady(true);

    // 2. РЕФЕРАЛ
    const savedRef = localStorage.getItem('referrer');
    if (savedRef) setRef(savedRef);

    // 3. ДАННЫЕ БАЙКА
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

  // Расчет дней аренды
  const totalDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = end.getTime() - start.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const t = {
    ru: { 
      back: "← Назад", engine: "Объем", year: "Год", day: "В сутки", month: "В месяц", 
      btn: "Забронировать", included: "Включено:",
      modalSub: "Укажите даты аренды", submitBtn: "Отправить запрос",
      successTitle: "Заявка принята!", 
      successText: "Мы уточняем наличие байка. Наше время работы с 10:00 до 22:00. Ожидайте уведомление.",
      close: "Закрыть", features: ["2 шлема", "Поддержка 24/7", "Чистый байк"],
      labelStart: "Дата начала", labelEnd: "Дата окончания", loading: "Загрузка...",
      total: "Итого дней:"
    },
    en: { 
      back: "← Back", engine: "Engine", year: "Year", day: "Per day", month: "Per month", 
      btn: "Book Now", included: "Included:",
      modalSub: "Select rental dates", submitBtn: "Send Request",
      successTitle: "Success!", 
      successText: "We are checking availability. Working hours: 10 AM - 10 PM. Wait for notification.",
      close: "Close", features: ["2 Helmets", "24/7 Support", "Clean condition"],
      labelStart: "Start Date", labelEnd: "End Date", loading: "Loading...",
      total: "Total days:"
    }
  };

  // ОБНОВЛЕННАЯ ФУНКЦИЯ ХЕНДЛЕР
  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalDays() <= 0) {
      alert(lang === 'ru' ? "Выберите корректные даты" : "Select valid dates");
      return;
    }

    setIsSubmitting(true);
    const tg = (window as any).Telegram?.WebApp;
    
    // Получаем данные пользователя из Telegram
    const user = tg?.initDataUnsafe?.user;
    const username = user?.username || 'web_user';
    const telegramId = user?.id; // ID для уведомления клиента

    const bookingData = {
      bike_id: bike.id,
      bike_model: bike.model,
      start_date: startDate,
      end_date: endDate,
      client_username: username,
      telegram_id: telegramId, // Передаем ID
      referrer: ref
    };

    try {
      // 1. Сохраняем в Supabase
      const { error: dbError } = await supabase.from('bookings').insert([bookingData]);
      if (dbError) throw dbError;

      // 2. Отправляем уведомление в Telegram (Админу + Клиенту)
      await fetch('/api/send-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      });

      setIsSubmitted(true);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isReady || loading) return <div className="min-h-screen bg-[#05070a] flex items-center justify-center text-white italic">...</div>;
  if (!bike) return <div className="p-10 text-white text-center bg-[#05070a] min-h-screen">Bike not found</div>;

  const gallery = [bike.image, ...(bike.images_gallery ? bike.images_gallery.split(',').map((s: string) => s.trim()) : [])];

  return (
    <main className="min-h-screen bg-[#05070a] text-white font-sans pb-20 selection:bg-green-500/30 text-left">
      <nav className="fixed top-0 w-full z-[100] bg-[#05070a]/80 backdrop-blur-xl border-b border-white/5 h-16 flex items-center px-6">
        <Link href="/" className="text-gray-500 uppercase text-[10px] font-black tracking-widest hover:text-white transition-colors">
          {t[lang].back}
        </Link>
      </nav>

      <div className="max-w-6xl mx-auto px-6 pt-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div className="space-y-6">
            <div className="aspect-[4/3] rounded-[2.5rem] overflow-hidden bg-[#11141b] border border-white/5 shadow-2xl">
              <img src={activePhoto} className="w-full h-full object-contain p-6" alt={bike.model} />
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
              {gallery.map((img, idx) => (
                <button key={idx} onClick={() => setActivePhoto(img)} className={`w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 border-2 transition-all ${activePhoto === img ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'border-transparent opacity-40 hover:opacity-100'}`}>
                  <img src={img} className="w-full h-full object-cover" alt="preview" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <h1 className="text-4xl md:text-6xl font-black uppercase italic mb-4 leading-tight tracking-tighter">{bike.model}</h1>
            <div className="flex gap-3 mb-8 text-[10px] font-black uppercase tracking-widest text-green-500">
              <span className="bg-green-500/10 px-4 py-2 rounded-xl border border-green-500/20">{bike.engine}CC</span>
              <span className="bg-white/5 px-4 py-2 rounded-xl text-white border border-white/10">{bike.year}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-10">
              <div className="bg-[#11141b] p-6 rounded-[2rem] border border-white/5">
                <p className="text-[9px] text-gray-500 uppercase font-black mb-1">{t[lang].day}</p>
                <p className="text-2xl font-bold italic tracking-tighter">{bike.price_day}</p>
              </div>
              <div className="bg-[#11141b] p-6 rounded-[2rem] border border-green-500/20 shadow-[0_0_30px_rgba(34,197,94,0.05)]">
                <p className="text-[9px] text-green-500 uppercase font-black mb-1">{t[lang].month}</p>
                <p className="text-2xl font-bold text-green-400 italic tracking-tighter">{bike.price_month}</p>
              </div>
            </div>
            <button onClick={() => {setShowModal(true); setIsSubmitted(false);}} className="w-full bg-green-600 py-6 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-green-900/20 text-white active:scale-95 transition-transform">
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
                    <label className="text-[9px] text-gray-400 uppercase font-black ml-4 block mb-2 tracking-widest">{t[lang].labelStart}</label>
                    <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} 
                    className="w-full bg-[#1c1f26] border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-green-500 transition-all font-bold appearance-none min-h-[60px]" 
                    style={{ colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-400 uppercase font-black ml-4 block mb-2 tracking-widest">{t[lang].labelEnd}</label>
                    <input required type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} 
                    className="w-full bg-[#1c1f26] border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-green-500 transition-all font-bold appearance-none min-h-[60px]" 
                    style={{ colorScheme: 'dark' }} />
                  </div>
                </div>

                {totalDays() > 0 && (
                  <div className="mt-6 px-4 py-2 bg-green-500/5 rounded-xl inline-block border border-green-500/10">
                    <span className="text-[10px] text-gray-400 uppercase font-bold">{t[lang].total} </span>
                    <span className="text-green-500 font-black">{totalDays()}</span>
                  </div>
                )}

                <div className="flex gap-3 mt-10">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-white/5 py-5 rounded-2xl text-[10px] font-black uppercase text-gray-400 tracking-widest">{t[lang].close}</button>
                  <button type="submit" disabled={isSubmitting} className="flex-[2] bg-green-600 py-5 rounded-2xl text-[10px] font-black uppercase text-white tracking-widest shadow-lg shadow-green-900/40">
                    {isSubmitting ? '...' : t[lang].submitBtn}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-10">
                <div className="w-20 h-20 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-6"><span className="text-3xl text-green-500">✓</span></div>
                <h2 className="text-2xl font-black mb-3 uppercase italic text-white tracking-tight">{t[lang].successTitle}</h2>
                <p className="text-gray-400 text-xs px-6 mb-10 leading-relaxed italic font-medium">{t[lang].successText}</p>
                <button onClick={() => setShowModal(false)} className="w-full bg-white/5 border border-white/10 py-5 rounded-2xl text-[10px] font-black uppercase text-white tracking-widest">{t[lang].close}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
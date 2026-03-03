"use client";
import { useState, useEffect } from 'react';
import { useParams } from "next/navigation";
import { supabase } from "../../supabase"; 
import Link from "next/link";

export default function BikePage() {
  const params = useParams();
  
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
    const savedLang = localStorage.getItem('userLang');
    if (savedLang === 'en' || savedLang === 'ru') {
      setLang(savedLang as 'ru' | 'en');
    }
    setIsReady(true);

    const initRefLogic = () => {
      const tg = (window as any).Telegram?.WebApp;
      const urlParams = new URLSearchParams(window.location.search);
      const startParam = urlParams.get('tgWebAppStartParam') || tg?.initDataUnsafe?.start_param;
      const savedRef = localStorage.getItem('referrer');

      if (startParam) {
        setRef(startParam);
        localStorage.setItem('referrer', startParam);
        return true; 
      } else if (savedRef) {
        setRef(savedRef);
        return true;
      }
      return false;
    };

    initRefLogic();
    const interval = setInterval(() => { if (initRefLogic()) clearInterval(interval); }, 500);
    setTimeout(() => clearInterval(interval), 2000);

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

    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
        tg.ready();
        tg.expand();
    }
    return () => clearInterval(interval);
  }, [params.id]);

  const totalDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalDays() <= 0) {
      alert(lang === 'ru' ? "Выберите корректные даты" : "Select valid dates");
      return;
    }
    setIsSubmitting(true);
    const tg = (window as any).Telegram?.WebApp;
    const user = tg?.initDataUnsafe?.user;
    
    const bookingData = {
      bike_id: bike.id,
      bike_model: bike.model,
      start_date: startDate,
      end_date: endDate,
      client_username: user?.username || 'web_user',
      telegram_id: user?.id,
      referrer: ref 
    };

    try {
      const { error: dbError } = await supabase.from('bookings').insert([bookingData]);
      if (dbError) throw dbError;
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

  const t = {
    ru: { 
      back: "← Назад", day: "сутки", month: "месяц", 
      btn: "Забронировать",
      helmets: "2 шлема включено",
      clean: "Идеально чистый",
      description: "Описание",
      modalSub: "Даты аренды", submitBtn: "Отправить запрос",
      successTitle: "Запрос отправлен", 
      successText: "Мы уже связываемся с владельцем для уточнения наличия. Вы можете закрыть Mini App, мы пришлем уведомление в Telegram.",
      workingHours: "Обработка заявок: 10:00 — 22:00 (местное время)",
      close: "Закрыть", labelStart: "Начало", labelEnd: "Конец", total: "Дней:"
    },
    en: { 
      back: "← Back", day: "day", month: "month", 
      btn: "Book Now",
      helmets: "2 helmets included",
      clean: "Perfectly clean",
      description: "Description",
      modalSub: "Rental dates", submitBtn: "Send Request",
      successTitle: "Request Sent", 
      successText: "We are currently contacting the owner to confirm availability. You can close the Mini App; we will send you a notification on Telegram.",
      workingHours: "Working hours: 10:00 AM — 10:00 PM (local time)",
      close: "Close", labelStart: "Start", labelEnd: "End", total: "Days:"
    }
  };

  if (!isReady || loading) return <div className="min-h-screen bg-[#05070a] flex items-center justify-center text-green-500 font-black animate-pulse uppercase text-[10px]">Loading...</div>;
  if (!bike) return <div className="p-10 text-white text-center bg-[#05070a] min-h-screen font-bold uppercase">Bike not found</div>;

  const gallery = [bike.image, ...(bike.images_gallery ? bike.images_gallery.split(',').map((s: string) => s.trim()) : [])];

  return (
    <main className="min-h-screen bg-[#05070a] text-white font-sans flex flex-col items-center overflow-x-hidden">
      
      {/* HEADER Nav */}
      <nav className="fixed top-0 w-full z-[100] bg-[#05070a]/90 backdrop-blur-md border-b border-white/5 h-14 flex items-center px-4">
        <Link href="/" className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter text-gray-300">
          {t[lang].back}
        </Link>
      </nav>

      <div className="w-full max-w-lg px-4 pt-20 pb-10">
        {/* HERO IMAGE 3:4 */}
        <div className="relative aspect-[3/4] w-full rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl mb-6 bg-[#0f1117]">
          <img src={activePhoto} className="w-full h-full object-cover transition-all duration-500" alt={bike.model} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05070a] via-transparent to-transparent opacity-80" />
          <div className="absolute bottom-8 left-8">
             <h1 className="text-4xl font-black uppercase italic leading-none tracking-tighter drop-shadow-lg">{bike.model}</h1>
          </div>
        </div>

        {/* THUMBNAILS */}
        <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar px-2">
          {gallery.map((img, idx) => (
            <button 
                key={idx} 
                onClick={() => setActivePhoto(img)} 
                className={`w-16 h-20 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${activePhoto === img ? 'border-green-500 scale-95' : 'border-transparent opacity-40'}`}
            >
              <img src={img} className="w-full h-full object-cover" alt="preview" />
            </button>
          ))}
        </div>

        {/* INFO CARD */}
        <div className="bg-[#0f1117] rounded-[2.5rem] border border-white/5 p-6 mb-6">
          {/* Service Tags - Replaced Emojis with Status Dots */}
          <div className="flex flex-wrap gap-2 mb-6">
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 text-[9px] font-black uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> {t[lang].helmets}
            </div>
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 text-[9px] font-black uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> {t[lang].clean}
            </div>
          </div>

          <div className="flex gap-2 mb-6">
            <span className="bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20 text-green-500 text-[10px] font-black uppercase">{bike.engine}cc</span>
            <span className="bg-white/5 px-3 py-1.5 rounded-lg border border-white/10 text-white text-[10px] font-black uppercase">{bike.year}</span>
          </div>

          {/* New Description Section */}
          <div className="mb-8 px-1">
            <p className="text-[8px] text-gray-500 uppercase font-black tracking-[0.2em] mb-3">{t[lang].description}</p>
            <p className="text-xs text-gray-400 leading-relaxed font-medium">
              {lang === 'ru' ? bike.description_ru : bike.description_en}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-black/30 p-4 rounded-2xl border border-white/5 text-center">
                <p className="text-[8px] text-gray-500 uppercase font-bold mb-1 tracking-widest">{t[lang].day}</p>
                <p className="text-lg font-black italic">{bike.price_day}</p>
            </div>
            <div className="bg-green-500/5 p-4 rounded-2xl border border-green-500/10 text-center">
                <p className="text-[8px] text-green-500/70 uppercase font-bold mb-1 tracking-widest">{t[lang].month}</p>
                <p className="text-lg font-black text-green-400 italic">{bike.price_month}</p>
            </div>
          </div>

          <button 
            onClick={() => {setShowModal(true); setIsSubmitted(false);}} 
            className="w-full bg-green-600 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest text-white shadow-lg shadow-green-900/30 active:scale-[0.98] transition-all"
          >
            {t[lang].btn}
          </button>
        </div>
      </div>

      {/* BOOKING MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-sm bg-[#11141b] border border-white/10 rounded-[2.5rem] p-7 shadow-2xl animate-in fade-in zoom-in duration-200">
            {!isSubmitted ? (
              <form onSubmit={handleBooking}>
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-black uppercase italic leading-tight tracking-tighter mb-1">{bike.model}</h2>
                    <div className="inline-block px-3 py-1 bg-white/5 rounded-full border border-white/10">
                        <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest">{t[lang].modalSub}</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                    <label className="text-[8px] text-gray-500 uppercase font-black mb-1.5 block px-1">{t[lang].labelStart}</label>
                    <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} 
                    className="w-full bg-transparent text-white outline-none font-bold text-xs" style={{ colorScheme: 'dark' }} />
                  </div>
                  <div className="bg-black/20 p-3 rounded-2xl border border-white/5">
                    <label className="text-[8px] text-gray-500 uppercase font-black mb-1.5 block px-1">{t[lang].labelEnd}</label>
                    <input required type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} 
                    className="w-full bg-transparent text-white outline-none font-bold text-xs" style={{ colorScheme: 'dark' }} />
                  </div>
                </div>

                <div className="flex items-center justify-between mb-8 px-2">
                  {totalDays() > 0 ? (
                    <div className="px-3 py-1.5 bg-green-500/10 rounded-lg border border-green-500/20 text-[10px] text-green-500 font-black tracking-widest">
                       {t[lang].total} {totalDays()}
                    </div>
                  ) : <div></div>}
                  {ref && (
                    <div className="text-[8px] text-gray-600 font-bold uppercase italic opacity-50">ID: {ref}</div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-white/5 py-4 rounded-xl text-[10px] font-black uppercase text-gray-400 border border-white/5 active:scale-95 transition-all">{t[lang].close}</button>
                  <button type="submit" disabled={isSubmitting} className="flex-[2] bg-green-600 py-4 rounded-xl text-[10px] font-black uppercase text-white shadow-lg shadow-green-900/40 active:scale-95 transition-all">
                    {isSubmitting ? '...' : t[lang].submitBtn}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
                </div>
                <h2 className="text-xl font-black mb-4 uppercase italic tracking-tight">{t[lang].successTitle}</h2>
                <div className="space-y-4 mb-10">
                    <p className="text-gray-300 text-[11px] leading-relaxed px-2">
                        {t[lang].successText}
                    </p>
                    <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                        <p className="text-[9px] text-gray-500 font-black uppercase tracking-wider">
                            {t[lang].workingHours}
                        </p>
                    </div>
                </div>
                <button onClick={() => setShowModal(false)} className="w-full bg-white/5 border border-white/10 py-4 rounded-xl text-[10px] font-black uppercase text-white tracking-widest transition-all active:scale-95">OK</button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
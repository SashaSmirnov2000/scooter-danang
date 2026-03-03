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
      const startParamFromUrl = urlParams.get('tgWebAppStartParam');
      const startParamFromTg = tg?.initDataUnsafe?.start_param;
      const savedRef = localStorage.getItem('referrer');
      const activeRef = startParamFromUrl || startParamFromTg;

      if (activeRef) {
        setRef(activeRef);
        localStorage.setItem('referrer', activeRef);
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
    const diff = end.getTime() - start.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const t = {
    ru: { 
      back: "← Назад", engine: "Объем", year: "Год", day: "сутки", month: "месяц", 
      btn: "Забронировать байк",
      modalSub: "Выберите даты аренды", submitBtn: "Подтвердить запрос",
      successTitle: "Заявка принята!", 
      successText: "Мы проверяем наличие. Ожидайте уведомление в Telegram (10:00 - 22:00).",
      close: "Закрыть",
      labelStart: "Дата начала", labelEnd: "Дата окончания",
      total: "Итого дней:"
    },
    en: { 
      back: "← Back", engine: "Engine", year: "Year", day: "day", month: "month", 
      btn: "Book This Bike",
      modalSub: "Select rental dates", submitBtn: "Confirm Request",
      successTitle: "Success!", 
      successText: "Checking availability. You'll get a notification (10 AM - 10 PM).",
      close: "Close",
      labelStart: "Start Date", labelEnd: "End Date",
      total: "Total days:"
    }
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

  if (!isReady || loading) return <div className="min-h-screen bg-[#05070a] flex items-center justify-center text-green-500 font-black uppercase tracking-widest animate-pulse text-xs">Loading...</div>;
  if (!bike) return <div className="p-10 text-white text-center bg-[#05070a] min-h-screen font-bold uppercase">Bike not found</div>;

  const gallery = [bike.image, ...(bike.images_gallery ? bike.images_gallery.split(',').map((s: string) => s.trim()) : [])];

  return (
    <main className="min-h-screen bg-[#05070a] text-white font-sans pb-10 flex flex-col items-center">
      
      {/* HEADER Nav */}
      <nav className="fixed top-0 w-full z-[100] bg-[#05070a]/90 backdrop-blur-md border-b border-white/5 h-14 flex items-center px-4">
        <Link href="/" className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter text-gray-300 active:scale-90 transition-all">
          {t[lang].back}
        </Link>
      </nav>

      <div className="w-full max-w-2xl px-4 pt-20">
        {/* HERO IMAGE 4:3 */}
        <div className="relative aspect-[4/3] w-full rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl mb-6">
          <img src={activePhoto} className="w-full h-full object-cover transition-all duration-500" alt={bike.model} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05070a] via-transparent to-transparent" />
          <div className="absolute bottom-6 left-8">
             <h1 className="text-4xl font-black uppercase italic leading-none tracking-tighter drop-shadow-lg">{bike.model}</h1>
          </div>
        </div>

        {/* THUMBNAILS */}
        <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar px-2">
          {gallery.map((img, idx) => (
            <button 
                key={idx} 
                onClick={() => setActivePhoto(img)} 
                className={`w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${activePhoto === img ? 'border-green-500' : 'border-transparent opacity-40'}`}
            >
              <img src={img} className="w-full h-full object-cover" alt="preview" />
            </button>
          ))}
        </div>

        {/* SPECS */}
        <div className="bg-[#0f1117] rounded-[2.5rem] border border-white/5 p-8 mb-6 shadow-xl">
          <div className="flex gap-3 mb-8">
            <div className="bg-green-500/10 px-4 py-2 rounded-xl border border-green-500/20 text-green-500 text-[10px] font-black uppercase tracking-widest">
                {bike.engine}cc
            </div>
            <div className="bg-white/5 px-4 py-2 rounded-xl border border-white/10 text-white text-[10px] font-black uppercase tracking-widest">
                {bike.year}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-black/30 p-5 rounded-2xl border border-white/5">
                <p className="text-[8px] text-gray-500 uppercase font-bold mb-1">{t[lang].day}</p>
                <p className="text-xl font-black italic">{bike.price_day}</p>
            </div>
            <div className="bg-green-500/5 p-5 rounded-2xl border border-green-500/10">
                <p className="text-[8px] text-green-500/70 uppercase font-bold mb-1">{t[lang].month}</p>
                <p className="text-xl font-black text-green-400 italic">{bike.price_month}</p>
            </div>
          </div>

          <button 
            onClick={() => {setShowModal(true); setIsSubmitted(false);}} 
            className="w-full bg-green-600 py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.1em] text-white shadow-lg shadow-green-900/30 active:scale-95 transition-all"
          >
            {t[lang].btn}
          </button>
        </div>
      </div>

      {/* BOOKING MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md bg-[#0f1117] border-t border-white/10 sm:border sm:rounded-[2.5rem] p-8 rounded-t-[2.5rem] shadow-2xl animate-in slide-in-from-bottom duration-300">
            {!isSubmitted ? (
              <form onSubmit={handleBooking}>
                <h2 className="text-2xl font-black mb-1 uppercase italic tracking-tighter">{bike.model}</h2>
                <p className="text-gray-500 text-[9px] uppercase font-black tracking-widest mb-8">{t[lang].modalSub}</p>
                
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-[8px] text-gray-500 uppercase font-black ml-4 mb-1.5 block">{t[lang].labelStart}</label>
                    <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-green-500 transition-all font-bold text-sm" style={{ colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label className="text-[8px] text-gray-500 uppercase font-black ml-4 mb-1.5 block">{t[lang].labelEnd}</label>
                    <input required type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white outline-none focus:border-green-500 transition-all font-bold text-sm" style={{ colorScheme: 'dark' }} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-8">
                  {totalDays() > 0 && (
                    <div className="px-3 py-1.5 bg-green-500/10 rounded-lg border border-green-500/20 text-[10px] text-green-500 font-black">
                       {t[lang].total} {totalDays()}
                    </div>
                  )}
                  {ref && (
                    <div className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 text-[9px] text-gray-500 font-bold">
                       Ref: {ref}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-white/5 py-4 rounded-xl text-[10px] font-black uppercase text-gray-400">{t[lang].close}</button>
                  <button type="submit" disabled={isSubmitting} className="flex-[2] bg-green-600 py-4 rounded-xl text-[10px] font-black uppercase text-white shadow-lg shadow-green-900/40">
                    {isSubmitting ? '...' : t[lang].submitBtn}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-10">
                <div className="w-16 h-16 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-2xl text-green-500">✓</span>
                </div>
                <h2 className="text-xl font-black mb-3 uppercase italic tracking-tight">{t[lang].successTitle}</h2>
                <p className="text-gray-400 text-[11px] font-medium mb-10 leading-relaxed px-6">{t[lang].successText}</p>
                <button onClick={() => setShowModal(false)} className="w-full bg-white/5 border border-white/10 py-4 rounded-xl text-[10px] font-black uppercase text-white tracking-widest">{t[lang].close}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
"use client";
import { useState, useEffect } from 'react';
import { supabase } from './supabase'; 
import Link from 'next/link';

export default function Home() {
  const [lang, setLang] = useState<'ru' | 'en'>('ru');
  const [bikes, setBikes] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [ref, setRef] = useState<string>('');

  const [selectedBike, setSelectedBike] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem('userLang') as 'ru' | 'en';
    if (savedLang) setLang(savedLang);

    const initRefLogic = () => {
      const tg = (window as any).Telegram?.WebApp;
      const urlParams = new URLSearchParams(window.location.search);
      const refFromUrl = urlParams.get('tgWebAppStartParam');
      const refFromTgUnsafe = tg?.initDataUnsafe?.start_param;
      let refFromRaw = null;
      if (tg?.initData) {
        try {
          const rawParams = new URLSearchParams(tg.initData);
          const startParam = rawParams.get('start_param');
          if (startParam) refFromRaw = startParam;
        } catch (e) { console.error(e); }
      }
      const savedRef = localStorage.getItem('referrer');
      const activeRef = refFromUrl || refFromTgUnsafe || refFromRaw;
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
    setTimeout(() => clearInterval(interval), 3000);

    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      if (tg.BackgroundColor) tg.setHeaderColor('#05070a');
    }

    async function loadBikes() {
      const { data, error } = await supabase
        .from('scooters') 
        .select('*')
        .order('created_at', { ascending: false });
      if (!error) setBikes(data || []);
      setLoading(false);
    }
    loadBikes();
    return () => clearInterval(interval);
  }, []);

  const toggleLang = () => {
    const newLang = lang === 'ru' ? 'en' : 'ru';
    setLang(newLang);
    localStorage.setItem('userLang', newLang);
  };

  const totalDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = end.getTime() - start.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (totalDays() <= 0) {
        alert(lang === 'ru' ? "Дата окончания должна быть позже даты начала" : "End date must be after start date");
        return;
    }
    setIsSubmitting(true);
    const tg = (window as any).Telegram?.WebApp;
    const user = tg?.initDataUnsafe?.user;
    
    const bookingData = {
      bike_id: selectedBike.id,
      bike_model: selectedBike.model,
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
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const t = {
    ru: { 
      title: "Аренда скутеров", sub: "DRAGON BIKE", location: "Дананг, Вьетнам",
      btn: "Забронировать", day: "сутки", month: "месяц",
      modalTitle: "Бронирование", modalSub: "Даты аренды",
      startDate: "Начало", endDate: "Конец", submitBtn: "Отправить запрос",
      successTitle: "Готово!", successText: "Мы скоро ответим в Telegram.",
      close: "Закрыть", total: "Дней:"
    },
    en: { 
      title: "Scooter Rental", sub: "DRAGON BIKE", location: "Da Nang",
      btn: "Book Now", day: "day", month: "month",
      modalTitle: "Booking", modalSub: "Select dates",
      startDate: "Start", endDate: "End", submitBtn: "Send Request",
      successTitle: "Sent!", successText: "We've received your request.",
      close: "Close", total: "Days:"
    }
  };

  return (
    <main className="bg-[#05070a] min-h-screen text-white font-sans flex flex-col selection:bg-green-500/30">
      
      {/* HEADER */}
      <nav className="fixed top-0 w-full z-[100] bg-[#05070a]/90 backdrop-blur-md border-b border-white/5 h-16 flex items-center justify-between px-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-lg shadow-[0_0_15px_rgba(34,197,94,0.3)]">🐉</div>
          <div className="flex flex-col">
            <span className="font-black text-sm tracking-tighter uppercase leading-none">Dragon Bike</span>
            <span className="text-[8px] text-green-500 font-bold tracking-[0.2em] uppercase">Danang</span>
          </div>
        </div>
        <button onClick={toggleLang} className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase active:scale-95 transition-all">
          {lang === 'ru' ? 'EN' : 'RU'}
        </button>
      </nav>

      {/* HERO */}
      <section className="relative h-[25vh] flex items-center justify-center text-center px-6 pt-16">
        <div className="absolute inset-0 z-0">
          <img src="https://static.vinwonders.com/2022/12/Dragon-Bridge-thumb.jpg" className="w-full h-full object-cover opacity-20" alt="Bridge" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05070a] via-transparent to-transparent" />
        </div>
        <div className="relative z-10">
          <h1 className="text-3xl font-black uppercase italic tracking-tight">{t[lang].title}</h1>
          <p className="text-green-500 text-[10px] font-bold tracking-widest uppercase mt-1">{t[lang].location}</p>
        </div>
      </section>

      {/* GRID (Vertical 3:4 aspect) */}
      <section className="max-w-7xl mx-auto px-4 pb-20 relative z-20 w-full">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bikes.map((s) => (
              <div key={s.id} className="bg-[#0f1117] rounded-3xl border border-white/5 overflow-hidden flex flex-col shadow-xl">
                {/* 3:4 Vertical Aspect for iPhone Photos */}
                <Link href={`/bike/${s.id}`} className="relative aspect-[3/4] w-full overflow-hidden block">
                  <img 
                    src={s.image} 
                    className="w-full h-full object-cover" 
                    alt={s.model} 
                  />
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[8px] font-bold border border-white/10 uppercase">
                    {s.year}
                  </div>
                </Link>
                
                <div className="p-3 flex flex-col flex-grow">
                  <h3 className="text-sm font-bold uppercase italic tracking-tighter mb-2 truncate">{s.model}</h3>
                  
                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-500">{t[lang].day}</span>
                      <span className="font-bold">{s.price_day}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-green-500/70">{t[lang].month}</span>
                      <span className="font-bold text-green-400">{s.price_month}</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => {setSelectedBike(s); setIsSubmitted(false);}}
                    className="w-full bg-green-600 py-2.5 rounded-xl font-black text-[9px] uppercase transition-all active:scale-95 text-white shadow-lg shadow-green-900/20"
                  >
                    {t[lang].btn}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODAL - Fixed Centering */}
      {selectedBike && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setSelectedBike(null)} />
          <div className="relative w-full max-w-sm bg-[#0f1117] border border-white/10 rounded-[2rem] p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            {!isSubmitted ? (
              <form onSubmit={handleBooking} className="flex flex-col">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 flex-shrink-0">
                    <img src={selectedBike.image} className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black uppercase italic leading-tight">{selectedBike.model}</h2>
                    <p className="text-[9px] text-gray-500 uppercase font-bold tracking-widest">{t[lang].modalSub}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 mb-6">
                  <div>
                    <label className="text-[8px] text-gray-500 uppercase font-black mb-1.5 ml-1 block">{t[lang].startDate}</label>
                    <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-green-500 text-xs" style={{ colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label className="text-[8px] text-gray-500 uppercase font-black mb-1.5 ml-1 block">{t[lang].endDate}</label>
                    <input required type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white outline-none focus:border-green-500 text-xs" style={{ colorScheme: 'dark' }} />
                  </div>
                </div>

                {totalDays() > 0 && (
                  <div className="mb-6 px-3 py-2 bg-green-500/10 rounded-xl border border-green-500/20 inline-self-start">
                    <span className="text-green-500 font-bold text-[10px] uppercase">{t[lang].total} {totalDays()}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button type="button" onClick={() => setSelectedBike(null)} className="flex-1 bg-white/5 py-3.5 rounded-xl text-[10px] font-black uppercase text-gray-400">{t[lang].close}</button>
                  <button type="submit" disabled={isSubmitting} className="flex-[2] bg-green-600 py-3.5 rounded-xl text-[10px] font-black uppercase text-white">
                    {isSubmitting ? '...' : t[lang].submitBtn}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-green-500/20 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-green-500 text-xl">✓</span>
                </div>
                <h2 className="text-lg font-black mb-2 uppercase italic">{t[lang].successTitle}</h2>
                <p className="text-gray-400 text-[10px] mb-8 leading-relaxed">{t[lang].successText}</p>
                <button onClick={() => setSelectedBike(null)} className="w-full bg-white/5 py-3.5 rounded-xl text-[10px] font-black uppercase">OK</button>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="w-full py-6 text-center border-t border-white/5 mt-auto">
        <p className="text-[8px] text-gray-600 font-bold uppercase tracking-widest">Dragon Bike 2026</p>
      </footer>
    </main>
  );
}
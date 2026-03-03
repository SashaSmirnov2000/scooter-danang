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
      modalTitle: "Бронирование", modalSub: "Укажите даты поездки",
      startDate: "Начало", endDate: "Конец", submitBtn: "Запросить бронь",
      successTitle: "Заявка отправлена!", successText: "Мы скоро свяжемся с вами в Telegram для подтверждения.",
      close: "Закрыть", total: "Дней:"
    },
    en: { 
      title: "Scooter Rental", sub: "DRAGON BIKE", location: "Da Nang, Vietnam",
      btn: "Book Now", day: "day", month: "month",
      modalTitle: "Booking", modalSub: "Select your dates",
      startDate: "Start", endDate: "End", submitBtn: "Request Booking",
      successTitle: "Request Sent!", successText: "We will contact you on Telegram shortly to confirm.",
      close: "Close", total: "Days:"
    }
  };

  return (
    <main className="bg-[#05070a] min-h-screen text-white font-sans flex flex-col overflow-x-hidden selection:bg-green-500/30">
      
      {/* HEADER */}
      <nav className="fixed top-0 w-full z-[100] bg-[#05070a]/90 backdrop-blur-md border-b border-white/5 h-16 flex items-center justify-between px-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.3)] text-lg">🐉</div>
          <div className="flex flex-col">
            <span className="font-black text-sm tracking-tighter uppercase leading-none">Dragon Bike</span>
            <span className="text-[8px] text-green-500 font-bold tracking-[0.2em] uppercase">Danang</span>
          </div>
        </div>
        <button onClick={toggleLang} className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all active:scale-90">
          {lang === 'ru' ? 'EN' : 'RU'}
        </button>
      </nav>

      {/* HERO */}
      <section className="relative h-[35vh] flex items-center justify-center text-center px-6 pt-16">
        <div className="absolute inset-0 z-0">
          <img src="https://static.vinwonders.com/2022/12/Dragon-Bridge-thumb.jpg" className="w-full h-full object-cover opacity-40" alt="Bridge" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05070a] via-[#05070a]/60 to-transparent" />
        </div>
        <div className="relative z-10 mt-10">
          <h1 className="text-3xl font-black mb-1 tracking-tight uppercase italic drop-shadow-2xl">{t[lang].title}</h1>
          <div className="inline-block px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full">
            <p className="text-green-500 text-[10px] font-bold tracking-widest uppercase">{t[lang].location}</p>
          </div>
        </div>
      </section>

      {/* GRID */}
      <section className="max-w-7xl mx-auto px-4 pb-24 -mt-12 relative z-20 w-full">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {bikes.map((s) => (
              <div key={s.id} className="bg-[#0f1117] rounded-[2rem] border border-white/5 overflow-hidden flex flex-col shadow-xl">
                {/* 4:3 Image Container */}
                <Link href={`/bike/${s.id}`} className="relative aspect-[4/3] w-full overflow-hidden block">
                  <img 
                    src={s.image} 
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-110" 
                    alt={s.model} 
                  />
                  <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md px-3 py-1 rounded-lg text-[9px] font-black border border-white/10 tracking-widest uppercase">
                    {s.year}
                  </div>
                </Link>
                
                <div className="p-5 flex flex-col flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold uppercase italic tracking-tighter">{s.model}</h3>
                    <span className="text-[9px] text-gray-500 font-bold uppercase bg-white/5 px-2 py-1 rounded-md">{s.engine}cc</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    <div className="bg-black/30 rounded-xl p-3 border border-white/5">
                      <p className="text-[8px] text-gray-500 uppercase font-bold mb-0.5">{t[lang].day}</p>
                      <p className="text-sm font-black text-white">{s.price_day}</p>
                    </div>
                    <div className="bg-green-500/5 rounded-xl p-3 border border-green-500/10">
                      <p className="text-[8px] text-green-500/70 uppercase font-bold mb-0.5">{t[lang].month}</p>
                      <p className="text-sm font-black text-green-400">{s.price_month}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => {setSelectedBike(s); setIsSubmitted(false);}}
                    className="w-full bg-green-600 active:bg-green-700 py-3.5 rounded-xl font-black text-[10px] uppercase transition-all active:scale-[0.97] text-white tracking-widest shadow-lg shadow-green-900/20"
                  >
                    {t[lang].btn}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODAL (Optimized for 4:3) */}
      {selectedBike && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedBike(null)} />
          <div className="relative w-full max-w-lg bg-[#0f1117] border-t border-white/10 sm:border sm:rounded-[2.5rem] p-6 rounded-t-[2.5rem] shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-y-auto max-h-[90vh]">
            {!isSubmitted ? (
              <form onSubmit={handleBooking}>
                <div className="relative aspect-[4/3] w-full rounded-2xl overflow-hidden mb-6 border border-white/10 shadow-inner">
                  <img src={selectedBike.image} className="w-full h-full object-cover" alt={selectedBike.model} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <h2 className="absolute bottom-4 left-5 text-2xl font-black uppercase italic text-white tracking-tighter">{selectedBike.model}</h2>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase font-black mb-2 ml-1 block">{t[lang].startDate}</label>
                    <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-white outline-none focus:border-green-500 transition-all text-xs" style={{ colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase font-black mb-2 ml-1 block">{t[lang].endDate}</label>
                    <input required type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} 
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3.5 text-white outline-none focus:border-green-500 transition-all text-xs" style={{ colorScheme: 'dark' }} />
                  </div>
                </div>

                <div className="flex items-center justify-between mb-8 px-1">
                    <div className="flex gap-2">
                        {totalDays() > 0 && (
                            <div className="px-3 py-1.5 bg-green-500/10 rounded-lg border border-green-500/20 text-[10px]">
                                <span className="text-green-500 font-black">{t[lang].total} {totalDays()}</span>
                            </div>
                        )}
                        {ref && (
                            <div className="px-3 py-1.5 bg-white/5 rounded-lg border border-white/10 text-[9px] text-gray-400 font-bold uppercase tracking-tighter">
                                Ref: {ref}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setSelectedBike(null)} className="flex-1 bg-white/5 py-4 rounded-xl text-[10px] font-black uppercase border border-white/10 text-white">{t[lang].close}</button>
                  <button type="submit" disabled={isSubmitting} className="flex-[2] bg-green-600 py-4 rounded-xl text-[10px] font-black uppercase text-white shadow-lg shadow-green-900/30 active:scale-95 disabled:opacity-50">
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
                <button onClick={() => setSelectedBike(null)} className="w-full bg-white/5 border border-white/10 py-4 rounded-xl text-[10px] font-black uppercase text-white">{t[lang].close}</button>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="w-full py-8 bg-[#05070a] text-center border-t border-white/5 mt-auto">
        <p className="text-[8px] text-gray-600 font-bold uppercase tracking-[0.4em]">Dragon Bike Danang • 2026</p>
      </footer>
    </main>
  );
}
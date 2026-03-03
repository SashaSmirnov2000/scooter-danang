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
      title: "Аренда скутеров", location: "Дананг, Вьетнам",
      btn: "Узнать подробнее", day: "сутки", month: "месяц",
      modalTitle: "Бронирование", modalSub: "Даты аренды",
      startDate: "Начало", endDate: "Конец", submitBtn: "Отправить запрос",
      successTitle: "Готово!", successText: "Мы скоро ответим в Telegram.",
      close: "Закрыть", total: "Дней:", cc: "cc"
    },
    en: { 
      title: "Scooter Rental", location: "Da Nang",
      btn: "Details", day: "day", month: "month",
      modalTitle: "Booking", modalSub: "Select dates",
      startDate: "Start", endDate: "End", submitBtn: "Send Request",
      successTitle: "Sent!", successText: "We've received your request.",
      close: "Close", total: "Days:", cc: "cc"
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

      {/* GRID */}
      <section className="max-w-7xl mx-auto px-4 pb-20 relative z-20 w-full">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {bikes.map((s) => (
              <div key={s.id} className="group bg-[#0f1117] rounded-[2rem] border border-white/5 overflow-hidden flex flex-col transition-all duration-300 hover:border-green-500/30 shadow-2xl">
                
                {/* Image Area - CLEAN */}
                <Link href={`/bike/${s.id}`} className="relative aspect-[4/5] w-full overflow-hidden block">
                  <img 
                    src={s.image} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                    alt={s.model} 
                  />
                  {/* Subtle Year Badge */}
                  <div className="absolute bottom-3 right-3 bg-black/40 backdrop-blur-md px-2 py-0.5 rounded text-[8px] font-bold border border-white/10 text-white/60">
                    {s.year}
                  </div>
                </Link>
                
                {/* Content Area */}
                <div className="p-4 flex flex-col">
                  
                  {/* Minimal Specs Line - NEW DESIGN */}
                  <div className="flex items-center gap-2 mb-2 text-[9px] font-bold uppercase tracking-widest text-green-500/80">
                    <span>{s.transmission}</span>
                    <span className="w-1 h-1 bg-white/20 rounded-full" />
                    <span>{s.engine}{t[lang].cc}</span>
                  </div>

                  <h3 className="text-base font-black uppercase italic tracking-tighter mb-4 leading-none truncate">
                    {s.model}
                  </h3>
                  
                  {/* Pricing */}
                  <div className="grid grid-cols-2 gap-2 mb-5">
                    <div className="bg-white/5 rounded-xl p-2 border border-white/5">
                      <p className="text-[7px] text-gray-500 uppercase font-bold mb-0.5">{t[lang].day}</p>
                      <p className="text-[11px] font-black">{s.price_day}</p>
                    </div>
                    <div className="bg-green-500/5 rounded-xl p-2 border border-green-500/10">
                      <p className="text-[7px] text-green-500/50 uppercase font-bold mb-0.5">{t[lang].month}</p>
                      <p className="text-[11px] font-black text-green-400">{s.price_month}</p>
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <Link 
                    href={`/bike/${s.id}`}
                    className="w-full bg-white text-black py-3 rounded-xl font-black text-[10px] uppercase transition-all active:scale-95 flex items-center justify-center hover:bg-green-500 hover:text-white shadow-xl shadow-black/20"
                  >
                    {t[lang].btn}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODAL - (Keep for later usage if needed) */}
      {selectedBike && (
         <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* ... (rest of modal code remains same as previous version) ... */}
         </div>
      )}

      <footer className="w-full py-8 text-center border-t border-white/5 mt-auto">
        <p className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.3em]">Dragon Bike &bull; 2026</p>
      </footer>
    </main>
  );
}
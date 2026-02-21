"use client";
import { useState, useEffect } from 'react';
import { supabase } from './supabase'; 
import Link from 'next/link';

export default function Home() {
  const [lang, setLang] = useState<'ru' | 'en'>('ru');
  const [bikes, setBikes] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [ref, setRef] = useState<string>('');

  // Состояния для бронирования
  const [selectedBike, setSelectedBike] = useState<any>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem('userLang') as 'ru' | 'en';
    if (savedLang) setLang(savedLang);

    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      const startParam = tg.initDataUnsafe?.start_param;
      if (startParam) {
        setRef(startParam);
        localStorage.setItem('referrer', startParam);
      }
    }

    const savedRef = localStorage.getItem('referrer');
    if (savedRef) setRef(savedRef);

    async function loadBikes() {
      const { data, error } = await supabase
        .from('scooters') 
        .select('*')
        .order('created_at', { ascending: false });
      if (!error) setBikes(data || []);
      setLoading(false);
    }
    loadBikes();
  }, []);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const tg = (window as any).Telegram?.WebApp;
    const username = tg?.initDataUnsafe?.user?.username || 'web_user';

    const { error } = await supabase.from('bookings').insert([{
      bike_id: selectedBike.id,
      bike_model: selectedBike.model,
      start_date: startDate,
      end_date: endDate,
      client_username: username,
      referrer: ref
    }]);

    if (!error) {
      setIsSubmitted(true);
    } else {
      alert("Error: " + error.message);
    }
    setIsSubmitting(false);
  };

  const t = {
    ru: { 
      title: "Аренда скутеров", sub: "DRAGON BIKE DANANG", location: "Дананг, Вьетнам",
      btn: "Забронировать", day: "в сутки", month: "в месяц",
      modalTitle: "Бронирование",
      modalSub: "Выберите даты аренды",
      startDate: "Начало", endDate: "Конец",
      submitBtn: "Отправить заявку",
      successTitle: "Заявка отправлена!",
      successText: "Мы уточняем наличие байка у владельца. Пожалуйста, дождитесь подтверждения. Вы можете закрыть Mini App, мы пришлем вам уведомление.",
      close: "Закрыть"
    },
    en: { 
      title: "Scooter Rental", sub: "DRAGON BIKE DANANG", location: "Da Nang, Vietnam",
      btn: "Book Now", day: "per day", month: "per month",
      modalTitle: "Booking",
      modalSub: "Select rental dates",
      startDate: "Start Date", endDate: "End Date",
      submitBtn: "Send Request",
      successTitle: "Request Sent!",
      successText: "We are checking bike availability with the owner. Please wait for confirmation. You can close the Mini App now, we will notify you shortly.",
      close: "Close"
    }
  };

  return (
    <main className="bg-[#05070a] min-h-screen text-white font-sans flex flex-col overflow-x-hidden">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-[100] bg-[#05070a]/80 backdrop-blur-xl border-b border-white/5 h-20 flex items-center justify-between px-8">
        <div className="flex items-center gap-3 text-left">
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(34,197,94,0.4)] text-xl">🐉</div>
          <div className="flex flex-col">
            <span className="font-black text-xl tracking-tight uppercase leading-none">Dragon</span>
            <span className="text-[10px] text-green-500 font-bold tracking-[0.2em] uppercase">Bike</span>
          </div>
        </div>
        <button onClick={() => setLang(lang === 'ru' ? 'en' : 'ru')} className="bg-white/5 border border-white/10 px-5 py-2 rounded-2xl text-[11px] font-bold uppercase active:scale-95 transition-all">
          {lang === 'ru' ? 'English' : 'Русский'}
        </button>
      </nav>

      {/* Hero Section */}
      <section className="relative h-[45vh] flex items-center justify-center text-center px-6 pt-16">
        <div className="absolute inset-0 z-0">
          <img src="https://static.vinwonders.com/2022/12/Dragon-Bridge-thumb.jpg" className="w-full h-full object-cover opacity-30" alt="Bridge" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#05070a] via-[#05070a]/40 to-transparent" />
        </div>
        <div className="relative z-10">
          <h1 className="text-4xl font-bold mb-2 tracking-tight uppercase italic">{t[lang].title}</h1>
          <p className="text-gray-400 text-sm tracking-wide mb-4">{t[lang].location}</p>
          {ref && (
            <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-lg inline-block">
              <p className="text-[10px] text-green-500 uppercase font-bold tracking-widest text-left">Partner: {ref}</p>
            </div>
          )}
        </div>
      </section>

      {/* Bikes Grid */}
      <section className="max-w-7xl mx-auto px-6 pb-24 -mt-10 relative z-20 w-full">
        {loading ? (
          <div className="flex justify-center py-20"><div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {bikes.map((s) => (
              <div key={s.id} className="bg-[#11141b] rounded-[2.5rem] border border-white/5 overflow-hidden transition-all hover:border-green-500/40">
                <div className="h-56 bg-white/5 p-6 flex items-center justify-center relative">
                  <img src={s.image} className="max-h-full object-contain transition-transform group-hover:scale-110" alt={s.model} />
                  <div className="absolute top-4 right-4 bg-black/60 px-3 py-1 rounded-full text-[10px] font-bold border border-white/5">{s.year}</div>
                </div>
                <div className="p-8 text-left">
                  <h3 className="text-2xl font-bold mb-1 uppercase tracking-tight">{s.model}</h3>
                  <p className="text-gray-500 text-xs font-medium tracking-widest uppercase mb-6">{s.engine}cc • Auto</p>
                  
                  <div className="flex items-center justify-between bg-black/40 rounded-2xl p-5 border border-white/5 mb-6">
                    <div>
                      <p className="text-[9px] text-gray-500 uppercase font-black mb-1 text-left">{t[lang].day}</p>
                      <span className="text-xl font-bold text-white">{s.price_day}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-green-500 uppercase font-black mb-1">{t[lang].month}</p>
                      <span className="text-xl font-bold text-green-400">{s.price_month}</span>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => {setSelectedBike(s); setIsSubmitted(false);}}
                    className="w-full bg-green-600 hover:bg-green-500 py-4 rounded-2xl font-bold text-[10px] uppercase text-center transition-all shadow-lg shadow-green-900/20 active:scale-95"
                  >
                    {t[lang].btn}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* MODAL WINDOW */}
      {selectedBike && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setSelectedBike(null)} />
          
          <div className="relative w-full max-w-md bg-[#11141b] border border-white/10 rounded-[2.5rem] p-8 animate-in slide-in-from-bottom duration-300">
            {!isSubmitted ? (
              <form onSubmit={handleBooking} className="text-left">
                <h2 className="text-2xl font-bold mb-1 uppercase italic tracking-tight">{selectedBike.model}</h2>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-widest mb-8">{t[lang].modalSub}</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase font-black ml-4">{t[lang].startDate}</label>
                    <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} 
                    className="w-full bg-black border border-white/10 rounded-2xl p-4 mt-1 text-white outline-none focus:border-green-500 transition-all" />
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase font-black ml-4">{t[lang].endDate}</label>
                    <input required type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} 
                    className="w-full bg-black border border-white/10 rounded-2xl p-4 mt-1 text-white outline-none focus:border-green-500 transition-all" />
                  </div>
                </div>

                <div className="flex gap-3 mt-8">
                  <button type="button" onClick={() => setSelectedBike(null)} className="flex-1 bg-white/5 py-4 rounded-2xl text-[10px] font-bold uppercase border border-white/10">
                    {t[lang].close}
                  </button>
                  <button type="submit" disabled={isSubmitting} className="flex-[2] bg-green-600 py-4 rounded-2xl text-[10px] font-bold uppercase shadow-lg shadow-green-900/30 active:scale-95">
                    {isSubmitting ? '...' : t[lang].submitBtn}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl text-green-500">✓</span>
                </div>
                <h2 className="text-2xl font-bold mb-4 uppercase italic tracking-tight">{t[lang].successTitle}</h2>
                <p className="text-gray-400 text-sm font-light mb-8 leading-relaxed">
                  {t[lang].successText}
                </p>
                <button 
                  onClick={() => setSelectedBike(null)}
                  className="w-full bg-white/5 border border-white/10 py-4 rounded-2xl text-[10px] font-bold uppercase"
                >
                  {t[lang].close}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="w-full py-10 bg-[#05070a] text-center border-t border-white/5">
        <p className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.2em]">Dragon Bike Danang • 2026</p>
      </footer>
    </main>
  );
}
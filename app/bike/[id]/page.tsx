"use client";
import { useState, useEffect, useRef } from 'react';
import { useParams } from "next/navigation";
import { supabase } from "../../supabase"; 
import Link from "next/link";

export default function BikePage() {
  const params = useParams();
  
  const [lang, setLang] = useState<'ru' | 'en'>('ru'); 
  const [isReady, setIsReady] = useState(false); 
  const [bike, setBike] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [ref, setRef] = useState<string>('');

  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Для обработки свайпов
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

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

  const calculateTotalOrderPrice = () => {
    const days = totalDays();
    if (days <= 0) return 0;
    const cleanPrice = (p: string) => parseInt(p?.replace(/\D/g, '') || '0');
    const p1 = cleanPrice(bike.price_day);
    const p2 = bike.price_2days ? cleanPrice(bike.price_2days) : p1;
    const finalDayPrice = days >= 2 ? p2 : p1;
    return (finalDayPrice * days).toLocaleString('de-DE');
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const days = totalDays();
    if (days <= 0) {
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
      referrer: ref,
      total_price: calculateTotalOrderPrice() + " VND"
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
      back: "← Назад", day: "1 сутки", month: "от 2 суток", 
      btn: "Забронировать",
      helmets: "2 шлема",
      clean: "Идеально чистый",
      description: "Описание",
      transmission: "Трансмиссия",
      modalSub: "Даты аренды", submitBtn: "Отправить запрос",
      successTitle: "Запрос принят", 
      successText: "Мы связываемся с владельцем. Пришлем уведомление в Telegram.",
      workingHours: "10:00 — 22:00",
      close: "Закрыть", labelStart: "Начало", labelEnd: "Конец", total: "Дней:", sum: "Итого:"
    },
    en: { 
      back: "← Back", day: "1 day", month: "2+ days", 
      btn: "Book Now",
      helmets: "2 helmets",
      clean: "Clean",
      description: "Description",
      transmission: "Trans",
      modalSub: "Rental dates", submitBtn: "Send Request",
      successTitle: "Sent", 
      successText: "We are contacting the owner. Notification will be in Telegram.",
      workingHours: "10:00 — 22:00",
      close: "Close", labelStart: "Start", labelEnd: "End", total: "Days:", sum: "Total:"
    }
  };

  if (!isReady || loading) return <div className="min-h-screen bg-[#05070a] flex items-center justify-center text-green-500 font-black animate-pulse uppercase text-[10px]">Loading...</div>;
  if (!bike) return <div className="p-10 text-white text-center bg-[#05070a] min-h-screen font-bold uppercase">Bike not found</div>;

  const gallery = [bike.image, ...(bike.images_gallery ? bike.images_gallery.split(',').map((s: string) => s.trim()) : [])];

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };
  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50 && activePhotoIndex < gallery.length - 1) setActivePhotoIndex(prev => prev + 1);
    if (distance < -50 && activePhotoIndex > 0) setActivePhotoIndex(prev => prev - 1);
    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <main className="min-h-screen bg-[#05070a] text-white font-sans flex flex-col items-center overflow-x-hidden">
      
      <nav className="fixed top-0 w-full z-[100] bg-[#05070a]/90 backdrop-blur-md border-b border-white/5 h-12 flex items-center px-4">
        <Link href="/" className="bg-white/5 border border-white/10 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-tighter text-gray-300">
          {t[lang].back}
        </Link>
      </nav>

      <div className="w-full max-w-lg px-3 pt-14 pb-4">
        <div 
          className="relative aspect-[4/3] w-full rounded-[1.5rem] overflow-hidden border border-white/5 shadow-2xl mb-3 bg-[#0f1117] touch-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="w-full h-full flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${activePhotoIndex * 100}%)` }}>
            {gallery.map((img, i) => (
              <img key={i} src={img} className="w-full h-full object-cover flex-shrink-0" alt={bike.model} />
            ))}
          </div>
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-[#05070a] via-transparent to-transparent opacity-60" />
          <div className="absolute bottom-4 left-4 pointer-events-none">
              <h1 className="text-2xl font-black uppercase italic leading-none tracking-tighter drop-shadow-lg">{bike.model}</h1>
          </div>
          <div className="absolute bottom-3 right-4 flex gap-1">
            {gallery.map((_, i) => (
              <div key={i} className={`h-1 rounded-full transition-all duration-300 ${activePhotoIndex === i ? 'w-3 bg-green-500' : 'w-1 bg-white/30'}`} />
            ))}
          </div>
        </div>

        <div className="bg-[#0f1117] rounded-[1.5rem] border border-white/5 p-4 mb-4">
          <div className="flex flex-wrap gap-1.5 mb-4">
            <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg border border-white/10 text-gray-300 text-[8px] font-black uppercase">
                <span className="w-1 h-1 rounded-full bg-green-500"></span> 
                {t[lang].helmets}
            </div>
            <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-lg border border-white/10 text-gray-300 text-[8px] font-black uppercase">
                <span className="w-1 h-1 rounded-full bg-blue-500"></span> 
                {t[lang].clean}
            </div>
            <div className="bg-green-500/10 px-2 py-1 rounded-lg border border-green-500/20 text-[8px] text-green-500 font-black uppercase">
                {bike.engine}cc
            </div>
            <div className="bg-white/5 px-2 py-1 rounded-lg border border-white/10 text-[8px] text-white font-black uppercase">
                {bike.transmission || 'Auto'}
            </div>
          </div>

          <div className="mb-4 px-1">
            <p className="text-[10px] text-gray-400 leading-snug font-medium line-clamp-3">
              {lang === 'ru' ? bike.description_ru : bike.description_en}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="bg-black/30 py-2 rounded-xl border border-white/5 text-center">
                <p className="text-[7px] text-gray-500 uppercase font-bold">{t[lang].day}</p>
                <p className="text-sm font-black italic">{bike.price_day}</p>
            </div>
            <div className="bg-green-500/5 py-2 rounded-xl border border-green-500/10 text-center">
                <p className="text-[7px] text-green-500/70 uppercase font-bold">{t[lang].month}</p>
                <p className="text-sm font-black text-green-400 italic">{bike.price_2days || bike.price_day}</p>
            </div>
          </div>

          <button 
            onClick={() => {setShowModal(true); setIsSubmitted(false);}} 
            className="w-full bg-green-600 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-white active:scale-[0.98] transition-all"
          >
            {t[lang].btn}
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-sm bg-[#11141b] border border-white/10 rounded-[2rem] p-5 shadow-2xl animate-in fade-in zoom-in duration-200">
            {!isSubmitted ? (
              <form onSubmit={handleBooking}>
                <div className="text-center mb-5">
                    <h2 className="text-xl font-black uppercase italic leading-tight mb-1">{bike.model}</h2>
                    <p className="text-[8px] text-gray-500 uppercase font-black">{t[lang].modalSub}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="bg-black/20 p-2 rounded-xl border border-white/5">
                    <label className="text-[7px] text-gray-500 uppercase font-black mb-1 block">{t[lang].labelStart}</label>
                    <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} 
                    className="w-full bg-transparent text-white outline-none font-bold text-[10px]" style={{ colorScheme: 'dark' }} />
                  </div>
                  <div className="bg-black/20 p-2 rounded-xl border border-white/5">
                    <label className="text-[7px] text-gray-500 uppercase font-black mb-1 block">{t[lang].labelEnd}</label>
                    <input required type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} 
                    className="w-full bg-transparent text-white outline-none font-bold text-[10px]" style={{ colorScheme: 'dark' }} />
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-3 mb-5 border border-white/5 flex items-center justify-between">
                   <div>
                      <p className="text-[7px] text-gray-500 uppercase font-black">{t[lang].total}</p>
                      <p className="text-sm font-black">{totalDays()} d</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[7px] text-green-500 uppercase font-black">{t[lang].sum}</p>
                      <p className="text-sm font-black text-green-500 tracking-tighter">{calculateTotalOrderPrice()} VND</p>
                   </div>
                </div>

                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-white/5 py-3 rounded-xl text-[9px] font-black uppercase text-gray-400">Esc</button>
                  <button type="submit" disabled={isSubmitting} className="flex-[3] bg-green-600 py-3 rounded-xl text-[9px] font-black uppercase text-white">
                    {isSubmitting ? '...' : t[lang].submitBtn}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-2">
                <div className="w-10 h-10 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div>
                </div>
                <h2 className="text-lg font-black mb-2 uppercase italic">{t[lang].successTitle}</h2>
                <p className="text-gray-300 text-[10px] mb-6 leading-relaxed px-4">{t[lang].successText}</p>
                <button onClick={() => setShowModal(false)} className="w-full bg-white/5 border border-white/10 py-3 rounded-xl text-[9px] font-black uppercase text-white">OK</button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
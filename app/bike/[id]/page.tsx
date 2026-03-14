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

  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  useEffect(() => {
    const savedLang = localStorage.getItem('userLang');
    if (savedLang === 'en' || savedLang === 'ru') setLang(savedLang as 'ru' | 'en');
    setIsReady(true);

    const initRefLogic = () => {
      const tg = (window as any).Telegram?.WebApp;
      const urlParams = new URLSearchParams(window.location.search);
      const startParam = urlParams.get('tgWebAppStartParam') || tg?.initDataUnsafe?.start_param;
      const savedRef = localStorage.getItem('referrer');
      if (startParam) { setRef(startParam); localStorage.setItem('referrer', startParam); return true; }
      else if (savedRef) { setRef(savedRef); return true; }
      return false;
    };

    initRefLogic();
    const interval = setInterval(() => { if (initRefLogic()) clearInterval(interval); }, 500);
    setTimeout(() => clearInterval(interval), 2000);

    async function loadBikeData() {
      const { data, error } = await supabase.from('scooters').select('*').eq('id', params.id).single();
      if (!error && data) setBike(data);
      setLoading(false);
    }
    if (params.id) loadBikeData();

    const tg = (window as any).Telegram?.WebApp;
    if (tg) { tg.ready(); tg.expand(); }
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

  const calcUsd = (vnd: string) => {
    const n = parseInt((vnd || '').replace(/\D/g, '') || '0');
    if (!n) return '';
    return `~$${Math.round(n / 26000)}`;
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const days = totalDays();
    if (days <= 0) { alert(lang === 'ru' ? "Выберите корректные даты" : "Select valid dates"); return; }
    setIsSubmitting(true);
    const tg = (window as any).Telegram?.WebApp;
    const user = tg?.initDataUnsafe?.user;
    const bookingData = {
      bike_id: bike.id, bike_model: bike.model, start_date: startDate, end_date: endDate,
      client_username: user?.username || 'web_user', telegram_id: user?.id,
      referrer: ref, total_price: calculateTotalOrderPrice() + " VND"
    };
    try {
      const { error: dbError } = await supabase.from('bookings').insert([bookingData]);
      if (dbError) throw dbError;
      await fetch('/api/send-telegram', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bookingData) });
      setIsSubmitted(true);
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const t = {
    ru: {
      back: "Назад", day: "1 сутки", month: "от 2 суток",
      btn: "Забронировать", helmets: "2 шлема в комплекте", clean: "В чистом состоянии",
      description: "Описание", transmission: "Трансмиссия", engine: "Двигатель", cc: "куб.",
      modalSub: "Даты аренды", submitBtn: "Отправить запрос",
      successTitle: "Запрос принят",
      successText: "Мы уже связываемся с владельцем. Вы можете закрыть приложение, мы пришлем уведомление в Telegram.",
      workingHours: "График: 10:00 — 22:00",
      close: "Закрыть", labelStart: "Начало", labelEnd: "Конец", total: "Дней:", sum: "Итого:",
      perDay: "в сутки", perDayLong: "от 2 суток",
    },
    en: {
      back: "Back", day: "1 day", month: "2+ days",
      btn: "Book Now", helmets: "2 helmets included", clean: "Clean condition",
      description: "Description", transmission: "Transmission", engine: "Engine", cc: "cc",
      modalSub: "Rental dates", submitBtn: "Send Request",
      successTitle: "Request Sent",
      successText: "We are contacting the owner. You can close the app; we will notify you via Telegram.",
      workingHours: "Hours: 10:00 AM — 10:00 PM",
      close: "Close", labelStart: "Start", labelEnd: "End", total: "Days:", sum: "Total:",
      perDay: "per day", perDayLong: "2+ days",
    }
  };

  if (!isReady || loading) return (
    <div className="min-h-screen bg-[#f4f5f7] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full" style={{ animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
  if (!bike) return <div className="p-10 text-gray-700 text-center bg-[#f4f5f7] min-h-screen font-bold uppercase">Bike not found</div>;

  const gallery = [bike.image, ...(bike.images_gallery ? bike.images_gallery.split(',').map((s: string) => s.trim()) : [])];

  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.targetTouches[0].clientX; };
  const onTouchMove  = (e: React.TouchEvent) => { touchEndX.current = e.targetTouches[0].clientX; };
  const onTouchEnd   = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 50  && activePhotoIndex < gallery.length - 1) setActivePhotoIndex(p => p + 1);
    if (distance < -50 && activePhotoIndex > 0) setActivePhotoIndex(p => p - 1);
    touchStartX.current = null; touchEndX.current = null;
  };

  const goPrev = () => { if (activePhotoIndex > 0) setActivePhotoIndex(p => p - 1); };
  const goNext = () => { if (activePhotoIndex < gallery.length - 1) setActivePhotoIndex(p => p + 1); };

  // Quick date helpers
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const addDays = (d: Date, n: number) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const quickRanges = [
    { ru: '3 дня',   en: '3 days',   days: 3  },
    { ru: '7 дней',  en: '7 days',   days: 7  },
    { ru: '14 дней', en: '14 days',  days: 14 },
    { ru: '30 дней', en: '30 days',  days: 30 },
  ];
  const applyQuick = (days: number) => {
    setStartDate(fmt(today));
    setEndDate(fmt(addDays(today, days)));
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,700;0,900;1,700;1,900&family=Barlow:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        body { background: #f4f5f7; }
        .font-display { font-family: 'Barlow Condensed', sans-serif; }
        .font-body    { font-family: 'Barlow', sans-serif; }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes modalIn { from { opacity:0; transform:scale(0.96) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }

        .fade-up   { animation: fadeUp 0.45s ease both; }
        .modal-in  { animation: modalIn 0.25s cubic-bezier(0.22,1,0.36,1) both; }

        .price-shimmer {
          background: linear-gradient(90deg, #16a34a 0%, #22c55e 45%, #16a34a 80%);
          background-size: 200%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s linear infinite;
        }

        .btn-press:active { transform: scale(0.96); }

        /* Hide scrollbar for thumbs */
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }

        /* Date input */
        input[type="date"] {
          -webkit-appearance: none;
          appearance: none;
        }
        input[type="date"]::-webkit-calendar-picker-indicator {
          opacity: 0.4;
          cursor: pointer;
        }

        /* Tag pills */
        .tag-pill {
          display: flex; align-items: center; gap: 6px;
          background: #f0fdf4; border: 1px solid #bbf7d0;
          color: #15803d; border-radius: 10px;
          padding: 6px 12px;
          font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em;
          font-family: 'Barlow Condensed', sans-serif;
        }
        .tag-pill-dot {
          width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
        }

        /* Gallery tap zones */
        .gallery-tap-left, .gallery-tap-right {
          position: absolute; top: 0; bottom: 0; width: 40%; z-index: 10;
          cursor: pointer;
        }
        .gallery-tap-left  { left: 0; }
        .gallery-tap-right { right: 0; }

        /* Arrow chevrons */
        .gallery-arrow {
          position: absolute; top: 50%; transform: translateY(-50%);
          width: 32px; height: 32px;
          background: rgba(255,255,255,0.85); backdrop-filter: blur(4px);
          border-radius: 50%; display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.18);
          opacity: 0; transition: opacity 0.2s;
          pointer-events: none;
        }
        .gallery-wrap:hover .gallery-arrow { opacity: 1; }
        .gallery-arrow-left  { left: 12px; }
        .gallery-arrow-right { right: 12px; }
        .gallery-arrow-left.hidden-arrow, .gallery-arrow-right.hidden-arrow { display: none; }

        /* Booking button */
        .book-btn {
          background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%);
          box-shadow: 0 4px 20px rgba(22,163,74,0.35);
        }
        .book-btn:hover { box-shadow: 0 6px 24px rgba(22,163,74,0.45); }

        /* Spec card */
        .spec-card {
          background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 16px; padding: 12px 16px;
        }

        /* Quick date btn */
        .quick-btn {
          flex: 1; padding: 8px 4px; border-radius: 10px;
          font-family: 'Barlow Condensed', sans-serif;
          font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;
          border: 1.5px solid #e5e7eb; background: white; color: #6b7280;
          cursor: pointer; transition: all 0.15s;
        }
        .quick-btn:hover { border-color: #16a34a; color: #15803d; background: #f0fdf4; }
        .quick-btn.active { border-color: #16a34a; background: #16a34a; color: white; }
      `}</style>

      <main className="min-h-screen bg-[#f4f5f7] text-gray-900 font-body flex flex-col items-center overflow-x-hidden">

        {/* ── NAV ─────────────────────────────────────────────────────── */}
        <nav className="fixed top-0 w-full z-[100] bg-white/90 backdrop-blur-xl h-14 flex items-center px-4"
          style={{ boxShadow: '0 1px 0 rgba(0,0,0,0.06), 0 2px 12px rgba(0,0,0,0.05)' }}>
          <Link href="/"
            className="btn-press flex items-center gap-1.5 bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-tighter text-gray-600 hover:bg-gray-200 transition-all">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            {t[lang].back}
          </Link>
        </nav>

        <div className="w-full max-w-lg px-4 pt-20 pb-12 fade-up">

          {/* ── GALLERY ───────────────────────────────────────────────── */}
          <div
            className="gallery-wrap relative aspect-[3/4] w-full rounded-[2rem] overflow-hidden shadow-xl mb-4 bg-gray-100 touch-none"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.14)' }}
          >
            {/* Sliding strip */}
            <div
              className="w-full h-full flex"
              style={{ transform: `translateX(-${activePhotoIndex * 100}%)`, transition: 'transform 0.4s cubic-bezier(0.22,1,0.36,1)' }}
            >
              {gallery.map((img, i) => (
                <img key={i} src={img} className="w-full h-full object-cover flex-shrink-0" alt={bike.model} />
              ))}
            </div>

            {/* Tap zones */}
            <div className="gallery-tap-left"  onClick={goPrev} />
            <div className="gallery-tap-right" onClick={goNext} />

            {/* Hover arrows (desktop) */}
            <div className={`gallery-arrow gallery-arrow-left ${activePhotoIndex === 0 ? 'hidden-arrow' : ''}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </div>
            <div className={`gallery-arrow gallery-arrow-right ${activePhotoIndex === gallery.length - 1 ? 'hidden-arrow' : ''}`}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </div>

            {/* Gradient + title */}
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 45%, transparent 70%)' }} />
            <div className="absolute bottom-6 left-6 pointer-events-none">
              <h1 className="font-display text-[42px] font-black uppercase italic leading-none tracking-wide text-white drop-shadow-lg">
                {bike.model}
              </h1>
              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-1.5">
                {bike.transmission} · {bike.engine} {lang === 'ru' ? 'куб.' : 'cc'}
              </p>
            </div>

            {/* Dots */}
            <div className="absolute bottom-4 right-5 flex gap-1.5 pointer-events-none">
              {gallery.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${activePhotoIndex === i ? 'w-5 bg-green-400' : 'w-1.5 bg-white/40'}`} />
              ))}
            </div>

            {/* Counter */}
            {gallery.length > 1 && (
              <div className="absolute top-4 right-4 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg text-[9px] font-bold text-white/70 pointer-events-none">
                {activePhotoIndex + 1} / {gallery.length}
              </div>
            )}
          </div>

          {/* ── THUMBNAILS ───────────────────────────────────────────── */}
          {gallery.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
              {gallery.map((img, idx) => (
                <button key={idx} onClick={() => setActivePhotoIndex(idx)}
                  className={`w-16 h-20 rounded-xl overflow-hidden flex-shrink-0 transition-all duration-200 ${
                    activePhotoIndex === idx
                      ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-[#f4f5f7] scale-95'
                      : 'opacity-50 hover:opacity-80'
                  }`}>
                  <img src={img} className="w-full h-full object-cover" alt="preview" />
                </button>
              ))}
            </div>
          )}

          {/* ── MAIN CARD ─────────────────────────────────────────────── */}
          <div className="bg-white rounded-[2rem] border border-gray-100 p-5 mb-4"
            style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.07)' }}>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 mb-5">
              <div className="tag-pill">
                <span className="tag-pill-dot bg-green-500" />
                {t[lang].helmets}
              </div>
              <div className="tag-pill" style={{ background:'#eff6ff', borderColor:'#bfdbfe', color:'#1d4ed8' }}>
                <span className="tag-pill-dot bg-blue-500" />
                {t[lang].clean}
              </div>
            </div>

            {/* Specs row */}
            <div className="grid grid-cols-2 gap-2 mb-5">
              <div className="spec-card text-center">
                <p className="text-[7px] text-gray-400 uppercase font-black tracking-wider mb-1 font-display">{t[lang].engine}</p>
                <p className="font-display text-[13px] font-black text-green-700 tracking-tight">{bike.engine} {t[lang].cc}</p>
              </div>
              <div className="spec-card text-center">
                <p className="text-[7px] text-gray-400 uppercase font-black tracking-wider mb-1 font-display">{t[lang].transmission}</p>
                <p className="font-display text-[12px] font-black text-gray-900 tracking-tight">{bike.transmission}</p>
              </div>
            </div>

            {/* Description */}
            {(bike.description_ru || bike.description_en) && (
              <div className="mb-5">
                <p className="text-[8px] text-gray-400 uppercase font-black tracking-[0.2em] mb-2 font-display">{t[lang].description}</p>
                <p className="text-[12px] text-gray-600 leading-relaxed">
                  {lang === 'ru' ? bike.description_ru : bike.description_en}
                </p>
              </div>
            )}

            {/* Price cards */}
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-center">
                <p className="text-[7px] text-gray-400 uppercase font-black tracking-widest mb-1 font-display">{t[lang].day}</p>
                <p className="font-display text-[18px] font-black italic text-gray-900 leading-none">{bike.price_day}</p>
                <p className="text-[9px] text-gray-400 mt-1">{calcUsd(bike.price_day)}</p>
              </div>
              <div className="bg-green-50 rounded-2xl p-4 border border-green-100 text-center">
                <p className="text-[7px] text-green-600 uppercase font-black tracking-widest mb-1 font-display">{t[lang].month}</p>
                <p className="font-display text-[18px] font-black italic price-shimmer leading-none">{bike.price_2days || bike.price_day}</p>
                <p className="text-[9px] text-green-400 mt-1">{calcUsd(bike.price_2days || bike.price_day)}</p>
              </div>
            </div>

            {/* Book button */}
            <button
              onClick={() => { setShowModal(true); setIsSubmitted(false); }}
              className="btn-press book-btn w-full py-4 rounded-2xl font-display font-black text-[12px] uppercase tracking-widest text-white transition-all"
            >
              {t[lang].btn}
            </button>
          </div>
        </div>

        {/* ── MODAL ─────────────────────────────────────────────────── */}
        {showModal && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />

            <div className="modal-in relative w-full max-w-sm bg-white rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl"
              style={{ maxHeight: '90vh', overflowY: 'auto' }}>

              {!isSubmitted ? (
                <form onSubmit={handleBooking}>
                  {/* Handle bar */}
                  <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5 sm:hidden" />

                  <div className="mb-5">
                    <h2 className="font-display text-2xl font-black uppercase italic tracking-tighter text-gray-900 leading-none">{bike.model}</h2>
                    <p className="text-[9px] text-gray-400 uppercase font-black tracking-widest mt-0.5 font-display">{t[lang].modalSub}</p>
                  </div>

                  {/* Quick ranges */}
                  <div className="flex gap-1.5 mb-4">
                    {quickRanges.map((r) => {
                      const isActive = startDate === fmt(today) && endDate === fmt(addDays(today, r.days));
                      return (
                        <button key={r.days} type="button" onClick={() => applyQuick(r.days)}
                          className={`quick-btn ${isActive ? 'active' : ''}`}>
                          {lang === 'ru' ? r.ru : r.en}
                        </button>
                      );
                    })}
                  </div>

                  {/* Date inputs */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200">
                      <label className="text-[8px] text-gray-400 uppercase font-black mb-1.5 block font-display tracking-wider">{t[lang].labelStart}</label>
                      <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                        className="w-full bg-transparent text-gray-900 outline-none font-bold text-[12px] font-body" />
                    </div>
                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-200">
                      <label className="text-[8px] text-gray-400 uppercase font-black mb-1.5 block font-display tracking-wider">{t[lang].labelEnd}</label>
                      <input required type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-transparent text-gray-900 outline-none font-bold text-[12px] font-body" />
                    </div>
                  </div>

                  {/* Summary */}
                  {totalDays() > 0 && (
                    <div className="bg-green-50 rounded-2xl p-4 mb-5 border border-green-100 flex items-center justify-between">
                      <div>
                        <p className="text-[8px] text-gray-500 uppercase font-black font-display">{t[lang].total}</p>
                        <p className="font-display text-xl font-black text-gray-900">{totalDays()} {lang === 'ru' ? 'дн.' : 'd.'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] text-green-600 uppercase font-black font-display">{t[lang].sum}</p>
                        <p className="font-display text-xl font-black price-shimmer tracking-tighter">{calculateTotalOrderPrice()} <span className="text-[10px] font-bold" style={{ WebkitTextFillColor: 'unset', background: 'none', WebkitBackgroundClip: 'unset' }}>₫</span></p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowModal(false)}
                      className="btn-press flex-1 bg-gray-100 border border-gray-200 py-3.5 rounded-xl text-[10px] font-black uppercase text-gray-500 font-display transition-all">
                      {t[lang].close}
                    </button>
                    <button type="submit" disabled={isSubmitting}
                      className="btn-press book-btn flex-[2] py-3.5 rounded-xl text-[10px] font-black uppercase text-white font-display transition-all">
                      {isSubmitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full inline-block" style={{ animation: 'spin 0.8s linear infinite' }} />
                          ...
                        </span>
                      ) : t[lang].submitBtn}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-4">
                  <div className="w-14 h-14 bg-green-100 border border-green-200 rounded-full flex items-center justify-center mx-auto mb-5">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                  </div>
                  <h2 className="font-display text-2xl font-black uppercase italic tracking-tight text-gray-900 mb-3">{t[lang].successTitle}</h2>
                  <p className="text-gray-500 text-[12px] leading-relaxed mb-4">{t[lang].successText}</p>
                  <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-6">
                    <p className="text-[9px] text-gray-400 font-black uppercase tracking-wider font-display">{t[lang].workingHours}</p>
                  </div>
                  <button onClick={() => setShowModal(false)}
                    className="btn-press w-full bg-gray-900 text-white py-3.5 rounded-xl text-[10px] font-black uppercase font-display tracking-widest transition-all hover:bg-green-600">
                    OK
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
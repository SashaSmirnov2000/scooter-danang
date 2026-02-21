"use client";
import { useState, useEffect } from 'react';
import { useParams } from "next/navigation";
import { supabase } from "../../supabase"; 
import Link from "next/link";

export default function BikePage() {
  const params = useParams();
  const [lang, setLang] = useState<'ru' | 'en'>('ru');
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
    const savedLang = localStorage.getItem('userLang') as 'ru' | 'en';
    if (savedLang) setLang(savedLang);

    // Подтягиваем реферала
    const savedRef = localStorage.getItem('referrer');
    if (savedRef) setRef(savedRef);

    async function loadBikeData() {
      const { data, error } = await supabase
        .from('scooters')
        .select('*')
        .eq('id', params.id)
        .single();

      if (!error) {
        setBike(data);
        setActivePhoto(data.image);
      }
      setLoading(false);
    }
    if (params.id) loadBikeData();
  }, [params.id]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const tg = (window as any).Telegram?.WebApp;
    const username = tg?.initDataUnsafe?.user?.username || 'web_user';

    const { error } = await supabase.from('bookings').insert([{
      bike_id: bike.id,
      bike_model: bike.model,
      start_date: startDate,
      end_date: endDate,
      client_username: username,
      referrer: ref // Теперь реферал не теряется
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
      back: "← Назад к списку", engine: "Объем", year: "Год", day: "В сутки", month: "В месяц", 
      btn: "Забронировать", included: "В стоимость включено:",
      modalSub: "Укажите даты аренды", submitBtn: "Отправить запрос",
      successTitle: "Заявка принята!", successText: "Мы уточняем наличие байка у владельца. Можете закрыть приложение, мы пришлем уведомление.",
      close: "Закрыть", features: ["2 защитных шлема", "Техподдержка 24/7", "Чистый байк"]
    },
    en: { 
      back: "← Back to catalog", engine: "Engine", year: "Year", day: "Per day", month: "Per month", 
      btn: "Book Now", included: "What's included:",
      modalSub: "Select rental dates", submitBtn: "Send Request",
      successTitle: "Sent!", successText: "We are checking bike availability. You can close the app now, we will notify you shortly.",
      close: "Close", features: ["2 Helmets", "24/7 Support", "Clean condition"]
    }
  };

  if (loading) return <div className="min-h-screen bg-[#05070a] flex items-center justify-center text-white italic uppercase tracking-widest">Loading...</div>;
  if (!bike) return <div className="p-10 text-white text-center bg-[#05070a] min-h-screen">Bike not found</div>;

  const gallery = [bike.image];
  if (bike.images_gallery) {
    const extra = bike.images_gallery.split(',').map((s: string) => s.trim());
    gallery.push(...extra);
  }

  return (
    <main className="min-h-screen bg-[#05070a] text-white font-sans pb-20 selection:bg-green-500/30">
      
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-[100] bg-[#05070a]/80 backdrop-blur-xl border-b border-white/5 h-20 flex items-center px-8">
        <Link href="/" className="text-gray-500 hover:text-white transition-colors uppercase text-[10px] font-black tracking-[0.2em]">
          {t[lang].back}
        </Link>
      </nav>

      <div className="max-w-6xl mx-auto px-6 pt-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start text-left">
          
          {/* Gallery */}
          <div className="space-y-6">
            <div className="aspect-[4/3] rounded-[2.5rem] overflow-hidden bg-[#11141b] border border-white/5 shadow-2xl">
              <img src={activePhoto} className="w-full h-full object-contain p-8" alt={bike.model} />
            </div>
            {gallery.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                {gallery.map((img, idx) => (
                  <button key={idx} onClick={() => setActivePhoto(img)} className={`relative w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0 border-2 transition-all ${activePhoto === img ? 'border-green-500 scale-95' : 'border-transparent opacity-40'}`}>
                    <img src={img} className="w-full h-full object-cover" alt="preview" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex flex-col">
            <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter mb-4 leading-none">{bike.model}</h1>
            
            <div className="flex gap-3 mb-8">
              <span className="bg-green-500/10 px-4 py-2 rounded-xl border border-green-500/20 text-[10px] font-black text-green-500 uppercase tracking-widest">{bike.engine}CC</span>
              <span className="bg-white/5 px-4 py-2 rounded-xl border border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-400">{bike.year}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-[#11141b] p-6 rounded-[2rem] border border-white/5 shadow-inner">
                <p className="text-[9px] text-gray-500 uppercase font-black mb-1">{t[lang].day}</p>
                <p className="text-2xl font-bold">{bike.price_day}</p>
              </div>
              <div className="bg-[#11141b] p-6 rounded-[2rem] border border-green-500/20 shadow-inner">
                <p className="text-[9px] text-green-500 uppercase font-black mb-1">{t[lang].month}</p>
                <p className="text-2xl font-bold text-green-400">{bike.price_month}</p>
              </div>
            </div>

            <div className="bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5 mb-10">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-gray-500">{t[lang].included}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {t[lang].features.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs font-bold uppercase tracking-tight">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
                    {f}
                  </div>
                ))}
              </div>
            </div>

            <button 
              onClick={() => {setShowModal(true); setIsSubmitted(false);}}
              className="w-full bg-green-600 hover:bg-green-500 py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.3em] transition-all shadow-[0_20px_40px_rgba(22,101,52,0.2)] active:scale-95 text-white"
            >
              {t[lang].btn}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL WINDOW */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-end justify-center p-4">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md bg-[#11141b] border border-white/10 rounded-[3rem] p-8 animate-in slide-in-from-bottom duration-300 shadow-2xl">
            {!isSubmitted ? (
              <form onSubmit={handleBooking} className="text-left">
                <h2 className="text-2xl font-black mb-1 uppercase italic text-white leading-tight">{bike.model}</h2>
                <p className="text-gray-500 text-[9px] uppercase font-black tracking-widest mb-10">{t[lang].modalSub}</p>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase font-black ml-5 block mb-2 tracking-widest">Дата начала</label>
                    <input required type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} 
                    className="w-full bg-[#1c1f26] border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-green-500 transition-all font-bold" 
                    style={{ colorScheme: 'dark' }} />
                  </div>
                  <div>
                    <label className="text-[9px] text-gray-500 uppercase font-black ml-5 block mb-2 tracking-widest">Дата окончания</label>
                    <input required type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} 
                    className="w-full bg-[#1c1f26] border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-green-500 transition-all font-bold" 
                    style={{ colorScheme: 'dark' }} />
                  </div>
                </div>

                <div className="flex gap-4 mt-10">
                  <button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-white/5 py-5 rounded-2xl text-[10px] font-black uppercase text-gray-400 tracking-widest">
                    {t[lang].close}
                  </button>
                  <button type="submit" disabled={isSubmitting} className="flex-[2] bg-green-600 py-5 rounded-2xl text-[10px] font-black uppercase text-white tracking-widest shadow-lg shadow-green-900/40 active:scale-95">
                    {isSubmitting ? '...' : t[lang].submitBtn}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-10">
                <div className="w-24 h-24 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                  <span className="text-4xl text-green-500">✓</span>
                </div>
                <h2 className="text-2xl font-black mb-4 uppercase italic text-white tracking-tight">{t[lang].successTitle}</h2>
                <p className="text-gray-400 text-xs font-medium px-6 mb-10 leading-relaxed italic">{t[lang].successText}</p>
                <button onClick={() => setShowModal(false)} className="w-full bg-white/5 border border-white/10 py-5 rounded-2xl text-[10px] font-black uppercase text-white tracking-widest">{t[lang].close}</button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
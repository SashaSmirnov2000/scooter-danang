"use client";
import { useState, useEffect } from 'react';
import { useParams } from "next/navigation";
import { scooters } from "../../data";
import Link from "next/link";

export default function BikePage() {
  const params = useParams();
  const [lang, setLang] = useState<'ru' | 'en'>('ru');
  
  // Читаем язык из памяти браузера
  useEffect(() => {
    const saved = localStorage.getItem('userLang') as 'ru' | 'en';
    if (saved) setLang(saved);
  }, []);

  // Функция смены языка с сохранением
  const toggleLang = () => {
    const newLang = lang === 'ru' ? 'en' : 'ru';
    setLang(newLang);
    localStorage.setItem('userLang', newLang);
  };

  const bike = scooters.find((s: any) => s.id === Number(params.id));

  const t = {
    ru: { 
      back: "← Назад", 
      engine: "Двигатель", 
      year: "Год выпуска", 
      fuel: "Расход", 
      day: "В сутки", 
      month: "В месяц", 
      btn: "Забронировать в WhatsApp", 
      notFound: "Байк не найден", 
      msg: "Здравствуйте! Хочу забронировать" 
    },
    en: { 
      back: "← Back", 
      engine: "Engine", 
      year: "Year", 
      fuel: "Fuel", 
      day: "Per day", 
      month: "Per month", 
      btn: "Book via WhatsApp", 
      notFound: "Bike not found", 
      msg: "Hello! I want to book" 
    }
  };

  if (!bike) return <div className="p-10 text-white text-center font-sans">{t[lang].notFound}</div>;

  return (
    <main className="min-h-screen bg-[#0b0f1a] text-white p-6 font-sans">
      <div className="max-w-4xl mx-auto">
        
        {/* Навигация и Язык */}
        <div className="flex justify-between items-center mb-10">
          <Link href="/" className="text-green-400 font-bold uppercase text-[10px] tracking-widest hover:opacity-70 transition-opacity">
            {t[lang].back}
          </Link>
          <button 
            onClick={toggleLang} 
            className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-[10px] font-bold uppercase hover:bg-white/10 transition-colors"
          >
            {lang === 'ru' ? 'English' : 'Русский'}
          </button>
        </div>
        
        <h1 className="text-4xl md:text-7xl font-black mb-8 italic uppercase tracking-tighter text-center leading-tight">
          {bike.model}
        </h1>
        
        <div className="bg-[#161d2f] rounded-[3rem] p-6 mb-10 border border-white/5 shadow-2xl text-center overflow-hidden">
          <img 
            src={bike.image} 
            className="max-w-full h-auto max-h-[400px] object-contain mx-auto transition-transform duration-500 hover:scale-105" 
            alt={bike.model} 
          />
        </div>

        {/* Характеристики */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="bg-[#1c2539] p-4 rounded-[2rem] border border-white/5 flex flex-col items-center">
            <span className="text-[9px] uppercase text-white/40 font-bold mb-1 tracking-wider">{t[lang].engine}</span>
            <span className="font-black text-sm uppercase italic">{bike.engine || "—"}</span>
          </div>
          <div className="bg-[#1c2539] p-4 rounded-[2rem] border border-white/5 flex flex-col items-center">
            <span className="text-[9px] uppercase text-white/40 font-bold mb-1 tracking-wider">{t[lang].year}</span>
            <span className="font-black text-sm uppercase italic">{bike.year || "—"}</span>
          </div>
          <div className="bg-[#1c2539] p-4 rounded-[2rem] border border-white/5 flex flex-col items-center">
            <span className="text-[9px] uppercase text-white/40 font-bold mb-1 tracking-wider">{t[lang].fuel}</span>
            <span className="font-black text-sm uppercase italic">{bike.fuel || "—"}</span>
          </div>
        </div>
        
        {/* Цены */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-[#161d2f] p-8 rounded-[2.5rem] border border-white/5 text-center shadow-xl">
            <span className="text-4xl font-black">{bike.price}</span>
            <p className="text-[10px] text-white/30 uppercase font-bold mt-2 tracking-widest">{t[lang].day}</p>
          </div>
          <div className="bg-[#161d2f] p-8 rounded-[2.5rem] border border-green-500/20 text-center shadow-lg relative overflow-hidden">
             <div className="absolute top-0 right-0 bg-green-500 text-[8px] font-black px-3 py-1 rounded-bl-xl uppercase text-black">Best Price</div>
            <span className="text-4xl font-black text-green-400">{bike.priceMonth}</span>
            <p className="text-[10px] text-green-400/30 uppercase font-bold mt-2 tracking-widest">{t[lang].month}</p>
          </div>
        </div>

        {/* Кнопка WhatsApp */}
        <a 
          href={`https://wa.me/${bike.phone}?text=${t[lang].msg} ${bike.model}`}
          target="_blank"
          className="w-full bg-green-600 hover:bg-green-500 text-white flex items-center justify-center py-6 rounded-[2.5rem] font-black text-lg md:text-xl uppercase transition-all shadow-lg shadow-green-900/40 active:scale-95"
        >
          {t[lang].btn}
        </a>
      </div>
    </main>
  );
}
"use client";
import { useState, useEffect } from 'react';
import { supabase } from "../supabase";

export default function AdminPage() {
    const [scooters, setScooters] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // БЕЗОПАСНОСТЬ
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const SECRET_CODE = '2109'; // ПОМЕНЯЙ ЭТОТ КОД НА СВОЙ

    // Поля для нового байка
    const [model, setModel] = useState('');
    const [priceDay, setPriceDay] = useState('');
    const [priceMonth, setPriceMonth] = useState('');
    const [image, setImage] = useState('');
    const [imagesGallery, setImagesGallery] = useState(''); 
    const [engine, setEngine] = useState('');
    const [year, setYear] = useState('');
    const [vendorPhone, setVendorPhone] = useState('84'); 

    useEffect(() => {
        if (isAuthenticated) {
            fetchScooters();
        }
    }, [isAuthenticated]);

    async function fetchScooters() {
        const { data } = await supabase.from('scooters').select('*').order('id', { ascending: false });
        if (data) setScooters(data);
        setLoading(false);
    }

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === SECRET_CODE) {
            setIsAuthenticated(true);
        } else {
            alert('Неверный код доступа!');
            setPassword('');
        }
    };

    async function addScooter(e: React.FormEvent) {
        e.preventDefault();
        const { error } = await supabase.from('scooters').insert([
            { 
                model, 
                price_day: priceDay, 
                price_month: priceMonth, 
                image, 
                images_gallery: imagesGallery, 
                engine, 
                year,
                vendor_phone: vendorPhone 
            }
        ]);

        if (error) {
            alert('Ошибка при добавлении: ' + error.message);
        } else {
            alert('Байк успешно добавлен!');
            setModel(''); setPriceDay(''); setPriceMonth(''); setImage('');
            setImagesGallery(''); setEngine(''); setYear('');
            fetchScooters();
        }
    }

    async function deleteScooter(id: number) {
        if (!confirm('Точно удалить этот байк?')) return;
        const { error } = await supabase.from('scooters').delete().eq('id', id);
        if (error) {
            alert('Ошибка при удалении');
        } else {
            setScooters(scooters.filter(s => s.id !== id));
        }
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#05070a] flex items-center justify-center p-4">
                <form onSubmit={handleLogin} className="bg-[#11141b] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl w-full max-w-sm text-center">
                    <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <span className="text-2xl">🔐</span>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-widest">Admin Access</h2>
                    <input 
                        type="password" 
                        placeholder="••••" 
                        className="w-full bg-black/40 p-4 rounded-2xl text-white border border-white/10 focus:border-green-500 outline-none mb-6 text-center text-2xl tracking-[0.5em]"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoFocus
                    />
                    <button type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-2xl transition-all uppercase text-[10px] tracking-[0.2em]">
                        Войти в систему
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#05070a] text-white p-8 font-sans">
            <div className="max-w-5xl mx-auto">
                <div className="flex justify-between items-end mb-12">
                    <div>
                        <p className="text-green-500 text-[10px] font-black tracking-[0.3em] uppercase mb-2">Management</p>
                        <h1 className="text-4xl font-bold italic uppercase">Админ-панель</h1>
                    </div>
                    <button onClick={() => setIsAuthenticated(false)} className="bg-white/5 px-6 py-2 rounded-xl text-[10px] font-bold uppercase hover:bg-red-500/20 hover:text-red-500 transition-all border border-white/5">
                        Выйти
                    </button>
                </div>

                <form onSubmit={addScooter} className="bg-[#11141b] p-8 rounded-[2.5rem] mb-16 border border-white/5 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500">Добавить байк</h3>
                    </div>
                    <input className="bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white" placeholder="Модель" value={model} onChange={e => setModel(e.target.value)} required />
                    <input className="bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white" placeholder="WhatsApp" value={vendorPhone} onChange={e => setVendorPhone(e.target.value)} required />
                    <input className="bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white" placeholder="Цена день" value={priceDay} onChange={e => setPriceDay(e.target.value)} required />
                    <input className="bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white" placeholder="Цена месяц" value={priceMonth} onChange={e => setPriceMonth(e.target.value)} required />
                    <input className="bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white" placeholder="Объем cc" value={engine} onChange={e => setEngine(e.target.value)} />
                    <input className="bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white" placeholder="Год" value={year} onChange={e => setYear(e.target.value)} />
                    <input className="md:col-span-2 bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white" placeholder="Главное фото (URL)" value={image} onChange={e => setImage(e.target.value)} required />
                    <textarea className="md:col-span-2 bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white h-24 resize-none" placeholder="Галерея (через запятую)" value={imagesGallery} onChange={e => setImagesGallery(e.target.value)} />
                    <button type="submit" className="md:col-span-2 bg-green-600 hover:bg-green-500 p-5 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all text-white">
                        Опубликовать
                    </button>
                </form>

                <div className="grid gap-4">
                    {loading ? <p>Загрузка...</p> : scooters.map(s => (
                        <div key={s.id} className="bg-[#11141b] p-4 rounded-[2rem] flex justify-between items-center border border-white/5">
                            <div className="flex items-center gap-4">
                                <img src={s.image} className="w-12 h-12 object-cover rounded-xl" alt="" />
                                <p className="font-bold uppercase italic">{s.model}</p>
                            </div>
                            <button onClick={() => deleteScooter(s.id)} className="text-red-500 text-[10px] font-bold uppercase border border-red-500/20 px-4 py-2 rounded-xl hover:bg-red-500 hover:text-white transition-all">Удалить</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
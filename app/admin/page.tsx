"use client";
import { useState, useEffect } from 'react';
import { supabase } from "../supabase";

const COMMISSION_PER_ORDER = 50000;

export default function AdminPage() {
    const [scooters, setScooters] = useState<any[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [partners, setPartners] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'bikes' | 'bookings' | 'partners'>('bookings');
    
    // БЕЗОПАСНОСТЬ
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [adminPassword, setAdminPassword] = useState('');

    // Состояние редактирования
    const [editingId, setEditingId] = useState<number | null>(null);

    // Поля формы
    const [model, setModel] = useState('');
    const [priceDay, setPriceDay] = useState('');
    const [price2Days, setPrice2Days] = useState(''); 
    const [priceMonth, setPriceMonth] = useState('');
    const [image, setImage] = useState('');
    const [imagesGallery, setImagesGallery] = useState(''); 
    const [engine, setEngine] = useState('');
    const [transmission, setTransmission] = useState('Автомат');
    const [noLicense, setNoLicense] = useState(false); // НОВОЕ
    const [descriptionRu, setDescriptionRu] = useState('');
    const [descriptionEn, setDescriptionEn] = useState('');
    const [vendorPhone, setVendorPhone] = useState('84'); 
    const [mapUrl, setMapUrl] = useState(''); 

    useEffect(() => {
        if (isAuthenticated) {
            fetchData();
        }
    }, [isAuthenticated, activeTab]);

    async function fetchData() {
        setLoading(true);
        try {
            if (activeTab === 'bikes') {
                const { data } = await supabase.from('scooters').select('*').order('id', { ascending: false });
                if (data) setScooters(data);
            } else if (activeTab === 'bookings') {
                const { data } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
                if (data) setBookings(data);
            } else if (activeTab === 'partners') {
                const { data: pData } = await supabase.from('partners').select('*').neq('name', 'admin');
                const { data: bData } = await supabase.from('bookings').select('referrer').eq('status', 'completed');
                
                if (pData) {
                    const partnersWithStats = pData.map(p => {
                        const count = bData?.filter(b => b.referrer === p.name).length || 0;
                        return { ...p, paidCount: count, balance: count * COMMISSION_PER_ORDER };
                    });
                    setPartners(partnersWithStats);
                }
            }
        } catch (error) {
            console.error("Ошибка загрузки:", error);
        }
        setLoading(false);
    }

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        const correctPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD;
        if (adminPassword === correctPassword) {
            setIsAuthenticated(true);
        } else {
            alert('Неверный пароль админа!');
            setAdminPassword('');
        }
    };

    const startEdit = (scooter: any) => {
        setEditingId(scooter.id);
        setModel(scooter.model);
        setPriceDay(scooter.price_day);
        setPrice2Days(scooter.price_2days || ''); 
        setPriceMonth(scooter.price_month);
        setImage(scooter.image);
        setImagesGallery(scooter.images_gallery || '');
        setEngine(scooter.engine || '');
        setTransmission(scooter.transmission || 'Автомат');
        setNoLicense(scooter.no_license || false); // НОВОЕ
        setDescriptionRu(scooter.description_ru || '');
        setDescriptionEn(scooter.description_en || '');
        setVendorPhone(scooter.vendor_phone || '84');
        setMapUrl(scooter.map_url || ''); 
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setEditingId(null);
        resetForm();
    };

    const resetForm = () => {
        setModel(''); setPriceDay(''); setPrice2Days(''); setPriceMonth(''); setImage('');
        setImagesGallery(''); setEngine(''); setTransmission('Автомат');
        setNoLicense(false); // НОВОЕ
        setDescriptionRu(''); setDescriptionEn(''); setVendorPhone('84'); setMapUrl('');
    };

    async function handleSubmitScooter(e: React.FormEvent) {
        e.preventDefault();
        const scooterData = { 
            model, 
            price_day: priceDay, 
            price_2days: price2Days, 
            price_month: priceMonth, 
            image, 
            images_gallery: imagesGallery, 
            engine, 
            transmission,
            no_license: noLicense, // НОВОЕ
            description_ru: descriptionRu,
            description_en: descriptionEn,
            vendor_phone: vendorPhone,
            map_url: mapUrl 
        };

        if (editingId) {
            const { error } = await supabase.from('scooters').update(scooterData).eq('id', editingId);
            if (error) alert('Ошибка обновления: ' + error.message);
            else {
                alert('Байк обновлен!');
                setEditingId(null);
                resetForm();
                fetchData();
            }
        } else {
            const { error } = await supabase.from('scooters').insert([scooterData]);
            if (error) alert('Ошибка добавления: ' + error.message);
            else {
                alert('Байк добавлен!');
                resetForm();
                fetchData();
            }
        }
    }

    async function deleteScooter(id: number) {
        if (!confirm('Точно удалить этот байк?')) return;
        const { error } = await supabase.from('scooters').delete().eq('id', id);
        if (!error) fetchData();
    }

    async function markAsPaid(id: string) {
        const { error } = await supabase.from('bookings').update({ status: 'completed' }).eq('id', id);
        if (!error) fetchData();
    }

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#05070a] flex items-center justify-center p-4 text-white font-sans">
                <form onSubmit={handleLogin} className="bg-[#11141b] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl w-full max-w-sm text-center">
                    <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <span className="text-2xl">🔐</span>
                    </div>
                    <h2 className="text-xl font-bold mb-6 uppercase tracking-widest italic">Admin Access</h2>
                    <input 
                        type="password" 
                        placeholder="••••" 
                        className="w-full bg-black/40 p-4 rounded-2xl text-white border border-white/10 focus:border-green-500 outline-none mb-6 text-center text-2xl tracking-[0.5em]"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
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
        <div className="min-h-screen bg-[#05070a] text-white p-4 md:p-8 font-sans">
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
                    <div>
                        <p className="text-green-500 text-[10px] font-black tracking-[0.3em] uppercase mb-2">Management</p>
                        <h1 className="text-4xl font-bold italic uppercase">Админ-панель</h1>
                    </div>
                    
                    <div className="flex bg-[#11141b] p-1 rounded-2xl border border-white/5 overflow-x-auto">
                        <button onClick={() => setActiveTab('bookings')} className={`px-4 md:px-6 py-3 rounded-xl text-[10px] font-bold uppercase transition-all whitespace-nowrap ${activeTab === 'bookings' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}>Заявки</button>
                        <button onClick={() => setActiveTab('partners')} className={`px-4 md:px-6 py-3 rounded-xl text-[10px] font-bold uppercase transition-all whitespace-nowrap ${activeTab === 'partners' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}>Партнеры</button>
                        <button onClick={() => setActiveTab('bikes')} className={`px-4 md:px-6 py-3 rounded-xl text-[10px] font-bold uppercase transition-all whitespace-nowrap ${activeTab === 'bikes' ? 'bg-green-600 text-white' : 'text-gray-400 hover:text-white'}`}>Байки</button>
                    </div>
                </div>

                {activeTab === 'bookings' && (
                    <div className="grid gap-4">
                        <div className="flex justify-between items-center mb-4 text-sm font-bold uppercase tracking-widest text-gray-500 italic">Последние бронирования <button onClick={fetchData} className="text-[10px] text-green-500">Обновить 🔄</button></div>
                        {loading ? <p>Загрузка...</p> : bookings.length === 0 ? <p className="text-gray-500 italic text-center">Заявок пока нет</p> : bookings.map(b => (
                            <div key={b.id} className={`p-6 rounded-[2rem] border transition-all flex flex-col md:flex-row justify-between items-center gap-6 ${b.status === 'completed' ? 'bg-green-500/5 border-green-500/20' : 'bg-[#11141b] border-white/5'}`}>
                                <div className="text-center md:text-left">
                                    <div className="flex items-center gap-3 mb-2 justify-center md:justify-start">
                                        <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${b.status === 'completed' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-black'}`}>{b.status === 'completed' ? 'Оплачено' : 'Ожидает'}</span>
                                        <span className="text-[10px] text-gray-500">@{b.client_username}</span>
                                    </div>
                                    <h4 className="text-xl font-bold uppercase italic">{b.bike_model}</h4>
                                    <p className="text-gray-500 text-[11px] uppercase tracking-wider">{b.start_date} — {b.end_date}</p>
                                    {b.referrer && <p className="text-[10px] text-blue-500 font-bold uppercase mt-2 italic">Партнер: {b.referrer}</p>}
                                </div>
                                {b.status === 'pending' && (
                                    <button onClick={() => markAsPaid(b.id)} className="bg-green-600 hover:bg-green-500 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all">Подтвердить оплату ✅</button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'partners' && (
                    <div className="grid gap-4">
                        <div className="flex justify-between items-center mb-4 text-sm font-bold uppercase tracking-widest text-gray-500 italic">Список партнеров и балансы <button onClick={fetchData} className="text-[10px] text-green-500">Обновить 🔄</button></div>
                        {loading ? <p>Загрузка...</p> : partners.length === 0 ? <p className="text-gray-500 italic text-center">Партнеров пока нет</p> : partners.map(p => (
                            <div key={p.id} className="bg-[#11141b] p-6 rounded-[2rem] border border-white/5 flex justify-between items-center">
                                <div>
                                    <p className="text-green-500 font-black uppercase text-lg italic tracking-widest">{p.name}</p>
                                    <p className="text-gray-500 text-[10px] uppercase mt-1">Пароль: {p.password}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold italic">{p.balance.toLocaleString()} VND</div>
                                    <div className="text-[9px] text-gray-500 uppercase font-black tracking-tighter">Выполнено заказов: {p.paidCount}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'bikes' && (
                    <>
                        <form onSubmit={handleSubmitScooter} className="bg-[#11141b] p-8 rounded-[2.5rem] mb-16 border border-white/5 shadow-xl grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2 flex justify-between items-center">
                                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 italic">{editingId ? 'Редактировать байк' : 'Добавить новый байк'}</h3>
                                {editingId && <button type="button" onClick={cancelEdit} className="text-red-500 text-[10px] font-bold uppercase tracking-widest">Отмена ❌</button>}
                            </div>
                            <input className="bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white" placeholder="Модель (напр. Honda Vision)" value={model} onChange={e => setModel(e.target.value)} required />
                            <input className="bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white" placeholder="WhatsApp (напр. 84123456789)" value={vendorPhone} onChange={e => setVendorPhone(e.target.value)} required />
                            <input className="bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white" placeholder="Цена день (напр. 150.000)" value={priceDay} onChange={e => setPriceDay(e.target.value)} required />
                            <input className="bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white" placeholder="Цена от 2 дней (напр. 130.000)" value={price2Days} onChange={e => setPrice2Days(e.target.value)} />
                            <input className="bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white" placeholder="Цена месяц (напр. 3.000.000)" value={priceMonth} onChange={e => setPriceMonth(e.target.value)} required />
                            <input className="bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white" placeholder="Объем cc (напр. 125)" value={engine} onChange={e => setEngine(e.target.value)} />
                            
                            <div className="flex items-center gap-4 bg-black/40 p-4 rounded-2xl border border-white/5">
                                <select 
                                    className="bg-transparent flex-1 outline-none text-white cursor-pointer"
                                    value={transmission}
                                    onChange={e => setTransmission(e.target.value)}
                                >
                                    <option value="Автомат">Автомат</option>
                                    <option value="Механика">Механика</option>
                                    <option value="Полуавтомат">Полуавтомат</option>
                                    <option value="Электро">Электро</option>
                                </select>
                                <label className="flex items-center gap-2 cursor-pointer border-l border-white/10 pl-4">
                                    <input 
                                        type="checkbox" 
                                        checked={noLicense} 
                                        onChange={e => setNoLicense(e.target.checked)}
                                        className="w-4 h-4 accent-green-500"
                                    />
                                    <span className="text-[10px] font-bold uppercase text-gray-400">Без прав</span>
                                </label>
                            </div>

                            <input className="md:col-span-2 bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white" placeholder="Ссылка на Google Maps" value={mapUrl} onChange={e => setMapUrl(e.target.value)} />
                            <input className="md:col-span-2 bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white" placeholder="Главное фото (URL)" value={image} onChange={e => setImage(e.target.value)} required />
                            <textarea className="md:col-span-2 bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white h-20 resize-none" placeholder="Галерея (ссылки через запятую)" value={imagesGallery} onChange={e => setImagesGallery(e.target.value)} />
                            
                            <textarea className="bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white h-32 resize-none" placeholder="Описание (RU)" value={descriptionRu} onChange={e => setDescriptionRu(e.target.value)} />
                            <textarea className="bg-black/40 p-4 rounded-2xl outline-none border border-white/5 focus:border-green-500 text-white h-32 resize-none" placeholder="Description (EN)" value={descriptionEn} onChange={e => setDescriptionEn(e.target.value)} />

                            <button type="submit" className={`md:col-span-2 p-5 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all text-white ${editingId ? 'bg-blue-600 hover:bg-blue-500' : 'bg-green-600 hover:bg-green-500'}`}>
                                {editingId ? 'Сохранить изменения' : 'Опубликовать байк'}
                            </button>
                        </form>

                        <div className="grid gap-4">
                            {loading ? <p>Загрузка...</p> : scooters.map(s => (
                                <div key={s.id} className="bg-[#11141b] p-4 rounded-[2rem] flex justify-between items-center border border-white/5">
                                    <div className="flex items-center gap-4">
                                        <img src={s.image} className="w-12 h-12 object-cover rounded-xl shadow-lg" alt="" />
                                        <div>
                                            <p className="font-bold uppercase italic text-sm">{s.model} {s.no_license && <span className="text-green-500 ml-2">✓</span>}</p>
                                            <p className="text-[9px] text-gray-500 uppercase">{s.transmission} • {s.engine}cc</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => startEdit(s)} className="text-blue-500 text-[10px] font-bold uppercase border border-blue-500/20 px-4 py-2 rounded-xl hover:bg-blue-500 hover:text-white transition-all">Правка</button>
                                        <button onClick={() => deleteScooter(s.id)} className="text-red-500 text-[10px] font-bold uppercase border border-red-500/20 px-4 py-2 rounded-xl hover:bg-red-500 hover:text-white transition-all">Удалить</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                <div className="mt-20 text-center">
                    <button onClick={() => setIsAuthenticated(false)} className="text-[10px] font-black uppercase text-gray-600 hover:text-red-500 transition-all tracking-[0.3em]">Logout System _</button>
                </div>
            </div>
        </div>
    );
}
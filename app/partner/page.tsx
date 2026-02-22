'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function PartnerCabinet() {
  const [refName, setRefName] = useState('');
  const [password, setPassword] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // 1. Проверяем партнера в специальной таблице partners
    const { data: partner, error: pError } = await supabase
      .from('partners')
      .select('name, password')
      .eq('name', refName.trim())
      .eq('password', password.trim())
      .maybeSingle();

    if (pError || !partner) {
      setError('Неверный логин или пароль / Wrong name or password');
      setLoading(false);
      return;
    }

    // 2. Считаем клики (сколько людей в users имеют этот referrer)
    const { count: clicksCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('referrer', partner.name);

    // 3. Считаем оплаченные заказы в таблице bookings (status = completed)
    const { count: paidCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('referrer', partner.name)
      .eq('status', 'completed');

    setStats({
      name: partner.name,
      clicks: clicksCount || 0,
      paid: paidCount || 0
    });
    setLoading(false);
  };

  if (!stats) {
    return (
      <div style={{ maxWidth: '400px', margin: '100px auto', padding: '25px', textAlign: 'center', fontFamily: 'sans-serif', backgroundColor: '#fff', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <h2 style={{ marginBottom: '10px' }}>Partner Login</h2>
        <p style={{ color: '#888', marginBottom: '25px', fontSize: '14px' }}>Введите данные для доступа к статистике</p>
        <form onSubmit={handleLogin}>
          <input 
            type="text" 
            placeholder="Ник рефки (Ref name)" 
            value={refName}
            onChange={(e) => setRefName(e.target.value)}
            style={{ width: '100%', padding: '14px', marginBottom: '12px', borderRadius: '10px', border: '1px solid #eee', boxSizing: 'border-box', backgroundColor: '#f9f9f9' }}
            required
          />
          <input 
            type="password" 
            placeholder="Пароль" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '14px', marginBottom: '20px', borderRadius: '10px', border: '1px solid #eee', boxSizing: 'border-box', backgroundColor: '#f9f9f9' }}
            required
          />
          <button 
            type="submit" 
            disabled={loading}
            style={{ width: '100%', padding: '14px', background: '#000', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}
          >
            {loading ? 'Вход...' : 'Войти в кабинет'}
          </button>
        </form>
        {error && <p style={{ color: '#ff4d4f', marginTop: '15px', fontSize: '13px' }}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '500px', margin: '60px auto', padding: '30px', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'left', marginBottom: '40px' }}>
        <h1 style={{ margin: '0', fontSize: '28px' }}>Статистика: {stats.name}</h1>
        <p style={{ color: '#666', marginTop: '5px' }}>Обновляется в реальном времени</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' }}>
        <div style={{ background: '#fff', padding: '25px', borderRadius: '20px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', border: '1px solid #f0f0f0' }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#000' }}>{stats.clicks}</div>
          <div style={{ fontSize: '14px', color: '#888', marginTop: '8px' }}>Переходов (Clicks)</div>
        </div>
        <div style={{ background: '#000', padding: '25px', borderRadius: '20px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#fff' }}>{stats.paid}</div>
          <div style={{ fontSize: '14px', color: '#aaa', marginTop: '8px' }}>Оплаты (Paid)</div>
        </div>
      </div>

      <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '15px', border: '1px dashed #ccc' }}>
        <p style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 'bold', color: '#555' }}>Ваша партнерская ссылка:</p>
        <code style={{ fontSize: '14px', color: '#000', wordBreak: 'break-all', backgroundColor: '#eee', padding: '4px 8px', borderRadius: '5px' }}>
          https://t.me/ВАШ_БОТ?start={stats.name}
        </code>
      </div>

      <button 
        onClick={() => setStats(null)} 
        style={{ width: '100%', marginTop: '50px', background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '14px', textDecoration: 'underline' }}
      >
        Выйти из системы
      </button>
    </div>
  );
}
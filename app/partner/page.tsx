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
  const [copied, setCopied] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Очищаем пробелы и приводим логин к нижнему регистру для надежности
    const cleanName = refName.trim().toLowerCase();
    const cleanPass = password.trim();

    // 1. Проверяем партнера
    const { data: partner, error: pError } = await supabase
      .from('partners')
      .select('name, password')
      .eq('name', cleanName)
      .eq('password', cleanPass)
      .maybeSingle();

    if (pError) {
      console.error('Supabase error:', pError);
      setError('Ошибка базы данных. Проверьте RLS политики.');
      setLoading(false);
      return;
    }

    if (!partner) {
      setError('Неверный логин или пароль');
      setLoading(false);
      return;
    }

    // 2. Считаем клики и оплаты
    const [clicks, paid] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('referrer', partner.name),
      supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('referrer', partner.name).eq('status', 'completed')
    ]);

    setStats({
      name: partner.name,
      clicks: clicks.count || 0,
      paid: paid.count || 0
    });
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!stats) {
    return (
      <div style={{ maxWidth: '400px', margin: '100px auto', padding: '25px', textAlign: 'center', fontFamily: 'sans-serif', backgroundColor: '#fff', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <h2 style={{ marginBottom: '10px' }}>Partner Login</h2>
        <p style={{ color: '#888', marginBottom: '25px', fontSize: '14px' }}>Введите данные для доступа</p>
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
            style={{ width: '100%', padding: '14px', background: '#000', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {loading ? 'Вход...' : 'Войти в кабинет'}
          </button>
        </form>
        {error && <p style={{ color: '#ff4d4f', marginTop: '15px', fontSize: '13px' }}>{error}</p>}
      </div>
    );
  }

  const refLink = `https://t.me/DragonBikeBot?start=${stats.name}`; // ЗАМЕНИ DragonBikeBot на своего бота

  return (
    <div style={{ maxWidth: '500px', margin: '60px auto', padding: '30px', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'left', marginBottom: '40px' }}>
        <h1 style={{ margin: '0', fontSize: '28px' }}>Статистика: {stats.name}</h1>
        <p style={{ color: '#666', marginTop: '5px' }}>Обновляется в реальном времени</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px' }}>
        <div style={{ background: '#fff', padding: '25px', borderRadius: '20px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.03)', border: '1px solid #f0f0f0' }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold' }}>{stats.clicks}</div>
          <div style={{ fontSize: '14px', color: '#888' }}>Переходов</div>
        </div>
        <div style={{ background: '#000', padding: '25px', borderRadius: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', fontWeight: 'bold', color: '#fff' }}>{stats.paid}</div>
          <div style={{ fontSize: '14px', color: '#aaa' }}>Оплаты</div>
        </div>
      </div>

      <div style={{ background: '#f9f9f9', padding: '20px', borderRadius: '15px', border: '1px dashed #ccc', position: 'relative' }}>
        <p style={{ margin: '0 0 10px 0', fontSize: '12px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase' }}>Ваша ссылка:</p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <code style={{ fontSize: '13px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>{refLink}</code>
          <button 
            onClick={() => copyToClipboard(refLink)}
            style={{ background: '#000', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
          >
            {copied ? '✅' : 'Copy'}
          </button>
        </div>
      </div>

      <button 
        onClick={() => setStats(null)} 
        style={{ width: '100%', marginTop: '50px', background: 'none', border: 'none', color: '#999', cursor: 'pointer', textDecoration: 'underline' }}
      >
        Выйти
      </button>
    </div>
  );
}
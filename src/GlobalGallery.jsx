import { useState, useMemo } from 'react';

export default function GlobalGallery({ allPhotos = [], currentUser, onBack }) {
  // YENİ: Hangi galeride olduğumuzu tutan state
  const [activeTab, setActiveTab] = useState('global'); // 'local' veya 'global'
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [selectedUser, setSelectedUser] = useState('Everyone');

  const uniqueUsers = useMemo(() => {
    const users = allPhotos.map(photo => photo.user);
    return ['Everyone', ...new Set(users)];
  }, [allPhotos]);

  const filterOptions = ['All', 'Doğal', 'GoldenHour', 'StreetPoet', 'Muse', 'Halloween', 'streak'];

  // Gelişmiş Filtreleme (Tab'a göre de filtreler)
  const filteredPhotos = useMemo(() => {
    return allPhotos.filter(photo => {
      // Eğer "Benim Çektiklerim" sekmesindeyse, sadece currentUser'ın fotolarını göster
      if (activeTab === 'local' && photo.user !== currentUser) return false;

      const matchFilter = selectedFilter === 'All' || photo.filter === selectedFilter;
      const matchUser = selectedUser === 'Everyone' || photo.user === selectedUser;
      return matchFilter && matchUser;
    });
  }, [allPhotos, selectedFilter, selectedUser, activeTab, currentUser]);

  const handleDownload = async (photoUrl, userName) => {
    try {
      const response = await fetch(photoUrl);
      const blob = await response.blob();
      const file = new File([blob], `${userName}-hatirasi.jpg`, { type: 'image/jpeg' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'Fotoğrafı Kaydet',
        });
      } else {
        const link = document.createElement('a');
        link.href = photoUrl;
        link.download = `${userName}-dugun-fotografi.jpg`;
        link.click();
      }
    } catch (err) {
      console.error('İndirme hatası:', err);
      alert('Fotoğraf indirilemedi.');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', color: '#fff', display: 'flex', flexDirection: 'column', zIndex: 9999, fontFamily: 'sans-serif' }}>
      
      {/* Üst Bar */}
      <div style={{ padding: '20px 20px 10px', display: 'flex', alignItems: 'center', gap: '15px' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>
          ←
        </button>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>Galeri</h2>
      </div>

      {/* YENİ: İki Galeri Arası Geçiş Sekmeleri (Tabs) */}
      <div style={{ display: 'flex', margin: '0 20px 15px', background: '#222', borderRadius: '12px', padding: '4px' }}>
        <button 
          onClick={() => setActiveTab('local')}
          style={{ flex: 1, padding: '10px', background: activeTab === 'local' ? '#fff' : 'transparent', color: activeTab === 'local' ? '#000' : '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', transition: '0.3s' }}
        >
          Benim Çektiklerim
        </button>
        <button 
          onClick={() => setActiveTab('global')}
          style={{ flex: 1, padding: '10px', background: activeTab === 'global' ? '#fff' : 'transparent', color: activeTab === 'global' ? '#000' : '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', fontSize: '13px', transition: '0.3s' }}
        >
          Tüm Fotoğraflar
        </button>
      </div>

      {/* Dropdown Filtreler (Global sekmesindeyken veya ikisinde de görünebilir) */}
      <div style={{ display: 'flex', gap: '10px', padding: '0 20px 20px', borderBottom: '1px solid #222' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <label style={{ fontSize: '11px', color: '#888', fontWeight: 'bold' }}>Efekt</label>
          <select 
            value={selectedFilter} 
            onChange={(e) => setSelectedFilter(e.target.value)}
            style={{ padding: '10px', borderRadius: '12px', background: '#111', color: '#fff', border: '1px solid #333', fontSize: '13px', outline: 'none', appearance: 'none' }}
          >
            {filterOptions.map(f => (
              <option key={f} value={f}>{f === 'All' ? 'Tüm Efektler' : f}</option>
            ))}
          </select>
        </div>

        {/* Kişi filtresini sadece Global sekmesinde gösterirsek daha mantıklı olur */}
        {activeTab === 'global' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '11px', color: '#888', fontWeight: 'bold' }}>Kişi</label>
            <select 
              value={selectedUser} 
              onChange={(e) => setSelectedUser(e.target.value)}
              style={{ padding: '10px', borderRadius: '12px', background: '#111', color: '#fff', border: '1px solid #333', fontSize: '13px', outline: 'none', appearance: 'none' }}
            >
              {uniqueUsers.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Fotoğraf Izgarası */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '2px' }}>
        {filteredPhotos.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '50px', color: '#555', fontSize: '14px' }}>
            {activeTab === 'local' ? 'Henüz fotoğraf çekmediniz.' : 'Bu kriterlere uygun fotoğraf bulunamadı.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px' }}>
            {filteredPhotos.map((photo, index) => (
              <div 
                key={photo.id || index} 
                style={{ position: 'relative', aspectRatio: '3/4', backgroundColor: '#111' }}
                onClick={() => handleDownload(photo.url, photo.user)}
              >
                <img 
                  src={photo.url} 
                  alt={`Photo by ${photo.user}`} 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
                {activeTab === 'global' && (
                  <div style={{ position: 'absolute', bottom: '5px', left: '5px', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', pointerEvents: 'none' }}>
                    {photo.user}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
import { useState, useMemo } from 'react';

const FilmStrip = () => (
  <div style={{ width:'100%', height:'22px', background:'#000', display:'flex', alignItems:'center', gap:'3px', padding:'0 5px', flexShrink:0 }}>
    {Array.from({ length: 22 }).map((_, i) => (
      <div key={i} style={{ width:'9px', height:'7px', background:'#080808', borderRadius:'1px', flexShrink:0 }} />
    ))}
  </div>
);

export default function GlobalGallery({ localPhotos=[], globalPhotos=[], currentUser, onBack }) {
  const [activeTab,      setActiveTab]      = useState('local');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [selectedUser,   setSelectedUser]   = useState('Everyone');

  const filterOptions = ['All','NATURAL','KODAK','FUJI','NOIR','FADE','VELVET','CINEMA','DUSK','PORCEL.'];

  const uniqueUsers = useMemo(() => {
    const users = globalPhotos.map(p=>p.user);
    return ['Everyone', ...new Set(users)];
  }, [globalPhotos]);

  const filteredPhotos = useMemo(() => {
    const source = activeTab === 'local' ? localPhotos : globalPhotos;
    return source.filter(p => {
      const matchFilter = selectedFilter === 'All' || p.filter === selectedFilter;
      const matchUser   = activeTab === 'local' || selectedUser === 'Everyone' || p.user === selectedUser;
      return matchFilter && matchUser;
    });
  }, [localPhotos, globalPhotos, selectedFilter, selectedUser, activeTab]);

  const handleDownload = async (photoUrl, userName) => {
    try {
      let blob;
      if (photoUrl.startsWith('data:')) {
        const res = await fetch(photoUrl); blob = await res.blob();
      } else {
        const res = await fetch(photoUrl); blob = await res.blob();
      }
      const file = new File([blob], `${userName}-dugun.jpg`, { type:'image/jpeg' });
      if (navigator.share && navigator.canShare({ files:[file] })) {
        await navigator.share({ files:[file] });
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${userName}-dugun.jpg`;
        link.click();
        URL.revokeObjectURL(link.href);
      }
    } catch(e) {
      window.open(photoUrl, '_blank');
    }
  };

  const mono = { fontFamily:"'Space Mono', monospace" };

  return (
    <div style={{ position:'fixed', inset:0, background:'#080808', display:'flex', flexDirection:'column', zIndex:9999, ...mono }}>
      <FilmStrip />

      {/* Header */}
      <div style={{ padding:'12px 16px', borderBottom:'1px solid #111', display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <button onClick={onBack} style={{ background:'none', border:'none', color:'#444', fontSize:'12px', cursor:'pointer', ...mono, padding:0 }}>◀</button>
          <span style={{ fontSize:'14px', fontWeight:700, color:'#e8e0d0', letterSpacing:'2px' }}>GALERİ</span>
        </div>
        <div style={{ background:'#000', border:'1px solid #1a1a1a', padding:'3px 10px', display:'flex', alignItems:'center', gap:'6px' }}>
          <div style={{ width:'5px', height:'5px', borderRadius:'50%', background:'#cc4400' }} />
          <span style={{ fontSize:'8px', color:'#cc4400', letterSpacing:'1px' }}>
            {(activeTab === 'local' ? localPhotos : globalPhotos).length} KARE
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid #111', flexShrink:0 }}>
        <button
          onClick={() => setActiveTab('local')}
          style={{ flex:1, padding:'11px', background: activeTab==='local' ? '#e8e0d0' : 'transparent', border:'none', borderRight:'1px solid #111', ...mono, fontSize:'8px', fontWeight:700, color: activeTab==='local' ? '#080808' : '#2a2a2a', letterSpacing:'2px', cursor:'pointer', transition:'all 0.15s' }}
        >
          BENİM
        </button>
        <button
          onClick={() => setActiveTab('global')}
          style={{ flex:1, padding:'11px', background: activeTab==='global' ? '#e8e0d0' : 'transparent', border:'none', ...mono, fontSize:'8px', fontWeight:700, color: activeTab==='global' ? '#080808' : '#2a2a2a', letterSpacing:'2px', cursor:'pointer', transition:'all 0.15s' }}
        >
          TÜMÜ ({globalPhotos.length})
        </button>
      </div>

      {/* Filtreler */}
      <div style={{ display:'flex', gap:0, borderBottom:'1px solid #111', overflowX:'auto', scrollbarWidth:'none', flexShrink:0 }}>
        {filterOptions.map(f => (
          <button key={f} onClick={() => setSelectedFilter(f)} style={{
            padding:'8px 12px', background: selectedFilter===f ? '#111' : 'transparent',
            border:'none', borderRight:'1px solid #0f0f0f',
            ...mono, fontSize:'7px', fontWeight:700,
            color: selectedFilter===f ? '#e8e0d0' : '#252525',
            letterSpacing:'1px', whiteSpace:'nowrap', cursor:'pointer', flexShrink:0
          }}>
            {f === 'All' ? 'TÜMÜ' : f}
          </button>
        ))}
        {activeTab === 'global' && (
          <select
            value={selectedUser}
            onChange={e => setSelectedUser(e.target.value)}
            style={{ marginLeft:'auto', background:'#000', border:'none', borderLeft:'1px solid #111', padding:'0 12px', ...mono, fontSize:'7px', color:'#333', letterSpacing:'1px', outline:'none', cursor:'pointer', flexShrink:0 }}
          >
            {uniqueUsers.map(u => <option key={u} value={u}>{u.toUpperCase().slice(0,12)}</option>)}
          </select>
        )}
      </div>

      {/* Grid */}
      <div style={{ flex:1, overflowY:'auto' }}>
        {filteredPhotos.length === 0 ? (
          <div style={{ textAlign:'center', marginTop:'60px' }}>
            <span style={{ fontSize:'9px', color:'#222', letterSpacing:'3px' }}>
              {activeTab === 'local' ? 'HENÜZ KARE YOK' : 'KARE BULUNAMADI'}
            </span>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1px', background:'#111' }}>
            {filteredPhotos.map((photo, i) => (
              <div
                key={photo.firestoreId || photo.id || i}
                style={{ position:'relative', aspectRatio:'3/4', background:'#0a0a0a', cursor:'pointer', overflow:'hidden' }}
                onClick={() => handleDownload(photo.url, photo.user)}
              >
                <img src={photo.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                {/* Frame numarası */}
                <div style={{ position:'absolute', bottom:'5px', left:'6px' }}>
                  <span style={{ ...mono, fontSize:'7px', color:'#cc4400', letterSpacing:'1px' }}>
                    {String(i+1).padStart(3,'0')}
                  </span>
                </div>
                {/* Global sekmesinde isim */}
                {activeTab === 'global' && (
                  <div style={{ position:'absolute', top:'5px', left:'6px', background:'rgba(0,0,0,0.7)', padding:'2px 6px' }}>
                    <span style={{ ...mono, fontSize:'7px', color:'#e8e0d0', letterSpacing:'1px', opacity:0.6 }}>
                      {photo.user?.slice(0,8).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alt bilgi */}
      <div style={{ padding:'8px 16px', borderTop:'1px solid #111', display:'flex', justifyContent:'space-between', flexShrink:0 }}>
        <span style={{ ...mono, fontSize:'7px', color:'#1e1e1e', letterSpacing:'1px' }}>KAYDETMEK İÇİN DOKUN</span>
        <span style={{ ...mono, fontSize:'7px', color:'#1e1e1e', letterSpacing:'1px' }}>35MM</span>
      </div>

      <FilmStrip />
    </div>
  );
}
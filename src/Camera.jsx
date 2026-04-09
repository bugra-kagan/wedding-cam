import { useRef, useEffect, useState } from 'react';

// 🔥 YENİ: isActive prop'unu içeri aldık
export default function Camera({ name, onFinish, initialPhotos, isActive }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [photos, setPhotos] = useState(initialPhotos || []);

  useEffect(() => {
    if (initialPhotos) {
      setPhotos(initialPhotos);
    }
  }, [initialPhotos]);

  const [activeFilter, setActiveFilter] = useState('none');
  const [facingMode, setFacingMode] = useState('environment');
  const [isFlashing, setIsFlashing] = useState(false);

  const filters = [
    { id: 'none', label: 'Doğal' },
    { id: 'GoldenHour', label: '🌅 Golden Hour' },
    { id: 'StreetPoet', label: '🎞️ Street Poet' },
    { id: 'Muse', label: '☁️ Muse (Dream)' },
    { id: 'Halloween', label: '🎃 Halloween' },
    { id: 'streak', label: '👓 Astigmat' }
  ];

  // KAMERAYI BAŞLATMA
  useEffect(() => {
    let isMounted = true;
    const startCamera = async () => {
      try {
        if (videoRef.current?.srcObject) {
          videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }
        });
        if (isMounted && videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          videoRef.current.play().catch(e => console.error(e));
        }
      } catch (err) { console.error("Kamera izni hatası", err); }
    };
    startCamera();
    return () => { isMounted = false; };
  }, [facingMode]);

  // 🔥 YENİ: Galeri'den kameraya geri dönüldüğünde videoyu zorla oynat
  useEffect(() => {
    if (isActive && videoRef.current) {
      videoRef.current.play().catch(() => {
        // Hata olursa sessizce yoksay
      });
    }
  }, [isActive]);

  const getCssFilter = () => {
    switch (activeFilter) {
      case 'GoldenHour': return 'sepia(0.5) saturate(1.8) brightness(1.1) hue-rotate(-10deg)';
      case 'StreetPoet': return 'grayscale(1) contrast(1.5) brightness(0.9)';
      case 'Muse': return 'brightness(1.1) saturate(1.3) contrast(0.9)';
      case 'Halloween': return 'contrast(1.4) saturate(1.6) hue-rotate(15deg) brightness(0.8)';
      case 'streak': return 'contrast(1.1) brightness(1.05)';
      default: return 'none';
    }
  };

  const takePhoto = () => {
    setIsFlashing(true);
    new Audio('/shutter.mp3').play().catch(() => {});
    setTimeout(() => setIsFlashing(false), 150);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (activeFilter !== 'none') {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        let r = d[i], g = d[i + 1], b = d[i + 2];
        const avg = (r + g + b) / 3;
        switch (activeFilter) {
          case 'GoldenHour': d[i] = r * 1.2 + 20; d[i+1] = g * 1.05 + 10; d[i+2] = b * 0.8; break;
          case 'StreetPoet': const bw = (avg - 128) * 1.4 + 128; const grain = (Math.random() - 0.5) * 35; d[i] = d[i+1] = d[i+2] = bw + grain; break;
          case 'Muse': d[i] = r * 0.9 + 35; d[i+1] = g * 0.95 + 45; d[i+2] = b * 1.2 + 55; break;
          case 'Halloween': d[i] = r * 1.35; d[i+1] = g * 0.7; d[i+2] = b * 0.4; if (avg < 110) { d[i] *= 0.6; d[i+1] *= 0.8; } break;
        }
      }
      ctx.putImageData(imageData, 0, 0);
    }

    const w = canvas.width;
    const h = canvas.height;

    if (activeFilter === 'streak') {
      const data = ctx.getImageData(0, 0, w, h).data;
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(100, 200, 255, 0.18)'; 
      for (let y = 0; y < h; y += 8) {
        for (let x = 0; x < w; x += 8) {
          const i = (y * w + x) * 4;
          if ((data[i] + data[i+1] + data[i+2]) > 600) {
            ctx.fillRect(x - w * 0.35, y, w * 0.7, 2);
          }
        }
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    if (activeFilter === 'Muse') {
      ctx.globalAlpha = 0.35;
      ctx.filter = 'blur(12px) brightness(1.1)';
      ctx.drawImage(canvas, 0, 0);
      ctx.filter = 'none'; ctx.globalAlpha = 1.0;
    }

    const grad = ctx.createRadialGradient(w/2, h/2, w/4, w/2, h/2, w*0.85);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = grad;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';

    const finalUrl = canvas.toDataURL('image/jpeg', 0.9);
    
    const newPhotoObj = {
      id: Date.now().toString(),
      url: finalUrl,
      user: name,
      filter: activeFilter === 'none' ? 'Doğal' : activeFilter
    };
    
    setPhotos(prev => {
      const updated = [...prev, newPhotoObj];
      try {
        localStorage.setItem('guestPhotos', JSON.stringify(updated));
      } catch (err) {
        console.warn('Hafıza doldu, fotoğraf geçici bellekte tutuluyor.');
      }
      return updated;
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', display: 'flex', flexDirection: 'column', zIndex: 9999 }}>
      
      <style>{`
        video::-webkit-media-controls { display: none !important; opacity: 0 !important; }
        video::-webkit-media-controls-enclosure { display: none !important; }
        video::-webkit-media-controls-start-playback-button { display: none !important; -webkit-appearance: none; }
        video::-webkit-media-controls-play-button { display: none !important; }
        video::-webkit-media-controls-panel { display: none !important; }
        video::-webkit-media-controls-overlay-play-button { display: none !important; }
      `}</style>

      {isFlashing && <div style={{ position: 'absolute', inset: 0, backgroundColor: 'white', zIndex: 10000 }} />}
      
      {/* Üst Bar */}
      <div style={{ padding: '25px 20px', display: 'flex', justifyContent: 'space-between', color: '#fff', zIndex: 20 }}>
        <span style={{ fontSize: '13px', letterSpacing: '2px', fontWeight: 'bold' }}>{name.toUpperCase()}</span>
        <button 
          onClick={() => onFinish(photos)}
          style={{ background: 'white', color: 'black', border: 'none', padding: '5px 15px', borderRadius: '15px', fontSize: '11px', fontWeight: 'bold' }}
        >
          GALERİYE GİT ({photos.length})
        </button>
      </div>

      {/* Kamera Alanı */}
      <div style={{ flex: 1, position: 'relative', margin: '0 8px', overflow: 'hidden', borderRadius: '24px' }}>
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          disablePictureInPicture 
          disableRemotePlayback 
          // 🔥 YENİ: Tarayıcı videoyu arka planda durdurmaya kalkarsa, inatla geri oynat diyoruz!
          onPause={(e) => {
             e.target.play().catch(() => {});
          }}
          style={{ 
            width: '100%', 
            height: '100%', 
            objectFit: 'cover', 
            transform: facingMode === 'user' ? 'scaleX(-1)' : 'none', 
            filter: getCssFilter(),
            pointerEvents: 'none', 
            userSelect: 'none', 
            WebkitUserSelect: 'none',
            touchAction: 'none' 
          }} 
        />
        {activeFilter === 'Muse' && <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(3px)', pointerEvents: 'none' }} />}
        <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 100px rgba(0,0,0,0.6)', pointerEvents: 'none' }} />
      </div>

      {/* Kontrol Paneli */}
      <div style={{ padding: '20px 0 40px', background: '#000' }}>
        <div style={{ display: 'flex', gap: '15px', overflowX: 'auto', padding: '0 20px 25px', scrollbarWidth: 'none' }}>
          {filters.map(f => (
            <button key={f.id} onClick={() => setActiveFilter(f.id)} style={{ padding: '8px 18px', borderRadius: '20px', whiteSpace: 'nowrap', border: activeFilter === f.id ? '2px solid #fff' : '1px solid #333', backgroundColor: activeFilter === f.id ? '#fff' : 'transparent', color: activeFilter === f.id ? '#000' : '#888', fontSize: '11px', fontWeight: 'bold' }}>{f.label}</button>
          ))}
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          <div style={{ width: '45px', height: '45px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #333' }}>
            {photos.length > 0 && (
              <img src={photos[photos.length - 1].url} alt="Son Çekim" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </div>

          <button onClick={takePhoto} style={{ width: '75px', height: '75px', borderRadius: '50%', border: '2px solid #fff', backgroundColor: 'transparent', padding: '4px' }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: '#fff' }} />
          </button>

          <button onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px', opacity: 0.5, width: '45px' }}>🔄</button>
        </div>
      </div>

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
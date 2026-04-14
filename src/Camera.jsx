import { useRef, useEffect, useState, useCallback } from 'react';

// ─────────────────────────────────────────────
// YARDIMCI FONKSİYONLAR
// ─────────────────────────────────────────────
const clamp = (v) => Math.max(0, Math.min(255, v));

// S-curve: kontrastı organik şekilde artırır
const sCurve = (v, strength = 0.3) => {
  const n = v / 255;
  const curved = n + strength * n * (1 - n) * (2 * n - 1);
  return clamp(curved * 255);
};

// Film grain ekler
const addGrain = (d, amount = 18) => {
  for (let i = 0; i < d.length; i += 4) {
    const g = (Math.random() - 0.5) * amount;
    d[i]     = clamp(d[i] + g);
    d[i + 1] = clamp(d[i + 1] + g);
    d[i + 2] = clamp(d[i + 2] + g);
  }
};

// Fade: siyahları kaldırır (matte look)
const addFade = (d, amount = 30) => {
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = clamp(d[i] + amount);
    d[i + 1] = clamp(d[i + 1] + amount);
    d[i + 2] = clamp(d[i + 2] + amount);
  }
};

// ─────────────────────────────────────────────
// FİLTRE TANIMLAMALARI
// ─────────────────────────────────────────────
const applyFilter = (ctx, canvas, filterId) => {
  if (filterId === 'none') return;

  const w = canvas.width;
  const h = canvas.height;
  const imageData = ctx.getImageData(0, 0, w, h);
  const d = imageData.data;

  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i + 1], b = d[i + 2];

    switch (filterId) {

      // 🎞️ KODAK GOLD — Sıcak, nostaljik film emülasyonu
      case 'kodak': {
        r = clamp(r * 1.08 + 15);
        g = clamp(g * 1.02 + 5);
        b = clamp(b * 0.88);
        // Gölgelere turuncu/sarı cast
        const lum = (r + g + b) / 3;
        if (lum < 100) {
          r = clamp(r + 12);
          g = clamp(g + 6);
          b = clamp(b - 8);
        }
        d[i] = sCurve(r); d[i+1] = sCurve(g); d[i+2] = sCurve(b);
        break;
      }

      // 🎞️ FUJI 400H — Soğuk, yeşilimsi pastel (düğün fotoğrafçılarının favorisi)
      case 'fuji': {
        r = clamp(r * 0.94 + 8);
        g = clamp(g * 1.04 + 10);
        b = clamp(b * 1.06 + 12);
        // Highlight'lara yeşil/teal cast
        const lum = (r + g + b) / 3;
        if (lum > 160) {
          g = clamp(g + 8);
          b = clamp(b + 6);
        }
        addFade(d.subarray(i, i + 3), 18);
        d[i] = r; d[i+1] = g; d[i+2] = b;
        break;
      }

      // ⬛ NOIR — Yüksek kontrastlı dramatik siyah-beyaz
      case 'noir': {
        const avg = r * 0.299 + g * 0.587 + b * 0.114; // luminance
        const contrast = (avg - 128) * 1.6 + 128;
        const final = clamp(contrast);
        d[i] = d[i+1] = d[i+2] = sCurve(final, 0.5);
        break;
      }

      // 🌫️ FADE — Soluk, dreamy matte look
      case 'fade': {
        r = clamp(r * 0.85 + 35);
        g = clamp(g * 0.88 + 28);
        b = clamp(b * 0.92 + 22);
        d[i] = r; d[i+1] = g; d[i+2] = b;
        break;
      }

      // 🌅 VELVET — Sıcak, yumuşak, skin tonu dostu
      case 'velvet': {
        r = clamp(r * 1.12 + 10);
        g = clamp(g * 0.98 + 5);
        b = clamp(b * 0.82 - 5);
        // Gölgeleri kırmızımsı yap
        const lum = (r + g + b) / 3;
        if (lum < 80) {
          r = clamp(r + 20);
          b = clamp(b - 10);
        }
        d[i] = sCurve(r, 0.2); d[i+1] = sCurve(g, 0.2); d[i+2] = b;
        break;
      }

      // 🌊 TEAL & ORANGE — Sinema filmi renk gradyanı
      case 'tealOrange': {
        const lum = (r + g + b) / 3;
        if (lum < 128) {
          // Gölgeler → teal
          r = clamp(r * 0.75);
          g = clamp(g * 1.05 + 10);
          b = clamp(b * 1.25 + 20);
        } else {
          // Highlight'lar → orange
          r = clamp(r * 1.15 + 15);
          g = clamp(g * 1.0 + 3);
          b = clamp(b * 0.75);
        }
        d[i] = sCurve(r); d[i+1] = sCurve(g); d[i+2] = sCurve(b);
        break;
      }

      // 💜 DUSK — Mor/pembe tonlu akşam ışığı
      case 'dusk': {
        r = clamp(r * 1.05 + 18);
        g = clamp(g * 0.88);
        b = clamp(b * 1.12 + 15);
        const lum = (r + g + b) / 3;
        if (lum > 150) {
          r = clamp(r + 10);
          b = clamp(b + 8);
        }
        d[i] = sCurve(r, 0.25); d[i+1] = g; d[i+2] = sCurve(b, 0.25);
        break;
      }

      // 🤍 PORCELAIN — Soğuk, beyazlatılmış, high-key
      case 'porcelain': {
        const avg = (r + g + b) / 3;
        r = clamp(r * 0.92 + avg * 0.1 + 25);
        g = clamp(g * 0.94 + avg * 0.08 + 20);
        b = clamp(b * 1.02 + avg * 0.06 + 22);
        d[i] = r; d[i+1] = g; d[i+2] = b;
        break;
      }

      default: break;
    }
  }

  // Grain ekle (noir hariç — zaten yüksek kontrastlı)
  if (!['none', 'porcelain', 'fade'].includes(filterId)) {
    addGrain(d, filterId === 'kodak' || filterId === 'fuji' ? 22 : 12);
  }

  ctx.putImageData(imageData, 0, 0);

  // Muse benzeri glow efekti (velvet ve dusk için)
  if (filterId === 'velvet' || filterId === 'dusk') {
    ctx.globalAlpha = 0.2;
    ctx.filter = 'blur(18px) brightness(1.15)';
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';
    ctx.globalAlpha = 1.0;
  }
};

// CSS önizleme filtreleri (canlı kamera görüntüsü için)
const getCssFilter = (filterId) => {
  switch (filterId) {
    case 'kodak':      return 'sepia(0.4) saturate(1.6) brightness(1.05) hue-rotate(-8deg)';
    case 'fuji':       return 'saturate(0.9) brightness(1.08) hue-rotate(8deg)';
    case 'noir':       return 'grayscale(1) contrast(1.6) brightness(0.92)';
    case 'fade':       return 'saturate(0.75) brightness(1.1) contrast(0.85)';
    case 'velvet':     return 'sepia(0.3) saturate(1.4) brightness(1.08)';
    case 'tealOrange': return 'saturate(1.5) contrast(1.15) brightness(1.0)';
    case 'dusk':       return 'saturate(1.3) brightness(1.05) hue-rotate(20deg)';
    case 'porcelain':  return 'saturate(0.6) brightness(1.2) contrast(0.9)';
    default:           return 'none';
  }
};

// ─────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────
export default function Camera({ name, onFinish, localPhotos, setLocalPhotos }) {
  const videoRef        = useRef(null);
  const previewCanvasRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const animFrameRef    = useRef(null);

  const [activeFilter, setActiveFilter] = useState('none');
  const [facingMode,   setFacingMode]   = useState('environment');
  const [isFlashing,   setIsFlashing]   = useState(false);

  const filters = [
    { id: 'none',       label: 'Doğal' },
    { id: 'kodak',      label: '🎞 Kodak' },
    { id: 'fuji',       label: '🌿 Fuji' },
    { id: 'noir',       label: '⬛ Noir' },
    { id: 'fade',       label: '🌫 Fade' },
    { id: 'velvet',     label: '🌅 Velvet' },
    { id: 'tealOrange', label: '🎬 Sinema' },
    { id: 'dusk',       label: '💜 Dusk' },
    { id: 'porcelain',  label: '🤍 Porcelain' },
  ];

  const startDrawLoop = useCallback(() => {
    const video  = videoRef.current;
    const canvas = previewCanvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');

    const draw = () => {
      if (video.readyState >= 2) {
        canvas.width  = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        if (facingMode === 'user') { ctx.save(); ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }

        const vR = video.videoWidth / video.videoHeight;
        const cR = canvas.width / canvas.height;
        let sx = 0, sy = 0, sw = video.videoWidth, sh = video.videoHeight;
        if (vR > cR) { sw = video.videoHeight * cR; sx = (video.videoWidth - sw) / 2; }
        else         { sh = video.videoWidth / cR;  sy = (video.videoHeight - sh) / 2; }

        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
        if (facingMode === 'user') ctx.restore();

        // Vignette
        const grad = ctx.createRadialGradient(canvas.width/2, canvas.height/2, canvas.width/4, canvas.width/2, canvas.height/2, canvas.width * 0.85);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(1, 'rgba(0,0,0,0.4)');
        ctx.fillStyle = grad;
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
      }
      animFrameRef.current = requestAnimationFrame(draw);
    };
    animFrameRef.current = requestAnimationFrame(draw);
  }, [facingMode]);

  useEffect(() => {
    let isMounted = true;
    const startCamera = async () => {
      try {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t => t.stop());

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } }
        });
        if (!isMounted) return;

        const video = videoRef.current;
        video.srcObject = stream;
        video.setAttribute('autoplay', ''); video.setAttribute('muted', '');
        video.setAttribute('playsinline', ''); video.setAttribute('webkit-playsinline', '');
        video.muted = true;
        await video.play().catch(() => {});
        startDrawLoop();
      } catch (err) { console.error('Kamera izni hatası', err); }
    };
    startCamera();
    return () => { isMounted = false; if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [facingMode, startDrawLoop]);

  const takePhoto = () => {
    setIsFlashing(true);
    new Audio('/shutter.mp3').play().catch(() => {});
    setTimeout(() => setIsFlashing(false), 150);

    const video  = videoRef.current;
    const canvas = captureCanvasRef.current;
    const ctx    = canvas.getContext('2d', { willReadFrequently: true });

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;

    if (facingMode === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Pixel tabanlı filtre uygula
    applyFilter(ctx, canvas, activeFilter);

    // Vignette
    const w = canvas.width, h = canvas.height;
    const grad = ctx.createRadialGradient(w/2, h/2, w/4, w/2, h/2, w * 0.85);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = grad;
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';

    const finalUrl = canvas.toDataURL('image/jpeg', 0.92);
    const filterLabel = filters.find(f => f.id === activeFilter)?.label || 'Doğal';

    setLocalPhotos(prev => [...prev, {
      id: Date.now().toString(),
      url: finalUrl,
      user: name,
      filter: filterLabel,
    }]);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: '#000', display: 'flex', flexDirection: 'column', zIndex: 9999 }}>

      <video ref={videoRef} autoPlay playsInline muted disablePictureInPicture disableRemotePlayback style={{ display: 'none' }} />

      {isFlashing && <div style={{ position: 'absolute', inset: 0, backgroundColor: 'white', zIndex: 10000 }} />}

      <div style={{ padding: '25px 20px', display: 'flex', justifyContent: 'space-between', color: '#fff', zIndex: 20 }}>
        <span style={{ fontSize: '13px', letterSpacing: '2px', fontWeight: 'bold' }}>{name.toUpperCase()}</span>
        <button onClick={() => onFinish(localPhotos)} style={{ background: 'white', color: 'black', border: 'none', padding: '5px 15px', borderRadius: '15px', fontSize: '11px', fontWeight: 'bold' }}>
          GALERİYE GİT ({localPhotos.length})
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative', margin: '0 8px', overflow: 'hidden', borderRadius: '24px' }}>
        <canvas
          ref={previewCanvasRef}
          style={{ width: '100%', height: '100%', display: 'block', filter: getCssFilter(activeFilter) }}
        />
      </div>

      <div style={{ padding: '20px 0 40px', background: '#000' }}>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '0 20px 25px', scrollbarWidth: 'none' }}>
          {filters.map(f => (
            <button key={f.id} onClick={() => setActiveFilter(f.id)} style={{
              padding: '8px 16px', borderRadius: '20px', whiteSpace: 'nowrap',
              border: activeFilter === f.id ? '2px solid #fff' : '1px solid #333',
              backgroundColor: activeFilter === f.id ? '#fff' : 'transparent',
              color: activeFilter === f.id ? '#000' : '#888',
              fontSize: '11px', fontWeight: 'bold'
            }}>{f.label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
          <div style={{ width: '45px', height: '45px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #333' }}>
            {localPhotos.length > 0 && <img src={localPhotos[localPhotos.length - 1].url} alt="Son" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>

          <button onClick={takePhoto} style={{ width: '75px', height: '75px', borderRadius: '50%', border: '2px solid #fff', backgroundColor: 'transparent', padding: '4px' }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', backgroundColor: '#fff' }} />
          </button>

          <button onClick={() => setFacingMode(f => f === 'environment' ? 'user' : 'environment')} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '24px', opacity: 0.5, width: '45px' }}>🔄</button>
        </div>
      </div>

      <canvas ref={captureCanvasRef} style={{ display: 'none' }} />
    </div>
  );
}
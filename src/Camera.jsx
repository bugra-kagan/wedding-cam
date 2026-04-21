import { useRef, useEffect, useState, useCallback } from 'react';

const clamp = (v) => Math.max(0, Math.min(255, v));
const sCurve = (v, s = 0.3) => { const n = v / 255; return clamp((n + s * n * (1 - n) * (2 * n - 1)) * 255); };
const addGrain = (d, amt = 18) => { for (let i = 0; i < d.length; i += 4) { const g = (Math.random() - 0.5) * amt; d[i] = clamp(d[i]+g); d[i+1] = clamp(d[i+1]+g); d[i+2] = clamp(d[i+2]+g); } };

const applyFilter = (ctx, canvas, id) => {
  if (id === 'none') return;
  const w = canvas.width, h = canvas.height;
  const img = ctx.getImageData(0, 0, w, h); const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i], g = d[i+1], b = d[i+2];
    const avg = (r+g+b)/3;
    switch(id) {
      case 'kodak': r=clamp(r*1.08+15); g=clamp(g*1.02+5); b=clamp(b*0.88); if((r+g+b)/3<100){r=clamp(r+12);g=clamp(g+6);b=clamp(b-8);} d[i]=sCurve(r);d[i+1]=sCurve(g);d[i+2]=sCurve(b); break;
      case 'fuji': r=clamp(r*0.94+8);g=clamp(g*1.04+10);b=clamp(b*1.06+12); if((r+g+b)/3>160){g=clamp(g+8);b=clamp(b+6);} d[i]=r;d[i+1]=g;d[i+2]=b; break;
      case 'noir': { const bw=sCurve(clamp((avg-128)*1.6+128),0.5); d[i]=d[i+1]=d[i+2]=bw; break; }
      case 'fade': d[i]=clamp(r*0.85+35);d[i+1]=clamp(g*0.88+28);d[i+2]=clamp(b*0.92+22); break;
      case 'velvet': r=clamp(r*1.12+10);g=clamp(g*0.98+5);b=clamp(b*0.82-5); if(avg<80){r=clamp(r+20);b=clamp(b-10);} d[i]=sCurve(r,0.2);d[i+1]=sCurve(g,0.2);d[i+2]=b; break;
      case 'tealOrange': if(avg<128){r=clamp(r*0.75);g=clamp(g*1.05+10);b=clamp(b*1.25+20);}else{r=clamp(r*1.15+15);g=clamp(g+3);b=clamp(b*0.75);} d[i]=sCurve(r);d[i+1]=sCurve(g);d[i+2]=sCurve(b); break;
      case 'dusk': r=clamp(r*1.05+18);g=clamp(g*0.88);b=clamp(b*1.12+15); if(avg>150){r=clamp(r+10);b=clamp(b+8);} d[i]=sCurve(r,0.25);d[i+1]=g;d[i+2]=sCurve(b,0.25); break;
      case 'porcelain': { const a2=(r+g+b)/3; d[i]=clamp(r*0.92+a2*0.1+25);d[i+1]=clamp(g*0.94+a2*0.08+20);d[i+2]=clamp(b*1.02+a2*0.06+22); break; }
    }
  }
  if (!['none','porcelain','fade'].includes(id)) addGrain(d, ['kodak','fuji'].includes(id) ? 22 : 12);
  ctx.putImageData(img, 0, 0);
  if (id === 'velvet' || id === 'dusk') { ctx.globalAlpha=0.2; ctx.filter='blur(18px) brightness(1.15)'; ctx.drawImage(canvas,0,0); ctx.filter='none'; ctx.globalAlpha=1.0; }
};

const getCssFilter = (id) => {
  switch(id) {
    case 'kodak': return 'sepia(0.4) saturate(1.6) brightness(1.05) hue-rotate(-8deg)';
    case 'fuji': return 'saturate(0.9) brightness(1.08) hue-rotate(8deg)';
    case 'noir': return 'grayscale(1) contrast(1.6) brightness(0.92)';
    case 'fade': return 'saturate(0.75) brightness(1.1) contrast(0.85)';
    case 'velvet': return 'sepia(0.3) saturate(1.4) brightness(1.08)';
    case 'tealOrange': return 'saturate(1.5) contrast(1.15)';
    case 'dusk': return 'saturate(1.3) brightness(1.05) hue-rotate(20deg)';
    case 'porcelain': return 'saturate(0.6) brightness(1.2) contrast(0.9)';
    default: return 'none';
  }
};

const FilmStrip = () => (
  <div style={{ width:'100%', height:'22px', background:'#000', display:'flex', alignItems:'center', gap:'3px', padding:'0 5px', flexShrink:0 }}>
    {Array.from({ length: 22 }).map((_, i) => (
      <div key={i} style={{ width:'9px', height:'7px', background:'#080808', borderRadius:'1px', flexShrink:0 }} />
    ))}
  </div>
);

export default function Camera({ name, onFinish, localPhotos, setLocalPhotos }) {
  const videoRef         = useRef(null);
  const previewCanvasRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const animFrameRef     = useRef(null);

  const [activeFilter, setActiveFilter] = useState('none');
  const [facingMode,   setFacingMode]   = useState('environment');
  const [isFlashing,   setIsFlashing]   = useState(false);
  const [frameCount,   setFrameCount]   = useState(localPhotos.length);

  useEffect(() => { setFrameCount(localPhotos.length); }, [localPhotos]);

  const filters = [
    { id: 'none',       label: 'NATURAL' },
    { id: 'kodak',      label: 'KODAK'   },
    { id: 'fuji',       label: 'FUJI'    },
    { id: 'noir',       label: 'NOIR'    },
    { id: 'fade',       label: 'FADE'    },
    { id: 'velvet',     label: 'VELVET'  },
    { id: 'tealOrange', label: 'CINEMA'  },
    { id: 'dusk',       label: 'DUSK'    },
    { id: 'porcelain',  label: 'PORCEL.' },
  ];

  const startDrawLoop = useCallback(() => {
    const video = videoRef.current, canvas = previewCanvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    const draw = () => {
      if (video.readyState >= 2) {
        canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
        if (facingMode === 'user') { ctx.save(); ctx.translate(canvas.width,0); ctx.scale(-1,1); }
        const vR = video.videoWidth/video.videoHeight, cR = canvas.width/canvas.height;
        let sx=0,sy=0,sw=video.videoWidth,sh=video.videoHeight;
        if(vR>cR){sw=video.videoHeight*cR;sx=(video.videoWidth-sw)/2;}else{sh=video.videoWidth/cR;sy=(video.videoHeight-sh)/2;}
        ctx.drawImage(video,sx,sy,sw,sh,0,0,canvas.width,canvas.height);
        if (facingMode === 'user') ctx.restore();
        // Vignette
        const gr = ctx.createRadialGradient(canvas.width/2,canvas.height/2,canvas.width/4,canvas.width/2,canvas.height/2,canvas.width*0.85);
        gr.addColorStop(0,'transparent'); gr.addColorStop(1,'rgba(0,0,0,0.5)');
        ctx.fillStyle=gr; ctx.globalCompositeOperation='multiply'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.globalCompositeOperation='source-over';
      }
      animFrameRef.current = requestAnimationFrame(draw);
    };
    animFrameRef.current = requestAnimationFrame(draw);
  }, [facingMode]);

  useEffect(() => {
    let mounted = true;
    const start = async () => {
      try {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (videoRef.current?.srcObject) videoRef.current.srcObject.getTracks().forEach(t=>t.stop());
        const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode, width:{ideal:1920}, height:{ideal:1080} } });
        if (!mounted) return;
        const v = videoRef.current;
        v.srcObject = stream;
        v.setAttribute('autoplay',''); v.setAttribute('muted',''); v.setAttribute('playsinline',''); v.setAttribute('webkit-playsinline','');
        v.muted = true;
        await v.play().catch(()=>{});
        startDrawLoop();
      } catch(e){ console.error(e); }
    };
    start();
    return () => { mounted=false; if(animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [facingMode, startDrawLoop]);

  const takePhoto = () => {
    setIsFlashing(true);
    new Audio('/shutter.mp3').play().catch(()=>{});
    setTimeout(()=>setIsFlashing(false), 120);

    const video=videoRef.current, canvas=captureCanvasRef.current;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    canvas.width=video.videoWidth; canvas.height=video.videoHeight;
    if(facingMode==='user'){ctx.translate(canvas.width,0);ctx.scale(-1,1);}
    ctx.drawImage(video,0,0,canvas.width,canvas.height);
    applyFilter(ctx,canvas,activeFilter);
    const w=canvas.width,h=canvas.height;
    const gr=ctx.createRadialGradient(w/2,h/2,w/4,w/2,h/2,w*0.85);
    gr.addColorStop(0,'transparent'); gr.addColorStop(1,'rgba(0,0,0,0.5)');
    ctx.fillStyle=gr; ctx.globalCompositeOperation='multiply'; ctx.fillRect(0,0,w,h); ctx.globalCompositeOperation='source-over';

    const filterLabel = filters.find(f=>f.id===activeFilter)?.label || 'NATURAL';
    setLocalPhotos(prev => [...prev, { id:Date.now().toString(), url:canvas.toDataURL('image/jpeg',0.92), user:name, filter:filterLabel }]);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'#080808', display:'flex', flexDirection:'column', zIndex:9999, fontFamily:"'Space Mono', monospace" }}>
      <video ref={videoRef} autoPlay playsInline muted disablePictureInPicture disableRemotePlayback style={{ display:'none' }} />
      {isFlashing && <div style={{ position:'absolute', inset:0, background:'#fff', zIndex:10000 }} />}

      <FilmStrip />

      {/* HUD — üst bar */}
      <div style={{ padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#080808', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'5px' }}>
            <div style={{ width:5, height:5, borderRadius:'50%', background:'#cc4400' }} />
            <span style={{ fontSize:'8px', color:'#cc4400', letterSpacing:'1px' }}>REC</span>
          </div>
          <span style={{ fontSize:'8px', color:'#2a2a2a', letterSpacing:'2px' }}>ISO 400</span>
          <span style={{ fontSize:'8px', color:'#2a2a2a', letterSpacing:'2px' }}>1/60</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <span style={{ fontSize:'8px', color:'#e8e0d0', letterSpacing:'2px', opacity:0.5 }}>{name.toUpperCase().slice(0,10)}</span>
          <button
            onClick={() => onFinish(localPhotos)}
            style={{ background:'#e8e0d0', border:'none', padding:'5px 12px', fontFamily:"'Space Mono',monospace", fontSize:'8px', fontWeight:700, color:'#080808', letterSpacing:'2px', cursor:'pointer' }}
          >
            GALERİ [{String(frameCount).padStart(2,'0')}]
          </button>
        </div>
      </div>

      {/* Viewfinder */}
      <div style={{ flex:1, position:'relative', margin:'0 10px', overflow:'hidden' }}>
        <canvas
          ref={previewCanvasRef}
          style={{ width:'100%', height:'100%', display:'block', filter:getCssFilter(activeFilter) }}
        />
        {/* Izgara */}
        <div style={{ position:'absolute', inset:0, pointerEvents:'none', opacity:0.06 }}>
          <div style={{ position:'absolute', top:'33%', left:0, right:0, height:'1px', background:'#fff' }} />
          <div style={{ position:'absolute', top:'66%', left:0, right:0, height:'1px', background:'#fff' }} />
          <div style={{ position:'absolute', left:'33%', top:0, bottom:0, width:'1px', background:'#fff' }} />
          <div style={{ position:'absolute', left:'66%', top:0, bottom:0, width:'1px', background:'#fff' }} />
        </div>
        {/* Köşe bracket */}
        {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h]) => (
          <div key={v+h} style={{ position:'absolute', [v]:'10px', [h]:'10px', width:'14px', height:'14px',
            borderTop: v==='top' ? '1px solid rgba(232,224,208,0.3)' : 'none',
            borderBottom: v==='bottom' ? '1px solid rgba(232,224,208,0.3)' : 'none',
            borderLeft: h==='left' ? '1px solid rgba(232,224,208,0.3)' : 'none',
            borderRight: h==='right' ? '1px solid rgba(232,224,208,0.3)' : 'none',
            pointerEvents:'none'
          }} />
        ))}
        {/* Frame counter */}
        <div style={{ position:'absolute', bottom:'8px', right:'10px', background:'#000', border:'1px solid #1a1a1a', padding:'2px 8px' }}>
          <span style={{ fontSize:'9px', color:'#cc4400', letterSpacing:'1px' }}>{String(frameCount).padStart(3,'0')}</span>
        </div>
        {/* Aktif filtre adı */}
        <div style={{ position:'absolute', bottom:'8px', left:'10px' }}>
          <span style={{ fontSize:'8px', color:'#e8e0d0', letterSpacing:'2px', opacity:0.4 }}>
            {filters.find(f=>f.id===activeFilter)?.label}
          </span>
        </div>
      </div>

      {/* Alt panel */}
      <div style={{ background:'#080808', borderTop:'1px solid #111', flexShrink:0 }}>
        {/* Filtre listesi */}
        <div style={{ display:'flex', gap:0, overflowX:'auto', borderBottom:'1px solid #111', scrollbarWidth:'none' }}>
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              style={{
                padding: '10px 14px',
                background: activeFilter===f.id ? '#e8e0d0' : 'transparent',
                border: 'none',
                borderRight: '1px solid #111',
                fontFamily: "'Space Mono',monospace",
                fontSize: '8px',
                fontWeight: 700,
                color: activeFilter===f.id ? '#080808' : '#2a2a2a',
                letterSpacing: '1px',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background 0.15s, color 0.15s'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Deklanşör satırı */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 24px 20px' }}>
          {/* Son çekim thumbnail */}
          <div style={{ width:'38px', height:'50px', background:'#111', border:'1px solid #1a1a1a', overflow:'hidden', flexShrink:0 }}>
            {localPhotos.length > 0 && (
              <img src={localPhotos[localPhotos.length-1].url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            )}
          </div>

          {/* Deklanşör */}
          <button
            onClick={takePhoto}
            style={{ width:'64px', height:'64px', borderRadius:'50%', border:'2px solid #e8e0d0', background:'transparent', padding:'4px', cursor:'pointer', flexShrink:0 }}
          >
            <div style={{ width:'100%', height:'100%', borderRadius:'50%', background:'#e8e0d0' }} />
          </button>

          {/* Kamera çevir */}
          <button
            onClick={() => setFacingMode(f => f==='environment'?'user':'environment')}
            style={{ width:'38px', height:'38px', border:'1px solid #1a1a1a', background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}
          >
            <span style={{ fontSize:'14px', color:'#333' }}>⟳</span>
          </button>
        </div>
      </div>

      <FilmStrip />
      <canvas ref={captureCanvasRef} style={{ display:'none' }} />
    </div>
  );
}
import { useState, useEffect } from 'react'
import Camera from './Camera'
import GlobalGallery from './GlobalGallery'
import { storage } from './firebase'
import { ref, uploadString } from 'firebase/storage'
import './App.css'

export default function App() {
  const [step, setStep] = useState(() => {
    return localStorage.getItem('guestName') ? 'camera' : 'welcome';
  });
  
  const [name, setName] = useState(() => {
    return localStorage.getItem('guestName') || '';
  });

  // 💾 HAFIZA ÇÖZÜMÜ: Sayfa yenilense de galeriyi localStorage'dan oku
  const [galleryPhotos, setGalleryPhotos] = useState(() => {
    const saved = localStorage.getItem('guestPhotos');
    return saved ? JSON.parse(saved) : [];
  });

  const handleStart = (e) => {
    e?.preventDefault();
    if (name.trim() !== '') {
      localStorage.setItem('guestName', name.trim());
      setStep('camera');
    } else {
      alert('Lütfen devam etmek için isminizi girin! 😊');
    }
  }

  const handleFinish = async (photosFromCamera) => {
    // 1. BEKLEME YOK: Fotoğrafları hem state'e hem hafızaya kaydedip hemen galeriye geç
    setGalleryPhotos(photosFromCamera);
    localStorage.setItem('guestPhotos', JSON.stringify(photosFromCamera));
    setStep('gallery');
    
    // 2. ARKA PLAN İŞLEMİ: Kullanıcı galeride gezinirken çaktırmadan Firebase'e yükle
    try {
      for (let i = 0; i < photosFromCamera.length; i++) {
        const photoObj = photosFromCamera[i];
        const safeName = name.replace(/\s+/g, '_'); 
        const fileName = `dugun_anisi_${safeName}_${Date.now()}_${i}.jpg`;
        const storageRef = ref(storage, `fotograflar/${fileName}`);
        await uploadString(storageRef, photoObj.url, 'data_url');
      }
    } catch (error) {
      console.error("Firebase yükleme hatası:", error);
    }
  }

  const handleBackToCamera = () => {
    setStep('camera');
  }

  if (step === 'welcome') {
    return (
      <div className="container">
        <h1 style={{ fontSize: '24px', letterSpacing: '3px', marginBottom: '10px' }}>DÜĞÜN HATIRASI</h1>
        <p style={{ opacity: 0.6, fontSize: '14px', marginBottom: '30px' }}>Anılarınızı bırakmak için lütfen isminizi girin.</p>
        <input 
          type="text" 
          placeholder="Adınız ve Soyadınız" 
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <br />
        <button onClick={handleStart} style={{ marginTop: '15px' }}>KAMERAYI AÇ</button>
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#000' }}>
      
      {/* KAMERA EKRANI */}
      <div style={{ 
        position: 'absolute', inset: 0, 
        visibility: step === 'camera' ? 'visible' : 'hidden', 
        opacity: step === 'camera' ? 1 : 0, 
        zIndex: 10
      }}>
        {/* 🔥 YENİ: isActive prop'u ile Kameraya "şu an ekrandasın" bilgisini gönderiyoruz */}
        <Camera 
          name={name} 
          onFinish={handleFinish} 
          initialPhotos={galleryPhotos} 
          isActive={step === 'camera'} 
        />
      </div>

      {/* GALERİ EKRANI */}
      <div style={{ 
        position: 'absolute', inset: 0, 
        visibility: step === 'gallery' ? 'visible' : 'hidden', 
        opacity: step === 'gallery' ? 1 : 0, 
        zIndex: 20
      }}>
        <GlobalGallery 
          allPhotos={galleryPhotos} 
          currentUser={name} 
          onBack={handleBackToCamera} 
        />
      </div>
      
    </div>
  )
}
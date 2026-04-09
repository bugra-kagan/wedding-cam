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

  const [galleryPhotos, setGalleryPhotos] = useState(() => {
    const saved = localStorage.getItem('guestPhotos');
    return saved ? JSON.parse(saved) : [];
  });

  const handleStart = (e) => {
    e?.preventDefault();
    if (name.trim() !== '') {
      localStorage.setItem('guestName', name.trim());
      // Kullanıcı ekrana dokunduğu an direkt geçiş yapıyoruz, Safari'nin 
      // etkileşim kuralını bu buton sayesinde köprü olarak kullanıyoruz.
      setStep('camera');
    } else {
      alert('Lütfen devam etmek için isminizi girin! 😊');
    }
  }

  const handleFinish = async (photosFromCamera) => {
    setGalleryPhotos(photosFromCamera);
    localStorage.setItem('guestPhotos', JSON.stringify(photosFromCamera));
    setStep('gallery');
    
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
      
      {/* KAMERA EKRANI: Asla gizlenmiyor, hep arkada çalışıyor */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
        <Camera 
          name={name} 
          onFinish={handleFinish} 
          initialPhotos={galleryPhotos} 
        />
      </div>

      {/* GALERİ EKRANI: Kameranın üzerine siyah bir perde gibi çöküyor */}
      {step === 'gallery' && (
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          zIndex: 20, 
          backgroundColor: '#000' 
        }}>
          <GlobalGallery 
            allPhotos={galleryPhotos} 
            currentUser={name} 
            onBack={handleBackToCamera} 
          />
        </div>
      )}
      
    </div>
  )
}
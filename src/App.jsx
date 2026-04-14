import { useState, useEffect, useRef } from 'react'
import Camera from './Camera'
import GlobalGallery from './GlobalGallery'
import { storage, db } from './firebase'
import { ref, uploadString, getDownloadURL } from 'firebase/storage'
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore'
import './App.css'

export default function App() {
  const [step, setStep] = useState(() => {
    return localStorage.getItem('guestName') ? 'camera' : 'welcome';
  });

  const [name, setName] = useState(() => {
    return localStorage.getItem('guestName') || '';
  });

  // Kullanıcının bu oturumda çektiği fotoğraflar (sadece memory'de, localStorage'a yazılmıyor)
  const [localPhotos, setLocalPhotos] = useState([]);

  // Tüm misafirlerin fotoğrafları (Firestore'dan realtime)
  const [globalPhotos, setGlobalPhotos] = useState([]);

  // Hangi photo.id'lerin Firebase'e yüklendiğini takip ediyoruz (tekrar yükleme önleme)
  const uploadedIds = useRef(new Set());

  // Firestore'dan tüm fotoğrafları realtime dinle
  useEffect(() => {
    const q = query(collection(db, 'fotograflar'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const photos = snapshot.docs.map(doc => ({ firestoreId: doc.id, ...doc.data() }));
      setGlobalPhotos(photos);
    });
    return () => unsubscribe();
  }, []);

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
    setLocalPhotos(photosFromCamera);
    setStep('gallery');

    // Sadece daha önce yüklenmeyen fotoğrafları yükle
    const newPhotos = photosFromCamera.filter(p => !uploadedIds.current.has(p.id));

    for (const photoObj of newPhotos) {
      try {
        const safeName = name.replace(/\s+/g, '_');
        const fileName = `fotograflar/${safeName}_${photoObj.id}.jpg`;
        const storageRef = ref(storage, fileName);

        // Storage'a yükle
        await uploadString(storageRef, photoObj.url, 'data_url');
        const downloadURL = await getDownloadURL(storageRef);

        // Firestore'a metadata kaydet
        await addDoc(collection(db, 'fotograflar'), {
          url: downloadURL,
          user: name,
          filter: photoObj.filter,
          localId: photoObj.id,
          createdAt: Date.now(),
        });

        // Bu id'yi yüklenmiş olarak işaretle
        uploadedIds.current.add(photoObj.id);
      } catch (error) {
        console.error("Firebase yükleme hatası:", error);
      }
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
          onKeyDown={(e) => e.key === 'Enter' && handleStart(e)}
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
          localPhotos={localPhotos}
          setLocalPhotos={setLocalPhotos}
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
            localPhotos={localPhotos}
            globalPhotos={globalPhotos}
            currentUser={name}
            onBack={handleBackToCamera}
          />
        </div>
      )}

    </div>
  )
}
import { useState, useEffect, useRef } from 'react'
import Camera from './Camera'
import GlobalGallery from './GlobalGallery'
import { storage, db } from './firebase'
import { ref, uploadString, getDownloadURL } from 'firebase/storage'
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore'
import './App.css'

const FilmStrip = () => (
  <div className="film-strip">
    {Array.from({ length: 22 }).map((_, i) => <div key={i} className="film-hole" />)}
  </div>
)

export default function App() {
  const [step, setStep] = useState(() =>
    localStorage.getItem('guestName') ? 'camera' : 'welcome'
  )
  const [name, setName] = useState(() => localStorage.getItem('guestName') || '')
  const [localPhotos, setLocalPhotos] = useState([])
  const [globalPhotos, setGlobalPhotos] = useState([])
  const uploadedIds = useRef(new Set())

  useEffect(() => {
    const q = query(collection(db, 'fotograflar'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setGlobalPhotos(snap.docs.map(d => ({ firestoreId: d.id, ...d.data() })))
    })
    return () => unsub()
  }, [])

  const handleStart = (e) => {
    e?.preventDefault()
    if (name.trim()) {
      localStorage.setItem('guestName', name.trim())
      setStep('camera')
    } else {
      alert('Lütfen isminizi girin.')
    }
  }

  const handleFinish = async (photosFromCamera) => {
    setLocalPhotos(photosFromCamera)
    setStep('gallery')
    const newPhotos = photosFromCamera.filter(p => !uploadedIds.current.has(p.id))
    for (const photoObj of newPhotos) {
      try {
        const safeName = name.replace(/\s+/g, '_')
        const storageRef = ref(storage, `fotograflar/${safeName}_${photoObj.id}.jpg`)
        await uploadString(storageRef, photoObj.url, 'data_url')
        const downloadURL = await getDownloadURL(storageRef)
        await addDoc(collection(db, 'fotograflar'), {
          url: downloadURL,
          user: name,
          filter: photoObj.filter,
          localId: photoObj.id,
          createdAt: Date.now(),
        })
        uploadedIds.current.add(photoObj.id)
      } catch (err) {
        console.error('Yükleme hatası:', err)
      }
    }
  }

  if (step === 'welcome') {
    return (
      <div className="welcome-screen">
        <FilmStrip />
        <div className="welcome-content" style={{ position: 'relative' }}>
          <p className="welcome-frame-num">FRAME ▶ 001</p>
          <p className="welcome-title">WEDDING<br />CAM<br/></p>
          <div className="welcome-divider" />
          <p className="welcome-subtitle">ISO 400 — 35MM</p>

          <p className="welcome-input-label">▸ İSİM</p>
          <input
            className="welcome-input"
            type="text"
            placeholder="Ad Soyad_"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleStart()}
          />

          <button className="welcome-btn" onClick={handleStart}>
            <span className="welcome-btn-text">BAŞLAT</span>
            <span className="welcome-btn-arrow">▶</span>
          </button>

          <div className="exposure-counter">
            <div className="exposure-dot" />
            <span className="exposure-num">36</span>
          </div>
        </div>
        <FilmStrip />
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
        <Camera
          name={name}
          onFinish={handleFinish}
          localPhotos={localPhotos}
          setLocalPhotos={setLocalPhotos}
        />
      </div>
      {step === 'gallery' && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 20, background: '#080808' }}>
          <GlobalGallery
            localPhotos={localPhotos}
            globalPhotos={globalPhotos}
            currentUser={name}
            onBack={() => setStep('camera')}
          />
        </div>
      )}
    </div>
  )
}
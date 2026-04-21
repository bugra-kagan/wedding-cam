const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const vision = require("@google-cloud/vision");

initializeApp();

const visionClient = new vision.ImageAnnotatorClient();

// Storage'a yeni dosya yüklendiğinde tetiklenir
exports.moderatePhoto = onObjectFinalized({ region: "europe-west1" }, async (event) => {
  const filePath = event.data.name;
  const bucket   = event.data.bucket;

  // Sadece fotograflar/ klasöründeki dosyaları işle
  if (!filePath.startsWith("fotograflar/")) return;

  const db      = getFirestore();
  const storage = getStorage().bucket(bucket);
  const file    = storage.file(filePath);

  try {
    // Vision API SafeSearch analizi
    const [result] = await visionClient.safeSearchDetection(`gs://${bucket}/${filePath}`);
    const safe     = result.safeSearchAnnotation;

    const BLOCK_LEVELS = ["LIKELY", "VERY_LIKELY"];

    const isInappropriate =
      BLOCK_LEVELS.includes(safe.adult)    ||
      BLOCK_LEVELS.includes(safe.violence) ||
      BLOCK_LEVELS.includes(safe.racy);

    if (isInappropriate) {
      console.log(`⛔ Uygunsuz fotoğraf tespit edildi: ${filePath}`, safe);

      // Storage'dan sil
      await file.delete();

      // Firestore'daki ilgili kaydı bul ve sil
      // localId dosya adından parse ediliyor: "fotograflar/isim_LOCALID.jpg"
      const fileName = filePath.split("/").pop().replace(".jpg", "");
      const parts    = fileName.split("_");
      const localId  = parts[parts.length - 1];

      const snapshot = await db
        .collection("fotograflar")
        .where("localId", "==", localId)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        await snapshot.docs[0].ref.delete();
        console.log(`🗑️ Firestore kaydı silindi: localId=${localId}`);
      }

      return;
    }

    console.log(`✅ Fotoğraf temiz: ${filePath}`);

  } catch (err) {
    console.error("Vision API hatası:", err);
    // Hata durumunda fotoğrafı silmiyoruz, log'a düşüyor
  }
});
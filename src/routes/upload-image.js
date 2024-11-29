const express = require('express');
const multer = require('multer');
const { bucket, db } = require('../firebaseConfig');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const verifyToken = require('../middleware/authMiddleware');

const router = express.Router();

// Middleware multer untuk menangkap file
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// Pemetaan tipe kulit dari bahasa Inggris (dari ML server) ke bahasa Indonesia
const skinTypeMapping = {
  normal: 'normal',      // 'normal' tetap 'normal'
  dry: 'kering',         // 'dry' menjadi 'kering'
  oily: 'berminyak',     // 'oily' menjadi 'berminyak'
};

router.post('/', verifyToken, upload.single('image'), async (req, res) => {
  const userId = req.user.userId;

  // Pastikan file diunggah
  if (!req.file) {
    return res.status(400).json({ error: 'tidak ada file yang diunggah' });
  }

  try {
    // 1. Upload gambar ke Google Cloud Storage
    const fileName = `user-image/${uuidv4()}`;
    const blob = bucket.file(fileName);

    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: req.file.mimetype,
      },
    });

    blobStream.on('error', (error) => {
      console.error('Error uploading file to Cloud Storage:', error.message);
      res.status(500).json({ error: 'gagal mengunggah file ke cloud storage' });
    });

    blobStream.on('finish', async () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
      console.log(`File berhasil diunggah: ${publicUrl}`);

      try {
        // 2. Kirim URL gambar ke server ML untuk klasifikasi
        const classifyResponse = await axios.post('http://127.0.0.1:8000/classify-image', {
          imageUrl: publicUrl,
        });

        const { skin_type } = classifyResponse.data;
        console.log('ML server response:', { skin_type });

        // 3. Konversi hasil klasifikasi ke bahasa Indonesia menggunakan skinTypeMapping
        const mappedSkinType = skinTypeMapping[skin_type];
        if (!mappedSkinType) {
          return res.status(400).json({ error: `Skin type ${skin_type} not recognized in mapping` });
        }
        console.log('Mapped skin type:', mappedSkinType);

        // 4. Ambil rekomendasi produk dari Firestore berdasarkan tipe kulit yang sudah dipetakan
        const productsRef = db.collection('product');
        const snapshot = await productsRef.where('skin_type', 'array-contains', mappedSkinType).get();

        const recommendedProducts = [];
        snapshot.forEach((doc) => {
          const product = doc.data();
          recommendedProducts.push({
            product_id: product.product_id,
            product_name: product.product_name,
            description: product.description,
            price: `Rp ${Number(product.price).toLocaleString('id-ID')}`,
            product_image: product.product_image,
          });
        });

        if (recommendedProducts.length === 0) {
          console.warn('No products found for skin type:', mappedSkinType);
        }

        // 5. Simpan riwayat diagnosis ke Firestore
        const diagnosisData = {
          user_id: userId,
          image_url: publicUrl,
          skin_type: mappedSkinType,
          diagnosis_date: new Date().toISOString(),
          recommendations: recommendedProducts,
        };

        await db.collection('diagnosisHistory').add(diagnosisData);
        console.log('Data saved to Firestore:', diagnosisData);

        // 6. Respons sukses dengan hasil klasifikasi dan rekomendasi produk
        res.status(200).json({
          message: 'Berhasil Unggah Gambar, Berhasil klasifikasi, dan rekomendasi produk berhasil diambil',
          url: publicUrl,
          classification: { skin_type: mappedSkinType },
          recommendations: recommendedProducts,
        });
      } catch (error) {
        console.error('Error during classification or fetching recommendations:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Gagal melakukan klasifikasi dan pengambilan rekomendasi' });
      }
    });

    blobStream.end(req.file.buffer);
  } catch (error) {
    console.error('Unexpected error:', error.message);
    res.status(500).json({ error: 'Seperti nya ada yang salah nih..' });
  }
});

module.exports = router;

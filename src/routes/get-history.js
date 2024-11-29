const express = require('express');
const router = express.Router();
const { db } = require('../firebaseConfig');
const verifyToken = require('../middleware/authMiddleware');

router.get('/', verifyToken, async (req, res) => {
  const userId = req.user.userId; 

  try {
    console.log('User ID:', userId); 

    // Query Firestore berdasarkan user_id
    const historyRef = db.collection('diagnosisHistory').where('user_id', '==', userId);
    const snapshot = await historyRef.orderBy('diagnosis_date', 'desc').get();

    if (snapshot.empty) {
      console.log('No history found for user:', userId);
      return res.status(404).json({ message: 'data riwayat diagnosis tidak ditemukan' });
    }

    // Ambil semua data riwayat
    const history = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log('Fetched history:', history); 

    // Kirim respons dengan data riwayat
    res.status(200).json({
      message: 'Riwayat diagnosis berhasil di ambil',
      history,
    });
  } catch (error) {
    console.error('Error fetching diagnosis history:', error.code, error.message); 
    res.status(500).json({ error: 'Gagal mengambil riwayat diagnosis' });
  }
});

module.exports = router;

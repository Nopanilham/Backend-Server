const express = require('express');
const router = express.Router();
const { auth, db } = require('../firebaseConfig');

router.post('/', async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: "email, password dan name wajib di isi." });
  }

  try {
    // 1. Buat user di Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    // 2. Simpan data user ke Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email,
      name,
      createdAt: new Date().toISOString(),
    });

    // 3. Buat Custom Token
    const customToken = await auth.createCustomToken(userRecord.uid);

    // 4. Login menggunakan Custom Token untuk mendapatkan ID Token (Bearer Token)
    const idToken = await loginAndGetIdToken(customToken);

    res.status(201).json({
      message: "User berhasil mendaftar",
      userId: userRecord.uid,
      idToken, 
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: error.message });
  }
});

// Fungsi tambahan untuk login menggunakan custom token
const loginAndGetIdToken = async (customToken) => {
  const axios = require('axios');
  const FIREBASE_AUTH_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=AIzaSyDofs0M8tB2Z4iySrPO8W2BhTSMklNd2N8';

  const response = await axios.post(FIREBASE_AUTH_URL, {
    token: customToken,
    returnSecureToken: true,
  });

  return response.data.idToken; 
};

module.exports = router;

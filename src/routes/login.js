const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/', async (req, res) => {
  const { email, password } = req.body;

  // 1. Validasi input
  if (!email || !password) {
    return res.status(400).json({ error: "Email dan password diperlukan." });
  }

  try {
    // 2. Verifikasi email dan password dengan API Firebase
    const FIREBASE_AUTH_URL = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyDofs0M8tB2Z4iySrPO8W2BhTSMklNd2N8';

    const signInResponse = await axios.post(FIREBASE_AUTH_URL, {
      email,
      password,
      returnSecureToken: true,
    });

    // 3. Ambil data dari respons
    const { idToken, localId } = signInResponse.data;

    res.status(200).json({
      message: "User berhasil login",
      user: {
        uid: localId,
        email,
      },
      idToken,
    });
  } catch (error) {
    // Cek apakah ada respons dari Firebase API
    if (error.response) {
      const firebaseError = error.response.data.error?.message;

      // Tangani error spesifik
      if (firebaseError === "INVALID_PASSWORD") {
        return res.status(400).json({ error: "Password salah." });
      } else if (firebaseError === "EMAIL_NOT_FOUND") {
        return res.status(404).json({ error: "Email tidak ditemukan." });
      } else if (firebaseError === "MISSING_PASSWORD") {
        return res.status(400).json({ error: "Password tidak boleh kosong." });
      } else if (firebaseError === "INVALID_LOGIN_CREDENTIALS") {
        return res.status(400).json({ error: "Email atau password salah." });
      }

      // Tampilkan pesan error lain dari Firebase
      return res.status(400).json({ error: firebaseError || "Terjadi kesalahan pada input." });
    }

    // Jika error berasal dari server atau alasan lain
    console.error("Error logging in:", error.message);
    return res.status(500).json({ error: "Terjadi kesalahan pada server." });
  }
});

module.exports = router;

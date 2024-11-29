const { auth } = require('../firebaseConfig'); 

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: ada yang salah dengan token anda' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized: Token tidak ditemukan' });
    }

    const decodedToken = await auth.verifyIdToken(token);
    if (!decodedToken) {
      return res.status(401).json({ error: 'Unauthorized: token anda tidak valid' });
    }

    req.user = {
      userId: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || decodedToken.displayName,
    };

    next();
  } catch (error) {
    console.error('Error verifying token:', error.message);
    res.status(401).json({ error: 'Unauthorized: Token yang anda masukan tidak valid' });
  }
};

module.exports = verifyToken;

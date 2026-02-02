import jwt from 'jsonwebtoken';

const auth = (handler) => async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    req.user = decoded.user;
    
    return handler(req, res);
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};

export default auth;
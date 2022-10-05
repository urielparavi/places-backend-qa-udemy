const jwt = require('jsonwebtoken');

const HttpError = require('../models/http-error');

module.exports = (req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next();
  }
  try {
    const token = req.headers.authorization.split(' ')[1]; // Authorization: 'Bearer TOKEN'
    if (!token) {
      throw new Error('Authentication failed!');
    }
    // Verify the token and now we can return the payload that was encoded into the token
    const decodedToken = jwt.verify(token,process.env.JWT_KEY);
    // We add a userData property to the request object, and the user data I want to add to the request includes
    // my userId, which I get from the decodedToken
    req.userData = { userId: decodedToken.userId };
    next();
  } catch (err) {
    const error = new HttpError('Authentication failed!', 403);
    return next(error);
  }
};
'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config');

// Removed sensitive console.log statements
// const mySecret = process.env.JWT_SECRET || 'default_secret';

const authMiddleware = (req, res, next) => {
    const token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1];
    if (!token) return res.status(401).json({ message: 'No token provided' });

    jwt.verify(token, config.JWT_SECRET, (err, decoded) => {
        if (err) return res.status(403).json({ message: 'Failed to authenticate token' });
        req.userId = decoded.id;
        next();
    });
};

module.exports = authMiddleware;

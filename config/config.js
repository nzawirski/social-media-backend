module.exports = {
    port: process.env.PORT || 3001,
    databaseUrl: process.env.MONGODB_URI || 'mongodb://localhost/socmedia',
    secretKey: process.env.JWT_SECRET || '123qwe',
  };

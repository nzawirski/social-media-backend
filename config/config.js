module.exports = {
    port: process.env.PORT || 3001,
    databaseUrl: process.env.MONGODB_URI || 'mongodb://localhost/socmedia',
    secretKey: process.env.JWT_SECRET || '123qwe',
    mail: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      from: 'no-reply <re.nodeBookMedia@gmail.com>',
      auth: {
        user: process.env.ACCOUNT_USER || 'sample@gmail.com',
        pass: process.env.ACCOUNT_PASS || 'somePSWRD',
      }
    },
    frontendBaseUrl: 'https://sample.com/'
  };

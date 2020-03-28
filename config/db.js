const mongoose = require('mongoose');
const config = require('./config')

connect = () => {
    return new Promise((resolve, reject) => {
        if (process.env.NODE_ENV === 'test') {
            const { MongoMemoryServer } = require('mongodb-memory-server')
            const mongoServer = new MongoMemoryServer();

            mongoose.Promise = Promise;
            mongoServer.getUri().then((mongoUri) => {
                const mongooseOpts = {
                    useCreateIndex: true,
                    useNewUrlParser: true,
                    autoReconnect: true,
                    reconnectTries: Number.MAX_VALUE,
                    reconnectInterval: 1000,
                };
                mongoose.connect(mongoUri, mongooseOpts)
                var db = mongoose.connection;
                db.on('error', function (err) {
                    return reject(err);
                });
                db.once('open', function () {
                    console.log(`Connected to mock database ${mongoUri}`)
                    resolve();
                });
            })
        } else {
            mongoose.connect(config.databaseUrl, { useCreateIndex: true, useNewUrlParser: true, useUnifiedTopology: true })
            if(process.env.NODE_ENV !== 'production'){
                mongoose.set('debug', true) 
            }
            
            var db = mongoose.connection;
            db.on('error', function (err) {
                return reject(err);
            });
            db.once('open', function () {
                console.log(`Connected to Database ${config.databaseUrl}`)
                resolve();
            });
        }
    })
}

disconnect = () => {
    return mongoose.disconnect()
}

module.exports = { connect, disconnect }
const express = require('express');
const cors = require('cors');
const config = require('./config/config')
const db = require('./config/db')
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const port = config.port;
app.use(express.json());
app.use(cors());
app.use('/uploads', express.static('uploads'))
// doc
const swaggerUi = require('swagger-ui-express')
const YAML = require('yamljs');
const swaggerDoc = YAML.load('./swagger/swagger.yaml');
app.use('/api-doc', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// db
db.connect().catch((e)=>console.error('Error connecting to database ' + e))

// sockets
io.on('connection', function (socket) {
    console.log(`user connected on socket ${socket.id}`)
    socket.on('disconnect', function () {
        console.log(`user disconnected from socket ${socket.id}`);
    });
    socket.on('testConnection', function (userId) {
        console.log(`socket ${socket.id} identified user ${userId}`)
        io.emit(userId, `You are connected on socket ${socket.id}`);
    })
})
module.exports = io

// api
app.get('/', (req, res) => {
    res.send(`<h1>Hello, Go to <a href='/api-doc'>/api-doc</a> route to see documentation</h1>`);
});
app.use('/api/users',           require('./controller/user'))
app.use('/api/me',              require('./controller/me'))
app.use('/api/activate',        require('./controller/activate'))
app.use('/api/login',           require('./controller/login'))
app.use('/api/posts',           require('./controller/post'))
app.use('/api/comments',        require('./controller/comment'))
app.use('/api/conversations',   require('./controller/conversation'))
app.use('/api/notifications',   require('./controller/notification'))
app.use('/api/reset-password',  require('./controller/resetPass'))

// start
http.listen(port, () => {
    console.log(`Server Started on port ${port}`);
    process.env.NODE_ENV = process.env.NODE_ENV || 'dev'
    console.log(`Running in ${process.env.NODE_ENV} enviroment`)
})

module.exports = app
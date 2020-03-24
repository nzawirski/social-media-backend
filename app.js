const express = require('express');
const cors = require('cors');
const config = require('./config/config')
const app = express();
const http = require('http').createServer(app);

const port = config.port;
app.use(express.json());
app.use(cors());


// api
app.get('/', (req, res) => {
    res.send(`<h1>Hello world!</h1>`);
});

// start
http.listen(port, () => {
    console.log(`Server Started on port ${port}`);
})

module.exports = app
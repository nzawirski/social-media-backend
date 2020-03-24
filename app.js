const express = require('express');
const cors = require('cors');
const config = require('./config/config')
const db = require('./config/db')
const app = express();
const http = require('http').createServer(app);

const port = config.port;
app.use(express.json());
app.use(cors());

// doc
const swaggerUi = require('swagger-ui-express')
const YAML = require('yamljs');
const swaggerDoc = YAML.load('./swagger/swagger.yaml');
app.use('/api-doc', swaggerUi.serve, swaggerUi.setup(swaggerDoc));

// db
db.connect().catch((e)=>console.error('Error connecting to database ' + e))

// api
app.get('/', (req, res) => {
    res.send(`<h1>Hello, Go to <a href='/api-doc'>/api-doc</a> route to see documentation</h1>`);
});
app.use('/api/users', require('./controller/user'))
app.use('/api/me', require('./controller/me'))
app.use('/api/login', require('./controller/login'))

// start
http.listen(port, () => {
    console.log(`Server Started on port ${port}`);
})

module.exports = app
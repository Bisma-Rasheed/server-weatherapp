const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
        // allowedHeaders: ["my-custom-header"],
        // credentials: true
    },
});

const dotenv = require('dotenv');
const routes = require('./controller/routesController');
const cors = require('cors');
const mongoose = require('mongoose');

dotenv.config();
app.use(cors());
app.use(express.urlencoded({ extended: false }))
app.use(express.json());

mongoose.set("strictQuery", false);

mongoose.connect(`mongodb+srv://BismaRasheed:bisma@cluster0.pnt338c.mongodb.net/WeatherApp`, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('connection successful..');
}).catch((err) => console.log(err));

io.on('connection', (socket) => {
    console.log('a user connected');

    app.use('/', routes.route(socket));

});

server.listen(process.env.PORT, () => {
    console.log(`server listening on ${process.env.PORT}`);
});
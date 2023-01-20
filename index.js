const express = require('express');
const app = express();
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



app.use('/', routes);     

app.listen(process.env.PORT, ()=>{
    console.log(`server listening on ${process.env.PORT}`);
});
const express = require('express');
const app = express();
const dotenv = require('dotenv');

dotenv.config();

app.get('/', (req, res)=>{
    res.send({messgae: 'hello from server'});
});

app.listen(process.env.PORT, ()=>{
    console.log(`serve listening on ${process.env.PORT}`);
});
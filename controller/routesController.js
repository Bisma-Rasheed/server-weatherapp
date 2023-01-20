const route = require('express').Router();
const mongoose = require('mongoose');
const { hashSync, genSaltSync, compareSync } = require('bcrypt');
//const jwt = require('jsonwebtoken');

const weatherSchema = require('../model/weathermodel')(mongoose);
const weatherApp = new mongoose.model('weatherdata', weatherSchema);


route.get('/', (req, res) => {
    res.send({ messgae: 'hello from server' });
});

route.post('/adduser', async (req, res) => {
    const salt = genSaltSync(10);
    const password = hashSync(req.body.password, salt);

    var userData = await weatherApp.find({ username: req.body.username });
    if (userData[0] === undefined) {
        const addUser = new weatherApp({
            socketID: 'abc',
            email: req.body.email,
            username: req.body.username,
            password: password
        });

        const result = await addUser.save();
        res.send({ message: "user added" });
    }
    else {
        res.send({ message: 'user not added, already exists' });
    }
});

route.post('/readuser', async (req, res)=>{
    
});



module.exports = route;
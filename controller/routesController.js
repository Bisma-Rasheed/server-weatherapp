const route = require('express').Router();
const mongoose = require('mongoose');
const { hashSync, genSaltSync, compareSync } = require('bcrypt');

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

route.post('/readuser', async (req, res) => {

    var userData = await weatherApp.find({ email: req.body.email });
    if (userData[0] !== undefined) {
        const isvalidPassword = compareSync(req.body.password, userData[0].password);
        if (isvalidPassword) {
            res.send({ data: userData[0] });
        }
        else {
            res.send({ error: 'The password is incorrect' });
        }
    }
    else {
        res.send({ error: 'The user doesnt exist' });
    }
});

route.post('/addcity', async (req, res) => {
    var userData = await weatherApp.find({ email: req.body.email });

    const city = req.body.city.toLowerCase();
    const cond = (value) => value !== city;
    const cityNotExist = userData[0].city.every(cond);
    const _id = userData[0]._id;
    if (cityNotExist) {
        var userData = await weatherApp.findByIdAndUpdate(
            { _id },
            {
                $push: {
                    city: city,
                    temp: req.body.tempunit
                }
            },
            { new: true }
        );
        res.send({ data: userData });
    }
    else {
        res.send({ message: 'city already exists' });
    }

    
});


module.exports = route;
const route = require('express').Router();
const mongoose = require('mongoose');
const { hashSync, genSaltSync, compareSync } = require('bcrypt');
const dotenv = require('dotenv');
const axios = require('axios');
const fs = require('fs');

dotenv.config();

const weatherSchema = require('../model/usermodel')(mongoose);
const citiesSchema = require('../model/citiesmodel')(mongoose);
const weatherApp = new mongoose.model('weatherdata', weatherSchema);
const citiesModel = new mongoose.model('cities', citiesSchema);

const returnRouter = function (socket) {

    async function firstFetch(city) {
        if (city) {
            var cities = JSON.parse(fs.readFileSync('cities.json'));
            const cond = (value) => value !== city;
            const cityNotExist = cities.every(cond);

            if (cityNotExist) {
                cities.push(city);
                fs.writeFileSync("cities.json", JSON.stringify(cities));
            }
        }
        var cities = JSON.parse(fs.readFileSync('cities.json'));

        for (var i = 0; i < cities.length; i++) {
            try {
                const weather = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${cities[i]}&appid=${process.env.appID}&units=metric`);
                const checkCity = await citiesModel.find({ name: cities[i] });
                if (checkCity[0] === undefined) {
                    const addCity = new citiesModel({
                        name: weather.data.name.toLowerCase(),
                        icon: weather.data.weather[0].icon,
                        temp: weather.data.main.temp,
                        feels: weather.data.main.feels_like,
                        descr: weather.data.weather[0].description,
                        pressure: weather.data.main.pressure,
                        humidity: weather.data.main.humidity
                    });
                    const result = await addCity.save();
                }
                else {
                    const _id = checkCity[0]._id;
                    const result = await citiesModel.findByIdAndUpdate(
                        { _id },
                        {
                            $set: {
                                icon: weather.data.weather[0].icon,
                                temp: weather.data.main.temp,
                                feels: weather.data.main.feels_like,
                                descr: weather.data.weather[0].description,
                                pressure: weather.data.main.pressure,
                                humidity: weather.data.main.humidity
                            }
                        },
                        { new: true }
                    )
                }

            }
            catch (err) {
                console.log(err)
            }
        }
    }

    firstFetch();

    async function updateClients(userData){
        var cityArr = [];
        firstFetch();
        for (var i = 0; i < userData.city.length; i++) {
            var cityData = await citiesModel.find({ name: userData.city[i].name });
            if (userData.city[i].tempUnit === "C") {
                cityData[0].temp = cityData[0].temp + 'C';
                cityArr.push(cityData[0])
            }
            else {
                cityData[0].temp = Number((cityData[0].temp * 1.8) + 32) + 'F';
                cityArr.push(cityData[0]);
            }

        }
        var obj = {
            socketID: userData.socketID,
            email: userData.email,
            username: userData.username,
            city: cityArr
        }
        return obj;
    }

    socket.on('click', (msg) => {
        socket.emit('getSocketId', socket.id);
    });

    socket.on('disconnect', async () => {
        // console.log(socket.id);
        // const user = await weatherApp.find({socketID: socket.id});
        // //const _id = user._id;
        // console.log(user);
        // const user1 = await weatherApp.findByIdAndUpdate(
        //     {_id},
        //     {
        //         $set: {socketID: 'abc'}
        //     },
        //     {new: true}
        // );
        // console.log(user1);
        console.log('user disconnected');
    });

    let interval;

    if (interval) {
        clearInterval(interval);
    }

    interval = setInterval(() => getApiAndEmit(socket), 5000);

    const getApiAndEmit = async socket => {
        var socketUser = await weatherApp.find({socketID: socket.id});
        
        if(socketUser[0]!==undefined){
            var updatedData = await updateClients(socketUser[0]);
            socket.emit('dataupdated', updatedData);
        }
        
      };

    route.post('/adduser', async (req, res) => {
        const cities = [{ name: 'karachi', tempUnit: 'C' },
        { name: 'lahore', tempUnit: 'C' },
        { name: 'islamabad', tempUnit: 'C' },
        { name: 'quetta', tempUnit: 'C' },
        { name: 'peshawar', tempUnit: 'C' }];
        const salt = genSaltSync(10);
        const password = hashSync(req.body.password, salt);

        var userData = await weatherApp.find({ email: req.body.email });
        if (userData[0] === undefined) {
            try {
                const addUser = new weatherApp({
                    socketID: 'abc',
                    email: req.body.email,
                    username: req.body.username,
                    password: password,
                    city: cities
                });

                const result = await addUser.save();
                console.log('user saved');
                res.send({ message: "user added" });
            }
            catch (err) {
                console.log(err)
            }

        }
        else {
            res.send({ message: 'user not added, already exists' });
        }
    });

    route.post('/readuser', async (req, res) => {

        var userData = await weatherApp.find({ email: req.body.email });
        const _id = userData[0]._id;

        var userData = await weatherApp.findByIdAndUpdate(
            { _id },
            { $set: { socketID: req.body.socketID } },
            { new: true }
        );
        if (userData !== undefined) {
            const isvalidPassword = compareSync(req.body.password, userData.password);
            var cityArr = [];
            if (isvalidPassword) {

                for (var i = 0; i < userData.city.length; i++) {
                    var cityData = await citiesModel.find({ name: userData.city[i].name });
                    if (userData.city[i].tempUnit === "C") {
                        cityData[0].temp = cityData[0].temp + 'C';
                        cityArr.push(cityData[0])
                    }
                    else {
                        cityData[0].temp = Number((cityData[0].temp * 1.8) + 32) + 'F';
                        cityArr.push(cityData[0]);
                    }

                }
                var obj = {
                    socketID: userData.socketID,
                    email: userData.email,
                    username: userData.username,
                    city: cityArr
                }
                res.send({ data: obj });
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
        const cond = (value) => value.name !== city;
        const cityNotExist = userData[0].city.every(cond);
        const _id = userData[0]._id;
        if (cityNotExist) {
            var obj = {
                name: city,
                tempUnit: req.body.tempUnit.toUpperCase()
            }
            var userData = await weatherApp.findByIdAndUpdate(
                { _id },
                {
                    $push: {
                        city: obj
                    }
                },
                { new: true }
            );
            firstFetch(city);
            res.send({ data: userData });
        }
        else {
            res.send({ message: 'city already exists' });
        }
    });


    route.post('/getcitydata', async (req, res) => {

        try {
            const weather = await axios.get(`https://api.openweathermap.org/data/2.5/weather?q=${req.body.city}&appid=${process.env.appID}&units=metric`);
            var obj = {
                name: weather.data.name,
                icon: weather.data.weather[0].icon,
                temp: weather.data.main.temp,
                feels: weather.data.main.feels_like,
                descr: weather.data.weather[0].description,
                pressure: weather.data.main.pressure,
                humidity: weather.data.main.humidity
            }
            res.send({ data: obj });
        }
        catch (err) {
            console.log(err)
        }
    });
    return route;
}
module.exports = {
    route: returnRouter
};

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

    async function updateClients(userData, city) {
        var cityArr = [];
        if (city) {
            firstFetch(city);
        }
        firstFetch();
        const now = new Date();
        var time = 0;
        var hours = (now.getHours() > 12) ? now.getHours() - 12 : now.getHours();
        var minutes = (now.getMinutes() < 10) ? '0' + now.getMinutes() : now.getMinutes();
        var seconds = (now.getSeconds() < 10) ? '0' + now.getSeconds() : now.getSeconds();

        time = `${hours}:${minutes}:${seconds}PM`;
        currentTime = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} - ${time}`;
        for (var i = 0; i < userData.city.length; i++) {
            var cityData = await citiesModel.find({ name: userData.city[i].name });
            if (cityData[0] !== undefined) {
                if (userData.city[i].tempUnit === "C") {
                    cityData[0].temp = cityData[0].temp + 'C';
                    cityArr.push(cityData[0])
                }
                else {
                    cityData[0].temp = (Number((cityData[0].temp * 1.8) + 32).toFixed(2)) + 'F';
                    cityArr.push(cityData[0]);
                }
            }
            continue;


        }
        var obj = {
            socketID: userData.socketID,
            email: userData.email,
            username: userData.username,
            city: cityArr,
            fetchedAt: currentTime
        }
        return obj;
    }

    socket.on('click', (msg) => {
        socket.emit('getSocketId', socket.id);
    });

    socket.on('disconnect', async () => {
        console.log('user disconnected');
    });

    let interval;

    if (interval) {
        clearInterval(interval);
    }

    interval = setInterval(() => getApiAndEmit(socket), 5000);

    const getApiAndEmit = async socket => {
        var socketUser = await weatherApp.find({ socketID: socket.id });

        if (socketUser[0] !== undefined) {
            var updatedData = await updateClients(socketUser[0]);
            socket.emit('dataupdated', updatedData);
        }

    };

    route.get('/', (req, res) => {
        res.send({ message: 'hello from server' });
    });

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
        if (userData[0] !== undefined) {
            const _id = userData[0]._id;
            var userData = await weatherApp.findByIdAndUpdate(
                { _id },
                { $set: { socketID: req.body.socketID } },
                { new: true }
            );

            const isvalidPassword = compareSync(req.body.password, userData.password);
            var cityArr = [];
            if (isvalidPassword) {

                for (var i = 0; i < userData.city.length; i++) {
                    var cityData = await citiesModel.find({ name: userData.city[i].name });
                    if (cityData[0] !== undefined) {
                        if (userData.city[i].tempUnit === "C") {
                            cityData[0].temp = cityData[0].temp + 'C';
                            cityArr.push(cityData[0])
                        }
                        else {
                            cityData[0].temp = (Number((cityData[0].temp * 1.8) + 32).toFixed(2)) + 'F';
                            cityArr.push(cityData[0]);
                        }
                    }
                    continue;


                }

                const now = new Date();
                var time = 0;
                var hours = (now.getHours() > 12) ? now.getHours() - 12 : now.getHours();
                var minutes = (now.getMinutes() < 10) ? '0' + now.getMinutes() : now.getMinutes();
                var seconds = (now.getSeconds() < 10) ? '0' + now.getSeconds() : now.getSeconds();

                time = `${hours}:${minutes}:${seconds}PM`;
                currentTime = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} - ${time}`;
                var obj = {
                    socketID: userData.socketID,
                    email: userData.email,
                    username: userData.username,
                    city: cityArr,
                    fetchedAt: currentTime
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
            var userData = await updateClients(userData, city);
            res.send({ data: userData });
        }
        else {
            res.send({ message: 'city already exists' });
        }
    });
    return route;
}
module.exports = {
    route: returnRouter
};

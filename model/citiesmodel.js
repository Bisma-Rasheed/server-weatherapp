module.exports = (mongoose) => {
    const cities = new mongoose.Schema({
        name: String,
        icon: String,
        temp: String,
        feels: Number,
        descr: String,
        pressure: Number,
        humidity: Number
    });

    return cities;
}
module.exports = (mongoose) => {
    const socketUser = new mongoose.Schema({
        socketID: String,
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true
        },
        username: {
            type: String,
            required: true,
            unique: true
        },
        password: {
            type: String,
            required: true

        },
        city: [String],
        temp: [String]
    });

    return socketUser;
}
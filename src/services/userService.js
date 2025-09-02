const User = require("../models/User");

class UserService {
    static async createNewUser(userId) {
        let newUser = new User({
            userId: userId,
            coin: 0
        })
        const savedUser = await newUser.save();
        return savedUser
    }
    static async findUserById(userId) {
        let user = await User.findOne({ userId: userId })
        if (!user)
            user = await this.createNewUser(userId)
        return user;
    }
}

module.exports = UserService;


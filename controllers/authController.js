const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const users = [];

const JWT_SECRET = "temporary-secret-change-later";


// REGISTER
const register = async (req, res) => {

    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({
            success: false,
            message: "Username, email and password are required"
        });
    }

    const existingUser = users.find(
        user => user.email === email
    );

    if (existingUser) {
        return res.status(409).json({
            success: false,
            message: "User already exists"
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = {
        id: users.length + 1,
        username,
        email,
        password: hashedPassword
    };

    users.push(user);

    res.status(201).json({
        success: true,
        message: "Account created successfully",
        user: {
            id: user.id,
            username: user.username,
            email: user.email
        }
    });
};


// LOGIN
const login = async (req, res) => {

    const { email, password } = req.body;

    const user = users.find(
        user => user.email === email
    );

    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Invalid email or password"
        });
    }

    const passwordMatch = await bcrypt.compare(
        password,
        user.password
    );

    if (!passwordMatch) {
        return res.status(401).json({
            success: false,
            message: "Invalid email or password"
        });
    }

    const token = jwt.sign(
        {
            userId: user.id,
            email: user.email
        },
        JWT_SECRET,
        {
            expiresIn: "1h"
        }
    );

    res.json({
        success: true,
        message: "Login successful",
        token
    });
};


// LOGOUT
const logout = (req, res) => {

    // With JWT, logout is normally handled by
    // removing/invalidating the token on the client
    // or through a token blacklist/session mechanism.

    res.json({
        success: true,
        message: "Logout successful. Client should remove the token."
    });
};


module.exports = {
    register,
    login,
    logout
};
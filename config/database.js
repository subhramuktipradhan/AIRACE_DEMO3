const mysql = require("mysql2/promise");

const connectDatabase = async () => {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: 3306,
            ssl: {
                rejectUnauthorized: true
            }
        });

        console.log("MySQL database connected successfully.");

        return connection;
    } catch (error) {
        console.error("MySQL connection failed:", error.message);
        throw error;
    }
};

module.exports = connectDatabase;
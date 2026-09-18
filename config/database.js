const mysql = require("mysql2/promise");
const { getDatabaseSecrets } = require("./keyVault");

async function connectDatabase() {
    try {
        const secrets = await getDatabaseSecrets();

        const connection = await mysql.createConnection({
            host: "airace-vm-database.mysql.database.azure.com",
            user: secrets.username,
            password: secrets.password,
            database: secrets.database,
            ssl: {
                rejectUnauthorized: true
            }
        });

        console.log("Connected to Azure MySQL successfully");

        return connection;

    } catch (error) {
        console.error("Database connection failed:", error.message);
        throw error;
    }
}

module.exports = { connectDatabase };
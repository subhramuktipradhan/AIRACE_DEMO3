
const mysql = require("mysql2/promise");

const { getDatabaseSecrets } = require("./keyVault");

let activePool = null;


// Create a new MySQL connection pool
async function createDatabasePool() {

    const secrets = await getDatabaseSecrets();

    const newPool = mysql.createPool({

        host: "airace-vm-database.mysql.database.azure.com",

        user: secrets.username,

        password: secrets.password,

        database: secrets.database,

        ssl: {
            rejectUnauthorized: true
        },

        waitForConnections: true,

        connectionLimit: 5,

        queueLimit: 0

    });

    try {

        // Verify that the new credentials work
        const connection = await newPool.getConnection();

        try {
            await connection.query("SELECT 1");
        } finally {
            connection.release();
        }

        return newPool;

    } catch (error) {

        await newPool.end();

        throw error;

    }
}


// Initial database connection
async function connectDatabase() {

    const newPool = await createDatabasePool();

    activePool = newPool;

    console.log("Connected to Azure MySQL successfully");

    return activePool;
}


// Refresh database connection without restarting the Pod
async function refreshDatabaseConnection() {

    console.log("Refreshing MySQL connection pool");

    // Retrieve latest credentials and verify new connection
    const newPool = await createDatabasePool();

    const oldPool = activePool;

    // Switch future operations to the new pool
    activePool = newPool;

    console.log("MySQL connection pool refreshed successfully");

    // Close the previous connection pool
    if (oldPool) {

        try {
            await oldPool.end();
        } catch (error) {
            console.error(
                "Error closing previous MySQL pool:",
                error.message
            );
        }

    }
}


// Allow models/controllers to use the current pool
function getPool() {

    if (!activePool) {
        throw new Error("Database connection not initialized");
    }

    return activePool;
}


module.exports = {
    connectDatabase,
    refreshDatabaseConnection,
    getPool
};
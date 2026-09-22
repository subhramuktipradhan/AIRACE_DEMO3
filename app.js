
const express = require("express");

const authRoutes = require("./routes/auth");
const deviceRoutes = require("./routes/devices");
const coordinateRoutes = require("./routes/coordinates");

// Import database connection
const { connectDatabase } = require("./config/database");

// Import Redis secret-refresh listener
const {
    startSecretRefreshListener
} = require("./config/secretRefresh");

const app = express();

const PORT = 3000;

// Parse JSON request bodies
app.use(express.json());


// Health check
app.get("/", (req, res) => {
    res.json({
        service: "GNSS Backend API",
        status: "running"
    });
});


// API routes
app.use("/api/auth", authRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/coordinates", coordinateRoutes);


// Handle unknown routes
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "API endpoint not found"
    });
});


// Start application
async function startServer() {
    try {

        // Connect to Azure MySQL
        await connectDatabase();

        // Start the GNSS API server
        app.listen(PORT, () => {
            console.log(`GNSS API running on port ${PORT}`);
        });

        // Start listening for Redis notifications
        startSecretRefreshListener().catch(error => {
            console.error(
                "Redis secret listener failed:",
                error.message
            );
        });

    } catch (error) {

        console.error(
            "Application startup failed:",
            error.message
        );

        process.exit(1);
    }
}

startServer();
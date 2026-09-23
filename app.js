
const express = require("express");

const authRoutes = require("./routes/auth");
const deviceRoutes = require("./routes/devices");
const coordinateRoutes = require("./routes/coordinates");

// Database connection
const { connectDatabase } = require("./config/database");

// HTTP secret-refresh handlers
const {
    handleRefreshIngress,
    handleRefreshApply
} = require("./config/secretRefresh");


const app = express();

const PORT = 3000;


// Parse JSON request bodies
app.use(express.json());


// =====================================================
// HEALTH CHECK
// =====================================================

app.get("/", (req, res) => {

    res.json({
        service: "GNSS Backend API",
        status: "running"
    });

});


// =====================================================
// API ROUTES
// =====================================================

app.use("/api/auth", authRoutes);

app.use("/api/devices", deviceRoutes);

app.use("/api/coordinates", coordinateRoutes);


// =====================================================
// SECRET-REFRESH ENDPOINTS
// =====================================================

// Receives the Azure Function notification
app.post(
    "/api/internal/secret-refresh",
    handleRefreshIngress
);


// Receives internal notifications forwarded to each Pod
app.post(
    "/api/internal/secret-refresh/apply",
    handleRefreshApply
);


// =====================================================
// HANDLE UNKNOWN ROUTES
// =====================================================

app.use((req, res) => {

    res.status(404).json({
        success: false,
        message: "API endpoint not found"
    });

});


// =====================================================
// START APPLICATION
// =====================================================

async function startServer() {

    try {

        // Connect to Azure MySQL
        await connectDatabase();

        // Start GNSS API and HTTP refresh endpoints
        app.listen(PORT, () => {

            console.log(
                `GNSS API running on port ${PORT}`
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
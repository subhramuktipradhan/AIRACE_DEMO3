
const { getPool } = require("../config/database");


// =====================================================
// VALIDATE COORDINATE
// =====================================================

function validateCoordinate(latitude, longitude) {

    if (
        latitude === undefined ||
        longitude === undefined ||
        latitude === null ||
        longitude === null
    ) {
        return {
            valid: false,
            message: "Latitude and longitude are required"
        };
    }

    if (
        typeof latitude !== "number" ||
        typeof longitude !== "number" ||
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
    ) {
        return {
            valid: false,
            message: "Latitude and longitude must be valid numbers"
        };
    }

    if (latitude < -90 || latitude > 90) {
        return {
            valid: false,
            message: "Invalid latitude"
        };
    }

    if (longitude < -180 || longitude > 180) {
        return {
            valid: false,
            message: "Invalid longitude"
        };
    }

    return {
        valid: true
    };
}


// =====================================================
// SAVE COORDINATE TO MYSQL
// =====================================================

async function saveCoordinate(data) {

    const {
        device_id,
        latitude,
        longitude,
        altitude,
        timestamp
    } = data;

    const validation = validateCoordinate(
        latitude,
        longitude
    );

    if (!validation.valid) {
        return {
            success: false,
            message: validation.message
        };
    }

    if (
        typeof device_id !== "string" ||
        !device_id.trim() ||
        device_id.length > 100
    ) {
        return {
            success: false,
            message: "A valid device_id is required"
        };
    }

    if (
        altitude !== undefined &&
        altitude !== null &&
        (
            typeof altitude !== "number" ||
            !Number.isFinite(altitude)
        )
    ) {
        return {
            success: false,
            message: "Altitude must be a valid number"
        };
    }

    // Convert the timestamp to MySQL DATETIME format.
    // Store the timestamp in UTC.

    let mysqlTimestamp;

    if (timestamp !== undefined && timestamp !== null) {

        if (
            typeof timestamp !== "string" ||
            !timestamp.trim()
        ) {
            return {
                success: false,
                message: "Invalid timestamp"
            };
        }

        const date = new Date(timestamp);

        if (Number.isNaN(date.getTime())) {
            return {
                success: false,
                message: "Invalid timestamp"
            };
        }

        mysqlTimestamp = date
            .toISOString()
            .slice(0, 19)
            .replace("T", " ");

    } else {

        mysqlTimestamp = new Date()
            .toISOString()
            .slice(0, 19)
            .replace("T", " ");
    }


    // Get the current MySQL connection pool.

    const pool = getPool();


    // Insert coordinate into Azure MySQL.

    const insertQuery = `
        INSERT INTO coordinates
        (
            device_id,
            latitude,
            longitude,
            altitude,
            timestamp
        )
        VALUES (?, ?, ?, ?, ?)
    `;

    const [result] = await pool.execute(
        insertQuery,
        [
            device_id,
            latitude,
            longitude,
            altitude ?? null,
            mysqlTimestamp
        ]
    );


    // Retrieve the newly inserted record.

    const [rows] = await pool.execute(
        `
        SELECT
            id,
            device_id,
            latitude,
            longitude,
            altitude,
            timestamp
        FROM coordinates
        WHERE id = ?
        `,
        [result.insertId]
    );


    return {
        success: true,
        coordinate: rows[0]
    };
}


// =====================================================
// WRITE COORDINATE
// =====================================================

const writeCoordinate = async (req, res) => {

    try {

        const result = await saveCoordinate(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.message
            });
        }

        return res.status(201).json({
            success: true,
            operation: "WRITE",
            message: "Coordinate stored successfully in MySQL",
            data: result.coordinate
        });

    } catch (error) {

        console.error(
            "Coordinate insertion failed:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to store coordinate"
        });
    }
};


// =====================================================
// READ ALL COORDINATES
// =====================================================

const getCoordinates = async (req, res) => {

    try {

        const pool = getPool();

        const [rows] = await pool.execute(
            `
            SELECT
                id,
                device_id,
                latitude,
                longitude,
                altitude,
                timestamp
            FROM coordinates
            ORDER BY id DESC
            `
        );

        return res.json({
            success: true,
            operation: "READ",
            count: rows.length,
            data: rows
        });

    } catch (error) {

        console.error(
            "Failed to retrieve coordinates:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve coordinates"
        });
    }
};


// =====================================================
// READ COORDINATES FOR A SPECIFIC DEVICE
// =====================================================

const getDeviceCoordinates = async (req, res) => {

    try {

        const deviceId = req.params.deviceId;

        const pool = getPool();

        const [rows] = await pool.execute(
            `
            SELECT
                id,
                device_id,
                latitude,
                longitude,
                altitude,
                timestamp
            FROM coordinates
            WHERE device_id = ?
            ORDER BY id DESC
            `,
            [deviceId]
        );

        return res.json({
            success: true,
            operation: "READ",
            device_id: deviceId,
            count: rows.length,
            data: rows
        });

    } catch (error) {

        console.error(
            "Failed to retrieve device coordinates:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Failed to retrieve device coordinates"
        });
    }
};


// =====================================================
// EVALUATE COORDINATE
// =====================================================

const evaluateCoordinate = (req, res) => {

    const {
        latitude,
        longitude,
        altitude
    } = req.body;

    const validation = validateCoordinate(
        latitude,
        longitude
    );

    return res.json({
        success: true,
        operation: "EVALUATE",
        result: {
            coordinate_valid: validation.valid,
            message: validation.valid
                ? "Coordinate is valid"
                : validation.message,
            latitude,
            longitude,
            altitude: altitude ?? null
        }
    });
};


// =====================================================
// EVALUATE AND WRITE COORDINATE
// =====================================================

const processCoordinate = async (req, res) => {

    try {

        const result = await saveCoordinate(req.body);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                operation: "EVALUATE + WRITE",
                message: result.message,
                stored: false
            });
        }

        return res.status(201).json({
            success: true,
            operation: "EVALUATE + WRITE",
            message: "Coordinate evaluated and stored successfully in MySQL",
            stored: true,
            data: result.coordinate
        });

    } catch (error) {

        console.error(
            "Coordinate processing failed:",
            error.message
        );

        return res.status(500).json({
            success: false,
            operation: "EVALUATE + WRITE",
            message: "Failed to process coordinate",
            stored: false
        });
    }
};


// =====================================================
// EXPORT CONTROLLER FUNCTIONS
// =====================================================

module.exports = {
    writeCoordinate,
    getCoordinates,
    getDeviceCoordinates,
    evaluateCoordinate,
    processCoordinate
};
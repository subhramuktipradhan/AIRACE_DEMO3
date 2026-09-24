
const { getPool } = require("../config/database");


// =====================================================
// VALIDATE COORDINATE
// =====================================================

function validateCoordinate(latitude, longitude) {

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

    return { valid: true };
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

    let mysqlTimestamp;

    if (timestamp !== undefined && timestamp !== null) {

        const date = new Date(timestamp);

        if (
            typeof timestamp !== "string" ||
            !timestamp.trim() ||
            Number.isNaN(date.getTime())
        ) {
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

    const pool = getPool();

    const [result] = await pool.execute(
        `
        INSERT INTO coordinates
        (device_id, latitude, longitude, altitude, timestamp)
        VALUES (?, ?, ?, ?, ?)
        `,
        [
            device_id,
            latitude,
            longitude,
            altitude ?? null,
            mysqlTimestamp
        ]
    );

    const [rows] = await pool.execute(
        "SELECT * FROM coordinates WHERE id = ?",
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

        console.error("Coordinate insertion failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Failed to store coordinate"
        });
    }
};


// =====================================================
// FILTER AND PAGINATE COORDINATES
// =====================================================

async function fetchCoordinates(filters, routeDeviceId = null) {

    const {
        device_id,
        date,
        minLat,
        maxLat,
        page = "1",
        limit = "10",
        sort = "desc"
    } = filters;

    // Validate pagination

    function parsePositiveInteger(value, max) {

        const text = String(value);

        if (!/^[1-9]\d*$/.test(text)) {
            throw new Error("Invalid page or limit");
        }

        const number = Number(text);

        if (!Number.isSafeInteger(number) || number > max) {
            throw new Error("Invalid page or limit");
        }

        return number;
    }

    const pageNumber = parsePositiveInteger(page, 1000000);

    const pageLimit = parsePositiveInteger(limit, 100);

    const offset = (pageNumber - 1) * pageLimit;

    if (!["asc", "desc"].includes(sort)) {
        throw new Error("sort must be asc or desc");
    }

    // Build SQL filters

    const conditions = [];
    const params = [];

    const selectedDevice = routeDeviceId || device_id;

    if (selectedDevice !== undefined && selectedDevice !== null) {

        if (
            typeof selectedDevice !== "string" ||
            !selectedDevice.trim() ||
            selectedDevice.length > 100
        ) {
            throw new Error("Invalid device_id");
        }

        conditions.push("device_id = ?");
        params.push(selectedDevice);
    }

    if (date !== undefined) {

        if (
            typeof date !== "string" ||
            !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
            Number.isNaN(Date.parse(date + "T00:00:00Z")) ||
            new Date(date + "T00:00:00Z")
                .toISOString()
                .slice(0, 10) !== date
        ) {
            throw new Error("Date must be in YYYY-MM-DD format");
        }

        conditions.push("DATE(timestamp) = ?");
        params.push(date);
    }

    if (minLat !== undefined) {

        const value = Number(minLat);

        if (
            typeof minLat !== "string" ||
            !minLat.trim() ||
            !Number.isFinite(value) ||
            value < -90 ||
            value > 90
        ) {
            throw new Error("Invalid minLat");
        }

        conditions.push("latitude >= ?");
        params.push(value);
    }

    if (maxLat !== undefined) {

        const value = Number(maxLat);

        if (
            typeof maxLat !== "string" ||
            !maxLat.trim() ||
            !Number.isFinite(value) ||
            value < -90 ||
            value > 90
        ) {
            throw new Error("Invalid maxLat");
        }

        conditions.push("latitude <= ?");
        params.push(value);
    }

    if (
        minLat !== undefined &&
        maxLat !== undefined &&
        Number(minLat) > Number(maxLat)
    ) {
        throw new Error("minLat cannot be greater than maxLat");
    }

    const whereClause = conditions.length
        ? "WHERE " + conditions.join(" AND ")
        : "";

    const direction = sort === "asc" ? "ASC" : "DESC";

    const pool = getPool();

    // Count matching records

    const [countRows] = await pool.execute(
        `SELECT COUNT(*) AS total FROM coordinates ${whereClause}`,
        params
    );

    const total = countRows[0].total;

    // Retrieve only the requested page

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
        ${whereClause}
        ORDER BY timestamp ${direction}, id ${direction}
        LIMIT ? OFFSET ?
        `,
        [...params, pageLimit, offset]
    );

    return {
        total,
        page: pageNumber,
        limit: pageLimit,
        totalPages: Math.ceil(total / pageLimit),
        count: rows.length,
        data: rows
    };
}


// =====================================================
// READ COORDINATES WITH FILTERS
// =====================================================

const getCoordinates = async (req, res) => {

    try {

        const result = await fetchCoordinates(req.query);

        return res.json({
            success: true,
            operation: "READ",
            ...result
        });

    } catch (error) {

        console.error(
            "Coordinate retrieval failed:",
            error.message
        );

        if (
            error.message.startsWith("Invalid") ||
            error.message.startsWith("Date must") ||
            error.message.startsWith("sort must") ||
            error.message.startsWith("minLat cannot")
        ) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

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

        const result = await fetchCoordinates(
            req.query,
            deviceId
        );

        return res.json({
            success: true,
            operation: "READ",
            device_id: deviceId,
            ...result
        });

    } catch (error) {

        console.error(
            "Device coordinate retrieval failed:",
            error.message
        );

        if (
            error.message.startsWith("Invalid") ||
            error.message.startsWith("Date must") ||
            error.message.startsWith("sort must") ||
            error.message.startsWith("minLat cannot")
        ) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

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
// EVALUATE AND WRITE
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
// EXPORTS
// =====================================================

module.exports = {
    writeCoordinate,
    getCoordinates,
    getDeviceCoordinates,
    evaluateCoordinate,
    processCoordinate
};
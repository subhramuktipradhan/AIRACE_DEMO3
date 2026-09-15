const coordinates = [];


// ---------------------------------------------
// Validate coordinate
// ---------------------------------------------
function validateCoordinate(latitude, longitude) {

    if (
        latitude === undefined ||
        longitude === undefined
    ) {
        return {
            valid: false,
            message: "Latitude and longitude are required"
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


// ---------------------------------------------
// WRITE coordinate
// ---------------------------------------------
const writeCoordinate = (req, res) => {

    const {
        device_id,
        latitude,
        longitude,
        altitude,
        timestamp
    } = req.body;

    const validation = validateCoordinate(
        latitude,
        longitude
    );

    if (!validation.valid) {
        return res.status(400).json({
            success: false,
            message: validation.message
        });
    }

    if (!device_id) {
        return res.status(400).json({
            success: false,
            message: "device_id is required"
        });
    }

    const coordinate = {
        id: coordinates.length + 1,
        device_id,
        latitude,
        longitude,
        altitude: altitude ?? null,
        timestamp: timestamp || new Date().toISOString()
    };

    coordinates.push(coordinate);

    res.status(201).json({
        success: true,
        operation: "WRITE",
        message: "Coordinate stored successfully",
        data: coordinate
    });
};


// ---------------------------------------------
// READ all coordinates
// ---------------------------------------------
const getCoordinates = (req, res) => {

    res.json({
        success: true,
        operation: "READ",
        count: coordinates.length,
        data: coordinates
    });
};


// ---------------------------------------------
// READ coordinates for device
// ---------------------------------------------
const getDeviceCoordinates = (req, res) => {

    const deviceId = req.params.deviceId;

    const result = coordinates.filter(
        coordinate =>
            coordinate.device_id === deviceId
    );

    res.json({
        success: true,
        operation: "READ",
        device_id: deviceId,
        count: result.length,
        data: result
    });
};


// ---------------------------------------------
// EVALUATE coordinate
// ---------------------------------------------
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

    res.json({
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


// ---------------------------------------------
// EVALUATE + WRITE
// ---------------------------------------------
const processCoordinate = (req, res) => {

    const {
        device_id,
        latitude,
        longitude,
        altitude,
        timestamp
    } = req.body;

    const validation = validateCoordinate(
        latitude,
        longitude
    );

    if (!validation.valid) {
        return res.status(400).json({
            success: false,
            operation: "EVALUATE + WRITE",
            message: validation.message,
            stored: false
        });
    }

    if (!device_id) {
        return res.status(400).json({
            success: false,
            message: "device_id is required",
            stored: false
        });
    }

    const coordinate = {
        id: coordinates.length + 1,
        device_id,
        latitude,
        longitude,
        altitude: altitude ?? null,
        timestamp: timestamp || new Date().toISOString()
    };

    coordinates.push(coordinate);

    res.status(201).json({
        success: true,
        operation: "EVALUATE + WRITE",
        message: "Coordinate evaluated and stored successfully",
        stored: true,
        data: coordinate
    });
};


module.exports = {
    writeCoordinate,
    getCoordinates,
    getDeviceCoordinates,
    evaluateCoordinate,
    processCoordinate
};
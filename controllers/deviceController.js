const devices = [];


// REGISTER DEVICE
const registerDevice = (req, res) => {

    const {
        device_id,
        device_name,
        manufacturer
    } = req.body;

    if (!device_id || !device_name) {
        return res.status(400).json({
            success: false,
            message: "device_id and device_name are required"
        });
    }

    const existingDevice = devices.find(
        device => device.device_id === device_id
    );

    if (existingDevice) {
        return res.status(409).json({
            success: false,
            message: "Device already registered"
        });
    }

    const device = {
        id: devices.length + 1,
        device_id,
        device_name,
        manufacturer: manufacturer || "Unknown",
        status: "ACTIVE",
        registered_by: req.user.userId
    };

    devices.push(device);

    res.status(201).json({
        success: true,
        message: "GNSS device registered successfully",
        data: device
    });
};


// GET ALL DEVICES
const getDevices = (req, res) => {

    res.json({
        success: true,
        count: devices.length,
        data: devices
    });
};


// GET ONE DEVICE
const getDevice = (req, res) => {

    const device = devices.find(
        device => device.device_id === req.params.deviceId
    );

    if (!device) {
        return res.status(404).json({
            success: false,
            message: "Device not found"
        });
    }

    res.json({
        success: true,
        data: device
    });
};


module.exports = {
    registerDevice,
    getDevices,
    getDevice
};
const express = require("express");

const {
    registerDevice,
    getDevices,
    getDevice
} = require("../controllers/deviceController");

const authenticate = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", authenticate, registerDevice);

router.get("/", authenticate, getDevices);

router.get("/:deviceId", authenticate, getDevice);

module.exports = router;
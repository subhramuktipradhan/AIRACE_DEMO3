
const express = require("express");

const {
    writeCoordinate,
    getCoordinates,
    getDeviceCoordinates,
    evaluateCoordinate,
    processCoordinate
} = require("../controllers/coordinateController");

const authenticate = require("../middleware/authMiddleware");

const router = express.Router();


// WRITE
router.post("/", authenticate, writeCoordinate);


// READ ALL
router.get("/", authenticate, getCoordinates);


// READ BY DEVICE
router.get(
    "/device/:deviceId",
    authenticate,
    getDeviceCoordinates
);


// EVALUATE
router.post(
    "/evaluate",
    authenticate,
    evaluateCoordinate
);


// EVALUATE + WRITE
router.post(
    "/process",
    authenticate,
    processCoordinate
);


module.exports = router;
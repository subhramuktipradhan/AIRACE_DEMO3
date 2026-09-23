
const crypto = require("node:crypto");
const dns = require("node:dns").promises;

const { getSecret } = require("./keyVault");

const {
    refreshDatabaseConnection
} = require("./database");


// =====================================================
// CONFIGURATION
// =====================================================

const HEADLESS_SERVICE =
    "airace-demo-headless.default.svc.cluster.local";

const POD_PORT = 3000;

const MAX_REQUEST_AGE = 5 * 60 * 1000;


// =====================================================
// REGISTER SECRET REFRESH FUNCTIONS
// =====================================================

const handlers = new Map();

function registerSecretHandler(secretName, handler) {
    handlers.set(secretName, handler);
}


// Prevent simultaneous database refreshes
let databaseRefreshQueue = Promise.resolve();

function queueDatabaseRefresh() {

    const currentRefresh = databaseRefreshQueue.then(
        () => refreshDatabaseConnection()
    );

    databaseRefreshQueue = currentRefresh.catch((error) => {
        console.error(
            "Database refresh failed:",
            error.message
        );
    });

    return currentRefresh;
}


// Register MySQL secrets
registerSecretHandler(
    "mysql-username",
    queueDatabaseRefresh
);

registerSecretHandler(
    "mysql-password",
    queueDatabaseRefresh
);

registerSecretHandler(
    "Database-name",
    queueDatabaseRefresh
);


// =====================================================
// HANDLE SECRET CHANGES
// =====================================================

async function handleSecretChange(secretName) {

    const handler = handlers.get(secretName);

    if (!handler) {
        throw new Error(
            `No refresh handler registered for ${secretName}`
        );
    }

    await handler();

    console.log(
        `Secret refresh completed for ${secretName}`
    );
}


// =====================================================
// VERIFY AUTHENTICATED HTTP REQUESTS
// =====================================================

async function verifyRefreshRequest(req) {

    const secretName = req.body?.secretName;

    const timestamp = req.headers["x-airace-timestamp"];

    const eventId = req.headers["x-airace-event-id"];

    const signature = req.headers["x-airace-signature"];

    if (
        typeof secretName !== "string" ||
        !/^[a-zA-Z0-9-]{1,127}$/.test(secretName) ||
        typeof timestamp !== "string" ||
        !/^\d{13}$/.test(timestamp) ||
        typeof eventId !== "string" ||
        !/^[a-zA-Z0-9-]{1,128}$/.test(eventId) ||
        typeof signature !== "string" ||
        !/^[a-f0-9]{64}$/i.test(signature)
    ) {
        throw new Error("Invalid refresh request");
    }

    // Reject old notifications
    if (
        Math.abs(Date.now() - Number(timestamp)) >
        MAX_REQUEST_AGE
    ) {
        throw new Error("Refresh notification expired");
    }

    // Retrieve the authentication token from Key Vault
    const refreshToken = await getSecret(
        "airace-refresh-token"
    );

    const message =
        `${timestamp}\n${eventId}\n${secretName}`;

    const expectedSignature = crypto
        .createHmac("sha256", refreshToken)
        .update(message)
        .digest();

    const receivedSignature = Buffer.from(
        signature,
        "hex"
    );

    if (
        !crypto.timingSafeEqual(
            expectedSignature,
            receivedSignature
        )
    ) {
        throw new Error("Invalid refresh signature");
    }

    return {
        secretName,
        timestamp,
        eventId,
        signature
    };
}


// =====================================================
// APPLY REFRESH INSIDE AN INDIVIDUAL POD
// =====================================================

const completedEvents = new Map();

const processingEvents = new Map();

async function handleRefreshApply(req, res) {

    let notification;

    try {
        notification = await verifyRefreshRequest(req);
    } catch (error) {
        console.error(
            "Refresh authentication failed:",
            error.message
        );

        return res.status(401).json({
            success: false,
            message: "Unauthorized refresh request"
        });
    }

    const { secretName, eventId } = notification;

    if (!handlers.has(secretName)) {
        return res.status(422).json({
            success: false,
            message: "No refresh handler registered"
        });
    }

    // Avoid processing the same event twice
    if (completedEvents.has(eventId)) {
        return res.json({
            success: true,
            message: "Event already processed"
        });
    }

    try {

        if (!processingEvents.has(eventId)) {

            const refreshPromise =
                handleSecretChange(secretName);

            processingEvents.set(
                eventId,
                refreshPromise
            );
        }

        await processingEvents.get(eventId);

        completedEvents.set(eventId, Date.now());

        return res.json({
            success: true,
            message: "Secret refreshed successfully"
        });

    } catch (error) {

        console.error(
            "Secret refresh failed:",
            error.message
        );

        return res.status(503).json({
            success: false,
            message: "Secret refresh failed"
        });

    } finally {

        processingEvents.delete(eventId);

        // Remove old event records
        for (const [id, completedAt] of completedEvents) {
            if (Date.now() - completedAt > MAX_REQUEST_AGE) {
                completedEvents.delete(id);
            }
        }
    }
}


// =====================================================
// RECEIVE NOTIFICATION AND FORWARD TO ALL PODS
// =====================================================

async function handleRefreshIngress(req, res) {

    let notification;

    try {
        notification = await verifyRefreshRequest(req);
    } catch (error) {

        return res.status(401).json({
            success: false,
            message: "Unauthorized refresh request"
        });
    }

    if (!handlers.has(notification.secretName)) {
        return res.status(422).json({
            success: false,
            message: "No refresh handler registered"
        });
    }

    try {

        // Discover all ready application Pods
        const podAddresses = await dns.resolve4(
            HEADLESS_SERVICE
        );

        if (podAddresses.length === 0) {
            throw new Error("No ready application Pods found");
        }

        const body = JSON.stringify({
            secretName: notification.secretName
        });

        // Send the notification to every discovered Pod
        const results = await Promise.allSettled(

            podAddresses.map(async (podIP) => {

                const response = await fetch(
                    `http://${podIP}:${POD_PORT}/api/internal/secret-refresh/apply`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json",

                            "x-airace-timestamp":
                                notification.timestamp,

                            "x-airace-event-id":
                                notification.eventId,

                            "x-airace-signature":
                                notification.signature
                        },

                        body,

                        signal: AbortSignal.timeout(15000)
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        `Pod refresh returned HTTP ${response.status}`
                    );
                }
            })
        );

        const failed = results.filter(
            result => result.status === "rejected"
        );

        if (failed.length > 0) {

            console.error(
                `${failed.length} Pod refresh requests failed`
            );

            return res.status(503).json({
                success: false,
                message: "Some Pods failed to refresh"
            });
        }

        return res.json({
            success: true,
            message: "Refresh completed on all discovered Pods",
            podCount: podAddresses.length
        });

    } catch (error) {

        console.error(
            "Pod notification failed:",
            error.message
        );

        return res.status(503).json({
            success: false,
            message: "Unable to notify application Pods"
        });
    }
}


module.exports = {
    registerSecretHandler,
    handleSecretChange,
    handleRefreshIngress,
    handleRefreshApply
};
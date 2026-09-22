
const { createCluster } = require("@redis/client");

const { DefaultAzureCredential } = require("@azure/identity");

const {
    EntraIdCredentialsProviderFactory,
    REDIS_SCOPE_DEFAULT
} = require("@redis/entraid");

const net = require("node:net");

const {
    refreshDatabaseConnection
} = require("./database");


// Redis endpoint provided through Kubernetes
const redisEndpoint = process.env.REDIS_ENDPOINT;


// =====================================================
// REGISTER SECRET REFRESH FUNCTIONS
// =====================================================

const handlers = new Map();

function registerSecretHandler(secretName, handler) {
    handlers.set(secretName, handler);
}


// =====================================================
// PREVENT SIMULTANEOUS DATABASE REFRESHES
// =====================================================

// Queue database refresh operations
let databaseRefreshQueue = Promise.resolve();

function queueDatabaseRefresh() {

    const currentRefresh = databaseRefreshQueue.then(
        () => refreshDatabaseConnection()
    );

    databaseRefreshQueue = currentRefresh.catch((error) => {
        console.error(
            "Database refresh attempt failed:",
            error.message
        );
    });

    return currentRefresh;
}


// =====================================================
// REGISTER MYSQL-RELATED SECRETS
// =====================================================

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
// HANDLE SECRET-CHANGE NOTIFICATIONS
// =====================================================

async function handleSecretChange(secretName) {

    const handler = handlers.get(secretName);

    if (!handler) {
        console.log(
            `No refresh handler registered for ${secretName}`
        );
        return;
    }

    await handler();

    console.log(
        `Secret refresh completed for ${secretName}`
    );
}


// =====================================================
// CONNECT TO AZURE MANAGED REDIS
// =====================================================

async function startSecretRefreshListener() {

    if (!redisEndpoint) {
        throw new Error(
            "REDIS_ENDPOINT is not configured"
        );
    }

    // Authenticate using AKS Workload Identity
    const credential = new DefaultAzureCredential();

    const provider =
        EntraIdCredentialsProviderFactory
            .createForDefaultAzureCredential({

                credential,

                scopes: REDIS_SCOPE_DEFAULT,

                options: {},

                tokenManagerConfig: {
                    expirationRefreshRatio: 0.8
                }
            });


    const redisHost = redisEndpoint.split(":")[0];


    // Connect to Azure Managed Redis OSS Cluster
    const subscriber = createCluster({

        rootNodes: [
            {
                url: `rediss://${redisEndpoint}`
            }
        ],

        defaults: {

            credentialsProvider: provider,

            socket: {
                tls: true,
                connectTimeout: 15000
            }
        },

        nodeAddressMap(incomingAddress) {

            const [hostnameOrIP, port] =
                incomingAddress.split(":");

            return {

                host: net.isIP(hostnameOrIP)
                    ? redisHost
                    : hostnameOrIP,

                port: Number(port)
            };
        }
    });


    subscriber.on("error", (error) => {
        console.error(
            "Redis connection error:",
            error.message
        );
    });


    // Establish Redis connection
    await subscriber.connect();

    console.log(
        "Connected to Azure Managed Redis successfully"
    );


    // =================================================
    // SUBSCRIBE TO SECRET-CHANGE NOTIFICATIONS
    // =================================================

    await subscriber.subscribe(

        "airace:keyvault:changed",

        async (message) => {

            try {

                const notification = JSON.parse(message);

                if (
                    notification.type !== "secret-version-created" ||
                    typeof notification.secretName !== "string"
                ) {
                    return;
                }

                console.log(
                    "Secret change notification received:",
                    notification.secretName
                );

                // Refresh the affected configuration
                await handleSecretChange(
                    notification.secretName
                );

            } catch (error) {

                console.error(
                    "Secret refresh failed:",
                    error.message
                );
            }
        }
    );


    console.log(
        "Redis secret notification listener started"
    );

    return subscriber;
}


// =====================================================
// EXPORT FUNCTIONS
// =====================================================

module.exports = {
    registerSecretHandler,
    handleSecretChange,
    startSecretRefreshListener
};
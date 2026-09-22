
const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");

const keyVaultUrl = "https://mysql-key-1.vault.azure.net";

const credential = new DefaultAzureCredential();

const client = new SecretClient(keyVaultUrl, credential);

// Retrieve the latest value of any permitted secret
async function getSecret(secretName) {

    const secret = await client.getSecret(secretName);

    return secret.value;
}

// Retrieve all database credentials
async function getDatabaseSecrets() {

    const username = await getSecret("mysql-username");

    const password = await getSecret("mysql-password");

    const database = await getSecret("Database-name");

    return {
        username,
        password,
        database
    };
}

module.exports = {
    getSecret,
    getDatabaseSecrets
};
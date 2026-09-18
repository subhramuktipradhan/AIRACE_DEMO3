const { DefaultAzureCredential } = require("@azure/identity");
const { SecretClient } = require("@azure/keyvault-secrets");

const keyVaultUrl = "https://mysql-key-1.vault.azure.net";

const credential = new DefaultAzureCredential();

const client = new SecretClient(keyVaultUrl, credential);

async function getDatabaseSecrets() {
    const username = await client.getSecret("mysql-username");
    const password = await client.getSecret("mysql-password");
    const database = await client.getSecret("mysql-database");

    return {
        username: username.value,
        password: password.value,
        database: database.value
    };
}

module.exports = { getDatabaseSecrets };
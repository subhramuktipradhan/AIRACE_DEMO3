const result = document.getElementById("result");
const checkHealthButton = document.getElementById("checkHealth");

// Empty because frontend Nginx will proxy /health to the backend internally.
const BACKEND_URL = "";

checkHealthButton.addEventListener("click", async () => {

    result.textContent = "Checking backend...";

    try {

        const response = await fetch(`${BACKEND_URL}/health`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();

        result.textContent =
            `Backend is running: ${JSON.stringify(data)}`;

    } catch (error) {

        result.textContent =
            `Backend connection failed: ${error.message}`;
    }
});
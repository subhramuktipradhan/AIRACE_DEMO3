const result = document.getElementById("result");
const checkHealthButton = document.getElementById("checkHealth");

const BACKEND_URL = "http://135.234.186.23";

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
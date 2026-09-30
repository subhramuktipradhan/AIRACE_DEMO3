const result = document.getElementById("result");
const checkHealthButton = document.getElementById("checkHealth");

checkHealthButton.addEventListener("click", async () => {

    result.textContent = "Checking backend...";

    try {

        const response = await fetch("/backend-health");

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
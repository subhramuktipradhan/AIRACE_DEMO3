const result =
    document.getElementById("result");

const checkHealthButton =
    document.getElementById("checkHealth");


checkHealthButton.addEventListener(
    "click",
    async () => {

        result.innerHTML = `
            <span class="status-dot neutral"></span>
            Checking AIRACE backend...
        `;

        checkHealthButton.disabled = true;

        try {

            const response =
                await fetch("/backend-health");


            if (!response.ok) {

                throw new Error(
                    `HTTP ${response.status}`
                );
            }


            const data =
                await response.json();


            result.innerHTML = `
                <span class="status-dot success"></span>

                Backend Online —
                ${data.service || "AIRACE API"}
                (${data.status || "running"})
            `;


        } catch (error) {

            result.innerHTML = `
                <span class="status-dot error"></span>

                Backend unavailable —
                ${error.message}
            `;

        } finally {

            checkHealthButton.disabled = false;
        }
    }
);
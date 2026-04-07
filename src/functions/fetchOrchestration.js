const { app } = require('@azure/functions');
const df = require('durable-functions');

const activityName = 'fetchTitle';

// Orchestrator function
df.app.orchestration('fetchOrchestration', function* (context) {
    context.log("Fetching data.");

    const urls = [
        "https://learn.microsoft.com/azure/azure-functions/durable/durable-functions-overview",
        "https://learn.microsoft.com/azure/azure-functions/durable/durable-task-scheduler/durable-task-scheduler",
        "https://learn.microsoft.com/azure/azure-functions/functions-scenarios",
        "https://learn.microsoft.com/azure/azure-functions/functions-create-ai-enabled-apps",
    ];

    // Fan out: run fetching tasks in parallel
    const parallelTasks = urls.map(url => context.df.callActivity(activityName, url));

    // Fan in: wait for all parallel tasks to complete
    const results = yield context.df.Task.all(parallelTasks);

    // Return fetched titles as a formatted string
    return results.join("; ");
});

// Activity function
df.app.activity(activityName, {
    handler: async (url, context) => {
        context.log(`Fetching from url ${url}.`);

        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const content = await response.text();

            // Extract page title
            const titleMatch = content.match(/<title[^>]*>([^<]+?)\s*\|\s*Microsoft Learn<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : "No title found";

            return title;
        } catch (error) {
            return `Error fetching from ${url}: ${error.message}`;
        }
    },
});

// HTTP trigger to start the orchestration
app.http('FetchOrchestration_HttpStart', {
    route: 'FetchOrchestration_HttpStart',
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    extraInputs: [df.input.durableClient()],
    handler: async (request, context) => {
        const client = df.getClient(context);
        const instanceId = await client.startNew('fetchOrchestration');
        context.log(`Started orchestration with ID = '${instanceId}'.`);
        return client.createCheckStatusResponse(request, instanceId);
    },
});

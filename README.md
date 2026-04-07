<!--
---
name: Durable Functions JavaScript Fan-Out/Fan-In using Azure Developer CLI
description: This repository contains a Durable functions quickstart written in JavaScript demonstrating the fan-out/fan-in pattern. It's deployed to Azure Functions Flex Consumption plan using the Azure Developer CLI (azd). The sample uses managed identity and a virtual network to make sure deployment is secure by default.
page_type: sample
products:
- azure-functions
- azure
- entra-id
urlFragment: starter-durable-fan-out-fan-in-javascript
languages:
- javascript
- bicep
- azdeveloper
---
-->

# Durable Functions Fan-Out/Fan-In using Azure Developer CLI

This template repository contains a Durable Functions sample demonstrating the fan-out/fan-in pattern in JavaScript (Node.js v4 programming model). The sample can be easily deployed to Azure using the Azure Developer CLI (`azd`). It uses managed identity and a virtual network to make sure deployment is secure by default. You can opt out of a VNet being used in the sample by setting VNET_ENABLED to false in the parameters.

[Durable Functions](https://learn.microsoft.com/azure/azure-functions/durable/durable-functions-overview) is part of Azure Functions offering. It helps orchestrate stateful logic that's long-running or multi-step by providing *durable execution*. An execution is durable when it can continue in another process or machine from the point of failure in the face of interruptions or infrastructure failures. Durable Functions handles automatic retries and state persistence as your orchestrations run to ensure durable execution. 

Durable Functions needs a [backend provider](https://learn.microsoft.com/azure/azure-functions/durable/durable-functions-storage-providers) to persist application states. This sample uses the Azure Storage backend. 

## Prerequisites

+ [Node.js 20 or higher](https://nodejs.org/)
+ [Azure Functions Core Tools](https://learn.microsoft.com/azure/azure-functions/functions-run-local?pivots=programming-language-javascript#install-the-azure-functions-core-tools)
+ [Visual Studio Code](https://code.visualstudio.com/)
+ [Azure Functions extension](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-azurefunctions)

## Initialize the local project

You can initialize a project from this `azd` template in one of these ways:

+ Use this `azd init` command from an empty local (root) folder:

    ```shell
    azd init --template durable-functions-quickstart-javascript-azd
    ```

    Supply an environment name, such as `dfquickstart` when prompted. In `azd`, the environment is used to maintain a unique deployment context for your app.

+ Clone the GitHub template repository locally using the `git clone` command:

    ```shell
    git clone https://github.com/Azure-Samples/durable-functions-quickstart-javascript-azd.git
    cd src
    ```

    You can also clone the repository from your own fork in GitHub.

## Prepare your local environment

Navigate to the `src` app folder and create a file in that folder named _local.settings.json_ that contains this JSON data:

```json
{
    "IsEncrypted": false,
    "Values": {
        "AzureWebJobsStorage": "UseDevelopmentStorage=true",
        "FUNCTIONS_WORKER_RUNTIME": "node"
    }
}
```

### Start Azurite
The Functions runtime requires a storage component. The line `"AzureWebJobsStorage": "UseDevelopmentStorage=true"` above tells the runtime that the local storage emulator, Azurite, will be used. Azurite needs to be started before running the app, and there are two options to do that:
* Option 1: Run `npx azurite --skipApiVersionCheck --location ~/azurite-data`
* Option 2: Run `docker run -p 10000:10000 -p 10001:10001 -p 10002:10002 mcr.microsoft.com/azure-storage/azurite`

## Run your app from the terminal

1. Install dependencies. From the `src` folder, run:

    ```shell
    npm install
    ```

1. Start the Functions host locally:

    ```shell
    func start
    ```

1. From your HTTP test tool in a new terminal (or from your browser), call the HTTP trigger endpoint: <http://localhost:7071/api/FetchOrchestration_HttpStart> to start a new orchestration instance. This orchestration then fans out to several activities to fetch the titles of Microsoft Learn articles in parallel. When the activities finish, the orchestration fans back in and returns the titles as a formatted string. 

    The HTTP endpoint should return several URLs (showing a few below for brevity). The `statusQueryGetUri` provides the orchestration status. 
    ```json
    {
        "id": "9addc67238604701a38d1470874a5f04",
        "statusQueryGetUri": "http://localhost:7071/runtime/webhooks/durabletask/instances/9addc67238604701a38d1470874a5f04?taskHub=TestHubName&connection=Storage&code=<code>",
        "sendEventPostUri": "http://localhost:7071/runtime/webhooks/durabletask/instances/9addc67238604701a38d1470874a5f04/raiseEvent/{eventName}?taskHub=TestHubName&connection=Storage&code=<code>",
        "terminatePostUri": "http://localhost:7071/runtime/webhooks/durabletask/instances/9addc67238604701a38d1470874a5f04/terminate?reason={text}&taskHub=TestHubName&connection=Storage&code<code>",
    }
    ```

1. When you're done, press Ctrl+C in the terminal window to stop the `func.exe` host process.

## Source Code
Fanning out is easy to do with regular functions, simply send multiple messages to a queue. However, fanning in is more challenging, because you need to track when all the functions are completed and store the outputs.

Durable Functions makes implementing fan-out/fan-in easy for you. This sample uses a simple scenario of fetching article titles in parallel to demonstrate how you can implement the pattern with Durable Functions. In `fetchOrchestration`, the title fetching activities are tracked using a dynamic task list. The line `yield context.Task.all(parallelTasks)` waits for all the called activities, which are run concurrently, to complete. When done, all outputs are aggregated as a formatted string. More sophisticated aggregation logic is probably required in real-world scenarios, such as uploading the result to storage or sending it downstream, which you can do by calling another activity function.

```javascript
df.app.orchestration('fetchOrchestration', function* (context) {
    context.log("Fetching data.");

    const urls = [
        "https://learn.microsoft.com/azure/azure-functions/durable/durable-functions-overview",
        "https://learn.microsoft.com/azure/azure-functions/durable/durable-task-scheduler/durable-task-scheduler",
        "https://learn.microsoft.com/azure/azure-functions/functions-scenarios",
        "https://learn.microsoft.com/azure/azure-functions/functions-create-ai-enabled-apps",
    ];

    // Fan out: run fetching tasks in parallel
    const parallelTasks = urls.map(url => context.df.callActivity('fetchTitle', url));

    // Fan in: wait for all parallel tasks to complete
    const results = yield context.df.Task.all(parallelTasks);

    // Return fetched titles as a formatted string
    return results.join("; ");
});
```


## Deploy to Azure

Run this command to provision the function app, with any required Azure resources, and deploy your code:

```shell
azd up
```

By default, this sample prompts to enable a virtual network for enhanced security. If you want to deploy without a virtual network without prompting, you can configure `VNET_ENABLED` to `false` before running `azd up`:

```bash
azd env set VNET_ENABLED false
azd up
```

You're prompted to supply these required deployment parameters:

| Parameter | Description |
| ---- | ---- |
| _Environment name_ | An environment that's used to maintain a unique deployment context for your app. You won't be prompted if you created the local project using `azd init`.|
| _Azure subscription_ | Subscription in which your resources are created.|
| _Azure location_ | Azure region in which to create the resource group that contains the new Azure resources. Only regions that currently support the Flex Consumption plan are shown.|

## Test deployed app

Once deployment is done, test the Durable Functions app by making an HTTP request to trigger the start of an orchestration. To get the endpoint quickly, run the following: 

    ```shell
    az functionapp function list --resource-group <resource-group-name> --name <function-app-name> --query "[].{name:name, url:invokeUrlTemplate}" --output table
    ```

The _function-app-name/http_start_ is the endpoint, and it should look like:
 
 ```
 https://<function-app-name>.azurewebsites.net/api/fetchorchestration_httpstart
 ```

## Redeploy your code

You can run the `azd up` command as many times as you need to both provision your Azure resources and deploy code updates to your function app.

>[!NOTE]
>Deployed code files are always overwritten by the latest deployment package.

## Clean up resources

When you're done working with your function app and related resources, you can use this command to delete the function app and its related resources from Azure and avoid incurring any further costs:

```shell
azd down
```

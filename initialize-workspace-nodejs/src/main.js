const workspace = require('genesys-workspace-client-js');

const apiKey = "<apiKey>";
const apiUrl = "<apiUrl>";

//region Create an instance of WorkspaceApi
//First we need to create a new instance of the WorkspaceApi class with the following parameters: **apiKey** (required to submit API requests) and **apiUrl** (base URL that provides access to the PureEngage Cloud APIs). You can get the values for both of these parameters from your PureEngage Cloud representative.
const workspaceApi = new workspace(apiKey, apiUrl);
//endregion

//region Authorization code grant
//Authorization code should be obtained before (See https://github.com/GenesysPureEngage/authorization-code-grant-sample-app)
const authorizationToken = "<authorizationToken>";
//endregion

//region Initialization
//Initialize the Workspace API by calling `initialize()` and passing **token**, which we received from the Authentication API. After initialization, get the current user.
workspaceApi.initialize({token: authorizationToken}).then(data => {
    console.log(workspaceApi.user);
    console.log('done');
    workspaceApi.destroy();
}).catch(console.error);
//endregion














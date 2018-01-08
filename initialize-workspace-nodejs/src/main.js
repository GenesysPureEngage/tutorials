const workspace = require('genesys-workspace-client-js');

const apiKey = "<apiKey>";
const apiUrl = "<apiUrl>";

//region Create an instance of WorkspaceApi
//First we need to create a new instance of the WorkspaceApi class with the following parameters: **apiKey** (required to submit API requests) and **apiUrl** (base URL that provides access to the PureEngage Cloud APIs). You can get the values for both of these parameters from your PureEngage Cloud representative.
const workspaceApi = new workspace(apiKey, apiUrl);
//endregion

//region Authorization code grant
//You'll need to use the Authentication API to get an authorization token. See https://github.com/GenesysPureEngage/authorization-code-grant-sample-app for an example of how to do this.
const authorizationToken = "<authorizationToken1>";
//endregion

//region Initialization
//Initialize the Workspace API with the authorization token from the previous step. After initialization, get the current user.
workspaceApi.initialize({token: authorizationToken}).then(data => {
    console.log(workspaceApi.user);
    console.log('done');
    workspaceApi.destroy();
}).catch(console.error);
//endregion














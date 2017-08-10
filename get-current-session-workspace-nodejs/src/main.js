const authorization = require('genesys-authorization-client-js');
const workspace = require('genesys-workspace-client-js');

//Usage: <apiKey> <apiUrl> <agentUsername> <agentPassword>
const argv = process.argv.slice(2);
const apiKey = argv[0];
const apiUrl = argv[1];
const agentUsername = argv[2];
const agentPassword = argv[3];

const workspaceUrl = `${apiUrl}/workspace/v3`;
const authenticationUrl = apiUrl;

//region Initialize API Client
//Create and setup ApiClient instance with your ApiKey and Workspace API URL.
const workspaceClient = new workspace.ApiClient();
workspaceClient.basePath = workspaceUrl;
workspaceClient.enableCookies = true;
workspaceClient.defaultHeaders = { 'x-api-key': apiKey };

//region Initialize Authorization Client
//Create and setup an ApiClient instance with your ApiKey and Authorization API URL.
const authenticationClient = new authorization.ApiClient(authenticationUrl);
authenticationClient.basePath = authenticationUrl;
authenticationClient.enableCookies = true;
authenticationClient.defaultHeaders = { 'x-api-key': apiKey };

//region Create SessionApi instances
//Creating instances of SessionApi using the workspace ApiClient which will be used to make api calls.
const sessionApi = new workspace.SessionApi(workspaceClient);

//region Create AuthenticationApi instance
//Create instance of AuthenticationApi using the authorization ApiClient which will be used to retrieve access token.
const authorizationApi = new authorization.AuthenticationApi(authenticationClient);

//region Oauth2 Authentication
//Performing Oauth 2.0 authentication.
console.info("Retrieving access token");
const opts = {
    authorization: "Basic " + new Buffer("external_api_client:secret").toString("base64"),
    clientId: "external_api_client",
    username: agentUsername,
    password: agentPassword
};
authorizationApi.retrieveTokenWithHttpInfo("password", "scope", opts).then(resp => {
    const data = resp.response.body;
    const accessToken = data.access_token;
    if(!accessToken) {
        console.error(data);
        throw new Error('Cannot get access token');
    }

    console.info("Initializing workspace");
    sessionApi.initializeWorkspace({authorization : "Bearer " + accessToken}).then(resp => {
        //region Current session information
        //Obtaining current session information using SessionApi
        sessionApi.getCurrentSession().then(resp => {
            if(resp.status.code !== 0) {
                console.error(resp);
                throw new Error('Cannot get session');
            }
            
            console.info(resp.data);
        }).catch(err => {
            console.error(err);
        }).then(() => {
            //region Logging out
            //Ending our Workspace API session
            sessionApi.logout();
            //endregion
        });            
    });
}).catch(err => {
    console.error(err);
});

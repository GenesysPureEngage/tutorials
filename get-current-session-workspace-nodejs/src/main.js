const authorization = require('genesys-authorization-client-js');
const workspace = require('genesys-workspace-client-js');

//Usage: <apiKey> <clientId> <clietnSecret> <apiUrl> <agentUsername> <agentPassword>
const argv = process.argv.slice(2);
const apiKey = argv[0];
const clientId = argv[1];
const clientSecret = argv[2];
const apiUrl = argv[3];
const agentUsername = argv[4];
const agentPassword = argv[5];

const workspaceUrl = `${apiUrl}/workspace/v3`;
const authenticationUrl = `${apiUrl}/auth/v3`;

//region Initialize API Client
//Create and setup ApiClient instance with your ApiKey and Workspace API URL.
const workspaceClient = new workspace.ApiClient();
workspaceClient.basePath = workspaceUrl;
workspaceClient.defaultHeaders = { 'x-api-key': apiKey };

//region Initialize Authorization Client
//Create and setup an ApiClient instance with your ApiKey and Authorization API URL.
const authenticationClient = new authorization.ApiClient(authenticationUrl);
authenticationClient.basePath = authenticationUrl;
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
authorizationApi.retrieveToken("password", clientId, agentUsername, agentPassword, 
    {authorization: "Basic " + new Buffer(`${clientId}:${clientSecret}`).toString("base64")},
    (err, data, resp) => {
        const body = resp? resp.body: {};
        if (err || !body.access_token) {
            console.error("Error getting access token");
            console.error(body);
        }
        else {
            console.info("Initializing workspace");
            sessionApi.initializeWorkspace({authorization : "Bearer " + body.access_token}, (err, data, resp) => {
                const body = resp? resp.body: {};
                if(err || (body.status && body.status.code !== 0)) {
                    console.error("Cannot log in Workspace");
                    console.error(body);
                }
                else {
                    //region Obtaining Workspace API Session
                    //Obtaining session cookie and setting the cookie to the client
                    const session = resp.headers['set-cookie'].find(v => v.startsWith('WORKSPACE_SESSIONID'));
                    workspaceClient.defaultHeaders.Cookie = session;

                    //region Current session information
                    //Obtaining current session information using SessionApi
                    sessionApi.getCurrentSession((err, data, resp) => {
                        var body = resp? resp.body: {};
                        if(err || (body.status && body.status.code !== 0)) {
                            console.error("Cannot get current session");
                            console.error(body);
                        }
                        else {			
                            console.log(body);
                        }

                        //region Logging out
                        //Ending our Workspace API session
                        sessionApi.logout();
                    });
                }
            });
        }
    }
);

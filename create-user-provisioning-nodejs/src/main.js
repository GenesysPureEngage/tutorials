const provisioning = require('genesys-provisioning-client-js');

//Usage: <apiKey> <clientId> <clietnSecret> <apiUrl>
const argv = process.argv.slice(2);
const apiKey = argv[0];
const clientId = argv[1];
const clientSecret = argv[2];
const apiUrl = argv[3];

const provisioningUrl = `${apiUrl}/provisioning/v3`;

//region Initialize API Client
//Create and setup ApiClient instance with your ApiKey and Provisioning API URL.
const provisioningClient = new provisioning.ApiClient();
provisioningClient.basePath = provisioningUrl;
provisioningClient.defaultHeaders = { 'x-api-key': apiKey };

//region Create SessionApi instance
//Creating instance of SessionApi using the ApiClient.
const sessionApi = new provisioning.SessionApi(provisioningClient);

//region Logging in Provisioning API
//Logging in using our username and password
sessionApi.login({
  domain_username: clientId,
  password: clientSecret
}, (err, data, resp) => {
	const body = resp? resp.body: {};
	if(err || (body.status && body.status.code !== 0)) {
            console.error("Cannot log in");
	}
	else {
            //region Obtaining Provisioning API Session
            //Obtaining sessionId and setting PROVISIONING_SESSIONID cookie to the client
            const sessionId = body.data.sessionId;
            provisioningClient.defaultHeaders.Cookie = `PROVISIONING_SESSIONID=${sessionId};`;

            //region Creating UsersApi instance
            //Creating instance of UsersApi using the ApiClient
            const usersApi = new provisioning.UsersApi(provisioningClient);
			
            //region Describing and creating a user
            //Creating a user using UsersApi instance
            usersApi.addUser({
                    userName: "userName",
                    firstName: "firstName",
                    lastName: "lastName",
                    password: "Password1",
                    agentGroup: ['tutorials'],
                    accessGroup: [ "Users" ]
            }, (err, data, resp) => {
                    const body = resp? resp.body: {};
                    if(err || (body.status && body.status.code !== 0)) {
                        console.error("Cannot create user");
                        console.error(body);
                    }
                    else {
                        console.log('User created!');
                    }
            });

            //region Logging out
            //Ending our Provisioning API session
            sessionApi.logout();
	}
});

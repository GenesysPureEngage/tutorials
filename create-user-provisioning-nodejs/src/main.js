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
provisioningClient.enableCookies = true;
provisioningClient.defaultHeaders = { 'x-api-key': apiKey };

//region Create SessionApi instance
//Creating instance of SessionApi using the ApiClient.
const sessionApi = new provisioning.SessionApi(provisioningClient);

//region Logging in Provisioning API
//Logging in using our username and password
sessionApi.login({
  domain_username: clientId,
  password: clientSecret
}).then(resp => {
    if(resp.status.code !== 0) {
        console.error(resp);
        throw new Error('Cannot log in');
    }
    
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
    }).then(res => {
        if(res.status.code !== 0) {
            console.error(res);
            throw new Error('Cannot create user');
        }
        
        console.log('User created!');
    }).catch(err => {
        console.error(err);
    }).then(() => {
        //region Logging out
        //Ending our Provisioning API session
        sessionApi.logout();
    });
}).catch(err => {
    console.error(err);
});

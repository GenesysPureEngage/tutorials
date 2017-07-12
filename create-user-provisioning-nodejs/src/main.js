const provisioning = require('provisioning_api');

//region Initialize API Client
//Create and setup ApiClient instance with your ApiKey and Provisioning API URL.
const apiKey = "key";
const provisioningrl = "url";

const provisioningClient = new provisioning.ApiClient();
provisioningClient.basePath = provisioningrl;
provisioningClient.defaultHeaders = { 'x-api-key': apiKey };

//region Create LoginApi instance
//Creating instance of LoginApi using the ApiClient.
const loginApi = new provisioning.LoginApi(provisioningClient);

//region Logging in Provisioning API
//Logging in using our username and password
loginApi.login({
  "domain_username": "username",
  "password": "password"
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
                    password: "password",
                    accessGroup: [ "accessGroup" ]
            }, (err, data, resp) => {
                    const body = resp? resp.body: {};
                    if(err || (body.status && body.status.code !== 0)) {
                            console.error("Cannot create user");
                    }
                    else {
                            console.log('User created!');
                    }
            });

            //region Logging out
            //Ending our Provisioning API session
            loginApi.logout();
	}
});

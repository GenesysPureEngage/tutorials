const provisioning = require('genesys-provisioning-client-js');

//region Initialize API Client
//Create and setup ApiClient instance with your ApiKey and Provisioning API URL.
const apiKey = "qalvWPemcr4Gg9xB9470n7n9UraG1IFN7hgxNjd1";
const provisioningUrl = "https://api-usw1.genhtcc.com/provisioning/v3";
const username = "voice_2157_admin";
const password = "voice_2157_admin";

const provisioningClient = new provisioning.ApiClient();
provisioningClient.basePath = provisioningUrl;
provisioningClient.defaultHeaders = { 'x-api-key': apiKey };

//region Create SessionApi instance
//Creating instance of SessionApi using the ApiClient.
const sessionApi = new provisioning.SessionApi(provisioningClient);

//region Logging in Provisioning API
//Logging in using our username and password
console.log("Logging in...");
sessionApi.login({
  "domain_username": username,
  "password": password
}).then((resp) => {
	
	if(resp.status.code !== 0) {
            console.error("Cannot log in");
            console.error("Code: " + resp.status.code);
            
	} else {
		console.log("Logged in");
		//region Obtaining Provisioning API Session
		//Obtaining sessionId and setting PROVISIONING_SESSIONID cookie to the client
		const sessionId = resp.data.sessionId;
		provisioningClient.defaultHeaders.Cookie = `PROVISIONING_SESSIONID=${sessionId};`;

		//region Creating UsersApi instance
		//Creating instance of UsersApi using the ApiClient
		const usersApi = new provisioning.UsersApi(provisioningClient);
		
		//region Describing and creating a user
		//Creating a user using UsersApi instance
		const user = {
			userName: "agent-1",
			firstName: "agent",
			lastName: "agent",
			password: "Agent123",
			accessGroup: [ "accessGroup" ]
		};
		
		console.log("Creating user: " + JSON.stringify(user) + "...");
		usersApi.addUser(user).then((resp) => {
			
			if(resp.status.code !== 0) {
				console.error("Cannot create user");
				console.error("Code: " + resp.status.code);
			} else {
				console.log("User created");
			}
			
		}).catch((err) => {
			console.error("Cannot create user");
			console.log(err);
		});
		
		//region Logging out
		//Ending our Provisioning API session
		sessionApi.logout().catch((err) => {
			console.error("Cannot log out");
			console.error(err);
		});
	}
}).catch((err) => {
	
	console.error("Cannot login");
	console.error(err);
});



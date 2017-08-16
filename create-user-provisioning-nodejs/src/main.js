const provisioning = require('genesys-provisioning-client-js');

//Usage: <apiKey> <username> <password> <apiUrl>
const argv = process.argv.slice(2);
const apiKey = argv[0];
const username = argv[1];
const password = argv[2];
const apiUrl = argv[3];

const provisioningUrl = `${apiUrl}/provisioning/v3`;

async function main()  {
	//region Initialize API Client
	//Create and setup ApiClient instance with your ApiKey and Provisioning API URL.
	const provisioningClient = new provisioning.ApiClient();
	provisioningClient.basePath = provisioningUrl;
	provisioningClient.defaultHeaders = { 'x-api-key': apiKey };

	//region Create SessionApi instance
	//Creating instance of SessionApi using the ApiClient.
	const sessionApi = new provisioning.SessionApi(provisioningClient);
	
	try {
		//region Logging in Provisioning API
		//Logging in using our username and password
	
		console.log("Logging in...");
		const resp = await sessionApi.login({
		  domain_username: username,
		  password: password
		});
		
		if(resp.status.code !== 0) {
				console.error("Cannot log in");
				console.error("Code: " + resp.status.code);
				throw "";
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
				userName: "username",
				firstName: "firstname",
				lastName: "lastname",
				password: "password",
				accessGroup: [ "tutorials" ]
			};
			
			console.log("Creating user: " + JSON.stringify(user) + "...");
			const addUserResp = await usersApi.addUser(user);
			
			if(addUserResp.status.code !== 0) {
				console.error("Cannot create user");
				console.error("Code: " + resp.status.code);
			} else {
				console.log("User created");
			}
	
			//region Logging out
			//Ending our Provisioning API session
			await sessionApi.logout();
			console.log("done");
		}
		
	} catch(err) {
		if(err.response) console.error(err.response.text);
		else console.error(err);
		
	}
}


main();
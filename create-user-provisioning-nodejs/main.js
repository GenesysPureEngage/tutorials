const provisioning = require('provisioning_api');

const apiKey = "key";
const provisioningrl = "url";

const provisioningClient = new provisioning.ApiClient();
provisioningClient.basePath = provisioningrl;
provisioningClient.defaultHeaders = { 'x-api-key': apiKey };

const loginApi = new provisioning.LoginApi(provisioningClient);
loginApi.loginPost({
  "domain_username": "username",
  "password": "password"
}, (err, data, resp) => {
	const body = resp? resp.body: {};
	if(err || (body.status && body.status.code !== 0)) {
		console.error("Cannot log in");
	}
	else {
		const sessionId = body.data.sessionId;
		provisioningClient.defaultHeaders.Cookie = `PROVISIONING_SESSIONID=${sessionId};`;
		
		const usersApi = new provisioning.UsersApi(provisioningClient);
		usersApi.usersPost({
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
		
		loginApi.logoutPost();
	}
});

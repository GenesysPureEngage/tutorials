const workspace = require('workspace_api');

const apiKey = "key";
const workspaceUrl = "url";

const workspaceClient = new workspace.ApiClient();
workspaceClient.basePath = workspaceUrl;
workspaceClient.defaultHeaders = { 'x-api-key': apiKey };

const sessionApi = workspace.SessionApi(workspaceClient);
sessionApi.login({
	username: "username",
	password: "password"
}, (err, data, resp) => {
	var body = resp? resp.body: {};
	if(err || (body.status && body.status.code !== 0)) {
		console.error("Cannot log in Workspace");
	}
	else {
		const session = resp.headers['set-cookie'].find(v => v.startsWith('WWE_SESSIONID'));
		workspaceClient.defaultHeaders.Cookie = session;
		
		sessionApi.currentUserGet((err, data, resp) => {
			var body = resp? resp.body: {};
			if(err || (body.status && body.status.code !== 0)) {
				console.error("Cannot get current user");
			}
			else {			
				console.log(body);
			}

			sessionApi.logout();
		});
	}
});


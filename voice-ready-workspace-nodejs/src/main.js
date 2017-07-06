const workspace = require('workspace_api');

const apiKey = "key";
const workspaceUrl = "url";

const workspaceClient = new workspace.ApiClient();
workspaceClient.basePath = workspaceUrl;
workspaceClient.defaultHeaders = { 'x-api-key': apiKey };

const sessionApi = new workspace.SessionApi(workspaceClient);
sessionApi.login({
    username: "username",
    password: "password"
}, (err, data, resp) => {
    var body = resp? resp.body: {};
    if(err || (body.status && body.status.code !== 0)) {
        console.error("Cannot log in Workspace");
        console.error(body);
    }
    else {
        const session = resp.headers['set-cookie'].find(v => v.startsWith('WWE_SESSIONID'));
        workspaceClient.defaultHeaders.Cookie = session;

        sessionApi.getCurrentUser((err, data, resp) => {
            var body = resp? resp.body: {};
            if(err || (body.status && body.status.code !== 0)) {
                console.error("Cannot get current user");
                console.error(body);
            }
            else {
                var user = body.data.user;
                sessionApi.activateChannels({
                    data: {
                        agentId: user.employeeId,
                        dn: user.agentLogin
                    }
                }, (err, data, resp) => {
                    const body = resp? resp.body: {};
                    if(err || (body.status && body.status.code !== 0)) {
                        console.error("Cannot activate channels");
                        console.error(body);
                    }
                    else {
                        const voiceAgentStateApi = new workspace.VoiceAgentStateApi(workspaceClient);
                        voiceAgentStateApi.ready((err, data, resp) => {
                            const body = resp? resp.body: {};
                            if(err || (body.status && body.status.code !== 0)) {
                                console.error("Cannot change agent state");
                                console.error(body);
                            }
                            else {
                                console.info("done");
                                
                                sessionApi.logout();                                
                            }
                        });
                    }
                });
            }
        });
    }
});

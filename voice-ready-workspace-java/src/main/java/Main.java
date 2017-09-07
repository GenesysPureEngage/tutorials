import com.genesys.workspace.WorkspaceApi;
import com.genesys.workspace.common.WorkspaceApiException;

import com.genesys.workspace.events.DnStateChanged;
import com.genesys.workspace.models.Dn;

import com.genesys.internal.authorization.api.AuthenticationApi;
import com.genesys.internal.authorization.model.DefaultOAuth2AccessToken;
import com.genesys.internal.common.ApiClient;
import com.genesys.workspace.models.User;
import java.util.Base64;
import java.util.concurrent.CompletableFuture;

public class Main {
	static final CompletableFuture done = new CompletableFuture();
    
	public static void main(String[] args) throws Exception {	
	
            //region creating WorkspaceApi
            //Creating a WorkspaceApi object with the apiKey, baseUrl and 'debugEnabled' preference.
            String apiKey = "<apiKey>";
            String apiUrl = "<apiUrl>";

            //region creating WorkspaceApi
            //Creating a WorkspaceApi object with the apiKey, baseUrl and 'debugEnabled' preference.
            WorkspaceApi api = new WorkspaceApi(apiKey, apiUrl, false);
            //endregion

            //region Registering Event Handlers
            //Here we register Call and Dn event handlers.
            api.voice().addDnEventListener((DnStateChanged msg) -> {
                try {
                    Dn dn = msg.getDn();
                    switch(dn.getAgentState()) {
                        case READY:
                            System.out.println("Agent state is ready");
                            done.complete(null);
                            break;

                        case NOT_READY:
                            System.out.println("Agent state is not ready");
                            System.out.println("Setting state to ready...");
                            api.voice().setAgentReady();
                            break;
                    }
                } catch(WorkspaceApiException ex) {
                    System.err.println("Exception:" + ex);
                    done.completeExceptionally(ex);
                }
            });
            //endregion

            String authUrl = String.format("%s/auth/v3", apiUrl);
            ApiClient authClient = new ApiClient();
            authClient.setBasePath(authUrl);
            authClient.addDefaultHeader("x-api-key", apiKey);
            authClient.getHttpClient().setFollowRedirects(false);

            AuthenticationApi authApi = new AuthenticationApi(authClient); 

            String agentUsername = "<agentUsername>";
            String agentPassword = "<agentPassword>";
            String clientId = "<clientId>";
            String clientSecret = "<clientSecret>";

            String authorization = "Basic " + new String(Base64.getEncoder().encode(String.format("%s:%s", clientId, clientSecret).getBytes()));
            DefaultOAuth2AccessToken resp = authApi.retrieveToken("password", authorization, "application/json", "*", clientId, agentUsername, agentPassword);

            User user = api.initialize(resp.getAccessToken()).get();
            api.activateChannels(user.getAgentId(), user.getAgentId());

            System.out.println("Waiting for completion...");
            done.get();

            api.destroy();
	}
}
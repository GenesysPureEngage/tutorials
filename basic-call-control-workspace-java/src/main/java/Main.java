import com.genesys.internal.authorization.api.AuthenticationApi;
import com.genesys.internal.authorization.model.DefaultOAuth2AccessToken;
import com.genesys.internal.common.ApiClient;
import com.genesys.workspace.WorkspaceApi;
import com.genesys.workspace.common.WorkspaceApiException;
import com.genesys.workspace.events.CallStateChanged;
import com.genesys.workspace.events.DnStateChanged;
import com.genesys.workspace.models.AgentWorkMode;
import com.genesys.workspace.models.Call;
import com.genesys.workspace.models.Dn;
import com.genesys.workspace.models.User;
import java.util.Base64;
import java.util.concurrent.CompletableFuture;

public class Main {
    static boolean hasCallBeenHeld = false;
    static final CompletableFuture<Boolean> done = new CompletableFuture<Boolean>();
    
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
        api.voice().addCallEventListener((CallStateChanged msg) -> {
            try {
                Call call = msg.getCall();
                String id = call.getId();

                switch (call.getState()) {
                    case RINGING:
                        System.out.println("Answering call...");
                        api.voice().answerCall(call.getId());
                        break;

                    case ESTABLISHED:
                        if (!hasCallBeenHeld) {
                            System.out.println("Putting call on hold...");
                            api.voice().holdCall(id);
                            hasCallBeenHeld = true;
                        } else {
                            System.out.println("Releasing call...");
                            api.voice().releaseCall(id);
                        }
                        break;

                    case HELD:
                        System.out.println("Retrieving call...");
                        api.voice().retrieveCall(id);
                        break;

                    case RELEASED:
                        System.out.println("Setting ACW...");
                        api.voice().setAgentNotReady("AfterCallWork", null);
                        break;
                }
            } catch(WorkspaceApiException e) {
                System.err.println(e);
                System.exit(1);
            }
        });

        api.voice().addDnEventListener((DnStateChanged msg) -> {
                Dn dn = msg.getDn();

                if (hasCallBeenHeld && AgentWorkMode.AFTER_CALL_WORK == dn.getWorkMode()) {
                    done.complete(true);
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
        System.out.println("The workspace api is now successfully initialized");
        System.out.println("User data: " + user); 

        System.out.println("Waiting for completion...");
        done.get();

        api.destroy();
    }
}

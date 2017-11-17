import com.genesys.internal.authentication.api.AuthenticationApi;
import com.genesys.internal.authentication.model.DefaultOAuth2AccessToken;
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
    static final CompletableFuture<Void> done = new CompletableFuture<>();
    
    public static void main(String[] args) throws Exception {
        String apiKey = "<apiKey>";
        String apiUrl = "<apiUrl>";

        //region Create an instance of WorkspaceApi
        //First we need to create a new instance of the WorkspaceApi class with the following parameters: **apiKey** (required to submit API requests) and **apiUrl** (base URL that provides access to the PureEngage Cloud APIs). You can get the values for both of these parameters from your PureEngage Cloud representative.
        WorkspaceApi api = new WorkspaceApi(apiKey, apiUrl);
        //endregion

        //region Register event handlers
        //Now we can register event handlers that will be called whenever the Workspace Client Library publishes a CallStateChanged or DnStateChanged message. This let's us act on changes to the call state or DN state. Here we set up an event handler to act when it receives a CallStateChanged message where the call state is either Ringing, Established, Held, or Released.
        api.voice().addCallEventListener((CallStateChanged msg) -> {
            try {
                Call call = msg.getCall();
                String id = call.getId();

                switch (call.getState()) {
                    //region Ringing
                    //If the call state is Ringing, then answer the call.
                    case RINGING:
                        System.out.println("Answering call...");
                        api.voice().answerCall(call.getId());
                        break;
                    //endregion
                    //region Established
                    //The first time we see an Established call, place it on hold. The second time, release the call.
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
                    //endregion
                    //region Held
                    //If the call state is Held, retrieve the call.     
                    case HELD:
                        System.out.println("Retrieving call...");
                        api.voice().retrieveCall(id);
                        break;
                    //endregion
                    //region Released
                    //If the call state is Released, set the agent's state to AfterCallWork.
                    case RELEASED:
                        System.out.println("Setting ACW...");
                        api.voice().setAgentNotReady("AfterCallWork", null);
                        break;
                    //endregion    
                }
            } catch(WorkspaceApiException e) {
                System.err.println(e);
                done.completeExceptionally(e);
            }
        });

        
        api.voice().addDnEventListener((DnStateChanged msg) -> {
                Dn dn = msg.getDn();
                //region Handle DN state change
                //When the DN workmode changes to AfterCallWork, the sequence is over and we can exit.
                if (hasCallBeenHeld && AgentWorkMode.AFTER_CALL_WORK == dn.getWorkMode()) {
                    done.complete(null);
                }
                //endregion
        });
        //endregion
		
        String authUrl = String.format("%s/auth/v3", apiUrl);
        ApiClient authClient = new ApiClient();
        authClient.setBasePath(authUrl);
        authClient.addDefaultHeader("x-api-key", apiKey);
        authClient.getHttpClient().setFollowRedirects(false);

        AuthenticationApi authApi = new AuthenticationApi(authClient); 

        String agentUsername = "<agentUsername2>";
        String agentPassword = "<agentPassword2>";
        String clientId = "<clientId>";
        String clientSecret = "<clientSecret>";

        String authorization = "Basic " + new String(Base64.getEncoder().encode(String.format("%s:%s", clientId, clientSecret).getBytes()));
        DefaultOAuth2AccessToken resp = authApi.retrieveToken("password", authorization, "application/json", "*", clientId, null, agentUsername, agentPassword);

        //region Initialization
        ////Initialize the Workspace API by calling `initialize()` and passing **token**, which is the access token provided by the [Authentication Client Library](https://developer.genhtcc.com/api/client-libraries/authentication/index.html) when you follow the [Resource Owner Password Credentials Grant](https://tools.ietf.org/html/rfc6749#section-4.3) flow. Finally, call `activateChannels()` to initialize the voice channel for the agent and DN.
        User user = api.initialize(resp.getAccessToken()).get();
        api.activateChannels(user.getAgentId(), user.getAgentId());
        //endregion

        System.out.println("Waiting for completion...");
        done.get();
		
        api.destroy();
    }
}














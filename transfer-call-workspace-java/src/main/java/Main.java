import com.genesys.workspace.WorkspaceApi;
import com.genesys.workspace.common.WorkspaceApiException;

import com.genesys.workspace.events.CallStateChanged;
import com.genesys.workspace.models.User;
import com.genesys.workspace.models.Call;

import com.genesys.internal.authentication.api.AuthenticationApi;
import com.genesys.internal.authentication.model.DefaultOAuth2AccessToken;
import com.genesys.internal.common.ApiClient;
import java.util.Base64;
import java.util.concurrent.CompletableFuture;

public class Main {
    static final CompletableFuture done = new CompletableFuture();
    static String originalCallId = null;
    static String transferedCallId = null;
    
    public static void main(String[] args) throws Exception {
        //region creating WorkspaceApi
        //Creating a WorkspaceApi object with the apiKey, baseUrl and 'debugEnabled' preference.
        String apiKey = "<apiKey>";
        String apiUrl = "<apiUrl>";

        //region creating WorkspaceApi
        //Creating a WorkspaceApi object with the apiKey, baseUrl and 'debugEnabled' preference.
        WorkspaceApi api = new WorkspaceApi(apiKey, apiUrl, false);
        //endregion
        
        String destination = "<agentPhoneNumber3>";
		
        //region Registering Event Handlers
        //Here we register Call and Dn event handlers.
        api.voice().addCallEventListener((CallStateChanged msg) -> {
            try {
                Call call = msg.getCall();
                String callId = call.getId();
                
                System.out.println(String.format("%s: %s", call.getState(), call.getId()));
                
                switch (call.getState()) {
                    case RINGING:
                        System.out.println("Answering call");
                        api.voice().answerCall(callId);
                        break;
                    case DIALING:
                        transferedCallId = callId;
                        break;
                    case ESTABLISHED:
                        //region Established
                        //When the call state is 'Established' this means that the call is in progress.
                        //Here we check if this event if from answering the consult call.
                        if(originalCallId == null) {
                            originalCallId = callId;
                            
                            System.out.println("Initiating transfer");
                            api.voice().initiateTransfer(callId, destination);
                        }
                        else if(callId.equals(transferedCallId)) {
                            System.out.println("Completing transfer");
                            api.voice().completeTransfer(callId, originalCallId);
                        }                        
                        //endregion
                        break;
                    case RELEASED:
                        done.complete(null);
                        break;
                }
            }
            catch (WorkspaceApiException e) {
                done.completeExceptionally(e);
            }
        });
		
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
        DefaultOAuth2AccessToken resp = authApi.retrieveToken("password", authorization, "application/json", "*", clientId, agentUsername, agentPassword);

        User user = api.initialize(resp.getAccessToken()).get();
        api.activateChannels(user.getAgentId(), user.getAgentId());
        api.voice().setAgentReady();

        System.out.println("Waiting for completion...");
        done.get();

        api.destroy();
        System.out.println("Done");
    }
}















import com.genesys.internal.authentication.api.AuthenticationApi;
import com.genesys.internal.authentication.model.DefaultOAuth2AccessToken;
import com.genesys.internal.common.ApiClient;
import com.genesys.workspace.WorkspaceApi;
import com.genesys.workspace.common.WorkspaceApiException;
import com.genesys.workspace.models.Call;
import com.genesys.workspace.models.User;
import java.util.ArrayDeque;
import java.util.Base64;
import java.util.Queue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;

public class Main {

    static final CompletableFuture done = new CompletableFuture();
    static String heldCallId = null;
    static String establishedCallId = null;
    static AtomicBoolean alternated = new AtomicBoolean(false);
    static AtomicBoolean busy = new AtomicBoolean(false);
    static Queue<String> calls = new ArrayDeque<>();

    public static void main(String[] args) throws Exception {

        String apiKey = "<apiKey>";
        String apiUrl = "<apiUrl>";

        //region creating WorkspaceApi
        //Creating a WorkspaceApi object with the apiKey, baseUrl and 'debugEnabled' preference.
        WorkspaceApi api = new WorkspaceApi(apiKey, apiUrl, false);
        
        //region Registering Event Handlers
        //Here we register Call and Dn event handlers.
        api.voice().addCallEventListener(msg -> {
            try {
                Call call = msg.getCall();
                String callId = call.getId();
                
                System.out.println(String.format("%s: %s", call.getState(), callId));
                
                switch (call.getState()) {
                    case RINGING:
                        if(busy.compareAndSet(false, true)) {
                            System.out.println("Asnwering call");
                            api.voice().answerCall(callId);
                        }
                        else {
                            calls.add(callId);                            
                        }
                        
                        break;
                        
                    case ESTABLISHED:
                        establishedCallId = callId;
                        
                        //region Established
                        //When the call state is 'Established' this means that the call is in progress.
                        //This event is used both to find established calls when the program starts and to signal that a call has been retrieved as a result of alternating.
                        if(heldCallId == null) {
                            api.voice().holdCall(callId);
                        }
                        else if(alternated.compareAndSet(false, true)) {
                            System.out.println("Altering calls");
                            api.voice().alternateCalls(establishedCallId, heldCallId);
                        }
                        else if(alternated.get()) {
                            done.complete(null);
                        }
                        //endregion
                        break;
                        
                    case HELD:
                        //region Held
                        //This event is used both to find held calls when the program starts and signal that a call has been held as a result of alternating.
                        heldCallId = callId;
                        busy.set(false);
                        String anotherCallId = calls.poll();
                        if(anotherCallId != null) {
                            busy.set(true);
                            System.out.println("Answering call");
                            api.voice().answerCall(anotherCallId);
                        }
                        //endregion
                        break;
                }
            } 
            catch (WorkspaceApiException e) {
                done.completeExceptionally(e);
            }
        });
        //endregion

        String authUrl = String.format("%s/auth/v3", apiUrl);
        ApiClient authClient = new ApiClient();
        authClient.setBasePath(authUrl);
        authClient.addDefaultHeader("x-api-key", apiKey);
        authClient.getHttpClient().setFollowRedirects(false);

        AuthenticationApi authApi = new AuthenticationApi(authClient); 

        String agentUsername = "<agentUsername3>";
        String agentPassword = "<agentPassword3>";
        String clientId = "<clientId>";
        String clientSecret = "<clientSecret>";

        String authorization = "Basic " + new String(Base64.getEncoder().encode(String.format("%s:%s", clientId, clientSecret).getBytes()));
        DefaultOAuth2AccessToken resp = authApi.retrieveToken("password", authorization, "application/json", "*", clientId, agentUsername, agentPassword);

        System.out.println("Initializing workspace");
        User user = api.initialize(resp.getAccessToken()).get();
        
        System.out.println("Activating channels");
        api.activateChannels(user.getAgentId(), user.getAgentId());
        
        System.out.println("Waiting for completion...");
        done.get();

        System.out.println("done");
        api.destroy();
    }
}














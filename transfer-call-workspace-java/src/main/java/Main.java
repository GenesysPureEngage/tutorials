import com.genesys.workspace.WorkspaceApi;
import com.genesys.workspace.common.WorkspaceApiException;
import com.genesys.workspace.events.CallStateChanged;
import com.genesys.workspace.models.Call;
import com.genesys.workspace.models.User;
import java.util.concurrent.CompletableFuture;

public class Main {
    static final CompletableFuture<Void> done = new CompletableFuture<Void>();
    static String originalCallId = null;
    static String transferedCallId = null;
    
    public static void main(String[] args) throws Exception {
        String apiKey = "<apiKey>";
        String apiUrl = "<apiUrl>";

        //region Create an instance of WorkspaceApi
        //First we need to create a new instance of the WorkspaceApi class with the following parameters: **apiKey** (required to submit API requests) and **apiUrl** (base URL that provides access to the PureEngage Cloud APIs). You can get the values for both of these parameters from your PureEngage Cloud representative.
        WorkspaceApi api = new WorkspaceApi(apiKey, apiUrl);
        //endregion
        
        String destination = "<agentPhoneNumber3>";
		
        //region Register event handlers
        //Now we can register event handlers that will be called whenever the Workspace Client Library publishes a CallStateChanged or DnStateChanged message. This lets us act on changes to the call state or DN state. Here we set up an event handler to act when it receives a CallStateChanged message where the call state is either Ringing, Dialing, Established, Released.
        api.voice().addCallEventListener((CallStateChanged msg) -> {
            try {
                Call call = msg.getCall();
                String callId = call.getId();
                
                System.out.println(String.format("%s: %s", call.getState(), call.getId()));
                
                switch (call.getState()) {
                    //region Ringing
                    //If the call state is Ringing, then answer the call.
                    case RINGING:
                        System.out.println("Answering call");
                        api.voice().answerCall(callId);
                        break;
                    //endregion
                    //region Dialing
                    //After we `initiateTransfer()`, we'll get a Dialing event for the new call to the third party. We'll hold on to the ID of that consultation call so we can use it later to `completeTransfer()` once the call is Established.
                    case DIALING:
                        transferedCallId = callId;
                        break;
                    //endregion
                    //region Established
                    //When the call state is 'Established' this means that the call is in progress.
                    case ESTABLISHED:
                        if(originalCallId == null) {
                            originalCallId = callId;
                            
                            System.out.println("Initiating transfer");
                            api.voice().initiateTransfer(callId, destination);
                        }
                        else if(callId.equals(transferedCallId)) {
                            System.out.println("Completing transfer");
                            api.voice().completeTransfer(callId, originalCallId);
                        }                        
                        break;
                    //endregion
                    //region Released
                    //The call state is changed to 'Released' when the call is ended.
                    case RELEASED:
                        done.complete(null);
                        break;
                    //endregion
                }
            }
            catch (WorkspaceApiException e) {
                done.completeExceptionally(e);
            }
        });
        //endregion
		
        //region Authorization code grant
        //You'll need to use the Authentication API to get an authorization token. See https://github.com/GenesysPureEngage/authorization-code-grant-sample-app for an example of how to do this.
        String authorizationToken = "<authorizationToken1>";
        //endregion
        
        //region Initialization
        //Initialize the Workspace API with the authorization token from the previous step. Finally, call `activateChannels()` to initialize the voice channel for the agent and DN.
        User user = api.initialize(authorizationToken);
        api.activateChannels(user.getAgentId(), user.getDefaultPlace());
        api.voice().setAgentReady();

        System.out.println("Waiting for completion...");
        done.get();

        api.destroy();
        System.out.println("Done");
    }
}
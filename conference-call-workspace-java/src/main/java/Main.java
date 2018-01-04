
import com.genesys.workspace.WorkspaceApi;
import com.genesys.workspace.common.WorkspaceApiException;
import com.genesys.workspace.models.Call;
import com.genesys.workspace.models.User;
import java.util.concurrent.CompletableFuture;

public class Main {
    
    static final CompletableFuture done = new CompletableFuture();
    static String originalCallId = null;
    static String conferenceCallId = null;

    public static void main(String[] args) throws Exception {

        String apiKey = "<apiKey>";
        String apiUrl = "<apiUrl>";

        //region Create an instance of WorkspaceApi
        //First we need to create a new instance of the WorkspaceApi class with the following parameters: **apiKey** (required to submit API requests) and **apiUrl** (base URL that provides access to the PureEngage Cloud APIs). You can get the values for both of these parameters from your PureEngage Cloud representative.
        WorkspaceApi api = new WorkspaceApi(apiKey, apiUrl);
        //endregion

        String destination = "<agentPhoneNumber3>";
        
        //region Register event handlers
        //Now we can register event handlers that will be called whenever the Workspace Client Library publishes a CallStateChanged or DnStateChanged message. This let's us act on changes to the call state or DN state. Here we set up an event handler to act when it receives a CallStateChanged message where the call state is either Ringing, Dialing, Established, Released.
        api.voice().addCallEventListener(msg -> {
            try {
                Call call = msg.getCall();
                String callId = call.getId();
                
                System.out.println(String.format("%s: %s", call.getState(), callId));

                switch (call.getState()) {
                    //region Ringing
                    //If the call state is Ringing, then answer the call.
                    case RINGING:
                        System.out.println("Answering call");
                        api.voice().answerCall(callId);
                        break;
                    //endregion
                    //region Dialing
                    //After we `initiateConference()`, we'll get a Dialing event for the new call to the third party. We'll hold on to the ID of that consultation call so we can use it later to `completeConference()` once the call is Established.
                    case DIALING:
                        conferenceCallId = callId;
                        break;
                    //endregion
                    //region Established
                    //If the Established call is for the originating call we used to trigger this tutorial, then `initiateConference()`. If it's from our consultation call, then we want to `completeConference()` to bring all parties together in the conference call.
                    case ESTABLISHED:
                        if(originalCallId == null) {
                            originalCallId = callId;
                            
                            System.out.println("Initiating conference");
                            api.voice().initiateConference(callId, destination);
                        }
                        else if(callId.equals(conferenceCallId)) {
                            System.out.println("Completing conference");
                            api.voice().completeConference(callId, originalCallId);
                        }
                        break;
                    //endregion
                    //region Released
                    //The call state is changed to Released when the call is ended.
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
        //Authorization code should be obtained before (See https://github.com/GenesysPureEngage/authorization-code-grant-sample-app)
        String authorizationToken = "<authorizationToken2>";
        //endregion

        //region Initialization
        //Initialize the Workspace API by calling `initialize()` and passing **token**, which is the access token provided by the Authentication Client Library when you follow the Resource Owner Password Credentials Grant flow. Finally, call `activateChannels()` to initialize the voice channel for the agent and DN.
        System.out.println("Initializing workspace");
        User user = api.initialize(authorizationToken);

        System.out.println("Activating channels");
        api.activateChannels(user.getAgentId(), user.getAgentId());

        System.out.println("Waiting for completion...");
        done.get();

        System.out.println("done");
        api.destroy();
    }
}

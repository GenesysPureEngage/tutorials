
import com.genesys.workspace.WorkspaceApi;
import com.genesys.workspace.common.WorkspaceApiException;
import com.genesys.workspace.models.Call;
import com.genesys.workspace.models.User;
import java.util.ArrayDeque;
import java.util.Queue;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;

public class Main {

    static final CompletableFuture<Void> done = new CompletableFuture<>();
    static String heldCallId = null;
    static String establishedCallId = null;
    static AtomicBoolean alternated = new AtomicBoolean(false);
    static AtomicBoolean busy = new AtomicBoolean(false);
    static Queue<String> calls = new ArrayDeque<>();

    public static void main(String[] args) throws Exception {

        String apiKey = "<apiKey>";
        String apiUrl = "<apiUrl>";

        //region Create an instance of WorkspaceApi
        //First we need to create a new instance of the WorkspaceApi class with the following parameters: **apiKey** (required to submit API requests) and **apiUrl** (base URL that provides access to the PureEngage Cloud APIs). You can get the values for both of these parameters from your PureEngage Cloud representative.
        WorkspaceApi api = new WorkspaceApi(apiKey, apiUrl);
        //endregion

        //region Register event handler
        //Now we can register an event handler that will be called whenever the Workspace Client Library publishes a CallStateChanged message. This let's us act on changes to the call state. Here we set up an event handler to act when it receives a CallStateChanged message where the call state is either Ringing, Established, or Held. We've added logic here to alternate between the calls based on the call state.
        api.voice().addCallEventListener(msg -> {
            try {
                Call call = msg.getCall();
                String callId = call.getId();
                
                System.out.println(String.format("%s: %s", call.getState(), callId));
                
                switch (call.getState()) {
                    //region Ringing
                    //If the call state is Ringing, then answer the call.
                    case RINGING:
                        if(busy.compareAndSet(false, true)) {
                            System.out.println("Answering call");
                            api.voice().answerCall(callId);
                        }
                        else {
                            calls.add(callId);                            
                        }                       
                        break;
                    //endregion
                    
                    //region Established
                    //The first time we see an Established call, place it on hold. The second time, call `alternateCalls` with the **establishedCallId** and **heldCallId** as parameters.
                    case ESTABLISHED:
                        establishedCallId = callId;
                        
                        
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
                        break;
                    //endregion  

                    //region Held
                    //If the call state is Held, answer the other call.
                    case HELD:
                        heldCallId = callId;
                        busy.set(false);
                        String anotherCallId = calls.poll();
                        if(anotherCallId != null) {
                            busy.set(true);
                            System.out.println("Answering call");
                            api.voice().answerCall(anotherCallId);
                        }
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
        String authorizationToken = "<authorizationToken3>";
        //endregion

        //region Initialization
        //Initialize the Workspace API by calling `initialize()` and passing **token**, which is the access token provided by the Authentication Client Library when you follow the Resource Owner Password Credentials Grant flow. Finally, call `activateChannels()` to initialize the voice channel for the agent and DN.
        System.out.println("Initializing workspace");
        User user = api.initialize(authorizationToken);
        
        System.out.println("Activating channels");
        api.activateChannels(user.getAgentId(), user.getAgentId());
        //endregion

        System.out.println("Waiting for completion...");
        done.get();

        System.out.println("done");
        api.destroy();
    }
}














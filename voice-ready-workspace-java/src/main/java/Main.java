import com.genesys.workspace.WorkspaceApi;
import com.genesys.workspace.common.WorkspaceApiException;
import com.genesys.workspace.events.DnStateChanged;
import com.genesys.workspace.models.Dn;
import com.genesys.workspace.models.User;
import java.util.concurrent.CompletableFuture;

public class Main {
	static final CompletableFuture<Void> done = new CompletableFuture<>();
    
	public static void main(String[] args) throws Exception {	
            String apiKey = "<apiKey>";
            String apiUrl = "<apiUrl>";

            //region Create an instance of WorkspaceApi
            //First we need to create a new instance of the WorkspaceApi class with the following parameters: **apiKey** (required to submit API requests) and **apiUrl** (base URL that provides access to the PureEngage Cloud APIs). You can get the values for both of these parameters from your PureEngage Cloud representative.
            WorkspaceApi api = new WorkspaceApi(apiKey, apiUrl);
            //endregion

            //region Register event handlers
            //Now we can register an event handler that will be called whenever the Workspace Client Library publishes a DnStateChanged message. This lets us act on changes to the call state or DN state. Here we set up an event handler to act when it receives a DnStateChanged message where the agent state is either Ready or NotReady.
            api.voice().addDnEventListener((DnStateChanged msg) -> {
                try {
                    Dn dn = msg.getDn();
                    switch(dn.getAgentState()) {
                        //region Ready
                        //If the agent state is Ready, we've completed our task and can clean up the API.
                        case READY:
                            System.out.println("Agent state is ready");
                            done.complete(null);
                            break;
                        //endregion
                        //region NotReady
                        //If the agent state is NotReady, we call `setAgentReady()`.
                        case NOT_READY:
                            System.out.println("Agent state is not ready");
                            System.out.println("Setting state to ready...");
                            api.voice().setAgentReady();
                            break;
                        //endregion
                    }
                } catch(WorkspaceApiException ex) {
                    System.err.println("Exception:" + ex);
                    done.completeExceptionally(ex);
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
            //endregion
            
            System.out.println("Waiting for completion...");
            done.get();

            api.destroy();
	}
}
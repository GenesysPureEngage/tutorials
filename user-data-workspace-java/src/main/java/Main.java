
import com.genesys.internal.authentication.api.AuthenticationApi;
import com.genesys.internal.authentication.model.DefaultOAuth2AccessToken;
import com.genesys.internal.common.ApiClient;
import com.genesys.workspace.WorkspaceApi;
import com.genesys.workspace.common.WorkspaceApiException;
import com.genesys.workspace.models.Call;
import com.genesys.workspace.models.KeyValueCollection;
import com.genesys.workspace.models.User;
import java.util.Base64;
import java.util.concurrent.CompletableFuture;

public class Main {

    static final CompletableFuture<Void> done = new CompletableFuture<Void>();

    public static void main(String[] args) throws Exception {

        String apiKey = "<apiKey>";
        String apiUrl = "<apiUrl>";

        //region Create an instance of WorkspaceApi
        //First we need to create a new instance of the WorkspaceApi class with the following parameters: **apiKey** (required to submit API requests) and **apiUrl** (base URL that provides access to the PureEngage Cloud APIs). You can get the values for both of these parameters from your PureEngage Cloud representative.
        WorkspaceApi api = new WorkspaceApi(apiKey, apiUrl);
        //endregion

        //region Register event handlers
        //Now we can register an event handler that will be called whenever the Workspace Client Library publishes a CallStateChanged message. This let's us act on changes to the call state. Here we set up an event handler to act when it receives a CallStateChanged message where the notification type is CallRecovered, StateChange or AttachedDataChanged.
        api.voice().addCallEventListener(msg -> {
            try {
                Call call = msg.getCall();
                String id = call.getId();
                switch (msg.getNotificationType()) {

                    case CALL_RECOVERED:
                    case STATE_CHANGE:

                        switch (call.getState()) {
                            case RINGING:
                                System.out.println("Answering call...");
                                api.voice().answerCall(call.getId());
                                break;
                            //region Attach user data
                            //If the call state is Established, attach some UserData to the call. If a key/value pair with the same key already exists, Workspace creates a new pair and doesn't overwrite the existing pair.
                            case ESTABLISHED:
                                System.out.println("Answered");
                                KeyValueCollection userData = new KeyValueCollection();
                                userData.addString("<key>", "<value>");
                                System.out.println("Attaching user data: " + userData);

                                api.voice().attachUserData(id, userData);
                                break;
                            //endregion
                        }
                        break;

                    //region AttachedDataChanged
                    //When UserData is added or updated, we get a CallStateChanged with a notification type of AttachedDataChanged. We can use `call.getUserData()` to get the current UserData for the call.
                    case ATTACHED_DATA_CHANGED:
                        KeyValueCollection userData = call.getUserData();
                        String value = userData.getString("<key>");
                        if (value == null) {
                            done.complete(null);
                            break;
                        }

                        if (value.equals("<value>")) {

                            //region Update user data
                            //Let's update the existing user data on the call. If the key/value pair with the same key already exists, Workspace overwrites the pair.
                            KeyValueCollection newUserData = new KeyValueCollection();
                            newUserData.addString("<key>", "<newValue>");
                            System.out.println("Updating user data: " + newUserData);

                            api.voice().updateUserData(id, newUserData);
                            //endregion

                        } else if (value.equals("<newValue>")) {

                            //region Delete user data
                            //We can delete existing user data by passing a key to `voice().deleteUserDataPair()`.
                            System.out.println("Deleting user data with key: '<key>'");

                            api.voice().deleteUserDataPair(id, "<key>");
                            //endregion
                        }
                        break;
                    //endregion
                }

            } 
            catch (WorkspaceApiException e) {
                System.err.println("Exception:" + e);
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

        String agentUsername = "<agentUsername2>";
        String agentPassword = "<agentPassword2>";
        String clientId = "<clientId>";
        String clientSecret = "<clientSecret>";

        String authorization = "Basic " + new String(Base64.getEncoder().encode(String.format("%s:%s", clientId, clientSecret).getBytes()));
        DefaultOAuth2AccessToken resp = authApi.retrieveToken("password", authorization, "application/json", "*", clientId, null, agentUsername, agentPassword);

        //region Initialization
        //Initialize the Workspace API by calling `initialize()` and passing **token**, which is the access token provided by the Authentication Client Library when you follow the Resource Owner Password Credentials Grant flow. Finally, call `activateChannels()` to initialize the voice channel for the agent and DN.
        User user = api.initialize(resp.getAccessToken()).get();
        api.activateChannels(user.getAgentId(), user.getAgentId());
        //endregion

        System.out.println("Waiting for completion...");
        done.get();

        api.destroy();
    }
}

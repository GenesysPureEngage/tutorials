
import com.genesys.workspace.WorkspaceApi;
import com.genesys.workspace.common.WorkspaceApiException;

import com.genesys.workspace.models.KeyValueCollection;
import com.genesys.workspace.models.Call;

import com.genesys.internal.authentication.api.AuthenticationApi;
import com.genesys.internal.authentication.model.DefaultOAuth2AccessToken;
import com.genesys.internal.common.ApiClient;
import com.genesys.workspace.models.User;
import java.util.Base64;
import java.util.concurrent.CompletableFuture;

public class Main {

    static final CompletableFuture done = new CompletableFuture();

    public static void main(String[] args) throws Exception {

        String apiKey = "<apiKey>";
        String apiUrl = "<apiUrl>";

        //region creating WorkspaceApi
        //Creating a WorkspaceApi object with the apiKey, baseUrl and 'debugEnabled' preference.
        WorkspaceApi api = new WorkspaceApi(apiKey, apiUrl, false);
        //endregion

        //region Registering Event Handlers
        //Here we register Call and Dn event handlers.
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

                            case ESTABLISHED:
                                System.out.println("Answered");

                                //region Attaching User Data
                                //Attaching user data with value: {"<key>": "<value>"} to the call. If a pair with key "user" already exists it will not overwrite that pair and will make a new pair.
                                KeyValueCollection userData = new KeyValueCollection();
                                userData.addString("<key>", "<value>");
                                System.out.println("Attatching user data: " + userData);

                                api.voice().attachUserData(id, userData);
                                //endregion

                                break;
                        }
                        break;

                    //region User Data Notification
                    //We get a callStateChanged notification when user data is attached/updated.
                    //We can use call.getUserData() to get the current user data for that call.
                    case ATTACHED_DATA_CHANGED:
                        KeyValueCollection userData = call.getUserData();
                        String value = userData.getString("<key>");
                        if (value == null) {
                            done.complete(null);
                            break;
                        }

                        if (value.equals("<value>")) {

                            //region Updating User Data
                            //Updating user data with value: {"<key>": "<newValue>"} to the call. If pairs with key "user" already exist it will overwrite those pairs.
                            KeyValueCollection newUserData = new KeyValueCollection();
                            newUserData.addString("<key>", "<newValue>");
                            System.out.println("Updating user data: " + newUserData);

                            api.voice().updateUserData(id, newUserData);
                            //endregion

                        } else if (value.equals("<newValue>")) {

                            //region Deleting User Data
                            //Deleting all the data with the specified key.
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

        User user = api.initialize(resp.getAccessToken()).get();
        api.activateChannels(user.getAgentId(), user.getAgentId());

        System.out.println("Waiting for completion...");
        done.get();

        api.destroy();
    }
}

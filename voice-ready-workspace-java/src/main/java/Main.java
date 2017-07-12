import com.genesys.common.ApiClient;
import com.genesys.common.ApiResponse;
import com.genesys.workspace.api.SessionApi;
import com.genesys.workspace.api.VoiceApi;
import com.genesys.workspace.model.ActivatechannelsData;
import com.genesys.workspace.model.ApiSuccessResponse;
import com.genesys.workspace.model.ChannelsData;
import com.genesys.workspace.model.CurrentUser;
import com.genesys.workspace.model.LoginData;
import java.util.Optional;

public class Main {
    public static void main() {
        //region Initialize API Client
        //Create and setup ApiClient instance with your ApiKey and Workspace API URL.
        final String apiKey = "your_API_key";
        final String workspaceUrl = "https://api-usw1.genhtcc.com";

        final ApiClient client = new ApiClient();
        client.setBasePath(workspaceUrl);
        client.addDefaultHeader("x-api-key", apiKey);

        try {
            //region Create SessionApi instance
            //Creating instance of SessionApi using the ApiClient.
            final SessionApi sessionApi = new SessionApi(client);

            //region Logging in Workspace API
            //Logging in using username and password
            LoginData loginData = new LoginData();
            loginData.setUsername("username");
            loginData.setPassword("password");
            ApiResponse<ApiSuccessResponse> responseWithHttpInfo = sessionApi.loginWithHttpInfo(loginData);
            ApiSuccessResponse body = responseWithHttpInfo.getData();
            if(body.getStatus().getCode() != 0) {
                throw new Exception("Cannot log in");
            }

            //region Obtaining Workspace API Session
            //Obtaining session cookie and setting the cookie to the client
            Optional<String> session = responseWithHttpInfo.getHeaders().get("set-cookie").stream().filter( v -> v.startsWith("WWE_SESSIONID")).findFirst();
            if(session.isPresent()) {
                client.addDefaultHeader("Cookie", session.get());
            }
            else {
                throw new Exception("Session not found");
            }

            //region Current user information
            //Obtaining current user information using SessionApi
            CurrentUser user = sessionApi.getCurrentUser();
            
            //region Activate Channels
            //Activating channels for the user
            ActivatechannelsData data = new ActivatechannelsData();
            data.setAgentId(user.getData().getUser().getEmployeeId());
            data.setDn(user.getData().getUser().getAgentLogin());
            ChannelsData channelsData = new ChannelsData();
            channelsData.data(data);
            ApiSuccessResponse response = sessionApi.activateChannels(channelsData);
            if(response.getStatus().getCode() != 0) {
                throw new Exception("Cannot activate channels");
            }
            
            //region Create VoiceApi instance
            //Creating instance of VoiceApi using the ApiClient.
            final VoiceApi voiceApi = new VoiceApi(client);
            
            //region Change agent state
            //Changing agent state to ready
            response = voiceApi.setAgentStateReady();
            if(response.getStatus().getCode() != 0) {
                throw new Exception("Cannot change agent state");
            }

            //region Logging out
            //Ending our Workspace API session
            sessionApi.logout();
        }
        catch(Exception ex) {
                System.err.println(ex);
        }
    }
}

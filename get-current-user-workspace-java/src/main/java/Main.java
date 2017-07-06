import com.genesys.common.ApiClient;
import com.genesys.common.ApiResponse;
import com.genesys.workspace.api.SessionApi;
import com.genesys.workspace.model.ApiSuccessResponse;
import com.genesys.workspace.model.CurrentUser;
import com.genesys.workspace.model.Login;
import java.util.Optional;

public class Main {
    public static void main() {
        final String apiKey = "your_API_key";
        final String workspaceUrl = "https://api-usw1.genhtcc.com";

        final ApiClient client = new ApiClient();
        client.setBasePath(workspaceUrl);
        client.addDefaultHeader("x-api-key", apiKey);

        try {
            final SessionApi sessionApi = new SessionApi(client);

            Login loginData = new Login();
            loginData.setUsername("username");
            loginData.setPassword("password");
            ApiResponse<ApiSuccessResponse> resp = sessionApi.loginWithHttpInfo(loginData);
            ApiSuccessResponse body = resp.getData();
            if(body.getStatus().getCode() != 0) {
                    throw new Exception("Cannot log in");
            }

            Optional<String> session = resp.getHeaders().get("set-cookie").stream().filter( v -> v.startsWith("WWE_SESSIONID")).findFirst();
            if(session.isPresent()) {
                    client.addDefaultHeader("Cookie", session.get());
            }
            else {
                    throw new Exception("Session not found");
            }

            CurrentUser user = sessionApi.getCurrentUser();
            System.out.println(user);

            sessionApi.logout();
        }
        catch(Exception ex) {
                System.err.println(ex);
        }
    }
}

import io.swagger.client.ApiClient;
import io.swagger.client.ApiResponse;
import io.swagger.client.api.SessionApi;
import io.swagger.client.model.ApiSuccessResponse;
import io.swagger.client.model.CurrentUser;
import io.swagger.client.model.Login;
import java.util.Optional;

public class Main {
    public static void main() {
		final String apiKey = "key";
		final String workspaceUrl = "url";
		
		final ApiClient client = new ApiClient();
		client.setBasePath(workspaceUrl);
		client.addDefaultHeader("x-api-key", apiKey);
		
		try {
			final SessionApi sessionApi = new SessionApi();
			
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

import com.genesys.common.ApiClient;
import com.genesys.common.ApiResponse;
import com.genesys.provisioning.api.LoginApi;
import com.genesys.provisioning.api.UsersApi;
import com.genesys.provisioning.model.AddUser;
import com.genesys.provisioning.model.ApiSuccessResponse;
import com.genesys.provisioning.model.Login;
import com.genesys.provisioning.model.LoginSuccessResponse;
import java.util.Arrays;
import java.util.Optional;

public class Main {
    public static void main(String[] args) {

        final String apiKey = "your_API_key";
        final String provisionUrl = "https://api-usw1.genhtcc.com";

        final ApiClient client = new ApiClient();
        client.setBasePath(provisionUrl);
        client.addDefaultHeader("x-api-key", apiKey);

        try {
                final LoginApi loginApi = new LoginApi(client);

                Login loginData = new Login();
                loginData.setDomainUsername("username");
                loginData.setPassword("password");
                ApiResponse<LoginSuccessResponse> loginResp = loginApi.loginWithHttpInfo(loginData);
                if (loginResp.getData().getStatus().getCode() != 0) {
                        throw new Exception("Cannot log in");
                }

                Optional<String> session = loginResp.getHeaders().get("set-cookie").stream().filter(v -> v.startsWith("PROVISIONING_SESSIONID")).findFirst();
                if (session.isPresent()) {
                        client.addDefaultHeader("Cookie", session.get());
                } 
                else {
                        throw new Exception("Session not found");
                }

                final UsersApi usersApi = new UsersApi(client);

                AddUser usersData = new AddUser();
                usersData.setUserName("username");
                usersData.setPassword("password");
                usersData.setFirstName("FirstName");
                usersData.setLastName("LastName");
                usersData.setAccessGroups(Arrays.asList("accessGroup"));
                ApiSuccessResponse resp = usersApi.addUser(usersData);
                if (resp.getStatus().getCode().equals(0)) {
                        System.out.println("user created");
                } 
                else {
                        System.err.println("Cannot create user");
                }

                loginApi.logout();
        } 
        catch (Exception ex) {
                System.err.println(ex);
        }
    }
}

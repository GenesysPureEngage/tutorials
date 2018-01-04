import com.genesys.workspace.WorkspaceApi;
import com.genesys.workspace.models.User;

public class Main {
    public static void main(String[] args) throws Exception {
        String apiKey = "<apiKey>";
        String apiUrl = "<apiUrl>";
        
        //region Create an instance of WorkspaceApi
        //First we need to create a new instance of the WorkspaceApi class with the following parameters: **apiKey** (required to submit API requests) and **apiUrl** (base URL that provides access to the PureEngage Cloud APIs). You can get the values for both of these parameters from your PureEngage Cloud representative.
        WorkspaceApi api = new WorkspaceApi(apiKey, apiUrl);
        //endregion

        //region Authorization code grant
        //Authorization code should be obtained before (See https://github.com/GenesysPureEngage/authorization-code-grant-sample-app)
        String authorizationToken = "<authorizationToken1>";
        //endregion
        
        //region Initialization
        //Initialize the Workspace API by calling `initialize()` and passing **token**, which we received from the Authentication API. This returns the current user, which we then print.
        User user = api.initialize(authorizationToken);
        System.out.println("The workspace api is now successfully initialized");
        System.out.println("User data: " + user); 
        //endregion

        api.destroy();
   }
}














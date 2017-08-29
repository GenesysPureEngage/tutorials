import com.genesys.workspace.WorkspaceApi;
import com.genesys.workspace.common.WorkspaceApiException;

import com.genesys.workspace.events.CallStateChanged;
import com.genesys.workspace.events.DnStateChanged;
import com.genesys.workspace.models.User;
import com.genesys.workspace.models.Call;
import com.genesys.workspace.models.CallState;
import com.genesys.workspace.models.AgentWorkMode;
import com.genesys.workspace.models.Dn;

import com.genesys.internal.authorization.api.AuthenticationApi;
import com.genesys.internal.common.ApiClient;
import com.genesys.internal.common.ApiResponse;
import com.genesys.internal.common.ApiException;

import java.util.Arrays;
import java.util.Scanner;
import java.util.Map;
import java.util.HashMap;
import java.util.Base64;
import java.util.stream.Collectors;
import java.util.concurrent.CompletableFuture;

public class Main {
	public static void main(String[] args) {
	
		new Main();
		
	}
	
	boolean hasCallBeenHeld = false;
	CompletableFuture future = new CompletableFuture();
	WorkspaceApi api;
	
	
	public Main() {
		Map<String, String> options = new HashMap();
		final Scanner scanner = new Scanner(System.in);
		System.out.println("This tutorial steps you through setting up workspace client.");
		System.out.println("When running other workspace tutorials the propted inputs in this tutorial should be inputed as arguments (ex: --apiKey=<your api key>)");
		
		System.out.println("apiKey:");
		options.put("apiKey", scanner.nextLine());
		System.out.println("baseUrl:");
		options.put("baseUrl", scanner.nextLine());
		System.out.println("debugEnabled \n(this tells the WorkspaceApi whether it should log errors and other activity or not):");
		options.put("debugEnabled", scanner.nextLine());
		
		//region creating WorkspaceApi
		//Creating a WorkspaceApi object with the apiKey, baseUrl and 'debugEnabled' preference.
		api = new WorkspaceApi(
				options.get("apiKey"),
				options.get("baseUrl"),
				Boolean.parseBoolean(options.get("debugEnabled"))
		);
		//endregion
		System.out.println("WorkspaceApi object created");
		
		System.out.println("username:");
		options.put("username", scanner.nextLine());
		System.out.println("password:");
		options.put("password", scanner.nextLine());
		System.out.println("clientId");
		options.put("clientId", scanner.nextLine());
		
		try {
			System.out.println("Performing OAuth 2.0...");
			System.out.println("Getting auth code...");
			String authCode = getAuthCode(
				options.get("baseUrl"), 
				options.get("apiKey"),
				options.get("clientId"),
				options.get("username"),
				options.get("password")
			);
			if(Boolean.parseBoolean(options.get("debugEnabled"))) 
				System.out.println("Auth code is: [" + authCode + "]");
			
			System.out.println("Initializing API...");
			User user = api.initialize(authCode, "http://localhost").get();
			
			System.out.println("The workspace api is now successfully initialized");
			System.out.println("User data: " + user); 
			
			
			api.destroy();
			scanner.close();
			
		} catch(Exception ex) {
			System.err.println("Error: " + ex);
			
			try {
				api.destroy();
			} catch(WorkspaceApiException destroyEx) {
				System.err.println("Could not destroy API: " + destroyEx);
				System.exit(1);
			}
			scanner.close();
		}
		
	}
	
	public static String getAuthCode(String baseUrl, String apiKey, String clientId, String username, String password) throws ApiException {
		
		final ApiClient authClient = new ApiClient();
		
		authClient.setBasePath(baseUrl + "/auth/v3");
		authClient.addDefaultHeader("x-api-key", apiKey);
		authClient.getHttpClient().setFollowRedirects(false);
		
		final AuthenticationApi authApi = new AuthenticationApi(authClient); 
		
		final String authorization = "Basic " + new String(Base64.getEncoder().encode( (username + ":" + password).getBytes()));
		
		try {
			final ApiResponse<Void> response = authApi.authorizeWithHttpInfo("code", "http://localhost", clientId, authorization, null);
		} catch(ApiException ex) {
			String location = ex.getResponseHeaders().get("Location").get(0);
			String code = Arrays.stream(location.split("\\?")[1].split("&")).filter(q -> q.startsWith("code=")).findFirst().get().split("=")[1];
			return code;
			
		}
		
		
		return null;
	}
	
}

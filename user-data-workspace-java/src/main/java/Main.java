import com.genesys.workspace.WorkspaceApi;
import com.genesys.workspace.common.WorkspaceApiException;

import com.genesys.workspace.events.CallStateChanged;
import com.genesys.workspace.events.DnStateChanged;
import com.genesys.workspace.events.NotificationType;
import com.genesys.workspace.models.User;
import com.genesys.workspace.models.KeyValueCollection;
import com.genesys.workspace.models.Call;
import com.genesys.workspace.models.CallState;
import com.genesys.workspace.models.AgentWorkMode;
import com.genesys.workspace.models.Dn;

import com.genesys.internal.authorization.api.AuthenticationApi;
import com.genesys.internal.common.ApiClient;
import com.genesys.internal.common.ApiResponse;
import com.genesys.internal.common.ApiException;

import java.util.Arrays;
import java.util.Map;
import java.util.Base64;
import java.util.stream.Collectors;
import java.util.concurrent.CompletableFuture;

public class Main {
	public static void main(String[] args) {
		
		try {
			//region Parsing options
			//Here we parse the input params (ex: --baseUrl=<base url>)
			
			final Map<String, String> options = Arrays.stream(args).filter(arg -> arg.startsWith("--"))
				.map(arg -> arg.substring(2).split("=",2))
				.collect(Collectors.toMap(arg -> arg[0].trim(), arg -> arg[1].trim()));
			if(!options.containsKey("debugEnabled")) options.put("debugEnabled", "false");
			
			new Main(options);
			//endregion
			
		} catch(Exception e) {
			System.err.println("Invalid args");
			System.err.println(e);
		}
		
	}
	
	boolean hasUpdated = false;
	CompletableFuture future = new CompletableFuture();
	WorkspaceApi api;
	
	
	public Main(Map<String, String> options) {
		//region creating WorkspaceApi
		//Creating a WorkspaceApi object with the apiKey, baseUrl and 'debugEnabled' preference.
		api = new WorkspaceApi(
				options.get("apiKey"),
				options.get("baseUrl"),
				Boolean.parseBoolean(options.get("debugEnabled"))
		);
		//endregion
		
		//region Registering Event Handlers
		//Here we register Call and Dn event handlers.
		
		api.voice().addCallEventListener((CallStateChanged msg) -> {
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
								//Attaching user data with value: {"key": "value"} to the call. If a pair with key "user" already exists it will not overwrite that pair and will make a new pair.
								KeyValueCollection userData = new KeyValueCollection();
								userData.addString("key", "value");
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
						String value = userData.getString("key");
						if(value == null) {
							future.complete(null);
							break;
						}
						
						if(value.equals("value")) {
							
							//region Updating User Data
							//Updating user data with value: {"key": "newValue"} to the call. If pairs with key "user" already exist it will overwrite those pairs.
							KeyValueCollection newUserData = new KeyValueCollection();
							newUserData.addString("key", "newValue");
							System.out.println("Updating user data: " + newUserData);
						
							api.voice().updateUserData(id, newUserData); 
							//endregion
							
						} else if(value.equals("newValue")) {
							
							//region Deleting User Data
							//Deleting all the data with the specified key.
							System.out.println("Deleting user data with key: 'key'");
						
							api.voice().deleteUserDataPair(id, "key"); 
							//endregion
						}
						break;
					//endregion
				}
				
			} catch(WorkspaceApiException e) {
				System.err.println("Exception:" + e);
				future.completeExceptionally(e);
			}
		});
		
		
		//endregion
		
		try {
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
			CompletableFuture<User> initFuture = api.initialize(authCode, "http://localhost");
			User user = initFuture.get();
		
			System.out.println("Activating channels...");
			api.activateChannels(user.getAgentId(), user.getAgentId());
			api.voice().setAgentReady();
		
			System.out.println("Waiting for an inbound call...");
			future.get();
		
			System.out.println("done");
			api.destroy();
			
		} catch(Exception ex) {
			System.err.println("Error: " + ex);
			
			try {
				api.destroy();
			} catch(WorkspaceApiException destroyEx) {
				System.err.println("Could not destroy API: " + destroyEx);
				System.exit(1);
			}
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

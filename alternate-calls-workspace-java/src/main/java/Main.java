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
	
	boolean hasCalledAlternate = false;
	
	String establishedCallConnId = null;
	String heldCallConnId = null;
	int actionsCompleted = 0;
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
				String callId = call.getId();

				switch (call.getState()) {
					
					case ESTABLISHED:
						//region Established
						//When the call state is 'Established' this means that the call is in progress.
						//This event is used both to find established calls when the program starts and to signal that a call has been retrieved as a result of alternating. 
						if(establishedCallConnId == null) {
							System.out.println("Found established call: " + callId);
							establishedCallConnId = callId;
						}
						
						if(callId.equals(heldCallConnId)) {
							System.out.println("Retrieved");
						}
						
						//endregion
						break;

					case HELD:
						//region Held
						//This event is used both to find held calls when the program starts and signal that a call has been held as a result of alternating.
						if(heldCallConnId == null) {
							System.out.println("Found held call: " + callId);
							heldCallConnId = callId;
							if(heldCallConnId.equals(establishedCallConnId)) {
								establishedCallConnId = null;
								System.out.println("(Established call is now held, still waiting for established call)");
							}
						}
						
						if(callId.equals(establishedCallConnId)) { 
							System.out.println("Held");
						}
						//endregion
						break;

					case RELEASED:
						//region Released
						//The call state is changed to 'Released' when the call is ended.
						System.out.println("Released");
						//endregion
						break;
				}
				
				//region Check for Held and Established Calls
				//Check if held and established calls have been found.
				//If so, alternate between them.
				if(establishedCallConnId != null && heldCallConnId != null && !hasCalledAlternate) {
					System.out.println("Alternating calls...");
					api.voice().alternateCalls(establishedCallConnId, heldCallConnId);
					hasCalledAlternate = true;
				}
				
				//region Check for Actions Completed
				//Check if this event corresponds to one of the two events that should be triggered by alternating.
				//If both actions are completed then finish the program.
				if(call.getState() == CallState.ESTABLISHED && callId.equals(heldCallConnId) ||
				   call.getState() == CallState.HELD && callId.equals(establishedCallConnId)) {
					
					actionsCompleted ++;
					
					if(actionsCompleted == 2) {
						System.out.println("Alternated calls");
						future.complete(null);
					}
				}
				//endregion
				
				
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
			User user = api.initialize(authCode, "http://localhost").get();
			
			System.out.println("Activating channels...");
			api.activateChannels(user.getAgentId(), user.getAgentId());
			
			System.out.println("Waiting for held and established calls...");
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

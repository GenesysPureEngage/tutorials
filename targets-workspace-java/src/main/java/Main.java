import com.genesys.common.ApiClient;
import com.genesys.common.ApiResponse;
import com.genesys.common.ApiException;
import com.genesys.workspace.api.SessionApi;
import com.genesys.workspace.api.VoiceApi;
import com.genesys.workspace.api.TargetsApi;
import com.genesys.workspace.model.ActivatechannelsData;
import com.genesys.workspace.model.ApiSuccessResponse;
import com.genesys.workspace.model.ChannelsData;
import com.genesys.workspace.model.TargetsResponse;
import com.genesys.workspace.model.Target;
import com.genesys.workspace.model.VoicemakecallData;
import com.genesys.workspace.model.MakeCallData;

import com.genesys.workspace.model.ReadyData;
import com.genesys.workspace.model.VoicereadyData;

import com.genesys.authorization.api.AuthenticationApi;
import com.genesys.authorization.model.DefaultOAuth2AccessToken;

import org.cometd.bayeux.Message;
import org.cometd.bayeux.client.ClientSessionChannel;
import org.cometd.client.BayeuxClient;
import org.cometd.client.transport.ClientTransport;
import org.cometd.client.transport.LongPollingTransport;
import org.eclipse.jetty.client.HttpClient;
import org.eclipse.jetty.client.api.Request;
import org.eclipse.jetty.http.HttpMethod;
import org.eclipse.jetty.util.ssl.SslContextFactory;

import java.util.Optional;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.Base64;
import java.math.BigDecimal;

import java.net.URI;
import java.net.HttpCookie;
import java.net.CookieManager;


public class Main {
    public static void main(String[] args) {
    	
        final String apiKey = "qalvWPemcr4Gg9xB9470n7n9UraG1IFN7hgxNjd1";
        
        final String clientId = "external_api_client";
        final String clientSecret = "secret";
        
        final String workspaceUrl = "https://gws-usw1.genhtcc.com/workspace/v3";
        final String authUrl = "https://gws-usw1.genhtcc.com/auth/v3";
        
        final String username = "agent-6504772888";
        final String password = "Agent123";
		
		
		//region Initialize Workspace Client
        //Create and setup an ApiClient instance with your ApiKey and Workspace API URL.
        final ApiClient client = new ApiClient();
        client.setBasePath(workspaceUrl);
        client.addDefaultHeader("x-api-key", apiKey);
        
        //region Initialize Authorization Client
        //Create and setup an ApiClient instance with your ApiKey and Authorization API URL.
        final ApiClient authClient = new ApiClient();
        authClient.setBasePath(authUrl);
        authClient.addDefaultHeader("x-api-key", apiKey);
        //endregion
        
        
        try {
        	
            //region Create SessionApi and VoiceApi instances
            //Creating instances of SessionApi and VoiceApi using the workspace ApiClient which will be used to make api calls.
            final SessionApi sessionApi = new SessionApi(client);
            final VoiceApi voiceApi = new VoiceApi(client);
            final TargetsApi targetsApi = new TargetsApi(client);
            
            //region Create AuthenticationApi instance
            //Create instance of AuthenticationApi using the authorization ApiClient which will be used to retrieve access token.
            final AuthenticationApi authApi = new AuthenticationApi(authClient); 
			
			//region Oauth2 Authentication
			//Performing Oauth 2.0 authentication.
			System.out.println("Retrieving access token...");
            
            final String authorization = "Basic " + new String(Base64.getEncoder().encode( (clientId + ":" + clientSecret).getBytes()));
            final DefaultOAuth2AccessToken accessToken = authApi.retrieveToken("password", clientId, username, password, authorization);
            
            System.out.println("Retrieved access token");
            System.out.println("Initializing workspace...");
            
            final ApiResponse<ApiSuccessResponse> response = sessionApi.initializeWorkspaceWithHttpInfo("", "", "Bearer " + accessToken.getAccessToken());
            
            Optional<String> session = response.getHeaders().get("set-cookie").stream().filter(v -> v.startsWith("WORKSPACE_SESSIONID")).findFirst();
            
            if(session.isPresent()) {
            	client.addDefaultHeader("Cookie", session.get());
            } else {
            	throw new Exception("Could not find session");
            }
            
            System.out.println("Got workspace session id");
            
            //region Creating HttpClient
            //Conifuring a Jetty HttpClient which will be used for CometD.
            final SslContextFactory sslContextFactory = new SslContextFactory();
		
			final HttpClient httpClient = new HttpClient(sslContextFactory);
			httpClient.start();
			
			
			CookieManager manager = new CookieManager();
			httpClient.setCookieStore(manager.getCookieStore());
			httpClient.getCookieStore().add(new URI(workspaceUrl), new HttpCookie("WORKSPACE_SESSIONID", session.get().split(";")[0].split("=")[1]));
			
			
			//region Creating BayeuxClient (CometD Client) and Making CometD handshake
			//Here we configure CometD using long polling transport and making sure the api key is included in headers. The BayeuxClient instance is created and used to make the CometD handshake.
			ClientTransport transport = new LongPollingTransport(new HashMap(), httpClient) {
				@Override protected void customize(Request request) {
					request.header("x-api-key", apiKey);
				}
			};
			
			final BayeuxClient bayeuxClient = new BayeuxClient(workspaceUrl + "/notifications", transport);
			
			
			bayeuxClient.handshake((ClientSessionChannel handshakeChannel, Message handshakeMessage) -> {
					
				if(handshakeMessage.isSuccessful()) {
					//region Subscribing to Initialization Channel
					//Once the handshake is successful we can subscribe to a CometD channels to get events. 
					//Here we subscribe to initialization channel to get 'WorkspaceInitializationComplete' event.
					bayeuxClient.getChannel("/workspace/v3/initialization").subscribe(new  ClientSessionChannel.MessageListener() {
						
						@Override public void onMessage(ClientSessionChannel channel, Message message) {
							
							Map<String, Object> messageData = message.getDataAsMap();
							//region Workspace Initialization Complete Event
							//When the server is done initializing workspace it will send a 'WorkspaceInitializationComplete' event containing the user data.
							if(messageData.get("messageType").equals("WorkspaceInitializationComplete")) {
								System.out.println("Workspace initialized");
								//region Getting User Data
								//The user data is stored in messageData -> data -> user as a map.
								Map<String, Object> data = (Map<String, Object>) messageData.get("data");
								Map<String, Object> user = (Map<String, Object>) data.get("user");
								
								String agentLogin = (String) user.get("agentLogin");
								String employeeId = (String) user.get("employeeId");
								
								System.out.println("Activating channels...");
								activateChannels(sessionApi, employeeId, agentLogin);
							}
						}
						
					}, (ClientSessionChannel channel, Message message) -> {
						//region Subscription Event
						//If the CometD subscription is unsuccessful we end the program.
						if(message.isSuccessful()) {
							System.out.println("Subscribed to initialization events");
						} else {
							System.out.println("Initialization subscription failed");
							System.exit(1);
						}
						//endregion
					});
					
					//region Subscribing is Voice Channel
					//Here we subscribe to voice channel to get call events.  	
					bayeuxClient.getChannel("/workspace/v3/voice").subscribe(new  ClientSessionChannel.MessageListener() {
						
						private boolean hasActivatedChannels = false; 
						
						@Override public void onMessage(ClientSessionChannel channel, Message message) {
							//region Receiving Events
							//Here CometD events are handled. The Message object contains data that is stored as a map. Getting the 'messageType' will tell us the type of message.
							Map<String, Object> messageData = (Map<String, Object>) message.getDataAsMap();
						
							if(messageData.get("messageType").equals("DnStateChanged")) {
							
								Map<String, Object> dn = (Map<String, Object>) messageData.get("dn");
							
								//region Handle Different State changes
								//When the server is done activating channels, it will send a 'DnStateChanged' message with the agent state being 'NotReady'.
								//Once the server is done changing the agent state to 'Ready' we will get another event.
								if(!hasActivatedChannels) {
									hasActivatedChannels = true;
									System.out.println("Getting targets...");
									List<Target> targets = getTargets(targetsApi, "agent-1");
									if(targets.size() == 0) {
										System.err.println("Search came up empty");
										System.exit(1);
									} else {
										System.out.println("Found targets: " + targets);
										System.out.println("Calling target: " + targets.get(0));
										
										makeCall(voiceApi, targets.get(0).getNumber());
										
										//region Finishing up
										//Now that we have made a call to a target we can disconnect ant logout.
										System.out.println("Disconnecting and logging out...");
										disconnectAndLogout(bayeuxClient, sessionApi);
						
										System.out.println("done");
										System.exit(0);
									}
									
									
								}
							}
						
						}
					}, (ClientSessionChannel channel, Message message) -> {
						//region Subscription Event
						//If the CometD subscription is unsuccessful we end the program.
						if(message.isSuccessful()) {
							System.out.println("Subscribed to voice events");
						} else {
							System.out.println("Voice subscription failed");
							System.exit(1);
						}
						//endregion
					});
					
					
				} else {
					System.err.println("Handshake failed");
				}
			});
            
            
        } catch(Exception ex) {
            System.err.println(ex);
            System.exit(1);
        }
    }
    
    public static void activateChannels(SessionApi sessionApi, String employeeId, String agentLogin) {
		
		//region Activate Channels
		//Activating channels for the user using employee ID and agent login.
		try {
			
			ActivatechannelsData data = new ActivatechannelsData();
			data.setAgentId(employeeId);
			data.setDn(agentLogin);
			ChannelsData channelsData = new ChannelsData();
			channelsData.data(data);
			ApiSuccessResponse response = sessionApi.activateChannels(channelsData);
			if(response.getStatus().getCode() != 0) {
				System.err.println("Cannot activate channels");
				System.exit(1);
			}
			
		} catch(ApiException ex) {
			System.err.println("Cannot activate channels");
			System.err.println(ex);
			System.exit(1);
		}
		//endregion
	}
	
	public static List<Target> getTargets(TargetsApi targetsApi, String searchTerm) {
		//region Get Targets
		//Getting target agents that match the specified search term using the targets api.
		try {
			
			TargetsResponse response = targetsApi.get(searchTerm, "", "", "asc", BigDecimal.valueOf(10), "exact");
			if(response.getStatus().getCode() != 0) {
				System.err.println("Cannot get targets");
			}
			return response.getData().getTargets();
			
		} catch(ApiException ex) {
			System.err.println("Cannot get targets");
			System.err.println(ex);
			System.exit(1);
		}
		//endregion
		return null;
    }
    
    public static void makeCall(VoiceApi voiceApi, String destination) {
    	//region Making a Call
		//Using the voice api to make a call to the specified destination.
		try {
			VoicemakecallData data = new VoicemakecallData().destination(destination);
			voiceApi.makeCall(new MakeCallData().data(data));
		} catch(ApiException ex) {
			System.err.println("Cannot make call");
			System.err.println(ex);
			System.exit(1);
		}
		//endregion
    }
    
    public static void disconnectAndLogout(BayeuxClient bayeuxClient, SessionApi sessionApi) {
    	//region Disconnecting and Logging Out
		//Using the BayeuxClient and SessionApi to disconnect CometD and logout of the workspace session.
		bayeuxClient.disconnect();
		
		try {
			sessionApi.logout();
		} catch(ApiException ex) {
			System.err.println("Cannot log out");
			System.err.println(ex);
			System.exit(1);
		}
		//endregion
    }
    
    
}












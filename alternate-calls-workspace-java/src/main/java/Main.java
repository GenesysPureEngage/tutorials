import com.genesys.common.ApiClient;
import com.genesys.common.ApiResponse;
import com.genesys.common.ApiException;
import com.genesys.workspace.api.SessionApi;
import com.genesys.workspace.api.VoiceApi;
import com.genesys.workspace.model.ActivatechannelsData;
import com.genesys.workspace.model.ApiSuccessResponse;
import com.genesys.workspace.model.ChannelsData;
import com.genesys.workspace.model.Call;
import com.genesys.workspace.model.AlternateData;
import com.genesys.workspace.model.VoicecallsidalternateData;

import com.genesys.authorization.api.AuthenticationApi;
import com.genesys.authorization.model.DefaultOAuth2AccessToken;

import org.cometd.bayeux.Message;
import org.cometd.bayeux.client.ClientSessionChannel;
import org.cometd.client.BayeuxClient;
import org.cometd.client.transport.ClientTransport;
import org.cometd.client.transport.LongPollingTransport;
import org.eclipse.jetty.client.HttpClient;
import org.eclipse.jetty.client.api.Request;
import org.eclipse.jetty.util.ssl.SslContextFactory;

import java.util.Optional;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.HashSet;
import java.util.Arrays;
import java.util.Base64;

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
            
            Optional<String> sessionCookie = response.getHeaders().get("set-cookie").stream().filter(v -> v.startsWith("WORKSPACE_SESSIONID")).findFirst();
            
            if(sessionCookie.isPresent()) {
            	client.addDefaultHeader("Cookie", sessionCookie.get());
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
			httpClient.getCookieStore().add(new URI(workspaceUrl), new HttpCookie("WORKSPACE_SESSIONID", sessionCookie.get().split(";")[0].split("=")[1]));
			
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
					//Here we subscribe to initialization channel to get 'initializationComplete' event.
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
						
						//region Setting up Message Listener
						//In order to specify why certain CometD events are taking place it is necessary to store some information about what has happened.
						private boolean hasActivatedChannels = false;
						private boolean hasCalledAlternate = false;
						
						private String establishedCallConnId = null;
						private String heldCallConnId = null;
						private int actionsCompleted = 0;
						
						//endregion
						@Override public void onMessage(ClientSessionChannel channel, Message message) {
							
							//region Receiving Events
							//Here CometD events are handled. The Message object contains data that is stored as a map. Getting the 'messageType' will tell us the type of message.
							Map<String, Object> messageData = (Map<String, Object>) message.getDataAsMap();
							
							if(messageData.get("messageType").equals("DnStateChanged")) {
								
								Map<String, Object> dn = (Map<String, Object>) messageData.get("dn");
								
								//region Activating Channels Event
								//The first DnStateChanged event that is either 'Ready' or 'NotReady' is assumed to be cause by the server activating channels.
								if(!hasActivatedChannels && (dn.get("agentState").equals("Ready") || dn.get("agentState").equals("NotReady")) ) {
									System.out.println("Channels activated");
									hasActivatedChannels = true;
									System.out.println("Looking for held and Established calls...");
								}
									
							} else if(messageData.get("messageType").equals("CallStateChanged")) {
								//region Get Call Info
								//The call id and state are stored in a map with the key 'call' in message data.
								Map<String, Object> call = (Map<String, Object>) messageData.get("call");
								String callId = call.get("id").toString();
								String callState = call.get("state").toString();
								String capabilities = Arrays.asList((Object[]) call.get("capabilities")).toString();
								//endregion
								
								if(callState.equals("Established")) {
									//region Established
									//When the call state is 'Established' this means that the call is in progress.
									//This event is used both to find established calls when the program starts and to signal that a call has been retrieved as a result of alternating. 
									if(establishedCallConnId == null) {
										System.out.println("Found established call: " + callId);
										establishedCallConnId = callId;
									}
									
									if(callId.equals(heldCallConnId)) {
										System.out.println("Retrieved");
										System.out.println("CallId: " + callId + ", State: " + callState + ", Capabilities: " + capabilities);
									}
									
									//endregion
								} else if(callState.equals("Held")) {
									//region Held
									//This event is used both to find held calls when the program starts and signal that a call has been held as a result of alternating.
									if(heldCallConnId == null) {
										System.out.println("Found held call: " + callId);
										heldCallConnId = callId;
										if(heldCallConnId.equals(establishedCallConnId)) {
											establishedCallConnId = null;
											System.out.println("(Established call is now held, still waiting for established call");
										}
									}
									
									if(callId.equals(establishedCallConnId)) { 
										System.out.println("Held");
										System.out.println("CallId: " + callId + ", State: " + callState + ", Capabilities: " + capabilities);
									}
									//endregion
								}  else if(callState.equals("Released")) {
									//region Released
									//The call state is changed to 'Released' when the call is ended.
									System.out.println("Released");
									//endregion
								}
								
								//region Check for Held and Established Calls
								//Check if held and established calls have been found.
								//If so, alternate between them.
								if(establishedCallConnId != null && heldCallConnId != null && !hasCalledAlternate) {
									System.out.println("Alternating calls...");
									alternateCalls(voiceApi, establishedCallConnId, heldCallConnId);
									hasCalledAlternate = true;
								}
								
								//region Check for Actions Completed
								//Check if this event corresponds to one of the two events that should be triggered by alternating.
								//If both actions are completed then finish the program.
								if(callState.equals("Established") && callId.equals(heldCallConnId) ||
								   callState.equals("Held") && callId.equals(establishedCallConnId)) {
								
									actionsCompleted ++;
								
									if(actionsCompleted == 2) {
										System.out.println("Alternated calls");
										//region Finishing up
										//Now that the server is done alternating calls we can disconnect CometD and logout.
										System.out.println("Disconnecting and logging out...");
										disconnectAndLogout(bayeuxClient, sessionApi);
						
										System.out.println("done");
										System.exit(0);
										//endregion
									}
								}

							} else if(messageData.get("messageType").equals("EventError")) {
								//region Handle Errors
								//Here we get CometD event errors.
								System.out.println("Error: " + message);
								System.exit(1);
								//endregion
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
    
    public static void alternateCalls(VoiceApi voiceApi, String callId, String heldConnId) {
    	//region Alternating Calls
    	//Switch fron a the current call to a held call using the voice api.
    	try {
			VoicecallsidalternateData alternateData = new VoicecallsidalternateData()
				.heldConnId(heldConnId);
			voiceApi.alternate(callId, new AlternateData().data(alternateData));
		} catch(ApiException ex) {
			System.err.println("Cannot alternate calls");
			System.err.println(ex);
			System.exit(1);
		}
		//endregion
    }
    
    public static List<Call> getCalls(VoiceApi voiceApi) {
    	//region Getting Calls
    	//Getting the current calls using the voice api.
		try {
			InlineResponse200 response = voiceApi.getCalls();
			return response.getData().getCalls();
		} catch(ApiException ex) {
			System.err.println("Cannot get calls");
			System.err.println(ex);
			System.exit(1);
		}
		//endregion
		return null;
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










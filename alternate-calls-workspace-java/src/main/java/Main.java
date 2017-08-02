import com.genesys.common.ApiClient;
import com.genesys.common.ApiResponse;
import com.genesys.common.ApiException;
import com.genesys.workspace.api.SessionApi;
import com.genesys.workspace.api.VoiceApi;
import com.genesys.workspace.model.ActivatechannelsData;
import com.genesys.workspace.model.ApiSuccessResponse;
import com.genesys.workspace.model.ChannelsData;
import com.genesys.workspace.model.CurrentSession;
import com.genesys.workspace.model.InlineResponse200;
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
    	new Thread(() -> {
    		try {Thread.sleep(20000);} catch(Exception e){}
    		System.exit(0);
    	}).start();
    	
        
    	final String apiKey = "qalvWPemcr4Gg9xB9470n7n9UraG1IFN7hgxNjd1";
        
        final String clientId = "external_api_client";
        final String clientSecret = "secret";
        
        final String workspaceUrl = "https://api-usw1.genhtcc.com/workspace/v3";
        final String authUrl = "https://api-usw1.genhtcc.com/auth/v3";
        
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
			//Here you configure CometD using long polling transport and making sure the api key is included in headers. The BayeuxClient instance is created and used to make the CometD handshake.
			ClientTransport transport = new LongPollingTransport(new HashMap(), httpClient) {
				@Override protected void customize(Request request) {
					request.header("x-api-key", apiKey);
				}
			};
			
			final BayeuxClient bayeuxClient = new BayeuxClient(workspaceUrl + "/notifications", transport);
			
			
			bayeuxClient.handshake((ClientSessionChannel handshakeChannel, Message handshakeMessage) -> {
					
				if(handshakeMessage.isSuccessful()) {
					//region Subscribing to Channel
					//Once the handshake is successful you may subscribe to a CometD channel to get events. 	
					bayeuxClient.getChannel("/workspace/v3/voice").subscribe(new  ClientSessionChannel.MessageListener() {
						
						//region Setting up Message Listener
						//In order to specify why certain CometD events are taking place it is necessary to store some information about what has happened.
						private boolean hasActivatedChannels = false;
						
						private String shouldHoldConnId = null; //Stores conn id for
						private String shouldRetrieveConnId = null;
						private int actionsCompleted = 0;
						
						@Override public void onMessage(ClientSessionChannel channel, Message message) {
							
							//region Receiving Events
							//Here CometD events are handled. The Message object contains data that is stored as a map. Getting the 'messageType' will tell you the type of message.
							Map<String, Object> messageData = (Map<String, Object>) message.getDataAsMap();
							
							if(messageData.get("messageType").equals("DnStateChanged")) {
								
								Map<String, Object> dn = (Map<String, Object>) messageData.get("dn");
								
								//region Activating Channels Event
								//The first DnStateChanged event that is either 'Ready' or 'NotReady' is assumed to be cause by the server activating channels.
								if(!hasActivatedChannels && (dn.get("agentState").equals("Ready") || dn.get("agentState").equals("NotReady")) ) {
									System.out.println("Channels activated");
									//region Getting Calls
									//Here you get calls using the voice api.
									//In this tutorial you assume that there is one held and one established call.
									//If not you throw an error.
									System.out.println("Getting calls...");
									
									
									List<Call> calls = getCalls(voiceApi);
									
									Optional<Call> heldCall = calls.stream().filter( c -> c.getState().equals("Held")).findFirst();
									Optional<Call> establishedCall = calls.stream().filter( c -> c.getState().equals("Established")).findFirst();
									
									if(heldCall.isPresent() && establishedCall.isPresent()) {
										System.out.println("Alternating...");
										alternateCalls(voiceApi, establishedCall.get().getConnId(), heldCall.get().getConnId());
										
										shouldHoldConnId = establishedCall.get().getConnId();
										shouldRetrieveConnId = heldCall.get().getConnId();
										
									} else {
										System.out.println("No Held or no Established call");
										System.exit(1);
									}
									
									hasActivatedChannels = true;
									
								}
									
							} else if(messageData.get("messageType").equals("CallStateChanged")) {
								//region Get Call Info
								//The call id and state are stored in a map with the key 'call' in message data.
								Map<String, Object> call = (Map<String, Object>) messageData.get("call");
								String callId = call.get("id").toString();
								String callState = call.get("state").toString();
								String capabilities = Arrays.asList((Object[]) call.get("capabilities")).toString();
								
								if(callState.equals("Established")) {
									//region Established
									//When the call state is 'Established' this means that the call is in progress.
									//The state is set to 'Established' both when the call is first answered and when the call is retrieved after holding.
									//In this tutorial we assume that the state is established because it is retrieving a call.
									
									System.out.println("Retrieved");
									System.out.println("CallId: " + callId + ", State: " + callState + ", Capabilities: " + capabilities);
									
									
								} else if(callState.equals("Held")) {
									//region Held
									//The call state is changed to 'Held' when you hold the call. 
									System.out.println("Held");
									System.out.println("CallId: " + callId + ", State: " + callState + ", Capabilities: " + capabilities);
									
									
								}  else if(callState.equals("Released")) {
									//region Released
									//The call state is changed to 'Released' when the call is ended.
									System.out.println("Released");
									
								}
								
								//region Check for Actions Completed
								//Check if this event corresponds to one of the two events that should be triggered by alternating.
								//If both actions are completed then finish the program.
								if(callState.equals("Established") && callId.equals(shouldRetrieveConnId) ||
								   callState.equals("Held") && callId.equals(shouldHoldConnId)) {
								
									actionsCompleted ++;
								
									if(actionsCompleted == 2) {
										System.out.println("Alternated calls");
										//region Finishing up
										//Now that the server is done alternating calls you can disconnect CometD and logout.
										System.out.println("Disconnecting and logging out...");
										disconnectAndLogout(bayeuxClient, sessionApi);
						
										System.out.println("done");
										System.exit(0);
									}
								}

							}
							
						}
						
					}, (ClientSessionChannel channel, Message message) -> {
						
						if(message.isSuccessful()) {
							System.out.println("subscribed");
							
							System.out.println("Activating channels...");
							activateChannels(sessionApi);
						} else {
							System.out.println("cometD subscription failed");
							System.exit(1);
						}
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
    
    
    
	public static void activateChannels(SessionApi sessionApi) {
		try {
			//region Current user information
			//Obtaining current user information such as the employee ID using the SessionApi.
			CurrentSession user = sessionApi.getCurrentSession();
			//region Activate Channels
			//Activating channels for the user using employee ID and agent login.
			ActivatechannelsData data = new ActivatechannelsData();
			data.setAgentId(user.getData().getUser().getAgentLogin());
			data.setDn(user.getData().getUser().getAgentLogin());
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
    }
    
}





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
import com.genesys.workspace.model.InitiateTransferData;
import com.genesys.workspace.model.VoicecallsidinitiatetransferData;
import com.genesys.workspace.model.CompleteTransferData;
import com.genesys.workspace.model.VoicecallsidcompletetransferData;

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

import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.Arrays;
import java.util.Base64;

import java.net.URI;
import java.net.HttpCookie;
import java.net.CookieManager;

public class Main {
	
    //Usage: <apiKey> <clientId> <clientSecret> <apiUrl> <agentUsername> <agentPassword> <consultAgentNumber>
    public static void main(String[] args) {
    	
        final String apiKey = args[0];
        final String clientId = args[1];
        final String clientSecret = args[2];
        final String apiUrl = args[3];
        final String username = args[4];
        final String password = args[5];
        final String consultAgentNumber = args[6];

        final String workspaceUrl = String.format("%s/workspace/v3", apiUrl);
        final String authUrl = apiUrl;
        
        CookieManager cookieManager = new CookieManager();
    	
        //region Initialize Workspace Client
        //Create and setup an ApiClient instance with your ApiKey and Workspace API URL.
        final ApiClient client = new ApiClient();
        client.setBasePath(workspaceUrl);
        client.addDefaultHeader("x-api-key", apiKey);
		
        client.getHttpClient().setCookieHandler(cookieManager);
		
        //region Initialize Authorization Client
        //Create and setup an ApiClient instance with your ApiKey and Authorization API URL.
        final ApiClient authClient = new ApiClient();
        authClient.setBasePath(authUrl);
        authClient.addDefaultHeader("x-api-key", apiKey);
        authClient.getHttpClient().setCookieHandler(cookieManager);

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
            final String authorization = "Basic " + new String(Base64.getEncoder().encode((clientId + ":" + clientSecret).getBytes()));
            final DefaultOAuth2AccessToken accessToken = authApi.retrieveToken("password", "scope",  authorization, "application/json", "external_api_client", username, password);
            if(accessToken == null || accessToken.getAccessToken() == null) {
                throw new Exception("Could not retrieve token");
            }

            System.out.println("Initializing workspace...");
            final ApiSuccessResponse response = sessionApi.initializeWorkspace("", "", "Bearer " + accessToken.getAccessToken());
            if(response.getStatus().getCode() != 0 && response.getStatus().getCode() != 1) {
                throw new Exception("Cannot initialize workspace");
            }
            
            System.out.println("Got workspace session id");
            
            
            //region Creating HttpClient
            //Conifuring a Jetty HttpClient which will be used for CometD.
            final SslContextFactory sslContextFactory = new SslContextFactory();
		
			final HttpClient httpClient = new HttpClient(sslContextFactory);
			httpClient.setCookieStore(cookieManager.getCookieStore());
			httpClient.start();
			
			
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
						private boolean hasCalledInitiateTransfer = false;
						private boolean hasCalledCompleteTransfer = false;
						
						private int actionsCompleted = 0;
						
						private String consultConnId = null;
						private String parentConnId = null;
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
									System.out.println("Looking for established calls...");
								}
								//endregion
								
							} else if(messageData.get("messageType").equals("CallStateChanged")) {
								//region Get Call Event Info
								//The call id and state are stored in a map with the key 'call' in message data.
								Map<String, Object> call = (Map<String, Object>) messageData.get("call");
								String callId = call.get("id").toString();
								String callState = call.get("state").toString();
								String capabilities = Arrays.asList((Object[]) call.get("capabilities")).toString();
								
								if(callState.equals("Dialing")) {
									//region Dialing
									//After the transfer is initiated, we will get a dialing event for the new call.
									System.out.println("Dialing");
									System.out.println("CallId: " + callId + ", State: " + callState + ", Capabilities: " + capabilities);
									
									if(hasCalledInitiateTransfer) {
										consultConnId = callId;
									}
									//endregion
									
								} if(callState.equals("Established")) {
									//region Established
									//When the call state is 'Established' this means that the call is in progress.
									//Here we check if this event if from answering the consult call.
									if(hasActivatedChannels && parentConnId == null) {
										System.out.println("Found established call: " + callId);
										System.out.println("Initiating transfer...");
										parentConnId = callId;
										initiateTransfer(voiceApi, callId, consultAgentNumber);
										hasCalledInitiateTransfer = true;
									}
									
									if(hasCalledInitiateTransfer && callId.equals(consultConnId)) {
										System.out.println("Answered");
										System.out.println("CallId: " + callId + ", State: " + callState + ", Capabilities: " + capabilities);
										actionsCompleted ++;
									}
									//endregion
									
								} else if(callState.equals("Held")) {
									//region Held
									//The call state is changed to 'Held' when we hold the call. 
									
									if(hasCalledInitiateTransfer && callId.equals(parentConnId)) {
										System.out.println("Held");
										System.out.println("CallId: " + callId + ", State: " + callState + ", Capabilities: " + capabilities);
										actionsCompleted ++;
									}
									//endregion
								}
								
								if(callState.equals("Held") || callState.equals("Established")) {
									if(actionsCompleted == 2) {
										System.out.println("Transfer initiated");
										System.out.println("Completing transfer...");
										completeTransfer(voiceApi, callId, parentConnId);
										hasCalledCompleteTransfer = true;
									}
								}
								
								if(callState.equals("Released")) {
									//region Released
									//The call state is changed to 'Released' when the call is ended.
									if(hasCalledCompleteTransfer && (callId.equals(parentConnId) || callId.equals(consultConnId))) {
										System.out.println("Released");
										System.out.println("CallId: " + callId + ", State: " + callState + ", Capabilities: " + capabilities);
										actionsCompleted ++;
									}
									
									if(actionsCompleted == 4) {
										System.out.println("Transfer complete");
										//region Finishing up
										//Now that the server is done transferring calls we can disconnect CometD and logout.
										System.out.println("Disconnecting and logging out...");
										disconnectAndLogout(bayeuxClient, sessionApi);
						
										System.out.println("done");
										System.exit(0);
									}
									//endregion
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
	
    public static void initiateTransfer(VoiceApi voiceApi, String callId, String destination) {
        //region Initiating Transfer
        //Initiate transfer to a destination number using the voice api.
        try {
            VoicecallsidinitiatetransferData data = new VoicecallsidinitiatetransferData()
                    .destination(destination);
            voiceApi.initiateTransfer(callId, new InitiateTransferData().data(data));
        } catch (ApiException ex) {
            System.err.println("Cannot initiate transfer");
            System.err.println(ex);
            System.exit(1);
        }
    }

    public static void completeTransfer(VoiceApi voiceApi, String callId, String parentConnId) {
        //region Completing Transfer
        //Complete the transfer using the parent conn id and the voice api.
        try {
            VoicecallsidcompletetransferData data = new VoicecallsidcompletetransferData()
                    .parentConnId(parentConnId);
            voiceApi.completeTransfer(callId, new CompleteTransferData().data(data));
        } catch (ApiException ex) {
            System.err.println("Cannot complete transfer");
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
        } catch (ApiException ex) {
            System.err.println("Cannot log out");
            System.err.println(ex);
            System.exit(1);
        }
        //endregion
    }

}


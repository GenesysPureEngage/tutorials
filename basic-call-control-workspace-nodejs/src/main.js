const WorkspaceApi = require('genesys-workspace-client-js');
const argv = require('yargs').argv

/*
  This sample initializes the API, activates channels for the 
  specified user, and waits for an inbound call. When an inbound 
  call arrives, it will be answered, then the call will be placed
  on hold and retrieved, and finally released.

  On the release the the agent will be placed in ACW. 

  After performing this automated sequence the API is cleaned up.
*/
let api = new WorkspaceApi(argv);
let callHasBeenHeld = false;

async function main() {
	try {
    
    api.on('CallStateChanged', async msg => {
      let call = msg.call;
      switch (call.state) {
        case 'Ringing':
          console.log('Answering call...');
          await api.voice.answerCall(call.id);
          break;

        case 'Established':
          if (!callHasBeenHeld) {
            console.log('Placing call on hold...');
            await api.voice.holdCall(call.id);
            callHasBeenHeld = true;
          } else {
            console.log('Releasing call...');
            await api.voice.releaseCall(call.id);
          }
          break;

        case 'Held':
          console.log('Retrieving call...');
          await api.voice.retrieveCall(call.id);
          break;

        case 'Released':
          console.log('Setting agent notReady w/ ACW...');
          await api.voice.notReady('AfterCallWork');
          break;
      } 
    });

    api.on('DnStateChanged', async msg => {
      let dn = msg.dn;
      console.log(`Dn updated - number [${dn.number}] state [${dn.agentState}] workMode [${dn.agentWorkMode}]...`);
      if (dn.agentWorkMode === 'AfterCallWork') {
        await api.destroy();
      }
    });

    console.log('Initializing API...');
    await api.initialize();
    console.log('Activating channels...');
    await api.activateChannels(api.user.employeeId, api.user.agentLogin);

    console.log('Waiting for an inbound call...');
  } catch (e) {
    await api.destroy();
  }
}

main();

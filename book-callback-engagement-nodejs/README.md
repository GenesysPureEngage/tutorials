# Book a Callback

This tutorial shows how to use the Engagement API to book a callback and retrieve the callback results. If you provide the desired time, then the callback is identified as a scheduled callback, otherwise it is an immediate callback. To perform a callback, the API starts an ORS session at the desired time. For scheduled callbacks, it also performs a capacity check. If no empty callback slot is available at the desired time, the response contains a list of available time slots.

## Getting Started

### Prerequisites

Install nodejs.

Get Genesys PureEngage API key.

### Installation

Clone or download the repository.

## Running the Sample

1. Using a shell or command line, navigate to the directory that contains the `package.json` file.
2. Execute `npm install` to install package dependencies.
3. Edit the `./src/main.js` file and assign valid values to the constants.
4. Execute `node ./src/main.js` to launch the sample.

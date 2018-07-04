# Get Availability

This tutorial shows how to use the GES Availability API to get available time slots within a given period. Using this information, you can book a scheduled callback for one of the returned time slots. The API determines the available time slot information by using the period information specified in the request, the Business Hours Service configured for the Callback Service, and the list of existing callback records. If you do not configure a Business Hours Service, the API determines the list of time slots according to the specified period information and the existing callback records.

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

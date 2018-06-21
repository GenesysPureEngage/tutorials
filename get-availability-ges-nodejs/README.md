# Get Availability

This Tutorial shows you how to use GES Availability API to get the available time slots within a given period. The information retrieved can be used to book a scheduled callback for the desired available time slot. The API determines the available slots information by using the period information in the request, the configured Business Hours Service for Callback Service and the existing callback records. If Business Hours Service is not configured then, it simply uses the period information and the existing callback records.

## Getting Started

### Prerequisites

Install nodejs

### Installing

Clone or download the repository

## Running

1. Using shell or command line, navigate to the package.json location.
2. Execute "npm install" to install dependent packages from npm.
3. Assign valid values to the constants in ./src/main.js
4. Execute "node ./src/main.js"

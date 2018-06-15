# Book a Callback

This Tutorial shows you how to use GES Callback API to book a callback and how to get the results back. If desired time is supplied, then the callback is called a scheduled callback, otherwise it is an immediate callback. To perform a callback, the API starts an ORS session at the desired time. Additionally, it performs a capacity check in case of scheduled callbacks. If no empty callback slot is available at the desired time, it returns with a list of alternative available time slots for the callback.

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

import { initiateBackendAuth } from ".";

// Run and await initiateBackendAuth function if this file is run directly
(async () => {
  try {
    const tokenResponse = await initiateBackendAuth();
    console.log('Token Response: ', tokenResponse);
  } catch (e) {
    console.error('Error: ', e);
  }
})();
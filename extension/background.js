/* global browser */

async function init() {
  try {
    const result = await browser.agentServer.start();
    if (result.success) {
      console.log("Agent server started on port", result.port);
    } else {
      console.error("Failed to start agent server:", result.error);
    }
  } catch (e) {
    console.error("Error starting agent server:", e);
  }
}

browser.runtime.onInstalled.addListener(init);
browser.runtime.onStartup.addListener(init);

// Also call init() directly — the event listeners above don't fire when
// a user disables and re-enables the extension.
init();

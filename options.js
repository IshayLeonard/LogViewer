// Saves options to chrome.storage
const saveOptions = () => {
  const visMode = document.getElementById("visMode").value;
  const wideView = document.getElementById("wideView").checked;

  chrome.storage.local.set({ visMode: visMode, wideView: wideView }, () => {
    // Update status to let user know options were saved.
    const status = document.getElementById("status");
    status.style.opacity = "1";
    setTimeout(() => {
      status.style.opacity = "0";
    }, 2000);
  });
};

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
const restoreOptions = () => {
  chrome.storage.local.get(
    { visMode: "tab", wideView: false }, // Default values
    (items) => {
      document.getElementById("visMode").value = items.visMode;
      document.getElementById("wideView").checked = items.wideView;
    },
  );
};

document.addEventListener("DOMContentLoaded", restoreOptions);
document.getElementById("save").addEventListener("click", saveOptions);

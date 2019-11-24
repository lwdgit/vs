let myIndex = 0;

/**
 * Performs JSONP request to a given url
 */
export default function jsonpFetch(url, cb = 'callback') {
  let isCancelled, actualResolve;
  let loadScript = null;
  const name = 'callback' + (myIndex++);
  window[name] = downloaded;
  let cancelable = new Promise(download);
  cancelable.cancel = cancel;


  return cancelable;

  function download(resolve, reject) {
    actualResolve = resolve;

    loadScript = document.createElement('script');
    loadScript.src = `${url}&${cb}=${name}`;
    loadScript.onerror = reject;
    document.head.appendChild(loadScript);
  }

  function cancel() {
    isCancelled = true;
  }

  function downloaded(e) {
    if (isCancelled) {
      dispose();
      return;
    }

    actualResolve(e);
    dispose();
  }

  function dispose() {
    if (loadScript) {
      document.head.removeChild(loadScript);
      loadScript = null;
    }
    delete window[name];
  }
}

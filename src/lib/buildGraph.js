import jsonpFetch from "./jsonpFetch";
import bus from '../bus';

export default function buildGraph(entryWord, pattern, MAX_DEPTH, progress) {
  entryWord = entryWord && entryWord.trim();
  if (!entryWord) return;

  entryWord = entryWord.toLocaleLowerCase();

  const insertPosition = pattern.indexOf('...');
  if (insertPosition < 0) {
    throw new Error('Query pattern is missing "..."');
  }
  const queryPosition = pattern.indexOf('[query]');
  if (queryPosition < 0) {
    throw new Error('Query pattern is missing "[query]" keyword');
  }

  if (insertPosition < queryPosition) {
    throw new Error('[query] should come before ...');
  }

  let cancelled = false;
  let pendingResponse;
  let graph = require('ngraph.graph')();
  graph.maxDepth = MAX_DEPTH;
  let queue = [];
  let requestDelay = 100 + Math.random() * 100;
  const delay = ms => new Promise(r => setTimeout(r, ms));

  progress.startDownload();

  startQueryConstruction();

  return {
    dispose,
    graph
  }

  function dispose() {
    cancelled = true;
    if (pendingResponse && pendingResponse.cancel) {
      pendingResponse.cancel();
      pendingResponse = null;
    }
  }

  async function startQueryConstruction() {
    graph.addNode(entryWord, {depth: 0});
    await fetchNext({keyword: entryWord, relation: '和'}, getResponseB);
    await fetchNext({keyword: entryWord, relation: ' vs '}, getResponse);

    while (!cancelled) {
      if (queue.length === 0) {
        bus.fire('graph-ready', graph);
        return;
      }

      let nextWord = queue.shift();
      await delay(requestDelay);
      await fetchNext({keyword: nextWord, relation: '和'}, getResponseB);
      await fetchNext({keyword: nextWord, relation: ' vs '}, getResponse);

      progress.updateLayout(queue.length, nextWord);
    }
  }

  function loadSiblings(parent, results) {
    let q = fullQuery(parent).toLocaleLowerCase();
    var parentNode = graph.getNode(parent.keyword);

    if (!parentNode) {
      throw new Error('Parent is missing for ' + parent.keyword);
    }

    results.filter(x => x.toLocaleLowerCase().indexOf(q) === 0)
      .map(x => x.substring(q.length))
      .forEach(other => {
        const hasOtherNode = graph.hasNode(other);
        const hasOtherLink = graph.getLink(other, parent.keyword) || graph.getLink(parent.keyword, other);
        if (hasOtherNode) {
          if (!hasOtherLink) {
            graph.addLink(parent.keyword, other);
          }
          return;
        }

        let depth = parentNode.data.depth + 1;
        graph.addNode(other, {depth});
        graph.addLink(parent.keyword, other);
        if (depth < MAX_DEPTH) queue.push(other);
      });

  }

  async function fetchNext(query, fetchApi) {
    pendingResponse = fetchApi(fullQuery(query));
    return pendingResponse.then(res => onPendingReady(res, query)).catch((msg) => {
      const err = 'Failed to download ' + query.keyword + '; Message: ' + msg;
      console.error(err);
      progress.downloadError(err)
    });
  }

  function onPendingReady(res, query) {
    if (res) {
      loadSiblings(query, res);
    } else {
      console.error(res);
      throw new Error('Unexpected response');
    }
  }

  function fullQuery(query) {
    // return pattern.replace('[query]', query).replace('...', '');
    return `${query.keyword}${query.relation}`;
  }

  function getResponse(query) {
    return jsonpFetch('//suggestqueries.google.com/complete/search?client=firefox&q=' + encodeURIComponent(query))
      .then((res) => res[1])
  }

  function getResponseB(query) {
    return jsonpFetch(`https://www.baidu.com/sugrec?ie=utf-8&json=1&prod=pc&wd=${encodeURIComponent(query)}`, 'cb')
      .then((res) => (res.g || []).map(i => i.q))
  }
}

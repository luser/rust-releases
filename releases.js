/*global toml, fetch*/

const CHANNELS = ['stable', 'beta', 'nightly'];

const domLoaded = new Promise(resolve => {
  function loaded() {
    window.removeEventListener('DOMContentLoaded', loaded);
    resolve();
  }
  window.addEventListener('DOMContentLoaded', loaded);
});

function loadUrlTOML(url) {
  console.log('Loading %s...', url);
  return fetch(url)
    .then(res => res.text())
    .then(toml.parse);
}

function parseRustDist(data) {
    /*
     The Rust dist TOML contains an entry for rustc like:

     [pkg.rustc]
     version = "1.29.2 (17a9dc751 2018-10-05)"
     git_commit_hash = "17a9dc7513b9fea883dc9505f09f97c63d1d601b"
     */
  let version = data.pkg.rustc.version;
  let matches = version.match(/([^ ]+) \([A-Fa-f0-9]+ (\d{4}-\d{2}-\d{2})\)/);
  if (matches == null) {
    throw `Bad rustc version: ${version}`;
  }
  let version_num = matches[1];
  let release_date = matches[2];
  return {
    version: version_num,
    release_date: release_date,
    git_commit_hash: data.pkg.rustc.git_commit_hash
  };
}

function fetchRustChannels() {
  var promises = [];
  for (let chan of CHANNELS) {
    var url = `https://static.rust-lang.org/dist/channel-rust-${chan}.toml`;
    promises.push(loadUrlTOML(url).then(parseRustDist).then(data => [chan, data]));
  }
  return Promise.all(promises).then(data => new Map(data));
}

function populateChannels(channels) {
  console.log(channels);
  for (let [chan, data] of channels) {
    let li = document.getElementById(chan);
    var channel_s = document.createElement("span");
    channel_s.textContent = `${chan}: ${data.version} (released ${data.release_date})`;
    li.appendChild(channel_s);
  }
}

Promise.all([domLoaded, fetchRustChannels()])
  .then(data => populateChannels(data[1]))
  .catch(console.error);

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

function fetchRustMilestones() {
  return fetch('https://api.github.com/repos/rust-lang/rust/milestones')
    .then(res => res.json())
    .then(data => {
      let milestones = new Map();
      for (let milestone of data) {
        if (milestone.title.match(/\d+\.\d+/)) {
          milestones.set(milestone.title + '.0', milestone.due_on.substr(0, 10));
        }
      }
      return milestones;
    });
}

function populateChannels(channels, milestones) {
  console.log(`populateChannels(${channels}, ${milestones})`);
  for (let [chan, data] of channels) {
    let version = data.version.split('-')[0];
    let li = document.getElementById(chan);
    let channel_s = document.createElement("span");
    let release = `released ${data.release_date}`;
    if (milestones.has(version)) {
      release = `expected release date ${milestones.get(version)}`;
    }
    channel_s.textContent = `${chan}: ${version} (${release})`;
    li.appendChild(channel_s);
  }
}

Promise.all([domLoaded, fetchRustChannels(), fetchRustMilestones()])
  .then(([_, channels, milestones]) => populateChannels(channels, milestones))
  .catch(console.error);

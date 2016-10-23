// Here is the starting point for your application code.
// All stuff below is just to show you how it works. You can delete all of it.

// // Use new ES6 modules syntax for everything.
// import os from 'os'; // native node.js module
// import { remote } from 'electron'; // native electron module
// import jetpack from 'fs-jetpack'; // module loaded from npm
// import { greet } from './hello_world/hello_world'; // code authored by you in this project
// import env from './env';



// console.log('Loaded environment variables:', env);

// var app = remote.app;
// var appDir = jetpack.cwd(app.getAppPath());

// // Holy crap! This is browser window with HTML and stuff, but I can read
// // here files like it is node.js! Welcome to Electron world :)
// console.log('The author if this app is:', appDir.read('package.json', 'json').author);

// document.addEventListener('DOMContentLoaded', function() {
//     document.getElementById('greet').innerHTML = greet();
//     document.getElementById('platform-info').innerHTML = os.platform();
//     document.getElementById('env-name').innerHTML = env.name;
// });

import fs from 'fs';
import path from 'path';
import ko from 'knockout';
import { ipcRenderer } from 'electron';
import folderZip from './common/folder-zip';
import soundDrop from './bindings/sound-drop';
import partOperations from './bindings/part-operations';
import work from './components/work';
import inspector from './components/inspector';
import soundPlayer from './components/sound-player';
import appViewModel from './app-view-model';
import utils from './utils';
import events from './events';
import file from './file';

window.ko = ko;

// Register all bindings:
[soundDrop, partOperations].forEach(binding => binding.register());

// Register all components:
[work, inspector, soundPlayer].forEach(component => component.register());

appViewModel.deselectAll = () => appViewModel.currentPart(undefined);

document.addEventListener('DOMContentLoaded', function() {
  ko.applyBindings(appViewModel, document.getElementsByTagName('html')[0]);
});

ipcRenderer.on(events.NEW_FILE, function () {
  file.create();
});

ipcRenderer.on(events.OPEN_FILE, function () {
  file.open();
});

ipcRenderer.on(events.SAVE_FILE, function () {
  file.save();
});

import ChatStore from './store'
import {SETTINGS_DEFAULT} from './const'

function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

function setStorage(file, chat) {

  var reader = new FileReader()
  reader.readAsText(file)
  reader.onloadend = (e) => {
    var data = JSON.parse(e.target.result)
    var newSettings = []

    for (var each of data) {
      newSettings.push([each[0], each[1]])
    }

    ChatStore.write('chat.settings', newSettings)

  }
}

function getStorage() {
  
}

export {
  setStorage
}
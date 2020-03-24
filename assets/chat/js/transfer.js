import ChatStore from './store'
import {MessageBuilder} from './messages'

function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:application/json;charset=utf-8,' + encodeURIComponent(text));
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

    MessageBuilder.broadcast('Settings imported! Reload chat to take effect.').into(chat)
  }
}

function getStorage() {
  var storage = ChatStore.readRAW('chat.settings')
  download('settings.json', storage)
}

export {
  setStorage,
  getStorage
}
const uuid = require('uuid');
const StateManager = require('./StateManager');
const FileManager = require('./FileManager');

module.exports = class Controller {
  constructor() {
    this.messages = [];
    this.updateMessageListeners = [];
  }

  addCreateMessageListener(callback) {
    this.updateMessageListeners.push(callback);
  }

  getMessages(quantity = undefined, lastMessageId = undefined) {
    let i = 0;
    let q = this.messages.length;

    if (lastMessageId !== undefined) {
      i = this.messages.findIndex((obj) => obj.id === lastMessageId);
      i += 1;
    }
    if (quantity !== undefined) {
      q = (i + Number(quantity) < q) ? i + Number(quantity) : q;
    }
    return this.messages.slice(i, q);
  }

  getNewMessagesByLastId(lastMessageId = undefined) {
    const i = this.messages.findIndex((obj) => obj.id === lastMessageId);
    return this.messages.slice(0, i);
  }

  getMessageById(id) {
    const message = this.messages.find((obj) => obj.id === id);
    return message;
  }

  async deleteMessage(id) {
    const i = this.messages.findIndex((obj) => obj.id === id);
    if (i === -1) return false;
    if (this.messages[i].type !== 'text') {
      const message = this.messages[i];
      await FileManager.deleteFile(message.file.URL);
    }
    this.messages.splice(i, 1);
    await StateManager.saveState(this.messages);
    if (this.messages.length > 0) {
      this.updateMessageListeners.forEach((o) => o.call(null), this.messages[0].id);
    } else {
      this.updateMessageListeners.forEach((o) => o.call(null), 0);
    }
    return true;
  }

  async createMessage(type, data, location) {
    const message = {
      id: uuid.v4(),
      date: Date.now(),
      type,
      location,
    };
    if (message.type === 'text') {
      message.text = data;
    } else {
      message.file = await FileManager.createFile(
        message.id,
        message.type,
        data,
      );
    }
    this.messages.unshift(message);

    await StateManager.saveState(this.messages);
    this.updateMessageListeners.forEach((o) => o.call(null, message.id));
  }

  async init() {
    this.messages = await StateManager.loadState();
  }
};

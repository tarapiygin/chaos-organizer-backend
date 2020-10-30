const fs = require('fs');

module.exports = class StateManager {
  static async saveState(state) {
    const data = JSON.stringify(state);
    return fs.promises.writeFile('./database.json', data);
  }

  static async loadState() {
    const file = await fs.promises.readFile('./database.json', 'utf8');
    if (file !== '') return JSON.parse(file);
    return [];
  }
};

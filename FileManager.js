const fs = require('fs');
const server = require('./server');

module.exports = class FileManager {
  static async createFile(id, type, fileData) {
    const { name } = fileData;
    const extension = name.slice(name.lastIndexOf('.'), name.length);
    const URL = `/${type}/${id + extension}`;
    const path = `${server.publicPath}${URL}`;
    const file = await fs.promises.readFile(fileData.path, 'binary');
    await fs.promises.writeFile(path, file, 'binary');
    return { name, URL };
  }

  static async deleteFile(URL) {
    const path = `${server.publicPath}${URL}`;
    await fs.promises.unlink(path);
  }
};

/* eslint-disable no-case-declarations */
const http = require('http');
const Koa = require('koa');
const koaBody = require('koa-body');
const koaCors = require('@koa/cors');
const Router = require('koa-router');
const serve = require('koa-static');
const { streamEvents } = require('http-event-stream');

const Controller = require('./Controller');

const publicPath = './public';
module.exports.publicPath = publicPath;

const app = new Koa();
const router = new Router();
const server = http.createServer(app.callback());

app.use(serve(publicPath));
app.use(koaCors());
app.use(koaBody({
  urlencoded: true,
  multipart: true,
  json: true,
  text: true,
}));

const controller = new Controller();
const init = controller.init();

router.get('/api/messages', async (ctx) => {
  await init;
  const { lastMessageId, quantity } = ctx.query;
  const messages = await controller.getMessages(quantity, lastMessageId);
  ctx.response.body = JSON.stringify({
    status: 'ok',
    messages,
  });
});

router.get('/api/sse', async (ctx) => {
  await init;
  const generateEvent = (lastMessageId) => {
    const messages = controller.getNewMessagesByLastId(lastMessageId);
    let id = lastMessageId;
    if (messages.length > 0) id = messages[0].id;
    return {
      id,
      event: 'update',
      data: JSON.stringify({ lastMessageId: id }),
    };
  };
  streamEvents(ctx.req, ctx.res, {
    async fetch(lastMessageId) {
      return generateEvent(lastMessageId);
    },
    stream(sse) {
      const linstener = (messageId) => {
        sse.sendEvent({
          id: messageId,
          event: 'update',
          data: JSON.stringify({ lastMessageId: messageId }),
        });
      };
      controller.addCreateMessageListener(linstener);
      return () => { };
    },
  });
  ctx.respond = false; // koa не будет обрабатывать ответ
});

router.post('/api/messages', async (ctx) => {
  await init;
  const { type } = ctx.query;
  let data;
  const location = JSON.parse(ctx.request.body.location);
  switch (type) {
    case 'text':
      data = ctx.request.body.text;
      break;
    case 'video':
      data = ctx.request.files.video;
      break;
    case 'audio':
      data = ctx.request.files.audio;
      break;
    case 'file':
      data = ctx.request.files.file;
      break;
    default:
      data = null;
  }
  if (data !== null) {
    try {
      await controller.createMessage(type, data, location);
      ctx.response.status = 201;
      ctx.response.body = JSON.stringify({
        status: 'сreated',
      });
    } catch (error) {
      ctx.response.body = JSON.stringify({
        status: 'bad request',
        error: { name: 'Error adding message', message: error.message },
      });
      ctx.response.status = 400;
    }
    return;
  }
  ctx.response.body = JSON.stringify({
    status: 'bad request',
    error: { name: 'Error adding message', message: 'wrong message type passed' },
  });
  ctx.response.status = 400;
});

router.get('/api/messages/:id', async (ctx) => {
  await init;
  const message = await controller.getMessageById(ctx.params.id);
  if (message === undefined) {
    ctx.response.body = JSON.stringify(
      {
        status: 'not found',
        error: { name: 'Error receiving message', message: 'wrong message id' },
      },
    );
    ctx.response.status = 404;
    return;
  }
  ctx.response.body = JSON.stringify({
    status: 'ok',
    message,
  });
});

router.delete('/api/messages/:id', async (ctx) => {
  await init;
  const result = await controller.deleteMessage(ctx.params.id);
  if (!result) {
    ctx.response.body = JSON.stringify(
      {
        status: 'not found',
        error: { name: 'Error deleting message', message: 'wrong message id' },
      },
    );
    ctx.response.status = 404;
    return;
  }
  ctx.response.status = 204;
});

app.use(router.routes()).use(router.allowedMethods());
const port = process.env.PORT || 7070;
server.listen(port);

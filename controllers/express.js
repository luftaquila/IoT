import express from 'express'

const app = express();
app.use((req, res, next) => {
  req.originalPath = req.baseUrl + req.path;
  req.remoteIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  next();
});

app.listen(3155, () => {

});

export default app

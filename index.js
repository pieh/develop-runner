const express = require(`express`);

const app = express();
const { getLogs } = require(`./logs`);
const { report, run } = require(`./run`);

const port = process.env.PORT || 3000;

app.get(`/logs`, (req, res) => {
  res.send(getLogs());
});

app.get(`/`, (req, res) => {
  res.send(report);
});

app.get(`/run`, (req, res) => {
  res.send("running");

  run();
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

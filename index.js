const express = require(`express`);

const app = express();
const { getLogs } = require(`./logs`);
const { report, run, queue } = require(`./run`);

const port = process.env.PORT || 3000;

app.get(`/logs`, (req, res) => {
  res.send(getLogs());
});

let queued = new Set();
let running = new Set();
let finished = new Set();

const tasks = {};

queue.on(`task_queued`, (taskID, task) => {
  tasks[taskID] = task;
  queued.add(task.repo);
});

queue.on(`task_started`, (taskID, task) => {
  queued.delete(task.repo);
  running.add(task.repo);
});
queue.on(`task_finish`, taskID => {
  const task = tasks[taskID];
  running.delete(task.repo);
  finished.add(task.repo);
});

const getReport = () => {
  return {
    queue: {
      paused: queue._stopped,
      queued: [...queued],
      running: [...running],
      finished: [...finished],
      stats: queue.getStats()
    },
    report
  };
};

app.get(`/`, (req, res) => {
  res.send(getReport());
});

app.get(`/run`, (req, res) => {
  run();
  res.send(getReport());
});

app.get(`/pause`, (req, res) => {
  queue.pause();
  res.send(getReport());
});

app.get(`/resume`, (req, res) => {
  queue.resume();
  res.send(getReport());
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

const Queue = require("better-queue");
const path = require(`path`);

const { log } = require(`./logs`);
const { pExec } = require(`./utils`);
const fs = require(`fs-extra`);
const childProcess = require("child_process");

const sites = require(`./sites.json`).slice(0, 10);

const report = {};

exports.report = report;

const q = new Queue(
  async (task, cb) => {
    console.log({ task, cb });
    try {
      await runSite(task.repo);
      console.log("finished", task);
      report[task.repo] = {
        status: `OK`
      };
      cb(null);
    } catch (e) {
      console.log("error", e);
      report[task.repo] = {
        status: `ERROR`,
        error: e
      };
      cb(e);
    }
  },
  { concurrent: 1 }
);

q.on("drain", function() {
  log("all items have been processed");
});

exports.run = async () => {
  sites.forEach(element => {
    q.push({
      repo: element
    });
  });
};

const runSite = async repo => {
  const execArgs = {
    stdio: `inherit`,
    cwd: path.join(process.cwd(), `sites`)
  };

  const repoCloneDir = Buffer.from(repo)
    .toString(`base64`)
    .replace(/=/g, `_`);

  const cloneCmd = `git clone --single-branch ${repo} ${repoCloneDir}`;

  await pExec(cloneCmd, execArgs);

  execArgs.cwd = path.join(process.cwd(), `sites`, repoCloneDir);

  // check if it builds first
  await pExec(`yarn`, execArgs);

  await pExec(`yarn gatsby build`, execArgs);

  await pExec(`git clean -xfd`, execArgs);

  // if it builds

  await pExec(`yarn add gatsby@v8-serialize`, execArgs);

  await pExec(`yarn gatsby build`, execArgs);

  // check if it rebuilds
  // console.log(execArgs);
  await pExec(`yarn gatsby build`, execArgs);

  // const proc = childProcess.spawn(`yarn`, [`gatsby`, `develop`, `-p`, `8100`], {
  //   cwd: execArgs.cwd
  // });

  // proc.stdout.on(`data`, data => {
  //   log(data.toString());
  // });

  // proc.stderr.on(`data`, data => {
  //   log(data.toString());
  // });

  // proc.on(`close`, code => {

  // })

  // await pExec(`yarn gatsby develop -p 8100`, execArgs);
};

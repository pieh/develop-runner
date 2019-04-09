const Queue = require("better-queue");
const path = require(`path`);

const { log } = require(`./logs`);
const { pExec } = require(`./utils`);
const fs = require(`fs-extra`);
const childProcess = require("child_process");

const sites = require(`./sites.json`).slice(0, 3);

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
        errorMessage: e.toString(),
        error: e,
        stack: e.stack
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

  // try {
  await pExec(cloneCmd, execArgs, `Cloning`);
  // } catch (e) {
  //   e.step = `Cloning`;
  //   throw e;
  // }

  execArgs.cwd = path.join(process.cwd(), `sites`, repoCloneDir);

  // check if it builds first
  await pExec(`yarn`, execArgs, `Installing base deps`);

  await pExec(`yarn gatsby build`, execArgs, `Baseline build`);

  await pExec(`git clean -xfd`, execArgs, `Cleaning`);

  // if it builds

  await pExec(
    `yarn add gatsby@v8-serialize`,
    execArgs,
    `Installing v8-serialize`
  );

  await pExec(`yarn gatsby build`, execArgs, `First v8.serialize build`);

  // check if it rebuilds
  // console.log(execArgs);
  await pExec(`yarn gatsby build`, execArgs, `Second v8.serialize build`);

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

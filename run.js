const Queue = require("better-queue");
const path = require(`path`);

const { log } = require(`./logs`);
const { pExec } = require(`./utils`);
const fs = require(`fs-extra`);
const childProcess = require("child_process");

const sites = require(`./sites`);

const report = {};

exports.report = report;

const getDirNameForRepo = repo => {
  const repoCloneDir = Buffer.from(repo)
    .toString(`base64`)
    .replace(/=/g, `_`);

  return repoCloneDir;
};

const getAbsPathForRepo = repo => {
  const repoAbsPath = path.join(
    process.cwd(),
    `sites`,
    getDirNameForRepo(repo)
  );
  return repoAbsPath;
};

const q = new Queue(
  async (task, cb) => {
    console.log({ task, cb });

    const absPath = getAbsPathForRepo(task.repo);
    const statusPath = path.join(path.join(absPath, `_status`));

    if (await fs.exists(statusPath)) {
      const status = await fs.readJSON(statusPath);
      report[task.repo] = status;
      cb(null);
      return;
    }

    try {
      report[task.repo] = {
        status: `STARTED`
      };
      await runSite(task);
      console.log("finished", task);
      report[task.repo] = {
        status: `OK`
      };

      try {
        await fs.outputFile(statusPath, JSON.stringify(report[task.repo]));
      } catch (e) {}

      cb(null);
    } catch (e) {
      console.log("error", e);
      report[task.repo] = {
        status: `ERROR`,
        errorMessage: e.toString(),
        error: e,
        stack: e.stack
      };
      try {
        await fs.outputFile(statusPath, JSON.stringify(report[task.repo]));
      } catch (e) {}
      cb(null);
    }
  },
  { concurrent: 1 }
);

exports.queue = q;

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

const runSite = async task => {
  const repo = task.repo;
  const execArgs = {
    stdio: `inherit`,
    cwd: path.join(process.cwd(), `sites`)
  };

  const repoCloneDir = getDirNameForRepo(repo);
  const repoAbsPath = getAbsPathForRepo(repo);

  const updateProcess = step => {
    report[repo] = { ...report[repo], status: step };
    return step;
  };

  const measureTime = async (label, cb) => {
    const start = new Date();
    await cb();
    const timeSpan = new Date() - start;
    // time in seconds
    report[repo][label] = timeSpan / 1000;
  };

  if (!fs.existsSync(repoAbsPath)) {
    const cloneCmd = `git clone --depth=1 ${repo} ${repoCloneDir}`;

    await pExec(cloneCmd, execArgs, updateProcess(`Cloning repo`));
    execArgs.cwd = repoAbsPath;
  } else {
    execArgs.cwd = repoAbsPath;

    await pExec(
      `git reset --hard HEAD`,
      execArgs,
      updateProcess(`Resetting repo`)
    );
    await pExec(
      `git clean -xfd`,
      execArgs,
      updateProcess(`Cleaning after reset (git clean -xfd)`)
    );
  }

  await pExec(`yarn`, execArgs, updateProcess(`Installing base deps`));

  await measureTime(`Baseline build`, () =>
    pExec(`yarn gatsby build`, execArgs, updateProcess(`Baseline build`))
  );

  await pExec(
    `git clean -xfd`,
    execArgs,
    updateProcess(`Cleaning after baseline (git clean -xfd)`)
  );

  await pExec(
    `rm -rf .cache public`,
    execArgs,
    updateProcess(`Cleaning after baseline (rm -rf .cache public)`)
  );

  // if it builds with v8-serialize

  await measureTime(`Build from canary`, () =>
    pExec(
      `yarn add gatsby@v8-serialize`,
      execArgs,
      updateProcess(`Installing v8-serialize`)
    )
  );

  await measureTime(`Re-Build from canary`, () =>
    pExec(
      `yarn gatsby build`,
      execArgs,
      updateProcess(`First v8.serialize build`)
    )
  );

  // check if it rebuilds
  await pExec(
    `yarn gatsby build`,
    execArgs,
    updateProcess(`Second v8.serialize build`)
  );
};

const Queue = require(`better-queue`)
const Worker = require(`better-queue/lib/worker`)
const path = require(`path`)

const { pExec } = require(`./utils`)
const fs = require(`fs-extra`)
// const childProcess = require(`child_process`)
const { RUN_PROGRESS, REPOSITORY_STATUS } = require(`./state`)

const getDirNameForRepo = repo => {
  const repoCloneDir = Buffer.from(repo)
    .toString(`base64`)
    .replace(/=/g, `_`)

  return repoCloneDir
}

const getAbsPathForRepo = repo => {
  const repoAbsPath = path.join(process.cwd(), `sites`, getDirNameForRepo(repo))
  return repoAbsPath
}

async function runQueue(task, cb) {
  console.log(`started ${task.repo}`)

  const absPath = getAbsPathForRepo(task.repo)
  const statusPath = path.join(path.join(absPath, `_status`))

  if (await fs.exists(statusPath)) {
    const status = await fs.readJSON(statusPath)
    this.finishBatch(status)
    return
  }

  try {
    await runSite(this, this.options, task.repo)
    console.log(`finished`, task)
    const status = {
      status: REPOSITORY_STATUS.SUCCESS,
    }

    try {
      await fs.outputFile(statusPath, JSON.stringify(status))
    } catch (e) {}
    this.finishBatch(status)
  } catch (e) {
    console.log(`error`, e)
    const status = {
      status: REPOSITORY_STATUS.ERROR,
      errorMessage: e.toString(),
      error: e,
      stack: e.stack,
    }
    try {
      await fs.outputFile(statusPath, JSON.stringify(status))
    } catch (e) {}
    this.failedBatch(status)
  }
}

const runSite = async (runner, options, repo) => {
  runner.progressBatch(0, 1, RUN_PROGRESS.CHECKOUT)

  const execArgs = {
    stdio: `inherit`,
    cwd: path.join(process.cwd(), `sites`),
  }

  const repoCloneDir = getDirNameForRepo(repo)
  const repoAbsPath = getAbsPathForRepo(repo)

  if (!fs.existsSync(repoAbsPath)) {
    const cloneCmd = `git clone --depth=1 ${repo} ${repoCloneDir}`

    await pExec(cloneCmd, execArgs, `Cloning repo`)
    execArgs.cwd = repoAbsPath
  } else {
    execArgs.cwd = repoAbsPath

    await pExec(`git reset --hard HEAD`, execArgs, `Resetting repo`)
    await pExec(
      `git clean -xfd`,
      execArgs,
      `Cleaning after reset (git clean -xfd)`
    )
  }

  runner.progressBatch(0, 1, RUN_PROGRESS.YARN_LATEST)
  await pExec(`yarn`, execArgs, `Installing base deps`)

  runner.progressBatch(0, 1, RUN_PROGRESS.BUILD_LATEST)
  await pExec(`yarn gatsby build`, execArgs, `Baseline build`)

  await pExec(
    `git clean -xfd`,
    execArgs,
    `Cleaning after baseline (git clean -xfd)`
  )

  await pExec(
    `rm -rf .cache public`,
    execArgs,
    `Cleaning after baseline (rm -rf .cache public)`
  )

  runner.progressBatch(0, 1, RUN_PROGRESS.YARN_TAG)

  await pExec(
    `yarn add gatsby@${runner.options.tag}`,
    execArgs,
    `Installing tag`
  )

  runner.progressBatch(0, 1, RUN_PROGRESS.BUILD_TAG)

  await pExec(`yarn gatsby build`, execArgs, `First tag build`)

  runner.progressBatch(0, 1, RUN_PROGRESS.BUILD_TAG_AGAIN)

  // check if it rebuilds
  await pExec(`yarn gatsby build`, execArgs, `Second tag build`)
}

module.exports = options =>
  new Queue(runQueue, { id: `repo`, options, concurrent: 1 })

// Hack better queue to make progress work
Worker.prototype.progressTask = function(id, complete, total, msg) {
  var self = this
  if (!self.active) return
  if (self._waiting[id]) {
    self.progress.tasks[id].complete = complete
    self.progress.tasks[id].total = self.progress.tasks[id].total || total
    self.progress.tasks[id].message = msg || ``
    self.progress.tasks[id].pct = Math.max(0, Math.min(1, complete / total))
    self.emit(`task_progress`, id, self.progress.tasks[id])
  }
}

const REPOSITORY_STATUS = {
  NOT_STARTED: `NOT_STARTED`,
  QUEUED: `QUEUED`,
  RUNNING: `RUNNING`,
  ERROR: `ERROR`,
  SUCCESS: `SUCCESS`,
}

const RUN_PROGRESS = {
  CHECKOUT: `CHECKOUT`,
  YARN_LATEST: `YARN_LATEST`,
  BUILD_LATEST: `BUILD_LATEST`,
  YARN_TAG: `YARN_TAG`,
  BUILD_TAG: `BUILD_TAG`,
  BUILD_TAG_AGAIN: `BUILD_TAG_AGAIN`,
}

class Run {
  constructor(repositories) {
    this.repositories = {}
    repositories.forEach(repository => {
      this.repositories[repository] = {
        repo: repository,
        status: REPOSITORY_STATUS.NOT_STARTED,
      }
    })
  }

  getByStatus(byStatus) {
    return Object.values(this.repositories).filter(
      ({ status }) => status === byStatus
    )
  }

  getNotStarted() {
    return this.getByStatus(REPOSITORY_STATUS.NOT_STARTED)
  }

  getQueued() {
    return this.getByStatus(REPOSITORY_STATUS.QUEUED)
  }

  getRunning() {
    return this.getByStatus(REPOSITORY_STATUS.RUNNING)
  }

  getError() {
    return this.getByStatus(REPOSITORY_STATUS.ERROR)
  }

  getSuccesful() {
    return this.getByStatus(REPOSITORY_STATUS.SUCCESS)
  }

  getStats() {
    const successful = this.getSuccesful().length
    const error = this.getError().length
    const total = successful + error
    return {
      total: total,
      successRate: successful / total,
    }
  }

  process(runner) {
    runner.pause()
    runner.on(`task_queued`, repo => {
      this.repositories[repo].status = REPOSITORY_STATUS.QUEUED
    })
    runner.on(`task_started`, repo => {
      this.repositories[repo].status = REPOSITORY_STATUS.RUNNING
    })
    runner.on(`task_failed`, (repo, result) => {
      this.repositories[repo] = {
        ...(this.repositories[repo] || {}),
        repo,
        ...result,
      }
    })
    runner.on(`task_progress`, (repo, progress) => {
      console.log(repo, progress)
      this.repositories[repo].runStage = progress.message
    })
    runner.on(`task_finish`, (repo, result) => {
      this.repositories[repo] = {
        ...(this.repositories[repo] || {}),
        repo,
        ...result,
      }
    })
    this.getNotStarted().forEach(repo => runner.push(repo))
  }
}

module.exports = {
  Run,
  REPOSITORY_STATUS,
  RUN_PROGRESS,
}

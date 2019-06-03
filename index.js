const express = require(`express`)
const fs = require(`fs-extra`)
const path = require(`path`)
const { ApolloServer, gql } = require(`apollo-server-express`)
// const { getLogs } = require(`./logs`)
const buildLocalRunner = require(`./local-runner`)
const { Run, REPOSITORY_STATUS, RUN_PROGRESS } = require(`./state`)
const DEFAULT_SITES = require(`./sites`)

const app = express()

const port = process.env.PORT || 3000

const typeDefs = gql`
  type Queue {
    paused: Boolean!
    queued: [String!]!
    running: [String!]!
    finished: [String!]!
    stats: Stats!
  }

  type Stats {
    total: Int!
    successRate: Float!
  }

  interface ReportBase {
    repo: String!
  }

  enum BuildStage {
    CHECKOUT
    YARN_LATEST
    BUILD_LATEST
    YARN_TAG
    BUILD_TAG
    BUIUD_TAG_AGAIN
  }

  type ReportNotStarted implements ReportBase {
    repo: String!
  }

  type ReportRunning implements ReportBase {
    repo: String!
    runStage: BuildStage
  }

  type ReportOk implements ReportBase {
    repo: String!
  }

  type ReportError implements ReportBase {
    repo: String!
    runStage: BuildStage
    errorMessage: String
    stack: String
  }

  union Report = ReportNotStarted | ReportRunning | ReportOk | ReportError

  type FullReport {
    notStarted: [Report!]!
    queued: [Report!]!
    failed: [Report!]!
    running: [Report!]!
    finished: [Report!]!
  }

  type Query {
    report: FullReport!
  }

  type OperationResult {
    ok: Boolean!
  }

  type Mutation {
    run: OperationResult!
    pause: OperationResult!
    resume: OperationResult!
    clear: OperationResult!
  }
`

const resolvers = {
  Query: {
    report: () => {
      return {}
    },
  },
  FullReport: {
    notStarted: (parent, args, context) => context.state.getNotStarted(),
    queued: (parent, args, context) => context.state.getQueued(),
    failed: (parent, args, context) => context.state.getError(),
    running: (parent, args, context) => context.state.getRunning(),
    finished: (parent, args, context) => context.state.getSuccesful(),
  },
  Mutation: {
    run: (parent, args, context) => {
      context.state.process(context.runner)
      context.runner.resume()
      return { ok: true }
    },
    pause: (parent, args, context) => {
      context.state.runner.pause()
      return { ok: true }
    },
    resume: (parent, args, context) => {
      context.state.runner.resume()
      return { ok: true }
    },
  },
  ReportBase: {
    __resolveType(report) {
      switch (report.status) {
        case REPOSITORY_STATUS.NOT_STARTED:
        case REPOSITORY_STATUS.QUEUED:
          return `ReportNotStarted`
        case REPOSITORY_STATUS.RUNNING:
          return `ReportRunning`
        case REPOSITORY_STATUS.ERROR:
          return `ReportError`
        case REPOSITORY_STATUS.OK:
          return `ReportOk`
      }
      return null
    },
  },
  Report: {
    __resolveType(report) {
      switch (report.status) {
        case REPOSITORY_STATUS.NOT_STARTED:
        case REPOSITORY_STATUS.QUEUED:
          return `ReportNotStarted`
        case REPOSITORY_STATUS.RUNNING:
          return `ReportRunning`
        case REPOSITORY_STATUS.ERROR:
          return `ReportError`
        case REPOSITORY_STATUS.OK:
          return `ReportOk`
      }
      return null
    },
  },
}

const state = new Run(DEFAULT_SITES)
const runner = buildLocalRunner({ tag: `schema-customization` })

const DEFAULT_QUERY = `
query Report {
  report {
    notStarted {
      ...Report
    }
    queued {
      ...Report
    }
    failed {
      ...Report
    }
    running {
      ...Report
    }
  }
}

fragment Report on ReportBase {
  __typename
  ... on ReportBase {
    repo
  }
  ... on ReportError {
    runStage
    errorMessage
    stack
  }
  ... on ReportRunning {
    runStage
  }
}

mutation Run {
  run {
    ok
  }
}

mutation Purge {
  clear {
    ok
  }
}
`

const apolloServer = new ApolloServer({
  typeDefs,
  resolvers,
  context: {
    state,
    runner,
  },
  playground: {
    query: DEFAULT_QUERY,
  },
})
apolloServer.applyMiddleware({ app, path: `/graphql` })

app.get(`/`, (req, res) => {
  res.send(``)
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))

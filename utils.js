const childProcess = require(`child_process`)

const sanitzeOutput = out => {
  if (process.env.GITHUB_ACCESS_TOKEN) {
    out = out.replace(
      new RegExp(process.env.GITHUB_ACCESS_TOKEN, `g`),
      `<GITHUB_ACCESS_TOKEN>`
    )
  }

  return out
}

exports.pExec = (command, execArgs = {}, step) =>
  new Promise((resolve, reject) => {
    console.log(sanitzeOutput(`$ ${command}`))

    childProcess.exec(command, execArgs, (err, stdout, stderr) => {
      if (stderr) {
        console.log(` - ERR START`)
        console.log(sanitzeOutput(stderr))
        console.log(` - ERR END`)
      }
      console.log(sanitzeOutput(stdout))

      if (err) {
        err.step = step
        reject(err)
      }

      resolve({
        stderr,
        stdout,
      })
    })
  })

const childProcess = require("child_process");

const { log } = require(`./logs`);

const sanitzeOutput = out => {
  if (process.env.GITHUB_ACCESS_TOKEN) {
    out = out.replace(
      new RegExp(process.env.GITHUB_ACCESS_TOKEN, "g"),
      "<GITHUB_ACCESS_TOKEN>"
    );
  }

  return out;
};

exports.pExec = (command, execArgs = {}, step) =>
  new Promise((resolve, reject) => {
    log(sanitzeOutput(`$ ${command}`));

    childProcess.exec(command, execArgs, (err, stdout, stderr) => {
      if (stderr) {
        log(` - ERR START`);
        log(sanitzeOutput(stderr));
        log(` - ERR END`);
      }
      log(sanitzeOutput(stdout));

      if (err) {
        // err.stderr = sanitzeOutput(stderr);
        // err.stdout = sanitzeOutput(stdout);
        err.step = step;
        reject(err);
      }

      resolve({
        stderr,
        stdout
      });
    });
  });

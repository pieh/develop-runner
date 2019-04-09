const childProcess = require("child_process");

const { log } = require(`./logs`);

const sanitzeOutput = out => {
  return out.replace(
    new RegExp(
      process.env.GITHUB_ACCESS_TOKEN ||
        `ffwa fanwfaowfnioawna ofoawfjioawfjoaifa`,
      "g"
    ),
    "<GITHUB_ACCESS_TOKEN>"
  );
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
        e.step = step;
        reject(err);
      }

      resolve({
        stderr,
        stdout
      });
    });
  });

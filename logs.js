const logs = [];

exports.log = (...args) => {
  console.log(...args);

  logs.push(args);
};

exports.getLogs = () => logs;

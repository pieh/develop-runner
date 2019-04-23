const fs = require(`fs-extra`);
const path = require(`path`);

const sites = fs
  .readdirSync(path.join(process.cwd(), `sites`))
  .filter(a => a !== `.gitkeep`);

sites.forEach(site => {
  const projectName = Buffer.from(site.replace(/_/g, `=`), `base64`).toString(
    `utf-8`
  );

  console.log(`${projectName} - ${path.join(process.cwd(), `sites`, site)}`);
});

// vue.config.js
const webpack = require('webpack');

function getVersion() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  // For the build number, you can use a CI/CD environment variable.
  // For example, in GitHub Actions, you can use `process.env.GITHUB_RUN_NUMBER`.
  // We'll default to a timestamp for local builds to ensure it's unique.
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const localBuildNumber = `${hours}${minutes}${seconds}`;
  
  const build = process.env.BUILD_NUMBER || localBuildNumber;
  
  return `${year}.${month}.${day}.${build}`;
}

module.exports = {
  configureWebpack: {
    plugins: [
      new webpack.DefinePlugin({
        'process.env.VUE_APP_VERSION': JSON.stringify(getVersion())
      })
    ]
  }
};
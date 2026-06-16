const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  target: ['web', 'es5'],
  entry: path.resolve(__dirname, '../Raw/app.js'),
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, '../Bundled'),
    clean: true, // wipe ../Bundled before each build so stale/removed files don't linger
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              [
                '@babel/preset-env',
                {
                  targets: {
                    ie: '11',
                  },
                },
              ],
            ],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.js'],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: path.resolve(__dirname, '../Raw/index.html'), to: 'index.html' },
        { from: path.resolve(__dirname, '../Raw/assets'), to: 'assets' },
        { from: path.resolve(__dirname, '../Raw/vendor'), to: 'vendor' },
        { 
            from: path.resolve(__dirname, '../Raw'), 
            to: 'Raw',
            globOptions: {
                ignore: ["**/*.js", "**/index.html", "**/assets/**", "**/vendor/**"]
            }
        }
      ],
    }),
  ],
};

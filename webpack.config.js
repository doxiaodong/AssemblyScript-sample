const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const ENV = process.env.NODE_ENV;

module.exports = {
  mode: ENV,
  entry: {
    main: './pages/home/index.ts',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
    alias: {
      '@assembly': path.resolve(__dirname, './@assembly/index.ts'),
    },
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: path.resolve(__dirname, './loader/index.js'),
        include: /@assembly/,
        options: {
          limit: 1,
          name: `static/[name].[hash:8].wasm`,
        },
      },
      {
        test: /\.tsx?$/,
        exclude: /@assembly/,
        use: 'ts-loader',
      },
    ],
  },

  plugins: [
    ...(ENV === 'development'
      ? [new webpack.HotModuleReplacementPlugin()]
      : []),
    new HtmlWebpackPlugin({
      template: 'pages/index.html',
      minify: ENV === 'production' && {
        minifyCSS: true,
        minifyJS: true,
        collapseWhitespace: true,
        removeComments: true,
      },
    }),
  ],
  devServer: {
    hot: true,
    port: 3000,
    host: '0.0.0.0',
    historyApiFallback: true,
    watchOptions: {
      aggregateTimeout: 300,
      poll: 1000,
    },
  },
};

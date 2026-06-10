const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  mode: isProduction ? 'production' : 'development',
  entry: './src/index.js',
  plugins: [
    new HtmlWebpackPlugin({
      title: 'pixiSnake',
      template: path.resolve(__dirname, 'src', 'index.html'),
    }),
    new CopyPlugin({
      patterns: [
        { from: 'public/assets', to: 'assets' },
        { from: 'public/sounds', to: 'sounds' },
      ],
    }),
  ],
  // в прод-выдачу source map не попадает (1.5MB лишнего веса на хостинге)
  devtool: isProduction ? false : 'inline-source-map',
  devServer: {
    static: './dist',
  },
  output: {
    // contenthash инвалидирует кэш браузера/CDN при каждом изменении кода
    filename: isProduction ? '[name].[contenthash:8].js' : 'main.js',
    path: path.resolve(__dirname, 'dist'),
    publicPath: isProduction ? './' : '',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
      },
    ],
  },
};

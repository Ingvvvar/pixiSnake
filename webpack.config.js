const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

const isProduction = process.env.NODE_ENV === 'production';

module.exports = {
  mode: isProduction ? 'production' : 'development',
  // две страницы: одиночная игра (index) и мультиплеер (multiplayer).
  // Общий код (pixi.js, howler, общие модули src) выносится в отдельные чанки
  // через splitChunks ниже, поэтому в двух бандлах он не дублируется.
  entry: {
    index: './src/index.js',
    multiplayer: './src/multiplayer.js',
  },
  plugins: [
    new HtmlWebpackPlugin({
      title: 'pixiSnake',
      template: path.resolve(__dirname, 'src', 'index.html'),
      filename: 'index.html',
      chunks: ['index'],
    }),
    new HtmlWebpackPlugin({
      title: 'pixiSnake — Multiplayer',
      template: path.resolve(__dirname, 'src', 'multiplayer.html'),
      filename: 'multiplayer.html',
      chunks: ['multiplayer'],
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
    // HMR-сокет самого дев-сервера по умолчанию висит на /ws и конфликтует с
    // игровым /ws — уводим его на /__hmr. Путь намеренно не начинается с /ws:
    // контекст прокси '/ws' матчится по префиксу и перехватил бы и /ws-dev
    // (в проде /ws проксирует nginx, дев-сервера здесь нет)
    webSocketServer: { type: 'ws', options: { path: '/__hmr' } },
    client: { webSocketURL: { pathname: '/__hmr' } },
    proxy: {
      // фронт ходит на относительные /api/..., в деве их обслуживает server/ на 3000
      '/api': 'http://127.0.0.1:3000',
      // мультиплеер ходит на относительный /ws — проксируем на отдельный сервис
      '/ws': { target: 'http://127.0.0.1:3020', ws: true },
    },
  },
  // общий код (vendor + разделяемые модули) — в отдельные чанки, чтобы обе
  // страницы тянули его одним файлом, а не вшивали в каждый бандл
  optimization: {
    splitChunks: { chunks: 'all' },
  },
  output: {
    // contenthash инвалидирует кэш браузера/CDN при каждом изменении кода
    filename: isProduction ? '[name].[contenthash:8].js' : '[name].js',
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

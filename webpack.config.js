require('dotenv').config();

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');
const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HTMLWebpackPlugin = require('html-webpack-plugin');

const plugins = [
    new CopyWebpackPlugin([
            { from: 'robots.txt' }
    ]),
    new CleanWebpackPlugin(
        ['static'],
        {
            root: __dirname,
            verbose: false,
            exclude: ['cache', 'index.htm']
        }
    ),
    new HTMLWebpackPlugin({
        filename: 'index.html',
        template: 'assets/index.html',
        favicon: './assets/chat/img/favicon.ico',
        chunks: ['chat']
    }),
    new HTMLWebpackPlugin({
        filename: 'chatstreamed.html',
        template: 'assets/chatstreamed.html',
        favicon: './assets/chat/img/favicon.ico',
        chunks: ['chatstreamed']
    }),
    new HTMLWebpackPlugin({
        filename: 'notification-request.html',
        template: 'assets/notification-request/notification-request.html',
        favicon: './assets/chat/img/favicon.ico',
        chunks: ['notification-request']
    }),
    new MiniCssExtractPlugin({ filename: '[name].[contentHash].css' }),
    new webpack.DefinePlugin({
        WEBSOCKET_URI: process.env.WEBSOCKET_URI ? `'${process.env.WEBSOCKET_URI}'` : '"wss://chat.strims.gg/ws"',
        API_URI: process.env.API_URI ? `'${process.env.API_URI}'` : '""',
        LOGIN_URI: process.env.LOGIN_URI ? `'${process.env.LOGIN_URI}'` : 'false'
    })
];

const entry = {
    'chat': [
        'core-js/es6',
        'jquery',
        'normalize.css',
        'font-awesome/scss/font-awesome.scss',
        './assets/chat/js/notification',
        './assets/chat/css/style.scss',
        './assets/chat.js'
    ],
    'chatstreamed': [
        'core-js/es6',
        'jquery',
        'normalize.css',
        'font-awesome/scss/font-awesome.scss',
        './assets/chat/js/notification',
        './assets/chat/css/style.scss',
        './assets/chat/css/onstream.scss',
        './assets/streamchat.js'
    ],
    'notification-request': [
        './assets/notification-request/style.scss',
        './assets/notification-request/persona.png',
        './assets/notification-request/settings-guide.png',
        './assets/notification-request/script.js'
    ]
};

if (process.env.NODE_ENV !== 'production') {
    console.log('\n!!!!!!!!!!!! DEVELOPMENT BUILD !!!!!!!!!!!!\n');

    plugins.push(
        new CopyWebpackPlugin([
            { from: 'assets/dev/chat-embedded.html', to: 'dev/' }
        ]),
        new HTMLWebpackPlugin({
            filename: 'dev/dev-chat.html',
            template: 'assets/index.html',
            chunks: ['dev-chat']
        })
    );

    entry['dev-chat'] = [
        'core-js/es6',
        'jquery',
        'normalize.css',
        'font-awesome/scss/font-awesome.scss',
        './assets/chat/css/style.scss',
        './assets/dev/dev-chat/dev-chat.js'
    ];
} else {
    console.log('\n########## PRODUCTION BUILD #############\n');
}

module.exports = {
    devServer: {
        contentBase: path.join(__dirname, 'static'),
        compress: true,
        port: 8282,
        https: process.env.WEBPACK_DEVSERVER_HTTPS === 'true',
        host: process.env.WEBPACK_DEVSERVER_HOST
    },
    entry: entry,
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    output: {
        path: path.resolve(__dirname, 'static'),
        hashDigestLength: 6,
        filename: '[name].[contentHash].js'
    },
    plugins: plugins,
    watchOptions: {
        ignored: /node_modules/
    },
    module: {
        rules: [
            {
                test: /\.html$/,
                loader: 'html-loader?attrs=img:src'
            },
            {
                test: /\.(ts|tsx)$/,
                use: [
                    'babel-loader',
                    'ts-loader'
                ]
            },
            {
                test: /\.js$/,
                exclude: /(node_modules\/(?!(timestring)\/).*)/,
                loader: 'babel-loader'
            },
            {
                test: /\.(scss|css)$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                    'postcss-loader',
                    'sass-loader'
                ]
            },
            {
                test: /\.(eot|svg|ttf|woff2?)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                loader: 'file-loader',
                options: { name: 'fonts/[name].[md5:hash:base64:6].[ext]' }
            },
            {
                test: /\.(png|jpg|gif|svg)$/,
                exclude: path.resolve(__dirname, 'node_modules/font-awesome/'),
                loader: 'file-loader',
                options: { name: 'img/[name].[md5:hash:base64:6].[ext]' }
            }
        ]
    },
    resolve: {
        alias: {
            jquery: 'jquery/src/jquery'
        },
        extensions: ['.ts', '.tsx', '.js']
    },
    context: __dirname,
    devtool: process.env.NODE_ENV !== 'production' && 'source-map'
};

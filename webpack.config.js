require('dotenv').config();

const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const util = require('util');
const crypto = require('crypto');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const HTMLWebpackPlugin = require('html-webpack-plugin');
const imageSize = util.promisify(require('image-size'));
const flatten = require('flatten');
const { GENERIFY_OPTIONS, TAGS } = require('./assets/chat/js/const');

const fsReadDirAsync = util.promisify(fs.readdir);
const fsReadFileAsync = util.promisify(fs.readFile);

class EmoteManifestPlugin {
    constructor(options) {
        this.options = options;
    }

    apply(compiler) {
        compiler.hooks.beforeCompile.tapAsync('EmoteManifestPlugin', async (params, callback) => {
            const indexJSON = await fsReadFileAsync(this.options.index);
            this.emoteNames = JSON.parse(indexJSON).default;

            this.images = flatten(await Promise.all([
                this.processImages(this.options.emoteRoot, '1x', false, false),
                this.processImages(this.options.animatedEmoteRoot, '1x', true, false),
                this.processImages(this.options.spritesheetEmoteRoot, '1x', false, true),
                this.processImages(path.join(this.options.emoteRoot, '2x'), '2x', false, false),
                this.processImages(path.join(this.options.animatedEmoteRoot, '2x'), '2x', true, false),
                this.processImages(path.join(this.options.spritesheetEmoteRoot, '2x'), '2x', false, true),
                this.processImages(path.join(this.options.emoteRoot, '4x'), '4x', false, false),
                this.processImages(path.join(this.options.animatedEmoteRoot, '4x'), '4x', true, false),
                this.processImages(path.join(this.options.spritesheetEmoteRoot, '4x'), '4x', false, true)
            ]));

            callback();
        });

        compiler.hooks.thisCompilation.tap('EmoteManifestPlugin', async (compilation) => {
            const emotes = this.mapEmotes(this.emoteNames, this.images, (emoteName, emoteImages) => {
                const versions = emoteImages.map(({ ext, hash, name, src, animated, spritesheet, dimensions, size }) => {
                    const path = `${this.options.emotePath}/${name}.${hash}${ext}`;
                    compilation.assets[path] = {
                        source: () => src,
                        size: () => src.length
                    };

                    return {
                        path,
                        animated,
                        spritesheet,
                        dimensions,
                        size
                    };
                });

                return {
                    name: emoteName,
                    versions
                };
            });

            const json = JSON.stringify({
                emotes,
                modifiers: this.options.modifiers,
                tags: this.options.tags
            });

            compilation.assets[this.options.filename] = {
                source: () => json,
                size: () => json.length
            };
        });
    }

    emoteCss() {
        return this.mapEmotes(this.emoteNames, this.images, (emoteName, emoteImages) => {
            const imageSet = emoteImages.filter(({ animated }) => !animated).map(({ name, hash, ext, size }) => {
                return `url(${this.options.emotePath}/${name}.${hash}${ext}) ${size}`;
            });

            const { dimensions, spritesheet, animated } = emoteImages.find(({ size }) => size === '1x');

            const rules = [`background-image: image-set(${imageSet.join(', ')});`];
            if (!spritesheet && !animated) {
                rules.push(
                    `height: ${dimensions.height}px;`,
                    `width: ${dimensions.width}px;`,
                    `margin-top: -${dimensions.height}px;`
                );
            }

            return `.chat-emote.chat-emote-${emoteName} {\n${rules.map((r) => `  ${r}`).join('\n')}\n}\n`;
        }).join('\n');
    }

    mapEmotes(emoteNames, images, cb) {
        return emoteNames.map((emoteName) => {
            const emoteImages = images.filter(({ name }) => name === emoteName);

            if (emoteImages.length === 0) {
                throw new Error(`missing file for emote ${emoteName}`);
            }

            return cb(emoteName, emoteImages);
        });
    }

    async processImages(root, size, animated, spritesheet) {
        const entries = await fsReadDirAsync(root, { withFileTypes: true });
        return Promise.all(entries.filter(entry => entry.isFile()).map(async ({ name }) => {
            const filePath = path.join(root, name);
            const src = await fsReadFileAsync(filePath);

            const hash = crypto.createHash('sha1');
            hash.write(src);

            const ext = path.extname(name);

            const { height, width } = await await imageSize(filePath);

            return {
                name: path.basename(name, ext),
                dimensions: { height, width },
                hash: hash.digest().toString('hex').substring(0, 6),
                ext,
                src,
                size,
                animated,
                spritesheet
            };
        }));
    }
}

const emoteManifestPlugin = new EmoteManifestPlugin({
    filename: './emote-manifest.json',
    emotePath: './assets/emotes',
    index: './assets/emotes.json',
    emoteRoot: './assets/emotes/emoticons',
    animatedEmoteRoot: './assets/emotes/emoticons-animated/gif',
    spritesheetEmoteRoot: './assets/emotes/emoticons-animated',
    cssFilename: './assets/emotes/emoticons.scss',
    modifiers: Object.keys(GENERIFY_OPTIONS),
    tags: TAGS
});

const plugins = [
    new CopyWebpackPlugin({
        patterns: [
            { from: 'robots.txt' }
        ]
    }),
    new CleanWebpackPlugin({
        verbose: false,
        cleanOnceBeforeBuildPatterns: [
            '**/*',
            '!cache',
            '!index.htm'
        ]
    }),
    new HTMLWebpackPlugin({
        filename: 'index.html',
        template: 'assets/index.html',
        favicon: './assets/chat/img/favicon.ico',
        chunks: ['chat', 'emotes']
    }),
    new HTMLWebpackPlugin({
        filename: 'chatstreamed.html',
        template: 'assets/chatstreamed.html',
        favicon: './assets/chat/img/favicon.ico',
        chunks: ['chatstreamed', 'emotes']
    }),
    new HTMLWebpackPlugin({
        filename: 'notification-request.html',
        template: 'assets/notification-request/notification-request.html',
        favicon: './assets/chat/img/favicon.ico',
        chunks: ['notification-request']
    }),
    new MiniCssExtractPlugin({
        filename: '[name].[contenthash].css'
    }),
    new webpack.DefinePlugin({
        WEBSOCKET_URI: process.env.WEBSOCKET_URI ? `'${process.env.WEBSOCKET_URI}'` : '"wss://chat.strims.gg/ws"',
        API_URI: process.env.API_URI ? `'${process.env.API_URI}'` : '""',
        LOGIN_URI: process.env.LOGIN_URI ? `'${process.env.LOGIN_URI}'` : 'false',
        RUSTLA_URL: process.env.RUSTLA_URL ? `'${process.env.RUSTLA_URL}'` : '"https://strims.gg"'
    }),
    emoteManifestPlugin
];

const entry = {
    'chat': [
        'core-js/es6',
        'jquery',
        'normalize.css',
        'font-awesome/scss/font-awesome.scss',
        './assets/chat/js/notification',
        './assets/chat/css/style.scss',
        './assets/chat.js',
        './assets/sounds/notification.wav'
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
    'emotes': [
        './assets/chat/css/emotes.scss'
    ],
    'notification-request': [
        './assets/notification-request/style.scss',
        './assets/notification-request/persona.png',
        './assets/notification-request/settings-guide.png',
        './assets/notification-request/script.js'
    ],
};

if (process.env.NODE_ENV !== 'production') {
    console.log('\n!!!!!!!!!!!! DEVELOPMENT BUILD !!!!!!!!!!!!\n');

    plugins.push(
        new CopyWebpackPlugin({
            patterns: [
                { from: 'assets/dev/chat-embedded.html', to: 'dev/' }
            ]
        }),
        new HTMLWebpackPlugin({
            filename: 'dev/dev-chat.html',
            template: 'assets/index.html',
            chunks: ['dev-chat', 'emotes']
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
        filename: '[name].[contenthash].js',
        assetModuleFilename: 'assets/[hash][ext][query]'
    },
    plugins: plugins,
    watchOptions: {
        ignored: /node_modules/
    },
    module: {
        rules: [
            {
                test: /\.html$/,
                loader: 'html-loader'
            },
            {
                test: /\.(tsx?)$/,
                use: [
                    'babel-loader',
                    'ts-loader'
                ]
            },
            {
                test: /\.js$/,
                exclude: path.resolve(__dirname, 'node_modules'),
                loader: 'babel-loader'
            },
            {
                test: /\.(s?css)$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    {
                        loader: 'css-loader',
                        options: {
                            sourceMap: true,
                            url: {
                                filter: (url) =>  !url.startsWith(emoteManifestPlugin.options.emotePath)
                            }
                        }
                    },
                    {
                        loader: 'resolve-url-loader',
                        options: {
                            sourceMap: true
                        }
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            sourceMap: true
                        }
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            sourceMap: true,
                            additionalData: (content, loaderContext) => {
                                const { resourcePath, rootContext } = loaderContext;
                                const relativePath = path.relative(rootContext, resourcePath);

                                if (relativePath === 'assets/chat/css/emotes.scss') {
                                    return emoteManifestPlugin.emoteCss() + content;
                                }

                                return content;
                            }
                        }
                    }
                ]
            },
            {
                test: /\.(eot|svg|ttf|woff2?)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
                type: 'asset/resource'
            },
            {
                test: /\.(png|jpg|gif|svg)$/,
                type: 'asset/resource'
            },
            {
                test: /\.(mp3|wav)$/i,
                loader: 'url-loader',
                options: {
                    limit: 8192
                },
                type: 'javascript/auto'
            }
        ]
    },
    resolve: {
        alias: {
            jquery: 'jquery/src/jquery'
        },
        extensions: ['.ts', '.tsx', '.js', '.wav']
    },
    context: __dirname,
    devtool: process.env.NODE_ENV !== 'production' && 'source-map'
};

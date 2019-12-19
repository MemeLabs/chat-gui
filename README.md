# Strims.gg Chat GUI

Source code for the chat client at [strims.gg](https://chat.strims.gg/)
This is a work in progress!

### Install node.js
Visit https://nodejs.org/ and install the package to
be able to use npm

#### Install the node dependencies

```bash
npm install
```

#### You can now build the project.

```bash
# For development
npm run build

# For production
npm run build:production
```

#### Implementation & Testing

```bash
# Start webpack server at http://localhost:8282/
npm run start

# Automatically build for when you're running your own webserver
npm run watch
```

Check the readme at `assets/dev/` for more information on testing.

## Favicon

For future reference, the favicon is generated via

```bash
convert orig.png -define icon:auto-resize:256,128,96,72,64,48,32,24,16 favicon.ico
```

## License

See [LICENSE.md](LICENSE.md)

# Dev Chat

Dev chat is an offline chat configuration for some rough testing of performance, function, and styling. And is only included in the development build, like `npm run start` or `npm run build`.

## Access

Dev chat is hosted at `/dev/dev-chat.html` like:

```
localhost:8282/dev/dev-chat.html
```

## Mock server

Dev chat is connected to mocked websocket defined in `MockStream.js`. The `MockStream` object is globally available on the `window` through the console; through which message simulation streams can be triggered.

Examples:

```js
// Send message from any username
mockStream.sendMessage( 'MemeSlayer', 'shes a 10 definitely' )

// Send yourself a whisper
mockStream.whisperSelf( 'hey, are you a girl' )

// Sends messages triggering all possible tagged colors
mockStream.allTagColors();
```

## Tests.js

Currently `tests.js` only contains 1 test for debugging loading performance of message history. For now, just put tests there that don't belong in `mockStream.js`

## Testing autocomplete

A couple of similar usernames are loaded into chat for autocomplete testing - see their names in `MockStream.js`.

If you want to add additional usernames to the chat, sending a message through `mockStream` with the desired username will add it.

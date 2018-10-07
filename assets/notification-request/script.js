const TEXT_TYPING_TIME = 50;
const TEXT_CLEAR_TIME = 35;
const CLOSE_BUFFER_TIME = 1700;

const DIALOG = {
	default: "Requesting permission...",
	confirm: "Thank you!",
	denied: "Permission denied, FML"
};

window.addEventListener( "load", () => {
    if( Notification.permission === "denied" ) {
        alreadySetScenario();
    } else {
        defaultScenario();
    }
} );

/**
 * Encompasses logic for handeling the sernario where
 * the notification permission is default/ask.
 */
function defaultScenario() {
    const guideEl = document.querySelector(".persona-guide");
    guideEl.style = ""; // Overwrite `visibility: hidden`

	typeText( DIALOG.default );

	Notification.requestPermission()
		.catch( () => "error" )
		.then( result => {
			let response = "";

			switch( result ) {
				case "granted":
					const personaEl = document.querySelector(".persona");
					personaEl.style = "animation-name: persona-excite";
					response = DIALOG.confirm;
					break;
				case "default":
                case "denied":
                case "error":
					response = DIALOG.denied;
					break;
			}

			clearText()
				.then( () => wait( 400 ) )
				.then( () => typeText( response ) )
				.then( closeWindow );
		} );
}

/**
 * Encompasses logic for handeling the sernario where
 * the notification permission is already denied.
 */
function alreadySetScenario() {
    const guideEl = document.querySelector(".settings-guide");
    guideEl.style = ""; // Overwrite `visibility: hidden`

    window.navigator.permissions
        .query({ name: "notifications"})
        .then( permission => {
            permission.addEventListener( "change", () => {
                if( Notification.permission === "granted" ) {
                    closeWindow();
                }
            } );
        } );
}

/**
 * Closes window and signals to parent window.
 */
function closeWindow() {
    setTimeout( () => {
        window.opener.postMessage(
            { name: "notification-request-done" },
            "*"
        );
        window.close();
    }, CLOSE_BUFFER_TIME );
}

/**
 * Fills persona text one letter at a time.
 */
function typeText(text) {
    return new Promise( (resolve, reject) => {
        const textEl = document.querySelector(".text-bubble-text");
        const cursorEl = document.querySelector(".text-bubble-cursor");

		let count = 1;
		const update = () => {
			textEl.textContent = text.slice( 0, count );
			// Re-add to DOM to reset animation
			cursorEl.replaceWith(cursorEl);
			count++;

			if( count > text.length ) {
				resolve();
			} else {
				setTimeout( update, TEXT_TYPING_TIME + Math.random() * 50 );
			}
		};

		update();
	} );
}

/*
* Clear the persona text one letter at a time.
*/
function clearText() {
    return new Promise( (resolve, reject) => {
        const textEl = document.querySelector(".text-bubble-text");
        const cursorEl = document.querySelector(".text-bubble-cursor");

		const update = () => {
			textEl.textContent = textEl.textContent.slice( 0, -1 );
			// Re-add to DOM to reset animation
			cursorEl.replaceWith(cursorEl);

			if( textEl.textContent === "" ) {
				resolve();
			} else {
				setTimeout( update, TEXT_CLEAR_TIME );
			}
		};

		update();
	} );
}

/**
 * Waits the given amount of milliseconds before resolving the returned Promise.
 * Handy for constructing a sequence of promises.
 */
function wait(time) {
	return new Promise( (resolve, reject) => {
		setTimeout( resolve, time)
	} );
}

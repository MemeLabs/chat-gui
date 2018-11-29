/* global $, destiny */

import Chat from './chat';
import {KEYCODES, getKeyCode, CUSTOM_AUTOCOMPLETE_ORDER} from './const';

let suggestTimeoutId;
let minWordLength = 1;
let maxResults = 20;

function getBucketId(id) {
    return (id.match(/[\S]/)[0] || '_').toLowerCase();
}

function promoteIfSelected(ac) {
    if (ac.selected >= 0 && ac.results[ac.selected]) {
        ac.results[ac.selected].lastUsed = Date.now();
    }
}

function sortResults(a, b) {
    if (!a || !b) { return 0; }

    // order emotes second
    if (a.isemote !== b.isemote) { return a.isemote && !b.isemote ? -1 : 1; }

    // order according to presence if has not been used yet
    if (!(a.lastUsed || b.lastUsed) && (a.lastSeen !== b.lastSeen)) { return a.lastSeen > b.lastSeen ? -1 : 1; }

    // order according to use third
    if (a.lastUsed !== b.lastUsed) { return a.lastUsed > b.lastUsed ? -1 : 1; }

    // order by custom autocomplete order - see const.js
    for (var i in CUSTOM_AUTOCOMPLETE_ORDER) {
        if (CUSTOM_AUTOCOMPLETE_ORDER[i].includes(a.data) && CUSTOM_AUTOCOMPLETE_ORDER[i].includes(b.data)) {
            return CUSTOM_AUTOCOMPLETE_ORDER[i].indexOf(a.data) < CUSTOM_AUTOCOMPLETE_ORDER[i].indexOf(b.data) ? -1 : 1;
        }
    }

    // order lexically fourth
    a = a.data.toLowerCase();
    b = b.data.toLowerCase();

    if (a === b) { return 0; }

    return a > b ? 1 : -1;
}
function buildSearchCriteria(str, offset) {
    let pre = str.substring(0, offset);

    let post = str.substring(offset);

    let startCaret = pre.lastIndexOf(' ') + 1;

    let endCaret = post.indexOf(' ');

    let useronly = false;

    if (startCaret > 0) { pre = pre.substring(startCaret); }

    if (endCaret > -1) { post = post.substring(0, endCaret); }

    // Ignore the first char as part of the search and flag as a user only search
    if (pre.lastIndexOf('@') === 0) {
        startCaret++;
        pre = pre.substring(1);
        useronly = true;
    }

    return {
        word: pre + post,
        pre: pre,
        post: post,
        startCaret: startCaret,
        useronly: useronly,
        orig: str
    };
}
function buildHelpers(ac) {
    if (ac.results.length > 0) {
        ac.container[0].innerHTML = ac.results
            .map((res, k) => `<li data-index="${k}">${res.data}</li>`)
            .join('');
    }
}
function timeoutHelpers(ac) {
    if (suggestTimeoutId) { clearTimeout(suggestTimeoutId); }
    suggestTimeoutId = setTimeout(() => ac.reset(), 15000, ac);
}
function updateHelpers(ac) {
    ac.chat.ui.toggleClass('chat-autocomplete-in', ac.results.length > 0);
    ac.ui.toggleClass('active', ac.results.length > 0);
}
function selectHelper(ac) {
    // Positioning
    if (ac.selected !== -1 && ac.results.length > 0) {
        const list = ac.ui.find(`li`).get();
        const offset = ac.container.position().left;

        const maxwidth = ac.ui.width();
        $(list[ac.selected + 3]).each((i, e) => {
            const right = ($(e).position().left + offset) + $(e).outerWidth();
            if (right > maxwidth) { ac.container.css('left', offset + maxwidth - right); }
        });
        $(list[Math.max(0, ac.selected - 2)]).each((i, e) => {
            const left = $(e).position().left + offset;
            if (left < 0) { ac.container.css('left', $(e).position().left); }
        });
        list.forEach((e, i) => $(e).toggleClass('active', i === ac.selected));
    }
}

class ChatAutoComplete {
    constructor() {
        /** @member jQuery */
        this.ui = $(`<div id="chat-auto-complete"><ul></ul></div>`);
        this.ui.on('click', 'li', e => this.select(parseInt(e.currentTarget.getAttribute('data-index'))));
        this.container = $(this.ui[0].firstElementChild);
        this.buckets = new Map();
        this.results = [];
        this.criteria = null;
        this.selected = -1;
        this.input = null;
    }

    bind(chat) {
        this.chat = chat;
        this.input = chat.input;
        this.ui.insertBefore(chat.input);
        let originval = '';

        let shiftdown = false;

        let keypressed = false;

        // The reason why this has a bind method, is that the chat relies autocomplete objecting being around
        // Key down for any key, but we cannot get the charCode from it (like keypress).
        this.input.on('keydown', e => {
            originval = this.input.val().toString();
            const keycode = getKeyCode(e);
            if (keycode === KEYCODES.TAB) {
                if (this.results.length > 0) { this.select(this.selected >= this.results.length - 1 ? 0 : this.selected + 1); }
                e.preventDefault();
                e.stopPropagation();
            } else if (shiftdown !== e.shiftKey && this.criteria !== null) {
                shiftdown = !!e.shiftKey;
                this.search(this.criteria, shiftdown);
            }
        });
        // Key press of characters that actually input into the field
        this.input.on('keypress', e => {
            const keycode = getKeyCode(e);

            const char = String.fromCharCode(keycode) || '';
            if (keycode === KEYCODES.ENTER) {
                promoteIfSelected(this);
                this.reset();
            } else if (char.length > 0) {
                promoteIfSelected(this);
                const str = this.input.val().toString();

                const offset = this.input[0].selectionStart + 1;

                const pre = str.substring(0, offset);

                const post = str.substring(offset);
                const criteria = buildSearchCriteria(pre + char + post, offset);
                this.search(criteria);
                keypressed = true;
            }
        });
        // Key up, we handle things like backspace if the keypress never found a char.
        this.input.on('keyup', e => {
            const keycode = getKeyCode(e);
            if (keycode !== KEYCODES.TAB && keycode !== KEYCODES.ENTER) {
                const needle = this.input.val().toString();
                if (needle.trim().length === 0) { this.reset(); }
                // If a key WAS pressed, but keypress event did not fire
                // Check if the value changed between the key down, and key up
                // Keys like `backspace`
                else if (!keypressed && needle !== originval) {
                    const offset = this.input[0].selectionStart;
                    const criteria = buildSearchCriteria(needle, offset);
                    this.search(criteria);
                } else if (shiftdown !== e.shiftKey && this.criteria !== null) {
                    shiftdown = !!e.shiftKey;
                    this.search(this.criteria, shiftdown);
                }
            }
            keypressed = false;
            originval = '';
        });
        // Mouse down, if there is no text selection search the word from where the caret is
        this.input.on('mouseup', () => {
            if (this.input[0].selectionStart !== this.input[0].selectionEnd) { return this.reset(); }
            const needle = this.input.val().toString();
            const offset = this.input[0].selectionStart;
            const criteria = buildSearchCriteria(needle, offset);
            this.search(criteria);
        });
    }

    search(criteria, useronly = false) {
        this.selected = -1;
        this.results = [];
        this.criteria = criteria;

        // for emote suffixes started from "YEE :"
        if (criteria.orig.includes(' :') && criteria.word.startsWith(':')) {
            const lastColon = criteria.orig.lastIndexOf(' :');
            // assumption: the last occurrence of " :" is meant to be a emote suffix
            criteria.orig = criteria.orig.substring(0, lastColon) + ':' + criteria.orig.substring(lastColon + 2);
            criteria.startCaret--;
        }
        // for emote suffixes started from "YEE:"
        if (criteria.word.includes(':') && !criteria.word.startsWith(':')) {
            const emote = criteria.word.split(':')[0];
            const suffix = criteria.word.split(':')[1];
            criteria.startCaret = criteria.startCaret + emote.length;
            criteria.word = `:${suffix}`;
            criteria.pre = `:${suffix}`;
        }
        if (criteria.word.length >= minWordLength) {
            const bucket = this.buckets.get(getBucketId(criteria.word)) || new Map();
            const regex = new RegExp('^' + Chat.makeSafeForRegex(criteria.pre), 'i');
            this.results = [...bucket.values()]
                // filter exact matches
                .filter(a => a.data !== criteria.word)
                // filter users if user search
                .filter(a => (!a.isemote || !(criteria.useronly || useronly)) && regex.test(a.data))
                .sort(sortResults)
                .slice(0, maxResults);
        }
        buildHelpers(this);
        updateHelpers(this);
        timeoutHelpers(this);
    }

    reset() {
        this.criteria = null;
        this.results = [];
        this.selected = -1;
        updateHelpers(this);
    }

    add(str, isemote = false) {
        const id = getBucketId(str);
        const bucket = this.buckets.get(id) || this.buckets.set(id, new Map()).get(id);
        let candidate = bucket.get(str);
        if (!candidate) {
            candidate = {
                data: str,
                lastSeen: 0,
                lastUsed: 0,
                isemote: isemote
            };
            bucket.set(str, candidate);
        }
        return candidate;
    }

    promoteOneLastSeen(str) {
        if (!str) return null;
        const id = getBucketId(str);
        const bucket = this.buckets.get(id) || this.buckets.set(id, new Map()).get(id);
        let candidate = bucket.get(str);
        if (!candidate) return null;
        candidate.lastSeen = Date.now();
        bucket.set(str, candidate);
        return candidate;
    }

    promoteManyLastUsed(words) {
        for (let i = 0, l = words.length; i < l; i++) {
            let word = words[i];
            if (!word) continue;
            const bucket = this.buckets.get(getBucketId(word));
            if (!bucket) continue;
            let candidate = bucket.get(word);
            if (!candidate) continue;
            candidate.lastUsed = Date.now();
            bucket.set(word, candidate);
        }
        return words;
    }

    remove(str) {
        const bucket = this.buckets.get(getBucketId(str));
        if (bucket && bucket.has(str)) { bucket.delete(str); }
    }

    select(index) {
        this.selected = Math.min(index, this.results.length - 1);
        const result = this.results[this.selected];
        if (!result) return;

        let pre = this.criteria.orig.substr(0, this.criteria.startCaret);

        let post = this.criteria.orig.substr(this.criteria.startCaret + this.criteria.word.length);
        // always add a space after our completion if there isn't one since people
        // would usually add one anyway
        if (post[0] !== ' ' || post.length === 0) {
            post = ' ' + post;
        }
        this.input.focus().val(pre + result.data + post);

        // Move the caret to the end of the replacement string + 1 for the space
        const s = pre.length + result.data.length + 1;
        this.input[0].setSelectionRange(s, s);

        // Update selection gui
        selectHelper(this);
        updateHelpers(this);
    }
}

export default ChatAutoComplete;

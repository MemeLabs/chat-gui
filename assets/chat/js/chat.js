/* global $, window, document */

import { KEYCODES, DATE_FORMATS, isKeyCode, GENERIFY_OPTIONS } from "./const";
import debounce from "throttle-debounce/debounce";
import moment from "moment";
import EventEmitter from "./emitter";
import ChatSource from "./source";
import ChatUser from "./user";
import ViewerState from "./viewerstate";
import { MessageBuilder, MessageTypes } from "./messages";
import {
    ChatMenu,
    ChatUserMenu,
    ChatWhisperUsers,
    ChatEmoteMenu,
    ChatSettingsMenu,
    ChatContextMenu
} from "./menus";
import ChatAutoComplete from "./autocomplete";
import ChatInputHistory from "./history";
import ChatUserFocus from "./focus";
import ChatSpoiler from "./spoiler";
import ChatStore from "./store";
import UserFeatures from "./features";
import Settings from "./settings";
import ChatWindow from "./window";
import WhisperStore from "./whispers";
import notificationSound from "./notificationSound";


const regextime = /(\d+(?:\.\d*)?)([a-z]+)?/gi;
const regexsafe = /[\-\[\]\/{}()*+?.\\^$|]/g;
const nickmessageregex = /(?:(?:^|\s)@?)([a-zA-Z0-9_]{3,20})(?=$|\s|[.?!,])/g;
const nickregex = /^[a-zA-Z0-9_]{3,20}$/;
const nsfwnsfl = new RegExp(`\\b(?:NSFL|NSFW)\\b`, "i");
const tagcolors = [
    "green",
    "yellow",
    "orange",
    "red",
    "purple",
    "blue",
    "sky",
    "lime",
    "pink",
    "black"
];
const errorstrings = new Map([
    ["unknown", "Unknown error, this usually indicates an internal problem :("],
    ["nopermission", "You do not have the required permissions to use that"],
    ["protocolerror", "Invalid or badly formatted"],
    ["needlogin", "You have to be logged in to use that"],
    ["invalidmsg", "The message was invalid"],
    ["throttled", "Throttled! You were trying to send messages too fast"],
    ["duplicate", "The message is identical to the last one you sent"],
    ["muted", "You are muted. Check your profile for more information."],
    ["submode", "The channel is currently in subscriber only mode"],
    ["needbanreason", "Providing a reason for the ban is mandatory"],
    [
        "banned",
        "You have been banned."
    ],
    ["privmsgbanned", "Cannot send private messages while banned"],
    ["requiresocket", "This chat requires WebSockets"],
    ["toomanyconnections", "Only 5 concurrent connections allowed"],
    ["socketerror", "Error contacting server"],
    [
        "privmsgaccounttooyoung",
        "Your account is too recent to send private messages"
    ],
    ["notfound", "The user was not found"],
    ["notconnected", "You have to be connected to use that"]
]);
const hintstrings = new Map([
    [
        "slashhelp",
        "Type in /help for more a list of commands, do advanced things like modify your scroll-back size"
    ],
    [
        "tabcompletion",
        "Use the tab key to auto-complete names and emotes (for user only completion prepend a @ or press shift)"
    ],
    [
        "hoveremotes",
        "Hovering your mouse over an emote will show you the emote code"
    ],
    ["highlight", "Chat messages containing your username will be highlighted"],
    ["notify", "Use /w <username> to send a private message to someone"],
    [
        "ignoreuser",
        "Use /ignore <username> to hide messages from pesky chatters"
    ],
    ["mutespermanent", "Mutes are never persistent, don't worry it will pass!"],
    [
        "tagshint",
        `Use the /tag <nick> <color> to highlight users you like. There are preset colors to choose from ${tagcolors.join(
            ", "
        )}, or \`/tag <nick> #HEXCODE\``
    ],
    ["contextmenu", "Right click a user to access quick options!"]
]);
const settingsdefault = new Map([
    ["schemaversion", 2],
    ["showtime", false],
    ["hideflairicons", false],
    ["profilesettings", false],
    ["timestampformat", "HH:mm"],
    ["maxlines", 250],
    ["notificationwhisper", true],
    ["soundnotificationwhisper", false],
    ["notificationhighlight", true],
    ["soundnotificationhighlight", false],
    ["notificationsoundfile", ""],
    ["highlight", true], // todo rename this to `highlightself` or something
    ["customhighlight", []],
    ["highlightnicks", []],
    ["taggednicks", []],
    ["showremoved", 0], // 0 = false (removes), 1 = true (censor), 2 = do nothing
    ["showhispersinchat", true],
    ["ignorenicks", []],
    ["focusmentioned", false],
    ["notificationtimeout", true],
    ["ignorementions", false],
    ["autocompletehelper", true],
    ["autocompleteemotepreview", true],
    ["taggedvisibility", false],
    ["hidensfw", false],
    ["animateforever", true],
    ["formatter-green", true],
    ["formatter-emote", true],
    ["holidayemotemodifiers", true],
    ["disablespoilers", false],
    ["viewerstateindicator", 1],
    ["hiddenemotes", []]
]);
const commandsinfo = new Map([
    ["help", { desc: "Helpful information." }],
    ["emotes", { desc: "A list of the chats emotes in text form." }],
    ["me", { desc: "A normal message, but emotive." }],
    [
        "message",
        {
            desc: "Whisper someone",
            alias: ["msg", "whisper", "w", "tell", "t", "notify"]
        }
    ],
    [
        "ignore",
        {
            desc:
                "No longer see user messages, without <nick> to list the nicks ignored"
        }
    ],
    ["unignore", { desc: "Remove a user from your ignore list" }],
    [
        "highlight",
        { desc: "Highlights target nicks messages for easier visibility" }
    ],
    ["unhighlight", { desc: "Unhighlight target nick" }],
    ["maxlines", { desc: "The maximum number of lines the chat will store" }],
    [
        "mute",
        {
            desc: "The users messages will be blocked from everyone.",
            admin: true
        }
    ],
    ["unmute", { desc: "Unmute the user.", admin: true }],
    ["subonly", { desc: "Subscribers only", admin: true }],
    [
        "ban",
        {
            desc: "User will no longer be able to connect to the chat.",
            admin: true
        }
    ],
    ["unban", { desc: "Unban a user", admin: true }],
    ["timestampformat", { desc: "Set the time format of the chat." }],
    ["tag", { desc: "Mark a users messages" }],
    ["untag", { desc: "No longer mark the users messages" }],
    ["exit", { desc: "Exit the conversation you are in." }],
    [
        "hideemote",
        { desc: "Hide emotes in chat by converting them to plain text." }
    ],
    ["unhideemote", { desc: "Unhide a hidden emote." }]
]);
const banstruct = {
    id: 0,
    userid: 0,
    username: "",
    targetuserid: "",
    targetusername: "",
    ipaddress: "",
    reason: "",
    starttimestamp: "",
    endtimestamp: ""
};
const debounceFocus = debounce(10, c => c.input.focus());
const focusIfNothingSelected = chat => {
    if (window.getSelection().isCollapsed && !chat.input.is(":focus")) {
        debounceFocus(chat);
    }
};
const extractHostname = url => {
    let hostname =
        url.indexOf("://") > -1 ? url.split("/")[2] : url.split("/")[0];
    hostname = hostname.split(":")[0];
    hostname = hostname.split("?")[0];
    return hostname;
};
const Notification = window.Notification || {};

class Chat {
    constructor() {
        /** @type JQuery */
        this.ui = null;
        this.css = null;
        this.output = null;
        this.input = null;
        this.loginscrn = null;
        this.loadingscrn = null;
        this.showmotd = true;
        this.authenticated = false;
        this.backlogloading = false;
        this.unresolved = [];
        this.emoticons = new Set();
        this.emoteswithsuffixes = new Set();
        this.user = new ChatUser();
        this.users = new Map();
        this.viewerStates = new Map();
        this.whispers = new Map();
        this.whisperStore = new WhisperStore('Anonymous');
        this.windows = new Map();
        this.settings = new Map([...settingsdefault]);
        this.autocomplete = new ChatAutoComplete();
        this.menus = new Map();
        this.taggednicks = new Map();
        this.ignoring = new Set();
        this.mainwindow = null;
        this.nukes = [];
        this.regexhighlightcustom = null;
        this.regexhighlightnicks = null;
        this.regexhighlightself = null;

        // An interface to tell the chat to do things via chat commands, or via emit
        // e.g. control.emit('CONNECT', 'ws://localhost:9001') is essentially chat.cmdCONNECT('ws://localhost:9001')
        this.control = new EventEmitter(this);

        // The websocket connection, emits events from the chat server
        this.source = new ChatSource();

        this.source.on("REFRESH", () => window.location.reload(false));
        this.source.on("PING", data => this.source.send("PONG", data));
        this.source.on("CONNECTING", data => this.onCONNECTING(data));
        this.source.on("OPEN", data => this.onOPEN(data));
        this.source.on("DISPATCH", data => this.onDISPATCH(data));
        this.source.on("CLOSE", data => this.onCLOSE(data));
        this.source.on("NAMES", data => this.onNAMES(data));
        this.source.on("QUIT", data => this.onQUIT(data));
        this.source.on("MSG", data => this.onMSG(data));
        this.source.on("MUTE", data => this.onMUTE(data));
        this.source.on("UNMUTE", data => this.onUNMUTE(data));
        this.source.on("BAN", data => this.onBAN(data));
        this.source.on("UNBAN", data => this.onUNBAN(data));
        this.source.on("ERR", data => this.onERR(data));
        this.source.on("SOCKETERROR", data => this.onSOCKETERROR(data));
        this.source.on("SUBONLY", data => this.onSUBONLY(data));
        this.source.on("BROADCAST", data => this.onBROADCAST(data));
        this.source.on("PRIVMSGSENT", data => this.onPRIVMSGSENT(data));
        this.source.on("PRIVMSG", data => this.onPRIVMSG(data));
        this.source.on("VIEWERSTATE", data => this.onVIEWERSTATE(data));

        this.control.on("SEND", data => this.cmdSEND(data));
        this.control.on("HINT", data => this.cmdHINT(data));
        this.control.on("EMOTES", data => this.cmdEMOTES(data));
        this.control.on("HELP", data => this.cmdHELP(data));
        this.control.on("IGNORE", data => this.cmdIGNORE(data));
        this.control.on("UNIGNORE", data => this.cmdUNIGNORE(data));
        this.control.on("MUTE", data => this.cmdMUTE(data));
        this.control.on("BAN", data => this.cmdBAN(data, "BAN"));
        this.control.on("IPBAN", data => this.cmdBAN(data, "IPBAN"));
        this.control.on("UNMUTE", data => this.cmdUNBAN(data, "UNMUTE"));
        this.control.on("UNBAN", data => this.cmdUNBAN(data, "UNBAN"));
        this.control.on("SUBONLY", data => this.cmdSUBONLY(data, "SUBONLY"));
        this.control.on("MAXLINES", data => this.cmdMAXLINES(data, "MAXLINES"));
        this.control.on("UNHIGHLIGHT", data =>
            this.cmdHIGHLIGHT(data, "UNHIGHLIGHT")
        );
        this.control.on("HIGHLIGHT", data =>
            this.cmdHIGHLIGHT(data, "HIGHLIGHT")
        );
        this.control.on("TIMESTAMPFORMAT", data =>
            this.cmdTIMESTAMPFORMAT(data)
        );
        this.control.on("BROADCAST", data => this.cmdBROADCAST(data));
        this.control.on("CONNECT", data => this.cmdCONNECT(data));
        this.control.on("TAG", data => this.cmdTAG(data));
        this.control.on("UNTAG", data => this.cmdUNTAG(data));
        this.control.on("BANINFO", data => this.cmdBANINFO(data));
        this.control.on("EXIT", data => this.cmdEXIT(data));
        this.control.on("MESSAGE", data => this.cmdWHISPER(data));
        this.control.on("MSG", data => this.cmdWHISPER(data));
        this.control.on("WHISPER", data => this.cmdWHISPER(data));
        this.control.on("W", data => this.cmdWHISPER(data));
        this.control.on("TELL", data => this.cmdWHISPER(data));
        this.control.on("T", data => this.cmdWHISPER(data));
        this.control.on("NOTIFY", data => this.cmdWHISPER(data));
        this.control.on("HIDEEMOTE", data =>
            this.cmdHIDEEMOTE(data, "HIDEEMOTE")
        );
        this.control.on("UNHIDEEMOTE", data =>
            this.cmdHIDEEMOTE(data, "UNHIDEEMOTE")
        );

        notificationSound.loadConfig();
    }

    withUserAndSettings(data) {
        return this.withUser(data).withSettings(
            data && data.hasOwnProperty("settings")
                ? new Map(data.settings)
                : new Map()
        );
    }

    withUser(user) {
        this.user = this.addUser(user || { nick: "Anonymous" });
        this.authenticated =
            this.user !== null &&
            this.user.username !== "" &&
            this.user.username !== "Anonymous";
        return this;
    }

    withSettings(settings) {
        // If authed and #settings.profilesettings=true use #settings
        // Else use whats in LocalStorage#chat.settings
        let stored =
            settings !== null &&
            this.authenticated &&
            settings.get("profilesettings")
                ? settings
                : new Map(ChatStore.read("chat.settings") || []);

        // Loop through settings and apply any settings found in the #stored data
        if (stored.size > 0) {
            [...this.settings.keys()]
                .filter(
                    k => stored.get(k) !== undefined && stored.get(k) !== null
                )
                .forEach(k => this.settings.set(k, stored.get(k)));
        }
        // Upgrade if schema is out of date
        const oldversion = stored.has("schemaversion")
            ? parseInt(stored.get("schemaversion"))
            : -1;
        const newversion = settingsdefault.get("schemaversion");
        if (oldversion !== -1 && newversion > oldversion) {
            Settings.upgrade(this, oldversion, newversion);
            this.settings.set("schemaversion", newversion);
            this.saveSettings();
        }

        this.taggednicks = new Map(this.settings.get("taggednicks"));
        this.rebuildHexColorStyles(this.taggednicks);
        this.ignoring = new Set(this.settings.get("ignorenicks"));
        return this;
    }

    withGui() {
        this.ui = $("#chat");
        this.css = $("#chat-styles")[0]["sheet"];
        this.ishidden =
            (document["visibilityState"] || "visible") !== "visible";
        this.output = this.ui.find("#chat-output-frame");
        this.input = this.ui.find("#chat-input-control");
        this.loginscrn = this.ui.find("#chat-login-screen");
        this.loadingscrn = this.ui.find("#chat-loading");
        this.windowselect = this.ui.find("#chat-windows-select");
        this.inputhistory = new ChatInputHistory(this);
        this.userfocus = new ChatUserFocus(this, this.css);
        this.spoiler = new ChatSpoiler(this);
        this.mainwindow = new ChatWindow("main").into(this);

        this.windowToFront("main");

        this.menus.set(
            "settings",
            new ChatSettingsMenu(
                this.ui.find("#chat-settings"),
                this.ui.find("#chat-settings-btn"),
                this
            )
        );
        this.menus.set(
            "emotes",
            new ChatEmoteMenu(
                this.ui.find("#chat-emote-list"),
                this.ui.find("#chat-emoticon-btn"),
                this
            )
        );
        this.menus.set(
            "users",
            new ChatUserMenu(
                this.ui.find("#chat-user-list"),
                this.ui.find("#chat-users-btn"),
                this
            )
        );
        this.menus.set(
            "whisper-users",
            new ChatWhisperUsers(
                this.ui.find("#chat-whisper-users"),
                this.ui.find("#chat-whisper-btn"),
                this
            )
        );

        commandsinfo.forEach((a, k) => {
            this.autocomplete.add(`/${k}`);
            (a["alias"] || []).forEach(k => this.autocomplete.add(`/${k}`));
        });
        this.emoticons.forEach(e => this.autocomplete.add(e, true));
        const suffixes = Object.keys(GENERIFY_OPTIONS);
        suffixes.forEach(e => this.autocomplete.add(`:${e}`, true));
        this.autocomplete.bind(this);
        this.applySettings(false);

        // Chat input
        this.input.on("keypress", e => {
            if (isKeyCode(e, KEYCODES.ENTER) && !e.shiftKey && !e.ctrlKey) {
                e.preventDefault();
                e.stopPropagation();
                if (!this.authenticated) {
                    this.loginscrn.show();
                } else {
                    this.control.emit(
                        "SEND",
                        this.input
                            .val()
                            .toString()
                            .trim()
                    );
                    this.input.val("").trigger("input");
                }
                this.input.focus();
            }
        });

        /**
         * Syncing the text content of the scaler with the input, so that
         * the scaler grows the containing element to the exact size to
         * contain the text entered.
         */
        const inputScaler = this.ui.find("#chat-input-scaler");
        let lastHeightScaler = 0;

        this.input.on("input keydown", () => {
            // Get pinned state before syncing the scaler
            const wasScrollPinned = this.mainwindow.scrollplugin.isPinned();
            inputScaler.text(this.input.val());

            if (lastHeightScaler !== inputScaler.height()) {
                lastHeightScaler = inputScaler.height();
                this.mainwindow.scrollplugin.reset();

                if (wasScrollPinned) {
                    this.mainwindow.updateAndPin();
                }
            }
        });

        // Chat focus / menu close when clicking on some areas
        let downinoutput = false;
        this.output.on("mousedown", () => {
            downinoutput = true;
        });
        this.output.on("mouseup", () => {
            if (downinoutput) {
                downinoutput = false;
                ChatMenu.closeMenus(this);
                focusIfNothingSelected(this);
            }
        });
        this.ui.on("click", "#chat-tools-wrap", () => {
            ChatMenu.closeMenus(this);
            focusIfNothingSelected(this);
        });

        // ESC
        document.addEventListener("keydown", e => {
            if (isKeyCode(e, KEYCODES.ESC)) ChatMenu.closeMenus(this); // ESC key
        });

        // Visibility
        document.addEventListener(
            "visibilitychange",
            debounce(100, () => {
                this.ishidden =
                    (document["visibilityState"] || "visible") !== "visible";
                if (!this.ishidden) focusIfNothingSelected(this);
                else ChatMenu.closeMenus(this);
            }),
            true
        );

        // Resize
        let resizing = false;
        const onresizecomplete = debounce(100, () => {
            resizing = false;
            this.getActiveWindow().unlock();
            focusIfNothingSelected(this);
        });
        const onresize = () => {
            if (!resizing) {
                resizing = true;
                ChatMenu.closeMenus(this);
                this.getActiveWindow().lock();
            }
            onresizecomplete();
        };
        window.addEventListener("resize", onresize, false);

        // Chat user whisper tabs
        this.windowselect.on("click", ".fa-close", e => {
            ChatMenu.closeMenus(this);
            this.removeWindow(
                $(e.currentTarget)
                    .parent()
                    .data("name")
                    .toLowerCase()
            );
            this.input.focus();
            return false;
        });
        this.windowselect.on("click", ".tab", e => {
            ChatMenu.closeMenus(this);
            this.windowToFront(
                $(e.currentTarget)
                    .data("name")
                    .toLowerCase()
            );
            this.input.focus();
            return false;
        });

        // Censored
        this.output.on("click", ".censored", e => {
            const nick = $(e.currentTarget)
                .closest(".msg-user")
                .data("username");
            this.getActiveWindow()
                .getlines(`.censored[data-username="${nick}"]`)
                .removeClass("censored");
            return false;
        });

        // Login
        this.loginscrn.on("click", "#chat-btn-login", () => {
            this.loginscrn.hide();
            if (LOGIN_URI) {
                window.top.location.href = LOGIN_URI;
                return;
            }
            try {
                window.top.showLoginModal();
            } catch (_) {
                const { origin, pathname } = location;
                if (window.self === window.top) {
                    let follow = "";
                    try {
                        follow = encodeURIComponent(pathname);
                    } catch (_) {}
                    location.href = `${origin}/login?follow=${follow}`;
                } else {
                    location.href = `${origin}/login`;
                }
            }
            return false;
        });

        this.loginscrn.on("click", "#chat-btn-cancel", () =>
            this.loginscrn.hide()
        );
        this.output.on("click mousedown", ".msg-whisper a.user", e => {
            const msg = $(e.target).closest(".msg-chat");
            this.openConversation(
                msg
                    .data("username")
                    .toString()
                    .toLowerCase()
            );
            return false;
        });

        this.output.on("click", "a.user", e => {
            if (e.ctrlKey || e.metaKey) {
                const msg = $(e.target).closest(".msg-chat");
                this.openViewerStateStream(msg.data("username"))
            }
        })

        // Context menu
        this.output.on("contextmenu", "a.user", e => {
            if ($(e.target).parent().data("username").toLowerCase() !== this.user.username.toLowerCase()) {
                e.preventDefault();
                window.getSelection().removeAllRanges();
                this.contextMenu = new ChatContextMenu(this, e);
                this.contextMenu.show(e);
                this.mainwindow.lock();
            }
        })

        this.ui.on("click", e => {
            if (this.contextMenu) {
                if (!$(e.target).is(this.contextMenu.ui)) {
                    this.contextMenu.hide()
                    if (this.mainwindow.locked()) {
                        this.mainwindow.unlock();
                    }
                }
            }
        })

        // Keep the website session alive.
        setInterval(() => $.ajax({ url: "/ping" }), 10 * 60 * 1000);

        window.addEventListener('beforeunload', (event) => ChatStore.write('chat.unsentMessage', this.input.val()));

        this.loadingscrn.fadeOut(250, () => this.loadingscrn.remove());
        this.mainwindow.updateAndPin();
        this.input.focus();
        this.input
            .focus()
            .attr(
                "placeholder",
                this.authenticated
                    ? `Write something ${this.user.username} ...`
                    : "You need to be signed in to chat."
            );
        this.input.val(ChatStore.read('chat.unsentMessage') ? ChatStore.read('chat.unsentMessage') : null);
        return this;
    }

    withEmotes(emotes) {
        this.emoticons = new Set(emotes["default"]);
        for (var s in GENERIFY_OPTIONS) {
            for (var e of this.emoticons) {
                this.emoteswithsuffixes.add(`${e}:${s}`);
            }
        }
        return this;
    }

    withHistory(history) {
        if (history && history.length > 0) {
            this.backlogloading = true;
            history.forEach(line =>
                this.source.parseAndDispatch({ data: line })
            );
            MessageBuilder.element("<hr/>").into(this);
            this.backlogloading = false;
            this.mainwindow.updateAndPin();
        }
        return this;
    }

    withViewerStates(viewerStates) {
        viewerStates.forEach(state => this.onVIEWERSTATE(state));
        return this;
    }

    withWhispers() {
        if (this.authenticated) {
            this.whisperStore = new WhisperStore(this.user.nick.toLowerCase());
            this.whisperStore.load().forEach(e => this.whispers.set(e['key'], {
                id: -1,
                nick: e['nick'],
                unread: e['unread'],
                open: false
            }));
            this.menus.get('whisper-users').redraw();
        }
        return this;
    }

    connect(uri) {
        this.source.connect(uri);
        return this;
    }

    saveSettings() {
        if (this.authenticated) {
            if (this.settings.get("profilesettings")) {
                $.ajax({
                    url: `${API_URI}/api/chat/me/settings`,
                    method: "post",
                    data: JSON.stringify([...this.settings])
                });
            } else {
                ChatStore.write("chat.settings", this.settings);
            }
        } else {
            ChatStore.write("chat.settings", this.settings);
        }
    }

    // De-bounced saveSettings
    commitSettings() {
        if (!this.debouncedsave) {
            this.debouncedsave = debounce(1000, () => this.saveSettings());
        }
        this.debouncedsave();
    }

    // Save settings if save=true then apply current settings to chat
    applySettings(save = true) {
        if (save) this.saveSettings();

        // Formats
        DATE_FORMATS.TIME = this.settings.get("timestampformat");

        // Ignore Regex
        const ignores = Array.from(this.ignoring.values()).map(
            Chat.makeSafeForRegex
        );
        this.ignoreregex =
            ignores.length > 0
                ? new RegExp(`\\b(?:${ignores.join("|")})\\b`, "i")
                : null;

        // Highlight Regex
        const cust = [...(this.settings.get("customhighlight") || [])].filter(
            a => a !== ""
        );
        const nicks = [...(this.settings.get("highlightnicks") || [])].filter(
            a => a !== ""
        );
        this.regexhighlightself = this.user.nick
            ? new RegExp(`\\b(?:${this.user.nick})\\b`, "i")
            : null;
        this.regexhighlightcustom =
            cust.length > 0
                ? new RegExp(`\\b(?:${cust.join("|")})\\b`, "i")
                : null;
        this.regexhighlightnicks =
            nicks.length > 0
                ? new RegExp(`\\b(?:${nicks.join("|")})\\b`, "i")
                : null;

        // Settings Css
        Array.from(this.settings.keys()).forEach(key => {
            const value = this.settings.get(key);
            if (typeof value === "boolean") {
                this.ui.toggleClass(`pref-${key}`, value);
            } else if (!isNaN(parseInt(value))) {
                this.ui
                    .prop("className")
                    .split(/\s+/)
                    .filter(c => c.startsWith(`pref-${key}`))
                    .forEach(c => this.ui.removeClass(c));
                this.ui.addClass(`pref-${key}-${value}`);
            }
        });

        // Update maxlines
        [...this.windows].forEach(w => {
            w.maxlines = this.settings.get("maxlines");
        });

        // Formatter enable/disable
        const messages = require("./messages.js");
        messages.setFormattersFromSettings(this.settings);
    }

    addUser(data) {
        if (!data) {
            return null;
        }
        const normalized = data.nick.toLowerCase();
        let user = this.users.get(normalized);
        if (!user) {
            user = new ChatUser(data);
            this.users.set(normalized, user);
            this.updateUserViewerState(data.nick);
        } else if (
            data.hasOwnProperty("features") &&
            !Chat.isArraysEqual(data.features, user.features)
        ) {
            user.features = data.features;
        }
        return user;
    }

    addViewerState(nick) {
        const normalized = nick.toLowerCase();
        let viewerState = this.viewerStates.get(normalized);
        if (!viewerState) {
            viewerState = new ViewerState();
            this.viewerStates.set(normalized, viewerState);
            this.updateUserViewerState(nick);
        }
        return viewerState;
    }

    updateUserViewerState(nick) {
        const normalized = nick.toLowerCase();
        let viewerState = this.viewerStates.get(normalized);
        let user = this.users.get(normalized);
        if (user && viewerState) {
            user.viewerState = viewerState;
        }
    }

    addAffixToEmotes(text, affix) {
        text.trim();
        var updatedText = text.split(" ")
        for (var i = 0; i < updatedText.length; i++) {
            if (!updatedText[i].includes(":love") && (this.emoticons.has(updatedText[i].split(":")[0]) || this.emoteswithsuffixes.has(updatedText[i]))) {
                updatedText[i] += affix;
            }
        }
        return updatedText.join(" ");
    }

    addMessage(message, win = null) {
        // Dont add the gui if user is ignored
        if (
            message.type === MessageTypes.USER &&
            this.ignored(message.user.nick, message.message)
        ) {
            const isOwn =
                message.user.username.toLowerCase() ===
                this.user.username.toLowerCase();
            if (!isOwn) return;
        }

        if (win === null) {
            win = this.mainwindow;
        }
        if (!this.backlogloading) win.lock();

        // Break the current combo if this message is not an emote
        // We dont need to check what type the current message is, we just know that its a new message, so the combo is invalid.
        if (
            win.lastmessage &&
            win.lastmessage.type === MessageTypes.EMOTE &&
            win.lastmessage.emotecount > 1
        ) {
            win.lastmessage.completeCombo();
        }

        // Populate the tag, mentioned users and highlight for this $message.
        if (message.type === MessageTypes.USER) {
            // check if message is `/me `
            message.slashme =
                message.message.substring(0, 4).toLowerCase() === "/me ";
            // check if this is the current users message
            message.isown =
                message.user.username.toLowerCase() ===
                this.user.username.toLowerCase();
            // check if the last message was from the same user
            message.continued =
                win.lastmessage &&
                !win.lastmessage.target &&
                win.lastmessage.user &&
                win.lastmessage.user.username.toLowerCase() ===
                message.user.username.toLowerCase();
            // get mentions from message
            message.mentioned = Chat.extractNicks(message.message).filter(a =>
                this.users.has(a.toLowerCase())
            );
            // set tagged state
            message.tag = this.taggednicks.get(message.user.nick.toLowerCase());
            // set highlighted state if this is not the current users message or a bot, as well as other highlight criteria
            message.highlighted =
                !message.isown &&
                !message.user.hasFeature(UserFeatures.BOT) &&
                // Check current user nick against msg.message (if highlight setting is on)
                ((this.regexhighlightself &&
                    this.settings.get("highlight") &&
                    this.regexhighlightself.test(message.message)) ||
                    // Check /highlight nicks against msg.nick
                    (this.regexhighlightnicks &&
                        this.regexhighlightnicks.test(message.user.username)) ||
                    // Check custom highlight against msg.nick and msg.message
                    (this.regexhighlightcustom &&
                        this.regexhighlightcustom.test(
                            message.user.username + " " + message.message
                        )));
            if (this.settings.get("holidayemotemodifiers")){
                const t = new Date();
                if (t.getMonth() === 1 && t.getDate() === 14) {
                    message.message = this.addAffixToEmotes(message.message, ":love");
                }
            }
        }

        /* else if(win.lastmessage && win.lastmessage.type === message.type && [MessageTypes.ERROR,MessageTypes.INFO,MessageTypes.COMMAND,MessageTypes.STATUS].indexOf(message.type)){
            message.continued = true
        } */

        // The point where we actually add the message dom
        win.addMessage(this, message);

        // Show desktop notification
        if (
            !this.backlogloading &&
            message.highlighted &&
            this.settings.get("notificationhighlight") &&
            this.ishidden
        ) {
            Chat.showNotification(
                `${message.user.username} said ...`,
                message.message,
                message.timestamp.valueOf(),
                this.settings.get("notificationtimeout")
            );
        }

        if (message.highlighted && this.settings.get("soundnotificationhighlight") && this.ishidden) {
            // play sound
            notificationSound.play();
        }

        if (!this.backlogloading) win.unlock();
        return message;
    }

    resolveMessage(nick, str) {
        for (const message of this.unresolved) {
            if (
                this.user.username.toLowerCase() === nick.toLowerCase() &&
                message.message === str
            ) {
                this.unresolved.splice(this.unresolved.indexOf(message), 1);
                return true;
            }
        }
        return false;
    }

    removeMessageByNick(nick) {
        this.mainwindow.lock();
        this.mainwindow.removelines(
            `.msg-chat[data-username="${nick.toLowerCase()}"]`
        );
        this.mainwindow.unlock();
    }

    windowToFront(name) {
        const win = this.windows.get(name);
        if (win !== null && win !== this.getActiveWindow()) {
            this.windows.forEach(w => {
                if (w.visible) {
                    if (!w.locked()) w.lock();
                    w.hide();
                }
            });
            win.show();
            if (win.locked()) win.unlock();
            this.redrawWindowIndicators();
        }
        return win;
    }

    getActiveWindow() {
        return [...this.windows.values()].filter(win => win.visible)[0];
    }

    getWindow(name) {
        return this.windows.get(name);
    }

    addWindow(name, win) {
        this.windows.set(name, win);
        this.redrawWindowIndicators();
    }

    removeWindow(name) {
        const win = this.windows.get(name);
        if (win) {
            const visible = win.visible;
            this.windows.delete(name);
            win.destroy();
            if (visible) {
                const keys = [...this.windows.keys()];
                this.windowToFront(
                    this.windows.get(keys[keys.length - 1]).name
                );
            } else {
                this.redrawWindowIndicators();
            }
        }
    }

    redrawWindowIndicators() {
        if (this.windows.size > 1) {
            this.windowselect.empty();
            this.windows.forEach(w => {
                if (w.name === "main") {
                    this.windowselect.append(
                        `<span title="Strims Chat" data-name="main" class="tab win-main tag-${
                            w.tag
                        } ${w.visible ? "active" : ""}">Strims Chat</span>`
                    );
                } else {
                    const conv = this.whispers.get(w.name);
                    this.windowselect.append(
                        `<span title="${w.label}" data-name="${
                            w.name
                        }" class="tab win-${w.name} tag-${w.tag} ${
                            w.visible ? "active" : ""
                        } ${conv.unread > 0 ? "unread" : ""}">${w.label} ${
                            conv.unread > 0 ? "(" + conv.unread + ")" : ""
                        } <i class="fa fa-close" title="Close" /></span>`
                    );
                }
            });
        }
        // null check on main window, since main window calls this during initialization
        if (this.mainwindow !== null) {
            this.mainwindow.lock();
        }

        this.windowselect.toggle(this.windows.size > 1);

        if (this.mainwindow !== null) {
            this.mainwindow.unlock();
        }
    }

    censor(nick) {
        this.mainwindow.lock();
        const c = this.mainwindow.getlines(
            `.msg-chat[data-username="${nick.toLowerCase()}"]`
        );
        switch (parseInt(this.settings.get("showremoved") || 1)) {
            case 0: // remove
                c.remove();
                break;
            case 1: // censor
                c.addClass("censored");
                break;
            case 2: // do nothing
                break;
        }
        this.mainwindow.unlock();
    }

    ignored(nick, text = null) {
        return (
            this.ignoring.has(nick.toLowerCase()) ||
            (text !== null &&
                this.settings.get("ignorementions") &&
                this.ignoreregex &&
                this.ignoreregex.test(text)) ||
            (text !== null &&
                this.settings.get("hidensfw") &&
                nsfwnsfl.test(text))
        );
    }

    ignore(nick, ignore = true) {
        nick = nick.toLowerCase();
        const exists = this.ignoring.has(nick);
        if (ignore && !exists) {
            this.ignoring.add(nick);
        } else if (!ignore && exists) {
            this.ignoring.delete(nick);
        }
        this.settings.set("ignorenicks", [...this.ignoring]);
        this.applySettings();
    }

    /**
     * EVENTS
     */

    onDISPATCH({ data }) {
        if (typeof data === "object") {
            let users = [];
            if (data.hasOwnProperty("nick")) {
                users.push(this.addUser(data));
            }
            if (data.hasOwnProperty("users")) {
                users = users.concat(
                    Array.from(data.users).map(d => this.addUser(d))
                );
            }
            users.forEach(u => this.autocomplete.add(u.nick, false));
        }
    }

    onCLOSE({ retryMilli }) {
        // https://www.iana.org/assignments/websocket/websocket.xml#close-code-number
        // const code = e.event.code || 1006
        if (retryMilli > 0) {
            MessageBuilder.error(
                `Disconnected, retry in ${Math.round(
                    retryMilli / 1000
                )} seconds ...`
            ).into(this);
        } else {
            MessageBuilder.error(`Disconnected.`).into(this);
        }
    }

    onCONNECTING(url) {
        MessageBuilder.status(`Connecting to ${extractHostname(url)} ...`).into(
            this
        );
    }

    onOPEN() {
        MessageBuilder.status(`Connection established.`).into(this);
    }

    onNAMES(data) {
        MessageBuilder.info(
            `Currently serving ${data["connectioncount"] ||
                0} connections and ${data["users"].length} users.`
        ).into(this);
        if (this.showmotd) {
            this.cmdHINT([Math.floor(Math.random() * hintstrings.size)]);
            this.showmotd = false;
        }
    }

    onQUIT(data) {
        const normalized = data.nick.toLowerCase();
        if (this.users.has(normalized)) {
            this.users.delete(normalized);
            this.autocomplete.remove(data.nick);
        }
    }

    onMSG(data) {
        let textonly = Chat.extractTextOnly(data.data);
        const isemote =
            this.emoticons.has(textonly) ||
            this.emoteswithsuffixes.has(textonly);
        const win = this.mainwindow;
        if (
            isemote &&
            win.lastmessage !== null &&
            Chat.extractTextOnly(win.lastmessage.message) === textonly
        ) {
            if (win.lastmessage.type === MessageTypes.EMOTE) {
                this.mainwindow.lock();
                win.lastmessage.incEmoteCount();
                this.mainwindow.unlock();
            } else {
                win.lastmessage.ui.remove();
                MessageBuilder.emote(textonly, data.timestamp, 2).into(this);
            }
        } else if (!this.resolveMessage(data.nick, data.data)) {
            this.autocomplete.promoteOneLastSeen(data.nick);
            const user = this.users.get(data.nick.toLowerCase());
            MessageBuilder.message(data.data, user, data.timestamp).into(this);
        }
    }

    onMUTE(data) {
        // data.data is the nick which has been banned, no info about duration
        if (this.user.username.toLowerCase() === data.data.toLowerCase()) {
            MessageBuilder.command(
                `You have been muted by ${data.nick}.`,
                data.timestamp
            ).into(this);
        } else {
            MessageBuilder.command(
                `${data.data} muted by ${data.nick}.`,
                data.timestamp
            ).into(this);
        }
        this.censor(data.data);
    }

    onUNMUTE(data) {
        if (this.user.username.toLowerCase() === data.data.toLowerCase()) {
            MessageBuilder.command(
                `You have been unmuted by ${data.nick}.`,
                data.timestamp
            ).into(this);
        } else {
            MessageBuilder.command(
                `${data.data} unmuted by ${data.nick}.`,
                data.timestamp
            ).into(this);
        }
    }

    onBAN(data) {
        // data.data is the nick which has been banned, no info about duration
        if (this.user.username.toLowerCase() === data.data.toLowerCase()) {
            MessageBuilder.command(
                `You have been banned by ${data.nick}. Check your profile for more information.`,
                data.timestamp
            ).into(this);
            this.cmdBANINFO();
        } else {
            MessageBuilder.command(
                `${data.data} banned by ${data.nick}.`,
                data.timestamp
            ).into(this);
        }
        this.censor(data.data);
    }

    onUNBAN(data) {
        if (this.user.username.toLowerCase() === data.data.toLowerCase()) {
            MessageBuilder.command(
                `You have been unbanned by ${data.nick}.`,
                data.timestamp
            ).into(this);
        } else {
            MessageBuilder.command(
                `${data.data} unbanned by ${data.nick}.`,
                data.timestamp
            ).into(this);
        }
    }

    // NOTE this is an event that the chat server sends `ERR "$error"`
    // not to be confused with an error the chat.source may send onSOCKETERROR.
    onERR(data) {
        if (data === "toomanyconnections" || data === "banned") {
            this.source.retryOnDisconnect = false;
        }
        MessageBuilder.error(errorstrings.get(data) || data).into(
            this,
            this.getActiveWindow()
        );
    }

    onSOCKETERROR(e) {
        // There is no information on the Error event of the socket.
        // We rely on the socket close event to tell us more about what happened.
        // MessageBuilder.error(errorstrings.get('socketerror')).into(this, this.getActiveWindow())
        // console.error(e)
    }

    onSUBONLY(data) {
        const submode = data.data === "on" ? "enabled" : "disabled";
        MessageBuilder.command(
            `Subscriber only mode ${submode} by ${data.nick}`,
            data.timestamp
        ).into(this);
    }

    onBROADCAST(data) {
        MessageBuilder.broadcast(data.data, data.timestamp).into(this);
    }

    onPRIVMSGSENT(data) {
        if (
            this.mainwindow.visible &&
            !this.settings.get("showhispersinchat")
        ) {
            MessageBuilder.info("Your message has been sent.").into(this);
        }

        const normalized = data.targetNick.toLowerCase();

        const msg = {
            data: data.data,
            nick: this.user.nick,
            timestamp: Date.now(),
            messageid: -1,
        };
        this.whisperStore.append(normalized, data.targetNick, msg);

        if (this.mainwindow.visible &&
            this.settings.get("showhispersinchat")) {
            // show outgoing private messages in chat. Message id unused.
            MessageBuilder.whisperoutgoing(
                data.data,
                this.user,
                data.targetNick,
                Date.now(),
                data.messageid
            ).into(this);
        }

        const win = this.getWindow(normalized);
        if (win) {
            MessageBuilder.message(msg.data, this.user).into(this, win);
        }

        const conv = this.whispers.get(normalized);
        if (win === this.getActiveWindow()) {
            this.whisperStore.markRead(normalized);
        } else {
            conv.unread++;
        }

        this.menus.get("whisper-users").redraw();
        this.redrawWindowIndicators();
    }

    onPRIVMSG(data) {
        const normalized = data.nick.toLowerCase();
        if (!this.ignored(normalized, data.data)) {
            if (!this.whispers.has(normalized)) {
                this.whispers.set(normalized, {
                    nick: data.nick,
                    unread: 0,
                    open: false
                });
            }

            this.whisperStore.append(normalized, data.nick, data);

            const conv = this.whispers.get(normalized);
            const user = this.users.get(normalized) || new ChatUser(data.nick);
            const messageid = data.hasOwnProperty("messageid")
                ? data["messageid"]
                : null;

            if (this.settings.get("showhispersinchat")) {
                MessageBuilder.whisper(
                    data.data,
                    user,
                    this.user.username,
                    data.timestamp,
                    messageid
                ).into(this);
            }

            if (this.settings.get("notificationwhisper") && this.ishidden) {
                Chat.showNotification(
                    `${data.nick} whispered ...`,
                    data.data,
                    data.timestamp,
                    this.settings.get("notificationtimeout")
                );
            }

            if ((this.settings.get("soundnotificationwhisper") || this.settings.get("soundnotificationhighlight")) && this.ishidden) {
                // play sound
                notificationSound.play();
            }

            const win = this.getWindow(normalized);
            if (win) {
                MessageBuilder.historical(data.data, user, data.timestamp).into(
                    this,
                    win
                );
            }

            if (win === this.getActiveWindow()) {
                this.whisperStore.markRead(normalized);
            } else {
                conv.unread++;
            }

            this.menus.get("whisper-users").redraw();
            this.redrawWindowIndicators();
        }
    }

    onVIEWERSTATE({ nick, online, channel }) {
        const normalized = nick.toLowerCase();
        let viewerState = this.viewerStates.get(normalized);
        if (!online) {
            if (viewerState) {
                viewerState.channel = null;
                this.viewerStates.delete(normalized);
            }
            return;
        }

        if (!viewerState) {
            viewerState = this.addViewerState(nick);
        }
        viewerState.channel = channel;
    }

    /**
     * COMMANDS
     */

    cmdSEND(str) {
        if (str !== "") {
            const win = this.getActiveWindow();

            const isme = str.substring(0, 4).toLowerCase() === "/me ";
            const iscommand =
                !isme &&
                str.substring(0, 1) === "/" &&
                str.substring(0, 2) !== "//";

            // strip off `/` if message starts with `//`
            str = str.substring(0, 2) === "//" ? str.substring(1) : str;

            let splittedStr = str.split(" ");
            this.autocomplete.promoteManyLastUsed(splittedStr);
            // COMMAND
            if (iscommand) {
                const command = iscommand ? splittedStr[0] : "";

                const normalized = command.substring(1).toUpperCase();
                if (win !== this.mainwindow && normalized !== "EXIT") {
                    MessageBuilder.error(
                        `No commands in private windows. Try /exit`
                    ).into(this, win);
                } else if (this.control.listeners.has(normalized)) {
                    const parts = (
                        str.substring(command.length + 1) || ""
                    ).match(/([^ ]+)/g);
                    this.control.emit(normalized, parts || []);
                } else {
                    MessageBuilder.error(`Unknown command. Try /help`).into(
                        this,
                        win
                    );
                }
                this.inputhistory.add(str);
            } else if (win !== this.mainwindow) {
                // WHISPER
                this.source.send("PRIVMSG", { nick: win.label, data: str });
            } else {
                // MESSAGE
                this.source.send("MSG", { data: str });
                this.inputhistory.add(str);
                if(ChatStore.read('chat.unsentMessage') !== null) ChatStore.write('chat.unsentMessage', null);
            }
        }
    }

    cmdEMOTES() {
        MessageBuilder.info(
            `Available emoticons: ${[...this.emoticons].join(", ")}.`
        ).into(this);
    }

    cmdHELP() {
        let str = `Available commands: \r`;
        commandsinfo.forEach((a, k) => {
            str += ` /${k} - ${a.desc} \r`;
        });
        MessageBuilder.info(str).into(this);
    }

    cmdHINT(parts) {
        const arr = [...hintstrings];
        const i = parts && parts[0] ? parseInt(parts[0]) - 1 : -1;
        if (i > 0 && i < hintstrings.size) {
            MessageBuilder.info(arr[i][1]).into(this);
        } else {
            if (
                this.lasthintindex === undefined ||
                this.lasthintindex === arr.length - 1
            ) {
                this.lasthintindex = 0;
            } else {
                this.lasthintindex++;
            }
            MessageBuilder.info(arr[this.lasthintindex][1]).into(this);
        }
    }

    cmdIGNORE(parts) {
        const username = parts[0] || null;
        if (!username) {
            if (this.ignoring.size <= 0) {
                MessageBuilder.info("Your ignore list is empty").into(this);
            } else {
                MessageBuilder.info(
                    `Ignoring the following people: ${Array.from(
                        this.ignoring.values()
                    ).join(", ")}`
                ).into(this);
            }
        } else if (!nickregex.test(username)) {
            MessageBuilder.info("Invalid nick - /ignore <nick>").into(this);
        } else if (
            username.toLowerCase() === this.user.username.toLowerCase()
        ) {
            MessageBuilder.info("Can't ignore yourself").into(this);
        } else {
            this.ignore(username, true);
            this.autocomplete.remove(username);
            this.removeMessageByNick(username);
            MessageBuilder.status(`Ignoring ${username}`).into(this);
        }
    }

    cmdUNIGNORE(parts) {
        const username = parts[0] || null;
        if (!username || !nickregex.test(username)) {
            MessageBuilder.error("Invalid nick - /ignore <nick>").into(this);
        } else {
            this.ignore(username, false);
            MessageBuilder.status(
                `${username} has been removed from your ignore list`
            ).into(this);
        }
    }

    cmdMUTE(parts) {
        if (parts.length === 0) {
            MessageBuilder.info(`Usage: /mute <nick>[ <time>]`).into(this);
        } else if (!nickregex.test(parts[0])) {
            MessageBuilder.info(`Invalid nick - /mute <nick>[ <time>]`).into(
                this
            );
        } else {
            const duration = parts[1] ? Chat.parseTimeInterval(parts[1]) : null;
            if (duration && duration > 0) {
                this.source.send("MUTE", {
                    data: parts[0],
                    duration: duration
                });
            } else {
                this.source.send("MUTE", { data: parts[0] });
            }
        }
    }

    cmdBAN(parts, command) {
        if (parts.length === 0 || parts.length < 3) {
            MessageBuilder.info(
                `Usage: /${command} <nick> <time> <reason> (time can be 'permanent')`
            ).into(this);
        } else if (!nickregex.test(parts[0])) {
            MessageBuilder.info("Invalid nick").into(this);
        } else if (!parts[2]) {
            MessageBuilder.error("Providing a reason is mandatory").into(this);
        } else {
            let payload = {
                nick: parts[0],
                reason: parts.slice(2, parts.length).join(" ")
            };
            if (command === "IPBAN" || /^perm/i.test(parts[1])) {
                payload.ispermanent =
                    command === "IPBAN" || /^perm/i.test(parts[1]);
            } else {
                payload.duration = Chat.parseTimeInterval(parts[1]);
            }
            this.source.send("BAN", payload);
        }
    }

    cmdUNBAN(parts, command) {
        if (parts.length === 0) {
            MessageBuilder.info(`Usage: /${command} nick`).into(this);
        } else if (!nickregex.test(parts[0])) {
            MessageBuilder.info("Invalid nick").into(this);
        } else {
            this.source.send(command, { data: parts[0] });
        }
    }

    cmdSUBONLY(parts, command) {
        if (/on|off/i.test(parts[0])) {
            this.source.send(command.toUpperCase(), {
                data: parts[0].toLowerCase()
            });
        } else {
            MessageBuilder.error(
                `Invalid argument - /${command.toLowerCase()} on | off`
            ).into(this);
        }
    }

    cmdMAXLINES(parts, command) {
        if (parts.length === 0) {
            MessageBuilder.info(
                `Maximum lines stored: ${this.settings.get("maxlines")}`
            ).into(this);
            return;
        }
        const newmaxlines = Math.abs(parseInt(parts[0], 10));
        if (!newmaxlines) {
            MessageBuilder.info(
                `Invalid argument - /${command} is expecting a number`
            ).into(this);
        } else {
            this.settings.set("maxlines", newmaxlines);
            MessageBuilder.info(
                `Current maximum lines: ${this.settings.get("maxlines")}`
            ).into(this);
            this.applySettings();
        }
    }

    cmdHIGHLIGHT(parts, command) {
        const highlights = this.settings.get("highlightnicks");
        if (parts.length === 0) {
            if (highlights.length > 0) {
                MessageBuilder.info(
                    "Currently highlighted users: " + highlights.join(",")
                ).into(this);
            } else {
                MessageBuilder.info(`No highlighted users`).into(this);
            }
            return;
        }
        if (!nickregex.test(parts[0])) {
            MessageBuilder.error(`Invalid nick - /${command} nick`).into(this);
        }
        const nick = parts[0].toLowerCase();
        const i = highlights.indexOf(nick);
        switch (command) {
            case "UNHIGHLIGHT":
                if (i !== -1) highlights.splice(i, 1);
                this.ui
                    .find(`.msg-user[data-username="${nick}"]`)
                    .removeClass("msg-highlight");
                break;
            case "HIGHLIGHT":
                if (i === -1) highlights.push(nick);
                this.ui
                    .find(`.msg-user[data-username="${nick}"]`)
                    .addClass("msg-highlight");
                break;
        }
        MessageBuilder.info(
            command.toUpperCase() === "HIGHLIGHT"
                ? `Highlighting ${nick}`
                : `No longer highlighting ${nick}`
        ).into(this);
        this.settings.set("highlightnicks", highlights);
        this.applySettings();
    }

    cmdTIMESTAMPFORMAT(parts) {
        if (parts.length === 0) {
            MessageBuilder.info(
                `Current format: ${this.settings.get(
                    "timestampformat"
                )} (the default is 'HH:mm', for more info: http://momentjs.com/docs/#/displaying/format/)`
            ).into(this);
        } else {
            const format = parts.slice(1, parts.length);
            if (!/^[a-z :.,-\\*]+$/i.test(format)) {
                MessageBuilder.error(
                    "Invalid format, see: http://momentjs.com/docs/#/displaying/format/"
                ).into(this);
            } else {
                MessageBuilder.info(
                    `New format: ${this.settings.get("timestampformat")}`
                ).into(this);
                this.settings.set("timestampformat", format);
                this.applySettings();
            }
        }
    }

    cmdBROADCAST(parts) {
        this.source.send("BROADCAST", { data: parts.join(" ") });
    }

    cmdWHISPER(parts) {
        if (!parts[0] || !nickregex.test(parts[0])) {
            MessageBuilder.error("Invalid nick - /msg nick message").into(this);
        } else if (
            parts[0].toLowerCase() === this.user.username.toLowerCase()
        ) {
            MessageBuilder.error("Cannot send a message to yourself").into(
                this
            );
        } else {
            const data = parts.slice(1, parts.length).join(" ");
            const targetnick = parts[0];
            this.source.send("PRIVMSG", { nick: targetnick, data: data });
        }
    }

    cmdCONNECT(parts) {
        this.source.connect(parts[0]);
    }

    createNewClass(color) {
        if (color[0] === "#") {
            color = color.substring(1);
            var css =
                    ".msg-tagged-" +
                    color +
                    ":before{ background-color: #" +
                    color +
                    "; }",
                head =
                    document.head || document.getElementsByTagName("head")[0],
                style = document.getElementById("hexColors");

            if (style === null) {
                style = document.createElement("style");
                style.id = "hexColors";
                style.type = "text/css";
                head.appendChild(style);
            }
            if (style.innerHTML.indexOf(css) === -1) {
                style.appendChild(document.createTextNode(css));
            }
        }
    }

    rebuildHexColorStyles(map) {
        map.forEach(color => {
            this.createNewClass(color);
        });
    }

    cmdTAG(parts) {
        const colorinfo = `Preset colors: ${tagcolors.join(", ")}, or \`/tag user #HEXCODE\``
        if (parts.length === 0) {
            if (this.taggednicks.size > 0) {
                MessageBuilder.info(
                    `Tagged nicks: ${[...this.taggednicks.keys()].join(
                        ","
                    )}. ${colorinfo}`
                ).into(this);
            } else {
                MessageBuilder.info(
                    `No tagged nicks. ${colorinfo}`
                ).into(this);
            }
            return;
        }
        if (!nickregex.test(parts[0])) {
            MessageBuilder.error("Invalid nick - /tag <nick> <color>").into(
                this
            );
            return;
        }
        const n = parts[0].toLowerCase();
        if (!this.users.has(n)) {
            MessageBuilder.command(
                "The user you tagged is currently not in chat."
            ).into(this);
        }

        var color = parts[1];
        if (color[0] === "#") {
            this.mainwindow
                .getlines(`.msg-user[data-username="${n}"]`)
                .removeClass(Chat.removeClasses("msg-tagged"))
                .addClass(`msg-tagged msg-tagged-${color.substring(1)}`);
            this.createNewClass(color);
        } else {
            color =
                parts[1] && tagcolors.indexOf(parts[1]) !== -1
                    ? parts[1]
                    : tagcolors[Math.floor(Math.random() * tagcolors.length)];

            this.mainwindow
                .getlines(`.msg-user[data-username="${n}"]`)
                .removeClass(Chat.removeClasses("msg-tagged"))
                .addClass(`msg-tagged msg-tagged-${color}`);
        }

        this.taggednicks.set(n, color);
        MessageBuilder.info(`Tagged ${parts[0]} as ${color}`).into(this);

        this.settings.set("taggednicks", [...this.taggednicks]);
        // TODO this reinitialized the whole user menu on a tag change. We could only modify the right entry here instead. Same in cmdUNTAG().
        this.menus.get("users").addAll();
        this.applySettings();
    }

    cmdUNTAG(parts) {
        const colorinfo = `Preset colors: ${tagcolors.join(", ")}, or \`/tag user #HEXCODE\``
        if (parts.length === 0) {
            if (this.taggednicks.size > 0) {
                MessageBuilder.info(
                    `Tagged nicks: ${[...this.taggednicks.keys()].join(
                        ","
                    )}. ${colorinfo}`
                ).into(this);
            } else {
                MessageBuilder.info(
                    `No tagged nicks. ${colorinfo}`
                ).into(this);
            }
            return;
        }
        if (!nickregex.test(parts[0])) {
            MessageBuilder.error("Invalid nick - /untag <nick> <color>").into(
                this
            );
            return;
        }
        const n = parts[0].toLowerCase();
        this.taggednicks.delete(n);
        this.mainwindow
            .getlines(`.msg-chat[data-username="${n}"]`)
            .removeClass(Chat.removeClasses("msg-tagged"));
        MessageBuilder.info(`Un-tagged ${n}`).into(this);
        this.settings.set("taggednicks", [...this.taggednicks]);
        this.menus.get("users").addAll();
        this.applySettings();
    }

    cmdHIDEEMOTE(parts, command) {
        const hiddenEmotes = this.settings.get("hiddenemotes");
        if (parts.length === 0) {
            if (hiddenEmotes.length > 0) {
                MessageBuilder.info(
                    "Currently hidden emotes: " + hiddenEmotes.join(",")
                ).into(this);
            } else {
                MessageBuilder.info(`No hidden emotes`).into(this);
            }
            return;
        }
        if (!this.emoticons.has(parts[0])) {
            MessageBuilder.info("Invalid emote. - /hideemote <emote>").into(
                this
            );
            return;
        }
        const emote = parts[0];
        const i = hiddenEmotes.indexOf(emote);
        const emoteSpans = this.ui.find(`.chat-emote.chat-emote-${emote}`);
        const emoteContainers = this.ui.find(`.generify-emote-${emote}`);
        switch (command) {
            case "HIDEEMOTE":
                if (i === -1) hiddenEmotes.push(emote);
                emoteContainers
                    .removeClass()
                    .addClass(`generify-container generify-emote-${emote}`);
                emoteSpans.addClass("hidden-emote");
                break;
            case "UNHIDEEMOTE":
                if (i !== -1) hiddenEmotes.splice(i, 1);
                emoteSpans.removeClass(`hidden-emote`);
                emoteContainers.addClass(
                    emoteContainers.attr("data-modifiers")
                );
                break;
        }
        MessageBuilder.info(
            command.toUpperCase() === "HIDEEMOTE"
                ? `Now hiding ${emote}.`
                : `No longer hiding ${emote}.`
        ).into(this);
        this.settings.set("hiddenemotes", hiddenEmotes);
        this.applySettings();
    }

    cmdBANINFO() {
        MessageBuilder.info("Loading ban info ...").into(this);
        $.ajax({ url: `${API_URI}/api/chat/me/ban` })
            .done(d => {
                if (d === "bannotfound") {
                    MessageBuilder.info(
                        `You have no active bans. Thank you.`
                    ).into(this);
                    return;
                }
                const b = $.extend({}, banstruct, d);
                const by = b.username ? b.username : "Chat";
                const start = moment(b.starttimestamp).format(
                    DATE_FORMATS.FULL
                );
                if (!b.endtimestamp) {
                    MessageBuilder.info(
                        `Permanent ban by ${by} started on ${start}.`
                    ).into(this);
                } else {
                    const end = moment(b.endtimestamp).calendar();
                    MessageBuilder.info(
                        `Temporary ban by ${by} started on ${start} and ending by ${end}`
                    ).into(this);
                }
                if (b.reason) {
                    const m = MessageBuilder.message(
                        b.reason,
                        new ChatUser({ nick: by }),
                        b.starttimestamp
                    );
                    m.historical = true;
                    m.into(this);
                }
                MessageBuilder.info(`End of ban information`).into(this);
            })
            .fail(() =>
                MessageBuilder.error(
                    "Error loading ban info. Check your profile."
                ).into(this)
            );
    }

    cmdEXIT() {
        const win = this.getActiveWindow();
        if (win !== this.mainwindow) {
            this.windowToFront(this.mainwindow.name);
            this.removeWindow(win.name);
        }
    }

    openConversation(nick) {
        const normalized = nick.toLowerCase();

        const conv = this.whispers.get(normalized);
        if (conv) {
            ChatMenu.closeMenus(this);
            this.windows.has(normalized) ||
                this.createConversation(conv, nick, normalized);
            this.windowToFront(normalized);
            this.menus.get("whisper-users").redraw();
            this.input.focus();
        }
    }

    createConversation(conv, nick, normalized) {
        const user = this.users.get(normalized) || new ChatUser({ nick });

        const win = new ChatWindow(
            normalized,
            "chat-output-whisper",
            user.nick
        ).into(this);
        let once = true;
        win.on("show", () => {
            if (once) {
                once = false;
                MessageBuilder.info(
                    `Messages between you and ${nick}\r` /* +
                    `Enter /close to exit this conversation, click the round icons below and center of the chat input to toggle between them, \r`+
                    `or close them from the whispers menu.\r`+
                    `Loading messages ...` */
                ).into(this, win);
                const data = this.whisperStore.loadThread(user.nick.toLowerCase());
                if (data.length > 0) {
                    const date = moment(data[0].timestamp).format(
                        DATE_FORMATS.FULL
                    );
                    MessageBuilder.info(`Last message ${date}`).into(
                        this,
                        win
                    );
                    data.forEach(e => {
                        const user =
                            this.users.get(e["nick"].toLowerCase()) ||
                            new ChatUser({ nick: e["nick"] });
                        MessageBuilder.historical(
                            e.data,
                            user,
                            e.timestamp
                        ).into(this, win);
                    });
                }
            }
            conv.unread = 0;
            conv.open = true;
        });
        win.on("hide", () => {
            conv.open = false;
        });
    }

    openViewerStateStream(username) {
        const userState = this.viewerStates.get(username)
        const path = "https://strims.gg/"

        if (userState !== undefined && userState.channel !== undefined) {
            if (userState.channel.path !== "") {
                window.open(path + userState.channel.path)
            } else {
                window.open(path + userState.channel.service + '/' + userState.channel.channel)
            }
        }
    }

    static extractTextOnly(msg) {
        return (msg.substring(0, 4).toLowerCase() === "/me "
            ? msg.substring(4)
            : msg
        ).trim();
    }

    static extractNicks(text) {
        let nicks = new Set();
        let match;
        // eslint-disable-next-line no-cond-assign
        while ((match = nickmessageregex.exec(text))) {
            nicks.add(match[1]);
        }
        return [...nicks];
    }

    static removeClasses(search) {
        return function(i, c) {
            return (
                c.match(new RegExp(`\\b${search}(?:[A-z-0-9]+)?\\b`, "g")) || []
            ).join(" ");
        };
    }

    static isArraysEqual(a, b) {
        return !a || !b
            ? a.length !== b.length ||
                  a.sort().toString() !== b.sort().toString()
            : false;
    }

    static showNotification(title, message, timestamp, timeout = false) {
        if (Notification.permission === "granted") {
            const n = new Notification(title, {
                body: message,
                tag: `sgg${timestamp}`,
                icon: require("../img/notify-icon.png"),
                dir: "auto"
            });
            if (timeout) setTimeout(() => n.close(), 8000);
        }
    }

    static makeSafeForRegex(str) {
        return str.trim().replace(regexsafe, "\\$&");
    }

    static parseTimeInterval(str) {
        let nanoseconds = 0;

        let units = {
            s: 1000000000,
            sec: 1000000000,
            secs: 1000000000,
            second: 1000000000,
            seconds: 1000000000,

            m: 60000000000,
            min: 60000000000,
            mins: 60000000000,
            minute: 60000000000,
            minutes: 60000000000,

            h: 3600000000000,
            hr: 3600000000000,
            hrs: 3600000000000,
            hour: 3600000000000,
            hours: 3600000000000,

            d: 86400000000000,
            day: 86400000000000,
            days: 86400000000000
        };
        str.replace(regextime, function($0, number, unit) {
            number *= unit ? units[unit.toLowerCase()] || units.s : units.s;
            nanoseconds += +number;
        });
        return nanoseconds;
    }
}

export default Chat;

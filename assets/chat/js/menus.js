/* global $, Notification */

import ChatUser from "./user";
import ChatScrollPlugin from "./scroll";
import UserFeatures from "./features";
import EventEmitter from "./emitter";
import debounce from "throttle-debounce/debounce";
import { isKeyCode, KEYCODES } from "./const";
import { setStorage, getStorage } from "./transfer";

function buildEmote(emote) {
    return `<div class="emote"><span title="${emote}" class="chat-emote chat-emote-${emote}">${emote}</span></div>`;
}
function getSettingValue(e) {
    if (e.getAttribute("type") === "checkbox") {
        const val = $(e).is(":checked");
        return Boolean(e.hasAttribute("data-opposite") ? !val : val);
    } else if (
        e.getAttribute("type") === "text" ||
        e.nodeName.toLocaleLowerCase() === "select"
    ) {
        return $(e).val();
    }
    return undefined;
}
function setSettingValue(e, val) {
    if (e.getAttribute("type") === "checkbox") {
        $(e).prop(
            "checked",
            Boolean(e.hasAttribute("data-opposite") ? !val : val)
        );
    } else if (
        e.getAttribute("type") === "text" ||
        e.nodeName.toLocaleLowerCase() === "select"
    ) {
        $(e).val(val);
    }
}
function userComparator(a, b) {
    const u1 = this.chat.users.get(
        a.getAttribute("data-username").toLowerCase()
    );
    const u2 = this.chat.users.get(
        b.getAttribute("data-username").toLowerCase()
    );
    if (!u1 || !u2) return 0;
    let v1, v2;

    v1 = u1.hasFeature(UserFeatures.ADMIN) || u1.hasFeature(UserFeatures.VIP);
    v2 = u2.hasFeature(UserFeatures.ADMIN) || u2.hasFeature(UserFeatures.VIP);
    if (v1 > v2) return -1;
    if (v1 < v2) return 1;

    v1 = u1.hasFeature(UserFeatures.BOT2);
    v2 = u2.hasFeature(UserFeatures.BOT2);
    if (v1 > v2) return 1;
    if (v1 < v2) return -1;
    v1 = u1.hasFeature(UserFeatures.BOT);
    v2 = u2.hasFeature(UserFeatures.BOT);
    if (v1 > v2) return 1;
    if (v1 < v2) return -1;

    v1 =
        u1.hasFeature(UserFeatures.BROADCASTER) ||
        u1.hasFeature(UserFeatures.BROADCASTER);
    v2 =
        u2.hasFeature(UserFeatures.BROADCASTER) ||
        u2.hasFeature(UserFeatures.BROADCASTER);
    if (v1 > v2) return -1;
    if (v1 < v2) return 1;

    v1 =
        u1.hasFeature(UserFeatures.SUBSCRIBER) ||
        u1.hasFeature(UserFeatures.SUBSCRIBER);
    v2 =
        u2.hasFeature(UserFeatures.SUBSCRIBER) ||
        u2.hasFeature(UserFeatures.SUBSCRIBER);
    if (v1 > v2) return -1;
    if (v1 < v2) return 1;

    if (u1.nick < u2.nick) return -1;
    if (u1.nick > u2.nick) return 1;
    return 0;
}

class ChatMenu extends EventEmitter {
    constructor(ui, btn, chat) {
        super();
        this.ui = ui;
        this.btn = btn;
        this.chat = chat;
        this.visible = false;
        this.shown = false;
        this.ui.find(".scrollable").each((i, e) => {
            this.scrollplugin = new ChatScrollPlugin(chat, e);
        });
        this.ui.on("click", ".close,.menu-close", this.hide.bind(this));
        this.btn.on("click", e => {
            if (this.visible) chat.input.focus();
            this.toggle(e);
            return false;
        });
    }

    show() {
        if (!this.visible) {
            this.visible = true;
            this.shown = true;
            this.btn.addClass("active");
            this.ui.addClass("active");
            this.redraw();
            this.emit("show");
        }
    }

    hide() {
        if (this.visible) {
            this.visible = false;
            this.btn.removeClass("active");
            this.ui.removeClass("active");
            this.emit("hide");
        }
    }

    toggle() {
        const wasVisible = this.visible;
        ChatMenu.closeMenus(this.chat);
        if (!wasVisible) this.show();
    }

    redraw() {
        if (this.visible && this.scrollplugin) this.scrollplugin.reset();
    }

    static closeMenus(chat) {
        chat.menus.forEach(m => m.hide());
    }
}

class ChatSettingsMenu extends ChatMenu {
    constructor(ui, btn, chat) {
        super(ui, btn, chat);

        this.enableNotificationsBtn = this.ui.find(".enable-notifications-btn");
        this.enableNotificationsBtn.on("click", () => {
            this.notificationPermission().then(() => this.updateNotification());
        });
        this.notificationsFieldset = this.ui.find(
            ".notifications-settings-fieldset"
        );

        this.importSettingsInput = this.ui.find("#import-settings-Label");
        this.importSettingsInput.on("change", e => {
            var input = e.target;
            setStorage(input.files[0], chat);

            this.importSettingsInput.text("Imported!");
            this.importSettingsInput.css("color", "green");
        });
        this.exportSettingsInput = this.ui.find("#export-settings-Btn");
        this.exportSettingsInput.on("click", e => {
            getStorage();
        });

        this.ui.on("change", 'input[type="checkbox"],select', e =>
            this.onSettingsChange(e)
        );
        this.ui.on("keypress blur", 'textarea[name="customhighlight"]', e =>
            this.onCustomHighlightChange(e)
        );
    }

    onCustomHighlightChange(e) {
        if (!isKeyCode(e, KEYCODES.ENTER)) return; // not Enter
        let data = $(e.target)
            .val()
            .toString()
            .split(",")
            .map(s => s.trim());
        this.chat.settings.set("customhighlight", [...new Set(data)]);
        this.chat.applySettings(false);
        this.chat.commitSettings();
    }

    onSettingsChange(e) {
        const val = getSettingValue(e.target);
        const name = e.target.getAttribute("name");
        if (val !== undefined) {
            switch (name) {
                case "profilesettings":
                    if (!val && this.chat.authenticated)
                        $.ajax({
                            url: `${API_URI}/api/chat/me/settings`,
                            method: "delete"
                        });
                    break;
            }
            this.chat.settings.set(name, val);
            this.chat.applySettings(false);
            this.chat.commitSettings();
        }
    }

    show() {
        if (!this.visible) {
            this.ui
                .find("input,select")
                .get()
                .filter(e => this.chat.settings.has(e.getAttribute("name")))
                .forEach(e =>
                    setSettingValue(
                        e,
                        this.chat.settings.get(e.getAttribute("name"))
                    )
                );
            this.ui
                .find('textarea[name="customhighlight"]')
                .val(this.chat.settings.get("customhighlight") || "");
            this.updateNotification();
        }
        super.show();
    }

    updateNotification() {
        if (Notification.permission === "granted") {
            this.enableNotificationsBtn.text("Permission granted ✓");
            this.enableNotificationsBtn.attr("disabled", true);
            this.notificationsFieldset.attr("disabled", false);
        } else {
            this.enableNotificationsBtn.text("Enable Notifications");
            this.enableNotificationsBtn.attr("disabled", false);
            this.notificationsFieldset.attr("disabled", true);
        }
    }

    notificationPermission() {
        return new Promise((resolve, reject) => {
            // Whitelist of browsers that allow iframes to make notification
            // permission requests.
            // See issue github.com/MemeLabs/chat-gui/issues/12
            const browserWhitelist = new Set(["firefox", "edge"]);
            const browser = require("detect-browser").detect();
            const isOnWhitelist = browser && browserWhitelist.has(browser.name);

            if (!isOnWhitelist || Notification.permission === "denied") {
                window.open(
                    "notification-request.html",
                    "strimsgg_notification_request",
                    "width=585,height=340,scrollbars=no,toolbar=no"
                );

                const onMessage = event => {
                    if (event.data.name === "notification-request-done") {
                        window.removeEventListener("message", onMessage);
                        resolve(Notification.permission);
                    }
                };

                window.addEventListener("message", onMessage);
            } else {
                Notification.requestPermission(resolve);
            }
        });
    }
}

class ChatUserMenu extends ChatMenu {
    constructor(ui, btn, chat) {
        super(ui, btn, chat);
        this.searchterm = "";
        this.searchcount = 0;
        this.totalcount = 0;
        this.header = this.ui.find("h5 span");
        this.container = this.ui.find(".content:first");
        this.searchinput = this.ui.find(
            "#chat-user-list-search .form-control:first"
        );
        this.container.on("click", ".user", e =>
            this.chat.userfocus.toggleFocus(
                e.target.getAttribute("data-username")
            )
        );
        this.container.on("click", ".whisper-nick", e => {
            ChatMenu.closeMenus(this.chat);
            const value = this.chat.input
                .val()
                .toString()
                .trim();
            const username = $(e.target)
                .parent()
                .data("username");
            this.chat.input
                .val(value + (value === "" ? "" : " ") + username + " ")
                .focus();
            return false;
        });
        this.chat.source.on("JOIN", data => this.addAndRedraw(data.nick));
        this.chat.source.on("QUIT", data => this.removeAndRedraw(data.nick));
        this.chat.source.on("NAMES", data => this.addAll());
        this.searchinput.on(
            "keyup",
            debounce(100, () => {
                this.searchterm = this.searchinput.val();
                this.filter();
                this.redraw();
            })
        );
    }

    show() {
        super.show();
        this.searchinput.focus();
    }

    redraw() {
        if (this.visible) {
            const searching = this.searchterm.length > 0;
            if (searching && this.totalcount !== this.searchcount) {
                this.header.text(
                    `Users (${this.searchcount} out of ${this.totalcount})`
                );
            } else {
                this.header.text(`Users (${this.totalcount})`);
            }
            this.ui.toggleClass("search-in", searching);
        }
        super.redraw();
    }

    addAll() {
        this.totalcount = 0;
        this.container.empty();
        [...this.chat.users.keys()].forEach(username =>
            this.addElement(username)
        );
        this.sort();
        this.filter();
        this.redraw();
    }

    addAndRedraw(username) {
        if (!this.hasElement(username)) {
            this.addElement(username, true);
            this.filter();
            this.redraw();
        }
    }

    removeAndRedraw(username) {
        if (this.hasElement(username)) {
            this.removeElement(username);
            this.redraw();
        }
    }

    removeElement(username) {
        this.container.find(`.user[data-username="${username}"]`).remove();
        this.totalcount--;
    }

    addElement(username, sort = false) {
        let tag = this.chat.taggednicks.get(username.toLowerCase());
        tag = tag ? `msg-tagged msg-tagged-${tag}` : "";

        const user = this.chat.users.get(username.toLowerCase()),
            label =
                !user.username || user.username === ""
                    ? "Anonymous"
                    : user.username,
            features =
                user.features.length === 0
                    ? "nofeature"
                    : user.features.join(" "),
            usr = $(
                `<a data-username="${user.username}" class="user ${features} ${tag}">${label} <i class="fa fa-share-square whisper-nick"></i></a>`
            );
        if (sort && this.totalcount > 0) {
            // Insert item in the correct order (instead of resorting the entire list)
            const items = this.container.children(".user").get();
            let min = 0,
                max = items.length,
                index = Math.floor((min + max) / 2);
            while (max > min) {
                if (userComparator.apply(this, [usr[0], items[index]]) < 0)
                    max = index;
                else min = index + 1;
                index = Math.floor((min + max) / 2);
            }
            usr.insertAfter(items[index]);
        } else {
            this.container.append(usr);
        }
        this.totalcount++;
    }

    hasElement(username) {
        return (
            this.container.find('.user[data-username="' + username + '"]')
                .length > 0
        );
    }

    filter() {
        this.searchcount = 0;
        if (this.searchterm && this.searchterm.length > 0) {
            this.container
                .children(".user")
                .get()
                .forEach(a => {
                    const f =
                        a
                            .getAttribute("data-username")
                            .toLowerCase()
                            .indexOf(this.searchterm.toLowerCase()) >= 0;
                    $(a).toggleClass("found", f);
                    if (f) this.searchcount++;
                });
        } else {
            this.container.children(".user").removeClass("found");
        }
    }

    sort() {
        this.container
            .children(".user")
            .get()
            .sort(userComparator.bind(this))
            .forEach(a => a.parentNode.appendChild(a));
    }
}

class ChatEmoteMenu extends ChatMenu {
    constructor(ui, btn, chat) {
        super(ui, btn, chat);
        this.temotes = this.ui.find("#twitch-emotes");
        this.demotes = this.ui.find("#default-emotes");
        this.demotes.append([...this.chat.emoticons].map(buildEmote).join(""));
        this.ui.on("click", ".chat-emote", e => {
            ChatMenu.closeMenus(chat);
            this.selectEmote(e.currentTarget.innerText);
        });
    }

    show() {
        if (!this.visible) {
            this.chat.input.focus();
        }
        super.show();
    }

    selectEmote(emote) {
        let value = this.chat.input
            .val()
            .toString()
            .trim();
        this.chat.input
            .val(value + (value === "" ? "" : " ") + emote + " ")
            .focus()
            .trigger("input");
    }
}

class ChatWhisperUsers extends ChatMenu {
    constructor(ui, btn, chat) {
        super(ui, btn, chat);
        this.unread = 0;
        this.empty = $(`<span class="empty">No new whispers :(</span>`);
        this.notif = $(`<span id="chat-whisper-unread-indicator"></span>`);
        this.btn.append(this.notif);
        this.usersEl = ui.find("ul:first");
        // TODO removed until this functionality is restored on the backend
        //this.usersEl.on('click', '.user', e => chat.openConversation(e.target.getAttribute('data-username')));
        this.usersEl.on("click", ".remove", e =>
            this.removeConversation(e.target.getAttribute("data-username"))
        );
    }

    removeConversation(nick) {
        const normalized = nick.toLowerCase();
        this.chat.whispers.delete(normalized);
        this.chat.removeWindow(normalized);
        this.redraw();
    }

    updateNotification() {
        const wasunread = this.unread;
        this.unread = [...this.chat.whispers.entries()]
            .map(e => parseInt(e[1].unread))
            .reduce((a, b) => a + b, 0);
        if (wasunread < this.unread) {
            this.btn.addClass("ping");
            setTimeout(() => this.btn.removeClass("ping"), 2000);
        }
        this.notif.text(this.unread);
        this.notif.toggle(this.unread > 0);
        try {
            // Add the number of unread items to the window title.
            const t = window.parent.document.title.replace(/^\([0-9]+\) /, "");
            window.parent.document.title =
                this.unread > 0 ? `(${this.unread}) ${t}` : `${t}`;
        } catch (ignored) {
            console.error(ignored);
        }
    }

    redraw() {
        this.updateNotification(); // its always visible
        if (this.visible) {
            this.usersEl.empty();
            if (this.chat.whispers.size === 0) {
                this.usersEl.append(this.empty);
            } else {
                [...this.chat.whispers.entries()]
                    .sort((a, b) => {
                        if (a[1].unread === 0) return 1;
                        else if (b[1].unread === 0) return -1;
                        else if (a[1] === b[1]) return 0;
                    })
                    .forEach(e => this.addConversation(e[0], e[1].unread));
            }
        }
        super.redraw();
    }

    addConversation(nick, unread) {
        const user =
            this.chat.users.get(nick.toLowerCase()) || new ChatUser(nick);
        this.usersEl.append(`
            <li class="conversation unread-${unread}">
                <a data-username="${user.nick.toLowerCase()}" title="Hide" class="fa fa-times remove"></a>
                <a data-username="${user.nick.toLowerCase()}" class="user">${
            user.nick
        } <span class="badge">${unread}</span></a>
            </li>
        `);
    }
}

class ChatContextMenu {
    constructor(chat) {
        this.chat = chat
        this.ui = chat.output.find("#chat-user-contextmenu")
        this.isShown = false
        this.userElement = null
        this.permissionsLevels = ["anonymous","authenticated","moderator"]
        this.userLevel = this.getPermissionLevel()
        this.unownedPermissionLevels = this.getUnownedPermissions()

        this.chat.output.on("contextmenu", e => {
            if ($(e.target).is("a.user")) {
                this.show(e)
            }
        })
        this.chat.ui.on("click", e => {
            const isParent = (Object.values($(e.target).parents()).includes(this.ui[0]))
            if (!isParent && this.isShown === true) {
                this.hide()
            }
        })

        this.unownedPermissionLevels.forEach(level => {
            this.ui.find(`.contextmenu-level-${level}`).hide()
        })

        // this.addConditionalButton("contextmenu-viewerstate-newtab", (id, e) => {
        //     this.chat.openViewerStateStream(this.userElement.data("username"))
        // }, () => {
        //     const USERNAME = $(this.userElement.data("username"))
        //     const USER_VIEWERSTATE = this.chat.viewerState.get(USERNAME)

        //     if (USER_VIEWERSTATE !== undefined && USER_VIEWERSTATE.channel !== undefined) {
        //         return true
        //     }
        //     return false
        // })

        this.addButton("contextmenu-ignore", (id, e) => {
            this.chat.cmdIGNORE([this.userElement.data("username")])
        })
    }

    show(e) {
        e.preventDefault()
        this.ui.show()
        this.ui.css("left", event.pageX)
        this.ui.css("top", event.pageY)
        this.userElement = $(e.target).closest(".msg-chat")
        this.isShown = true
    }

    hide() {
        this.ui.hide()
        this.isShown = false
        this.userElement = null
    }

    addButton(id, onclick) {
        this.ui.find(`#${id}`).on("mouseup", e => {
            onclick(id, e)
            this.hide()
        })
    }

    // addConditionalButton(id, onclick, conditional) {
    //     this.ui.show(e => {
    //         if (!conditional()) {
    //             this.ui.find(`#${id}`).hide()
    //             return
    //         }
    //         this.addButton(id, onclick)
    //     })
    // }

    getPermissionLevel() {
        if (this.chat.user.hasFeature("moderator")) {
            return "moderator"
        }
        if (this.chat.authenticated) {
            return "authenticated"
        }
        return "anonymous"
    }

    getUnownedPermissions() {
        var levels = this.permissionsLevels
        levels.splice(0, this.permissionsLevels.indexOf(this.userLevel) + 1)
        return levels
    }
}

export {
    ChatMenu,
    ChatSettingsMenu,
    ChatUserMenu,
    ChatEmoteMenu,
    ChatWhisperUsers,
    ChatContextMenu
};

import {
    GENERIFY_OPTIONS,
    HALLOWEEN_RANDOM_EFFECTS,
    HALLOWEEN_RANDOM_DELAYS,
    HALLOWEEN_BLACKLIST,
    HAT_BLACKLIST,
    HAT_SPECIAL_BLACKLIST,
    DANK_WHITELIST
} from "./const";
import HtmlElement from "./htmlElement";

/** @var Array tlds */
const tlds = require("../../tld.json");
const gtld = "(?:" + tlds.join("|") + ")";
const el = document.createElement("div");

class HtmlTextFormatter {
    format(chat, str, message = null) {
        el.textContent = str;
        return el.innerHTML;
    }
}

// returns the chance to proc a halloween effect per day
// chance between 0 and 1
// to generate different exponential functions use: http://www.wolframalpha.com/input/?i=solve+a*b%5E26+%3D+6;+a*b%5E31%3D20 (e.g. day 26 to 31)
// http://www.wolframalpha.com/input/?i=1%2F5%5E(1%2F24)+*+(5%5E(1%2F24))%5Ex+from+1+to+25
function procChance() {
    const day = new Date(Date.now() - (12 * 60 * 60 * 1000)).getUTCDate();
    if (day <= 29) {
        // 1% at day 1
        // 2.5% at day 25
        return (
            (1 / 100) *
            ((1 / Math.pow(2.5, 1 / 24)) * Math.pow(Math.pow(2.5, 1 / 24), day))
        );
    } else if (day == 30) {
        return 0.05;
    } else if (day == 31) {
        return 0.15;
    }
    return 0;
}

// https://stackoverflow.com/a/34842797
function createHash(str) {
    return str
        .split("")
        .reduce(
            (prevHash, currVal) =>
                ((prevHash << 5) - prevHash + currVal.charCodeAt(0)) | 0,
            0
        );
}

// https://stackoverflow.com/questions/521295/javascript-random-seeds
function rng(seed) {
    var x = Math.sin(seed) * 10000;
    return Math.abs(x - Math.floor(x));
}

function getLastMsg(chat) {
    if (
        typeof chat["mainwindow"]["lastmessage"] === "undefined" ||
        chat["mainwindow"]["lastmessage"] === null
    ) {
        return "";
    }
    return chat["mainwindow"]["lastmessage"]["message"];
}

function genSeed(str, chat, i, timestamp) {
    const lastMsg = getLastMsg(chat);
    if (lastMsg == "") {
        return false;
    }
    // to prevent the same messages to proc the same effect the whole month,
    // make the seed depend on the current message, the prior message, and the current day/time.
    const day = new Date().getUTCDate();
    const hours = new Date().getUTCHours();
    const minutes = new Date().getUTCMinutes();
    const seed =
        createHash(lastMsg) +
        createHash(str) +
        i +
        day +
        hours +
        Math.floor(minutes / 5) +
        timestamp;
    return seed;
}

// proc depending on seed and procChance for the day.
// in some cases we want the chance to be lower, determined by punish.
function proc(seed, punish, chance) {
    var randomValue = rng(seed);
    if (punish) {
        // higher value lowers occurrence
        randomValue = randomValue * 2;
    }
    if (chance === 0) {
        return randomValue < procChance();
    }
    return randomValue < chance;
}

function getRandomInt(seed, max) {
    var x = Math.abs(Math.sin(seed) * 100); // increase the 100 if there are more than 100 effects
    return Math.floor(x) % max;
}

function getRandomHalloweenEffect(emote, seed) {
    if (HALLOWEEN_BLACKLIST.includes(emote)) {
        return "";
    }

    const delay =
        HALLOWEEN_RANDOM_DELAYS[
        getRandomInt(seed, HALLOWEEN_RANDOM_DELAYS.length)
        ];
    const effect =
        HALLOWEEN_RANDOM_EFFECTS[
        getRandomInt(seed, HALLOWEEN_RANDOM_EFFECTS.length)
        ];

    return `${delay} ${effect}`;
}

function isHalloween() {
    const today = new Date();
    // one UTC day grace period for america
    return (
        today.getUTCMonth() == 9 ||
        (today.getUTCMonth() == 10 && today.getUTCDate() == 1)
    );
}

function putHat(width, height, emote) {
    const today = new Date();

    if (HAT_BLACKLIST.includes(emote)) {
        return "";
    }

    if (
        today.getUTCMonth() == 3 &&
        (today.getUTCDate() == 13 || today.getUTCDate() == 14)
    ) {
        //birthday hat
        if (HAT_SPECIAL_BLACKLIST["bday"].includes(emote)) {
            return "";
        }
        return `<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA0AAAALCAYAAACksgdhAAABp0lEQVQoz4XNTUiTcQDH8e9//z3P nunc5itNfI0WRgwcBZZIlKkgvYgaeJU6RHiQAvUUz6WL1MGLh4JOpVCGRV0cMWtOKOhQIPgySDwM I821OZ0vW/t3zXD4vf0OH37wX2Wv5+NngiH1ZKr7MTmy/DuCoUsXaotjruXMcXZ1eev22ICXo7r4 8tVDR2BViUBS6eMLyj3y/pNpKkvOJ9NUlq+7dR0p5aBGj2LkGySlce5pUaA3J3rj/li1o9m9CEWT +wsex28MLU1cGQ+axsKFh6IfKtOm7E5cIk4odhbNKmipiZCSFs/C2t79Q1Hapl3L2jTai2fpr3rG 4k4tUarx58+xJa19Jx+9rTuAqs0Pxh+pt2aF5MX6VQa/DyLIcKPyM1fKwkixp988MTF6ADV4ps8P +cZtkn2yApxik3f1dxmJ9jC8PoBTJmksCjbPTvs6AARAxfPwpMij87Rng7X9EuZSp6gviPBty4va 3Eb9XKbVFabS+ms+EutskNap+LFh5+i9hL2gdNJ3h3a5ysyKn/LtPLqMKI6NNH63Rr93haXE5dKE XnL9L2cakAnYJDsWAAAAAElFTkSuQmCC" style="position: absolute;left: ${width /
            2 -
            2}px;z-index: 2;bottom: ${height - 7}px;">`;
    }

    return "";
}

function genGoldenEmote(emoteName, emoteHeight, emoteWidth) {
    const emote = document.querySelector(".chat-emote-" + emoteName);
    if (!emote) {
        return;
    }

    const innerEmoteCompStyle = getComputedStyle(emote, false)
    let maskUrl = innerEmoteCompStyle.backgroundImage.slice(4, -1).replace(/"/g, '');

    const goldenModifierMask =
        "width: " +
        emoteWidth +
        "px; height: " +
        emoteHeight +
        "px; " +
        "-webkit-mask-position: " +
        innerEmoteCompStyle.backgroundPosition +
        ";";
    const goldenModifierMarginTop = 30 - emoteHeight - 8;
    const goldenModifierStyle =
        'style="margin:' +
        goldenModifierMarginTop +
        "px 2px 0px 2px; -webkit-mask-image: url(/" +
        maskUrl +
        ");" +
        goldenModifierMask +
        '"';

    const goldenModifierGlimmerStyle =
        'style="width: ' + emoteWidth + "px; height: " + emoteHeight + 'px;"';
    const goldenModifierGlimmer =
        "<span " +
        goldenModifierGlimmerStyle +
        ' class="golden-glimmer"></span>';

    const goldenModifier =
        "<span " +
        goldenModifierStyle +
        'class="golden-modifier">' +
        goldenModifierGlimmer +
        "</span>";

    const goldenModifierInnerEmoteStyle =
        'style="mix-blend-mode: color-burn; filter:contrast(125%) grayscale(100%) brightness(.75); animation: none;"';

    return {
        goldenModifier: goldenModifier,
        goldenModifierInnerEmoteStyle: goldenModifierInnerEmoteStyle
    };
}

function moveModifierToFront(modifierList, modifierName) {
    if (modifierList.includes(modifierName)) {
        modifierList = modifierList.filter(item => item !== modifierName);
        modifierList.unshift(modifierName);
    }
    return modifierList;
}

class IdentityFormatter {
    format(chat, str, message = null) {
        return str;
    }
}

class EmoteFormatter {
    format(chat, str, message = null) {
        if (!this.regex) {
            const emoticons = [...chat.emoticons].join("|");
            const suffixes = Object.keys(GENERIFY_OPTIONS).join("|");
            this.regex = new RegExp(
                `(^|\\s)(${emoticons})(:(${suffixes}))*(?=$|\\s)`,
                "gm"
            );
        }

        if (!this.emotewidths) {
            this.emotewidths = {};
            this.emoteheights = {};
            const emoteArray = [...chat.emoticons];

            //create css classes for :dank
            var style = document.createElement("style");
            style.type = "text/css";

            for (var i = 0; i < emoteArray.length; i++) {
                const target = document.getElementsByClassName("chat-emote-" + emoteArray[i]);
                if (target.length === 0) {
                    break;
                }
                var width = target[0].clientWidth;
                var height = target[0].clientHeight;
                this.emotewidths[emoteArray[i]] = width;
                this.emoteheights[emoteArray[i]] = height;

                if (DANK_WHITELIST.includes(emoteArray[i])) {
                    style.innerHTML += `
                    .generify-dank > .chat-emote.chat-emote-${
                        emoteArray[i]
                        } { margin-left: ${36 - width / 2}px  }`;
                }
            }

            document.getElementsByTagName("head")[0].appendChild(style);
        }

        const emoteCount = ((str || "").match(this.regex) || []).length;
        // re-seed the rng for halloween effects each emote
        var i = 0;
        return str.replace(this.regex, m => {
            // m is "emote:modifier"
            // creating a set removes duplicates in an array
            const input = [...new Set(m.split(":"))];
            const emote = input[0].replace(/\s/g, "");
            m = input.join(":");
            var suffixes = input.slice(1);

            // the front modifier gets "executed" last
            suffixes = moveModifierToFront(suffixes, "banned");
            suffixes = moveModifierToFront(suffixes, "virus");
            suffixes = moveModifierToFront(suffixes, "dank");
            suffixes = moveModifierToFront(suffixes, "frozen");

            const innerClasses = ["chat-emote", "chat-emote-" + emote];

            var timestamp = 0;
            if (message != null) {
                timestamp = message.timestamp._i;
            }

            const seed = genSeed(str, chat, i++, timestamp);
            // since the rng mostly depends on the two last messages, combos after stuck proc-ing a lot. Lower chance of this happening.
            const punish = str == getLastMsg(chat);
            if (isHalloween() && emoteCount <= 7 && proc(seed, punish, 0)) {
                innerClasses.push(getRandomHalloweenEffect(emote, seed));
            }

            if (chat.settings.get("animateforever")) {
                innerClasses.push("chat-emote-" + emote + "-animate-forever");
            }

            if (chat.settings.get('hiddenemotes').includes(emote)) {
                innerClasses.push('hidden-emote')
            }

            let hat = "";
            if (this.emotewidths[emote] !== undefined) {
                hat = putHat(
                    this.emotewidths[emote],
                    this.emoteheights[emote],
                    emote
                );
            }

            var goldenModifier = "";
            var goldenModifierInnerEmoteStyle = "";
            let goldenProcChance = 0.00001;
            if (emoteCount / 2 > 1) {
                // more than 2 emotes will lower the chance of a rare
                goldenProcChance = goldenProcChance / (emoteCount / 2);
            }
            // 0.001% proc chance
            if (!isHalloween() && proc(seed, punish, goldenProcChance)) {
                var goldenEmote = genGoldenEmote(
                    emote,
                    this.emoteheights[emote],
                    this.emotewidths[emote]
                );
                goldenModifier = goldenEmote.goldenModifier;
                goldenModifierInnerEmoteStyle =
                    goldenEmote.goldenModifierInnerEmoteStyle;
            }

            var options = [];
            for (var suffix of suffixes) {
                options.push(GENERIFY_OPTIONS[suffix]);
            }

            var generifySpans = ['worth', 'love', 'jam']
                .filter((s) => suffixes.includes(s))
                .map((s) => `<span class="${s}"></span>`)
                .join();
            var innerEmote = ' <span ' + goldenModifierInnerEmoteStyle + ' title="' + m + '" class="' + innerClasses.join(' ') + '">' + m + generifySpans + ' </span>';

            var generifyExtraWraps = ['slide', 'peek'];

            var generifyClasses = [
                "generify-container",
                "generify-emote-" + emote
            ];

            for (var j = 0; j < options.length; j++) {
                if (generifyExtraWraps.includes(suffixes[j])) {
                    innerEmote = `<span class="generify-container">${innerEmote}</span>`;
                }
                innerEmote = ' <span class="' +
                    generifyClasses.join(" ") + " " +
                    options[j] +
                    '" data-modifiers="' +
                    options[j] +
                    '">' +
                    innerEmote +
                    "</span>"
            }

            return (
                ' <span class="' +
                generifyClasses.join(" ") + '">' +
                goldenModifier +
                hat +
                innerEmote +
                "</span>"
            );
        });
    }
}

// Formats a single emote without any effects or modifiers.
class RawEmoteFormatter {
    buildElement(chat, emoteName) {
        const element = new HtmlElement("span");
        element.addClass("chat-emote");
        element.addClass(`chat-emote-${emoteName}`);

        if (chat.settings.get("animateforever")) {
            element.addClass(`chat-emote-${emoteName}-animate-forever`);
        }

        element.setAttribute("title", emoteName);
        element.setContent(emoteName);

        return element;
    }

    format(chat, emoteName) {
        const element = this.buildElement(chat, emoteName);
        return element.toString();
    }
}

// Formats a single emote for display within the autocomplete menu.
class AutocompleteEmoteFormatter extends RawEmoteFormatter {
    buildElement(chat, emoteName) {
        const container = new HtmlElement("span");
        container.addClass("autocomplete-emote-container");

        // Some emotes require custom styling. This class does not exist for all emotes.
        container.addClass(`autocomplete-emote-container-${emoteName}`);

        const emote = super.buildElement(chat, emoteName);
        container.setContent(emote.toString());

        return container;
    }
}

// ignore escaped backticks
function findNextTick(str) {
    var base = 0;
    while (str.length > 0) {
        var index = str.indexOf("`");
        if (index === -1) {
            return -1;
        } else if (str.charAt(index - 1) === "\\") {
            base += index + 1;
            str = str.substring(index + 1);
        } else {
            return index + base;
        }
    }
    return -1;
}

// surrounds code with code tags,
// replaces empty string and string only containing whitespace with single space
function stringCodeFormatter(str) {
    if (RegExp("^\\s*$").test(str)) {
        str = " ";
    }
    return `<code>${str}</code>`;
}

// splits input message into array of code and non code blocks
function stringCodeSplitter(str) {
    var indexOne = findNextTick(str);
    if (indexOne !== -1) {
        var beforeFirstTick = str.substring(0, indexOne);
        var afterFirstTick = str.substring(indexOne + 1);
        var indexTwo = findNextTick(afterFirstTick);
        if (indexTwo !== -1) {
            var betweenTicks = afterFirstTick
                .substring(0, indexTwo)
                .replace(/\r?\n|\r/g, "");
            var afterSecondTick = afterFirstTick.substring(indexTwo + 1);
            var subArray =
                beforeFirstTick.length > 0
                    ? (subArray = [
                        { type: "text", value: beforeFirstTick },
                        { type: "code", value: betweenTicks }
                    ])
                    : (subArray = [{ type: "code", value: betweenTicks }]);
            if (afterSecondTick.length > 0) {
                return subArray.concat(stringCodeSplitter(afterSecondTick));
            }
            return subArray;
        }
    }
    return [{ type: "text", value: str }];
}

class CodeFormatter {
    format(chat, str, message = null) {
        return stringCodeFormatter(str);
    }

    split(str) {
        return stringCodeSplitter(str);
    }
}

function stringSpoilerParser(str, isVisible) {
    var classes = isVisible ? "spoiler visible" : "spoiler";
    var indexOne = str.indexOf("||");
    if (indexOne !== -1) {
        var afterTag = str.substring(indexOne + 2);
        var indexTwo = afterTag.indexOf("||");
        if (indexTwo !== -1) {
            var betweenTags = afterTag.substring(0, indexTwo);
            var subString = RegExp("^\\s*$").test(betweenTags)
                ? str.substring(0, indexOne) + "||||"
                : str.substring(0, indexOne) +
                `<span class="${classes}">${betweenTags.trim()}</span>`;
            str =
                subString +
                stringSpoilerParser(
                    afterTag.substring(indexTwo + 2),
                    isVisible
                );
        }
    }
    return str;
}

class SpoilerFormatter {
    format(chat, str, message = null) {
        return stringSpoilerParser(str, chat.settings.get("disablespoilers"));
    }
}

class GreenTextFormatter {
    format(chat, str, message = null) {
        if (message.user && message.message.indexOf(">") === 0) {
            str = `<span class="greentext">${str}</span>`;
        }
        return str;
    }
}

class MentionedUserFormatter {
    format(chat, str, message = null) {
        if (message && message.mentioned && message.mentioned.length > 0) {
            return str.replace(
                new RegExp(
                    `((?:^|\\s)@?)(${message.mentioned.join(
                        "|"
                    )})(?=$|\\s|[\.\?!,])`,
                    "igm"
                ),
                (m, prefix, target) => {
                    const nick = message.mentioned.find(n => n.toLowerCase() === target.toLowerCase());
                    return `${prefix}<span class="chat-user">${nick}</span>`;
                }
            );
        }
        return str;
    }
}

class UrlFormatter {
    constructor() {
        const unicodeShortcuts = {
            "p{L}":
                "\\u0041-\\u005A\\u0061-\\u007A\\u00AA\\u00B5\\u00BA\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02C1\\u02C6-\\u02D1\\u02E0-\\u02E4\\u02EC\\u02EE\\u0370-\\u0374\\u0376\\u0377\\u037A-\\u037D\\u0386\\u0388-\\u038A\\u038C\\u038E-\\u03A1\\u03A3-\\u03F5\\u03F7-\\u0481\\u048A-\\u0527\\u0531-\\u0556\\u0559\\u0561-\\u0587\\u05D0-\\u05EA\\u05F0-\\u05F2\\u0620-\\u064A\\u066E\\u066F\\u0671-\\u06D3\\u06D5\\u06E5\\u06E6\\u06EE\\u06EF\\u06FA-\\u06FC\\u06FF\\u0710\\u0712-\\u072F\\u074D-\\u07A5\\u07B1\\u07CA-\\u07EA\\u07F4\\u07F5\\u07FA\\u0800-\\u0815\\u081A\\u0824\\u0828\\u0840-\\u0858\\u08A0\\u08A2-\\u08AC\\u0904-\\u0939\\u093D\\u0950\\u0958-\\u0961\\u0971-\\u0977\\u0979-\\u097F\\u0985-\\u098C\\u098F\\u0990\\u0993-\\u09A8\\u09AA-\\u09B0\\u09B2\\u09B6-\\u09B9\\u09BD\\u09CE\\u09DC\\u09DD\\u09DF-\\u09E1\\u09F0\\u09F1\\u0A05-\\u0A0A\\u0A0F\\u0A10\\u0A13-\\u0A28\\u0A2A-\\u0A30\\u0A32\\u0A33\\u0A35\\u0A36\\u0A38\\u0A39\\u0A59-\\u0A5C\\u0A5E\\u0A72-\\u0A74\\u0A85-\\u0A8D\\u0A8F-\\u0A91\\u0A93-\\u0AA8\\u0AAA-\\u0AB0\\u0AB2\\u0AB3\\u0AB5-\\u0AB9\\u0ABD\\u0AD0\\u0AE0\\u0AE1\\u0B05-\\u0B0C\\u0B0F\\u0B10\\u0B13-\\u0B28\\u0B2A-\\u0B30\\u0B32\\u0B33\\u0B35-\\u0B39\\u0B3D\\u0B5C\\u0B5D\\u0B5F-\\u0B61\\u0B71\\u0B83\\u0B85-\\u0B8A\\u0B8E-\\u0B90\\u0B92-\\u0B95\\u0B99\\u0B9A\\u0B9C\\u0B9E\\u0B9F\\u0BA3\\u0BA4\\u0BA8-\\u0BAA\\u0BAE-\\u0BB9\\u0BD0\\u0C05-\\u0C0C\\u0C0E-\\u0C10\\u0C12-\\u0C28\\u0C2A-\\u0C33\\u0C35-\\u0C39\\u0C3D\\u0C58\\u0C59\\u0C60\\u0C61\\u0C85-\\u0C8C\\u0C8E-\\u0C90\\u0C92-\\u0CA8\\u0CAA-\\u0CB3\\u0CB5-\\u0CB9\\u0CBD\\u0CDE\\u0CE0\\u0CE1\\u0CF1\\u0CF2\\u0D05-\\u0D0C\\u0D0E-\\u0D10\\u0D12-\\u0D3A\\u0D3D\\u0D4E\\u0D60\\u0D61\\u0D7A-\\u0D7F\\u0D85-\\u0D96\\u0D9A-\\u0DB1\\u0DB3-\\u0DBB\\u0DBD\\u0DC0-\\u0DC6\\u0E01-\\u0E30\\u0E32\\u0E33\\u0E40-\\u0E46\\u0E81\\u0E82\\u0E84\\u0E87\\u0E88\\u0E8A\\u0E8D\\u0E94-\\u0E97\\u0E99-\\u0E9F\\u0EA1-\\u0EA3\\u0EA5\\u0EA7\\u0EAA\\u0EAB\\u0EAD-\\u0EB0\\u0EB2\\u0EB3\\u0EBD\\u0EC0-\\u0EC4\\u0EC6\\u0EDC-\\u0EDF\\u0F00\\u0F40-\\u0F47\\u0F49-\\u0F6C\\u0F88-\\u0F8C\\u1000-\\u102A\\u103F\\u1050-\\u1055\\u105A-\\u105D\\u1061\\u1065\\u1066\\u106E-\\u1070\\u1075-\\u1081\\u108E\\u10A0-\\u10C5\\u10C7\\u10CD\\u10D0-\\u10FA\\u10FC-\\u1248\\u124A-\\u124D\\u1250-\\u1256\\u1258\\u125A-\\u125D\\u1260-\\u1288\\u128A-\\u128D\\u1290-\\u12B0\\u12B2-\\u12B5\\u12B8-\\u12BE\\u12C0\\u12C2-\\u12C5\\u12C8-\\u12D6\\u12D8-\\u1310\\u1312-\\u1315\\u1318-\\u135A\\u1380-\\u138F\\u13A0-\\u13F4\\u1401-\\u166C\\u166F-\\u167F\\u1681-\\u169A\\u16A0-\\u16EA\\u1700-\\u170C\\u170E-\\u1711\\u1720-\\u1731\\u1740-\\u1751\\u1760-\\u176C\\u176E-\\u1770\\u1780-\\u17B3\\u17D7\\u17DC\\u1820-\\u1877\\u1880-\\u18A8\\u18AA\\u18B0-\\u18F5\\u1900-\\u191C\\u1950-\\u196D\\u1970-\\u1974\\u1980-\\u19AB\\u19C1-\\u19C7\\u1A00-\\u1A16\\u1A20-\\u1A54\\u1AA7\\u1B05-\\u1B33\\u1B45-\\u1B4B\\u1B83-\\u1BA0\\u1BAE\\u1BAF\\u1BBA-\\u1BE5\\u1C00-\\u1C23\\u1C4D-\\u1C4F\\u1C5A-\\u1C7D\\u1CE9-\\u1CEC\\u1CEE-\\u1CF1\\u1CF5\\u1CF6\\u1D00-\\u1DBF\\u1E00-\\u1F15\\u1F18-\\u1F1D\\u1F20-\\u1F45\\u1F48-\\u1F4D\\u1F50-\\u1F57\\u1F59\\u1F5B\\u1F5D\\u1F5F-\\u1F7D\\u1F80-\\u1FB4\\u1FB6-\\u1FBC\\u1FBE\\u1FC2-\\u1FC4\\u1FC6-\\u1FCC\\u1FD0-\\u1FD3\\u1FD6-\\u1FDB\\u1FE0-\\u1FEC\\u1FF2-\\u1FF4\\u1FF6-\\u1FFC\\u2071\\u207F\\u2090-\\u209C\\u2102\\u2107\\u210A-\\u2113\\u2115\\u2119-\\u211D\\u2124\\u2126\\u2128\\u212A-\\u212D\\u212F-\\u2139\\u213C-\\u213F\\u2145-\\u2149\\u214E\\u2183\\u2184\\u2C00-\\u2C2E\\u2C30-\\u2C5E\\u2C60-\\u2CE4\\u2CEB-\\u2CEE\\u2CF2\\u2CF3\\u2D00-\\u2D25\\u2D27\\u2D2D\\u2D30-\\u2D67\\u2D6F\\u2D80-\\u2D96\\u2DA0-\\u2DA6\\u2DA8-\\u2DAE\\u2DB0-\\u2DB6\\u2DB8-\\u2DBE\\u2DC0-\\u2DC6\\u2DC8-\\u2DCE\\u2DD0-\\u2DD6\\u2DD8-\\u2DDE\\u2E2F\\u3005\\u3006\\u3031-\\u3035\\u303B\\u303C\\u3041-\\u3096\\u309D-\\u309F\\u30A1-\\u30FA\\u30FC-\\u30FF\\u3105-\\u312D\\u3131-\\u318E\\u31A0-\\u31BA\\u31F0-\\u31FF\\u3400-\\u4DB5\\u4E00-\\u9FCC\\uA000-\\uA48C\\uA4D0-\\uA4FD\\uA500-\\uA60C\\uA610-\\uA61F\\uA62A\\uA62B\\uA640-\\uA66E\\uA67F-\\uA697\\uA6A0-\\uA6E5\\uA717-\\uA71F\\uA722-\\uA788\\uA78B-\\uA78E\\uA790-\\uA793\\uA7A0-\\uA7AA\\uA7F8-\\uA801\\uA803-\\uA805\\uA807-\\uA80A\\uA80C-\\uA822\\uA840-\\uA873\\uA882-\\uA8B3\\uA8F2-\\uA8F7\\uA8FB\\uA90A-\\uA925\\uA930-\\uA946\\uA960-\\uA97C\\uA984-\\uA9B2\\uA9CF\\uAA00-\\uAA28\\uAA40-\\uAA42\\uAA44-\\uAA4B\\uAA60-\\uAA76\\uAA7A\\uAA80-\\uAAAF\\uAAB1\\uAAB5\\uAAB6\\uAAB9-\\uAABD\\uAAC0\\uAAC2\\uAADB-\\uAADD\\uAAE0-\\uAAEA\\uAAF2-\\uAAF4\\uAB01-\\uAB06\\uAB09-\\uAB0E\\uAB11-\\uAB16\\uAB20-\\uAB26\\uAB28-\\uAB2E\\uABC0-\\uABE2\\uAC00-\\uD7A3\\uD7B0-\\uD7C6\\uD7CB-\\uD7FB\\uF900-\\uFA6D\\uFA70-\\uFAD9\\uFB00-\\uFB06\\uFB13-\\uFB17\\uFB1D\\uFB1F-\\uFB28\\uFB2A-\\uFB36\\uFB38-\\uFB3C\\uFB3E\\uFB40\\uFB41\\uFB43\\uFB44\\uFB46-\\uFBB1\\uFBD3-\\uFD3D\\uFD50-\\uFD8F\\uFD92-\\uFDC7\\uFDF0-\\uFDFB\\uFE70-\\uFE74\\uFE76-\\uFEFC\\uFF21-\\uFF3A\\uFF41-\\uFF5A\\uFF66-\\uFFBE\\uFFC2-\\uFFC7\\uFFCA-\\uFFCF\\uFFD2-\\uFFD7\\uFFDA-\\uFFDC",
            "p{N}":
                "\\u0030-\\u0039\\u00B2\\u00B3\\u00B9\\u00BC-\\u00BE\\u0660-\\u0669\\u06F0-\\u06F9\\u07C0-\\u07C9\\u0966-\\u096F\\u09E6-\\u09EF\\u09F4-\\u09F9\\u0A66-\\u0A6F\\u0AE6-\\u0AEF\\u0B66-\\u0B6F\\u0B72-\\u0B77\\u0BE6-\\u0BF2\\u0C66-\\u0C6F\\u0C78-\\u0C7E\\u0CE6-\\u0CEF\\u0D66-\\u0D75\\u0E50-\\u0E59\\u0ED0-\\u0ED9\\u0F20-\\u0F33\\u1040-\\u1049\\u1090-\\u1099\\u1369-\\u137C\\u16EE-\\u16F0\\u17E0-\\u17E9\\u17F0-\\u17F9\\u1810-\\u1819\\u1946-\\u194F\\u19D0-\\u19DA\\u1A80-\\u1A89\\u1A90-\\u1A99\\u1B50-\\u1B59\\u1BB0-\\u1BB9\\u1C40-\\u1C49\\u1C50-\\u1C59\\u2070\\u2074-\\u2079\\u2080-\\u2089\\u2150-\\u2182\\u2185-\\u2189\\u2460-\\u249B\\u24EA-\\u24FF\\u2776-\\u2793\\u2CFD\\u3007\\u3021-\\u3029\\u3038-\\u303A\\u3192-\\u3195\\u3220-\\u3229\\u3248-\\u324F\\u3251-\\u325F\\u3280-\\u3289\\u32B1-\\u32BF\\uA620-\\uA629\\uA6E6-\\uA6EF\\uA830-\\uA835\\uA8D0-\\uA8D9\\uA900-\\uA909\\uA9D0-\\uA9D9\\uAA50-\\uAA59\\uABF0-\\uABF9\\uFF10-\\uFF19",
            "p{Sc}":
                "\\u0024\\u00A2-\\u00A5\\u058F\\u060B\\u09F2\\u09F3\\u09FB\\u0AF1\\u0BF9\\u0E3F\\u17DB\\u20A0-\\u20B9\\uA838\\uFDFC\\uFE69\\uFF04\\uFFE0\\uFFE1\\uFFE5\\uFFE6",
            "p{Sk}":
                "\\u005E\\u0060\\u00A8\\u00AF\\u00B4\\u00B8\\u02C2-\\u02C5\\u02D2-\\u02DF\\u02E5-\\u02EB\\u02ED\\u02EF-\\u02FF\\u0375\\u0384\\u0385\\u1FBD\\u1FBF-\\u1FC1\\u1FCD-\\u1FCF\\u1FDD-\\u1FDF\\u1FED-\\u1FEF\\u1FFD\\u1FFE\\u309B\\u309C\\uA700-\\uA716\\uA720\\uA721\\uA789\\uA78A\\uFBB2-\\uFBC1\\uFF3E\\uFF40\\uFFE3",
            "p{So}":
                "\\u00A6\\u00A9\\u00AE\\u00B0\\u0482\\u060E\\u060F\\u06DE\\u06E9\\u06FD\\u06FE\\u07F6\\u09FA\\u0B70\\u0BF3-\\u0BF8\\u0BFA\\u0C7F\\u0D79\\u0F01-\\u0F03\\u0F13\\u0F15-\\u0F17\\u0F1A-\\u0F1F\\u0F34\\u0F36\\u0F38\\u0FBE-\\u0FC5\\u0FC7-\\u0FCC\\u0FCE\\u0FCF\\u0FD5-\\u0FD8\\u109E\\u109F\\u1390-\\u1399\\u1940\\u19DE-\\u19FF\\u1B61-\\u1B6A\\u1B74-\\u1B7C\\u2100\\u2101\\u2103-\\u2106\\u2108\\u2109\\u2114\\u2116\\u2117\\u211E-\\u2123\\u2125\\u2127\\u2129\\u212E\\u213A\\u213B\\u214A\\u214C\\u214D\\u214F\\u2195-\\u2199\\u219C-\\u219F\\u21A1\\u21A2\\u21A4\\u21A5\\u21A7-\\u21AD\\u21AF-\\u21CD\\u21D0\\u21D1\\u21D3\\u21D5-\\u21F3\\u2300-\\u2307\\u230C-\\u231F\\u2322-\\u2328\\u232B-\\u237B\\u237D-\\u239A\\u23B4-\\u23DB\\u23E2-\\u23F3\\u2400-\\u2426\\u2440-\\u244A\\u249C-\\u24E9\\u2500-\\u25B6\\u25B8-\\u25C0\\u25C2-\\u25F7\\u2600-\\u266E\\u2670-\\u26FF\\u2701-\\u2767\\u2794-\\u27BF\\u2800-\\u28FF\\u2B00-\\u2B2F\\u2B45\\u2B46\\u2B50-\\u2B59\\u2CE5-\\u2CEA\\u2E80-\\u2E99\\u2E9B-\\u2EF3\\u2F00-\\u2FD5\\u2FF0-\\u2FFB\\u3004\\u3012\\u3013\\u3020\\u3036\\u3037\\u303E\\u303F\\u3190\\u3191\\u3196-\\u319F\\u31C0-\\u31E3\\u3200-\\u321E\\u322A-\\u3247\\u3250\\u3260-\\u327F\\u328A-\\u32B0\\u32C0-\\u32FE\\u3300-\\u33FF\\u4DC0-\\u4DFF\\uA490-\\uA4C6\\uA828-\\uA82B\\uA836\\uA837\\uA839\\uAA77-\\uAA79\\uFDFD\\uFFE4\\uFFE8\\uFFED\\uFFEE\\uFFFC\\uFFFD"
        };
        const letter = unicodeShortcuts["p{L}"],
            number = unicodeShortcuts["p{N}"],
            iriChar = letter + number,
            pathChar =
                iriChar +
                "/\\-+=_&~*%@|#.,:;'?!" +
                unicodeShortcuts["p{Sc}"] +
                unicodeShortcuts["p{Sk}"] +
                unicodeShortcuts["p{So}"],
            endChar = iriChar + "/\\-+=_&~*%;" + unicodeShortcuts["p{Sc}"],
            octet = "(?:25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9][0-9]|[0-9])",
            ipAddr =
                "(?:\\b" +
                octet +
                "\\." +
                octet +
                "\\." +
                octet +
                "\\." +
                octet +
                "\\b)",
            iri =
                "[" + iriChar + "](?:[" + iriChar + "\\-]*[" + iriChar + "])?",
            domain = "(?:" + iri + "\\.)+",
            hostName = "(?:" + domain + gtld + "|" + ipAddr + ")",
            wellBrack =
                "\\[[" +
                pathChar +
                "]*(?:\\[[" +
                pathChar +
                "]*\\][" +
                pathChar +
                "]*)*\\]",
            wellParen =
                "\\([" +
                pathChar +
                "]*(?:\\([" +
                pathChar +
                "]*\\)[" +
                pathChar +
                "]*)*\\)",
            wellAll = wellParen + "|" + wellBrack,
            pathCont =
                "(?:[" +
                pathChar +
                "]*(?:" +
                wellAll +
                "|[" +
                endChar +
                "])+)+",
            path = "(?:" + pathCont + "|/|\\b|$)",
            port = "(?::[0-9]+)?",
            webURL =
                "(?:" +
                hostName +
                port +
                "/" +
                path +
                ")|(?:" +
                hostName +
                port +
                "(?:\\b|$))",
            scheme = "(https?|ftp|wss?)://",
            strict = "\\b" + scheme + pathCont,
            relaxed = strict + "|" + webURL;
        this.linkregex = new RegExp(relaxed, "gi");
        this.discordmp4Regex = /https:\/\/(media|cdn)\.discordapp\.(net|com)\/attachments.*?\.(mp4|webm|mov)/i;
        this.refLinkRegex = /(https?:\/\/)?(www.)?(amazon)?(twitter)?(spotify)?/; 

        // e.g. youtube ids include "-" and "_".
        const embedCommonId = '([\\w-]{1,30})';
        this.embedSubstitutions = [
            {
                pattern: new RegExp(`twitch\\.tv/videos/${embedCommonId}`),
                template: (v) => `twitch-vod/${v}`
            },
            {
                pattern: new RegExp(`twitch\\.tv/${embedCommonId}/?$`),
                template: (v) => `twitch/${v}`
            },
            {
                pattern: new RegExp(`angelthump\\.com/(?:embed/)?${embedCommonId}$`),
                template: (v) => `angelthump/${v}`
            },
            {
                pattern: new RegExp(`player\\.angelthump\\.com/.*?[&?]channel=${embedCommonId}`),
                template: (v) => `angelthump/${v}`
            },
            {
                pattern: new RegExp(`youtube\\.com/watch.*?[&?]v=${embedCommonId}(?:&(?!t)|$| )`),
                template: (v) => `youtube/${v}`
            },
            {
                pattern: new RegExp(`youtu\\.be/${embedCommonId}(?:&(?!t)|$| )`),
                template: (v) => `youtube/${v}`
            },
            {
                pattern: new RegExp(`youtube\\.com/embed/${embedCommonId}(?:&(?!t)|$| )`),
                template: (v) => `youtube/${v}`
            },
            {
                pattern: new RegExp(`facebook\\.com/.*?/videos/${embedCommonId}/?`),
                template: (v) => `facebook/${v}`
            },
            {
                pattern: new RegExp(`media\\.ccc\\.de/v/([^#]+)`),
                template: (v) => `advanced/https://media.ccc.de/v/${v}/oembed`
            }
        ];

        this._elem = $("<div></div>");
    }

    // borrowed from angular.js
    // https://github.com/angular/angular.js/blob/v1.3.14/src/ngSanitize/sanitize.js#L435
    encodeUrl(value) {
        return value
            .replace(/&/g, "&amp;")
            .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function (value) {
                const hi = value.charCodeAt(0);
                const low = value.charCodeAt(1);
                return (
                    "&#" +
                    ((hi - 0xd800) * 0x400 + (low - 0xdc00) + 0x10000) +
                    ";"
                );
            })
            .replace(/([^\#-~| |!])/g, function (value) {
                return "&#" + value.charCodeAt(0) + ";";
            })
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    format(chat, str, message = null) {
        if (!str) return;
        const self = this;
        const shortenLinks = chat.settings.get("shortenlinks");
        let extraclass = "";

        if (/\b(?:NSFL)\b/i.test(str)) {
            extraclass = "nsfl-link";
        } else if (/\b(?:NSFW)\b/i.test(str)) {
            extraclass = "nsfw-link";
        } else if (/\b(?:LOUD|SPOILER)\b/i.test(str)) {
            extraclass = "loud-link";
        } else if (/\b(?:WEEB)\b/i.test(str)) {
            extraclass = "weeb-link";
        }

        return str.replace(self.linkregex, (url, scheme) => {
            scheme = scheme ? "" : "http://";
            var decodedUrl = self._elem.html(url).text();
            // replaces the discord links that automatically download a file when clicked
            if (self.discordmp4Regex.test(decodedUrl)) {
                decodedUrl = location.origin + "/discordmedia.html?v=" + encodeURIComponent(decodedUrl);
            }
            if(self.refLinkRegex.test(decodedUrl)){
                decodedUrl = decodedUrl.split('?')[0];
            }
            const m = decodedUrl.match(self.linkregex);
            if (m) {
                url = self.encodeUrl(m[0]);
                const extra = self.encodeUrl(decodedUrl.substring(m[0].length));
                const href = scheme + url;

                for (let i = 0; i < this.embedSubstitutions.length; i++) {
                    const sub = this.embedSubstitutions[i];
                    const sm = decodedUrl.match(sub.pattern);
                    if (sm) {
                        const embed = sub.template(sm[1]);
                        const embedHref = `${RUSTLA_URL}/${embed}`;
                        return `<a target="_blank" class="embed-internallink ${extraclass}" href="${embedHref}">${embed}</a><a target="_blank" class="embed-externallink" href="${href}" rel="nofollow" title="${url}"></a>`;
                    }
                }

                // 70 characters is the 80th percentile for link length
                if (shortenLinks && url.length > 75) {
                    url = url.substring(0, 35) + '<span class="ellipsis">...</span><span class="ellipsis-hidden">' + url.substring(35, url.length - 35) + '</span>' + url.substring(url.length - 35);
                }
                return `<a target="_blank" class="externallink ${extraclass}" href="${href}" rel="nofollow">${url}</a>${extra}`;
            }
            return url;
        });
    }
}

export {
    AutocompleteEmoteFormatter,
    CodeFormatter,
    EmoteFormatter,
    GreenTextFormatter,
    HtmlTextFormatter,
    IdentityFormatter,
    MentionedUserFormatter,
    RawEmoteFormatter,
    SpoilerFormatter,
    UrlFormatter
};

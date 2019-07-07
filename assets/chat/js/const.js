const DATE_FORMATS = {
    FULL: 'MMMM Do YYYY, h:mm:ss a',
    TIME: 'HH:mm'
};

const KEYCODES = {
    TAB: 9,
    STRG: 17,
    CTRL: 17,
    CTRLRIGHT: 18,
    CTRLR: 18,
    SHIFT: 16,
    RETURN: 13,
    ENTER: 13,
    BACKSPACE: 8,
    BCKSP: 8,
    ALT: 18,
    ALTR: 17,
    ALTRIGHT: 17,
    SPACE: 32,
    WIN: 91,
    MAC: 91,
    UP: 38,
    DOWN: 40,
    LEFT: 37,
    RIGHT: 39,
    ESC: 27,
    DEL: 46,
    F1: 112,
    F2: 113,
    F3: 114,
    F4: 115,
    F5: 116,
    F6: 117,
    F7: 118,
    F8: 119,
    F9: 120,
    F10: 121,
    F11: 122,
    F12: 123
};

function getKeyCode(e) {
    return e.which || e.keyCode || -1;
}

function isKeyCode(e, code) {
    return getKeyCode(e) === code;
}

// emote:key; css class to apply
const GENERIFY_OPTIONS = {
    'mirror': 'mirror',
    'flip': 'flip',
    'rain': 'weather rain anim-fix',
    'snow': 'weather snow anim-fix',
    'rustle': 'generify-rustle',
    'worth': 'generify-worth',
    // 'dank': 'generify-dank',
    // 'hyper': 'generify-hyper generify-rustle',
    'love': 'generify-love',
    'spin': 'generify-spin',
    'wide' : 'wide'
    'frozen': 'frozen'
    'lag' : 'lag'
};

const CUSTOM_AUTOCOMPLETE_ORDER = [
    ['MiyanoHype', 'MiyanoBird'],
    ['REE', 'RedCard']
];

const HALLOWEEN_RANDOM_EFFECTS = [
    'spooky-spooker',
    'spooky-blink',
    'spooky-spin',
    'spooky-crawl',
    'spooky-ghost',
    'spooky-bat'
];

const HALLOWEEN_RANDOM_DELAYS = [
    'spooky-anim-delay-1',
    'spooky-anim-delay-2',
    'spooky-anim-delay-3',
    'spooky-anim-delay-4',
    'spooky-anim-delay-5'
];

const HALLOWEEN_BLACKLIST = [
    'GameOfThrows'
];

//blacklisted from receiving any of the hats
const HAT_BLACKLIST = [
    'HEADSHOT',
    'Clap',
    'CampFire',
    'POKE',
    'GameOfThrows',
    'Sippy',
    'ApeHands'
]

//blacklists for special hats
const HAT_SPECIAL_BLACKLIST = {
    'bday': [
        'NoTears',
        'Klappa',
        'FeelsAmazingMan'
    ],
    'honk': [
        'YEE'
    ]

}

export {KEYCODES, DATE_FORMATS, isKeyCode, getKeyCode, GENERIFY_OPTIONS, CUSTOM_AUTOCOMPLETE_ORDER, HALLOWEEN_RANDOM_EFFECTS, HALLOWEEN_RANDOM_DELAYS, HALLOWEEN_BLACKLIST, HAT_BLACKLIST, HAT_SPECIAL_BLACKLIST};

/* global $ */

import Chat from './chat';

/**
 * Handles showing and hiding spoilers
 * 
 */
class ChatSpoiler {
    private chat: Chat;

    constructor(chat: Chat) {
        this.chat = chat;
        this.chat.output.on('mousedown', e => {
            if(e.button === 0) {
                this.toggleElement(e.target);
            }
        });
    }

    toggleElement<TElement = HTMLElement>(target: TElement) {
        var t = $(target);
        if(t.hasClass('chat-emote')) {
            t = t.parent();
        }
        while(t.hasClass('generify-container')) {
            t = t.parent();
        }
        if(t.hasClass('spoiler visible')) {
            t.removeClass('visible');
        } else if (t.hasClass('spoiler')) {
            t.addClass('visible');
        }
    }
}

export default ChatSpoiler;

class TranslationQueue {
  constructor() {
    /**
     *  text: string
     *  isResolved: boolean
     *  callbacks: [(language) => void]
     */
    this._queue = [];

    this.onMessage = this.onMessage.bind(this);
    this.addToQueue = this.addToQueue.bind(this);
    this.updatePopupIcon = this.updatePopupIcon.bind(this);
    this.resolveTranslation = this.resolveTranslation.bind(this);
    this.setIconToNormal = this.setIconToNormal.bind(this);
    this.setIconToHasNotification = this.setIconToHasNotification.bind(this);

    window.chrome.runtime.onMessage.addListener(this.onMessage);
  }

  onMessage(message, sender, sendResponse) {
    switch (message.type) {
      case 'get-unresolved-requests':
      const unresolvedRequests = this._queue.filter(i => !i.isResolved).map(i => ({ text: i.text, index: this._queue.indexOf(i) }));
      sendResponse({
        ok: true,
        payload: unresolvedRequests
      });
      break;

      case 'resolve-translation':
      const payload = message.payload;
      const index = this._queue.findIndex(i => i.text === payload.text);
      if (payload &&
          payload.text &&
          payload.language &&
          index > -1) {
        this.resolveTranslation(index, payload.language);
        sendResponse({
          ok: true,
          payload: this._queue
        });
      } else {
        sendResponse({
          ok: false,
          error: 'Missing payload, text or language - or text is not in queue'
        });
      }
      break;

      case 'get-queue':
      sendResponse({
        ok: true,
        payload: this._queue
      });
      break;
    }
  }

  addToQueue(text) {
    return new Promise((resolve, reject) => {
      const isInQueue = this._queue.find(i => i.text === text);
      if (isInQueue) {
        if (isInQueue.isResolved) {
          resolve(isInQueue.language);
        } else {
          isInQueue.callbacks.push(resolve);
        }
      } else {
        this._queue.push({
          text: text,
          isResolved: false,
          language: undefined,
          callbacks: [resolve]
        })
      }
      this.updatePopupIcon();
    });
  }

  resolveTranslation(index, language) {
    if (this._queue[index] && !this._queue[index].isResolved) {
      this._queue[index].isResolved = true;
      this._queue[index].language = language;
      this._queue[index].callbacks.forEach(cb => cb(language));
    }
    this.updatePopupIcon();
  }

  updatePopupIcon() {
    const hasUnresolvedRequests = this._queue.some(i => !i.isResolved);
    if (hasUnresolvedRequests) {
      this.setIconToHasNotification();
    } else {
      this.setIconToNormal();
    }
  }

  setIconToNormal() {
    window.chrome.runtime.sendMessage({
      type: 'set-icon',
      payload: {
        hasNotications: false
      }
    }, response => {
      // No-op
    });
  }

  setIconToHasNotification() {
    window.chrome.runtime.sendMessage({
      type: 'set-icon',
      payload: {
        hasNotications: true
      }
    }, response => {
      // No-op
    });
  }
}


window.DC.translationQueue = new TranslationQueue();
window.TranslationQueue = TranslationQueue;

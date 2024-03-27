(() => {
  console.log('ChatGPT monitoring started');

  var hiragana = /[\u3040-\u309f]/;
  var katakana = /[\u30a0-\u30ff]/;
  var kanji = /[\u4e00-\u9faf]/;

  const processMessage = async (msg) => {
    var maxLineLength = msg.options.maxLength;
    var characterToIgnoreText = msg.options.ignore;
    console.log(msg.options);

    switch (msg.action) {
      case 'insert':
        // Do nothing if text starts with special character
        if (msg.text.startsWith(characterToIgnoreText)) break;

        if (maxLineLength >= msg.text.length) {
          // Check if the text is Japanese
          if (hiragana.test(msg.text) || katakana.test(msg.text) || kanji.test(msg.text)) {
            let text = msg.text;
            let promptTextarea = document.querySelector('#prompt-textarea');
            if (!promptTextarea) {
              console.log('Failed to get prompt textarea, did the id or xpath change?');
              break;
            }

            try {
              const replacements = await getDataFromStorage();

              // Process replacements
              if (replacements) {
                for (const item of replacements) {
                  let replacement = item.replacement;
                  // If replacement is a function and not plain text, parse it
                  if (item.function) replacement = new Function('...args', replacement);
                  text = text.replace(item.pattern, replacement);
                }
              } else {
                console.error('No replacements data found in storage.');
              }

              // Then set the text in the prompt
              promptTextarea.value = text;
              // Enable text area (focus and send a fake input event)
              promptTextarea.focus();
              promptTextarea.dispatchEvent(new InputEvent('input', {
                  bubbles: true,
                  cancelable: true,
                  composed: true,
              }));
              // Simulate a 'Enter' key press
              promptTextarea.dispatchEvent(new KeyboardEvent('keydown', {
                  key: 'Enter',
                  code: 'Enter',
                  which: 13,
                  keyCode: 13,
                  bubbles: true,
              }));
            } catch (error) {
              console.error('Error accessing Chrome storage:', error);
            }
          }
        }
        break;

      case 'uninject':
        chrome.runtime.onMessage.removeListener(processMessage);
        break;
    }
  };

  async function getDataFromStorage() {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get('replacements', (data) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(data.replacements);
            }
        });
    });
  }

  chrome.runtime.onMessage.addListener(processMessage);
})();

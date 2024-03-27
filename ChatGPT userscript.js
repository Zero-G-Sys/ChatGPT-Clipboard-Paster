// ==UserScript==
// @name         ChatGPT - Auto VN Translation Extension Helper
// @version      1.0.0
// @grant        GM.setClipboard
// @match        https://chat.openai.com/c/*
// @description  Watch for responses of chatGPT and copy them to clipboard
// @author       Zero_G
// @icon         https://cdn.oaistatic.com/_next/static/media/favicon-32x32.be48395e.png
// ==/UserScript==
(function () {
  const interval = setInterval(() => {
    if (document.querySelector('.flex.flex-col.text-sm.pb-9')) {
      clearInterval(interval);
      console.log('ZERO GPT Catcher Started');
      // Filters to apply to translated text
      // These were originally here, so leaving them as is for compatibility to previous caches (as filtering should be done in setClipboardText)
      const filters = new Map([
        [/º$/, ''], // Remove end of prompt character
        //       [/\"+|\'\'+/g, ''],        // Remove " or ''
        //       [/\.\.\.\.+/g, '...'],     // Change multiple dots (when there are more than 3 to '...' only)
      ]);
      let previousText = '';
      let repetitionCounter = 0;

      const mutationObserver = new MutationObserver(callback);
      var intervalMessage;

      // Add a key that stops the text interval, in case GPT forgets to add º at the end
      document.addEventListener('keydown', (event) => {
        if (event.code == 'Backquote') {
          // º
          clearInterval(intervalMessage);
        }
      });

      // Observe the text div that contains the chat
      mutationObserver.observe(document.querySelector('.flex.flex-col.text-sm.pb-9'), {
        childList: true,
        subtree: true,
      });

      function callback(mutationsList) {
        mutationsList.forEach((mutation) => {
          if (
            mutation.type === 'childList' && // Irrelevant as we are already watching for childList only but meh
            mutation.addedNodes.length !== 0
          ) {
            // Looking for a mutation with an added node
            // Get text from <p> (get as value doesn't work)
            let text = '';
            // Check for added elements/mutations of element type <p>
            for (let addedNode of mutation.addedNodes) {
              // This element appears only when prompt has finished
              if (addedNode.className == 'pr-2 lg:pr-0') {
                console.log('ZERO GPT found pr-2');
                // Get div with latest response prompt
                let textMessages = document.querySelectorAll('.text-message');
                let lastTextMessage = textMessages[textMessages.length - 1];
                if (lastTextMessage.dataset.messageAuthorRole == 'assistant') {
                  // Check that the last data is indeed a response by ChatGPT
                  console.log('ZERO GPT got last text message');
                  //console.log(lastTextMessage.cloneNode(true));
                  lastTextMessage = lastTextMessage.firstChild; // get next div
                  // Loop after pr-2 is done until end of prompt character is found º
                  intervalMessage = setInterval(() => {
                    text = '';
                    for (let i of lastTextMessage.childNodes) {
                      if (i.tagName == 'P') {
                        // For now get only p, that are normal responses, other tags you can get are <ol> (with <li>s inside) and <pre> for code
                        if (i.innerHTML) text = text + i.textContent + '\n';
                      }
                    }
                    text = text.trimEnd();
                    console.log('text before end check: ' + text);

                    if(previousText == text) repetitionCounter++;
                    previousText = text
                    
                    // Check if last character was reached (for now asking GTP end all prompts with 'º')
                    if (/\º$/.test(text) || repetitionCounter == 3) {
                      repetitionCounter = 0;
                      clearInterval(intervalMessage);
                      // Apply filters
                      for (const [key, value] of filters) {
                        text = text.replace(key, value);
                      }

                      if (text.includes('Ω')) text = extractTextAfterOmega(text);

                      // Copy to memory with GreaseMonkey special function (needs @grant)
                      if (text) GM.setClipboard(text);
                    }
                  }, 100);
                }
              }
            }
          }
        });
      }
    }
  }, 300);

  function extractTextAfterOmega(text) {
    // Find the index of '(Ω) '
    const startIndex = text.indexOf('(Ω) ');

    // If '(Ω) ' is found
    if (startIndex !== -1) {
      // Return the substring starting from startIndex + 4
      return text.substring(startIndex + 4);
    } else {
      // If '(Ω) ' is not found, return the original text
      return text;
    }
  }
})();

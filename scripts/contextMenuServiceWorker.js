const getKey = () => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['openai-key'], (result) => {
            if(result['openai-key']) {
                const decodedKey = atob(result['openai-key']);
                // const decodedKey = Buffer.from(result['openai-key'], 'base64').toString('ascii'); //maybe this doesn't work work
                resolve(decodedKey);
            }
        });
    });
};

const sendMessage = (content) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0].id;

        chrome.tabs.sendMessage(
            activeTab,
            { message: 'inject', content },
            (response) => {
                if (response.status === 'failed') {
                    console.log('injection failed.');
                }
            }
        );
    });
};

const generate = async (prompt) => {
    const key = await getKey();
    const url = "https://api.openai.com/v1/completions";

    const completionResponse = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
            model: 'text-davinci-003',
            prompt: prompt,
            max_tokens: 650,
            temperature: 0.8,
        }),
    });

    const completion = await completionResponse.json();
    return completion.choices.pop();
}

const generateCompletionAction = async (info) => {
    try {
        sendMessage('generating...');

        const { selectionText } = info;
        const basePromptPrefixPart1 = 
       `
       Write me a list of productive activities for the person with the following occupation, hobby, and goal. Make sure the activities in the list are non-obvious, descriptive, unique, specific, realistic, productive, and help the person get closer to their goals as fast as possible.

       Occupation, hobby, goal: senior in high school, love to code web apps, be the founder of a successful AI company:
       List of productive activities according to the occupation, hobby, and goal written directly above:
       1. Ship the GPT-3 AI Writer project on buildspace.so.
       2. Connect with AI/ML founders on LinkedIn and ask them for advice.
       3. Create a Next.js app that leverages ML in a cool way.
       4. Get programming advice from members of the Computer Science Club at your high school.
       5. Apply for a part-time job at a Y Combinator startup.
       6. Search Twitter for any other high school students that are building something interesting in AI and connect with them.
       7. Look through hackernews for cool new AI solutions.
       8. Search Google for best sites to learn about machine learning and AI.

       Occupation, hobby, goal:
       `;
       const basePromptPrefixPart2 = 
       `
       List of productive activities according to the occupation, hobby, and goal written directly above:
       `;
       const baseCompletion = await generate(`${basePromptPrefixPart1}${selectionText}\n${basePromptPrefixPart2}\n`);

       const secondPrompt =    `
        Take the list of productive activities below, choose the 5 highest-impact and most effective ones according to the users occupation, hobby, and goal, and expand on each of those 5. Be specific and go in depth for each activity. Dont be repetitive.
   
        occupation, hobby, goal: ${selectionText}
   
        list of productive activities: ${baseCompletion.text}
   
        Choose the 5 highest-impact and most effective activities from the list above and expand on them. Be personal and write using personal pronouns such as “you” and “your company” , as if you were having a conversation with the user:
       `;
       const secondPromptCompletion = await generate(secondPrompt);
       
       sendMessage(secondPromptCompletion.text);

    } catch (error) {
        console.log(error);
        sendMessage(error.toString());
    }
}

chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'context-run',
        title: 'Generate productive activities',
        contexts: ['selection'],
    });
});

chrome.contextMenus.onClicked.addListener(generateCompletionAction);
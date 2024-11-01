const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { Bezier } = require('bezier-js');
const fs = require('fs').promises;
const path = require('path');
const OpenAI = require("openai");
require('dotenv').config({ path: path.join(__dirname, '.env') });

let questionPollingInterval = null;

const DEBUG_MOUSE_CURSOR = false;

const openai = new OpenAI({});

puppeteer.use(StealthPlugin());

const resultsFilePath = path.join(__dirname, 'results.json');

let currentMousePosition = { x: 0, y: 0 };

const username = process.env.USERNAME;
const password = process.env.PASSWORD;


const sessionMultiplier = 1.1 + Math.random() * (1.444444 - 1.1);
console.log(`Session multiplier: ${sessionMultiplier}`);

const saveQueue = [];
let isSaving = false;


const randomDelay = (min = 500, max = 1500) => 
    new Promise(resolve => {
        const baseDelay = Math.floor(Math.random() * (max - min + 1)) + min;
        const adjustedDelay = Math.floor(baseDelay * sessionMultiplier);
        setTimeout(resolve, adjustedDelay);
});

const calculateDistance = (x1, y1, x2, y2) => {
    const deltaX = x2 - x1;
    const deltaY = y2 - y1;
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
};

const generateMousePath = (startX, startY, endX, endY) => {
    const path = [];

    const distance = calculateDistance(startX, startY, endX, endY);

    // Reduce step density: 1 step per 20 pixels, minimum 2 steps
    const steps = Math.max(Math.floor(distance / 10), 4);

    if (distance < 20) {
        // Use linear path for short distances
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = startX + (endX - startX) * t;
            const y = startY + (endY - startY) * t;
            path.push({ x: Math.round(x), y: Math.round(y) });
        }
    } else {
        // Use a simple Bezier curve for longer distances with minimal randomness
        const controlX = startX + (endX - startX) * 0.5 + (Math.random() * 10 - 5); // Minimal randomness
        const controlY = startY + (endY - startY) * 0.5 + (Math.random() * 10 - 5); // Minimal randomness

        const curve = new Bezier(startX, startY, controlX, controlY, endX, endY);

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const { x, y } = curve.get(t);
            path.push({ x: Math.round(x), y: Math.round(y) });
        }
    }

    return path;
};

const moveMouseToElement = async (page, element) => {
    const box = await element.boundingBox();
    if (box) {
        const margin = 10; // pixels

        // Calculate the center of the target element
        const targetCenterX = box.x + box.width / 2;
        const targetCenterY = box.y + box.height / 2;

        // Calculate the direction vector from current position to target center
        const deltaX = targetCenterX - currentMousePosition.x;
        const deltaY = targetCenterY - currentMousePosition.y;

        // Determine the angle of movement
        const angle = Math.atan2(deltaY, deltaX);

        // Bias the click position towards the direction of movement
        // For example, if moving right, click towards the left side of the target element
        const biasFactor = 0.25; // Adjust between 0 (center) to 0.5 (edge)
        const biasedOffsetX = (box.width / 2) * biasFactor * Math.cos(angle);
        const biasedOffsetY = (box.height / 2) * biasFactor * Math.sin(angle);

        // Calculate the biased target coordinates within the target element
        const biasedTargetX = targetCenterX - biasedOffsetX + (Math.random() * 10 - 5); // ±5 pixels randomness
        const biasedTargetY = targetCenterY - biasedOffsetY + (Math.random() * 10 - 5); // ±5 pixels randomness

        // Ensure the biasedTargetX and biasedTargetY are within the element's bounds
        const finalTargetX = Math.min(Math.max(biasedTargetX, box.x + margin), box.x + box.width - margin);
        const finalTargetY = Math.min(Math.max(biasedTargetY, box.y + margin), box.y + box.height - margin);

        const path = generateMousePath(currentMousePosition.x, currentMousePosition.y, finalTargetX, finalTargetY);

        const totalSteps = path.length;
        const groupSize = 2; // Number of steps per group (adjust between 3-5 as needed)

        // Generate a random total movement time between 200ms and 450ms
        const totalMovementTime = Math.floor(Math.random() * (950 - 400 + 1)) + 400; // 400-950ms
        console.log(`Total Movement Time: ${totalMovementTime}ms`);

        // Calculate the number of groups
        const numberOfGroups = Math.ceil(totalSteps / groupSize);

        // Function to calculate ease-in-out quadratic weight
        const easeInOutQuad = (t) => {
            return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        };

        // Calculate weights for each group based on their position
        const weights = [];
        for (let i = 0; i < numberOfGroups; i++) {
            const t = (i + 0.5) / numberOfGroups; // Midpoint of the group
            weights.push(easeInOutQuad(t));
        }

        // Normalize weights so that their sum equals 1
        const sumWeights = weights.reduce((acc, val) => acc + val, 0);
        const normalizedWeights = weights.map(w => w / sumWeights);

        // Calculate delay for each group
        const delays = normalizedWeights.map(w => Math.floor(w * totalMovementTime));

        // Adjust delays to ensure the total delay equals totalMovementTime
        let accumulatedDelay = delays.reduce((acc, val) => acc + val, 0);
        const remainingDelay = totalMovementTime - accumulatedDelay;
        if (remainingDelay > 0 && delays.length > 0) {
            delays[delays.length - 1] += remainingDelay; // Add the remaining delay to the last group
        }

        console.log(`Delays Between Groups: ${delays}ms`);

        for (let i = 0; i < numberOfGroups; i++) {
            const start = i * groupSize;
            const end = start + groupSize;
            const group = path.slice(start, end);
            for (const point of group) {
                await page.mouse.move(point.x, point.y);
                if (DEBUG_MOUSE_CURSOR) {
                    await page.evaluate(
                        (x, y) => {
                            let cursor = document.getElementById('custom-cursor');
                            if (!cursor) {
                                cursor = document.createElement('div');
                                cursor.id = 'custom-cursor';
                                cursor.style.position = 'absolute';
                                cursor.style.width = '6px';
                                cursor.style.height = '6px';
                                cursor.style.borderRadius = '50%';
                                cursor.style.backgroundColor = 'red';
                                cursor.style.zIndex = '9999';
                                document.body.appendChild(cursor);
                            }
                            cursor.style.top = `${y}px`;
                            cursor.style.left = `${x}px`;
                        },
                        point.x,
                        point.y
                    );
                }
            }

            // Introduce the calculated delay after each group
            await new Promise(resolve => setTimeout(resolve, delays[i]));
        }

        // Optional: Pause briefly after reaching the target to simulate hover
        await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 100) + 50)); // 50-150ms

        currentMousePosition = { x: finalTargetX, y: finalTargetY };
    };
};

const humanClick = async (page, element, selector = null) => {
    await moveMouseToElement(page, element);
    await randomDelay(100, 500);
    const maxRetries = 2;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            // Ensure the element is still connected to the DOM
            const isConnected = await page.evaluate(el => el.isConnected, element);
            if (!isConnected) {
                throw new Error('Element is detached from the DOM.');
            }

            // Ensure the element is an actual Element node
            const tagName = await page.evaluate(el => el.tagName, element);
            if (!tagName) {
                throw new Error('Node is not an Element.');
            }

            // Check if the element is visible
            const isVisible = await page.evaluate(el => {
                const style = window.getComputedStyle(el);
                return style && style.visibility !== 'hidden' && style.display !== 'none' && style.opacity !== '0';
            }, element);
            if (!isVisible) {
                throw new Error('Element is not visible.');
            }

            // Check if the element is within the viewport
            const isInViewport = await element.isIntersectingViewport();
            if (!isInViewport) {
                throw new Error('Element is not within the viewport.');
            }

            // Attempt to click the element
            await element.click();
            console.log("Human-like click performed.");
            return; // Exit the function after a successful click

        } catch (err) {
            if (
                err.message.includes('detached from the DOM') ||
                err.message.includes('not an Element') ||
                err.message.includes('not visible') ||
                err.message.includes('not within the viewport')
            ) {
                console.warn(`Attempt ${attempt + 1}: ${err.message} Retrying...`);
                attempt++;

                // Optional: If a selector is provided, try re-querying the element
                if (selector) {
                    element = await page.$(selector);
                    if (!element) {
                        console.error(`Failed to re-query the element using selector "${selector}".`);
                        break;
                    }
                }

                await randomDelay(500, 1000); // Wait before retrying
            } else {
                console.error("Error during human-like click:", err);
                break; // Break out of the loop for other types of errors
            }
        }
    }

    console.error("Failed to perform human-like click after multiple attempts.");
};

const humanType = async (page, selector, text, maxRetries = 2, retryDelay = 1000) => {
    let element = await page.$(selector);
    let attempts = 0;

    while (!element && attempts < maxRetries) {
        console.warn(`Element with selector "${selector}" not found. Retrying in ${retryDelay}ms... (Attempt ${attempts + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        element = await page.$(selector);
        attempts++;
    }

    if (!element) {
        console.error(`Element with selector "${selector}" not found after ${maxRetries} attempts. Skipping typing.`);
        return;
    }

    try {
        await moveMouseToElement(page, element);
        await randomDelay(300, 700);

        let typedText = '';
        const randomChars = 'abcdefghijklmnopqrstuvwxyz';

        for (const char of text) {
            // 3% chance to make a mistake
            if (Math.random() < 0.03 && typedText.length > 0) {
                const wrongChar = randomChars.charAt(Math.floor(Math.random() * randomChars.length));
                await page.type(selector, wrongChar, { delay: Math.floor(Math.random() * 100) + 100 });
                typedText += wrongChar;

                await randomDelay(100, 300); // Brief pause

                await page.keyboard.press('Backspace'); // Delete mistake
                typedText = typedText.slice(0, -1); // Remove last char
            }

            await page.type(selector, char, { delay: Math.floor(Math.random() * 200) + 30 });
            typedText += char;

            if (char === ' ' && Math.random() < 0.3) { // Pause after spaces
                await randomDelay(200, 700);
            }
        }

        console.log("Human-like typing with mistakes and pauses performed.");
    } catch (err) {
        console.error(`Failed to type into "${selector}":`, err.message);
    }
};

const initializeResultsFile = async () => {
    try {
        await fs.access(resultsFilePath);
        // File exists, no action needed
    } catch (err) {
        if (err.code === 'ENOENT') {
            // File does not exist, create it with an empty array
            try {
                await fs.writeFile(resultsFilePath, '[]', 'utf8');
                console.log('Initialized results.json with an empty array.');
            } catch (writeErr) {
                console.error('Error initializing results.json:', writeErr);
            }
        } else {
            console.error('Error accessing results.json:', err);
        }
    }
};

const enqueueSave = (question, choices, answer, firstLetter = null) => {
    saveQueue.push({ question, choices, answer, firstLetter });
    processQueue();
};

const processQueue = async () => {
    if (isSaving || saveQueue.length === 0) return;

    isSaving = true;
    const { question, choices, answer, firstLetter } = saveQueue.shift();

    try {
        await saveResult(question, choices, answer, firstLetter);
    } catch (err) {
        console.error('Error processing save operation:', err);
    } finally {
        isSaving = false;
        processQueue();
    }
};

const saveResult = async (question, choices, answer, firstLetter) => {
    try {
        let data = [];

        try {
            const fileContent = await fs.readFile(resultsFilePath, 'utf8');
            if (fileContent.trim()) {
                data = JSON.parse(fileContent);
            } else {
                console.log('results.json is empty. Initializing with an empty array.');
            }
        } catch (err) {
            if (err.code !== 'ENOENT') {
                if (err instanceof SyntaxError) {
                    console.error('Error parsing JSON file. The file might be corrupted. Initializing with an empty array.');
                    data = [];
                } else {
                    console.error('Error reading JSON file:', err);
                    return;
                }
            }
        }

        const isDuplicate = data.some(entry => entry.question.toLowerCase() === question.toLowerCase());

        if (isDuplicate) {
            console.log('Duplicate entry found. Skipping save for this question.');
            return;
        }

        const newEntry = { question, choices, answer };
        if (firstLetter) newEntry.firstLetter = firstLetter;
        data.push(newEntry);

        await fs.writeFile(resultsFilePath, JSON.stringify(data, null, 2), 'utf8');
        console.log('Result saved to results.json');
    } catch (err) {
        console.error('Error saving result:', err);
    }
};

const getAnswerFromLLM = async (prompt, validResponses, options = {}) => {
    try {
        const response = await openai.chat.completions.create({
            model: options.model || 'gpt-4o-mini',
            messages: [
                { role: 'system', content: options.systemPrompt || 'You are a helpful assistant.' },
                { role: 'user', content: prompt },
            ],
            max_tokens: options.max_tokens || 150,
            temperature: options.temperature || 0.7,
            n: 1,
            stop: options.stop || null,
        });

        const answer = response.choices[0].message.content.trim();

        // Validate the response against validResponses
        const isValid = validResponses.some(pattern => {
            if (typeof pattern === 'string') {
                return answer.toUpperCase() === pattern;
            } else if (pattern instanceof RegExp) {
                return pattern.test(answer);
            }
            return false;
        });

        if (isValid) {
            return answer.toUpperCase();
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error fetching completion:', error);
        return null;
    }
};

const findAnswerInJson = async (question) => {
    try {
        const fileContent = await fs.readFile(resultsFilePath, 'utf8');
        const data = JSON.parse(fileContent);
        const entry = data.find(item => item.question.toLowerCase() === question.toLowerCase());
        return entry ? entry.answer : null;
    } catch (err) {
        console.error('Error reading JSON file:', err);
        return null;
    }
};

const clickCorrectAnswer = async (page, correctAnswer) => {
    const maxAttempts = 2;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        try {
            // Wait a bit before attempting to click
            await randomDelay(500, 2000);
            
            // Re-query for choices each attempt in case the DOM has updated
            const choices = await page.$$('.choice');
            
            // Check if any choices exist
            if (!choices.length) {
                console.log(`No choices found on attempt ${attempts + 1}`);
                attempts++;
                continue;
            }

            let targetChoice = null;

            for (const choice of choices) {
                // Verify element is still attached to DOM
                const isAttached = await page.evaluate(el => el.isConnected, choice);
                if (!isAttached) continue;

                // Get the text content of the choice
                const text = await page.evaluate(el => el.textContent.trim(), choice);
                
                if (text.toLowerCase() === correctAnswer.toLowerCase()) {
                    targetChoice = choice;
                    break;
                }
            }

            if (targetChoice) {
                // Additional check to ensure element is visible and clickable
                const box = await targetChoice.boundingBox();
                if (!box) {
                    console.log("Choice element has no bounding box. Skipping.");
                    attempts++;
                    continue;
                }

                // Use the updated humanClick function
                await humanClick(page, targetChoice);
                return true;
            } else {
                console.log(`Could not find the correct answer: "${correctAnswer}" on attempt ${attempts + 1}`);
                attempts++;

                // If we've tried multiple times, try clicking using JavaScript directly
                if (attempts === maxAttempts - 1) {
                    console.log("Attempting fallback click method...");
                    const clicked = await page.evaluate((answerText) => {
                        const elements = Array.from(document.querySelectorAll('.choice'));
                        const element = elements.find(el => 
                            el.textContent.trim().toLowerCase() === answerText.toLowerCase());
                        if (element) {
                            element.click();
                            return true;
                        }
                        return false;
                    }, correctAnswer);
                    
                    if (clicked) {
                        console.log("Successfully clicked using fallback method");
                        return true;
                    } else {
                        console.log("Fallback click method failed.");
                    }
                }
            }

        } catch (err) {
            console.log(`Error during click attempt ${attempts + 1}:`, err.message);
            attempts++;
            
            if (attempts === maxAttempts) {
                console.error("Failed to click after maximum attempts");
                return false;
            }
        }
    }
    
    return false;
};

const safeWaitForSelector = async (selector, page, timeout = 30000) => {
    try {
        await page.waitForSelector(selector, { timeout });
        return true;
    } catch (error) {
        console.log(`Error: failed to find element matching selector "${selector}". Skipping.`);
        return false;
    }
};

const extractQuestionAndAnswers = async (page) => {
    const questionData = await page.evaluate(() => {
        const questionElement = document.querySelector('#single-question');
        let text = questionElement ? questionElement.textContent.replace(/\s+/g, ' ').trim() : null;
        if (text) {
            text = text.replace(/ Correct!$/, '').replace(/ Incorrect!$/, '');
        }

        const img = document.querySelector('#constellation > img[alt="constellation question"]');
        const hasImage = img !== null;

        return { text, hasImage };
    });

    let answers = [];
    if (questionData.text) {
        answers = await page.evaluate(() => {
            const answerElements = Array.from(document.querySelectorAll('.choice'));
            return answerElements.length
                ? answerElements
                      .map(el => el.textContent.replace(/\s+/g, ' ').trim())
                      .filter(choice => {
                          const normalized = choice.toLowerCase().replace(/’/g, "'");
                          return normalized !== "i'm not sure";
                      })
                : [];
        });
    }

    return { question: questionData.text, answers, hasImage: questionData.hasImage };
};

const extractMCQQuestionAndAnswers = async (page) => {
    // Extract the question text and check for associated image
    const questionData = await page.evaluate(() => {
        // Attempt to select the question from '#single-question > h3'
        let questionElement = document.querySelector('#single-question > h3');
        let text = questionElement ? questionElement.textContent.replace(/\s+/g, ' ').trim() : null;

        // If not found, attempt to select the question from '#single-question > p'
        if (!text) {
            questionElement = document.querySelector('#single-question > p');
            text = questionElement ? questionElement.textContent.replace(/\s+/g, ' ').trim() : null;
        }

        // Clean up the question text if necessary
        if (text) {
            text = text.replace(/ Correct!$/, '').replace(/ Incorrect!$/, '');
        }

        // Check if there's an associated image with the question
        const img = document.querySelector('#constellation > img[alt="constellation question"]');
        const hasImage = img !== null;

        return { text, hasImage };
    });

    let answers = [];

    // If a question was found, proceed to extract the answer choices
    if (questionData.text) {
        answers = await page.evaluate(() => {
            // Select all elements that represent answer choices
            const answerElements = Array.from(document.querySelectorAll('.choice'));
            
            // Extract and clean the text from each choice, excluding "I'm not sure" options
            return answerElements.length
                ? answerElements
                      .map(el => el.textContent.replace(/\s+/g, ' ').trim())
                      .filter(choice => {
                          const normalized = choice.toLowerCase().replace(/’/g, "'");
                          return normalized !== "i'm not sure";
                      })
                : [];
        });
    }

    return { question: questionData.text, answers, hasImage: questionData.hasImage };
};

const extractHint = async (page) => {
    return await page.evaluate(() => {
        const hintDiv = document.querySelector('#word-hint > p > span');
        return hintDiv ? hintDiv.textContent.trim() : null;
    });
};

const extractFillBlankLength = async (page) => {
    return await page.evaluate(() => {
        const input = document.querySelector('#choice');
        return input ? parseInt(input.getAttribute('maxlength'), 10) + 1 : null;
    });
};

const extractFirstLetter = async (page) => {
    return await page.evaluate(() => {
        const firstLetterSpan = document.querySelector('#answer-box .first-letter');
        return firstLetterSpan ? firstLetterSpan.textContent.trim() : null;
    });
};

const generateRandomString = (length) => {
    const keyClusters = [
        'qwert', 'asdfg', 'zxcvb',
        'yuiop', 'hjkl;', 'bnm,./',
        '12345', '67890'
    ];

    const randomCluster = keyClusters[Math.floor(Math.random() * keyClusters.length)];

    let result = '';
    for (let i = 0; i < length; i++) {
        result += randomCluster.charAt(Math.floor(Math.random() * randomCluster.length));
    }
    return result;
};

const detectAndLogQuestionType = async (page) => {

    const isStopClickQuestion = await page.$('#Click_me_to_stop') !== null;
    
    if (isStopClickQuestion) {
        console.log("Stop Click Question Detected.");
        console.log("Click me to stop");
        return { questionType: 'stop_click_question' };
    }

    const isPracticeQuestion = await page.$('#next-btn') !== null;
    const isIKTElementPresent = await page.$('#ikt') !== null;

    if (isPracticeQuestion || isIKTElementPresent) {
        console.log("Practice Question Detected.");
        console.log(`isIKTElementPresent: ${isIKTElementPresent}`);
        return { questionType: 'practice', isIKTElementPresent };
    }

    const { question, answers, hasImage } = await extractQuestionAndAnswers(page);

    if (question) {
        const mcqRegex = /^Q:\s*Choose the word that fits best/i;

        if (mcqRegex.test(question) && hasImage) {
            const hint = await extractHint(page);
            console.log(`Image Multiple Choice Question Detected: ${question}`);
            if (hint) console.log(`Hint: ${hint}`);
            console.log(`Answer Choices: ${answers}`);
            return { questionType: 'mcq_image', hint };
        }

        const isFillInTheBlank = await page.$('#answer-box') !== null;
        if (isFillInTheBlank) {
            const hint = await extractHint(page);
            const wordLength = await extractFillBlankLength(page);
            const firstLetter = await extractFirstLetter(page);

            console.log(`Fill-in-the-Blank Question Detected: ${question}`);
            if (hint) console.log(`Hint: ${hint}`);
            if (wordLength !== null) console.log(`Word Length: ${wordLength}`);
            else console.log("Word Length: Not Available");
            if (firstLetter) console.log(`First Letter: ${firstLetter}`);
            else console.log("First Letter: Not Available");

            return { questionType: 'fill_in_the_blank', hint, wordLength, firstLetter };
        }

        // **Integrated Multiple Choice Handling from Old Code**
        const hint = await extractHint(page);
        if (hint) console.log(`Hint: ${hint}`);
        return { questionType: 'mcq', hint };
    } else {
        console.log("Unable to determine the type of the current question.");
        return { questionType: 'unknown', hint: null };
    }
};

const tryClick15MinButton = async (page) => {
    const buttonSelector = '#\\31 5_min_'; 

    try {
        // Wait for the button to appear (if it does) and be clickable
        const buttonAppeared = await safeWaitForSelector(buttonSelector, page, 10000);
        if (buttonAppeared) {
            const buttonElement = await page.$(buttonSelector);
            if (buttonElement) {
                console.log("Found the '15 min' button. Attempting to click...");
                await humanClick(page, buttonElement); // Perform human-like click
                console.log("'15 min' button clicked successfully.");
            }
        } else {
            console.log("'15 min' button did not appear. Skipping this step.");
        }
    } catch (err) {
        console.error("Error while trying to click the '15 min' button:", err);
    }
};

(async () => {
    await initializeResultsFile();


    console.log("Launching the browser...");
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--mute-audio', '--start-maximized',],
    });

    const page = await browser.newPage();
    const { width, height } = await page.evaluate(() => ({
        width: window.screen.availWidth,
        height: window.screen.availHeight
      }));
      await page.setViewport({ width, height });
      
    console.log("Browser launched and new page opened.");

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/91.0.4472.124 Safari/537.36');
    console.log("User agent set.");

    // Navigate to Login Page
    console.log("Navigating to the login page...");
    await page.goto('https://membean.com/login', { waitUntil: 'domcontentloaded' });
    console.log("Login page loaded.");

    // Fill in Login Form
    console.log("Filling in the login form...");
    await humanType(page, '#username', username);
    await humanType(page, '#password', password);

    // Click Login Button
    console.log("Clicking the login button...");
    const loginButton = await page.$('#login > div:nth-child(4) > button');
    if (loginButton) {
        await humanClick(page, loginButton);
        await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
        console.log("Dashboard page loaded.");
    } else {
        console.error("Login button not found.");
        await browser.close();
        mainLLMProcess.kill();
        fillBlankLLMProcess.kill();
        process.exit(1);
    }

    // Click 'Start Training' Button
    console.log("Waiting for the 'Start Training' button to become clickable...");
    await page.waitForFunction(
        () => document.querySelector('#startTrainingBtn') && !document.querySelector('#startTrainingBtn').disabled,
        { timeout: 0 }
    );
    console.log("'Start Training' button is clickable.");

    await randomDelay(2000, 4000);
    console.log("Clicking the 'Start Training' button...");
    const startTrainingButton = await page.$('#startTrainingBtn');
    if (startTrainingButton) {
        await humanClick(page, startTrainingButton);
    } else {
        console.error("'Start Training' button not found.");
        await browser.close();
        mainLLMProcess.kill();
        fillBlankLLMProcess.kill();
        process.exit(1);
    }

    console.log("Waiting for the 'Start Training' button to become clickable...");
    await tryClick15MinButton(page);

    
    console.log("Waiting for the first question to load...");

    // Polling Mechanism Variables
    let lastIsIKTElementPresent = null;
    let lastPracticeWordForm = null;
    let lastQuestionType = null;
    const processedImageQuestions = new Set();
    const processedFillInTheBlankQuestions = new Set();
    const processedQuestions = new Set();
    const processedMCQQuestions = new Set();
    let isProcessing = false;


    const handleQuestion = async () => {
        if (isProcessing) return;
        isProcessing = true;
    
        try {
            const detectionResult = await detectAndLogQuestionType(page);
            let { questionType, isIKTElementPresent, hint, wordLength, firstLetter } = detectionResult;
    
    
            // Handle the current question based on its type
            switch (questionType) {
                case 'practice':
                    await handlePracticeQuestion(page, isIKTElementPresent);
                    lastQuestionType = 'practice';
                    break;
                case 'fill_in_the_blank':
                    await handleFillInTheBlankQuestion(page, hint, wordLength, firstLetter, lastPracticeWordForm, lastIsIKTElementPresent);
                    lastQuestionType = 'fill_in_the_blank';
                    break;
                case 'mcq_image':
                    await handleMCQImageQuestion(page);
                    lastQuestionType = 'mcq';
                    break;
                case 'mcq':
                    await handleMCQQuestion(page, hint, processedMCQQuestions);
                    lastQuestionType = 'mcq';
                    break;
                case 'stop_click_question':
                    await handleStopClickQuestion(page, browser, questionPollingInterval);
                    lastQuestionType = 'stop_click_question';
                    break;
                case 'reload':
                    await handleReloadQuestion(page);
                    break;
                case 'unknown':
                default:
                    console.log("Encountered an unknown question type. Skipping.");
                    isIKTElementPresent = lastIsIKTElementPresent // Keep the last value
                    break;
            }

            lastIsIKTElementPresent = isIKTElementPresent
    
        } catch (err) {
            console.error("Error in handling question:", err);
        } finally {
            isProcessing = false;
        }
    };
    

    const handlePracticeQuestion = async (page, isIKTElementPresent) => {
        console.log("Handling practice question...");
        await randomDelay(2500, 4500);
    
        const choices = await page.$$('.choice');
        for (const choice of choices) {
            if (await choice.evaluate(el => el.isConnected)) {
                await humanClick(page, choice);
                console.log("Clicked on a choice.");
                await randomDelay(300, 1200);
            } else {
                console.log("Choice element is detached from the document. Skipping click.");
            }
        }
    
        // Corrected Selector: 'h1.wordform'
        const wordForm = await page.evaluate(() => {
            const header = document.querySelector('h1.wordform');
            return header ? header.textContent.trim() : null;
        });

        console.log(`Word Form: ${wordForm}`);
        lastPracticeWordForm = wordForm;

    
        await randomDelay(1500, 3500);
    
        const nextBtn = await page.$('#next-btn');
        if (nextBtn) {
            await humanClick(page, nextBtn);
            await randomDelay(2000, 3000);
            console.log("Clicked 'Next' to proceed to the following question.");
        } else {
            console.log("Next button not found. Skipping click.");
        }
    
        // Update lastIsIKTElementPresent based on the current question
        lastIsIKTElementPresent = isIKTElementPresent;
    };
    
    
    const handleFillInTheBlankQuestion = async (
        page,
        hint,
        wordLength,
        firstLetter,
        lastPracticeWordForm,
        lastIsIKTElementPresent
    ) => {
        // Extract the current question text to uniquely identify the FIB question
        const currentQuestionText = await page.evaluate(() => {
            const questionElement = document.querySelector('#single-question');
            return questionElement
                ? questionElement.textContent.replace(/\s+/g, ' ').trim()
                : null;
        });
    
        if (!currentQuestionText) {
            console.log("Unable to extract fill-in-the-blank question text. Skipping processing.");
            return;
        }
    
        // Proceed with handling the FIB question
        if (lastQuestionType === 'practice' && lastIsIKTElementPresent) {
            console.log("Using the last practice word form to fill in the blank.");
            const answerBoxSelector = '#choice';
            await humanType(page, answerBoxSelector, lastPracticeWordForm)
                .then(() => {
                    console.log(`Filled in the blank with the last practice word form: ${lastPracticeWordForm}`);
                })
                .catch((err) => {
                    console.error(`Failed to type into ${answerBoxSelector}:`, err.message);
                });
        } else {
            if (wordLength && hint) { // Removed firstLetter requirement
                console.log("Using Fill-in-the-Blank LLM to guess the word...");
                try {
                    const fillBlankPrompt = `What is a ${wordLength}-letter word that starts with '${firstLetter}' and means something similar to '${hint}'? Provide only the word as the answer.`;
    
                    const guessedWord = await getAnswerFromLLM(
                        fillBlankPrompt,
                        ['UNKNOWN', /^[a-zA-Z]+$/],
                        {
                            model: 'gpt-4o-mini',
                            systemPrompt: 'You are an assistant that provides single-word answers based on given clues. Only respond with your answer; your answer should be a capital letter.',
                            max_tokens: 10,
                            temperature: 0,
                        }
                    );
    
                    console.log(`Fill-in-the-Blank LLM Guessed Word: ${guessedWord}`);
    
                    if (guessedWord && guessedWord.toLowerCase() !== 'unknown' && /^[A-Za-z]+$/.test(guessedWord)) {
                        // Remove the first character (already provided)
                        const processedWord = guessedWord.substring(1);
                        console.log(`Processed Word (without first letter): ${processedWord}`);
    
                        const answerBoxSelector = '#choice';
                        await humanType(page, answerBoxSelector, processedWord)
                            .then(() => {
                                console.log(`Filled in the blank with LLM guessed word: ${processedWord}`);
                            })
                            .catch((err) => {
                                console.error(`Failed to type into ${answerBoxSelector}:`, err.message);
                            });
                    } else {
                        console.log("LLM did not provide a valid word. Filling with random characters.");
                        const remainingLength = wordLength - 1;
                        const randomChars = generateRandomString(remainingLength);
                        const answerBoxSelector = '#choice';
                        await humanType(page, answerBoxSelector, randomChars)
                            .then(() => {
                                console.log(`Filled in the blank with random characters: ${randomChars}`);
                            })
                            .catch((err) => {
                                console.error(`Failed to type into ${answerBoxSelector}:`, err.message);
                            });
                    }
                } catch (err) {
                    console.error('Error communicating with OpenAI:', err);
                    if (wordLength) {
                        const remainingLength = wordLength - 1;
                        const randomChars = generateRandomString(remainingLength);
                        const answerBoxSelector = '#choice';
                        await humanType(page, answerBoxSelector, randomChars)
                            .then(() => {
                                console.log(`Filled in the blank with random characters due to error: ${randomChars}`);
                            })
                            .catch((err) => {
                                console.error(`Failed to type into ${answerBoxSelector}:`, err.message);
                            });
                    }
                }
            } else {
                console.log("Insufficient data to use Fill-in-the-Blank LLM. Skipping.");
            }
        }
    
        // After handling the FIB question, mark it as processed
        processedFillInTheBlankQuestions.add(currentQuestionText);
        console.log("Marked the fill-in-the-blank question as processed to prevent duplicate handling.");
    };
    
    
    
    const handleMCQImageQuestion = async (page) => {
        console.log("Handling multiple choice question with image.");
        
        // Extract the current question text to use as a unique identifier
        const currentQuestionText = await page.evaluate(() => {
            const questionElement = document.querySelector('#single-question');
            return questionElement ? questionElement.textContent.replace(/\s+/g, ' ').trim() : null;
        });
    
        if (!currentQuestionText) {
            console.log("Unable to extract question text. Skipping image MCQ handling.");
            return;
        }
    
        // Check if this image question has already been processed
        if (processedImageQuestions.has(currentQuestionText)) {
            console.log("This image-based question has already been handled. Skipping to prevent multiple clicks.");
            return;
        }
    
        // Proceed to handle the image MCQ
        const mcqImageChoices = await page.$$('.choice');
        if (mcqImageChoices.length > 0) {
            await randomDelay(4000, 8000);
            const randomIndex = Math.floor(Math.random() * mcqImageChoices.length);
            await humanClick(page, mcqImageChoices[randomIndex]);
            console.log(`Answered multiple choice question with image randomly: Choice ${randomIndex + 1}`);
            
            // Add the question to the processed set
            processedImageQuestions.add(currentQuestionText);
        } else {
            console.log("No choices found for image MCQ. Skipping.");
        }
    };
    

    const handleMCQQuestion = async (page, hint, processedMCQQuestions) => {
        const { question: currentQuestion, answers: currentAnswers } = await extractMCQQuestionAndAnswers(page);
        console.log(currentQuestion);
        console.log(currentAnswers);
        if (!currentQuestion) {
            console.log("Failed to extract the current question or answers.");
            return;
        }
        
    
        const questionKey = currentQuestion.toLowerCase();
    
        // Check if the question has already been processed or exists in JSON
        const storedAnswer = await findAnswerInJson(currentQuestion);
        if (storedAnswer) {
            console.log(`This question has already been processed. Skipping LLM request.`);
            await clickCorrectAnswer(page, storedAnswer);
            return;
        }
    
        // Check if the question has been processed in this session
        if (processedMCQQuestions.has(questionKey)) {
            console.log(`This multiple-choice question has already been processed. Skipping.`);
            return;
        }
    
        // Mark the question as being processed
        processedMCQQuestions.add(questionKey);
    
        // Attempt to detect the correct answer from the page (if possible)
        const correctAnswer = await page.evaluate(() => {
            const correctElement = document.querySelector('.choice.correct');
            return correctElement ? correctElement.textContent.replace(/\s+/g, ' ').trim() : null;
        });
    
        if (correctAnswer) {
            console.log("Correct Answer Detected:", correctAnswer);
            enqueueSave(currentQuestion, currentAnswers, correctAnswer);
            // Click the correct answer
            await clickCorrectAnswer(page, correctAnswer);
            // Remove from processedMCQQuestions as it's handled
            processedMCQQuestions.delete(questionKey);
            return;
        }
    
        // If correct answer isn't directly available, proceed to use LLM
        console.log("Answer not found in JSON. Using LLM to guess the answer.");
    
        const numChoices = currentAnswers.length;
        const validLetters = ['A', 'B', 'C', 'D', 'E'].slice(0, numChoices);
        const lettersInPrompt = validLetters.join(', ');
    
        const options = currentAnswers.map((choice, idx) => `${String.fromCharCode(65 + idx)}) ${choice}`).join(', ');
        const prompt = `Question: ${currentQuestion} | Answer options: ${options} | Answer (respond with only the letter ${lettersInPrompt} or 'Unknown'):`;
        console.log(`Sending to LLM`);
    
        let guessedAnswer = null;
        const maxLLMAttempts = 2;
    
        for (let attempt = 1; attempt <= maxLLMAttempts; attempt++) {
            try {
                guessedAnswer = await getAnswerFromLLM(prompt, [...validLetters, 'UNKNOWN'], {
                    model: 'gpt-4o-mini',
                    systemPrompt: 'You are an assistant that selects the best multiple-choice answer. You should only respond with the letter of the choice if you don’t know, then guess. Sometimes the answers will appear directly after the question; if this happens, just ignore them.',
                    max_tokens: 10,
                    temperature: 0,
                });
                console.log(`Main LLM Guessed Answer (Attempt ${attempt}): ${guessedAnswer}`);
    
                // Check if the response is valid
                if (guessedAnswer && validLetters.includes(guessedAnswer.toUpperCase())) {
                    break; // Valid answer received
                } else {
                    console.log(`Guessed answer "${guessedAnswer}" is not among valid options (${lettersInPrompt}).`);
                    guessedAnswer = null; // Reset for next attempt
                }
            } catch (err) {
                console.error(`Error communicating with OpenAI on attempt ${attempt}:`, err);
                guessedAnswer = null; // Reset for next attempt
            }
        }
    
        if (guessedAnswer && validLetters.includes(guessedAnswer.toUpperCase())) {
            const answerIndex = validLetters.indexOf(guessedAnswer.toUpperCase());
            if (answerIndex !== -1 && answerIndex < currentAnswers.length) {
                const choiceElements = await page.$$('.choice');
                if (choiceElements[answerIndex]) {
                    await randomDelay(2000, 5000);
                    await humanClick(page, choiceElements[answerIndex]);
                    console.log(`Clicked on the guessed answer: ${guessedAnswer.toUpperCase()}`);
                    // Enqueue the answer to save it
                    const correctChoice = currentAnswers[answerIndex];
                    enqueueSave(currentQuestion, currentAnswers, correctChoice);
                    await randomDelay(1000, 2000);
                } else {
                    console.log(`Guessed answer index ${answerIndex} is out of bounds.`);
                }
            } else {
                console.log(`Guessed answer "${guessedAnswer}" is invalid or out of range.`);
            }
        } else {
            // After two failed attempts, pick a random choice
            console.log("LLM failed to provide a valid answer after two attempts. Picking a random choice.");
            const randomChoiceIndex = Math.floor(Math.random() * numChoices);
            const randomChoice = currentAnswers[randomChoiceIndex];
            const randomLetter = String.fromCharCode(65 + randomChoiceIndex);
            console.log(`Picking a random choice: ${randomLetter}) ${randomChoice}`);
            const choiceElements = await page.$$('.choice');
            if (choiceElements[randomChoiceIndex]) {
                await randomDelay(2000, 5000);
                await humanClick(page, choiceElements[randomChoiceIndex]);
                console.log(`Clicked on the random choice: ${randomLetter}) ${randomChoice}`);
                // Enqueue the answer to save it
                enqueueSave(currentQuestion, currentAnswers, randomChoice);
                await randomDelay(1000, 2000);
            } else {
                console.log(`Random choice index ${randomChoiceIndex} is out of bounds.`);
            }
        }
    
        // Remove the question from processedMCQQuestions regardless of outcome to prevent reprocessing
        processedMCQQuestions.delete(questionKey);
    };
    
    const handleStopClickQuestion = async (page, browser, pollingIntervalId) => {
        console.log("Detected a 'Click me to stop' question.");

        // Select the "Click me to stop" button
        const stopButton = await page.$('#Click_me_to_stop');
        if (stopButton) {
            // Perform a human-like click on the button
            await humanClick(page, stopButton);
            console.log("Clicked the 'Click me to stop' button.");
        } else {
            console.log("'Click me to stop' button not found.");
        }

        // Wait for 10 seconds
        console.log("Waiting for 10 seconds before terminating...");
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Clear the polling interval to stop further question handling
        if (pollingIntervalId) {
            clearInterval(pollingIntervalId);
            console.log("Polling stopped.");
        }

        try {
            await browser.close();
            console.log("Browser closed.");
        } catch (err) {
            console.error("Error closing the browser:", err);
        }

        // Terminate the script
        console.log("Terminating the script as per 'Click me to stop' instruction.");
        process.exit(0);
    };

    

    const handleReloadQuestion = async (page) => {
        console.log("Reloading the question due to previous error.");
        // Implement any specific reload logic if necessary
    };

    if (await safeWaitForSelector('#single-question', page, 4000) || await safeWaitForSelector('#next-btn', page, 1000)) {
        console.log("First question element detected.");
        await handleQuestion();
        await randomDelay(1800, 2500);
        console.log("Polling for new questions...");
        questionPollingInterval = setInterval(handleQuestion, 2000 + Math.floor(Math.random() * 500)); // Poll every 2-2.5 seconds
    } else {
        console.log("Could not find the first question element. Exiting.");
    }

    process.on('SIGINT', async () => {
        console.log('\nGracefully shutting down...');
        while (saveQueue.length > 0 || isSaving) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        await browser.close();
        process.exit(0);
    });
})();

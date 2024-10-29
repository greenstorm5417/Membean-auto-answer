const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

// Apply the stealth plugin to Puppeteer
puppeteer.use(StealthPlugin());

// Define the path to the JSON file
const resultsFilePath = path.join(__dirname, 'results.json');


let currentMousePosition = { x: 0, y: 0 };

const username = 'your email'
const password = 'your password'


// Helper Functions
const randomDelay = (min = 500, max = 1500) => 
    new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min));


const generateMousePath = (startX, startY, endX, endY) => {
    const path = [];
    const distance = Math.hypot(endX - startX, endY - startY);
    const steps = Math.max(Math.floor(distance / 10), 10); // Ensure at least 10 steps
    
    for (let i = 1; i <= steps; i++) {
        const progress = i / steps;
        
        // Linear interpolation
        let x = startX + (endX - startX) * progress;
        let y = startY + (endY - startY) * progress;
        
        // Add slight random deviation that decreases as progress increases
        const deviation = 5; // Maximum deviation in pixels
        x += (Math.random() * deviation * 2 - deviation) * (1 - progress);
        y += (Math.random() * deviation * 2 - deviation) * (1 - progress);
        
        path.push({ x: Math.round(x), y: Math.round(y) });
    }
    
    return path;
};


const moveMouseToElement = async (page, element) => {
    const box = await element.boundingBox();
    if (box) {
        // Slight randomness in the target position
        const deviation = 5; // pixels
        const targetX = box.x + box.width / 2 + (Math.random() * deviation * 2 - deviation);
        const targetY = box.y + box.height / 2 + (Math.random() * deviation * 2 - deviation);
        
        // Generate path from currentMousePosition to targetX, targetY
        const path = generateMousePath(currentMousePosition.x, currentMousePosition.y, targetX, targetY);
        
        for (const point of path) {
            await page.mouse.move(point.x, point.y);
            await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 30) + 20)); // 20-50ms delay between moves
        }
        
        // Update the current mouse position
        currentMousePosition = { x: targetX, y: targetY };
    }
};

const humanClick = async (page, element) => {
    await moveMouseToElement(page, element);
    await randomDelay(100, 300);
    try {
        await element.click();
        console.log("Human-like click performed.");
    } catch (err) {
        console.error("Error during human-like click:", err);
    }
};


const humanType = async (page, selector, text) => {
    const element = await page.$(selector);
    if (element) {
        await moveMouseToElement(page, element);
        await randomDelay(300, 500);
        
        for (const char of text) {
            await page.type(selector, char, { delay: Math.floor(Math.random() * 200) + 100 });
            // Introduce a pause after typing a word
            if (char === ' ' && Math.random() < 0.3) { // 30% chance to pause
                await randomDelay(500, 1500);
            }
        }
        console.log("Human-like typing performed.");
    }
};


// Initialize the results.json file if it doesn't exist
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

// Save Queue to Prevent Concurrent Writes
const saveQueue = [];
let isSaving = false;

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

// LLM Server Management
const startLLMServer = (serverType) => {
    const serverFiles = {
        main: 'llm_server.py',
        fillBlank: 'llm_server_fill_blank.py'
    };

    const llmPath = path.join(__dirname,  serverFiles[serverType]);
    const llmProcess = spawn('python', [llmPath]);

    llmProcess.stdout.on('data', (data) => {
        const message = data.toString().trim();
        console.log(`${serverType === 'main' ? 'Main' : 'FillBlank'} LLM: ${message}`);
    });

    llmProcess.stderr.on('data', (data) => {
        console.error(`${serverType === 'main' ? 'Main' : 'FillBlank'} LLM Error: ${data.toString().trim()}`);
    });

    llmProcess.on('close', (code) => {
        console.log(`${serverType === 'main' ? 'Main' : 'FillBlank'} LLM server exited with code ${code}`);
    });

    return llmProcess;
};

const waitForLLMReady = (llmProcess, readinessMessage = 'READY') => {
    return new Promise((resolve, reject) => {
        const onData = (data) => {
            const message = data.toString().trim();
            if (message === readinessMessage) {
                resolve();
                llmProcess.stdout.off('data', onData);
            }
        };

        const onError = (err) => {
            reject(err);
            llmProcess.stdout.off('data', onData);
        };

        llmProcess.stdout.on('data', onData);
        llmProcess.stderr.on('data', onError);

        setTimeout(() => {
            reject(new Error(`LLM server did not become ready in time (waiting for "${readinessMessage}").`));
        }, 30000); // 30 seconds timeout
    });
};

// Communication with LLM Servers
const getAnswerFromLLM = (llmProcess, prompt, validResponses) => {
    return new Promise((resolve, reject) => {
        const onData = (data) => {
            const chunk = data.toString().trim();
            // Check if chunk matches any valid response
            const isValid = validResponses.some(pattern => {
                if (typeof pattern === 'string') {
                    return chunk.toUpperCase() === pattern;
                } else if (pattern instanceof RegExp) {
                    return pattern.test(chunk);
                }
                return false;
            });

            if (isValid) {
                resolve(chunk.toUpperCase());
                llmProcess.stdout.off('data', onData);
            }
        };

        const onError = (err) => {
            reject(err);
            llmProcess.stdout.off('data', onData);
        };

        llmProcess.stdout.on('data', onData);
        llmProcess.stderr.on('data', onError);

        llmProcess.stdin.write(`${prompt}\n`);
    });
};

// Function to Retrieve Stored Answer
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
    const maxAttempts = 3;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        try {
            // Wait a bit before attempting to click
            await randomDelay(2000, 3000);
            
            // Re-query for choices each attempt in case the DOM has updated
            const choices = await page.$$('.choice');
            
            // Check if any choices exist
            if (!choices.length) {
                console.log("No choices found on attempt", attempts + 1);
                attempts++;
                continue;
            }

            for (const choice of choices) {
                // Verify element is still attached to DOM
                const isAttached = await page.evaluate(el => {
                    return el && el.isConnected && 
                           window.getComputedStyle(el).display !== 'none' &&
                           window.getComputedStyle(el).visibility !== 'hidden';
                }, choice);

                if (!isAttached) {
                    continue;
                }

                // Get the text content of the choice
                const text = await page.evaluate(el => el.textContent.trim(), choice);
                
                if (text.toLowerCase() === correctAnswer.toLowerCase()) {
                    // Additional check to ensure element is visible and clickable
                    const box = await choice.boundingBox();
                    if (!box) {
                        console.log("Choice element has no bounding box. Skipping.");
                        continue;
                    }

                    // Move mouse to element first
                    await moveMouseToElement(page, choice);
                    await randomDelay(800, 1000);

                    // Try to click the element
                    await choice.click({ delay: Math.floor(Math.random() * 100) + 50 });
                    console.log(`Successfully clicked the correct answer: ${correctAnswer}`);
                    return true;
                }
            }

            console.log(`Could not find or click the correct answer: ${correctAnswer} on attempt ${attempts + 1}`);
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


// Enhanced Element Wait
const safeWaitForSelector = async (selector, page, timeout = 30000) => {
    try {
        await page.waitForSelector(selector, { timeout });
        return true;
    } catch (error) {
        console.log(`Error: failed to find element matching selector "${selector}". Skipping.`);
        return false;
    }
};

// Question and Answer Extraction
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

// Utility Function to Generate Random String
const generateRandomString = (length) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

// Detect and Log Question Type
const detectAndLogQuestionType = async (page) => {
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
            console.log(`Answer Choices: ${answers.join(' | ')}`);
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
        console.log(`Regular Multiple Choice Question Detected: ${question}`);
        if (hint) console.log(`Hint: ${hint}`);
        console.log(`Answer Choices: ${answers.join(' | ')}`);
        return { questionType: 'mcq', hint };
    } else {
        console.log("Unable to determine the type of the current question.");
        return { questionType: 'unknown', hint: null };
    }
};

const tryClick15MinButton = async (page) => {
    const buttonSelector = '#\\31 5_min_'; // Escaped selector for the "15 min" button

    try {
        // Wait for the button to appear (if it does) and be clickable
        const buttonAppeared = await safeWaitForSelector(buttonSelector, page, 10000); // Wait max 10s for button
        if (buttonAppeared) {
            const buttonElement = await page.$(buttonSelector);
            if (buttonElement) {
                console.log("Found the '15 min' button. Attempting to click...");
                await moveMouseToElement(page, buttonElement); // Move the mouse to the button
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

// Main Execution Function
(async () => {
    await initializeResultsFile();

    // Start LLM Servers
    const mainLLMProcess = startLLMServer('main');
    

    // Wait for LLM Servers to be Ready
    try {
        console.log('Waiting for the Main LLM server to load...');
        await waitForLLMReady(mainLLMProcess);
        console.log('Main LLM server is ready.');
    } catch (err) {
        console.error('Error waiting for LLM server readiness:', err);
        mainLLMProcess.kill();
        fillBlankLLMProcess.kill();
        process.exit(1);
    }
    const fillBlankLLMProcess = startLLMServer('fillBlank');
    try {
        console.log('Waiting for the Fill-in-the-Blank LLM server to load...');
        await waitForLLMReady(fillBlankLLMProcess);
        console.log('Fill-in-the-Blank LLM server is ready.');
    } catch (err) {
        console.error('Error waiting for LLM server readiness:', err);
        mainLLMProcess.kill();
        fillBlankLLMProcess.kill();
        process.exit(1);
    }

    // Launch Puppeteer Browser
    console.log("Launching the browser...");
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
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

    // Handle Different Question Types
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
                    await handleMCQQuestion(page, hint, processedQuestions, mainLLMProcess);
                    lastQuestionType = 'mcq';
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
    

    // Handle Practice Question
    const handlePracticeQuestion = async (page, isIKTElementPresent) => {
        console.log("Handling practice question...");
        await randomDelay(4500, 5500);
    
        const choices = await page.$$('.choice');
        for (const choice of choices) {
            if (await choice.evaluate(el => el.isConnected)) {
                await humanClick(page, choice);
                console.log("Clicked on a choice.");
                await randomDelay(400, 900);
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

    
        await randomDelay(1500, 2500);
    
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
            const answerBox = await page.$('#choice');
            if (answerBox) {
                await moveMouseToElement(page, answerBox);
                await randomDelay(500, 1000);
                await page.type('#choice', lastPracticeWordForm, { delay: Math.floor(Math.random() * 100) + 50 });
                
                console.log(`Filled in the blank with the last practice word form: ${lastPracticeWordForm}`);
            } else {
                console.log("Answer box not found for fill-in-the-blank question.");
            }
        } else {
            if (wordLength && hint) { // Removed firstLetter requirement
                console.log("Using Fill-in-the-Blank LLM to guess the word...");
                try {
                    const guessedWord = await getAnswerFromLLM(
                        fillBlankLLMProcess,
                        `${wordLength},${firstLetter},${hint}`,
                        ['UNKNOWN', /^[a-zA-Z]+$/]
                    );
    
                    console.log(`Fill-in-the-Blank LLM Guessed Word: ${guessedWord}`);
    
                    if (guessedWord && guessedWord.toLowerCase() !== 'unknown') {
                        // Remove the first character (already provided)
                        const processedWord = guessedWord.substring(1);
                        console.log(`Processed Word (without first letter): ${processedWord}`);
    
                        const answerBox = await page.$('#choice');
                        if (answerBox) {
                            await moveMouseToElement(page, answerBox);
                            await randomDelay(500, 1000);
                            await page.type('#choice', processedWord, { delay: Math.floor(Math.random() * 100) + 50 });
                            console.log(`Filled in the blank with LLM guessed word: ${processedWord}`);
                        } else {
                            console.log("Answer box not found for fill-in-the-blank question.");
                        }
                    } else {
                        console.log("LLM did not provide a valid word. Filling with random characters.");
                        const remainingLength = wordLength - 1;
                        const randomChars = generateRandomString(remainingLength);
                        const answerBox = await page.$('#choice');
                        if (answerBox) {
                            await moveMouseToElement(page, answerBox);
                            await randomDelay(500, 1000);
                            await page.type('#choice', randomChars, { delay: Math.floor(Math.random() * 100) + 50 });
                            console.log(`Filled in the blank with random characters: ${randomChars}`);
                        } else {
                            console.log("Answer box not found for fill-in-the-blank question.");
                        }
                    }
                } catch (err) {
                    console.error('Error communicating with Fill-in-the-Blank LLM:', err);
                    if (wordLength) {
                        const remainingLength = wordLength - 1;
                        const randomChars = generateRandomString(remainingLength);
                        const answerBox = await page.$('#choice');
                        if (answerBox) {
                            await moveMouseToElement(page, answerBox);
                            await randomDelay(500, 1000);
                            await page.type('#choice', randomChars, { delay: Math.floor(Math.random() * 100) + 50 });
                            console.log(`Filled in the blank with random characters due to error: ${randomChars}`);
                        } else {
                            console.log("Answer box not found for fill-in-the-blank question.");
                        }
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
    
    
    

    // Handle Multiple Choice Question with Image
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
            await randomDelay(5000, 8000);
            const randomIndex = Math.floor(Math.random() * mcqImageChoices.length);
            await humanClick(page, mcqImageChoices[randomIndex]);
            console.log(`Answered multiple choice question with image randomly: Choice ${randomIndex + 1}`);
            
            // Add the question to the processed set
            processedImageQuestions.add(currentQuestionText);
        } else {
            console.log("No choices found for image MCQ. Skipping.");
        }
    };
    

    // Handle Regular Multiple Choice Question
    const handleMCQQuestion = async (page, hint, processedMCQQuestions, mainLLMProcess) => {
        const { question: currentQuestion, answers: currentAnswers } = await extractQuestionAndAnswers(page);
        
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

        console.log("New Multiple-Choice Question Detected:", currentQuestion);
        console.log("Answer Choices:", currentAnswers);

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
        await randomDelay(2000, 5000);

        const numChoices = currentAnswers.length;
        const validLetters = ['A', 'B', 'C', 'D', 'E'].slice(0, numChoices);
        const lettersInPrompt = validLetters.join(', ');

        const options = currentAnswers.map((choice, idx) => `${String.fromCharCode(65 + idx)}) ${choice}`).join(', ');
        const prompt = `Question: ${currentQuestion} | Answer options: ${options} | Answer (respond with only the letter ${lettersInPrompt} or 'Unknown'):`;
        console.log(`Sending to LLM`);

        try {
            const guessedAnswer = await getAnswerFromLLM(mainLLMProcess, prompt, [...validLetters, 'UNKNOWN']);
            console.log(`Main LLM Guessed Answer: ${guessedAnswer}`);

            if (guessedAnswer && guessedAnswer !== 'UNKNOWN') {
                if (validLetters.includes(guessedAnswer.toUpperCase())) {
                    const answerIndex = validLetters.indexOf(guessedAnswer.toUpperCase());
                    if (answerIndex !== -1 && answerIndex < currentAnswers.length) {
                        const choiceElements = await page.$$('.choice');
                        if (choiceElements[answerIndex]) {
                            await humanClick(page, choiceElements[answerIndex]);
                            console.log(`Clicked on the guessed answer: ${guessedAnswer.toUpperCase()}`);
                            // Enqueue the answer to save it
                            const correctChoice = currentAnswers[answerIndex];
                            enqueueSave(currentQuestion, currentAnswers, correctChoice);
                        } else {
                            console.log(`Guessed answer index ${answerIndex} is out of bounds.`);
                        }
                    } else {
                        console.log(`Guessed answer "${guessedAnswer}" is invalid or out of range.`);
                    }
                } else {
                    console.log(`Guessed answer "${guessedAnswer}" is not among valid options (${lettersInPrompt}).`);
                }
            } else {
                console.log("Main LLM did not provide a valid answer.");
            }
        } catch (err) {
            console.error('Error communicating with Main LLM:', err);
        } finally {
            // Remove the question from processedMCQQuestions regardless of outcome to allow retries if needed
            processedMCQQuestions.delete(questionKey);
        }
    };



    // Handle Reload Question
    const handleReloadQuestion = async (page) => {
        console.log("Reloading the question due to previous error.");
        // Implement any specific reload logic if necessary
    };

    // Start Handling Questions
    if (await safeWaitForSelector('#single-question', page) || await safeWaitForSelector('#next-btn', page)) {
        console.log("First question element detected.");
        await handleQuestion();
        await randomDelay(1000, 2000);
        console.log("Polling for new questions...");
        setInterval(handleQuestion, 2000 + Math.floor(Math.random() * 500)); // Poll every 2-2.5 seconds
    } else {
        console.log("Could not find the first question element. Exiting.");
    }

    // Graceful Shutdown
    process.on('SIGINT', async () => {
        console.log('\nGracefully shutting down...');
        while (saveQueue.length > 0 || isSaving) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        await browser.close();
        mainLLMProcess.kill();
        fillBlankLLMProcess.kill();
        process.exit(0);
    });
})();

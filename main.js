// main.js
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;
const path = require('path');
const { spawn } = require('child_process');

// Apply the stealth plugin to Puppeteer
puppeteer.use(StealthPlugin());

// Define the path to the JSON file
const resultsFilePath = path.join(__dirname, 'results.json');

// Helper function to introduce random delays
const randomDelay = (min = 500, max = 1500) => {
    return new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * (max - min + 1)) + min));
};

// Helper function to move the mouse to an element before interacting
const moveMouseToElement = async (page, element) => {
    const box = await element.boundingBox();
    if (box) {
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        await page.mouse.move(x, y, { steps: Math.floor(Math.random() * 10) + 5 }); // Random steps for smoother movement
        await randomDelay(100, 300); // Small delay after moving
    }
};

// Helper function to perform a human-like click
const humanClick = async (page, element) => {
    await moveMouseToElement(page, element);
    await randomDelay(100, 300); // Small delay before clicking
    await element.click();
};

// Helper function to perform human-like typing
const humanType = async (page, selector, text) => {
    const element = await page.$(selector);
    if (element) {
        await moveMouseToElement(page, element);
        await randomDelay(200, 500); // Small delay before typing
        await page.type(selector, text, { delay: Math.floor(Math.random() * 100) + 50 }); // Random delay between keystrokes
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

// Save queue to prevent concurrent writes
const saveQueue = [];
let isSaving = false;

// Function to enqueue save operations
function enqueueSave(question, choices, answer) {
    saveQueue.push({ question, choices, answer });
    processQueue();
}

// Function to process the save queue
async function processQueue() {
    if (isSaving || saveQueue.length === 0) {
        return;
    }

    isSaving = true;
    const { question, choices, answer } = saveQueue.shift();

    try {
        await saveResult(question, choices, answer);
    } catch (err) {
        console.error('Error processing save operation:', err);
    } finally {
        isSaving = false;
        processQueue(); // Process the next item in the queue
    }
}

// Function to save the result to the JSON file without duplicates
async function saveResult(question, choices, answer) {
    try {
        let data = [];

        // Check if the file exists and read its content
        try {
            const fileContent = await fs.readFile(resultsFilePath, 'utf8');

            if (fileContent.trim()) { // Check if file is not empty
                data = JSON.parse(fileContent);
            } else {
                console.log('results.json is empty. Initializing with an empty array.');
            }
        } catch (err) {
            if (err.code !== 'ENOENT') { // Ignore error if file does not exist
                if (err instanceof SyntaxError) {
                    console.error('Error parsing JSON file. The file might be corrupted. Initializing with an empty array.');
                    data = [];
                } else {
                    console.error('Error reading JSON file:', err);
                    return;
                }
            }
            // If file does not exist, start with an empty array
        }

        // Check for duplicate based on the question text
        const isDuplicate = data.some(entry => entry.question.toLowerCase() === question.toLowerCase());

        if (isDuplicate) {
            console.log('Duplicate entry found. Skipping save for this question.');
            return; // Exit the function without saving
        }

        // Add the new result since it's not a duplicate
        data.push({ question, choices, answer });

        // Write the updated data back to the file
        await fs.writeFile(resultsFilePath, JSON.stringify(data, null, 2), 'utf8');
        console.log('Result saved to results.json');
    } catch (err) {
        console.error('Error saving result:', err);
    }
}

// Function to start the Python LLM server
const startLLMServer = () => {
    const llmPath = path.join(__dirname,  'llm_server.py'); // Ensure the folder name has no spaces
    const llmProcess = spawn('python', [llmPath]);

    llmProcess.stdout.on('data', (data) => {
        const message = data.toString().trim();
        console.log(`LLM: ${message}`);
    });

    llmProcess.stderr.on('data', (data) => {
        console.error(`LLM Error: ${data.toString().trim()}`);
    });

    llmProcess.on('close', (code) => {
        console.log(`LLM server exited with code ${code}`);
    });

    return llmProcess;
};

// Function to wait for LLM server readiness
const waitForLLMReady = (llmProcess) => {
    return new Promise((resolve, reject) => {
        const onData = (data) => {
            const message = data.toString().trim();
            if (message === 'READY') {
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

        // Optionally set a timeout
        setTimeout(() => {
            reject(new Error('LLM server did not become ready in time.'));
        }, 30000); // 30 seconds timeout
    });
};

// Function to send a prompt to the LLM and receive the answer
const getAnswerFromLLM = (llmProcess, prompt, validResponses) => {
    return new Promise((resolve, reject) => {
        let answer = '';

        const onData = (data) => {
            const chunk = data.toString().trim();
            // Check if chunk is a valid answer or 'Unknown' or an error
            if (validResponses.includes(chunk.toUpperCase()) || chunk.toUpperCase() === 'UNKNOWN' || chunk.startsWith('Error:')) {
                answer = chunk.toUpperCase();
                resolve(answer);
                llmProcess.stdout.off('data', onData); // Remove listener after receiving the answer
            }
        };

        const onError = (err) => {
            reject(err);
            llmProcess.stdout.off('data', onData);
        };

        llmProcess.stdout.on('data', onData);
        llmProcess.stderr.on('data', onError);

        // Send the prompt to the LLM
        llmProcess.stdin.write(`${prompt}\n`);
    });
};

// Function to check if the question is already stored in the JSON and retrieve the correct answer
async function findAnswerInJson(question) {
    try {
        const fileContent = await fs.readFile(resultsFilePath, 'utf8');
        const data = JSON.parse(fileContent);

        // Find the question in the JSON file
        const entry = data.find(item => item.question.toLowerCase() === question.toLowerCase());
        if (entry) {
            return entry.answer; // Return the stored correct answer
        }
        return null; // If no matching question is found
    } catch (err) {
        console.error('Error reading JSON file:', err);
        return null;
    }
}

// Function to automatically click the correct answer
async function clickCorrectAnswer(page, correctAnswer) {
    try {
        const choices = await page.$$('.choice'); // Get all answer choices
        for (const choice of choices) {
            const text = await page.evaluate(el => el.textContent.trim(), choice);
            if (text.toLowerCase() === correctAnswer.toLowerCase()) {
                await humanClick(page, choice); // Use human-like click
                console.log(`Automatically clicked the correct answer: ${correctAnswer}`);
                return;
            }
        }
        console.log(`Could not find the correct answer: ${correctAnswer}`);
    } catch (err) {
        console.error('Error clicking the correct answer:', err);
    }
}

(async () => {
    await initializeResultsFile(); // Initialize the JSON file if needed

    // Start the LLM server
    const llmProcess = startLLMServer();

    // Wait for the LLM server to be ready
    try {
        console.log('Waiting for the LLM server to load...');
        await waitForLLMReady(llmProcess);
        console.log('LLM server is ready.');
    } catch (err) {
        console.error('Error waiting for LLM server readiness:', err);
        llmProcess.kill();
        process.exit(1);
    }

    console.log("Launching the browser...");
    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    console.log("Browser launched and new page opened.");

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    console.log("User agent set.");

    console.log("Navigating to the login page...");
    await page.goto('https://membean.com/login', { waitUntil: 'domcontentloaded' });
    console.log("Login page loaded.");

    console.log("Filling in the login form...");
    await humanType(page, '#username', 'INSERT USERNAME');
    await humanType(page, '#password', 'INSERT PASSWORD');

    console.log("Clicking the login button...");
    const loginButton = await page.$('#login > div:nth-child(4) > button');
    if (loginButton) {
        await humanClick(page, loginButton);
        await page.waitForNavigation({ waitUntil: 'domcontentloaded' });
        console.log("Dashboard page loaded.");
    } else {
        console.error("Login button not found.");
        await browser.close();
        llmProcess.kill();
        process.exit(1);
    }

    console.log("Waiting for the 'Start Training' button to become clickable...");
    await page.waitForFunction(
        () => document.querySelector('#startTrainingBtn') && !document.querySelector('#startTrainingBtn').disabled,
        { timeout: 0 }
    );
    console.log("'Start Training' button is clickable.");

    console.log("Waiting for a random delay before clicking the 'Start Training' button...");
    await randomDelay(1000, 3000); // Random delay between 1-3 seconds

    console.log("Clicking the 'Start Training' button...");
    const startTrainingButton = await page.$('#startTrainingBtn');
    if (startTrainingButton) {
        await humanClick(page, startTrainingButton);
    } else {
        console.error("'Start Training' button not found.");
        await browser.close();
        llmProcess.kill();
        process.exit(1);
    }

    console.log("Waiting for the first question to load...");

    // Enhanced error handling
    async function safeWaitForSelector(selector, page, timeout = 30000) {
        try {
            await page.waitForSelector(selector, { timeout });
            return true;
        } catch (error) {
            console.log(`Error: failed to find element matching selector "${selector}". Skipping.`);
            return false;
        }
    }

    if (await safeWaitForSelector('#single-question', page)) {
        console.log("First question loaded.");

        // Function to extract the question and answers based on Tampermonkey logic
        const extractQuestionAndAnswers = async () => {
            const question = await page.evaluate(() => {
                const questionElement = document.querySelector('#single-question');
                let text = questionElement ? questionElement.textContent.replace(/\s+/g, ' ').trim() : null;
                if (text) {
                    // Remove 'Correct!' or 'Incorrect!' suffix if present
                    text = text.replace(/ Correct!$/, '').replace(/ Incorrect!$/, '');
                }
                return text;
            });

            const answers = await page.evaluate(() => {
                const answerElements = Array.from(document.querySelectorAll('.choice'));
                return answerElements.length ? answerElements.map(el => el.textContent.replace(/\s+/g, ' ').trim()) : [];
            });

            return { question, answers };
        };

        // Function to detect the correct answer by checking for the 'correct' class
        const detectCorrectAnswer = async (question, choices) => {
            const correctAnswer = await page.evaluate(() => {
                const correctElement = document.querySelector('.choice.correct');
                return correctElement ? correctElement.textContent.replace(/\s+/g, ' ').trim() : null;
            });
            if (correctAnswer) {
                console.log("Correct Answer Detected: ", correctAnswer);
                // Enqueue the save operation instead of directly calling saveResult
                enqueueSave(question, choices, correctAnswer);
            }
        };

        // Function to detect if it's a practice question
        const isPracticeQuestion = async () => {
            return await page.$('#next-btn') !== null;
        };

        // Function to detect if it's a fill-in-the-blank question
        const isFillInTheBlank = async () => {
            return await page.$('#answer-box') !== null;
        };

        // Variable to store the last practice question's word form
        let lastPracticeWordForm = null;

        // Detect the initial question and answers
        let { question: previousQuestion, answers: previousAnswers } = await extractQuestionAndAnswers();
        if (previousQuestion && previousAnswers.length) {
            console.log("Initial Question: ", previousQuestion);
            console.log("Answers: ", previousAnswers);
        } else {
            console.log("Failed to extract the initial question or answers.");
        }

        // Flag to prevent overlapping processing
        let isProcessing = false;

        // Set to track all processed questions
        const processedQuestions = new Set();

        // Function to check if the question has changed (polling mechanism)
        const checkForNewQuestion = async () => {
            if (isProcessing) return; // Prevent overlapping executions
            isProcessing = true;

            try {
                // First, check if it's a fill-in-the-blank question
                const fillInTheBlank = await isFillInTheBlank();
                if (fillInTheBlank) {
                    const wordForm = await page.evaluate(() => {
                        const header = document.querySelector('h1.wordform');
                        return header ? header.textContent.trim() : null;
                    });
                    console.log(`Fill-in-the-Blank Question Detected. Word Form: ${wordForm}`);

                    // If the last question was a practice question, use its word form
                    if (lastPracticeWordForm) {
                        // Fill in the blank with the last practice word form
                        const answerBox = await page.$('#choice');
                        if (answerBox) {
                            await moveMouseToElement(page, answerBox);
                            await randomDelay(500, 1000); // Delay before typing
                            await page.type('#choice', lastPracticeWordForm, { delay: Math.floor(Math.random() * 100) + 50 }); // Human-like typing
                            console.log(`Filled in the blank with: ${lastPracticeWordForm}`);
                        } else {
                            console.log("Answer box not found for fill-in-the-blank question.");
                        }
                    }

                    return; // Do not proceed further for fill-in-the-blank questions
                }

                // Next, check if it's a practice question
                const practice = await isPracticeQuestion();
                if (practice) {
                    console.log("Practice Question Detected. Skipping save and moving to the next question.");

                    try {
                        // Wait for a random delay before interacting
                        await randomDelay(1500, 2500);

                        // Click on the specified choice elements
                        const choices = await page.$$('.choice'); // Select all elements with class 'choice'
                        for (const choice of choices) {
                            // Check if the element is still attached to the DOM
                            const isConnected = await choice.evaluate(el => el.isConnected);
                            if (isConnected) {
                                await humanClick(page, choice);
                                console.log("Clicked on a choice.");
                                // Wait for a random delay between clicks
                                await randomDelay(800, 1500);
                            } else {
                                console.log("Choice element is detached from the document. Skipping click.");
                            }
                        }

                        // Log the first header <h1 class="wordform">exuberance</h1>
                        const wordForm = await page.evaluate(() => {
                            const header = document.querySelector('h1.wordform');
                            return header ? header.textContent.trim() : null;
                        });
                        if (wordForm) {
                            console.log(`Word Form: ${wordForm}`);
                            lastPracticeWordForm = wordForm; // Store for future fill-in-the-blank questions
                        } else {
                            console.log("Word form not found in practice question.");
                        }

                        // Wait for a random delay before clicking 'Next'
                        await randomDelay(1500, 2500);

                        // Click the "Next" button to proceed
                        const nextBtn = await page.$('#next-btn');
                        if (nextBtn) {
                            await humanClick(page, nextBtn);
                            console.log("Clicked 'Next' to proceed to the following question.");
                        } else {
                            console.log("Next button not found. Skipping click.");
                        }
                    } catch (err) {
                        console.error("Error handling practice question:", err);
                    }
                    return; // Skip further processing for practice questions
                }

                // Proceed to extract question and answers if not a practice or fill-in-the-blank question
                const { question: currentQuestion, answers: currentAnswers } = await extractQuestionAndAnswers();
                if (currentQuestion && !processedQuestions.has(currentQuestion.toLowerCase())) {
                    console.log("New Question Detected: ", currentQuestion);
                    console.log("Answers: ", currentAnswers);
                    previousQuestion = currentQuestion;
                    previousAnswers = currentAnswers;
                } else {
                    // Question has already been processed
                    return;
                }

                // Detect and log the correct answer for the current question
                await detectCorrectAnswer(previousQuestion, previousAnswers);

                // Check if the question is already in the JSON
                const storedAnswer = await findAnswerInJson(previousQuestion);

                if (storedAnswer) {
                    // Automatically answer the question by clicking the stored correct answer
                    await clickCorrectAnswer(page, storedAnswer);
                } else {
                    // If the question is not in the JSON, generate an answer using LLM

                    // **Start of Changes**
                    // Check if the current question has already been sent to the LLM
                    const normalizedQuestion = currentQuestion.toLowerCase();
                    if (processedQuestions.has(normalizedQuestion)) {
                        console.log('This question has already been processed. Skipping LLM request.');
                    } else {
                        console.log("Answer not found in JSON. Using LLM to guess the answer.");

                        // Add the question to the processed set to prevent future duplicate processing
                        processedQuestions.add(normalizedQuestion);

                        // Wait for a random delay before generating the answer
                        await randomDelay(2000, 5000);

                        // Construct the prompt similar to test_llm.js
                        const numChoices = currentAnswers.length;
                        const validLetters = ['A', 'B', 'C', 'D', 'E'].slice(0, numChoices);
                        const lettersInPrompt = validLetters.join(', ');

                        const options = currentAnswers.map((choice, idx) => `${String.fromCharCode(65 + idx)}) ${choice}`).join(', ');
                        console.log(`Answer options: ${options}`);
                        const prompt = `Question: ${currentQuestion} | Answer options: ${options} | Answer (respond with only the letter ${lettersInPrompt} or 'Unknown'):`;

                        console.log(`Sending to LLM: ${prompt}`);

                        try {
                            const guessedAnswer = await getAnswerFromLLM(llmProcess, prompt, [...validLetters, 'UNKNOWN']);
                            console.log(`LLM Guessed Answer: ${guessedAnswer}`);

                            if (guessedAnswer && guessedAnswer !== 'UNKNOWN') {
                                // Validate the guessed answer
                                if (validLetters.includes(guessedAnswer.toUpperCase())) {
                                    // Find and click the guessed answer
                                    const answerIndex = validLetters.indexOf(guessedAnswer.toUpperCase());
                                    if (answerIndex !== -1 && answerIndex < currentAnswers.length) {
                                        const choiceElements = await page.$$('.choice');
                                        if (choiceElements[answerIndex]) {
                                            await humanClick(page, choiceElements[answerIndex]);
                                            console.log(`Clicked on the guessed answer: ${guessedAnswer.toUpperCase()}`);
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
                                console.log("LLM did not provide a valid answer.");
                            }
                        } catch (err) {
                            console.error('Error communicating with LLM:', err);
                        }
                    }
                    // **End of Changes**
                }
            } catch (err) {
                console.error("Error in polling mechanism:", err);
            } finally {
                isProcessing = false;
            }
        };

        // Poll for new questions every 2 seconds with slight randomization to mimic human behavior
        const pollingInterval = 2000; // Base interval in milliseconds
        const jitter = 500; // Maximum additional milliseconds
        console.log("Polling for new questions...");
        setInterval(checkForNewQuestion, pollingInterval + Math.floor(Math.random() * jitter)); // Polling every 2-2.5 seconds
    } else {
        console.log("Could not find the first question element. Exiting.");
    }

    // Graceful shutdown on Ctrl+C
    process.on('SIGINT', async () => {
        console.log('\nGracefully shutting down...');
        // Wait for the save queue to be processed
        while (saveQueue.length > 0 || isSaving) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        await browser.close();
        llmProcess.kill(); // Terminate the LLM server
        process.exit(0);
    });
})();

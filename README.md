
# Membean Auto-Answer Bot

![License](https://img.shields.io/badge/license-MIT-blue.svg)

Automate your Membean training sessions with this intelligent bot that mimics human behavior to answer questions efficiently and effectively. Leveraging Puppeteer for browser automation and OpenAI's GPT-4 for intelligent responses, this bot ensures a seamless and undetectable experience.

## Table of Contents

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [How It Works](#how-it-works)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgements](#acknowledgements)

## Features

- **Stealth Mode:** Utilizes Puppeteer Stealth Plugin to evade detection.
- **Human-like Interaction:** Simulates human behaviors such as random delays, mouse movements, and typing patterns.
- **Intelligent Answering:** Integrates OpenAI's GPT-4 to generate accurate answers.
- **Result Logging:** Saves questions, choices, and correct answers to a JSON file to build a knowledge base.
- **Graceful Shutdown:** Ensures all processes are properly terminated and data is saved upon exit.

## Prerequisites

Before you begin, ensure you have met the following requirements:

- **Operating System:** Windows, macOS, or Linux
- **Node.js:** v14 or higher
- **Python:** v3.7 or higher
- **OpenAI API Key:** Obtain from [OpenAI](https://platform.openai.com/account/api-keys)
- **Membean Account:** Active account with access to training sessions

## Installation

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/greenstorm5417/membean-auto-answer.git
   cd membean-auto-answer
   ```

2. **Install Node.js Dependencies:**

   Ensure you have Node.js installed. Then, install the necessary packages:

   ```bash
   npm install
   ```

3. **Set Up Python Environment:**

   Ensure you have Python installed. It's recommended to use a virtual environment:

   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

   *If `requirements.txt` is not present, create one with the necessary packages:*

   ```bash
   pip install python-dotenv openai
   ```

## Configuration

1. **Environment Variables:**

   Create a `.env` file in the root directory to store your OpenAI API key:

   ```bash
   touch .env
   ```

   Add the following line to the `.env` file:

   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

2. **Update `llm_server.py`:**

   Ensure the Python script points to the correct OpenAI model and handles responses appropriately.

## Usage

1. **Start the LLM Server:**

   Open a terminal and navigate to the project directory. Run the Python LLM server:

   ```bash
   python python\llm_server.py
   ```

   *Ensure the path to `llm_server.py` is correct based on your directory structure.*

2. **Run the Bot:**

   In a new terminal window, navigate to the project directory and execute the Node.js script:

   ```bash
   node membean.js
   ```

3. **Interact with Membean:**

   The bot will automate the login process, start training sessions, and intelligently answer questions by simulating human-like interactions.

## How It Works

- **Browser Automation with Puppeteer:**
  
  The bot uses Puppeteer to control a Chromium browser instance. It logs into your Membean account, navigates through training sessions, and interacts with questions and answer choices.

- **Human-like Behavior Simulation:**
  
  To mimic human interactions and avoid detection, the bot incorporates:
  
  - **Random Delays:** Introduces variability in wait times between actions.
  - **Mouse Movements:** Moves the cursor to elements before clicking.
  - **Typing Patterns:** Simulates human typing with random delays between keystrokes.
  - **Randomized Polling Intervals:** Varies polling intervals to prevent predictable patterns.

- **Intelligent Answering with GPT-4:**
  
  When encountering a question not present in the local `results.json`, the bot sends the question and answer choices to the OpenAI GPT-4 model to generate the most probable answer.

- **Result Logging:**
  
  Correctly answered questions are saved to `results.json`, building a local knowledge base to reduce reliance on the LLM for repeated questions.

## Contributing

Contributions are welcome! Please follow these steps:

1. **Fork the Repository**
2. **Create a New Branch:**

   ```bash
   git checkout -b feature/YourFeatureName
   ```

3. **Commit Your Changes:**

   ```bash
   git commit -m "Add your message here"
   ```

4. **Push to the Branch:**

   ```bash
   git push origin feature/YourFeatureName
   ```

5. **Open a Pull Request**

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgements

- [Puppeteer](https://github.com/puppeteer/puppeteer) - Headless Chrome Node API
- [OpenAI](https://openai.com/) - GPT-4 Language Model
- [puppeteer-extra-plugin-stealth](https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth) - Stealth plugin for Puppeteer

---

*Disclaimer: Use this bot responsibly and ensure compliance with Membean's terms of service. Automating interactions may violate platform policies.*

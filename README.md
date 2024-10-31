# Membean Bot

A Node.js automation script that uses Puppeteer and OpenAI's API to interact with Membean's training platform. This bot automates the process of logging in, navigating through training sessions, and answering questions using AI assistance.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Install Node.js on Windows](#step-1-install-nodejs-on-windows)
3. [Step 2: Clone the Repository](#step-2-clone-the-repository)
4. [Step 3: Install Project Dependencies](#step-3-install-project-dependencies)
5. [Step 4: Set Up OpenAI API Key](#step-4-set-up-openai-api-key)
6. [Step 5: Configure Environment Variables](#step-5-configure-environment-variables)
7. [Step 6: Run the Bot](#step-6-run-the-bot)
8. [Troubleshooting](#troubleshooting)
9. [Security Considerations](#security-considerations)
10. [License](#license)

---

## Prerequisites

Before you begin, ensure you have met the following requirements:

- **Operating System**: Windows 10 or later.
- **Internet Connection**: Stable internet connection to download necessary software and interact with Membean and OpenAI APIs.
- **Basic Computer Knowledge**: Familiarity with navigating Windows, using Command Prompt or PowerShell, and basic file operations.

---

## Step 1: Install Node.js on Windows

Node.js is a JavaScript runtime that allows you to run JavaScript code outside of a browser. This bot is built using Node.js, so it's essential to install it on your system.

### 1.1. Download Node.js Installer

1. Open your web browser and navigate to the [Node.js Downloads Page](https://nodejs.org/en/download/prebuilt-installer/current).

2. Under the **Windows** section, click on the appropriate installer based on your system architecture:

   - **Windows Installer (.msi)** for 64-bit systems.

   > **Note**: Most modern Windows systems are 64-bit. To check your system type:
   >
   > - Press `Win + Pause/Break` keys simultaneously.
   > - In the **System** window, look for **System type** to see if your OS is 64-bit.

### 1.2. Run the Installer

1. Locate the downloaded `.msi` file (usually in your **Downloads** folder) and double-click it to run the installer.

2. Follow the on-screen instructions:

   - **Welcome Screen**: Click **Next**.

   - **License Agreement**: Read the license terms, select **I accept the terms in the License Agreement**, and click **Next**.

   - **Destination Folder**: Choose the installation directory or accept the default path. Click **Next**.

   - **Custom Setup**: 
     - Ensure the checkbox for **Add to PATH** is selected. This allows you to run Node.js from any command prompt or PowerShell window.
     - Optionally, you can select additional features, but the default selections are sufficient for this project.
     - Click **Next**.

   - **Ready to Install**: Click **Install** to begin the installation process.

   - **User Account Control**: If prompted, click **Yes** to allow the installer to make changes to your device.

3. Wait for the installation to complete. Once done, click **Finish**.

### 1.3. Verify Installation

1. **Restart Your Computer**: Although not always necessary, restarting ensures that environment variables are correctly applied.

2. **Open Command Prompt or PowerShell**:

   - Press `Win + R`, type `cmd`, and press `Enter` to open Command Prompt.
   - Alternatively, press `Win + R`, type `powershell`, and press `Enter` to open PowerShell.

3. **Check Node.js Version**:

   ```bash
   node -v
   ```

   - You should see the installed Node.js version, e.g., `v20.18.0`.

4. **Check npm Version**:

   ```bash
   npm -v
   ```

   - You should see the installed npm version, e.g., `10.8.2`.

   > **Troubleshooting**: If you encounter an error stating that `node` or `npm` is not recognized, ensure that Node.js was added to your system's `PATH`. If not, reinstall Node.js and make sure to select the **Add to PATH** option during installation.

---

## Step 2: Clone the Repository

Assuming you have the project's code available, follow these steps. If not, create a project directory and add the provided code.

1. **Create a Project Directory**:

   - Navigate to your desired location (e.g., Desktop).

   - Right-click and select **New > Folder**. Name it `membean-bot` or any preferred name.

2. **Navigate to the Directory**:

   - Open Command Prompt or PowerShell.

   - Use the `cd` command to navigate:

     ```bash
     cd path\to\membean-bot
     ```

     Replace `path\to\membean-bot` with the actual path, e.g., `C:\Users\YourName\Desktop\membean-bot`.

3. **Add the Code**:

   - Create a new file named `new_membean.js` inside the `membean-bot` directory.

   - Paste the provided code into this file using a text editor like Notepad, Visual Studio Code, or any other editor.

---

## Step 3: Install Project Dependencies

The project relies on several Node.js packages. Here's how to install them:

1. **Initialize npm (if not already initialized)**:

   In Command Prompt or PowerShell, navigate to your project directory (`membean-bot`) and run:

   ```bash
   npm init -y
   ```

   This command creates a `package.json` file with default settings.

2. **Install Required Packages**:

   Run the following command to install all necessary dependencies:

   ```bash
   npm install puppeteer-extra puppeteer-extra-plugin-stealth openai dotenv bezier-js
   ```

   - **puppeteer-extra**: A plugin framework for Puppeteer.
   - **puppeteer-extra-plugin-stealth**: Evades detection techniques used by websites.
   - **openai**: Official OpenAI API client.
   - **dotenv**: Loads environment variables from a `.env` file.

   > **Note**: Ensure you have an active internet connection during installation.

3. **Verify Installation**:

   After installation, your `package.json` should have the installed packages listed under `dependencies`. Additionally, a `node_modules` folder should appear in your project directory containing all the installed packages.

---

## Step 4: Set Up OpenAI API Key

To interact with OpenAI's API, you'll need an API key.

### 4.1. Obtain an API Key

1. **Sign Up / Log In**:

   - Visit [OpenAI's website](https://www.openai.com/) and sign up for an account or log in if you already have one.

2. **Navigate to API Keys**:

   - Once logged in, go to the [API Keys](https://platform.openai.com/account/api-keys) section.

3. **Create a New API Key**:

   - Click on **"Create new secret key"**.
   - Give it a recognizable name, e.g., `MembeanBotKey`.
   - Click **"Create secret key"**.
   - **Important**: Copy the API key and store it securely. You won't be able to view it again.

### 4.2. Add API Key as an Environment Variable via PowerShell

Adding the API key as an environment variable ensures that your code can access it securely without hardcoding it into your scripts.

1. **Open PowerShell**:

   - Press `Win + X` and select **Windows PowerShell** or **Windows PowerShell (Admin)**.

2. **Set the Environment Variable**:

   Run the following command, replacing `YOUR_OPENAI_API_KEY` with the API key you obtained:

   ```powershell
   [System.Environment]::SetEnvironmentVariable("OPENAI_API_KEY", "YOUR_OPENAI_API_KEY", "User")
   ```

   - **Explanation**:
     - `"OPENAI_API_KEY"`: The name of the environment variable.
     - `"YOUR_OPENAI_API_KEY"`: Your actual OpenAI API key.
     - `"User"`: Sets the variable for the current user. Alternatively, use `"Machine"` to set it system-wide (requires administrative privileges).

3. **Verify the Environment Variable**:

   ```powershell
   echo $env:OPENAI_API_KEY
   ```

   - This should display your API key. If it doesn't, ensure you've entered it correctly.

4. **Restart Your Computer**:

   To ensure the environment variable is recognized system-wide, it's recommended to restart your computer.

---

## Step 5: Configure Environment Variables in `.env` File (Optional)

While setting the environment variable via PowerShell makes it available system-wide, you can also create a `.env` file in your project directory for local configurations.

1. **Create a `.env` File**:

   - Inside your `membean-bot` directory, create a new file named `.env`.

2. **Add the API Key**:

   - Open the `.env` file with a text editor and add the following line:

     ```env
     OPENAI_API_KEY=YOUR_OPENAI_API_KEY
     ```

     Replace `YOUR_OPENAI_API_KEY` with your actual API key.

3. **Save the File**:

   - Ensure the file is saved without any additional extensions (e.g., `.txt`).

   > **Note**: If you're using both system-wide environment variables and a `.env` file, the `.env` file will take precedence for this project.

---

## Step 6: Run the Bot

With all dependencies installed and environment variables set, you're ready to run the bot.

1. **Navigate to Project Directory**:

   Open Command Prompt or PowerShell and navigate to your project directory:

   ```bash
   cd path\to\membean-bot
   ```

   Replace `path\to\membean-bot` with the actual path, e.g., `C:\Users\YourName\Desktop\membean-bot`.

2. **Run the Script**:

   Execute the Node.js script using the following command:

   ```bash
   node new_membean.js
   ```

   - **Explanation**:
     - `node`: The Node.js runtime.
     - `new_membean.js`: The script file you created earlier.

3. **Observe the Output**:

   - The script should launch a browser window (non-headless mode) and start automating the login and training process.
   - Console logs will provide insights into the bot's actions, such as clicking buttons, typing, and interacting with questions.

   > **Important**: Ensure that the `username` and `password` variables in your script are correctly set with your Membean account credentials.

---

## Troubleshooting

If you encounter issues while setting up or running the bot, refer to the following common problems and their solutions.

### 1. **Node.js Not Recognized**

- **Symptom**: Running `node -v` or `npm -v` returns an error like `'node' is not recognized as an internal or external command`.

- **Solution**:
  - Ensure that Node.js was added to your system's `PATH` during installation.
  - If not, reinstall Node.js and make sure to select the **Add to PATH** option.
  - Restart your computer after installation.

### 2. **Missing Dependencies**

- **Symptom**: Errors indicating missing packages when running the script.

- **Solution**:
  - Ensure you've installed all dependencies by running:

    ```bash
    npm install puppeteer-extra puppeteer-extra-plugin-stealth openai dotenv
    ```

### 3. **OpenAI API Errors**

- **Symptom**: Errors related to OpenAI API, such as authentication failures or rate limits.

- **Solution**:
  - Verify that your `OPENAI_API_KEY` is correctly set.
  - Ensure there are no typos in the `.env` file or the environment variable.
  - Check your OpenAI account for any usage limits or restrictions.
  - Review the [OpenAI API Documentation](https://platform.openai.com/docs/api-reference/introduction) for further guidance.

### 4. **Puppeteer Launch Issues**

- **Symptom**: Errors when Puppeteer tries to launch the browser.

- **Solution**:
  - Ensure that all Puppeteer dependencies are correctly installed.
  - Sometimes, antivirus software can interfere with Puppeteer's operation. Temporarily disable it and try again.
  - Check if the browser version Puppeteer is trying to use is compatible with your system.

### 5. **Environment Variable Not Recognized**

- **Symptom**: The script cannot access the `OPENAI_API_KEY`.

- **Solution**:
  - Ensure you've set the environment variable correctly via PowerShell.
  - Restart your computer to apply changes.
  - Alternatively, use a `.env` file in your project directory with the API key.

### 6. **Unhandled Exceptions**

- **Symptom**: The script crashes without clear error messages.

- **Solution**:
  - Review the console logs to identify where the script is failing.
  - Ensure all selectors in the script (`#username`, `#password`, etc.) match the current Membean website structure.
  - Websites can change their structure, so updating selectors might be necessary.

---

## Security Considerations

- **Protect Your API Key**: Never share your OpenAI API key publicly. It grants access to your OpenAI account and can incur costs.

- **Secure Credentials**: The script contains your Membean `username` and `password`. Ensure this file is not shared or uploaded to public repositories.

- **Use Environment Variables**: Storing sensitive information in environment variables or a `.env` file is a best practice to prevent accidental exposure.

- **Review Dependencies**: Only use trusted packages from reputable sources. Regularly update dependencies to patch potential vulnerabilities.

---

## License

This project is open-source and available under the [MIT License](LICENSE).

---

## Additional Resources

- **Node.js Documentation**: [https://nodejs.org/en/docs/](https://nodejs.org/en/docs/)
- **Puppeteer Documentation**: [https://pptr.dev/](https://pptr.dev/)
- **OpenAI API Documentation**: [https://platform.openai.com/docs/api-reference/introduction](https://platform.openai.com/docs/api-reference/introduction)
- **dotenv Documentation**: [https://github.com/motdotla/dotenv](https://github.com/motdotla/dotenv)

---

By following this guide, even individuals with no prior coding experience should be able to set up and run the Membean Bot on a Windows system. If you encounter any issues not covered in the troubleshooting section, consider reaching out to relevant community forums or the project's maintainers for assistance.

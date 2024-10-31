# Membean Bot

**Membean Bot** is a user-friendly Windows installer that automates the setup and operation of a Node.js-based automation script. Leveraging Puppeteer and OpenAI's API, this bot interacts with Membean's training platform, automating login procedures, navigating training sessions, and intelligently answering questions using AI assistance.

---

## Table of Contents

1. [Features](#features)
2. [Prerequisites](#prerequisites)
3. [Installation Guide](#installation-guide)
    - [1. Download the Installer](#1-download-the-installer)
    - [2. Run the Installer](#2-run-the-installer)
    - [3. Configure Environment Variables](#3-configure-environment-variables)
4. [Running the Bot](#running-the-bot)
5. [Troubleshooting](#troubleshooting)
6. [Security Considerations](#security-considerations)
7. [License](#license)
8. [Additional Resources](#additional-resources)

---

## Features

- **Automated Setup**: Installs Node.js, necessary npm packages, and configures the environment with minimal user intervention.
- **AI-Powered Assistance**: Utilizes OpenAI's API to intelligently answer questions on Membean's platform.
- **User-Friendly Interface**: Designed for users with limited technical expertise.
- **Self-Destruct Mechanism**: Ensures the installer cleans up after installation, maintaining a clutter-free system.

---

## Prerequisites

Before installing and running Membean Bot, ensure the following:

- **Operating System**: Windows 10 or later.
- **Administrator Privileges**: Required to install Node.js and modify system environment variables.
- **Internet Connection**: Stable connection to download necessary software and interact with Membean and OpenAI APIs.
- **Membean Account Credentials**: Your Membean username and password.
- **OpenAI API Key**: Obtainable by creating an account on [OpenAI](https://platform.openai.com/account/api-keys).

---

## Installation Guide

Follow the steps below to install and set up Membean Bot on your Windows system.

### 1. Download the Installer

1. **Navigate to the Releases Page**:

   Visit the [Membean-auto-answer Releases](https://github.com/greenstorm5417/Membean-auto-answer/releases/tag/v1.0.0) on GitHub.

2. **Download the Installer**:

   - Locate the installer file named `installer.exe` under the **Assets** section.
   - Click on `installer.exe` to download it to your preferred location (e.g., Desktop or Downloads folder).

   ![Download Installer](https://i.imgur.com/your-image-link.png)  
   *_Screenshot of the Releases page highlighting the installer.exe download link._*

### 2. Run the Installer

1. **Locate the Installer**:

   Navigate to the directory where you downloaded `installer.exe`.

2. **Execute the Installer**:

   - **Double-Click Method**:
     - Simply double-click the `installer.exe` file to launch the installer.
   
   - **Run as Administrator**:
     - Right-click on `installer.exe` and select **Run as administrator** to ensure the installer has the necessary permissions.

     ![Run as Administrator](https://i.imgur.com/your-image-link.png)  
     *_Screenshot showing the 'Run as administrator' option._*

3. **Follow On-Screen Instructions**:

   The installer will guide you through the setup process, which includes:

   - **Node.js Installation**:
     - Checks if Node.js is installed. If not, it will download and install the latest LTS version automatically.
   
   - **Project Setup**:
     - Initializes npm, installs required packages, downloads the main script (`main.js`), and creates essential configuration files.

   - **Self-Destruct Mechanism**:
     - After completing the installation, the installer will delete itself to maintain a clean system.

   **Note**: The installer creates a `.env` file with placeholder values, which you need to update with your credentials and API key.

### 3. Configure Environment Variables

After running the installer, you need to set up your environment variables to enable the bot to function correctly.

1. **Navigate to the Project Directory**:

   The installer sets up the project in your current working directory (e.g., `C:\Users\YourName\membean-bot`). Navigate to this directory using **File Explorer**.

2. **Locate the `.env` File**:

   Inside the project directory, find the `.env` file. This file contains placeholders for your configuration.

   ![.env File](https://i.imgur.com/your-image-link.png)  
   *_Screenshot showing the .env file in the project directory._*

3. **Edit the `.env` File**:

   - **Open with a Text Editor**:
     - Right-click on the `.env` file and choose **Open with** > **Notepad** (or any preferred text editor).

   - **Update the Variables**:
     - Replace the placeholder values with your actual credentials and API key.

     ```env
     OPENAI_API_KEY=your_openai_api_key_here
     USERNAME=your_membean_username_here
     PASSWORD=your_membean_password_here
     ```

   - **Save the Changes**:
     - After updating, save the `.env` file and close the text editor.

   **Security Tip**: Ensure that your `.env` file is kept secure and not shared with others to protect your credentials and API key.

---

## Running the Bot

Once installation and configuration are complete, you can start the Membean Bot.

1. **Locate the Batch File**:

   In the project directory (`membean-bot`), find the batch file named `run_membean_bot.bat`. This file is used to execute the bot.

   ![Batch File](https://i.imgur.com/your-image-link.png)  
   *_Screenshot showing the run_membean_bot.bat file._*

2. **Run the Bot**:

   - **Double-Click Method**:
     - Double-click on `run_membean_bot.bat` to start the bot.
   
   - **Command Prompt Method**:
     - Open **Command Prompt**.
     - Navigate to the project directory:
       
       ```bash
       cd path\to\membean-bot
       ```
       
       Replace `path\to\membean-bot` with your actual project path, e.g., `C:\Users\YourName\membean-bot`.
     
     - Execute the batch file:
       
       ```bash
       run_membean_bot.bat
       ```

3. **Monitor the Bot**:

   - A browser window will launch automatically, navigating to Membean's login page.
   - The bot will handle the login process and begin interacting with training sessions.
   - Console logs in the Command Prompt or PowerShell window will provide real-time updates on the bot's actions.

   ![Bot Running](https://i.imgur.com/your-image-link.png)  
   *_Screenshot showing the bot in action within a browser window._*

---

## Troubleshooting

If you encounter issues during installation or while running the bot, refer to the following common problems and their solutions.

### 1. **Installer Fails to Run**

- **Symptom**: Error messages when trying to execute `installer.exe`.
- **Solution**:
  - Ensure you have **administrator privileges**. Right-click the installer and select **Run as administrator**.
  - Disable any **antivirus** or **security software** temporarily, as they might block the installer.
  - Verify that your system meets the **prerequisites** outlined above.

### 2. **.env File Not Configured Correctly**

- **Symptom**: The bot fails to log in or interact with Membean.
- **Solution**:
  - Double-check that you've correctly entered your **Membean username**, **password**, and **OpenAI API key** in the `.env` file.
  - Ensure there are **no extra spaces** or **typos** in the `.env` file.
  - The `.env` file should reside in the **project root directory**.

### 3. **Node.js or npm Not Recognized**

- **Symptom**: Errors indicating that `node` or `npm` commands are not found.
- **Solution**:
  - Ensure that Node.js was **successfully installed** by the installer.
  - Verify that Node.js is added to your system's **PATH** environment variable.
  - Restart your computer to apply environment variable changes.

### 4. **OpenAI API Errors**

- **Symptom**: Authentication failures or rate limit errors when the bot attempts to use the OpenAI API.
- **Solution**:
  - Confirm that your **OpenAI API key** is correctly entered in the `.env` file.
  - Check your **OpenAI account** for any usage limits or restrictions.
  - Ensure you have a stable **internet connection**.

### 5. **Bot Doesn't Launch or Interact Properly**

- **Symptom**: The browser window doesn't open, or the bot fails to perform actions on Membean.
- **Solution**:
  - Ensure that Membean's website structure hasn't **changed**, which might affect the bot's ability to locate elements. Update the script selectors if necessary.
  - Check for any **error messages** in the Command Prompt or PowerShell window for specific issues.
  - Make sure that the **required npm packages** are installed correctly.

---

## Security Considerations

- **Protect Your Credentials**:
  - Never share your `.env` file or expose your **Membean credentials** and **OpenAI API key** to others.
  - Store the `.env` file securely and consider using encryption or secure storage solutions.

- **API Key Usage**:
  - Monitor your **OpenAI API usage** to prevent unexpected charges.
  - Revoke and regenerate your API key from the [OpenAI Dashboard](https://platform.openai.com/account/api-keys) if you suspect it has been compromised.

- **Regular Updates**:
  - Keep your Node.js and npm packages **up to date** to benefit from the latest security patches and features.
  - Regularly check the [GitHub Repository](https://github.com/greenstorm5417/Membean-auto-answer) for updates or patches.

---

## License

This project is licensed under the [MIT License](LICENSE). You are free to use, modify, and distribute this software, provided that the original license and copyright notice are included.

---

## Additional Resources

- **Node.js Documentation**: [https://nodejs.org/en/docs/](https://nodejs.org/en/docs/)
- **Puppeteer Documentation**: [https://pptr.dev/](https://pptr.dev/)
- **OpenAI API Documentation**: [https://platform.openai.com/docs/api-reference/introduction](https://platform.openai.com/docs/api-reference/introduction)
- **dotenv Documentation**: [https://github.com/motdotla/dotenv](https://github.com/motdotla/dotenv)
- **PyInstaller Documentation**: [https://pyinstaller.readthedocs.io/en/stable/](https://pyinstaller.readthedocs.io/en/stable/)
- **GitHub Repository**: [https://github.com/greenstorm5417/Membean-auto-answer](https://github.com/greenstorm5417/Membean-auto-answer)

---

By following this guide, users with minimal technical expertise should be able to install, configure, and run the Membean Bot on a Windows system effortlessly. For any further assistance or feature requests, feel free to open an issue on the [GitHub Repository](https://github.com/greenstorm5417/Membean-auto-answer).

---

**Disclaimer**: Use this bot responsibly and ensure compliance with Membean's [Terms of Service](https://www.membean.com/terms) and [OpenAI's Usage Policies](https://openai.com/policies/terms-of-service).

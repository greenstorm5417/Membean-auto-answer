
# Project Installation Guide for Windows

Welcome to the project! This guide will walk you through the detailed steps to install and configure all dependencies required to run this project on a **Windows** machine. We'll be using two batch files to make the installation process as smooth as possible, ensuring that Python and Node.js are correctly set up, even if they are not added to your system's PATH.

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Batch Files Overview](#batch-files-overview)
3. [Step-by-Step Installation Guide](#step-by-step-installation-guide)
    - [1. Download and Install Python](#1-download-and-install-python)
    - [2. Download and Install Node.js](#2-download-and-install-nodejs)
    - [3. Install Project Dependencies](#3-install-project-dependencies)
4. [Troubleshooting](#troubleshooting)
5. [FAQs](#faqs)

---

## Prerequisites
Before we begin, ensure you have access to the following:

- **A Windows machine** (Windows 7, 8, 10, or higher).
- **Administrator rights** on your machine (for installing software).
- **Internet connection** to download Python, Node.js, and project dependencies.

---

## Batch Files Overview

This project includes two critical batch files:

1. **`install_python_node.bat`**  
   This script will automatically:
   - Download and install **Python 3.10.0**.
   - Download and install **Node.js (latest version)**.
   - Ensure Python and Node.js are properly installed on your machine, even if they're not added to the PATH.

2. **`install_dependencies.bat`**  
   This script will:
   - Detect where Python and Node.js are installed.
   - Install all the Python dependencies via `pip` (using the `requirements.txt` file).
   - Install all the Node.js dependencies via `npm` or `yarn` (using `package-lock.json` or `yarn.lock`).

---

## Step-by-Step Installation Guide

Follow these detailed steps to get your project up and running on Windows.

### 1. Download and Install Python

1. **Run the Batch File:**
   - Locate and double-click the `install_python_node.bat` file in your project directory.
   
   The script will:
   - Download **Python 3.10.0** directly from the official Python website.
   - Install Python without needing any manual intervention.

2. **Verify Python Installation:**
   - After the installation is complete, the script will verify if Python was installed correctly.
   - You should see a confirmation message like `Python installed successfully at: <path>`.

### 2. Download and Install Node.js

1. **Run the Batch File (Continuation):**
   - The `install_python_node.bat` file will also handle the Node.js installation.
   - It will download the latest version of **Node.js** and install it on your system.

2. **Verify Node.js Installation:**
   - The script will check if Node.js was installed successfully and display a message like `Node.js installed successfully at: <path>`.

---

### 3. Install Project Dependencies

Once Python and Node.js are installed, the next step is to install the project dependencies.

1. **Run the Dependency Installation Script:**
   - Now, double-click the `install_dependencies.bat` file.
   - This script will automatically:
     - Detect where Python and Node.js are installed on your system.
     - Install all necessary Python dependencies from the `requirements.txt` file.
     - Install Node.js dependencies from the `package-lock.json` (for npm) or `yarn.lock` (for Yarn).
   
2. **Confirmation of Installation:**
   - If successful, you will see messages confirming that both Python and Node.js dependencies were installed.

3. **Start Using the Project:**
   - After installation, you are ready to start working with the project. Follow the project's usual usage guide or run the main script as instructed.

---

## Troubleshooting

If you run into any issues during installation, here are some common problems and solutions:

1. **Python or Node.js Not Found:**
   - If the script fails to detect Python or Node.js, ensure they are installed and that the installation directories are correct. The batch file checks common installation paths, but you may need to modify these paths manually if your installations are in custom locations.

2. **Permission Issues:**
   - Ensure that you are running the batch files with **Administrator** privileges. Right-click the batch file and select "Run as Administrator."

3. **Firewall or Antivirus Blocking the Installation:**
   - Some firewalls or antivirus software may block the download of Python or Node.js. Temporarily disable these programs if you experience issues with downloads.

4. **Corrupted Downloads:**
   - In rare cases, the download of Python or Node.js may get corrupted. If the installation fails, delete any partially downloaded files and try again.

---

## FAQs

### Q1: What happens if I already have Python or Node.js installed?
- The batch files will check for existing installations in common locations. If Python or Node.js is already installed, the script will skip the download and proceed with dependency installation.

### Q2: Do I need to manually add Python and Node.js to the PATH?
- No. The batch files will detect and use Python and Node.js even if they are not in your system PATH.

### Q3: Can I use different versions of Python or Node.js?
- This script is specifically configured to install **Python 3.10.0** and the **latest version of Node.js**. If you need different versions, you can modify the download URLs in the `install_python_node.bat` file.

### Q4: What if I use Yarn instead of npm for Node.js dependencies?
- The `install_dependencies.bat` script automatically detects whether to use `npm` or `yarn` based on the presence of `package-lock.json` (for npm) or `yarn.lock` (for Yarn).

### Q5: How do I know if the dependencies were installed correctly?
- If everything installs correctly, you will see a message at the end of the script output: `All dependencies installed successfully!`

---

By following this guide, you should be able to set up your environment and install all the required dependencies with minimal manual intervention. Enjoy working on the project!

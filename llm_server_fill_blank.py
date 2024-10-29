# llm_server_fill_blank.py
import sys
import os
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables from .env file
load_dotenv()

# Instantiate the OpenAI client with the API key from environment variables
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def main():
    print("READY", flush=True)  # Unique handshake message


    while True:
        prompt = sys.stdin.readline()
        if not prompt:
            break
        prompt = prompt.strip()
        if prompt.lower() == 'exit':
            break

        try:
            # Construct the prompt based on provided length, first letter, and hint word
            # Expected prompt format: length, first_letter, hint_word separated by commas
            parts = prompt.split(',')
            if len(parts) != 3:
                print("Error: Invalid prompt format. Expected format: length,first_letter,hint_word", flush=True)
                continue

            length = parts[0].strip()
            first_letter = parts[1].strip()
            hint_word = parts[2].strip()

            # Validate length is an integer
            if not length.isdigit():
                print("Error: Length must be an integer.", flush=True)
                continue

            # Validate first_letter is a single character
            if len(first_letter) != 1 or not first_letter.isalpha():
                print("Error: First letter must be a single alphabetic character.", flush=True)
                continue

            # Construct the OpenAI prompt
            constructed_prompt = f"What is a {length}-letter word that starts with '{first_letter}' and means something similar to '{hint_word}'?"

            response = client.chat.completions.create(
                model="gpt-4o-mini",  # Use the same model as in code1
                messages=[
                    {
                        "role": "system",
                        "content": "Your goal is to guess a single word based on the given length, first letter, and hint word. Provide only the word as the answer."
                    },
                    {
                        "role": "user",
                        "content": constructed_prompt
                    }
                ],
                max_tokens=10,         # Limit to a small number of tokens
                temperature=0,         # Deterministic output
                n=1,                   # Single response
                stop=None              # Define stop sequences if needed
            )

            # Extract the generated text
            answer = response.choices[0].message.content.strip()
            print(answer, flush=True)



        except Exception as e:
            # Handle API errors gracefully
            print(f"Error: {str(e)}", flush=True)

if __name__ == "__main__":
    main()

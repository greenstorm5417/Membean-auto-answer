# llm_server.py
import sys
import os
from dotenv import load_dotenv
from openai import OpenAI  # Updated import

# Load environment variables from .env file
load_dotenv()

# Instantiate the OpenAI client with the API key from environment variables
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def main():
    print("READY", flush=True)  # Unique handshake message

    # Define valid answer choices, including 'E'
    valid_answers = {"A", "B", "C", "D", "E"}

    while True:
        prompt = sys.stdin.readline()
        if not prompt:
            break
        prompt = prompt.strip()
        if prompt.lower() == 'exit':
            break

        try:
            # Create the completion request to OpenAI using the client
            response = client.chat.completions.create(
                model="gpt-4o-mini",  # Use the same model as in code1
                messages=[
                    {
                        "role": "system",
                        "content": "You are an assistant that provides concise answers."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                max_tokens=10,         # Limit to a small number of tokens
                temperature=0,         # Deterministic output
                n=1,                   # Single response
                stop=None              # Define stop sequences if needed
            )

            # Extract the generated text
            answer = response.choices[0].message.content.strip()

            # Extract the answer letter by removing the prompt if present
            if prompt and answer.lower().startswith(prompt.lower()):
                answer_text = answer[len(prompt):].strip().upper()
            else:
                answer_text = answer.upper()

            # Validate the answer
            final_answer = "Unknown"
            for word in valid_answers:
                if word in answer_text:
                    final_answer = word
                    break

            print(final_answer, flush=True)

        except Exception as e:
            # Handle API errors gracefully
            print(f"Error: {e}", flush=True)

if __name__ == "__main__":
    main()

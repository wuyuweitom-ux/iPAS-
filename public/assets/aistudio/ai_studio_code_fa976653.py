# To run this code you need to install the following dependencies:
# pip install google-genai

import base64
import os
from google import genai
from google.genai import types


def generate():
    client = genai.Client(
        api_key=os.environ.get("GEMINI_API_KEY"),
    )

    model = "gemini-3.5-flash-lite"
    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_text(text="""INSERT_INPUT_HERE"""),
            ],
        ),
    ]
    tools = [
        types.Tool(googleSearch=types.GoogleSearch(
        )),
    ]
    generate_content_config = types.GenerateContentConfig(
        thinking_config=types.ThinkingConfig(
            thinking_level="MINIMAL",
        ),
        media_resolution="MEDIA_RESOLUTION_LOW",
        audio_transcription_config=types.AudioTranscriptionConfig(
        ),
        tools=tools,
        system_instruction=[
            types.Part.from_text(text="""你是一位專業的 iPAS 淨零碳規劃師備考助教。請根據上傳的官方教材與考古題，協助學生進行練習。當學生詢問考古題時，請不要直接給答案，而是先給予觀念提示，引導學生思考；若學生回答錯誤，請針對盲點進行解釋並引用法規或標準（如 ISO 14064-1、溫盤議定書等）。"""),
        ],
    )

    for chunk in client.models.generate_content_stream(
        model=model,
        contents=contents,
        config=generate_content_config,
    ):
        if text := chunk.text:
            print(text, end="")

if __name__ == "__main__":
    generate()



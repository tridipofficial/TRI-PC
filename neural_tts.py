import sys
import os
import asyncio
import argparse
import edge_tts

async def synthesize(text, output_file, voice="bn-BD-NabanitaNeural", rate="-3%", pitch="+4Hz"):
    communicate = edge_tts.Communicate(text, voice=voice, rate=rate, pitch=pitch)
    await communicate.save(output_file)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", default=None)
    parser.add_argument("--file", default=None)
    parser.add_argument("--output", required=True)
    parser.add_argument("--voice", default="bn-BD-NabanitaNeural")
    parser.add_argument("--rate", default="-3%")
    parser.add_argument("--pitch", default="+4Hz")
    args = parser.parse_args()

    content = ""
    if args.file and os.path.exists(args.file):
        with open(args.file, "r", encoding="utf-8") as f:
            content = f.read().strip()
    elif args.text:
        content = args.text.strip()

    if not content:
        sys.exit(1)

    asyncio.run(synthesize(content, args.output, args.voice, args.rate, args.pitch))

if __name__ == "__main__":
    main()

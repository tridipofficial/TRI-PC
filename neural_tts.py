import sys
import asyncio
import argparse
import edge_tts

async def synthesize(text, output_file, voice="bn-BD-NabanitaNeural", rate="-6%", pitch="+5Hz"):
    # Clean up text
    communicate = edge_tts.Communicate(text, voice=voice, rate=rate, pitch=pitch)
    await communicate.save(output_file)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--voice", default="bn-BD-NabanitaNeural")
    parser.add_argument("--rate", default="-6%")
    parser.add_argument("--pitch", default="+5Hz")
    args = parser.parse_args()

    asyncio.run(synthesize(args.text, args.output, args.voice, args.rate, args.pitch))

if __name__ == "__main__":
    main()
